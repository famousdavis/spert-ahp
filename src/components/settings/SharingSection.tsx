import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FirebaseError } from 'firebase/app';
import { collection, query, where, limit, getDocs } from 'firebase/firestore';
import { db, getSendInvitationEmail, type SendInvitationEmailResult } from '../../lib/firebase';
import { INVITATIONS_ENABLED } from '../../lib/featureFlags';
import { useAuth } from '../../contexts/AuthContext';
import { useStorage } from '../../contexts/StorageContext';
import { useProfiles } from '../../hooks/useProfiles';
import type {
  UseAHPReturn,
  CollaboratorDoc,
  CollaboratorRole,
  PendingInvite,
} from '../../types/ahp';

interface SharingSectionProps {
  ahpState: UseAHPReturn;
}

async function lookupUidByEmail(email: string): Promise<{ uid: string; displayName?: string } | null> {
  if (!db) return null;
  // limit(1) is required by the spertahp_profiles list rule (v0.7.2) to
  // block bulk profile enumeration while preserving this email-to-uid
  // lookup. Email equality is unique in practice, so a hit is deterministic.
  const q = query(
    collection(db, 'spertahp_profiles'),
    where('email', '==', email.trim().toLowerCase()),
    limit(1),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const first = snap.docs[0]!;
  const data = first.data() as { displayName?: string };
  return { uid: first.id, displayName: data.displayName };
}

/**
 * Split a bulk-paste textarea into a normalized list of email addresses.
 * Accepts commas, semicolons, and any whitespace (including newlines) as
 * separators. Lowercases, trims, and de-duplicates while preserving the
 * caller's original ordering.
 */
export function parseBulkEmails(raw: string): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(/[,;\s]+/)) {
    const e = part.trim().toLowerCase();
    if (!e || seen.has(e)) continue;
    seen.add(e);
    out.push(e);
  }
  return out;
}

/**
 * Translate a Firebase callable error into copy the owner can act on.
 * Falls back to the raw message for unmapped codes.
 *
 * `context` disambiguates error codes shared across callables — e.g.
 * resource-exhausted means the per-day 25-cap on send, but the per-
 * invitation 5-cap on resend; permission-denied / failed-precondition
 * also need different copy for resend/revoke vs. send.
 */
export type InvitationErrorContext = 'send' | 'resend' | 'revoke';

export function mapInvitationError(
  err: unknown,
  context: InvitationErrorContext = 'send',
): string {
  const code = (err as { code?: string }).code ?? '';
  const message = (err as { message?: string }).message ?? '';
  if (code === 'functions/resource-exhausted') {
    if (context === 'resend') {
      return 'This invitation has reached its resend limit (5). Revoke and re-invite to start over.';
    }
    return "You've reached today's invitation limit (25). Try again tomorrow.";
  }
  if (code === 'functions/permission-denied') {
    if (context === 'resend' || context === 'revoke') {
      return 'Only the model owner can resend or revoke this invitation.';
    }
    return 'Only the model owner can send invitations.';
  }
  if (code === 'functions/failed-precondition') {
    if (context === 'resend' || context === 'revoke') {
      return 'This invitation can no longer be resent or revoked.';
    }
    return message || 'The invitation request could not be processed.';
  }
  if (code === 'functions/unauthenticated') {
    return 'Please sign in again before sending invitations.';
  }
  if (code === 'functions/not-found') {
    if (context === 'resend' || context === 'revoke') {
      return 'This invitation no longer exists. Try reloading.';
    }
    return 'This decision could not be found. Try reloading.';
  }
  if (code === 'functions/invalid-argument') {
    return message || 'One of the invitation fields is invalid.';
  }
  if (context === 'resend') {
    return message || 'Something went wrong resending the invitation.';
  }
  if (context === 'revoke') {
    return message || 'Something went wrong revoking the invitation.';
  }
  return message || 'Something went wrong sending the invitations.';
}

function formatDate(ms: number): string {
  if (!ms) return '';
  return new Date(ms).toLocaleDateString();
}

