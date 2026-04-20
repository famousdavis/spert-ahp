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
  isFirebaseAvailable: false,
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
