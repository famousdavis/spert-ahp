import { useAuth } from '../contexts/AuthContext';
import { useStorage } from '../contexts/StorageContext';
import { useSession } from './useSession';

/**
 * Returns the active userId based on storage mode.
 * - Local mode: localStorage-persisted session ID (e.g. "user-1712345678-abc123")
 * - Cloud mode: Firebase uid from the authenticated user
 *
 * The userId is always a string; only the source differs. Components that
 * receive userId as a prop don't need to know which source it came from.
 */
export function useUserId(): string {
  const { effectiveMode } = useStorage();
  const { user } = useAuth();
  const { userId: localId } = useSession();
  return effectiveMode === 'cloud' && user ? user.uid : localId;
}
