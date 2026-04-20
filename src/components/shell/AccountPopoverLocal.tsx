import { useEffect, useRef, useState } from 'react';
import { useAuth, getFirstName } from '../../contexts/AuthContext';
import { performSignOutWithCleanup } from '../../lib/performSignOutWithCleanup';

interface AccountPopoverLocalProps {
  anchorRef: React.RefObject<HTMLButtonElement>;
  onClose: () => void;
  onOpenSettings: () => void;
}

/**
 * Popover for the signed-in + local-mode chip state (F2(d)).
 *
 * Offers two actions:
 *   - "Switch to Cloud Storage": navigates to App Settings only. Does NOT
 *     call switchMode directly; the upload/keep prompt lives inside
 *     StorageSection and must be shown while the user is looking at it.
 *   - "Sign Out": routes through the centralized performSignOutWithCleanup.
 */
export default function AccountPopoverLocal({
  anchorRef,
  onClose,
  onOpenSettings,
}: AccountPopoverLocalProps) {
  const { user } = useAuth();
  const panelRef = useRef<HTMLDivElement>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);

  useEffect(() => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({ top: rect.bottom + 6, right: Math.max(8, window.innerWidth - rect.right) });
  }, [anchorRef]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (signingOut) return;
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, signingOut]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (signingOut) return;
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [onClose, signingOut, anchorRef]);

  const handleSwitchToCloud = () => {
    onOpenSettings();
    onClose();
  };

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await performSignOutWithCleanup();
      onClose();
    } finally {
      setSigningOut(false);
    }
  };

  if (!user || !pos) return null;

  const displayName = user.displayName ?? getFirstName(user);

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-label="Account menu"
      style={{ position: 'fixed', top: pos.top, right: pos.right, zIndex: 60 }}
      className="w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg"
    >
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {displayName}
        </div>
        {user.email && (
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</div>
        )}
      </div>
      <div className="flex flex-col gap-2 px-4 py-3">
        <button
          type="button"
          onClick={handleSwitchToCloud}
          disabled={signingOut}
          className="w-full px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Switch to Cloud Storage
        </button>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {signingOut ? 'Signing out…' : 'Sign Out'}
        </button>
      </div>
    </div>
  );
}
