import { useEffect, useState } from 'react';
import StorageSection from './StorageSection';

interface AppSettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export const ATTRIBUTION_KEY = 'ahp/exportAttribution';

interface ExportAttribution {
  name: string;
  identifier: string;
}

function loadAttribution(): ExportAttribution {
  try {
    const raw = localStorage.getItem(ATTRIBUTION_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return { name: '', identifier: '' };
}

function saveAttribution(value: ExportAttribution): void {
  localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(value));
}

export default function AppSettingsModal({ open, onClose }: AppSettingsModalProps) {
  const [attribution, setAttribution] = useState<ExportAttribution>(loadAttribution);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleAttributionChange = (field: keyof ExportAttribution, value: string) => {
    const next = { ...attribution, [field]: value };
    setAttribution(next);
    saveAttribution(next);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Cloud Storage</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          <StorageSection onClose={onClose} />

          <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-3">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Export Attribution</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Your name and identifier are included when you export decisions as JSON.
            </p>
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={attribution.name}
                  onChange={(e) => handleAttributionChange('name', e.target.value)}
                  placeholder="e.g., Jane Smith"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Identifier
                </label>
                <input
                  type="text"
                  value={attribution.identifier}
                  onChange={(e) => handleAttributionChange('identifier', e.target.value)}
                  placeholder="e.g., student ID, email, or team name"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
