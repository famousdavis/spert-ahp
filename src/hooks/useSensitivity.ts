import { useMemo } from 'react';
import { sensitivitySweep, findCrossovers } from '../core/math/synthesis';
import type { SweepPoint, CrossoverPoint } from '../types/ahp';

export function useSensitivity(
  criteriaWeights: number[],
  localPriorities: number[][],
  activeCriterion: number | null,
): { sweep: SweepPoint[] | null; crossovers: CrossoverPoint[] } {
  const sweep = useMemo(() => {
    if (
      activeCriterion === null ||
      activeCriterion === undefined ||
      !criteriaWeights ||
      !localPriorities ||
      criteriaWeights.length === 0
    ) {
      return null;
    }
    return sensitivitySweep(criteriaWeights, localPriorities, activeCriterion);
  }, [criteriaWeights, localPriorities, activeCriterion]);

  const crossovers = useMemo(() => {
    if (
      activeCriterion === null ||
      activeCriterion === undefined ||
      !criteriaWeights ||
      !localPriorities ||
      criteriaWeights.length === 0
    ) {
      return [];
    }
    return findCrossovers(criteriaWeights, localPriorities, activeCriterion);
  }, [criteriaWeights, localPriorities, activeCriterion]);

  return { sweep, crossovers };
}
