import { useEffect, useRef, useState } from 'react';
import AppHeader from './components/shell/AppHeader';
import AppFooter from './components/shell/AppFooter';
import AboutPage from './components/shell/AboutPage';
import ChangelogPage from './components/shell/ChangelogPage';
import ModelSetup from './components/setup/ModelSetup';
import ComparisonPanel from './components/comparison/ComparisonPanel';
import ResultsPanel from './components/results/ResultsPanel';
import SettingsPanel from './components/settings/SettingsPanel';
import AppSettingsModal from './components/settings/AppSettingsModal';
import { useUserId } from './hooks/useUserId';
import { useAHP } from './hooks/useAHP';
import { useTheme } from './hooks/useTheme';
import { useStorage } from './contexts/StorageContext';
import { registerSignOutCleanup } from './lib/signOutCleanupRegistry';

const TABS = ['Setup', 'Compare', 'Results', 'Settings'] as const;
type TabName = typeof TABS[number];
type Page = TabName | 'About' | 'Changelog';

export default function App() {
  const [activePage, setActivePage] = useState<Page>('Setup');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const userId = useUserId();
  const ahpState = useAHP(userId);
  const { mode } = useStorage();
  useTheme(); // Initialize theme on mount

  // Register the in-memory state reset with the centralized sign-out registry.
  // The ref indirection keeps the registered callback stable while still
  // dispatching through the latest closeModel identity.
  const closeModelRef = useRef(ahpState.closeModel);
  useEffect(() => {
    closeModelRef.current = ahpState.closeModel;
  }, [ahpState.closeModel]);
  useEffect(() => {
    registerSignOutCleanup(() => closeModelRef.current());
  }, []);

  // C4: on cloud→local mode transition, close any open cloud model so the
  // UI doesn't dead-end with a stale modelId that the LocalStorageAdapter
  // can't serve. Depends on `mode` (the transition trigger) and
  // `ahpState.closeModel` (memoized with empty deps in useAHP, so stable).
  useEffect(() => {
    if (mode === 'local' && ahpState.modelId) {
      ahpState.closeModel();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, ahpState.closeModel]);

  const isTab = (TABS as readonly string[]).includes(activePage);

  const renderContent = () => {
    switch (activePage) {
      case 'Setup':
        return <ModelSetup ahpState={ahpState} userId={userId} />;
      case 'Compare':
        return <ComparisonPanel ahpState={ahpState} userId={userId} />;
      case 'Results':
        return <ResultsPanel ahpState={ahpState} userId={userId} />;
      case 'Settings':
        return <SettingsPanel ahpState={ahpState} />;
      case 'About':
        return <AboutPage onNavigate={(p) => setActivePage(p as Page)} />;
      case 'Changelog':
        return <ChangelogPage />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <AppHeader onAboutClick={() => setActivePage('About')} onOpenSettings={() => setSettingsOpen(true)} />

      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-5xl mx-auto flex px-6">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActivePage(tab)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activePage === tab
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-500'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </nav>

      <main className="flex-1 p-6">
        <div className={isTab ? 'max-w-4xl mx-auto' : ''}>
          {renderContent()}
        </div>
      </main>

      <AppFooter onNavigate={(p) => setActivePage(p as Page)} />

      <AppSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
