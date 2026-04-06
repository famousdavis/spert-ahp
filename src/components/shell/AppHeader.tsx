import { HeaderThemeToggle } from './ThemeToggle';

interface AppHeaderProps {
  onAboutClick: () => void;
}

export default function AppHeader({ onAboutClick }: AppHeaderProps) {
  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">SPERT<span className="text-gray-300 dark:text-gray-500 text-xs align-super">®</span> AHP</h1>
        <div className="flex items-center gap-2">
          <HeaderThemeToggle />
          <button
            onClick={onAboutClick}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            About
          </button>
        </div>
      </div>
    </header>
  );
}
