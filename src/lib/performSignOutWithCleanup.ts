import { signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from './firebase';
import { clearLocalConsent } from './consent';
import { runSignOutCleanup } from './signOutCleanupRegistry';

const ATTRIBUTION_KEY = 'ahp/exportAttribution';
const HAS_UPLOADED_KEY = 'ahp/hasUploadedToCloud';

// Intentionally NOT cleared on sign-out:
//   - ahp/sessionUserId, ahp/workspaceId — random browser-scoped opaque
//     identifiers used as `_originRef` fingerprints by migration.ts and
//     the change-log path. They are not PII. Clearing them would break
//     workspace continuity for repeated local→cloud migrations on the
//     same device.
//   - spert-theme — user UI preference, not user-scoped.
// All other ahp/* keys ARE cleared (consent, attribution, migration
// flag) — see v0.12.2 audit F5.
export async function performSignOutWithCleanup(): Promise<void> {
  clearLocalConsent();
  localStorage.removeItem(ATTRIBUTION_KEY);
  localStorage.removeItem(HAS_UPLOADED_KEY);
  await runSignOutCleanup();
  if (auth) await firebaseSignOut(auth);
}
