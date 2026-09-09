import type { NextFunction, Request, Response } from 'express';

/* ============================================================================
   Errors
   ----------------------------------------------------------------------------
   Two audiences, deliberately separated. `message` is written for the person
   holding the phone; the stack, the provider's response body and the failing
   identifiers go to the server log and stop there.

   A payment error page that prints "signature verification failed for
   pay_R1x…" tells an attacker which half of the exchange they got wrong.
   ========================================================================== */

export type ErrorCode =
  | 'unauthenticated'
  | 'invalid_plan'
  | 'invalid_amount'
  | 'invalid_request'
  | 'already_subscribed'
  | 'checkout_in_flight'
  | 'checkout_unverifiable'
  | 'no_subscription'
  | 'checkout_failed'
  | 'verification_failed'
  | 'cancellation_failed'
  | 'provider_unconfigured'
  | 'feature_locked'
  | 'webhook_invalid'
  | 'internal';

const STATUS: Record<ErrorCode, number> = {
  unauthenticated: 401,
  invalid_plan: 400,
  invalid_amount: 400,
  invalid_request: 400,
  already_subscribed: 409,
  checkout_in_flight: 409,
  checkout_unverifiable: 503,
  no_subscription: 404,
  checkout_failed: 502,
  verification_failed: 400,
  cancellation_failed: 502,
  provider_unconfigured: 503,
  feature_locked: 402,
  webhook_invalid: 400,
  internal: 500,
};

export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  /** Safe to render in the UI. */
  readonly userMessage: string;
  /** Never sent to the client. */
  readonly detail?: unknown;

  constructor(code: ErrorCode, userMessage: string, detail?: unknown) {
    super(`${code}: ${userMessage}`);
    this.name = 'ApiError';
    this.code = code;
    this.status = STATUS[code];
    this.userMessage = userMessage;
    this.detail = detail;
  }
}

export const errors = {
  unauthenticated: () =>
    new ApiError('unauthenticated', 'Please sign in to manage your subscription.'),
  invalidPlan: (received: unknown) =>
    new ApiError('invalid_plan', 'That plan is not available.', { received }),
  invalidRequest: (message: string, detail?: unknown) =>
    new ApiError('invalid_request', message, detail),
  amountMismatch: (expected: number, actual: number) =>
    new ApiError(
      'invalid_amount',
      'The amount charged did not match the price of this plan, so the subscription was not activated. You have not been charged for a plan you did not select — contact support and quote this time.',
      { expected, actual },
    ),
  alreadySubscribed: (plan: string) =>
    new ApiError('already_subscribed', `You are already on the ${plan} plan.`),
  checkoutInFlight: () =>
    new ApiError(
      'checkout_in_flight',
      'A payment for this account is already being set up. Nothing has been charged twice — please finish or close the other payment window first.',
    ),
  /**
   * Raised when a previous attempt's state cannot be read from the provider.
   * Refusing is the safe answer: guessing it was unpaid risks cancelling a
   * mandate already charged, and guessing it was paid risks charging twice.
   */
  checkoutUnverifiable: () =>
    new ApiError(
      'checkout_unverifiable',
      'We could not confirm the status of your previous payment attempt, so we have not started another one. Nothing has been charged — please try again in a moment.',
    ),
  noSubscription: () =>
    new ApiError('no_subscription', 'There is no paid subscription on this account to change.'),
  providerUnconfigured: () =>
    new ApiError(
      'provider_unconfigured',
      'Payments are not available right now. No charge has been made — please try again shortly.',
    ),
  checkoutFailed: (detail?: unknown) =>
    new ApiError(
      'checkout_failed',
      'We could not start the payment. You have not been charged — please try again.',
      detail,
    ),
  verificationFailed: (detail?: unknown) =>
    new ApiError(
      'verification_failed',
      'Your payment could not be verified. You have not been charged or your payment is still being processed. Nothing has been activated.',
      detail,
    ),
  cancellationFailed: (detail?: unknown) =>
    new ApiError(
      'cancellation_failed',
      'We could not cancel the subscription. Nothing has changed — please try again.',
      detail,
    ),
  featureLocked: (feature: string) =>
    new ApiError('feature_locked', 'This feature is part of a paid plan.', { feature }),
  webhookInvalid: (why: string) => new ApiError('webhook_invalid', 'Invalid webhook.', { why }),
};

/**
 * Terminal error handler. Anything that is not an `ApiError` is treated as a
 * bug: logged in full, reported as a generic 500.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ApiError) {
    if (err.status >= 500) {
      console.error(`[api] ${req.method} ${req.path} → ${err.code}`, err.detail ?? err.message);
    } else {
      console.warn(`[api] ${req.method} ${req.path} → ${err.code}`);
    }
    res.status(err.status).json({ error: { code: err.code, message: err.userMessage } });
    return;
  }

  console.error(`[api] ${req.method} ${req.path} → unhandled`, err);
  res.status(500).json({
    error: { code: 'internal', message: 'Something went wrong on our side. Please try again.' },
  });
}

/** Wraps an async handler so a rejected promise reaches `errorHandler`. */
export function asyncRoute(
  handler: (req: Request, res: Response) => Promise<void>,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    handler(req, res).catch(next);
  };
}
