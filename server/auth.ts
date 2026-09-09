import { createHmac, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { env } from './env.js';
import { errors } from './errors.js';
import { findUserById, type UserRow } from './store.js';

/* ============================================================================
   Sessions
   ----------------------------------------------------------------------------
   A signed, httpOnly cookie carrying a user id and an expiry. The signature is
   what makes it trustworthy: the cookie is readable but not forgeable, so a
   request cannot claim to be a different user by editing it, and JavaScript on
   the page cannot read it at all.

   This is the piece the application genuinely did not have. Before this, the
   signed-in user was a value in React state — fine for a demo of consent, and
   not something you can bill against, because the browser was the only thing
   asserting who it was.

   Credentials themselves remain out of scope, as the sign-in screen has always
   said. `POST /api/auth/login` establishes a real server session for one of
   the two demo identities; swapping it for a password or an ABDM handshake
   changes this file and nothing downstream of it.
   ========================================================================== */

declare global {
  namespace Express {
    interface Request {
      /** Set by `attachUser` when a valid session cookie is present. */
      userId?: string;
      user?: UserRow;
    }
  }
}

interface SessionPayload {
  sub: string;
  exp: number;
}

const b64url = (input: Buffer | string): string =>
  Buffer.from(input).toString('base64url');

function sign(value: string): string {
  return createHmac('sha256', env.sessionSecret).update(value).digest('base64url');
}

export function createSessionToken(userId: string, now = Date.now()): string {
  const payload: SessionPayload = { sub: userId, exp: now + env.cookie.maxAgeMs };
  const body = b64url(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

/** Returns the user id, or null for a missing, malformed, forged or expired token. */
export function readSessionToken(token: string | undefined, now = Date.now()): string | null {
  if (!token) return null;

  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;

  const body = token.slice(0, dot);
  const provided = Buffer.from(token.slice(dot + 1));
  const expected = Buffer.from(sign(body));

  // Compare lengths first: timingSafeEqual throws on a mismatch.
  if (provided.length !== expected.length) return null;
  if (!timingSafeEqual(provided, expected)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload;
    if (typeof payload.sub !== 'string' || typeof payload.exp !== 'number') return null;
    if (payload.exp < now) return null;
    return payload.sub;
  } catch {
    return null;
  }
}

export function setSessionCookie(res: Response, userId: string): void {
  res.cookie(env.cookie.name, createSessionToken(userId), {
    httpOnly: true,
    sameSite: env.cookie.sameSite,
    secure: env.cookie.secure,
    maxAge: env.cookie.maxAgeMs,
    path: '/',
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(env.cookie.name, {
    httpOnly: true,
    sameSite: env.cookie.sameSite,
    secure: env.cookie.secure,
    path: '/',
  });
}

/**
 * Resolves the session on every request without rejecting anonymous ones —
 * public endpoints such as the plan catalogue still need to work.
 */
export function attachUser(req: Request, _res: Response, next: NextFunction): void {
  const userId = readSessionToken(req.cookies?.[env.cookie.name]);
  if (userId) {
    const user = findUserById(userId);
    if (user) {
      req.userId = user.id;
      req.user = user;
    }
  }
  next();
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.userId) return next(errors.unauthenticated());
  next();
}

/** Narrowed accessor for handlers that sit behind `requireAuth`. */
export function sessionUser(req: Request): UserRow {
  if (!req.user) throw errors.unauthenticated();
  return req.user;
}
