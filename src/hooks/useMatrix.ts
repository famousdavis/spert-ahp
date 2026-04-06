import { useState, useCallback, useRef, useEffect } from 'react';
import { llsmWeights, checkConnectivity, buildMatrix } from '../core/math/matrix';
import { consistencyRatio } from '../core/math/consistency';
import { principalEigenvector } from '../core/math/eigenvector';
import type { ComparisonMap, CompletionTier, ConnectivityResult, ConsistencyResult } from '../types/ahp';

const DEBOUNCE_MS = 1500;

interface UseMatrixOptions {
  n: number;
  tier: CompletionTier;
  layer: string;
  initialComparisons?: ComparisonMap;
  onSave?: (layer: string, comparisons: ComparisonMap) => void;
}

interface UseMatrixReturn {
  comparisons: ComparisonMap;
  weights: number[] | null;
  cr: ConsistencyResult | null;
  connectivity: ConnectivityResult;
  converged: boolean;
  setComparison: (i: number, j: number, value: number) => void;
  removeComparison: (i: number, j: number) => void;
}

export function useMatrix({ n, tier, layer, initialComparisons = {}, onSave }: UseMatrixOptions): UseMatrixReturn {
  const [comparisons, setComparisonsState] = useState<ComparisonMap>(initialComparisons);
  const [weights, setWeights] = useState<number[] | null>(null);
  const [cr, setCR] = useState<ConsistencyResult | null>(null);
  const [connectivity, setConnectivity] = useState<ConnectivityResult>({ connected: true, missingLinks: [] });
  const [converged, setConverged] = useState(true);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const recompute = useCallback((comp: ComparisonMap) => {
    if (n <= 1) {
      setWeights([1.0]);
      setCR({ cr: 0, isAcceptable: true, lambdaMax: 1, ci: 0, confidenceLabel: '' });
      setConnectivity({ connected: true, missingLinks: [] });
      setConverged(true);
      return;
    }

    const conn = checkConnectivity(n, comp);
    setConnectivity(conn);

    if (!conn.connected) {
      setWeights(null);
      setCR(null);
      setConverged(true);
      return;
    }

    try {
      if (tier === 4) {
        const totalPairs = (n * (n - 1)) / 2;
        const observedCount = Object.keys(comp).length;
        if (observedCount < totalPairs) {
          const result = llsmWeights(n, comp);
          setWeights(result.weights);
          setConverged(result.converged);
        } else {
          const matrix = buildMatrix(n, comp);
          setWeights(principalEigenvector(matrix));
          setConverged(true);
        }
      } else {
        const result = llsmWeights(n, comp);
        setWeights(result.weights);
        setConverged(result.converged);
      }

      const crResult = consistencyRatio(n, comp, tier);
      setCR(crResult);
    } catch {
      setWeights(null);
      setCR(null);
      setConverged(true);
    }
  }, [n, tier]);

  const setComparison = useCallback((i: number, j: number, value: number) => {
    if (j <= i) throw new Error(`setComparison: j (${j}) must be > i (${i})`);

    setComparisonsState((prev) => {
      const next = { ...prev, [`${i},${j}`]: value };
      recompute(next);

      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        if (onSave) onSave(layer, next);
      }, DEBOUNCE_MS);

      return next;
    });
  }, [recompute, layer, onSave]);

  const removeComparison = useCallback((i: number, j: number) => {
    setComparisonsState((prev) => {
      const next = { ...prev };
      delete next[`${i},${j}`];
      recompute(next);

      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        if (onSave) onSave(layer, next);
      }, DEBOUNCE_MS);

      return next;
    });
  }, [recompute, layer, onSave]);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  useEffect(() => {
    if (Object.keys(initialComparisons).length > 0) {
      recompute(initialComparisons);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    comparisons,
    weights,
    cr,
    connectivity,
    converged,
    setComparison,
    removeComparison,
  };
}
