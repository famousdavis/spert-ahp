import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageAdapter } from '../LocalStorageAdapter';
import { ERROR_CODES } from '../../core/models/constants';
import {
  createModelDoc,
  createStructureDoc,
  createCollaboratorDoc,
  createResponseDoc,
} from '../../core/models/AHPModel';

describe('LocalStorageAdapter', () => {
  let adapter: LocalStorageAdapter;

  beforeEach(() => {
    localStorage.clear();
    adapter = new LocalStorageAdapter();
  });

  // ─── Model CRUD ──────────────────────────────────────────────

  describe('model CRUD', () => {
    it('create and retrieve a model', async () => {
      const meta = createModelDoc('Test', 'Goal', 'user1');
      const structure = createStructureDoc();
      await adapter.createModel('m1', meta, structure);

      const result = await adapter.getModel('m1');
      expect(result).not.toBeNull();
      expect(result!.meta.title).toBe('Test');
      expect(result!.structure.structureVersion).toBe(0);
    });

    it('getModel returns null for nonexistent', async () => {
      expect(await adapter.getModel('nope')).toBeNull();
    });

    it('updateModel merges fields', async () => {
      const meta = createModelDoc('Test', 'Goal', 'user1');
      await adapter.createModel('m1', meta, createStructureDoc());
      await adapter.updateModel('m1', { status: 'open' });

      const result = await adapter.getModel('m1');
      expect(result!.meta.status).toBe('open');
      expect(result!.meta.title).toBe('Test'); // unchanged
    });

    it('updateModel deep merges disagreementConfig', async () => {
      const meta = createModelDoc('Test', 'Goal', 'user1');
      await adapter.createModel('m1', meta, createStructureDoc());
      await adapter.updateModel('m1', {
        disagreementConfig: { thresholds: { agreement: 0.20 } } as any,
      });

      const result = await adapter.getModel('m1');
      expect(result!.meta.disagreementConfig.thresholds.agreement).toBe(0.20);
      // mild should still exist from preset
      expect(result!.meta.disagreementConfig.thresholds.mild).toBe(0.35);
    });

    it('updateModel allows tier change with empty response (no comparisons)', async () => {
      const meta = createModelDoc('Test', 'Goal', 'user1');
      await adapter.createModel('m1', meta, createStructureDoc());
      await adapter.createResponse('m1', createResponseDoc('user1'));

      // Empty response doc (no actual comparisons) should NOT lock the tier
      await adapter.updateModel('m1', { completionTier: 2 });
      expect((await adapter.getModel('m1'))!.meta.completionTier).toBe(2);
    });

    it('updateModel TIER_LOCKED when actual comparisons exist', async () => {
      const meta = createModelDoc('Test', 'Goal', 'user1');
      await adapter.createModel('m1', meta, createStructureDoc());
      await adapter.createResponse('m1', createResponseDoc('user1'));

      // Save actual comparison data
      await adapter.saveComparisons('m1', 'user1', 'criteria', { '0,1': 3 });

      try {
        await adapter.updateModel('m1', { completionTier: 2 });
        expect.fail('Should have thrown');
      } catch (e: any) {
        expect(e.code).toBe(ERROR_CODES.TIER_LOCKED);
      }
    });

    it('updateModel allows same tier even with comparisons', async () => {
      const meta = createModelDoc('Test', 'Goal', 'user1');
      await adapter.createModel('m1', meta, createStructureDoc());
      await adapter.createResponse('m1', createResponseDoc('user1'));
      await adapter.saveComparisons('m1', 'user1', 'criteria', { '0,1': 3 });

      // Same tier should not throw
      await adapter.updateModel('m1', { completionTier: 4 });
      expect((await adapter.getModel('m1'))!.meta.completionTier).toBe(4);
    });

    it('deleteModel removes all data', async () => {
      await adapter.createModel('m1', createModelDoc('T', 'G', 'u'), createStructureDoc());
      await adapter.deleteModel('m1');
      expect(await adapter.getModel('m1')).toBeNull();
      expect(await adapter.listModels()).toEqual([]);
    });

    it('listModels returns index', async () => {
      await adapter.createModel('m1', createModelDoc('A', 'G', 'u'), createStructureDoc());
      await adapter.createModel('m2', createModelDoc('B', 'G', 'u'), createStructureDoc());
      const list = await adapter.listModels();
      expect(list.length).toBe(2);
      expect(list[0]!.title).toBe('A');
      expect(list[1]!.title).toBe('B');
    });
  });

  // ─── Comparisons ─────────────────────────────────────────────

  describe('comparisons', () => {
    beforeEach(async () => {
      await adapter.createModel('m1', createModelDoc('T', 'G', 'u'), createStructureDoc());
      await adapter.createResponse('m1', createResponseDoc('user1'));
    });

    it('saveComparisons throws on j<=i', async () => {
      await expect(
        adapter.saveComparisons('m1', 'user1', 'criteria', { '1,0': 3 })
      ).rejects.toThrow();
    });

    it('saveComparisons and getComparisons round-trip', async () => {
      await adapter.saveComparisons('m1', 'user1', 'criteria', { '0,1': 3, '0,2': 5 });
      const result = await adapter.getComparisons('m1', 'user1', 'criteria');
      expect(result['0,1']).toBe(3);
      expect(result['0,2']).toBe(5);
    });

    it('getComparisons returns upper-triangle only', async () => {
      await adapter.saveComparisons('m1', 'user1', 'criteria', { '0,1': 3 });
      const result = await adapter.getComparisons('m1', 'user1', 'criteria');
      // Only '0,1' should exist, not '1,0'
      expect(Object.keys(result)).toEqual(['0,1']);
    });

    it('saveComparisons for alternative layer', async () => {
      await adapter.saveComparisons('m1', 'user1', 'crit-1', { '0,1': 7 });
      const result = await adapter.getComparisons('m1', 'user1', 'crit-1');
      expect(result['0,1']).toBe(7);
    });

    it('getComparisons returns empty for no response', async () => {
      const result = await adapter.getComparisons('m1', 'nouser', 'criteria');
      expect(result).toEqual({});
    });
  });

  // ─── Synthesis ───────────────────────────────────────────────

  describe('synthesis', () => {
    it('save and retrieve synthesis documents', async () => {
      await adapter.createModel('m1', createModelDoc('T', 'G', 'u'), createStructureDoc());
      const docs = {
        summary: { method: 'AIJ', synthesizedAt: Date.now() },
        individual: { user1: { weights: [0.5, 0.3, 0.2] } },
        diagnostics: { items: [] },
      } as any;
      await adapter.saveSynthesis('m1', 'syn1', docs);
      const result = await adapter.getSynthesis('m1', 'syn1');
      expect((result!.summary as any).method).toBe('AIJ');
      expect((result!.individual as any).user1.weights).toEqual([0.5, 0.3, 0.2]);
    });

    it('getSynthesis returns null for nonexistent', async () => {
      await adapter.createModel('m1', createModelDoc('T', 'G', 'u'), createStructureDoc());
      expect(await adapter.getSynthesis('m1', 'nope')).toBeNull();
    });
  });

  // ─── Collaborators ──────────────────────────────────────────

  describe('collaborators', () => {
    it('add and retrieve collaborators', async () => {
      await adapter.createModel('m1', createModelDoc('T', 'G', 'u'), createStructureDoc());
      await adapter.addCollaborator('m1', createCollaboratorDoc('user1', 'owner', true));
      await adapter.addCollaborator('m1', createCollaboratorDoc('user2', 'editor', true));

      const collabs = await adapter.getCollaborators('m1');
      expect(collabs.length).toBe(2);
      expect(collabs[0]!.userId).toBe('user1');
      expect(collabs[1]!.userId).toBe('user2');
    });
  });

  // ─── Subscriptions (Phase 1 no-ops) ────────────────────────

  describe('subscriptions', () => {
    it('subscribeModel returns no-op unsubscribe', () => {
      const unsub = adapter.subscribeModel('m1', () => {});
      expect(typeof unsub).toBe('function');
      unsub(); // should not throw
    });

  });

  // ─── Schema version ────────────────────────────────────────

  describe('schema version', () => {
    it('sets schema version on construction', () => {
      expect(localStorage.getItem('ahp/schemaVersion')).toBe('1');
    });
  });
});
