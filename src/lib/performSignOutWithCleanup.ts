import { signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from './firebase';
import { clearLocalConsent } from './consent';
import { runSignOutCleanup } from './signOutCleanupRegistry';
import { HAS_UPLOADED_KEY } from '../storage/migration';
import { INVITE_SESSION_KEY } from './captureInviteTokenFromUrl';

const ATTRIBUTION_KEY = 'ahp/exportAttribution';

// Intentionally NOT cleared on sign-out:
//   - ahp/sessionUserId, ahp/workspaceId — random browser-scoped opaque
//     identifiers used as `_originRef` fingerprints by migration.ts and
//     the change-log path. They are not PII. Clearing them would break
//     workspace continuity for repeated local→cloud migrations on the
//     same device.
//   - spert-theme — user UI preference, not user-scoped.
// All other ahp/* keys ARE cleared (consent, attribution, migration
// flag) — see v0.12.2 audit F5. The sessionStorage invite token is
// also cleared so the next user on the same tab does not inherit a
// stale pre_auth landing state (v0.15.0 audit finding #5).
export async function performSignOutWithCleanup(): Promise<void> {
  clearLocalConsent();
  localStorage.removeItem(ATTRIBUTION_KEY);
  localStorage.removeItem(HAS_UPLOADED_KEY);
  try {
    sessionStorage.removeItem(INVITE_SESSION_KEY);
  } catch {
    // sessionStorage unavailable — non-fatal.
  }
  await runSignOutCleanup();
  if (auth) await firebaseSignOut(auth);
}
