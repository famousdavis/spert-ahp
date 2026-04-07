import { useState } from 'react';
import { useAuth, getFirstName } from '../../contexts/AuthContext';
import { useStorage } from '../../contexts/StorageContext';
import { useSession } from '../../hooks/useSession';
import { LocalStorageAdapter } from '../../storage/LocalStorageAdapter';
import { FirestoreAdapter } from '../../storage/FirestoreAdapter';
import {
  uploadLocalToCloud,
  hasUploadedToCloud,
  type MigrationResult,
} from '../../storage/migration';

export default function StorageSection() {
  const { user, loading: authLoading, firebaseAvailable, signInWithGoogle, signInWithMicrosoft, signOut } = useAuth();
  const { mode, switchMode } = useStorage();
  const { userId: localUserId } = useSession();

  const [busy, setBusy] = useState(false);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!firebaseAvailable) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Storage</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Cloud storage is not configured for this deployment. Data is stored locally in your browser.
        </p>
      </div>
    );
  }

  const handleSelectLocal = async () => {
    setError(null);
    setMigrationResult(null);
    await switchMode('local');
  };

  const handleSelectCloud = async () => {
    setError(null);
    setMigrationResult(null);
    if (!user) {
      // Sign-in will happen via the buttons below — don't switch mode yet
      return;
    }
    await switchMode('cloud');
    // If there's local data and we haven't uploaded before, offer upload
    const local = new LocalStorageAdapter();
    const models = await local.listModels();
    if (models.length > 0 && !hasUploadedToCloud()) {
      // Confirmation handled by a separate UI block below
    }
  };

  const handleUpload = async () => {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      const local = new LocalStorageAdapter();
      const cloud = new FirestoreAdapter(user.uid);
      const result = await uploadLocalToCloud(local, cloud, localUserId, user.uid);
      setMigrationResult(result);
      if (result.errors.length === 0) {
        await switchMode('cloud');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    setBusy(true);
    try {
      await signOut();
      await switchMode('local');
    } finally {
      setBusy(false);
    }
  };

  // Check if local data exists and upload is pending
  const shouldOfferUpload =
    mode === 'cloud' &&
    user &&
    !hasUploadedToCloud() &&
    !migrationResult;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Storage</h3>

      {/* Mode selector */}
      <div className="space-y-2">
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="radio"
            name="storage-mode"
            checked={mode === 'local'}
            onChange={handleSelectLocal}
            disabled={busy}
            className="mt-1"
          />
          <div className="text-sm">
            <div className="font-medium text-gray-900 dark:text-gray-100">Local</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Data stays on this device.</div>
          </div>
        </label>
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="radio"
            name="storage-mode"
            checked={mode === 'cloud'}
            onChange={handleSelectCloud}
            disabled={busy || authLoading}
            className="mt-1"
          />
          <div className="text-sm">
            <div className="font-medium text-gray-900 dark:text-gray-100">Cloud</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Sync across devices, share decisions with others.
            </div>
          </div>
        </label>
      </div>

      {/* Account block — signed in */}
      {user && (
        <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-700 space-y-2">
          <div className="text-xs text-gray-500 dark:text-gray-400">Signed in as</div>
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {getFirstName(user)}
            {user.email && <span className="text-gray-500 dark:text-gray-400"> · {user.email}</span>}
          </div>
          <button
            onClick={handleSignOut}
            disabled={busy}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
          >
            Sign out
          </button>
        </div>
      )}

      {/* Sign-in block — cloud selected but not signed in */}
      {mode === 'cloud' && !user && !authLoading && (
        <div className="space-y-2">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Sign in to use cloud storage:
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={async () => {
                setBusy(true);
                setError(null);
                try {
                  await signInWithGoogle();
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-sm text-gray-900 dark:text-gray-100 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              Sign in with Google
            </button>
            <button
              onClick={async () => {
                setBusy(true);
                setError(null);
                try {
                  await signInWithMicrosoft();
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-sm text-gray-900 dark:text-gray-100 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              Sign in with Microsoft
            </button>
          </div>
        </div>
      )}

      {/* Upload prompt */}
      {shouldOfferUpload && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md space-y-2">
          <p className="text-xs text-blue-900 dark:text-blue-200">
            Upload your existing local decisions to the cloud? Your local data will remain as a backup.
          </p>
          <button
            onClick={handleUpload}
            disabled={busy}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      )}

      {/* Migration result */}
      {migrationResult && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md text-xs text-green-900 dark:text-green-200">
          Uploaded {migrationResult.uploaded} decision{migrationResult.uploaded === 1 ? '' : 's'}
          {migrationResult.skipped > 0 && `, skipped ${migrationResult.skipped} existing`}
          {migrationResult.errors.length > 0 && `, ${migrationResult.errors.length} error(s)`}.
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-xs text-red-900 dark:text-red-200">
          {error}
        </div>
      )}
    </div>
  );
}
