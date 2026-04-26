/**
 * Export/import integration tests. Uses real LocalStorageAdapter — no mocks.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAHP } from '../hooks/useAHP';
import { LocalStorageAdapter } from '../storage/LocalStorageAdapter';
import { exportModel } from '../storage/exportModel';
import { importModel } from '../storage/importModel';
import { TestProviders } from './test-utils';
import type { AHPExportEnvelope, ModelDoc, StructureDoc } from '../types/ahp';

const USER_A = 'export-user-A';
const USER_B = 'import-user-B';

function baseMeta(overrides: Partial<ModelDoc> = {}): ModelDoc {
  return {
    title: 'Sample',
    goal: 'Goal',
    createdBy: 'alice',
    createdAt: 1_700_000_000_000,
    status: 'open',
    completionTier: 4,
    synthesisStatus: null,
    disagreementConfig: {
      preset: 'standard',
      thresholds: { agreement: 0.15, mild: 0.35 },
    },
    publishedSynthesisId: null,
    _originRef: 'workspace-original',
    _changeLog: [
      { action: 'created', timestamp: 1_700_000_000_000, actor: 'alice' },
    ],
    ...overrides,
  };
}

function baseStructure(): StructureDoc {
  return {
    criteria: [
      { id: 'c1', label: 'Crit1', description: '' },
      { id: 'c2', label: 'Crit2', description: '' },
    ],
    alternatives: [
      { id: 'a1', label: 'Alt1', description: '' },
      { id: 'a2', label: 'Alt2', description: '' },
    ],
    structureVersion: 1,
  };
}

describe('exportImport — Group 1: schema round-trip', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('a well-formed envelope round-trips through JSON.stringify/parse', () => {
    const envelope: AHPExportEnvelope = {
      spertAhpExportVersion: 1,
      appVersion: '0.7.0',
      exportedAt: 1_700_000_001_000,
      sourceModelId: 'model-abc',
      _exportedBy: { name: 'Jane', identifier: 'jane@uni.edu' },
      _storageRef: 'workspace-uuid',
      meta: baseMeta(),
      structure: baseStructure(),
      collaborators: [{ userId: 'alice', role: 'owner', isVoting: true }],
      responses: {
        alice: {
          userId: 'alice',
          status: 'in_progress',
          criteriaMatrix: { '0,1': 3 },
          alternativeMatrices: {},
          cr: {},
          lastModifiedAt: 1_700_000_000_500,
          structureVersionAtSubmission: 1,
        },
      },
      synthesis: null,
    };

    const json = JSON.stringify(envelope);
    const parsed = JSON.parse(json) as AHPExportEnvelope;

    expect(parsed.spertAhpExportVersion).toBe(1);
    expect(parsed.appVersion).toBe('0.7.0');
    expect(parsed.meta.title).toBe('Sample');
    expect(parsed.collaborators[0]!.userId).toBe('alice');
    expect(parsed.responses['alice']!.criteriaMatrix['0,1']).toBe(3);
  });
});

describe('exportImport — Group 2: end-to-end local round-trip', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('create → populate → export → clear → import as new user → verify', async () => {
    // Build a model under USER_A
    const { result: rA } = renderHook(() => useAHP(USER_A), { wrapper: TestProviders });
    let modelId: string | undefined;

    await act(async () => {
      modelId = await rA.current.createModel('Laptops', 'Choose the best laptop');
    });

    await act(async () => {
      await rA.current.updateStructure({
        criteria: [
          { id: 'price', label: 'Price', description: '' },
          { id: 'performance', label: 'Performance', description: '' },
          { id: 'battery', label: 'Battery', description: '' },
        ],
        alternatives: [
          { id: 'macbook', label: 'MacBook', description: '' },
          { id: 'thinkpad', label: 'ThinkPad', description: '' },
        ],
        structureVersion: 1,
      });
    });

    await act(async () => {
      await rA.current.saveComparisons('criteria', { '0,1': 3, '0,2': 5, '1,2': 2 });
      await rA.current.saveComparisons('price', { '0,1': 1 / 3 });
      await rA.current.saveComparisons('performance', { '0,1': 5 });
      await rA.current.saveComparisons('battery', { '0,1': 3 });
    });

    // Export
    const envelope = await exportModel(rA.current.storage, modelId!, 'test-workspace-A');
    expect(envelope.spertAhpExportVersion).toBe(1);
    expect(envelope.appVersion).toBe('0.8.2');
    expect(envelope.meta.title).toBe('Laptops');
    expect(envelope.collaborators).toHaveLength(1);
    expect(envelope.collaborators[0]!.userId).toBe(USER_A);
    expect(envelope.responses[USER_A]!.criteriaMatrix['0,1']).toBe(3);

    // Simulate new device: fresh localStorage, fresh hook under USER_B
    localStorage.clear();

    const newAdapter = new LocalStorageAdapter();
    const newModelId = await importModel(newAdapter, JSON.stringify(envelope), USER_B);
    expect(newModelId).not.toBe(modelId);

    const { result: rB } = renderHook(() => useAHP(USER_B), { wrapper: TestProviders });
    await act(async () => {
      await rB.current.loadModel(newModelId);
    });

    expect(rB.current.model!.title).toBe('Laptops');
    expect(rB.current.collaborators).toHaveLength(1);
    expect(rB.current.collaborators[0]!.userId).toBe(USER_B);
    expect(rB.current.collaborators[0]!.role).toBe('owner');
    expect(rB.current.responses[USER_B]).toBeDefined();
    expect(rB.current.responses[USER_B]!.criteriaMatrix['0,1']).toBe(3);
    expect(rB.current.model!.publishedSynthesisId).toBeNull();
    expect(rB.current.model!.createdBy).toBe(USER_B);

    const changeLog = rB.current.model!._changeLog;
    expect(changeLog.some((e) => e.action === 'imported' && e.actor === USER_B)).toBe(true);
  });
});

describe('exportImport — Group 3: version guard', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('rejects future/unsupported versions', async () => {
    const envelope = {
      spertAhpExportVersion: 2,
      meta: baseMeta(),
      structure: baseStructure(),
      collaborators: [],
      responses: {},
    };
    await expect(
      importModel(new LocalStorageAdapter(), JSON.stringify(envelope), USER_B),
    ).rejects.toThrow(/Unsupported export version/);
  });

  it('rejects envelopes missing the version field', async () => {
    const envelope = {
      meta: baseMeta(),
      structure: baseStructure(),
      collaborators: [],
      responses: {},
    };
    await expect(
      importModel(new LocalStorageAdapter(), JSON.stringify(envelope), USER_B),
    ).rejects.toThrow(/Missing required field 'spertAhpExportVersion'/);
  });

  it('rejects non-JSON input', async () => {
    await expect(
      importModel(new LocalStorageAdapter(), 'not json at all', USER_B),
    ).rejects.toThrow(/Invalid JSON/);
  });

  it('rejects envelopes missing required fields', async () => {
    const envelope = {
      spertAhpExportVersion: 1,
      meta: baseMeta(),
      // structure missing
      collaborators: [],
      responses: {},
    };
    await expect(
      importModel(new LocalStorageAdapter(), JSON.stringify(envelope), USER_B),
    ).rejects.toThrow(/Malformed export: missing 'structure'/);
  });

  it('rejects payloads larger than the 2 MB cap', async () => {
    // Construct a 3 MB payload — well over the 2 MB limit. Contents don't
    // need to be valid; the size guard runs before JSON.parse.
    const oversized = 'x'.repeat(3 * 1024 * 1024);
    await expect(
      importModel(new LocalStorageAdapter(), oversized, USER_B),
    ).rejects.toThrow(/exceeds the 2 MB limit/);
  });

  it('drops unknown fields from meta (whitelist-copy)', async () => {
    // Craft an envelope where meta has an extra rogue field. The whitelist
    // pick should strip it before persistence.
    const envelope = {
      spertAhpExportVersion: 1,
      appVersion: '0.7.2',
      exportedAt: Date.now(),
      sourceModelId: 'model-x',
      _exportedBy: null,
      _storageRef: 'ws',
      meta: {
        ...baseMeta(),
        rogueField: 'should be dropped',
      } as unknown as ReturnType<typeof baseMeta>,
      structure: baseStructure(),
      collaborators: [{ userId: 'alice', role: 'owner' as const, isVoting: true }],
      responses: {
        alice: {
          userId: 'alice',
          status: 'in_progress' as const,
          criteriaMatrix: {},
          alternativeMatrices: {},
          cr: {},
          lastModifiedAt: 1,
          structureVersionAtSubmission: 1,
        },
      },
      synthesis: null,
    };

    const adapter = new LocalStorageAdapter();
    const newModelId = await importModel(adapter, JSON.stringify(envelope), 'importer');
    const loaded = await adapter.getModel(newModelId);
    expect(loaded).not.toBeNull();
    expect('rogueField' in (loaded!.meta as unknown as Record<string, unknown>)).toBe(false);
  });
});

describe('exportImport — Group 4: UID remap + synthesis strip', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('collapses multi-user envelope to single importer, strips synthesis', async () => {
    const envelope: AHPExportEnvelope = {
      spertAhpExportVersion: 1,
      appVersion: '0.7.0',
      exportedAt: Date.now(),
      sourceModelId: 'model-original',
      _exportedBy: null,
      _storageRef: 'workspace-original',
      meta: baseMeta({
        createdBy: 'alice',
        status: 'synthesized',
        synthesisStatus: 'current',
        publishedSynthesisId: 'synth-fake-hash',
        _changeLog: [
          { action: 'created', timestamp: 1000, actor: 'alice' },
          { action: 'edited', timestamp: 1100, actor: 'bob' },
          { action: 'edited', timestamp: 1200, actor: 'alice' },
        ],
      }),
      structure: baseStructure(),
      collaborators: [
        { userId: 'alice', role: 'owner', isVoting: true },
        { userId: 'bob', role: 'editor', isVoting: true },
        { userId: 'carol', role: 'viewer', isVoting: false },
      ],
      responses: {
        alice: {
          userId: 'alice',
          status: 'submitted',
          criteriaMatrix: { '0,1': 4 },
          alternativeMatrices: {},
          cr: {},
          lastModifiedAt: 1500,
          structureVersionAtSubmission: 1,
        },
        bob: {
          userId: 'bob',
          status: 'submitted',
          criteriaMatrix: { '0,1': 2 },
          alternativeMatrices: {},
          cr: {},
          lastModifiedAt: 1600,
          structureVersionAtSubmission: 1,
        },
        carol: {
          userId: 'carol',
          status: 'in_progress',
          criteriaMatrix: {},
          alternativeMatrices: {},
          cr: {},
          lastModifiedAt: 1700,
          structureVersionAtSubmission: 1,
        },
      },
      synthesis: null, // strip behavior is driven by publishedSynthesisId reset, tested via model state
    };

    const adapter = new LocalStorageAdapter();
    const newModelId = await importModel(adapter, JSON.stringify(envelope), 'importer-X');

    const loaded = await adapter.getModel(newModelId);
    expect(loaded).not.toBeNull();
    expect(loaded!.meta.createdBy).toBe('importer-X');
    expect(loaded!.meta.publishedSynthesisId).toBeNull();
    expect(loaded!.meta.synthesisStatus).toBeNull();
    expect(loaded!.meta.status).toBe('open'); // reverted from 'synthesized'

    // _changeLog: alice→importer-X, bob untouched, plus appended 'imported'
    const actors = loaded!.meta._changeLog.map((e) => e.actor);
    expect(actors).toEqual(['importer-X', 'bob', 'importer-X', 'importer-X']);
    expect(loaded!.meta._changeLog.at(-1)!.action).toBe('imported');

    // Collaborators reduced to just the importer
    const collabs = await adapter.getCollaborators(newModelId);
    expect(collabs).toHaveLength(1);
    expect(collabs[0]!.userId).toBe('importer-X');
    expect(collabs[0]!.role).toBe('owner');
    expect(collabs[0]!.isVoting).toBe(true);

    // Responses: only importer-X, preserving the original owner's matrix
    const importerResp = await adapter.getResponse(newModelId, 'importer-X');
    expect(importerResp).not.toBeNull();
    expect(importerResp!.criteriaMatrix['0,1']).toBe(4); // alice's value preserved
    expect(await adapter.getResponse(newModelId, 'alice')).toBeNull();
    expect(await adapter.getResponse(newModelId, 'bob')).toBeNull();
    expect(await adapter.getResponse(newModelId, 'carol')).toBeNull();

    // _originRef preserved (provenance)
    expect(loaded!.meta._originRef).toBe('workspace-original');
  });

  it('uses meta.createdBy as fallback when no owner in collaborators', async () => {
    const envelope: AHPExportEnvelope = {
      spertAhpExportVersion: 1,
      appVersion: '0.7.0',
      exportedAt: Date.now(),
      sourceModelId: 'model-x',
      _exportedBy: null,
      _storageRef: 'ws',
      meta: baseMeta({ createdBy: 'orphan-creator' }),
      structure: baseStructure(),
      collaborators: [], // no owner entry
      responses: {
        'orphan-creator': {
          userId: 'orphan-creator',
          status: 'in_progress',
          criteriaMatrix: { '0,1': 7 },
          alternativeMatrices: {},
          cr: {},
          lastModifiedAt: 1,
          structureVersionAtSubmission: 1,
        },
      },
      synthesis: null,
    };

    const adapter = new LocalStorageAdapter();
    const newModelId = await importModel(adapter, JSON.stringify(envelope), 'new-user');

    const resp = await adapter.getResponse(newModelId, 'new-user');
    expect(resp!.criteriaMatrix['0,1']).toBe(7);
  });
});
