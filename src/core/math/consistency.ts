import { RI_TABLE } from '../models/constants';
import { buildMatrix } from './matrix';
import { principalEigenvector, computeLambdaMax } from './eigenvector';
import type { ComparisonMap, CompletionTier, ConsistencyResult, RepairSuggestion } from '../../types/ahp';

export function consistencyRatio(n: number, comparisons: ComparisonMap, tier: CompletionTier): ConsistencyResult {
  if (n <= 2) {
    return {
      cr: 0,
      isAcceptable: true,
      lambdaMax: n,
      ci: 0,
      confidenceLabel: n === 1 ? 'Single item' : 'Pairwise — always consistent',
    };
  }

  if (tier === 1) {
    return {
      cr: null,
      isAcceptable: null,
      lambdaMax: null,
      ci: null,
      confidenceLabel: 'Quick mode — no redundant comparisons for consistency check',
    };
  }

  let matrix: number[][];
  if (tier === 4) {
    matrix = buildMatrix(n, comparisons);
  } else {
    matrix = buildHarkerMatrix(n, comparisons);
  }

  const w = principalEigenvector(matrix);
  const lambdaMax = computeLambdaMax(matrix, w);

  const ci = (lambdaMax - n) / (n - 1);
  const ri = n <= 10 ? (RI_TABLE[n] ?? RI_TABLE[10]!) : RI_TABLE[10]!;
  const cr = ri > 0 ? ci / ri : 0;

  const confidenceLabels: Record<number, string> = {
    2: 'Balanced mode — low confidence CR (Harker)',
    3: 'Thorough mode — moderate confidence CR (Harker)',
    4: 'Complete mode — full confidence CR',
  };

  return {
    cr: Math.max(0, cr),
    isAcceptable: cr <= 0.10,
    lambdaMax,
    ci,
    confidenceLabel: confidenceLabels[tier] ?? '',
  };
}

function buildHarkerMatrix(n: number, comparisons: ComparisonMap): number[][] {
  const observed = new Set<string>();
  for (const key of Object.keys(comparisons)) {
    const [i, j] = key.split(',').map(Number) as [number, number];
    observed.add(`${i},${j}`);
  }

  const matrix: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));

  for (let i = 0; i < n; i++) {
    let missingCount = 0;
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const lo = Math.min(i, j);
      const hi = Math.max(i, j);
      const key = `${lo},${hi}`;
      if (observed.has(key)) {
        const value = comparisons[key]!;
        if (i < j) {
          matrix[i]![j] = value;
        } else {
          matrix[i]![j] = 1 / value;
        }
      } else {
        missingCount++;
      }
    }
    matrix[i]![i] = 1 + missingCount;
  }

  return matrix;
}

export function suggestRepair(n: number, comparisons: ComparisonMap, tier: CompletionTier): RepairSuggestion | null {
  if (n <= 2) return null;

  const crResult = consistencyRatio(n, comparisons, tier);
  if (crResult.cr === null || crResult.cr <= 0.10) return null;

  let matrix: number[][];
  if (tier === 4) {
    matrix = buildMatrix(n, comparisons);
  } else {
    matrix = buildHarkerMatrix(n, comparisons);
  }
  const w = principalEigenvector(matrix);

  let bestRepair: RepairSuggestion | null = null;
  let bestImprovement = -Infinity;

  for (const [key, currentValue] of Object.entries(comparisons)) {
    const [i, j] = key.split(',').map(Number) as [number, number];
    const suggestedValue = w[i]! / w[j]!;

    const modified = { ...comparisons, [key]: suggestedValue };
    const newCR = consistencyRatio(n, modified, tier);

    if (newCR.cr === null) continue;
    const improvement = crResult.cr - newCR.cr;

    if (improvement > bestImprovement) {
      bestImprovement = improvement;
      bestRepair = {
        i,
        j,
        currentValue,
        suggestedValue,
        expectedCRImprovement: improvement,
      };
    }
  }

  return bestRepair;
}
