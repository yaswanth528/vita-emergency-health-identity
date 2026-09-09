import type { ApiErrorBody } from '@shared/subscription';

/* ============================================================================
   API client
   ----------------------------------------------------------------------------
   One fetch wrapper, so every call carries the session cookie and every
   failure arrives as the same kind of object.

   `VITE_API_URL` exists for a deployment where the API is on another origin.
   In development the Vite proxy puts `/api` on the same origin, which keeps
   the session cookie first-party.
   ========================================================================== */

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';

/**
 * A failed API call. `message` is already written for the user — the server
 * decides what is safe to say, and the UI does not invent its own wording for
 * a payment problem.
 */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }

  /** True when the API could not be reached at all, rather than refusing. */
  get isNetworkFailure(): boolean {
    return this.status === 0;
  }
}

const NETWORK_MESSAGE =
  'We could not reach the billing service. Nothing has been charged — check your connection and try again.';

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      // The session is an httpOnly cookie, so it must be sent explicitly for
      // the cross-origin case and is harmless same-origin.
      credentials: 'include',
      headers: {
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError('network', NETWORK_MESSAGE, 0);
  }

  if (response.status === 204) return undefined as T;

  const body = (await response.json().catch(() => null)) as (ApiErrorBody & T) | null;

  if (!response.ok) {
    const error = body && 'error' in body ? body.error : null;
    throw new ApiError(
      error?.code ?? 'internal',
      error?.message ?? 'Something went wrong. Please try again.',
      response.status,
    );
  }

  return body as T;
}

export const apiPost = <T>(path: string, payload?: unknown): Promise<T> =>
  apiFetch<T>(path, {
    method: 'POST',
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
