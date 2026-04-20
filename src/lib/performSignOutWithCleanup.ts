import { signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from './firebase';
import { clearLocalConsent } from './consent';
import { runSignOutCleanup } from './signOutCleanupRegistry';

const ATTRIBUTION_KEY = 'ahp/exportAttribution';
const HAS_UPLOADED_KEY = 'ahp/hasUploadedToCloud';

export async function performSignOutWithCleanup(): Promise<void> {
  clearLocalConsent();
  localStorage.removeItem(ATTRIBUTION_KEY);
  localStorage.removeItem(HAS_UPLOADED_KEY);
  await runSignOutCleanup();
  if (auth) await firebaseSignOut(auth);
}
