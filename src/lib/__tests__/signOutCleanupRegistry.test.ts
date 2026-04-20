import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  registerSignOutCleanup,
  runSignOutCleanup,
  clearSignOutCleanupRegistry,
} from '../signOutCleanupRegistry';

describe('signOutCleanupRegistry', () => {
  beforeEach(() => {
    clearSignOutCleanupRegistry();
  });

  it('runs every registered callback in registration order', async () => {
    const order: string[] = [];
    registerSignOutCleanup(() => {
      order.push('a');
    });
    registerSignOutCleanup(async () => {
      order.push('b');
    });
    registerSignOutCleanup(() => {
      order.push('c');
    });

    await runSignOutCleanup();

    expect(order).toEqual(['a', 'b', 'c']);
  });

  it('continues running remaining callbacks when one throws', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const invoked: string[] = [];

    registerSignOutCleanup(() => {
      invoked.push('first');
    });
    registerSignOutCleanup(() => {
      throw new Error('boom');
    });
    registerSignOutCleanup(() => {
      invoked.push('third');
    });

    await runSignOutCleanup();

    expect(invoked).toEqual(['first', 'third']);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('continues running remaining callbacks when an async one rejects', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const invoked: string[] = [];

    registerSignOutCleanup(async () => {
      invoked.push('first');
    });
    registerSignOutCleanup(async () => {
      throw new Error('async-boom');
    });
    registerSignOutCleanup(() => {
      invoked.push('third');
    });

    await runSignOutCleanup();

    expect(invoked).toEqual(['first', 'third']);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('clearSignOutCleanupRegistry removes all callbacks', async () => {
    const invoked: string[] = [];
    registerSignOutCleanup(() => {
      invoked.push('a');
    });
    clearSignOutCleanupRegistry();

    await runSignOutCleanup();

    expect(invoked).toEqual([]);
  });
});
