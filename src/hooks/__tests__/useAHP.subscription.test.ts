/**
 * Regression tests for the Firestore subscription decode path in useAHP.
 * Uses a stub StorageAdapter so we can fire synthetic subscription callbacks
 * that simulate Firestore onSnapshot payloads.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { useAHP } from '../useAHP';
import { TestProvidersWithAdapter } from '../../__tests__/test-utils';
import type {
  CollaboratorDoc,
  ComparisonMap,
  ModelDoc,
  ResponseDoc,
  StorageAdapter,
  StructureDoc,
  SynthesisBundle,
} from '../../types/ahp';

function makeMeta(overrides: Partial<ModelDoc> = {}): ModelDoc {
  return {
    title: 'Subscription Test',
    goal: 'Goal',
    createdBy: 'alice',
    createdAt: 1_700_000_000_000,
    status: 'open',
    completionTier: 4,
    synthesisStatus: null,
    disagreementConfig: { preset: 'standard', thresholds: { agreement: 0.15, mild: 0.35 } },
    publishedSynthesisId: null,
    _originRef: 'ws-origin',
    _changeLog: [],
    resultsVisibility: { showAggregatedToVoters: false, showOwnRankingsToVoters: true },
    ...overrides,
  };
}

function makeStructure(): StructureDoc {
  return {
    criteria: [{ id: 'c1', label: 'C1', description: '' }],
    alternatives: [{ id: 'a1', label: 'A1', description: '' }],
    structureVersion: 1,
  };
}

interface Fixture {
  adapter: StorageAdapter;
  fireSubscription: (rawDoc: Record<string, unknown>) => void;
}

function buildStubAdapter(initialMeta: ModelDoc, initialStructure: StructureDoc): Fixture {
  let subscriptionCallback: ((data: unknown) => void) | null = null;
  const adapter: StorageAdapter = {
    createModel: async () => {},
    createModelFromBundle: async () => {},
    getModel: async () => ({ meta: initialMeta, structure: initialStructure }),
    updateModel: async () => {},
    deleteModel: async () => {},
    listModels: async () => [],
    getStructure: async () => initialStructure,
    updateStructure: async () => {},
    addCollaborator: async () => {},
    getCollaborators: async () => [],
    updateCollaborator: async () => {},
    getResponse: async () => null,
    createResponse: async () => {},
    updateResponse: async () => {},
    saveComparisons: async (_m: string, _u: string, _l: string, _c: ComparisonMap) => {},
    getComparisons: async () => ({} as ComparisonMap),
    saveSynthesis: async (_m: string, _id: string, _d: Partial<SynthesisBundle>) => {},
    getSynthesis: async () => null,
    subscribeModel: (_id, cb) => {
      subscriptionCallback = cb;
      return () => {
        subscriptionCallback = null;
      };
    },
  };
  return {
    adapter,
    fireSubscription: (rawDoc) => {
      if (!subscriptionCallback) throw new Error('No active subscription');
      subscriptionCallback(rawDoc);
    },
  };
}

describe('useAHP subscription handler — meta reconstruction', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('preserves resultsVisibility when replacing meta (regression)', async () => {
    const initialMeta = makeMeta();
    const { adapter, fireSubscription } = buildStubAdapter(initialMeta, makeStructure());

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(TestProvidersWithAdapter, { adapter, children });

    const { result } = renderHook(() => useAHP('alice'), { wrapper });

    await act(async () => {
      await result.current.loadModel('stub-model');
    });

    // Fire a subscription update where the remote doc sets resultsVisibility
    // to explicit non-default values.
    await act(async () => {
      fireSubscription({
        title: 'Subscription Test',
        goal: 'Goal',
        createdBy: 'alice',
        createdAt: 1_700_000_000_000,
        status: 'open',
        completionTier: 4,
        synthesisStatus: null,
        disagreementConfig: initialMeta.disagreementConfig,
        publishedSynthesisId: null,
        _originRef: 'ws-origin',
        _changeLog: [],
        resultsVisibility: { showAggregatedToVoters: true, showOwnRankingsToVoters: false },
        criteria: [{ id: 'c1', label: 'C1', description: '' }],
        alternatives: [{ id: 'a1', label: 'A1', description: '' }],
        structureVersion: 1,
        collaborators: [] as CollaboratorDoc[],
        responses: {} as Record<string, ResponseDoc>,
        synthesis: null,
      });
    });

    expect(result.current.model?.resultsVisibility).toEqual({
      showAggregatedToVoters: true,
      showOwnRankingsToVoters: false,
    });
  });

  it('falls back to defaults when resultsVisibility is absent from the payload', async () => {
    const initialMeta = makeMeta();
    const { adapter, fireSubscription } = buildStubAdapter(initialMeta, makeStructure());

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(TestProvidersWithAdapter, { adapter, children });

    const { result } = renderHook(() => useAHP('alice'), { wrapper });

    await act(async () => {
      await result.current.loadModel('stub-model');
    });

    await act(async () => {
      fireSubscription({
        title: 'Subscription Test',
        goal: 'Goal',
        createdBy: 'alice',
        createdAt: 1_700_000_000_000,
        status: 'open',
        completionTier: 4,
        synthesisStatus: null,
        disagreementConfig: initialMeta.disagreementConfig,
        publishedSynthesisId: null,
        _originRef: 'ws-origin',
        _changeLog: [],
        // resultsVisibility intentionally missing
        criteria: [{ id: 'c1', label: 'C1', description: '' }],
        alternatives: [{ id: 'a1', label: 'A1', description: '' }],
        structureVersion: 1,
        collaborators: [],
        responses: {},
        synthesis: null,
      });
    });

    expect(result.current.model?.resultsVisibility).toEqual({
      showAggregatedToVoters: false,
      showOwnRankingsToVoters: true,
    });
  });
});
