import { useEffect, useRef, useState } from 'react';
import { useAuth, getFirstName } from '../../contexts/AuthContext';
import { useStorage } from '../../contexts/StorageContext';

interface AccountPopoverProps {
  anchorRef: React.RefObject<HTMLButtonElement>;
  onClose: () => void;
}

/**
 * Lightweight account popover anchored beneath the AuthChip.
 * Shows the signed-in user's name + email and a Sign Out button.
 * Mirrors the sign-out sequence in StorageSection.tsx exactly
 * (await signOut(); switchMode('local')).
 */
export default function AccountPopover({ anchorRef, onClose }: AccountPopoverProps) {
  const { user, signOut } = useAuth();
  const { switchMode } = useStorage();
  const panelRef = useRef<HTMLDivElement>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);

  // Compute fixed position from the anchor rect on mount.
  useEffect(() => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({ top: rect.bottom + 6, right: Math.max(8, window.innerWidth - rect.right) });
  }, [anchorRef]);

  // Escape to close (no-op while signing out).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (signingOut) return;
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, signingOut]);

  // Outside click to close (no-op while signing out).
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

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
      switchMode('local');
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
      <div className="flex justify-end gap-2 px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          disabled={signingOut}
          className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </div>
  );
}
