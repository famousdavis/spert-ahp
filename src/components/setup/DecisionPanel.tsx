import { useEffect, useState } from 'react';
import ItemBuilder from './ItemBuilder';
import TierSelector from './TierSelector';
import type { UseAHPReturn, CompletionTier } from '../../types/ahp';

interface DecisionPanelProps {
  ahpState: UseAHPReturn;
}

export default function DecisionPanel({ ahpState }: DecisionPanelProps) {
  const hasResponses = Object.keys(ahpState.responses).length > 0;
  const hasComparisons = hasResponses && Object.values(ahpState.responses).some(
    (r) => Object.keys(r.criteriaMatrix ?? {}).length > 0
  );

  const modelTitle = ahpState.model?.title ?? '';
  const modelGoal = ahpState.model?.goal ?? '';
  const [titleDraft, setTitleDraft] = useState(modelTitle);
  const [goalDraft, setGoalDraft] = useState(modelGoal);

  // Resync drafts if the model changes from outside this panel
  // (e.g., another collaborator edits, or the user opens a different
  // decision without unmounting).
  useEffect(() => {
    setTitleDraft(modelTitle);
  }, [modelTitle]);
  useEffect(() => {
    setGoalDraft(modelGoal);
  }, [modelGoal]);

  const commitTitle = () => {
    if (titleDraft !== modelTitle) {
      void ahpState.updateModel({ title: titleDraft });
    }
  };
  const commitGoal = () => {
    if (goalDraft !== modelGoal) {
      void ahpState.updateModel({ goal: goalDraft });
    }
  };

  const handleStructureChange = (field: 'criteria' | 'alternatives', value: unknown) => {
    const newStructure = {
      ...ahpState.structure!,
      [field]: value,
      structureVersion: (ahpState.structure?.structureVersion ?? 0) + 1,
    };
    ahpState.updateStructure(newStructure);
  };

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
          <input
            type="text"
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={commitTitle}
            placeholder="Untitled decision"
            className="w-full px-3 py-2 text-base font-semibold border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Goal</label>
          <textarea
            value={goalDraft}
            onChange={(e) => setGoalDraft(e.target.value)}
            onBlur={commitGoal}
            placeholder="What are you trying to decide?"
            rows={2}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <TierSelector
        value={ahpState.model!.completionTier}
        onChange={(tier: CompletionTier) => ahpState.updateModel({ completionTier: tier })}
        disabled={hasComparisons}
      />

      <ItemBuilder
        items={ahpState.structure?.criteria ?? []}
        onChange={(items) => handleStructureChange('criteria', items)}
        itemLabel="Decision Factor"
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
