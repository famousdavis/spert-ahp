import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useStorage } from '../contexts/StorageContext';
import { INVITATIONS_ENABLED } from '../lib/featureFlags';

const SESSION_KEY = 'spert:pendingInviteToken';
const QUERY_PARAM = 'invite';

export type InvitationLandingState =
  | { kind: 'idle' }
  | { kind: 'pre_auth'; tokenId: string }
  | { kind: 'claimed'; modelNames: string[] };

interface ClaimedDetail {
  appId: string;
  modelId: string;
  modelName: string;
}

/**
 * Manages the ?invite=tokenId landing flow.
 *
 *  1. On mount, if the URL carries ?invite=, persist the token to
 *     sessionStorage (so it survives the OAuth popup round-trip), force
 *     the storage mode preference to 'cloud' (the invitee can't see the
 *     shared model in local mode), and surface a 'pre_auth' state so the
 *     shell can render a banner with sign-in CTAs.
 *  2. Once the user signs in, AuthContext fires `spert:models-changed`
 *     (which we listen for here too). We transition to 'claimed' with
 *     the names of any newly-claimed projects, then clear sessionStorage.
 *  3. If the user dismisses the banner, the hook returns 'idle' until
 *     the next claim event.
 *
 * Behind INVITATIONS_ENABLED — the hook short-circuits to 'idle' when
 * the flag is off, so production is unchanged.
 *
 * The auto-cloud-mode switch is intentional: an invitee landing from
 * email has unambiguously opted into the shared-cloud workflow. Without
 * the switch, signing in would leave them in local mode and the
 * freshly-claimed model would be invisible — see useInvitationLanding
 * docs for the full sequence.
 */
export function useInvitationLanding(): {
  state: InvitationLandingState;
  dismiss: () => void;
} {
  const { user } = useAuth();
  const { switchMode, isCloudAvailable } = useStorage();
  const [state, setState] = useState<InvitationLandingState>({ kind: 'idle' });

  // 1) Detect ?invite= on first mount, regardless of auth state.
  useEffect(() => {
    if (!INVITATIONS_ENABLED) return;
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const token = url.searchParams.get(QUERY_PARAM);
    if (token) {
      try {
        sessionStorage.setItem(SESSION_KEY, token);
      } catch {
        // sessionStorage may be unavailable in private mode — non-fatal.
      }
      // Strip the query param so reloads don't replay the banner.
      url.searchParams.delete(QUERY_PARAM);
      window.history.replaceState({}, '', url.toString());
      // Pre-flip the storage preference so that whatever path the user
      // takes to sign in (banner CTA or header AuthChip), they end up in
      // cloud mode and can see the freshly-claimed shared project.
      // No observable effect until they sign in (effectiveMode falls
      // back to 'local' while user is null).
      if (isCloudAvailable) switchMode('cloud');
    }
    const stored = (() => {
      try {
        return sessionStorage.getItem(SESSION_KEY);
      } catch {
        return null;
      }
    })();
    if (stored && !user) {
      setState({ kind: 'pre_auth', tokenId: stored });
    }
  }, [user, switchMode, isCloudAvailable]);

  // 2) Listen for claim events dispatched by AuthContext.
  useEffect(() => {
    if (!INVITATIONS_ENABLED) return;
    if (typeof window === 'undefined') return;
    const onChanged = (evt: Event) => {
      const detail = (evt as CustomEvent<{ claimed?: ClaimedDetail[] }>).detail;
      const claimed = detail?.claimed ?? [];
      if (claimed.length === 0) return;
      const names = claimed.map((c) => c.modelName).filter((n) => n.length > 0);
      try {
        sessionStorage.removeItem(SESSION_KEY);
      } catch {
        // sessionStorage unavailable — non-fatal.
      }
      setState({ kind: 'claimed', modelNames: names });
    };
    window.addEventListener('spert:models-changed', onChanged);
    return () => window.removeEventListener('spert:models-changed', onChanged);
  }, []);

  return {
    state,
    dismiss: () => {
      try {
        sessionStorage.removeItem(SESSION_KEY);
      } catch {
        // sessionStorage unavailable — non-fatal.
      }
      setState({ kind: 'idle' });
    },
  };
}
