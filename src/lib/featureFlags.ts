/**
 * Compile-time feature flags. Flip in code + ship a release to toggle.
 *
 * INVITATIONS_ENABLED: Email-based project invitation flow (v0.11.0).
 *   Off → SharingSection renders the legacy single-email-input UI and
 *         AuthContext does not call claimPendingInvitations.
 *   On  → SharingSection renders the bulk textarea + pending-invite list,
 *         and AuthContext fires claimPendingInvitations on every auth
 *         resolution.
 */
export const INVITATIONS_ENABLED = true;
