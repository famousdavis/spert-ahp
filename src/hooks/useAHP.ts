import { useReducer, useCallback } from 'react';
import { LocalStorageAdapter } from '../storage/LocalStorageAdapter';
import {
  createModelDoc,
  createStructureDoc,
  createCollaboratorDoc,
  createResponseDoc,
} from '../core/models/AHPModel';
import { hashObject } from './hashObject';
import { aggregateIJ, kendallW, computeDisagreement, cosineSimilarity, computeSynthesisConfidenceLevel } from '../core/math/aggregation';
import { consistencyRatio } from '../core/math/consistency';
import { synthesize } from '../core/math/synthesis';
import { llsmWeights, buildMatrix } from '../core/math/matrix';
import { principalEigenvector } from '../core/math/eigenvector';
import type {
  AHPState,
  AHPAction,
  UseAHPReturn,
  ModelDoc,
  StructureDoc,
  ComparisonMap,
  ConsistencyResult,
  VotingMember,
  ConcordanceInterpretation,
  PairCoverageDiagnostic,
  SynthesisBundle,
} from '../types/ahp';

const storage = new LocalStorageAdapter();

const initialState: AHPState = {
  modelId: null,
  model: null,
  structure: null,
  collaborators: [],
  responses: {},
  synthesis: null,
  loading: false,
  error: null,
};

