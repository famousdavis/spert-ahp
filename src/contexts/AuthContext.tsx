import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  OAuthProvider,
  GoogleAuthProvider,
  type User,
} from 'firebase/auth';
import { auth, isFirebaseAvailable } from '../lib/firebase';

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  firebaseAvailable: boolean;
  signInWithMicrosoft: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // If Firebase isn't configured, skip the loading state entirely — no auth to resolve.
  const [loading, setLoading] = useState(isFirebaseAvailable);

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signInWithMicrosoft = async (): Promise<void> => {
    if (!auth) return;
    const provider = new OAuthProvider('microsoft.com');
    provider.setCustomParameters({ prompt: 'select_account' });
    await signInWithPopup(auth, provider);
  };

  const signInWithGoogle = async (): Promise<void> => {
    if (!auth) return;
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const signOut = async (): Promise<void> => {
    if (!auth) return;
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        firebaseAvailable: isFirebaseAvailable,
        signInWithMicrosoft,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
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
  if (name.includes(',')) {
    return name.split(',')[1]?.trim() || name;
  }
  return name.split(' ')[0] || name;
}
