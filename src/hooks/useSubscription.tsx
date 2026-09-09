import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { PLANS, type Feature, type PlanId } from '@shared/plans';
import type {
  CheckoutSession,
  PaymentRecord,
  SubscriptionView,
} from '@shared/subscription';
import { useVita } from '@/hooks/useVita';
import { ApiError, apiFetch, apiPost } from '@/lib/api';

/* ============================================================================
   Subscription state
   ----------------------------------------------------------------------------
   A cache of what the server said, and nothing more. There is no client-side
   entitlement arithmetic here: `entitlements` arrives pre-computed from the
   API, so a user editing this in a debugger changes what they can *see* and
   nothing about what the server will *do*.

   The unreachable-API case matters and is handled deliberately. When there is
   no billing service — the GitHub Pages build has no backend at all — this
   falls back to the free plan's features. Failing closed is the only safe
   default: a fetch error must never be a free upgrade.
   ========================================================================== */

const FREE_FEATURES = PLANS.freemium.features;

/**
 * Whether paid plans can be bought.
 *
 * `unknown` is a distinct state rather than a pessimistic `false` because the
 * two are not the same claim: "we have not asked yet" must not render as
 * "payments are broken". Collapsing them made the unavailable banner flash on
 * every page load, which is a worse lie than a moment of uncertainty.
 */
export type PaymentsStatus = 'unknown' | 'available' | 'unavailable';

interface SubscriptionContextValue {
  subscription: SubscriptionView | null;
  loading: boolean;
  /** Set when the subscription could not be loaded. */
  error: string | null;
  paymentsStatus: PaymentsStatus;
  /** 'test' | 'live' — surfaced so a test-mode checkout is never mistaken for real. */
  providerMode: 'test' | 'live' | null;

  /** The current plan, falling back to freemium whenever nothing is confirmed. */
  plan: PlanId;
  /** The single question the UI is allowed to ask. */
  has: (feature: Feature) => boolean;

  refresh: () => Promise<void>;
  payments: PaymentRecord[];
  loadPayments: () => Promise<void>;

  startCheckout: (planId: PlanId) => Promise<CheckoutSession>;
  verifyPayment: (handoff: {
    razorpay_payment_id: string;
    razorpay_subscription_id: string;
    razorpay_signature: string;
  }) => Promise<SubscriptionView>;
  cancel: (atPeriodEnd: boolean) => Promise<SubscriptionView>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

interface HealthResponse {
  ok: boolean;
  /** `mode` is null when no provider is configured — there is no mode to report. */
  payments: { configured: boolean; mode: 'test' | 'live' | null; webhookConfigured: boolean };
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useVita();

  const [subscription, setSubscription] = useState<SubscriptionView | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthProbed, setHealthProbed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiFetch<HealthResponse>('/health')
      .then((h) => {
        if (!cancelled) setHealth(h);
      })
      .catch(() => {
        // No billing service reachable — `health` stays null and the probe
        // below resolves to 'unavailable'.
      })
      .finally(() => {
        if (!cancelled) setHealthProbed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setPayments([]);
      return;
    }

    setLoading(true);
    try {
      const { subscription: next } = await apiFetch<{ subscription: SubscriptionView }>(
        '/subscription',
      );
      setSubscription(next);
      setError(null);
    } catch (err) {
      setSubscription(null);
      // An unauthenticated or unreachable API is not worth alarming the user
      // about on a page that merely wanted to know their plan.
      setError(
        err instanceof ApiError && !err.isNetworkFailure && err.status !== 401 ? err.message : null,
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const loadPayments = useCallback(async () => {
    if (!user) return;
    try {
      const { payments: next } = await apiFetch<{ payments: PaymentRecord[] }>(
        '/subscription/payments',
      );
      setPayments(next);
    } catch {
      setPayments([]);
    }
  }, [user]);

  const startCheckout = useCallback(async (planId: PlanId) => {
    const { checkout } = await apiPost<{ checkout: CheckoutSession }>('/subscription/checkout', {
      planId,
    });
    return checkout;
  }, []);

  const verifyPayment = useCallback(
    async (handoff: {
      razorpay_payment_id: string;
      razorpay_subscription_id: string;
      razorpay_signature: string;
    }) => {
      const { subscription: next } = await apiPost<{ subscription: SubscriptionView }>(
        '/subscription/verify',
        handoff,
      );
      setSubscription(next);
      return next;
    },
    [],
  );

  const cancel = useCallback(async (atPeriodEnd: boolean) => {
    const { subscription: next } = await apiPost<{ subscription: SubscriptionView }>(
      '/subscription/cancel',
      { atPeriodEnd },
    );
    setSubscription(next);
    return next;
  }, []);

  const plan: PlanId = subscription?.plan ?? 'freemium';

  const has = useCallback(
    (feature: Feature) =>
      subscription
        ? subscription.entitlements.includes(feature)
        : FREE_FEATURES.includes(feature),
    [subscription],
  );

  const paymentsStatus: PaymentsStatus = !healthProbed
    ? 'unknown'
    : health?.payments.configured
      ? 'available'
      : 'unavailable';

  const value = useMemo<SubscriptionContextValue>(
    () => ({
      subscription,
      loading,
      error,
      paymentsStatus,
      providerMode: health?.payments.mode ?? null,
      plan,
      has,
      refresh,
      payments,
      loadPayments,
      startCheckout,
      verifyPayment,
      cancel,
    }),
    [
      subscription,
      loading,
      error,
      health,
      paymentsStatus,
      plan,
      has,
      refresh,
      payments,
      loadPayments,
      startCheckout,
      verifyPayment,
      cancel,
    ],
  );

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription(): SubscriptionContextValue {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used inside <SubscriptionProvider>');
  return ctx;
}

/**
 * Does the signed-in user have this capability?
 *
 * Mirrors the server's `hasFeature`. It gates presentation only — the server
 * checks again on every request that matters.
 */
export function useFeature(feature: Feature): boolean {
  return useSubscription().has(feature);
}
