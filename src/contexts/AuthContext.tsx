import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  OAuthProvider,
  GoogleAuthProvider,
  type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, isFirebaseAvailable } from '../lib/firebase';
import {
  TOS_VERSION,
  APP_ID,
  hasAcceptedCurrentTos,
  recordLocalAcceptance,
  setWritePending,
  clearWritePending,
  consumeWritePending,
  peekWritePending,
} from '../lib/consent';
import { performSignOutWithCleanup } from '../lib/performSignOutWithCleanup';
import ConsentModal from '../components/shell/ConsentModal';

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  firebaseAvailable: boolean;
  signInError: string | null;
  clearSignInError: () => void;
  signInWithMicrosoft: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Write or update the consent record at users/{uid} in Firestore.
 * Throws on Firestore failure so the caller can keep TOS_WRITE_PENDING
 * set and surface an error to the user (A7 fix).
 *
 * Three cases:
 *  (a) New user → full setDoc with appId
 *  (b) Existing user, outdated tosVersion → merge update WITHOUT appId
 *  (c) Existing user, current version → no write
 */
async function writeConsentRecord(user: User): Promise<void> {
  if (!db) return;
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(userRef, {
      acceptedAt: serverTimestamp(),
      tosVersion: TOS_VERSION,
      privacyPolicyVersion: TOS_VERSION,
      appId: APP_ID,
      authProvider: user.providerData[0]?.providerId ?? 'unknown',
    });
  } else {
    const data = snap.data();
    if (data['tosVersion'] !== TOS_VERSION) {
      await setDoc(
        userRef,
        {
          acceptedAt: serverTimestamp(),
          tosVersion: TOS_VERSION,
          privacyPolicyVersion: TOS_VERSION,
          authProvider: user.providerData[0]?.providerId ?? 'unknown',
        },
        { merge: true },
      );
    }
  }
}

/**
 * Verify a returning user's stored consent matches the current TOS_VERSION.
 * Returns true if accepted (current), false if missing or outdated.
 * On Firestore error, returns true (non-blocking — let the user through).
 */
async function checkReturningUserConsent(user: User): Promise<boolean> {
  if (!db) return true;
  try {
    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists() || snap.data()['tosVersion'] !== TOS_VERSION) {
      return false;
    }
    recordLocalAcceptance();
    return true;
  } catch (err) {
    console.error('Failed to check consent record:', (err as { code?: string }).code ?? 'unknown');
    return true;
  }
}

/**
 * Write or update the per-app profile document used for sharing UI email
 * lookups. Non-blocking — sharing UI is a secondary feature.
 */
