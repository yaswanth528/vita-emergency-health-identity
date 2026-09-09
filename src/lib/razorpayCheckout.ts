import type { CheckoutSession } from '@shared/subscription';

/* ============================================================================
   Razorpay Checkout
   ----------------------------------------------------------------------------
   Loads the provider's hosted checkout and resolves with the handoff it
   returns. Card numbers, UPI IDs and OTPs are entered inside Razorpay's own
   iframe and never touch this application — which is the point of using it,
   and the reason there is no card form anywhere in this codebase.

   What comes back is three opaque strings. They are worth nothing on their
   own: the server recomputes the signature over them and re-fetches the
   payment before anything is unlocked.
   ========================================================================== */

const SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

export interface RazorpayHandoff {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
}

export type CheckoutOutcome =
  | { kind: 'paid'; handoff: RazorpayHandoff }
  /** The customer closed the modal. Not an error — nothing was charged. */
  | { kind: 'dismissed' }
  /** The provider reported the payment itself as failed. */
  | { kind: 'failed'; description: string };

interface RazorpayInstance {
  open: () => void;
  on: (event: string, handler: (response: unknown) => void) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

let scriptPromise: Promise<void> | null = null;

/** Loaded once per page, and only when someone actually starts a payment. */
function loadScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('checkout-script-failed')));
      return;
    }

    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      // Allow a later attempt to retry rather than caching the failure.
      scriptPromise = null;
      reject(new Error('checkout-script-failed'));
    };
    document.head.appendChild(script);
  });

  return scriptPromise;
}

function isHandoff(value: unknown): value is RazorpayHandoff {
  const v = value as Partial<RazorpayHandoff> | null;
  return (
    typeof v?.razorpay_payment_id === 'string' &&
    typeof v?.razorpay_subscription_id === 'string' &&
    typeof v?.razorpay_signature === 'string'
  );
}

/**
 * Open checkout and wait for it to finish one way or another.
 *
 * Resolves rather than throws for a dismissal, because closing the modal is a
 * normal thing to do and should not surface as an error to the customer.
 */
export async function openRazorpayCheckout(session: CheckoutSession): Promise<CheckoutOutcome> {
  await loadScript();

  const Razorpay = window.Razorpay;
  if (!Razorpay) throw new Error('checkout-script-failed');

  return new Promise<CheckoutOutcome>((resolve) => {
    let settled = false;
    const settle = (outcome: CheckoutOutcome) => {
      if (settled) return;
      settled = true;
      resolve(outcome);
    };

    const instance = new Razorpay({
      key: session.keyId,
      subscription_id: session.subscriptionId,
      name: session.name,
      description: session.description,
      prefill: session.prefill,
      notes: { planId: session.planId },
      theme: { color: '#0b6b3a' },
      handler: (response: unknown) => {
        if (isHandoff(response)) settle({ kind: 'paid', handoff: response });
        else settle({ kind: 'failed', description: 'The payment response was incomplete.' });
      },
      modal: {
        ondismiss: () => settle({ kind: 'dismissed' }),
      },
    });

    instance.on('payment.failed', (response: unknown) => {
      const description = (response as { error?: { description?: string } })?.error?.description;
      settle({ kind: 'failed', description: description ?? 'The payment did not go through.' });
    });

    instance.open();
  });
}
