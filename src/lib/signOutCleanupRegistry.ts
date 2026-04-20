type CleanupCallback = () => Promise<void> | void;

const callbacks: CleanupCallback[] = [];

export function registerSignOutCleanup(fn: CleanupCallback): void {
  callbacks.push(fn);
}

export async function runSignOutCleanup(): Promise<void> {
  for (const fn of callbacks) {
    try {
      await fn();
    } catch (err) {
      console.error('signOutCleanup callback failed:', err);
    }
  }
}

export function clearSignOutCleanupRegistry(): void {
  callbacks.length = 0;
}