function writeUserProfile(user: User): void {
  if (!db) return;
  void setDoc(
    doc(db, 'spertahp_profiles', user.uid),
    {
      displayName: user.displayName ?? '',
      email: user.email ?? '',
      photoURL: user.photoURL ?? null,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  ).catch((err) => {
    console.error('Failed to update profile:', (err as { code?: string }).code ?? 'unknown');
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isFirebaseAvailable);
  const [signInError, setSignInError] = useState<string | null>(null);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [pendingProvider, setPendingProvider] = useState<'google' | 'microsoft' | null>(null);

  const clearSignInError = useCallback(() => setSignInError(null), []);

  useEffect(() => {
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      // A7: peek only — do not consume the flag until the Firestore
      // consent write has succeeded.
      const isPendingWrite = peekWritePending();

      if (isPendingWrite) {
        // Branch A: user just accepted consent and signed in
        try {
          await writeConsentRecord(firebaseUser);
        } catch (err) {
          console.error('Consent record write failed:', (err as { code?: string }).code ?? 'unknown');
          setSignInError('Could not finalize cloud access — please try signing in again.');
          await performSignOutWithCleanup();
          setLoading(false);
          return;
        }
        consumeWritePending();
        writeUserProfile(firebaseUser);
        recordLocalAcceptance();
        setUser(firebaseUser);
        setLoading(false);
      } else {
        // Branch B: returning user (existing session on app load)
        if (hasAcceptedCurrentTos()) {
          // Fast path: local cache matches current version
          writeUserProfile(firebaseUser);
          setUser(firebaseUser);
          setLoading(false);
        } else {
          // Need to verify with Firestore
          const isValid = await checkReturningUserConsent(firebaseUser);
          if (isValid) {
            writeUserProfile(firebaseUser);
            setUser(firebaseUser);
            setLoading(false);
          } else {
            // Version mismatch or no record — sign out and force re-consent
            await performSignOutWithCleanup();
            setLoading(false);
          }
        }
      }
    });

    return unsubscribe;
  }, []);

  const initiateSignIn = useCallback(async (provider: 'google' | 'microsoft'): Promise<void> => {
    if (!auth) return;

    try {
      // D1: set pending-write flag INSIDE the try so any pre-popup throw
      // can be cleaned up by the catch block below.
      setWritePending();

      if (provider === 'google') {
        const googleProvider = new GoogleAuthProvider();
        await signInWithPopup(auth, googleProvider);
      } else {
        const msProvider = new OAuthProvider('microsoft.com');
        msProvider.setCustomParameters({ prompt: 'select_account' });
        await signInWithPopup(auth, msProvider);
      }
      // onAuthStateChanged handles the rest (Branch A)
    } catch (err) {
      const error = err as { code?: string };
      // Prevent a stale pending flag from contaminating the next auth event.
      clearWritePending();
      if (
        error.code === 'auth/popup-closed-by-user' ||
        error.code === 'auth/cancelled-popup-request'
      ) {
        // User dismissed or double-clicked — silent return.
        return;
      }
      if (error.code === 'auth/popup-blocked') {
        setSignInError(
          'Sign-in was blocked by your browser. Please allow popups for this site and try again.',
        );
        throw err;
      }
      if (error.code === 'auth/account-exists-with-different-credential') {
        setSignInError(
          'An account with this email already exists using a different sign-in method. Please use the other provider (Google or Microsoft) — whichever you signed in with the first time.',
        );
        return;
      }
      console.error('Sign-in error:', error.code ?? 'unknown');
      // Re-throw so StorageSection can surface the error to the user
      throw err;
    }
  }, []);

  const handleSignInRequest = useCallback(
    async (provider: 'google' | 'microsoft'): Promise<void> => {
      if (hasAcceptedCurrentTos()) {
        // Already accepted — go straight to auth
        await initiateSignIn(provider);
      } else {
        // Need consent first — show modal, defer auth until accepted
        setPendingProvider(provider);
        setShowConsentModal(true);
      }
    },
    [initiateSignIn],
  );

  const handleConsentAccept = useCallback(() => {
    recordLocalAcceptance();
    setShowConsentModal(false);
    if (pendingProvider) {
      void initiateSignIn(pendingProvider);
      setPendingProvider(null);
    }
  }, [pendingProvider, initiateSignIn]);

  const handleConsentCancel = useCallback(() => {
    setShowConsentModal(false);
    setPendingProvider(null);
  }, []);

  const handleSignOut = useCallback(async (): Promise<void> => {
    await performSignOutWithCleanup();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        firebaseAvailable: isFirebaseAvailable,
        signInError,
        clearSignInError,
        signInWithMicrosoft: () => handleSignInRequest('microsoft'),
        signInWithGoogle: () => handleSignInRequest('google'),
        signOut: handleSignOut,
      }}
    >
      {children}
      {showConsentModal && (
        <ConsentModal onAccept={handleConsentAccept} onCancel={handleConsentCancel} />
      )}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

/**
 * Extracts the first name from a user's displayName, handling Microsoft's
 * "Last, First" format. Per ARCHITECTURE.md §22.3.
 */
export function getFirstName(user: User | null): string {
  if (!user) return '';
  const name = user.displayName || user.email || '';
  // Microsoft "Last, First Middle" → take the part after the comma, then first token
  const afterComma = name.includes(',') ? (name.split(',')[1]?.trim() ?? name) : name;
  return afterComma.split(/\s+/)[0] || afterComma;
}
