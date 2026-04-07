import { useState, useCallback } from 'react';
import { useAuth, getFirstName } from '../../contexts/AuthContext';
import { useStorage } from '../../contexts/StorageContext';
import { useSession } from '../../hooks/useSession';
import { LocalStorageAdapter } from '../../storage/LocalStorageAdapter';
import { FirestoreAdapter } from '../../storage/FirestoreAdapter';
import { uploadLocalToCloud, hasUploadedToCloud } from '../../storage/migration';

type MigrationState =
  | { status: 'idle' }
  | { status: 'confirm'; localCount: number }
  | { status: 'migrating' }
  | { status: 'done'; uploaded: number; skipped: number }
  | { status: 'error'; message: string };

/**
 * Storage section of the global settings modal. Follows the standard pattern
 * used by SPERT-CFD and other Vite apps in the suite:
 *
 *   - Both radios always visible (Local / Cloud)
 *   - Cloud radio is disabled when not signed in
 *   - Sign-in buttons (Google + Microsoft) live in a separate auth block below,
 *     always visible when Firebase is available
 *   - Sign-out button appears when signed in
 *   - Switching to cloud offers upload migration if local data exists
 *   - The "Cloud selected while signed out" intermediate state is unreachable
 */
export default function StorageSection() {
  const { mode, switchMode, isCloudAvailable } = useStorage();
  const { user, loading: authLoading, signInWithGoogle, signInWithMicrosoft, signOut } = useAuth();
  const { userId: localUserId } = useSession();

  const [busy, setBusy] = useState(false);
  const [migration, setMigration] = useState<MigrationState>({ status: 'idle' });
  const [error, setError] = useState<string | null>(null);

  const handleSwitchToLocal = useCallback(() => {
    setError(null);
    setMigration({ status: 'idle' });
    switchMode('local');
  }, [switchMode]);

  const handleSwitchToCloud = useCallback(async () => {
    if (!user) return;
    setError(null);

    // Skip migration dialog if we've already uploaded
    if (hasUploadedToCloud()) {
      switchMode('cloud');
      return;
    }

    // Count local models to decide whether to offer migration
    const local = new LocalStorageAdapter();
    const models = await local.listModels();
    if (models.length === 0) {
      switchMode('cloud');
      return;
    }

    setMigration({ status: 'confirm', localCount: models.length });
  }, [user, switchMode]);

  const handleMigrate = useCallback(async () => {
    if (!user) return;
    setBusy(true);
    setMigration({ status: 'migrating' });
    try {
      const local = new LocalStorageAdapter();
      const cloud = new FirestoreAdapter(user.uid);
      const result = await uploadLocalToCloud(local, cloud, localUserId, user.uid);
      setMigration({ status: 'done', uploaded: result.uploaded, skipped: result.skipped });
      switchMode('cloud');
    } catch (e) {
      setMigration({ status: 'error', message: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }, [user, localUserId, switchMode]);

  const handleSkipMigration = useCallback(() => {
    localStorage.setItem('ahp/hasUploadedToCloud', 'true');
    setMigration({ status: 'idle' });
    switchMode('cloud');
  }, [switchMode]);

  const handleSignIn = useCallback(
    async (provider: 'google' | 'microsoft') => {
      setBusy(true);
      setError(null);
      try {
        if (provider === 'google') {
          await signInWithGoogle();
        } else {
          await signInWithMicrosoft();
        }
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [signInWithGoogle, signInWithMicrosoft],
  );

  const handleSignOut = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await signOut();
      switchMode('local');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [signOut, switchMode]);

  if (!isCloudAvailable) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Storage</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Cloud storage is not configured for this deployment. Data is stored locally in your browser.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Storage</h3>

      {/* Mode radios — Cloud is disabled when not signed in */}
      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="radio"
            name="storage-mode"
            checked={mode === 'local'}
            onChange={handleSwitchToLocal}
            disabled={busy}
            className="accent-blue-600"
          />
          <span className="text-gray-900 dark:text-gray-100">Local</span>
        </label>
        <label className={`flex items-center gap-2 text-sm ${!user ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
          <input
            type="radio"
            name="storage-mode"
            checked={mode === 'cloud'}
            onChange={() => { void handleSwitchToCloud(); }}
            disabled={busy || !user}
            className="accent-blue-600"
          />
          <span className={user ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}>
            Cloud
          </span>
        </label>
      </div>

      {/* Auth block — always visible when cloud is available */}
      <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-700">
        {user ? (
          <div className="space-y-2">
            <div className="text-xs text-gray-500 dark:text-gray-400">Signed in as</div>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {getFirstName(user)}
              {user.email && <span className="text-gray-500 dark:text-gray-400"> · {user.email}</span>}
            </div>
            <button
              onClick={() => { void handleSignOut(); }}
              disabled={busy}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
            >
              Sign out
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Sign in to enable cloud storage:
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => { void handleSignIn('google'); }}
                disabled={busy || authLoading}
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-sm text-gray-900 dark:text-gray-100 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                Sign in with Google
              </button>
              <button
                onClick={() => { void handleSignIn('microsoft'); }}
                disabled={busy || authLoading}
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-sm text-gray-900 dark:text-gray-100 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                Sign in with Microsoft
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Migration confirm */}
      {migration.status === 'confirm' && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md space-y-2">
          <p className="text-xs text-blue-900 dark:text-blue-200">
            You have <strong>{migration.localCount}</strong> local decision
            {migration.localCount === 1 ? '' : 's'}. Upload to cloud?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => { void handleMigrate(); }}
              disabled={busy}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              Upload
            </button>
            <button
              onClick={handleSkipMigration}
              disabled={busy}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-sm text-gray-900 dark:text-gray-100 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              Skip
            </button>
          </div>
        </div>
      )}

      {migration.status === 'migrating' && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md text-xs text-blue-900 dark:text-blue-200">
          Uploading decisions to cloud…
        </div>
      )}

      {migration.status === 'done' && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md text-xs text-green-900 dark:text-green-200">
          Uploaded {migration.uploaded} decision{migration.uploaded === 1 ? '' : 's'}
          {migration.skipped > 0 && `, skipped ${migration.skipped} existing`}.
        </div>
      )}

      {migration.status === 'error' && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-xs text-red-900 dark:text-red-200">
          Migration failed: {migration.message}
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-xs text-red-900 dark:text-red-200">
          {error}
        </div>
      )}
    </div>
  );
}
