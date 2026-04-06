import { describe, it, expect } from 'vitest';
import { FirebaseAdapter } from '../FirebaseAdapter';

describe('FirebaseAdapter', () => {
  const adapter = new FirebaseAdapter();

  const methods = [
    'createModel', 'getModel', 'updateModel', 'deleteModel', 'listModels',
    'getStructure', 'updateStructure',
    'addCollaborator', 'getCollaborators', 'updateCollaborator',
    'getResponse', 'createResponse', 'updateResponse',
    'getComparisons', 'saveSynthesis', 'getSynthesis',
    'subscribeModel', 'subscribeResponses',
  ];

  for (const method of methods) {
    it(`${method} throws with Phase 1 message`, () => {
      expect(() => adapter[method]()).toThrow('Phase 1');
    });
  }

  it('saveComparisons throws on j<=i before stub error', () => {
    expect(() => adapter.saveComparisons('m', 'u', 'c', { '1,0': 3 })).toThrow('j must be > i');
  });

  it('saveComparisons throws stub error for valid keys', () => {
    expect(() => adapter.saveComparisons('m', 'u', 'c', { '0,1': 3 })).toThrow('Phase 1');
  });
});
