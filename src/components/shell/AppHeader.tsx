import { HeaderThemeToggle } from './ThemeToggle';
import AuthChip from './AuthChip';
import GearButton from '../settings/GearButton';

interface AppHeaderProps {
  onAboutClick: () => void;
  onOpenSettings: () => void;
}

export default function AppHeader({ onAboutClick, onOpenSettings }: AppHeaderProps) {
  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/spert-favicon-ahp.png"
            alt=""
            className="mr-2 h-7 w-7 rounded-lg ring-1 ring-white/20 block dark:hidden"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/spert-favicon-ahp-dark.png"
            alt=""
            className="mr-2 h-7 w-7 rounded-lg ring-1 ring-white/20 hidden dark:block"
          />
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            SPERT<span className="text-gray-300 dark:text-gray-500 text-xs align-super">®</span> AHP
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <GearButton onClick={onOpenSettings} />
          <HeaderThemeToggle />
          <AuthChip onOpenSettings={onOpenSettings} />
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
