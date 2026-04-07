import { useState, useEffect } from 'react';
import ItemBuilder from './ItemBuilder';
import TierSelector from './TierSelector';
import type { UseAHPReturn, CompletionTier, ModelIndexEntry } from '../../types/ahp';

interface ModelSetupProps {
  ahpState: UseAHPReturn;
  userId: string;
}

export default function ModelSetup({ ahpState, userId: _userId }: ModelSetupProps) {
  const [title, setTitle] = useState('');
  const [goal, setGoal] = useState('');
  const [savedModels, setSavedModels] = useState<ModelIndexEntry[]>([]);
  const hasModel = !!ahpState.modelId;
  const hasResponses = Object.keys(ahpState.responses).length > 0;
  const hasComparisons = hasResponses && Object.values(ahpState.responses).some(
    (r) => Object.keys(r.criteriaMatrix ?? {}).length > 0
  );

  useEffect(() => {
    if (!hasModel) {
      void ahpState.storage.listModels().then(setSavedModels);
    }
  }, [hasModel, ahpState.storage]);

  const handleCreate = () => {
    if (!title.trim()) return;
    void ahpState.createModel(title.trim(), goal.trim());
  };

  const handleLoad = (modelId: string) => {
    void ahpState.loadModel(modelId);
  };

  const handleDelete = async (modelId: string, modelTitle: string) => {
    if (!window.confirm(`Delete "${modelTitle}"? This cannot be undone.`)) return;
    await ahpState.storage.deleteModel(modelId);
    setSavedModels(await ahpState.storage.listModels());
  };

  const handleStructureChange = (field: 'criteria' | 'alternatives', value: unknown) => {
    const newStructure = {
      ...ahpState.structure!,
      [field]: value,
      structureVersion: (ahpState.structure?.structureVersion ?? 0) + 1,
    };
    ahpState.updateStructure(newStructure);
  };

  if (!hasModel) {
    return (
      <div className="space-y-8 max-w-md">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Create New Decision</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Best laptop for work"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Goal</label>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="What are you trying to decide?"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={!title.trim()}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            Create Decision
          </button>
        </div>

        {savedModels.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Saved Decisions</h2>
            <ul className="divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-md">
              {savedModels.map((m) => (
                <li key={m.modelId} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{m.title}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Created {new Date(m.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleLoad(m.modelId)}
                      className="px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-700 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => handleDelete(m.modelId, m.title)}
                      className="px-3 py-1 text-xs font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {savedModels.length === 0 && (
          <p className="text-sm text-gray-400 dark:text-gray-500">No saved decisions.</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <button
          onClick={() => ahpState.closeModel()}
          className="text-sm text-blue-600 hover:text-blue-700 mb-2"
        >
          &larr; All Decisions
        </button>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{ahpState.model!.title}</h2>
        {ahpState.model!.goal && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{ahpState.model!.goal}</p>
        )}
      </div>

      <TierSelector
        value={ahpState.model!.completionTier}
        onChange={(tier: CompletionTier) => ahpState.updateModel({ completionTier: tier })}
        disabled={hasComparisons}
      />

      <ItemBuilder
        items={ahpState.structure?.criteria ?? []}
        onChange={(items) => handleStructureChange('criteria', items)}
        itemLabel="Criterion"
        hasComparisons={hasComparisons}
      />

      <ItemBuilder
        items={ahpState.structure?.alternatives ?? []}
        onChange={(items) => handleStructureChange('alternatives', items)}
        itemLabel="Alternative"
        hasComparisons={hasComparisons}
      />

      {(ahpState.structure?.criteria?.length ?? 0) >= 2 &&
       (ahpState.structure?.alternatives?.length ?? 0) >= 2 && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md text-sm text-green-700 dark:text-green-400">
          Ready for comparisons. Switch to the Compare tab.
        </div>
      )}
    </div>
  );
}
