import { type ReactNode } from 'react';
import { LocalStorageAdapter } from '../storage/LocalStorageAdapter';
import { StorageContext } from '../contexts/StorageContext';
import { AuthContext } from '../contexts/AuthContext';

/**
 * Test wrapper providing a local-mode LocalStorageAdapter via StorageContext
 * and a signed-out AuthContext. Use with renderHook's `wrapper` option.
 */
export function TestProviders({ children }: { children: ReactNode }) {
  const adapter = new LocalStorageAdapter();
  return (
    <AuthContext.Provider
      value={{
        user: null,
        loading: false,
        firebaseAvailable: false,
        signInWithMicrosoft: async () => {},
        signInWithGoogle: async () => {},
        signOut: async () => {},
      }}
    >
      <StorageContext.Provider
        value={{
          adapter,
          mode: 'local',
          effectiveMode: 'local',
          switchMode: async () => {},
        }}
      >
        {children}
      </StorageContext.Provider>
    </AuthContext.Provider>
  );
}
