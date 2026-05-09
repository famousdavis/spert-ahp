import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  registerSignOutCleanup,
  clearSignOutCleanupRegistry,
} from '../signOutCleanupRegistry';

const signOutSpy = vi.fn().mockResolvedValue(undefined);

vi.mock('firebase/auth', () => ({
  signOut: (...args: unknown[]) => signOutSpy(...args),
}));

vi.mock('../firebase', () => ({
  auth: { __mock: true },
  db: null,
  functions: null,
  isFirebaseAvailable: false,
}));

// Lesson 21 — completeness mock for the callable wrapper layer. The
// performSignOutWithCleanup module under test does not import these,
// but the vi.mock pattern is intended to cover the entire surface that
// transitively-imported invitation code might reach. Without this
// mock, a future test added under the same firebase mock that
// happened to touch invitation flow would fail with
// "Firebase Functions is not initialized" out of requireFunctions().
vi.mock('../callables', () => ({
  requireFunctions: vi.fn(() => {
    throw new Error('Firebase Functions is not initialized — VITE_FIREBASE_* env vars are missing.');
  }),
  callSendInvitationEmail: vi.fn(() =>
    Promise.reject(new Error('Firebase Functions is not initialized')),
  ),
  callClaimPendingInvitations: vi.fn(() =>
    Promise.reject(new Error('Firebase Functions is not initialized')),
  ),
  callRevokeInvite: vi.fn(() =>
    Promise.reject(new Error('Firebase Functions is not initialized')),
  ),
  callResendInvite: vi.fn(() =>
    Promise.reject(new Error('Firebase Functions is not initialized')),
  ),
  callUpdateInvite: vi.fn(() =>
    Promise.reject(new Error('Firebase Functions is not initialized')),
  ),
}));

// Import AFTER mocks
import { performSignOutWithCleanup } from '../performSignOutWithCleanup';

describe('performSignOutWithCleanup', () => {
  beforeEach(() => {
    localStorage.clear();
    clearSignOutCleanupRegistry();
    signOutSpy.mockClear();
  });

  it('clears consent, PII, migration flag, runs registry, then calls firebaseSignOut', async () => {
    localStorage.setItem('ahp/tos-accepted-version', '04-05-2026');
    localStorage.setItem('ahp/tos-write-pending', 'true');
    localStorage.setItem('ahp/exportAttribution', JSON.stringify({ name: 'A', identifier: 'a' }));
    localStorage.setItem('ahp/hasUploadedToCloud', 'true');

    const order: string[] = [];
    registerSignOutCleanup(() => {
      order.push('registry-cb');
      // At the moment the registry runs, the per-user keys should already be cleared
      expect(localStorage.getItem('ahp/exportAttribution')).toBeNull();
      expect(localStorage.getItem('ahp/hasUploadedToCloud')).toBeNull();
      expect(localStorage.getItem('ahp/tos-accepted-version')).toBeNull();
    });

    await performSignOutWithCleanup();

    expect(order).toEqual(['registry-cb']);
    expect(localStorage.getItem('ahp/tos-accepted-version')).toBeNull();
    expect(localStorage.getItem('ahp/tos-write-pending')).toBeNull();
    expect(localStorage.getItem('ahp/exportAttribution')).toBeNull();
    expect(localStorage.getItem('ahp/hasUploadedToCloud')).toBeNull();
    expect(signOutSpy).toHaveBeenCalledTimes(1);
  });

  it('invokes firebaseSignOut after registry callbacks complete', async () => {
    const events: string[] = [];
    registerSignOutCleanup(async () => {
      await Promise.resolve();
      events.push('registry');
    });
    signOutSpy.mockImplementation(async () => {
      events.push('firebaseSignOut');
    });

    await performSignOutWithCleanup();

    expect(events).toEqual(['registry', 'firebaseSignOut']);
  });

  it('does not throw when a registry callback fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    registerSignOutCleanup(() => {
      throw new Error('reset failed');
    });

    await expect(performSignOutWithCleanup()).resolves.toBeUndefined();
    expect(signOutSpy).toHaveBeenCalledTimes(1);
    errorSpy.mockRestore();
  });
});
