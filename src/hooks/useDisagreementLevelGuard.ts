import { useMemo } from 'react';
import type { AHPState } from '../types/ahp';

export function useDisagreementLevelGuard(ahpState: AHPState): { level3Allowed: boolean; voterCount: number } {
  return useMemo(() => {
    const voterCount = ahpState.synthesis?.summary?.votersIncluded?.length ?? 0;
    return {
      level3Allowed: voterCount >= 4,
      voterCount,
    };
  }, [ahpState.synthesis?.summary?.votersIncluded]);
}
