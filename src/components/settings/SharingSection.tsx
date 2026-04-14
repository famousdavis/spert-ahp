import { useEffect, useMemo, useState } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useStorage } from '../../contexts/StorageContext';
import { useProfiles } from '../../hooks/useProfiles';
import type { UseAHPReturn, CollaboratorDoc, CollaboratorRole } from '../../types/ahp';

interface SharingSectionProps {
  ahpState: UseAHPReturn;
}

async function lookupUidByEmail(email: string): Promise<{ uid: string; displayName?: string } | null> {
  if (!db) return null;
  const q = query(collection(db, 'spertahp_profiles'), where('email', '==', email.trim().toLowerCase()));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const first = snap.docs[0]!;
  const data = first.data() as { displayName?: string };
  return { uid: first.id, displayName: data.displayName };
}

export default function SharingSection({ ahpState }: SharingSectionProps) {
  const { user } = useAuth();
  const { mode } = useStorage();
  const [collabs, setCollabs] = useState<CollaboratorDoc[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<CollaboratorRole>('editor');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only render for cloud-mode owners
  useEffect(() => {
    setCollabs(ahpState.collaborators);
  }, [ahpState.collaborators]);

  const collabUserIds = useMemo(() => collabs.map((c) => c.userId), [collabs]);
  const profileMap = useProfiles(collabUserIds);

  if (mode !== 'cloud' || !user || !ahpState.modelId) return null;
  const currentRole = ahpState.collaborators.find((c) => c.userId === user.uid)?.role;
  if (currentRole !== 'owner') return null;

  const handleAdd = async () => {
    setError(null);
    if (!email.trim()) return;
    setBusy(true);
    try {
      const found = await lookupUidByEmail(email);
      if (!found) {
        setError('User not found. They need to sign in to SPERT AHP at least once before they can be added.');
        return;
      }
      if (ahpState.collaborators.some((c) => c.userId === found.uid)) {
        setError('Already a collaborator.');
        return;
      }
      await ahpState.storage.addCollaborator(ahpState.modelId!, {
        userId: found.uid,
        role,
        isVoting: role === 'editor',
      });
      // Reload collaborators via loadModel
      await ahpState.loadModel(ahpState.modelId!);
      setEmail('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: CollaboratorRole) => {
    setBusy(true);
    setError(null);
    try {
      await ahpState.storage.updateCollaborator(ahpState.modelId!, userId, { role: newRole });
      await ahpState.loadModel(ahpState.modelId!);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleToggleVoting = async (userId: string, isVoting: boolean) => {
    setBusy(true);
    setError(null);
    try {
      await ahpState.storage.updateCollaborator(ahpState.modelId!, userId, { isVoting });
      await ahpState.loadModel(ahpState.modelId!);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (userId: string) => {
    if (!db) return;
    if (!window.confirm('Remove this collaborator?')) return;
    setBusy(true);
    setError(null);
    try {
      // Remove from both collaborators array and members map
      const remainingCollabs = ahpState.collaborators.filter((c) => c.userId !== userId);
      await updateDoc(doc(db, 'spertahp_projects', ahpState.modelId!), {
        collaborators: remainingCollabs,
        [`members.${userId}`]: deleteField(),
      });
      await ahpState.loadModel(ahpState.modelId!);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Sharing</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Add collaborators by email. They must sign in to SPERT AHP at least once first.
      </p>

      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@example.com"
          disabled={busy}
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as CollaboratorRole)}
          disabled={busy}
          className="px-2 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md text-sm"
        >
          <option value="editor">Editor</option>
          <option value="viewer">Viewer</option>
        </select>
        <button
          onClick={handleAdd}
          disabled={busy || !email.trim()}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          Add
        </button>
      </div>

      {error && (
        <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-900 dark:text-red-200">
          {error}
        </div>
      )}

      <ul className="divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-md">
        {collabs.map((c) => {
          const isSelf = c.userId === user.uid;
          return (
            <li key={c.userId} className="flex items-center justify-between px-3 py-2 gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-900 dark:text-gray-100 truncate">
                  {profileMap[c.userId]?.displayName || `${c.userId.slice(0, 8)}…`}
                  {isSelf && <span className="ml-1 text-gray-400">(you)</span>}
                </div>
                {profileMap[c.userId]?.email && (
                  <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                    {profileMap[c.userId]!.email}
                  </div>
                )}
              </div>
              {c.role === 'owner' ? (
                <span className="text-xs text-gray-500 dark:text-gray-400">Owner</span>
              ) : (
                <>
                  <select
                    value={c.role}
                    onChange={(e) => handleRoleChange(c.userId, e.target.value as CollaboratorRole)}
                    disabled={busy}
                    className="text-xs px-1 py-0.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded"
                  >
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  {c.role === 'editor' && (
                    <label className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <input
                        type="checkbox"
                        checked={c.isVoting}
                        onChange={(e) => handleToggleVoting(c.userId, e.target.checked)}
                        disabled={busy}
                      />
                      Voting
                    </label>
                  )}
                  <button
                    onClick={() => handleRemove(c.userId)}
                    disabled={busy}
                    className="text-xs text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
                  >
                    Remove
                  </button>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