export default function SharingSection({ ahpState }: SharingSectionProps) {
  const { user } = useAuth();
  const { mode } = useStorage();
  const [collabs, setCollabs] = useState<CollaboratorDoc[]>([]);
  // Legacy (flag off) — single email input.
  const [email, setEmail] = useState('');
  // New (flag on) — bulk-paste textarea.
  const [bulkEmails, setBulkEmails] = useState('');
  const [role, setRole] = useState<'editor' | 'viewer'>('editor');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<SendInvitationEmailResult | null>(null);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  // tokenId of the pending-invite row whose Resend/Revoke is in flight; null otherwise.
  // Used to disable the row's buttons (and all other rows' buttons) while a request runs.
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  useEffect(() => {
    setCollabs(ahpState.collaborators);
  }, [ahpState.collaborators]);

  const collabUserIds = useMemo(() => collabs.map((c) => c.userId), [collabs]);
  const profileMap = useProfiles(collabUserIds);

  const refreshPending = useCallback(async () => {
    if (!INVITATIONS_ENABLED) return;
    if (!ahpState.modelId) return;
    try {
      const list = await ahpState.storage.listPendingInvites(ahpState.modelId);
      setPendingInvites(list);
    } catch (e) {
      console.error('listPendingInvites failed:', (e as Error).message);
    }
  }, [ahpState.modelId, ahpState.storage]);

  useEffect(() => {
    void refreshPending();
  }, [refreshPending]);

  if (mode !== 'cloud' || !user || !ahpState.modelId) return null;
  const currentRole = ahpState.collaborators.find((c) => c.userId === user.uid)?.role;
  if (currentRole !== 'owner') return null;

  // ─── Legacy add path (flag off) ────────────────────────────
  const handleAddLegacy = async () => {
    setError(null);
    if (!email.trim()) return;
    setBusy(true);
    try {
      const found = await lookupUidByEmail(email);
      if (!found) {
        setError(
          'User not found. They need to sign in to SPERT AHP at least once before they can be added.',
        );
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
      await ahpState.loadModel(ahpState.modelId!);
      setEmail('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // ─── Invitation add path (flag on) ─────────────────────────
  const handleAddInvitations = async () => {
    setError(null);
    setLastResult(null);
    const emails = parseBulkEmails(bulkEmails);
    if (emails.length === 0) {
      setError('Enter at least one email address.');
      return;
    }
    if (emails.length > 25) {
      setError('You can invite at most 25 people per submission.');
      return;
    }
    const callable = getSendInvitationEmail();
    if (!callable) {
      setError('Cloud sharing is unavailable in this build.');
      return;
    }
    setBusy(true);
    try {
      const res = await callable({
        appId: 'spertahp',
        modelId: ahpState.modelId!,
        emails,
        role,
        isVoting: role === 'editor',
      });
      setLastResult(res.data);
      setBulkEmails('');
      // The auto-add path mutates the model document; refresh both
      // collaborators (via loadModel) and the pending-invite list.
      await ahpState.loadModel(ahpState.modelId!);
      await refreshPending();
    } catch (e) {
      setError(mapInvitationError(e as FirebaseError));
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

  const handleResendInvite = async (tokenId: string) => {
    setActionBusy(tokenId);
    setError(null);
    try {
      await ahpState.storage.resendInvite(tokenId);
      await refreshPending();
    } catch (e) {
      setError(mapInvitationError(e as FirebaseError, 'resend'));
    } finally {
      setActionBusy(null);
    }
  };

  const handleRevokeInvite = async (tokenId: string) => {
    if (!window.confirm("Revoke this invitation? The invitee won't be able to claim it.")) return;
    setActionBusy(tokenId);
    setError(null);
    try {
      await ahpState.storage.revokeInvite(tokenId);
      await refreshPending();
    } catch (e) {
      setError(mapInvitationError(e as FirebaseError, 'revoke'));
    } finally {
      setActionBusy(null);
    }
  };

  const handleRemove = async (userId: string) => {
    if (!window.confirm('Remove this collaborator?')) return;
    setBusy(true);
    setError(null);
    try {
      // Routed through the adapter (replaces a direct updateDoc bypass that
      // previously lived here). FirestoreAdapter.removeCollaborator handles
      // the embedded array + members map atomically.
      await ahpState.storage.removeCollaborator(ahpState.modelId!, userId);
      await ahpState.loadModel(ahpState.modelId!);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const renderResultSummary = () => {
    if (!lastResult) return null;
    const lines: string[] = [];
    if (lastResult.added.length > 0) {
      lines.push(`Added ${lastResult.added.length}: ${lastResult.added.join(', ')}`);
    }
    if (lastResult.invited.length > 0) {
      lines.push(`Invited ${lastResult.invited.length}: ${lastResult.invited.join(', ')}`);
    }
    if (lastResult.failed.length > 0) {
      const grouped = lastResult.failed.map((f) => `${f.email} (${f.reason})`).join(', ');
      lines.push(`Skipped ${lastResult.failed.length}: ${grouped}`);
    }
    if (lines.length === 0) return null;
    return (
      <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
        {lines.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Sharing</h3>
      {INVITATIONS_ENABLED ? (
        <>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Invite collaborators by email. Existing SPERT users are added immediately;
            new emails receive a one-time invitation link (expires in 30 days).
          </p>
          <textarea
            value={bulkEmails}
            onChange={(e) => setBulkEmails(e.target.value)}
            placeholder="alice@example.com, bob@example.com&#10;carol@example.com"
            disabled={busy}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
            aria-label="Email addresses to invite"
          />
          <div className="flex items-center gap-2">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'editor' | 'viewer')}
              disabled={busy}
              className="px-2 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md text-sm"
              aria-label="Role for invitees"
            >
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
            <button
              onClick={handleAddInvitations}
              disabled={busy || !bulkEmails.trim()}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {busy ? 'Sending…' : 'Add'}
            </button>
            <span className="text-xs text-gray-400">Max 25 per day.</span>
          </div>
        </>
      ) : (
        <>
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
              onChange={(e) => setRole(e.target.value as 'editor' | 'viewer')}
              disabled={busy}
              className="px-2 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md text-sm"
            >
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
            <button
              onClick={handleAddLegacy}
              disabled={busy || !email.trim()}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </>
      )}

      {error && (
        <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-900 dark:text-red-200">
          {error}
        </div>
      )}

      {INVITATIONS_ENABLED && renderResultSummary()}

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

      {INVITATIONS_ENABLED && pendingInvites.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300">
            Pending invitations ({pendingInvites.length})
          </h4>
          <ul className="divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-md">
            {pendingInvites.map((p) => {
              const sendCount = p.emailSendCount ?? 0;
              const rowBusy = actionBusy === p.tokenId;
              const anyBusy = actionBusy !== null;
              return (
                <li
                  key={p.tokenId}
                  className="flex items-center justify-between px-3 py-2 gap-2 text-xs"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-gray-900 dark:text-gray-100 truncate">
                      {p.inviteeEmail}
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400">
                      {p.role}
                      {p.isVoting && p.role === 'editor' ? ' · voting' : ''}
                      {p.lastEmailSentAt
                        ? ` · sent ${formatDate(p.lastEmailSentAt)} (${sendCount}/5)`
                        : ` · sent (${sendCount}/5)`}
                      {p.expiresAt ? ` · expires ${formatDate(p.expiresAt)}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleResendInvite(p.tokenId)}
                      disabled={anyBusy}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
                      aria-label={`Resend invitation to ${p.inviteeEmail}`}
                    >
                      {rowBusy ? 'Working…' : 'Resend'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRevokeInvite(p.tokenId)}
                      disabled={anyBusy}
                      className="text-xs text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
                      aria-label={`Revoke invitation to ${p.inviteeEmail}`}
                    >
                      Revoke
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
