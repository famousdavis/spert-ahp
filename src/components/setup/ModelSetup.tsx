import { useState, useEffect, useRef } from 'react';
import ItemBuilder from './ItemBuilder';
import TierSelector from './TierSelector';
import { importModel } from '../../storage/importModel';
import { exportAllModels } from '../../storage/exportAllModels';
import { getOrCreateWorkspaceId } from '../../hooks/useSession';
import { useAuth } from '../../contexts/AuthContext';
import { useStorage } from '../../contexts/StorageContext';
import { useDragReorder } from '../../hooks/useDragReorder';
import { TrashIcon } from '../icons/TrashIcon';
import { DragHandleIcon } from '../icons/DragHandleIcon';
import type { UseAHPReturn, CompletionTier, ModelIndexEntry } from '../../types/ahp';

interface ModelSetupProps {
  ahpState: UseAHPReturn;
  userId: string;
}

function yyyymmdd(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function ModelSetup({ ahpState, userId }: ModelSetupProps) {
  const { user } = useAuth();
  const { mode } = useStorage();
  const [title, setTitle] = useState('');
  const [goal, setGoal] = useState('');
  const [savedModels, setSavedModels] = useState<ModelIndexEntry[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isExportingAll, setIsExportingAll] = useState(false);
  const [exportAllError, setExportAllError] = useState<string | null>(null);
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

  // Re-fetch the model list when AuthContext claims pending invitations.
  // The custom event is dispatched after a successful claim so newly
  // shared projects appear without a manual reload. Only matters on the
  // saved-decisions screen (hasModel === false); inside an open model
  // the user already chose what to look at.
  useEffect(() => {
    if (hasModel) return;
    const onChanged = () => {
      void ahpState.storage.listModels().then(setSavedModels);
    };
    window.addEventListener('spert:models-changed', onChanged);
    return () => window.removeEventListener('spert:models-changed', onChanged);
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

  const handleImportClick = () => {
    setImportError(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    setImportError(null);
    try {
      const text = await file.text();
      const newModelId = await importModel(ahpState.storage, text, userId);
      setSavedModels(await ahpState.storage.listModels());
      await ahpState.loadModel(newModelId);
    } catch (err) {
      setImportError((err as Error).message);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExportAll = async () => {
    if (savedModels.length === 0) return;
    setIsExportingAll(true);
    setExportAllError(null);
    try {
      const storageRef = mode === 'cloud' && user ? user.uid : getOrCreateWorkspaceId();
      const ids = savedModels.map((m) => m.modelId);
      const bundle = await exportAllModels(ahpState.storage, ids, storageRef);
      const json = JSON.stringify(bundle, null, 2);
      const filename = `spert-ahp-export-${yyyymmdd()}.json`;
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportAllError((err as Error).message);
    } finally {
      setIsExportingAll(false);
    }
  };

  const handleReorder = async (orderedIds: string[]) => {
    // Optimistic local reorder so the UI doesn't jump.
    const byId = new Map(savedModels.map((m) => [m.modelId, m]));
    const next: ModelIndexEntry[] = [];
    orderedIds.forEach((id, idx) => {
      const entry = byId.get(id);
      if (entry) next.push({ ...entry, order: idx });
    });
    setSavedModels(next);
    try {
      await ahpState.storage.reorderModels(orderedIds);
    } catch {
      // On failure, refetch authoritative order
      setSavedModels(await ahpState.storage.listModels());
    }
  };

  const drag = useDragReorder<ModelIndexEntry>(savedModels, 'modelId', (orderedIds) => {
    void handleReorder(orderedIds);
  });

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
          <div className="flex gap-2 items-center">
            <button
              onClick={handleCreate}
              disabled={!title.trim()}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              Create Decision
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={(e) => { void handleFileChange(e); }}
              className="hidden"
            />
          </div>
          {importError && (
            <div className="text-xs text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-md p-2">
              {importError}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Saved Decisions</h2>
            <div className="flex gap-2">
              <button
                onClick={handleImportClick}
                disabled={isImporting}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-xs font-medium rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                {isImporting ? 'Importing…' : 'Import'}
              </button>
              <button
                onClick={() => { void handleExportAll(); }}
                disabled={savedModels.length === 0 || isExportingAll}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-xs font-medium rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                {isExportingAll ? 'Exporting…' : 'Export All'}
              </button>
            </div>
          </div>

          {exportAllError && (
            <div className="text-xs text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-md p-2">
              {exportAllError}
            </div>
          )}

          {savedModels.length > 0 ? (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
              {savedModels.map((m) => {
                const handlers = drag.handlersFor(m.modelId);
                const isDragging = drag.isDragging(m.modelId);
                const isDragOver = drag.isDragOver(m.modelId);
                return (
                  <li
                    key={m.modelId}
                    {...handlers}
                    onClick={() => handleLoad(m.modelId)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleLoad(m.modelId);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`Load decision: ${m.title}`}
                    className={`relative flex items-start px-4 py-3 cursor-pointer transition-colors ${
                      isDragging ? 'opacity-50' : ''
                    } ${
                      isDragOver
                        ? 'bg-blue-50 dark:bg-blue-900/20'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div
                      className="mr-3 flex items-start pt-1 cursor-grab text-gray-300 dark:text-gray-600 hover:text-gray-500 active:cursor-grabbing"
                      title="Drag to reorder"
                      onPointerDown={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                      aria-hidden="true"
                    >
                      <DragHandleIcon />
                    </div>
                    <div className="min-w-0 flex-1 pr-8">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{m.title}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Created {new Date(m.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDelete(m.modelId, m.title);
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      title="Delete decision"
                      aria-label={`Delete decision: ${m.title}`}
                      className="absolute right-3 top-3 rounded p-1 text-gray-300 hover:bg-red-50 hover:text-red-500 dark:text-gray-600 dark:hover:bg-red-950 dark:hover:text-red-400"
                    >
                      <TrashIcon />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500">No saved decisions.</p>
          )}
        </div>
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
