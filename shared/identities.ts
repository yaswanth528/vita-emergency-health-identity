/* ============================================================================
   Demo identities
   ----------------------------------------------------------------------------
   The two accounts the sign-in screen offers. They live in `shared/` because
   the server now issues real sessions against them: if the browser's idea of
   "who is signed in" used a different id from the row the subscription hangs
   off, a paid plan would vanish on reload.

   Credentials are still out of scope, exactly as `/login` says. What changed is
   that the session is now asserted by the server rather than by React state,
   which is the minimum required to bill anybody.
   ========================================================================== */

export type IdentityRole = 'patient' | 'clinician';

export interface DemoIdentity {
  id: string;
  role: IdentityRole;
  name: string;
  email: string;
}

export const DEMO_IDENTITIES: Record<IdentityRole, DemoIdentity> = {
  patient: {
    id: 'usr-patient-kavita',
    role: 'patient',
    name: 'Kavita Menon',
    email: 'kavita.menon@example.com',
  },
  clinician: {
    id: 'usr-clinician-rao',
    role: 'clinician',
    name: 'Dr. Arjun Rao',
    email: 'arjun.rao@apollo.example',
  },
};

export function isIdentityRole(value: unknown): value is IdentityRole {
  return value === 'patient' || value === 'clinician';
}
