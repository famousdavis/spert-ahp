import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { LocalStorageAdapter } from '../storage/LocalStorageAdapter';
import { FirestoreAdapter } from '../storage/FirestoreAdapter';
import { useAuth } from './AuthContext';
import type { StorageAdapter } from '../types/ahp';

export type StorageMode = 'local' | 'cloud';

export interface StorageContextType {
  adapter: StorageAdapter;
  mode: StorageMode;
  switchMode: (mode: StorageMode) => Promise<void>;
}

export const StorageContext = createContext<StorageContextType | null>(null);

const MODE_KEY = 'ahp/storageMode';

function getInitialMode(): StorageMode {
  const saved = localStorage.getItem(MODE_KEY);
  return saved === 'cloud' ? 'cloud' : 'local';
}

export function StorageProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading, firebaseAvailable } = useAuth();
  const [mode, setMode] = useState<StorageMode>(getInitialMode);

  // Lazy initializer — avoids new instance on every render (GanttApp lesson 2)
  const [adapter, setAdapter] = useState<StorageAdapter>(() => new LocalStorageAdapter());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // CRITICAL: Hold ready = false while auth is resolving. Without this, the
    // effect fires with user === null (pre-resolution), creates a LocalStorageAdapter,
    // flips ready = true, then re-fires when auth resolves and swaps to
    // FirestoreAdapter — causing a brief flash of local-mode UI with a stale
    // project list before cloud data loads.
    if (authLoading) {
      setReady(false);
      return;
    }

    if (mode === 'cloud' && user && firebaseAvailable) {
      setAdapter(new FirestoreAdapter(user.uid));
    } else {
      setAdapter(new LocalStorageAdapter());
    }
    setReady(true);
  }, [mode, user, authLoading, firebaseAvailable]);

  const switchMode = async (newMode: StorageMode): Promise<void> => {
    localStorage.setItem(MODE_KEY, newMode);
    setMode(newMode);
    // Migration is handled by the caller (AppSettingsModal) in Phase 6.
  };

  // storageReady gate — don't render children until the adapter is settled
  // (SPERT-CFD lesson 25).
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-sm text-gray-500 dark:text-gray-400">Loading…</div>
      </div>
    );
  }

  const effectiveMode: StorageMode = adapter instanceof FirestoreAdapter ? 'cloud' : 'local';

  return (
    <StorageContext.Provider value={{ adapter, mode: effectiveMode, switchMode }}>
      {children}
    </StorageContext.Provider>
  );
}

export function useStorage(): StorageContextType {
  const ctx = useContext(StorageContext);
  if (!ctx) throw new Error('useStorage must be used within StorageProvider');
  return ctx;
}
