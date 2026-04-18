import { useState, useCallback, useRef } from 'react';
import ComparisonInput from './ComparisonInput';
import ComparisonMatrix from './ComparisonMatrix';
import ConsistencyBadge from './ConsistencyBadge';
import ConsistencyAdvisor from './ConsistencyAdvisor';
import { useMatrix } from '../../hooks/useMatrix';
import { selectComparisonsForTier } from '../../core/math/matrix';
import type { UseAHPReturn, CompletionTier, StructuredItem, ComparisonMap } from '../../types/ahp';

const FOCUS_CLEAR_MS = 2100;

interface AlternativeLayerProps {
  criterionId: string;
  criterionLabel: string;
  alternativeItems: StructuredItem[];
  tier: CompletionTier;
  ahpState: UseAHPReturn;
  userId: string;
  isOwner: boolean;
}

function AlternativeLayer({ criterionId, criterionLabel, alternativeItems, tier, ahpState, userId, isOwner }: AlternativeLayerProps) {
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

  const [focusedPair, setFocusedPair] = useState<string | null>(null);
  const focusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rowRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

  const onReconsider = useCallback((i: number, j: number) => {
    if (focusTimer.current) clearTimeout(focusTimer.current);
    const key = `${i},${j}`;
    setFocusedPair(null);
    // Schedule on next frame so the effect in ComparisonInput re-fires even when
    // the same pair is reconsidered twice in quick succession.
    requestAnimationFrame(() => {
      setFocusedPair(key);
      focusTimer.current = setTimeout(() => setFocusedPair(null), FOCUS_CLEAR_MS);
    });
  }, []);

  return (
    <div className="space-y-6">
      {matrix.cr && (
        <ConsistencyBadge cr={matrix.cr} tier={tier} />
      )}

      <ConsistencyAdvisor
        n={n}
        tier={tier}
        comparisons={matrix.comparisons}
        items={alternativeItems}
        cr={matrix.cr}
        onReconsider={onReconsider}
      />

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

      {isOwner && (
        <details className="text-sm">
          <summary className="cursor-pointer text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
            Show comparison matrix
          </summary>
          <div className="mt-2">
            <ComparisonMatrix
              items={alternativeItems}
              comparisons={matrix.comparisons}
              onCellClick={() => {}}
            />
          </div>
        </details>
      )}

      <div className="space-y-3">
        <div className="border-l-4 border-slate-400 dark:border-slate-500 bg-slate-50 dark:bg-slate-800/40 px-3 py-2 text-sm text-slate-700 dark:text-slate-300">
          Ranking alternatives with respect to: <span className="font-medium">{criterionLabel}</span>
        </div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Pairwise comparisons ({Object.keys(matrix.comparisons).length}/{pairs.length} completed)
        </h3>
        {pairs.map(([i, j]) => {
          const key = `${i},${j}`;
          return (
            <ComparisonInput
              key={key}
              itemA={alternativeItems[i]?.label ?? `Item ${i}`}
              itemB={alternativeItems[j]?.label ?? `Item ${j}`}
              value={matrix.comparisons[key]}
              onChange={(val) => matrix.setComparison(i, j, val)}
              mode="preference"
              criterionLabel={criterionLabel}
              isFocused={focusedPair === key}
              registerRef={(el) => {
                if (el) rowRefs.current.set(key, el);
                else rowRefs.current.delete(key);
              }}
            />
          );
        })}
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

  const [criteriaFocusedPair, setCriteriaFocusedPair] = useState<string | null>(null);
  const criteriaFocusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const criteriaRowRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

  const onReconsiderCriteria = useCallback((i: number, j: number) => {
    if (criteriaFocusTimer.current) clearTimeout(criteriaFocusTimer.current);
    const key = `${i},${j}`;
    setCriteriaFocusedPair(null);
    requestAnimationFrame(() => {
      setCriteriaFocusedPair(key);
      criteriaFocusTimer.current = setTimeout(() => setCriteriaFocusedPair(null), FOCUS_CLEAR_MS);
    });
  }, []);

  if (!ahpState.modelId) {
    return <p className="text-gray-500 dark:text-gray-400">Create a decision first in the Setup tab.</p>;
  }

  if (!hasSufficientStructure) {
    return <p className="text-gray-500 dark:text-gray-400">Add at least 2 decision factors and 2 alternatives in Setup.</p>;
  }

  const currentRole = ahpState.collaborators.find((c) => c.userId === userId)?.role;
  const isOwner = ahpState.collaborators.length === 0 || currentRole === 'owner';

  const isCriteriaLayer = activeLayer === 'criteria';
  const activeCriterion = !isCriteriaLayer
    ? criteriaItems.find((c) => c.id === activeLayer)
    : null;

  const pairs = isCriteriaLayer
    ? selectComparisonsForTier(criteriaItems.length, tier, 0)
    : [];

  return (
    <div className="space-y-6">
      {/* Sticky band — bleed matches main p-6 in App.tsx; update together. */}
      <div className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900 -mx-6 px-6 py-2 flex gap-2 flex-wrap">
        <button
          onClick={() => setActiveLayer('criteria')}
          className={`px-3 py-1.5 text-sm rounded-md ${
            isCriteriaLayer
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          Decision Factors
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

      {ahpState.model?.goal && (
        <details className="text-sm">
          <summary className="cursor-pointer text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
            Reminder: decision goal
          </summary>
          <p className="mt-2 text-gray-700 dark:text-gray-300">{ahpState.model.goal}</p>
        </details>
      )}

      {isCriteriaLayer && (
        <>
          {criteriaMatrix.cr && (
            <ConsistencyBadge cr={criteriaMatrix.cr} tier={tier} />
          )}

          <ConsistencyAdvisor
            n={criteriaItems.length}
            tier={tier}
            comparisons={criteriaMatrix.comparisons}
            items={criteriaItems}
            cr={criteriaMatrix.cr}
            onReconsider={onReconsiderCriteria}
          />

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

          {isOwner && (
            <details className="text-sm">
              <summary className="cursor-pointer text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                Show comparison matrix
              </summary>
              <div className="mt-2">
                <ComparisonMatrix
                  items={criteriaItems}
                  comparisons={criteriaMatrix.comparisons}
                  onCellClick={() => {}}
                />
              </div>
            </details>
          )}

          <div className="space-y-3">
            <div className="border-l-4 border-slate-400 dark:border-slate-500 bg-slate-50 dark:bg-slate-800/40 px-3 py-2 text-sm text-slate-700 dark:text-slate-300">
              Ranking decision factors — how important is each for:{' '}
              <span className="font-medium">{ahpState.model?.goal ?? '(goal)'}</span>
            </div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Pairwise comparisons ({Object.keys(criteriaMatrix.comparisons).length}/{pairs.length} completed)
            </h3>
            {pairs.map(([i, j]) => {
              const key = `${i},${j}`;
              return (
                <ComparisonInput
                  key={key}
                  itemA={criteriaItems[i]?.label ?? `Item ${i}`}
                  itemB={criteriaItems[j]?.label ?? `Item ${j}`}
                  value={criteriaMatrix.comparisons[key]}
                  onChange={(val) => criteriaMatrix.setComparison(i, j, val)}
                  isFocused={criteriaFocusedPair === key}
                  registerRef={(el) => {
                    if (el) criteriaRowRefs.current.set(key, el);
                    else criteriaRowRefs.current.delete(key);
                  }}
                />
              );
            })}
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
          isOwner={isOwner}
        />
      )}
    </div>
  );
}
