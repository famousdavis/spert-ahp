import { LocalStorageAdapter } from '../storage/LocalStorageAdapter';
import type { StorageAdapter } from '../types/ahp';

const ADAPTER = 'local' as const;

let instance: StorageAdapter;
if (ADAPTER === 'local') {
  instance = new LocalStorageAdapter();
} else {
  throw new Error(`Unknown storage adapter: ${ADAPTER}`);
}

export const storage: StorageAdapter = instance;
