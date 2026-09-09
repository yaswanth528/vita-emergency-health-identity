import { Router } from 'express';
import { DEMO_IDENTITIES, isIdentityRole } from '../../shared/identities.js';
import { clearSessionCookie, requireAuth, sessionUser, setSessionCookie } from '../auth.js';
import { errors } from '../errors.js';
import { ensureUser } from '../store.js';

/* ============================================================================
   Sessions
   ----------------------------------------------------------------------------
   `POST /login` takes a role rather than credentials, which is what the sign-in
   screen has always offered. The difference from before is that it now creates
   a durable user row and a signed cookie, so the server knows who is asking
   before it will create a payment on their behalf.
   ========================================================================== */

export const authRouter = Router();

authRouter.post('/login', (req, res) => {
  const role = (req.body as { role?: unknown })?.role;
  if (!isIdentityRole(role)) {
    throw errors.invalidRequest('Choose either the patient or the clinician account.');
  }

  const user = ensureUser(DEMO_IDENTITIES[role]);
  setSessionCookie(res, user.id);
  res.json({ user: { id: user.id, role: user.role, name: user.name, email: user.email } });
});

authRouter.post('/logout', (_req, res) => {
  clearSessionCookie(res);
  res.status(204).end();
});

authRouter.get('/me', requireAuth, (req, res) => {
  const user = sessionUser(req);
  res.json({ user: { id: user.id, role: user.role, name: user.name, email: user.email } });
});
