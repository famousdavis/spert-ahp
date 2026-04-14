import ThresholdConfigurator from './ThresholdConfigurator';
import SharingSection from './SharingSection';
import { useAuth } from '../../contexts/AuthContext';
import { useStorage } from '../../contexts/StorageContext';
import type { UseAHPReturn } from '../../types/ahp';

interface SettingsPanelProps {
  ahpState: UseAHPReturn;
}

export default function SettingsPanel({ ahpState }: SettingsPanelProps) {
  const { user } = useAuth();
  const { mode } = useStorage();

  if (!ahpState.modelId) {
    return <p className="text-gray-500 dark:text-gray-400">Create a decision first to configure settings.</p>;
  }

  const currentRole = ahpState.collaborators.find((c) => c.userId === user?.uid)?.role;
  const isOwner = ahpState.collaborators.length === 0 || currentRole === 'owner';
  const visibility = ahpState.model?.resultsVisibility ?? { showAggregatedToVoters: false, showOwnRankingsToVoters: true };

  const updateVisibility = (partial: Partial<typeof visibility>) => {
    void ahpState.updateModel({ resultsVisibility: { ...visibility, ...partial } });
  };

  return (
    <div className="space-y-8 max-w-lg">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Settings</h2>

      <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500 dark:text-gray-400">Status:</span>
          <span className="font-medium dark:text-gray-200 capitalize">{ahpState.model?.status}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500 dark:text-gray-400">Tier:</span>
          <span className="font-medium dark:text-gray-200">{ahpState.model?.completionTier}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500 dark:text-gray-400">Synthesis:</span>
          <span className="font-medium dark:text-gray-200">{ahpState.model?.synthesisStatus ?? 'none'}</span>
        </div>
      </div>

      <SharingSection ahpState={ahpState} />

      {isOwner && mode === 'cloud' && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Results Visibility</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Control what voters can see on the Results tab.
          </p>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={visibility.showAggregatedToVoters}
              onChange={(e) => updateVisibility({ showAggregatedToVoters: e.target.checked })}
            />
            Allow voters to see aggregated results
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={visibility.showOwnRankingsToVoters}
              onChange={(e) => updateVisibility({ showOwnRankingsToVoters: e.target.checked })}
            />
            Allow voters to see their own rankings
          </label>
        </div>
      )}

      <ThresholdConfigurator
        config={ahpState.model?.disagreementConfig ?? null}
        onUpdate={(partial) => { void ahpState.updateModel(partial); }}
      />

      <div className="border border-red-200 dark:border-red-800 rounded-lg p-4">
        <h3 className="text-sm font-medium text-red-700 dark:text-red-400 mb-3">Danger Zone</h3>
        <button
          onClick={() => {
            if (window.confirm('Delete this decision? This cannot be undone.')) {
              ahpState.deleteModel();
            }
          }}
          className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
        >
          Delete Decision
        </button>
      </div>
    </div>
  );
}
