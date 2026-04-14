import { useState, useCallback } from 'react';
import ComparisonInput from './ComparisonInput';
import ComparisonMatrix from './ComparisonMatrix';
import ConsistencyBadge from './ConsistencyBadge';
import { useMatrix } from '../../hooks/useMatrix';
import { selectComparisonsForTier } from '../../core/math/matrix';
import type { UseAHPReturn, CompletionTier, StructuredItem, ComparisonMap } from '../../types/ahp';

interface AlternativeLayerProps {
  criterionId: string;
  criterionLabel: string;
  alternativeItems: StructuredItem[];
  tier: CompletionTier;
  ahpState: UseAHPReturn;
  userId: string;
}

function AlternativeLayer({ criterionId, criterionLabel, alternativeItems, tier, ahpState, userId }: AlternativeLayerProps) {
  const n = alternativeItems.length;
  const initialComp = ahpState.responses?.[userId]?.alternativeMatrices?.[criterionId] ?? {};

  const onSave = useCallback((layer: string, comparisons: ComparisonMap) => {
    ahpState.saveComparisons(layer, comparisons);
  }, [ahpState]);

  const matrix = useMatrix({
    n,
    tier,
    layer: criterionId,
    initialComparisons: initialComp,
    onSave,
  });

  const pairs = selectComparisonsForTier(n, tier, 0);

  return (
    <div className="space-y-6">
      {matrix.cr && (
        <ConsistencyBadge cr={matrix.cr} tier={tier} />
      )}

      {!matrix.converged && (
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md text-sm text-amber-700 dark:text-amber-400">
          Weight computation did not fully converge. Results may be approximate.
        </div>
      )}

      {!matrix.connectivity.connected && Object.keys(matrix.comparisons).length >= pairs.length && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-sm text-red-700 dark:text-red-400">
          Not enough comparisons to connect all items. Add more comparisons.
        </div>
      )}

      <ComparisonMatrix
        items={alternativeItems}
        comparisons={matrix.comparisons}
        onCellClick={() => {}}
      />

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Pairwise comparisons ({Object.keys(matrix.comparisons).length}/{pairs.length} completed)
        </h3>
        {pairs.map(([i, j]) => (
          <ComparisonInput
            key={`${i},${j}`}
            itemA={alternativeItems[i]?.label ?? `Item ${i}`}
            itemB={alternativeItems[j]?.label ?? `Item ${j}`}
            value={matrix.comparisons[`${i},${j}`]}
            onChange={(val) => matrix.setComparison(i, j, val)}
            mode="preference"
            criterionLabel={criterionLabel}
          />
        ))}
      </div>

      {matrix.weights && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Current Weights</h3>
          <div className="space-y-1">
            {alternativeItems.map((item, i) => (
              <div key={item.id} className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400 w-48 shrink-0">{item.label}</span>
                <div className="flex-1 min-w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                  <div
                    className="bg-blue-500 h-4 rounded-full transition-all"
                    style={{ width: `${(matrix.weights![i] ?? 0) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 w-12 text-right">
                  {((matrix.weights![i] ?? 0) * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface ComparisonPanelProps {
  ahpState: UseAHPReturn;
  userId: string;
}

export default function ComparisonPanel({ ahpState, userId }: ComparisonPanelProps) {
  const [activeLayer, setActiveLayer] = useState('criteria');

  const structure = ahpState.structure;
  const tier = (ahpState.model?.completionTier ?? 4) as CompletionTier;

  const criteriaItems = structure?.criteria ?? [];
  const alternativeItems = structure?.alternatives ?? [];

  const hasSufficientStructure = criteriaItems.length >= 2 && alternativeItems.length >= 2;

  const onSave = useCallback((layer: string, comparisons: ComparisonMap) => {
    ahpState.saveComparisons(layer, comparisons);
  }, [ahpState]);

  const initialCritComp = ahpState.responses?.[userId]?.criteriaMatrix ?? {};
  const criteriaMatrix = useMatrix({
    n: criteriaItems.length,
    tier,
    layer: 'criteria',
    initialComparisons: initialCritComp,
    onSave,
  });

  if (!ahpState.modelId) {
    return <p className="text-gray-500 dark:text-gray-400">Create a decision first in the Setup tab.</p>;
  }

  if (!hasSufficientStructure) {
    return <p className="text-gray-500 dark:text-gray-400">Add at least 2 criteria and 2 alternatives in Setup.</p>;
  }

  const isCriteriaLayer = activeLayer === 'criteria';
  const activeCriterion = !isCriteriaLayer
    ? criteriaItems.find((c) => c.id === activeLayer)
    : null;

  const pairs = isCriteriaLayer
    ? selectComparisonsForTier(criteriaItems.length, tier, 0)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setActiveLayer('criteria')}
          className={`px-3 py-1.5 text-sm rounded-md ${
            isCriteriaLayer
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          Criteria weights
        </button>
        {criteriaItems.map((crit) => (
          <button
            key={crit.id}
            onClick={() => setActiveLayer(crit.id)}
            className={`px-3 py-1.5 text-sm rounded-md ${
              activeLayer === crit.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {crit.label}
          </button>
        ))}
      </div>

      {isCriteriaLayer && (
        <>
          {criteriaMatrix.cr && (
            <ConsistencyBadge cr={criteriaMatrix.cr} tier={tier} />
          )}

          {!criteriaMatrix.converged && (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md text-sm text-amber-700 dark:text-amber-400">
              Weight computation did not fully converge. Results may be approximate.
            </div>
          )}

          {!criteriaMatrix.connectivity.connected && Object.keys(criteriaMatrix.comparisons).length >= pairs.length && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-sm text-red-700 dark:text-red-400">
              Not enough comparisons to connect all items. Add more comparisons.
            </div>
          )}

          <ComparisonMatrix
            items={criteriaItems}
            comparisons={criteriaMatrix.comparisons}
            onCellClick={() => {}}
          />

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Pairwise comparisons ({Object.keys(criteriaMatrix.comparisons).length}/{pairs.length} completed)
            </h3>
            {pairs.map(([i, j]) => (
              <ComparisonInput
                key={`${i},${j}`}
                itemA={criteriaItems[i]?.label ?? `Item ${i}`}
                itemB={criteriaItems[j]?.label ?? `Item ${j}`}
                value={criteriaMatrix.comparisons[`${i},${j}`]}
                onChange={(val) => criteriaMatrix.setComparison(i, j, val)}
              />
            ))}
          </div>

          {criteriaMatrix.weights && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Current Weights</h3>
              <div className="space-y-1">
                {criteriaItems.map((item, i) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400 w-48 shrink-0">{item.label}</span>
                    <div className="flex-1 min-w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                      <div
                        className="bg-blue-500 h-4 rounded-full transition-all"
                        style={{ width: `${(criteriaMatrix.weights![i] ?? 0) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 w-12 text-right">
                      {((criteriaMatrix.weights![i] ?? 0) * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {activeCriterion && (
        <AlternativeLayer
          key={activeCriterion.id}
          criterionId={activeCriterion.id}
          criterionLabel={activeCriterion.label}
          alternativeItems={alternativeItems}
          tier={tier}
          ahpState={ahpState}
          userId={userId}
        />
      )}
    </div>
  );
}
