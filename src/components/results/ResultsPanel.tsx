import { useState } from 'react';
import PriorityChart from './PriorityChart';
import SensitivityChart from './SensitivityChart';
import SynthesisConfidenceBadge from './SynthesisConfidenceBadge';
import DisagreementPanel from './DisagreementPanel';
import { useSensitivity } from '../../hooks/useSensitivity';
import type { UseAHPReturn } from '../../types/ahp';

interface ResultsPanelProps {
  ahpState: UseAHPReturn;
}

export default function ResultsPanel({ ahpState }: ResultsPanelProps) {
  const [activeCriterion, setActiveCriterion] = useState<number | null>(null);
  const synthesis = ahpState.synthesis;
  const structure = ahpState.structure;

  const criteriaWeights = synthesis?.summary?.aggregatedWeights;
  const localPriorities = synthesis?.summary?.localPriorities ?? [];
  const { sweep, crossovers } = useSensitivity(
    criteriaWeights ?? [],
    localPriorities,
    activeCriterion,
  );

  if (!ahpState.modelId) {
    return <p className="text-gray-500 dark:text-gray-400">Create a decision first.</p>;
  }

  if (!synthesis) {
    return (
      <div className="space-y-4">
        <p className="text-gray-500 dark:text-gray-400">No synthesis results yet.</p>
        <button
          onClick={() => ahpState.runSynthesis()}
          disabled={ahpState.loading}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {ahpState.loading ? 'Computing...' : 'Run Synthesis'}
        </button>
        {ahpState.error && (
          <p className="text-sm text-red-600 dark:text-red-400">{ahpState.error}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Results</h2>
        <SynthesisConfidenceBadge confidence={synthesis.summary.confidence} />
        {ahpState.model?.synthesisStatus === 'out_of_date' && (
          <span className="text-xs text-amber-600 dark:text-amber-400">
            (comparisons changed — re-run synthesis)
          </span>
        )}
      </div>

      <button
        onClick={() => ahpState.runSynthesis()}
        disabled={ahpState.loading}
        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {ahpState.loading ? 'Computing...' : 'Re-run Synthesis'}
      </button>

      <PriorityChart
        items={structure?.alternatives ?? []}
        scores={synthesis.summary.globalScores}
        title="Global Priority Scores"
      />

      <PriorityChart
        items={structure?.criteria ?? []}
        scores={synthesis.summary.aggregatedWeights}
        title="Criteria Weights"
      />

      <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Concordance</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Kendall's W:</span>{' '}
            <span className="font-medium dark:text-gray-200">{synthesis.summary.concordance.kendallW.toFixed(3)}</span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Interpretation:</span>{' '}
            <span className="font-medium capitalize dark:text-gray-200">{synthesis.summary.concordance.interpretation}</span>
          </div>
        </div>
      </div>

      {structure?.criteria && structure.criteria.length >= 2 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sensitivity Analysis</h3>
          <div className="flex gap-2 flex-wrap">
            {structure.criteria.map((crit, i) => (
              <button
                key={crit.id}
                onClick={() => setActiveCriterion(activeCriterion === i ? null : i)}
                className={`px-3 py-1.5 text-xs rounded-md ${
                  activeCriterion === i
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {crit.label}
              </button>
            ))}
          </div>
          {sweep && (
            <div className="mt-4">
              <SensitivityChart
                sweep={sweep}
                crossovers={crossovers}
                alternatives={structure.alternatives}
                criterionName={structure.criteria[activeCriterion!]?.label ?? ''}
              />
            </div>
          )}
        </div>
      )}

      <DisagreementPanel synthesis={synthesis} />
    </div>
  );
}