function reducer(state: AHPState, action: AHPAction): AHPState {
  switch (action.type) {
    case 'SET_MODEL':
      return {
        ...state,
        modelId: action.payload.modelId,
        model: action.payload.meta,
        structure: action.payload.structure,
        error: null,
      };
    case 'SET_STRUCTURE':
      return { ...state, structure: action.payload };
    case 'SET_COLLABORATORS':
      return { ...state, collaborators: action.payload };
    case 'SET_RESPONSE':
      return {
        ...state,
        responses: {
          ...state.responses,
          [action.payload.userId]: action.payload.response,
        },
      };
    case 'SET_SYNTHESIS':
      return { ...state, synthesis: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'UPDATE_MODEL':
      return { ...state, model: state.model ? { ...state.model, ...action.payload } : null };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

export function useAHP(userId: string): UseAHPReturn {
  const [state, dispatch] = useReducer(reducer, initialState);

  const createModel = useCallback((title: string, goal: string): string => {
    const modelId = `model-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const meta = createModelDoc(title, goal, userId);
    const structure = createStructureDoc();

    storage.createModel(modelId, meta, structure);

    const collab = createCollaboratorDoc(userId, 'owner', true);
    storage.addCollaborator(modelId, collab);

    const response = createResponseDoc(userId);
    storage.createResponse(modelId, response);

    dispatch({
      type: 'SET_MODEL',
      payload: { modelId, meta, structure },
    });
    dispatch({ type: 'SET_COLLABORATORS', payload: [collab] });
    dispatch({
      type: 'SET_RESPONSE',
      payload: { userId, response },
    });

    return modelId;
  }, [userId]);

  const loadModel = useCallback((modelId: string) => {
    const data = storage.getModel(modelId);
    if (!data) {
      dispatch({ type: 'SET_ERROR', payload: `Model ${modelId} not found` });
      return;
    }

    dispatch({
      type: 'SET_MODEL',
      payload: { modelId, meta: data.meta, structure: data.structure },
    });

    const collabs = storage.getCollaborators(modelId);
    dispatch({ type: 'SET_COLLABORATORS', payload: collabs });

    for (const collab of collabs) {
      const response = storage.getResponse(modelId, collab.userId);
      if (response) {
        dispatch({
          type: 'SET_RESPONSE',
          payload: { userId: collab.userId, response },
        });
      }
    }

    if (data.meta.publishedSynthesisId) {
      const syn = storage.getSynthesis(modelId, data.meta.publishedSynthesisId);
      if (syn) {
        dispatch({ type: 'SET_SYNTHESIS', payload: syn });
      }
    }
  }, []);

  const updateModel = useCallback((partialMeta: Partial<ModelDoc>) => {
    if (!state.modelId) return;
    storage.updateModel(state.modelId, partialMeta);
    dispatch({ type: 'UPDATE_MODEL', payload: partialMeta });
  }, [state.modelId]);

  const updateStructure = useCallback((newStructure: StructureDoc) => {
    if (!state.modelId) return;
    storage.updateStructure(state.modelId, newStructure);
    dispatch({ type: 'SET_STRUCTURE', payload: newStructure });

    if (state.model?.synthesisStatus === 'current') {
      storage.updateModel(state.modelId, { synthesisStatus: 'out_of_date' });
      dispatch({ type: 'UPDATE_MODEL', payload: { synthesisStatus: 'out_of_date' } });
    }
  }, [state.modelId, state.model?.synthesisStatus]);

  const saveComparisons = useCallback((layer: string, comparisons: ComparisonMap) => {
    if (!state.modelId) return;
    storage.saveComparisons(state.modelId, userId, layer, comparisons);

    const response = storage.getResponse(state.modelId, userId);
    if (response) {
      dispatch({ type: 'SET_RESPONSE', payload: { userId, response } });
    }

    if (state.model?.synthesisStatus === 'current') {
      storage.updateModel(state.modelId, { synthesisStatus: 'out_of_date' });
      dispatch({ type: 'UPDATE_MODEL', payload: { synthesisStatus: 'out_of_date' } });
    }
  }, [state.modelId, userId, state.model?.synthesisStatus]);

  const runSynthesis = useCallback(async () => {
    if (!state.modelId || !state.structure || !state.model) return;

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'UPDATE_MODEL', payload: { synthesisStatus: 'computing' } });
    storage.updateModel(state.modelId, { synthesisStatus: 'computing' });

    try {
      const n = state.structure.criteria.length;
      const completionTier = state.model.completionTier;
      const collabs = storage.getCollaborators(state.modelId);
      const votingMembers: VotingMember[] = collabs.map((c) => ({ userId: c.userId, isVoting: c.isVoting }));

      const allCriteriaComparisons: Array<{ userId: string; comparisons: ComparisonMap }> = [];
      const allAlternativeComparisons: Record<string, Array<{ userId: string; comparisons: ComparisonMap }>> = {};
      const individualCR: Record<string, { criteria: ConsistencyResult }> = {};
      const voterTimestamps: Record<string, number> = {};
      const isVotingSnapshot: Record<string, boolean> = {};

      for (const collab of collabs) {
        const response = storage.getResponse(state.modelId, collab.userId);
        if (!response) continue;

        voterTimestamps[collab.userId] = response.lastModifiedAt;
        isVotingSnapshot[collab.userId] = collab.isVoting;

        const critComp = storage.getComparisons(state.modelId, collab.userId, 'criteria');
        allCriteriaComparisons.push({ userId: collab.userId, comparisons: critComp });

        const critCR = consistencyRatio(n, critComp, completionTier);
        individualCR[collab.userId] = { criteria: critCR };

        for (const criterion of state.structure.criteria) {
          if (!allAlternativeComparisons[criterion.id]) {
            allAlternativeComparisons[criterion.id] = [];
          }
          const altComp = storage.getComparisons(state.modelId, collab.userId, criterion.id);
          allAlternativeComparisons[criterion.id]!.push({
            userId: collab.userId,
            comparisons: altComp,
          });
        }
      }

      const { consensusComparisons: critConsensus, pairCoveragePercent } = aggregateIJ(
        allCriteriaComparisons, null, votingMembers, n, completionTier,
      );

      let criteriaWeights: number[];
      if (completionTier === 4) {
        const matrix = buildMatrix(n, critConsensus);
        criteriaWeights = principalEigenvector(matrix);
      } else {
        const { weights } = llsmWeights(n, critConsensus);
        criteriaWeights = weights;
      }

      const numAlts = state.structure.alternatives.length;
      const localPriorities: number[][] = Array.from({ length: numAlts }, () => new Array<number>(n).fill(0));
      const individualPriorities: Record<string, number[]> = {};

      for (let k = 0; k < state.structure.criteria.length; k++) {
        const criterion = state.structure.criteria[k]!;
        const altComps = allAlternativeComparisons[criterion.id] ?? [];

        const { consensusComparisons: altConsensus } = aggregateIJ(
          altComps, null, votingMembers, numAlts, completionTier,
        );

        let altWeights: number[];
        if (completionTier === 4) {
          const matrix = buildMatrix(numAlts, altConsensus);
          altWeights = principalEigenvector(matrix);
        } else {
          const { weights } = llsmWeights(numAlts, altConsensus);
          altWeights = weights;
        }

        for (let a = 0; a < numAlts; a++) {
          localPriorities[a]![k] = altWeights[a]!;
        }
      }

      const globalScores = synthesize(criteriaWeights, localPriorities);

      const voterWeightVectors = Object.values(individualPriorities);
      const W = voterWeightVectors.length > 1 ? kendallW(voterWeightVectors) : 1.0;

      const criteriaVectors = allCriteriaComparisons
        .filter((c) => votingMembers.find((m) => m.userId === c.userId && m.isVoting))
        .map((c) => {
          if (completionTier === 4) {
            const matrix = buildMatrix(n, c.comparisons);
            return principalEigenvector(matrix);
          }
          const { weights } = llsmWeights(n, c.comparisons);
          return weights;
        });

      const thresholds = state.model.disagreementConfig?.thresholds ?? { agreement: 0.15, mild: 0.35 };
      const disagreement = computeDisagreement(criteriaVectors, thresholds);
      const maxCV = disagreement.items.length > 0
        ? Math.max(...disagreement.items.map((d) => d.cv))
        : 0;

      const crValues = Object.values(individualCR)
        .map((cr) => cr.criteria?.cr)
        .filter((v): v is number => v !== null && v !== undefined);
      const avgCR = crValues.length > 0
        ? crValues.reduce((a, b) => a + b, 0) / crValues.length
        : 0;

      const votingCount = votingMembers.filter((m) => m.isVoting).length;
      const confidence = computeSynthesisConfidenceLevel(
        votingCount, avgCR, W, maxCV, pairCoveragePercent,
      );

      const pairwiseAgreement: Record<string, number> = {};
      for (let i = 0; i < criteriaVectors.length; i++) {
        for (let j = i + 1; j < criteriaVectors.length; j++) {
          pairwiseAgreement[`${i},${j}`] = cosineSimilarity(criteriaVectors[i]!, criteriaVectors[j]!);
        }
      }

      const votingMemberIds = votingMembers
        .filter((m) => m.isVoting)
        .map((m) => m.userId)
        .sort();

      const hashInput: Record<string, unknown> = {
        votingMemberIds,
        voterTimestamps,
        isVotingSnapshot,
        structureVersion: state.structure.structureVersion,
        aggregationMethod: 'AIJ',
        completionTier,
      };
      const synthesisId = await hashObject(hashInput);

      const concordanceInterpretation: ConcordanceInterpretation = W > 0.7 ? 'strong' : W > 0.5 ? 'moderate' : 'weak';
      const pairCoverageDiagnostic: PairCoverageDiagnostic = pairCoveragePercent >= 1.0 ? 'full' : pairCoveragePercent >= 0.7 ? 'partial' : 'low';

      const summary: SynthesisBundle['summary'] = {
        method: 'AIJ',
        aggregatedWeights: criteriaWeights,
        localPriorities,
        globalScores,
        concordance: { kendallW: W, interpretation: concordanceInterpretation },
        votersIncluded: votingMemberIds,
        votersExcluded: votingMembers.filter((m) => !m.isVoting).map((m) => ({ userId: m.userId, reason: 'not voting' })),
        synthesizedAt: Date.now(),
        synthesisId,
        isVotingSnapshot,
        pairCoveragePercent,
        pairCoverageDiagnostic,
        confidence,
      };

      const individual: SynthesisBundle['individual'] = {
        individualPriorities,
        individualCR,
      };

      const diagnostics: SynthesisBundle['diagnostics'] = {
        disagreement,
        pairwiseAgreement,
      };

      storage.saveSynthesis(state.modelId, synthesisId, { summary, individual, diagnostics });
      storage.updateModel(state.modelId, {
        synthesisStatus: 'current',
        publishedSynthesisId: synthesisId,
      });

      dispatch({ type: 'SET_SYNTHESIS', payload: { summary, individual, diagnostics } });
      dispatch({
        type: 'UPDATE_MODEL',
        payload: { synthesisStatus: 'current', publishedSynthesisId: synthesisId },
      });
      dispatch({ type: 'SET_LOADING', payload: false });

    } catch (err) {
      storage.updateModel(state.modelId, { synthesisStatus: 'out_of_date' });
      dispatch({ type: 'SET_ERROR', payload: (err as Error).message });
      dispatch({ type: 'UPDATE_MODEL', payload: { synthesisStatus: 'out_of_date' } });
    }
  }, [state.modelId, state.structure, state.model, userId]);

  const closeModel = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const deleteModel = useCallback(() => {
    if (!state.modelId) return;
    storage.deleteModel(state.modelId);
    dispatch({ type: 'RESET' });
  }, [state.modelId]);

  return {
    ...state,
    createModel,
    loadModel,
    updateModel,
    updateStructure,
    saveComparisons,
    runSynthesis,
    closeModel,
    deleteModel,
    storage,
  };
}
