import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { TestProviders } from '../../__tests__/test-utils';
import { useInvitationLanding } from '../useInvitationLanding';

// Mock the feature flag module so we can flip it per-suite. Vitest hoists
// vi.mock calls, so the import below resolves to the mocked module.
vi.mock('../../lib/featureFlags', () => ({
  __setFlag: (v: boolean) => {
    (globalThis as Record<string, unknown>).__INVITATIONS_ENABLED = v;
  },
  get INVITATIONS_ENABLED() {
    return Boolean((globalThis as Record<string, unknown>).__INVITATIONS_ENABLED);
  },
}));

function setFlag(value: boolean) {
  (globalThis as Record<string, unknown>).__INVITATIONS_ENABLED = value;
}

function setUrl(url: string) {
  window.history.replaceState({}, '', url);
}

describe('useInvitationLanding', () => {
  beforeEach(() => {
    sessionStorage.clear();
    setUrl('/');
    setFlag(true);
  });

  afterEach(() => {
    setFlag(false);
  });

  it('stays idle when the flag is off', () => {
    setFlag(false);
    setUrl('/?invite=tok123');
    const { result } = renderHook(() => useInvitationLanding(), {
      wrapper: TestProviders,
    });
    expect(result.current.state.kind).toBe('idle');
    // Flag-off path should not even touch sessionStorage.
    expect(sessionStorage.getItem('spert:pendingInviteToken')).toBeNull();
  });

  it('captures ?invite= into sessionStorage and surfaces a pre_auth state', () => {
    setUrl('/?invite=tok123');
    const { result } = renderHook(() => useInvitationLanding(), {
      wrapper: TestProviders,
    });
    expect(result.current.state).toEqual({ kind: 'pre_auth', tokenId: 'tok123' });
    expect(sessionStorage.getItem('spert:pendingInviteToken')).toBe('tok123');
    // Query string should be stripped so a reload doesn't replay the banner.
    expect(window.location.search).toBe('');
  });

  it('reads an existing token from sessionStorage when no query param is present', () => {
    sessionStorage.setItem('spert:pendingInviteToken', 'persisted-tok');
    const { result } = renderHook(() => useInvitationLanding(), {
      wrapper: TestProviders,
    });
    expect(result.current.state).toEqual({
      kind: 'pre_auth',
      tokenId: 'persisted-tok',
    });
  });

  it('transitions to claimed when spert:models-changed fires', () => {
    setUrl('/?invite=tok123');
    sessionStorage.setItem('spert:pendingInviteToken', 'tok123');
    const { result } = renderHook(() => useInvitationLanding(), {
      wrapper: TestProviders,
    });
    expect(result.current.state.kind).toBe('pre_auth');
    act(() => {
      window.dispatchEvent(
        new CustomEvent('spert:models-changed', {
          detail: {
            claimed: [
              { appId: 'spertahp', modelId: 'm1', modelName: 'Pricing decision' },
            ],
          },
        }),
      );
    });
    expect(result.current.state).toEqual({
      kind: 'claimed',
      modelNames: ['Pricing decision'],
    });
    expect(sessionStorage.getItem('spert:pendingInviteToken')).toBeNull();
  });

  it('ignores empty claimed payloads', () => {
    sessionStorage.setItem('spert:pendingInviteToken', 'tok123');
    const { result } = renderHook(() => useInvitationLanding(), {
      wrapper: TestProviders,
    });
    expect(result.current.state.kind).toBe('pre_auth');
    act(() => {
      window.dispatchEvent(
        new CustomEvent('spert:models-changed', { detail: { claimed: [] } }),
      );
    });
    // No transition — token stays put for a future claim.
    expect(result.current.state.kind).toBe('pre_auth');
  });

  it('dismiss returns to idle and clears sessionStorage', () => {
    setUrl('/?invite=tok123');
    const { result } = renderHook(() => useInvitationLanding(), {
      wrapper: TestProviders,
    });
    expect(result.current.state.kind).toBe('pre_auth');
    act(() => {
      result.current.dismiss();
    });
    expect(result.current.state.kind).toBe('idle');
    expect(sessionStorage.getItem('spert:pendingInviteToken')).toBeNull();
  });
});
