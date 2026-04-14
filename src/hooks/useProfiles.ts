import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

export interface ProfileInfo {
  displayName: string;
  email: string;
}

/**
 * Fetches display profiles for a list of user IDs from spertahp_profiles.
 * Uses the current auth user's data directly to avoid an extra Firestore read.
 * Returns a stable map that updates when userIds change.
 */
export function useProfiles(userIds: string[]): Record<string, ProfileInfo> {
  const { user } = useAuth();
  const [profileMap, setProfileMap] = useState<Record<string, ProfileInfo>>({});

  useEffect(() => {
    if (!db || userIds.length === 0) {
      setProfileMap({});
      return;
    }
    let cancelled = false;

    async function fetchProfiles() {
      const map: Record<string, ProfileInfo> = {};
      await Promise.all(
        userIds.map(async (uid) => {
          // Use auth context for the current user to avoid an extra read
          if (user && uid === user.uid) {
            map[uid] = {
              displayName: user.displayName ?? '',
              email: user.email ?? '',
            };
            return;
          }
          try {
            const snap = await getDoc(doc(db!, 'spertahp_profiles', uid));
            if (snap.exists()) {
              const data = snap.data() as { displayName?: string; email?: string };
              map[uid] = {
                displayName: data.displayName ?? '',
                email: data.email ?? '',
              };
            }
          } catch {
            // Profile fetch failed — caller will fall back to truncated UID
          }
        }),
      );
      if (!cancelled) setProfileMap(map);
    }

    void fetchProfiles();
    return () => { cancelled = true; };
  }, [userIds.join(','), user]);

  return profileMap;
}
