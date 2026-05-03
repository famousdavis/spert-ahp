export interface ChangelogEntry {
  version: string;
  date: string;
  sections: {
    title: string;
    items: string[];
  }[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '0.12.1',
    date: '2026-05-02',
    sections: [
      {
        title: 'Fixed',
        items: [
          'Toggling voting on a pending invitation now shows accurate error copy. Previously a failure surfaced the resend-flow message ("This invitation has reached its resend limit (5)…"), which never applied to voting updates. New "updateVoting" error context covers permission-denied, failed-precondition, not-found, and rate-limit cases with copy that matches the action',
          'useAHP.loadModel no longer closes over a stale userId. The useCallback dependency array was missing userId, so re-rendering the hook with a new userId (e.g. sign-out + sign-in within the same React tree) left loadModel operating on the old user — most visibly via the response-slot self-heal touching the wrong slot. Brought into alignment with createModel, which already had the correct dep array',
          'Stuck "you\'ve been invited" banner cleared after sign-in. If the silent claim path inside AuthContext failed, the banner previously stranded a signed-in user with non-functional sign-in CTAs. The hook now transitions pre_auth → idle the moment the user becomes non-null, while still honoring the spert:models-changed claim event when it arrives',
        ],
      },
      {
        title: 'Internal',
        items: [
          'Pulled mapInvitationError + InvitationErrorContext out of SharingSection into src/lib/invitationErrors.ts; tests moved alongside',
          'Pulled parseBulkEmails out of SharingSection into src/lib/parseBulkEmails.ts; tests moved alongside',
          'Extracted PendingInvitesList from SharingSection into its own component; SharingSection drops to under 400 LOC',
          'Extracted mapToPendingInvite as a module-level helper in FirestoreAdapter, alongside the existing tsToMillis helper',
        ],
      },
    ],
  },
  {
    version: '0.12.0',
    date: '2026-05-02',
    sections: [
      {
        title: 'Added',
        items: [
          '"Can vote" checkbox at invite time. Owners now decide whether an editor invitee will have voting rights before the invitation is sent. The invitee\'s collaborator record lands with the correct isVoting flag from the moment of acceptance — closing the gap where a freshly-accepted editor could submit pairwise comparisons before the owner had a chance to toggle voting off',
          'Voting toggle on pending invitations. Owners can flip the voting flag on a pending (not yet accepted) editor invite directly from the Sharing section, without revoking and re-inviting',
        ],
      },
      {
        title: 'Changed',
        items: [
          'Pending-invite list shows an interactive Voting checkbox in place of the static "voting" badge for editor invites',
          'Bulk and legacy invite forms now pass the chosen isVoting value through to the sendInvitationEmail callable instead of hardcoding it to true for all editors',
        ],
      },
      {
        title: 'Infra',
        items: [
          'New updateInvite Cloud Function (us-central1, callable v2) on the spert-suite project. Inviter-only authorization, status=pending precondition, updates only isVoting + updatedAt',
          'StorageAdapter gained updateInvite(tokenId, isVoting); FirestoreAdapter calls the new callable; LocalStorageAdapter is a no-op',
        ],
      },
    ],
  },
  {
    version: '0.11.0',
    date: '2026-05-02',
    sections: [
      {
        title: 'Added',
        items: [
          'Email-based bulk invitations. Owners can paste a list of emails into the Sharing section; existing SPERT users are added immediately, new emails receive a one-time invitation link (30-day expiration) that they claim by signing in with the matching email. Up to 25 invitations per UTC day per inviter',
          'Resend & Revoke buttons on pending invitations. Each pending row shows the current send count as (N/5) for cap visibility; Resend re-delivers the invitation email (capped at 5 per invitation), Revoke soft-revokes so the link can no longer be claimed',
          'Pre-auth invitation banner. First-time recipients clicking an invitation link see a dismissible banner with branded "Sign in with Google" / "Sign in with Microsoft" CTAs; after sign-in, the shared decision appears immediately and the banner transitions to a "you\'ve been added" confirmation',
          'Auto-switch to cloud mode when AHP detects an ?invite= URL. New users landing from email no longer get stuck in local mode',
        ],
      },
      {
        title: 'Changed',
        items: [
          'SharingSection error mapping is now context-aware: shared Firebase error codes (resource-exhausted, permission-denied, failed-precondition, not-found) render appropriate copy per call site (send vs resend vs revoke)',
          'removeCollaborator routed through the StorageAdapter; the previous inline updateDoc bypass is gone. Embedded collaborators array and members map are updated atomically',
          'Suite-wide profile mirror: AuthContext now writes to both spertahp_profiles and spertsuite_profiles, enabling cross-app email-to-uid lookups',
        ],
      },
      {
        title: 'Infra',
        items: [
          'Five Cloud Functions live in us-central1 of spert-suite: sendInvitationEmail, claimPendingInvitations, revokeInvite, resendInvite (all callable v2 with cors:true and allUsers Cloud Run invoker), plus the scheduled expireInvitations',
          'Origin-aware invitation URLs (strict allowlist + prod fallback); localhost dev calls produce localhost URLs',
          'Microsoft AD "Last, First Middle" displayName normalization for clean RFC 5322 email From headers',
          'Sender renamed noreply@ → invitations@spertsuite.com for Gmail deliverability',
        ],
      },
    ],
  },
  {
    version: '0.10.1',
    date: '2026-05-01',
    sections: [
      {
        title: 'Changed',
        items: [
          'About link moved from the right side of the header into the tab bar, positioned to the right of the Settings tab. Matches the placement used by other SPERT Suite apps. The header right-side cluster is now Theme → AuthChip',
        ],
      },
    ],
  },
  {
    version: '0.10.0',
    date: '2026-05-01',
    sections: [
      {
        title: 'Added',
        items: [
          'Drag-to-reorder for the Saved Decisions list. A new 6-dot grab handle lets you drag tiles into any order; the new ordering persists across sessions in both local and cloud modes via a new StorageAdapter.reorderModels method and an order field on each ModelIndexEntry',
          'Export All button on the Decisions tab. Bundles every saved decision into a single JSON file for backup or migration; complements the existing single-decision export in Project Settings',
          '"Project" tab for project-scoped settings. Sharing/collaborators, results visibility, disagreement thresholds, single-decision export, and the danger zone live here. The tab only appears when a decision is loaded; closing a decision while on the Project tab redirects to Decisions',
        ],
      },
      {
        title: 'Changed',
        items: [
          'Settings tab is now global-only — cloud storage and export attribution. The previous gear-icon modal has been retired in favor of a proper full-page Settings panel, matching every other SPERT Suite app',
          '"Setup" tab renamed to "Decisions" to match what users actually do there',
          'Header logo and SPERT® AHP wordmark are now clickable: click them to close any open decision and return to the Decisions list. Header right-side icon order standardized to About → Theme → AuthChip',
          'Pairwise comparison intensity bars are now directly clickable. Hovering a bar previews the selection in full color (bars + label both update); clicking commits',
          'Decision tiles got a UX overhaul matching the rest of the suite: tile body is the click target (no more separate Load button), trash icon replaces the Delete text button, and Import is in the list header alongside Export All',
        ],
      },
      {
        title: 'Fixed',
        items: [
          'Consistency Advisor and CR badge no longer appear after only 2 comparisons. Both are now suppressed until you complete every required pair for your tier — the Harker matrix estimation produces unreliable CR values on sparse data, so showing them early was misleading',
          'Voter Radar Chart legend now displays voter display names instead of raw Firebase UIDs. Falls back to a truncated UID when no profile is available',
        ],
      },
    ],
  },
  {
    version: '0.9.2',
    date: '2026-05-01',
    sections: [
      {
        title: 'Added',
        items: [
          'Branded favicon and header icon. New spert-favicon-ahp.png (192×192 PNG, sunflower gold #f59e0b panels with rounded corners) is now the browser tab favicon and appears to the left of the SPERT® AHP wordmark in the header. A charcoal dark-mode variant (spert-favicon-ahp-dark.png) swaps in automatically when the dark theme is active',
        ],
      },
    ],
  },
  {
    version: '0.9.1',
    date: '2026-04-28',
    sections: [
      {
        title: 'Tests',
        items: [
          'Regression coverage for the v0.8.2 collaborator-response-slot fix. Three new LocalStorageAdapter tests verify addCollaborator creates a response slot, saveComparisons works immediately for a newly-added collaborator, and re-adding a collaborator preserves their judgments. One new useAHP test simulates legacy data with a missing slot and verifies loadModel self-heals',
        ],
      },
      {
        title: 'Changed',
        items: [
          'LocalStorageAdapter.addCollaborator now also initializes a response slot, mirroring the v0.8.2 fix in FirestoreAdapter. Local mode is single-user in practice, so this is not user-visible — but it lets the same regression contract test run identically against both adapters',
        ],
      },
    ],
  },
  {
    version: '0.9.0',
    date: '2026-04-28',
    sections: [
      {
        title: 'Changed',
        items: [
          'Unified auth chip behavior. All three chip states (signed-out, signed-in + local, signed-in + cloud) now open the same modal on click — no more positioned popovers. Sign-out is performed from inside the modal',
          'Settings modal renamed to "Cloud Storage" to reflect that the modal is the single home for sign-in, storage mode, and account management',
          'Sign-in buttons restyled to the SPERT Suite standard: blue branded buttons with native-color Google G and Microsoft four-square logos, side-by-side at normal viewport (wraps below ~320px)',
          'Storage radio labels clarified: "Local" → "Local (browser only)" and "Cloud" → "Cloud (sync across devices)"',
          'Identity card in the Cloud Storage modal updated to suite-standard layout: normalized display name on top, email below, red "Sign out" link on the right',
          'Export Attribution placeholder text refreshed to better hint at acceptable identifier values ("e.g., student ID, email, or team name")',
        ],
      },
      {
        title: 'Added',
        items: [
          '"Keep using local storage" button visible only to signed-in users currently on local mode — provides a clear escape hatch from the modal without changing storage mode',
          'Auto-close after sign-out. The Cloud Storage modal closes automatically when sign-out succeeds. If sign-out throws, the modal stays open so the error banner is visible',
          'normalizeDisplayName utility (src/lib/userDisplay.ts) that swaps Microsoft Entra "Last, First MI" into natural reading order while passing other providers through unchanged',
        ],
      },
      {
        title: 'Removed',
        items: [
          'The two account popover components — both replaced by the unified Cloud Storage modal flow. The chip is now a pure trigger; all account actions live inside the modal',
        ],
      },
    ],
  },
  {
    version: '0.8.2',
    date: '2026-04-25',
    sections: [
      {
        title: 'Fixed',
        items: [
          'Critical: Shared collaborators\' judgments now reach synthesis. Previously, addCollaborator wrote the collaborator into the members map but never initialized a response slot for them, so saveComparisons threw "Response not found" the first time they tried to save a judgment — surfaced to the collaborator as a misleading "Save failed — you may have been signed out" error. From the owner\'s side, no shared collaborator\'s data ever landed in Firestore, so synthesis silently aggregated only the owner\'s responses while the "comparisons changed — re-run synthesis" banner kept firing without changing the result. Fix: addCollaborator now creates the response slot at the same time as adding the collaborator',
          'Self-heal for legacy shared models. Existing models that were shared before v0.8.2 had collaborators with no response slot. loadModel now detects this and lazy-creates the missing slot the next time the collaborator opens the model — no manual remediation needed',
        ],
      },
    ],
  },
  {
    version: '0.8.1',
    date: '2026-04-25',
    sections: [
      {
        title: 'Fixed',
        items: [
          'Clearer error message when an email is already registered with a different sign-in provider. Users who previously signed in with Google and then tried Microsoft (or vice versa) on the same email saw an unhandled auth/account-exists-with-different-credential error fall through as a generic failure. The sign-in flow now surfaces a plain-English banner telling the user to use whichever provider they signed in with the first time',
        ],
      },
    ],
  },
  {
    version: '0.8.0',
    date: '2026-04-20',
    sections: [
      {
        title: 'Security',
        items: [
          'Second security audit pass, focused on the auth and cloud-storage subsystem. All sign-out paths now route through a single centralized helper so in-memory decision state, per-user PII, and storage mode reset atomically on every sign-out',
          'Sign-out now clears in-memory decision state. Previously the useAHP reducer state (modelId, model, structure, collaborators, responses, synthesis) survived sign-out — a second user on the same browser saw the prior user\'s decision title, criteria, and responses across Settings / Compare / Results until they manually closed the model. Fix: a module-level signOutCleanupRegistry bridges the provider-nesting gap so AuthContext can reach App-scoped state',
          'Export Attribution PII now cleared on sign-out. The ahp/exportAttribution localStorage key stores a user\'s name and identifier (email or student ID) and is embedded in every exported JSON. Previously never cleared — a second user would see the prior user\'s identity pre-filled in the Export Attribution inputs and silently embedded in any export they produced',
          'Cross-user Firestore contamination via migration closed. The local→cloud migration previously constructed a fresh LocalStorageAdapter and read raw localStorage, which is shared across users on a browser. If User A\'s local decisions remained (local mode is intentionally a shared-browser workspace), User B initiating migration could have uploaded A\'s decisions into B\'s Firestore account. Migration now reads from the in-context adapter via useStorage(), guarded by an instanceof check',
          'ToS-mismatch sign-out now does full cleanup. The version-mismatch forced-sign-out previously skipped the same cleanup the user-initiated sign-out did. All three sign-out entry points now route through a single zero-argument performSignOutWithCleanup helper: clears consent, PII, hasUploaded flag, runs registry (state + mode reset), then calls firebaseSignOut',
          'Storage mode now resets to "local" on every sign-out path. Previously reset by only two of the three paths',
          'Local consent flag (ahp/tos-accepted-version) now cleared on every sign-out. Previously cleared only on the version-mismatch path',
          'ahp/hasUploadedToCloud cleared on sign-out so the next user gets the migration prompt. Previously persisted forever after the first user\'s migration, suppressing the prompt for any subsequent user on the same browser',
          'ToS Firestore write now blocks local acceptance on failure. Previously writeConsentRecord swallowed errors and unconditionally set ahp/tos-accepted-version, so on Firestore failure the local flag claimed acceptance while no Firestore record existed — other SPERT apps would re-prompt. Now writeConsentRecord throws on failure; AuthContext surfaces a user-visible signInError banner, leaves ahp/tos-write-pending set so the next sign-in retries, and performs a full sign-out. The local flag is only set after the Firestore write has succeeded',
          'Popup sign-in error handling overhauled. auth/popup-closed-by-user and auth/cancelled-popup-request now return silently (they no longer produce a generic "Sign-in failed" banner when the user just closed the popup or double-clicked). auth/popup-blocked now surfaces a specific "Sign-in was blocked by your browser. Please allow popups for this site and try again." banner. The write-pending flag is moved inside the try block and the catch clears it so a failed popup cannot orphan the flag',
          'Orphaned modelId on cloud → local switch fixed. Switching from cloud to local mode while viewing a cloud-only decision previously left stale Title/Goal rendered in memory with no working save. Now the mode transition dispatches RESET — user lands cleanly on the Setup tab\'s local decisions list',
          'Unhandled rejection in saveComparisons during sign-out race. If the user clicked Sign Out while a save was in flight, the Firestore PERMISSION_DENIED surfaced as an unhandled promise rejection. Now wrapped in try/catch with a user-visible "Save failed — you may have been signed out" error',
        ],
      },
      {
        title: 'Added',
        items: [
          'Signed-in + local chip state. The auth chip previously had only two branches — a user signed in but in local mode fell through to the signed-out pill, rendering a misleading "Sign in" prompt to an already-authenticated user. New AccountPopoverLocal component handles the signed-in + local state with its own pill (avatar + name + lock icon) and a popover offering two actions: "Switch to Cloud Storage" (navigation-only; opens Settings so the upload/skip prompt appears in the visible Storage section) and "Sign Out"',
          'signInError / clearSignInError on AuthContext surface sign-in errors from AuthContext (where A7 and popup-blocked errors originate) to StorageSection (which owns the error banner). Rendered as signInError ?? error in the existing red banner',
        ],
      },
      {
        title: 'Infrastructure',
        items: [
          'signOutCleanupRegistry module bridges the AuthProvider → StorageProvider → App provider nesting so AuthContext sign-out can reach App-scoped useAHP state and StorageProvider\'s mode preference without prop drilling or hoisting',
          'performSignOutWithCleanup zero-argument helper is the single entry point for every sign-out',
          'peekWritePending and clearWritePending helpers on consent.ts. peekWritePending reads the pending flag without consuming it; clearWritePending removes only the pending flag without touching other consent state',
          '7 new tests covering the cleanup registry and the centralized sign-out helper. All 170 existing + new tests pass',
        ],
      },
    ],
  },
  {
    version: '0.7.3',
    date: '2026-04-18',
    sections: [
      {
        title: 'Changed',
        items: [
          '"CR" acronym spelled out as "Consistency Ratio" in user-facing surfaces where new users first encounter the term. Affected spots: the consistency badge fallback tooltip, the advisor heading and partial-comparison caveat and per-row "Expected ... drop" label, the tier selector subheadings, and the synthesis confidence badge "Avg" row. Compact "CR" retained in space-constrained displays where the term has already been established nearby — the badge pill itself, the per-voter row in the results breakdown, and the advisor progress-bar caption',
        ],
      },
    ],
  },
  {
    version: '0.7.2',
    date: '2026-04-18',
    sections: [
      {
        title: 'Security',
        items: [
          'First security audit pass. Six findings fixed across Firestore rules, UI gating, and the import path; audit report and deferred items retained internally for future passes',
          'Firestore rules: editors can no longer write owner-governed fields on a decision (resultsVisibility, synthesis, publishedSynthesisId, collaborators). Previously the UI gated these to owners but the deployed rule allowed editors to bypass via direct adapter calls',
          'Firestore rules: bulk enumeration of SPERT AHP user profiles is now blocked. The share-by-email lookup still works because it uses a limit(1) query; the collection can no longer be listed in bulk by any authenticated Firebase user',
          'Export is now owner-only in cloud mode. Previously any collaborator (including viewers) could export a shared decision and receive every voter\'s raw comparison matrices in the JSON file, bypassing the "show aggregated to voters" privacy toggle. Local-mode export is unchanged — the local user is always sole owner',
          'JSON import now whitelist-copies every known field from the uploaded envelope. Unknown/rogue fields on meta, structure, items, or responses are dropped rather than persisted as-is. No current rendering path was affected; this is defense-in-depth',
          'JSON import now enforces a 2 MB file size cap. A legitimate AHP export with 50 voters at Complete tier is well under 500 KB; larger files are rejected before JSON.parse to prevent browser hangs on malformed or malicious payloads',
        ],
      },
      {
        title: 'Docs',
        items: [
          'SynthesisBundle type comment now documents that a published synthesis is a point-in-time snapshot; removing a collaborator after synthesis does not retroactively redact them from the stored bundle until synthesis is re-run',
          'Checked-in firestore.rules now mirrors the full suite-wide ruleset as deployed (all SPERT apps plus /users/{uid} ToS record), so the repo file can be diffed against Firebase Console output',
        ],
      },
    ],
  },
  {
    version: '0.7.1',
    date: '2026-04-18',
    sections: [
      {
        title: 'Fixed',
        items: [
          'Cloud mode: real-time sync of the Results Visibility setting. When an owner toggled "show aggregated results to voters" or "show own rankings to voters" on one device, the change was dropped on other subscribed devices — the subscription handler was rebuilding the model record without including the visibility block. Fix: preserve resultsVisibility when applying remote updates',
        ],
      },
      {
        title: 'Refactor',
        items: [
          'First refactor pass on the codebase. Three decompositions with no behavior change — all 153 pre-existing tests still pass, and 8 new tests added for the extracted modules and the visibility bug fix',
          'Extracted a Firestore synthesis codec that centralizes the nested-array JSON-string workaround. Four duplicated serialization/deserialization sites (saveSynthesis, getSynthesis, createModelFromBundle, and the useAHP subscription handler) now share one implementation',
          'Extracted the synthesis math pipeline out of useAHP. The hook shrank from 533 to 301 lines; the 243-line computation moved to a pure pipeline module that can be reasoned about and tested independently of state and storage',
          'Extracted the shared pairwise-comparison layer body. The criteria-layer render block and the per-criterion alternatives-layer render block were ~80% duplicated; ComparisonPanel shrank from 405 to 188 lines with a shared 187-line layer component consumed by both',
        ],
      },
    ],
  },
  {
    version: '0.7.0',
    date: '2026-04-18',
    sections: [
      {
        title: 'JSON Export/Import',
        items: [
          'Export any decision as a portable JSON file from the Settings tab — the envelope includes meta, structure, collaborators, responses, and the published synthesis, plus an attribution block pulled from the app-level Export Attribution fields',
          'Import a previously exported decision from the Setup screen via a new "Import from JSON" button. The importer automatically becomes the owner and the app navigates into the imported model on success',
          'On import, foreign collaborators and their responses are dropped. The original owner\'s response is remapped to the current user, synthesis is stripped, and models that were "synthesized" revert to "open" so they recompute against the new single-user voter set',
          'Provenance is preserved: `_originRef` carries forward and an `imported` entry is appended to the change log',
          'Export Attribution in the global Settings modal is now wired into exports (no longer marked "future feature")',
        ],
      },
      {
        title: 'Architecture',
        items: [
          '`createModelFromBundle` promoted from a FirestoreAdapter-only method to the `StorageAdapter` interface, with a LocalStorageAdapter implementation composed from existing CRUD methods',
          'New `AHPExportBundle` and `AHPExportEnvelope` types, plus `APP_VERSION` constant stamped into every export',
          'Export and import logic lives in standalone utilities (`src/storage/exportModel.ts`, `src/storage/importModel.ts`) rather than inside the adapters',
        ],
      },
      {
        title: 'Tests',
        items: [
          'New `exportImport.test.ts` suite covering schema round-trip, end-to-end local round-trip, version guard, and UID-remap + synthesis-strip behavior (8 tests)',
        ],
      },
    ],
  },
  {
    version: '0.6.2',
    date: '2026-04-18',
    sections: [
      {
        title: 'Fixed',
        items: [
          'Consistency Advisor no longer suggests targets outside the Saaty scale. The eigenvector-implied ratio is now clamped to [1/9, 9] before being displayed or used for the ghost slider marker, so the advisor always points to a value the user can actually set',
        ],
      },
    ],
  },
  {
    version: '0.6.1',
    date: '2026-04-18',
    sections: [
      {
        title: 'Consistency Advisor Polish',
        items: [
          'Advisor language now matches the layer — "more preferred" on alternative layers, "more important" on the decision-factor layer (previously always said "important")',
          'New ghost indicator on each comparison slider: a muted downward arrow and dashed line mark where the slider would need to be for your judgments to be consistent — visual only, does not move the thumb',
          'Advisor computation now lifted to the panel so the spotlight and the ghost indicator share one source of truth',
        ],
      },
    ],
  },
  {
    version: '0.6.0',
    date: '2026-04-17',
    sections: [
      {
        title: 'Consistency Advisor',
        items: [
          'New inline advisor appears below the CR badge whenever CR exceeds 10%, ranking the judgments most likely to be driving inconsistency',
          'Each spotlight row shows your current answer, the value implied by your other judgments, and the expected CR drop if you reconsider',
          'Reconsider button scrolls to the relevant comparison and highlights it with an amber ring (respects prefers-reduced-motion)',
          'Collapsible transitivity section (Complete tier only) explains inconsistencies in plain English when present',
          'CR progress bar shows your current ratio against the 10% target',
        ],
      },
      {
        title: 'Compare Tab Scroll Context',
        items: [
          'Layer tabs are now sticky at the top while scrolling through long comparison lists',
          'New collapsible "Reminder: decision goal" below the tab row keeps intent in reach',
          'Context banners above each comparison section name the goal (criteria layer) or criterion (alternatives layer) you are ranking against',
        ],
      },
      {
        title: 'Results Chart Rewrite',
        items: [
          'PriorityChart replaced with a custom CSS component — long factor/alternative labels now wrap cleanly instead of overflowing the axis',
          'Demoted the Re-run Synthesis button to a small outlined control in the header row',
        ],
      },
      {
        title: 'Copy',
        items: [
          'Consistency badge tooltip language simplified — partial-comparison modes now read "CR estimate — based on partial comparisons" instead of the previous technical label',
        ],
      },
    ],
  },
  {
    version: '0.5.0',
    date: '2026-04-14',
    sections: [
      {
        title: 'Individual Voter Breakdown',
        items: [
          'Per-voter factor weights, alternative scores, and global rankings computed during synthesis',
          'Expandable per-voter cards in Results showing factor weights, alternative scores, and CR',
          'Grey "incomplete" badge flags factors where uniform fallback was applied',
          'VoterRadarChart renders when 2+ voters have individual priority data',
        ],
      },
      {
        title: 'Results Visibility Controls',
        items: [
          'Owner-only "Results Visibility" settings (cloud mode) control what voters see',
          '"Allow voters to see aggregated results" toggle (default: off)',
          '"Allow voters to see their own rankings" toggle (default: on)',
        ],
      },
    ],
  },
  {
    version: '0.4.1',
    date: '2026-04-13',
    sections: [
      {
        title: 'Fixed',
        items: [
          'Fixed "Nested arrays are not supported" error when running synthesis in cloud mode',
        ],
      },
    ],
  },
  {
    version: '0.4.0',
    date: '2026-04-13',
    sections: [
      {
        title: 'Language',
        items: [
          'Renamed "criteria" to "decision factors" across all UI surfaces \u2014 more accessible terminology that avoids goal/objective collision',
          '"Decision Factors" in headers and tabs; "factors" in placeholders and chart labels',
          'About page retains "criteria" for AHP methodology accuracy',
        ],
      },
    ],
  },
  {
    version: '0.3.0',
    date: '2026-04-13',
    sections: [
      {
        title: 'Sharing',
        items: [
          'Collaborator list now displays user names and emails instead of truncated Firebase UIDs',
        ],
      },
      {
        title: 'UX',
        items: [
          'Redesigned comparison slider with intensity bars \u2014 vertical bars grow taller toward the edges, color fills outward from center (blue left, amber right)',
          'Fixed slider direction \u2014 dragging toward an item now means you prefer that item',
          'Slider thumb repositioned below the intensity bars for clearer visual separation',
          'Fixed bug where editing existing criteria or alternative names would swallow keystrokes',
          'Long item labels now wrap instead of truncating with ellipsis',
          'Current Weights bar chart enforces a minimum bar width so small percentages remain visible',
        ],
      },
      {
        title: 'Comparison Matrix',
        items: [
          'Comparison matrix table hidden for non-owner collaborators',
          'For owners, matrix collapsed behind a toggle (default closed)',
        ],
      },
      {
        title: 'Language',
        items: [
          'Renamed "Criteria weights" tab to "Objectives" for more accessible language',
          'Renamed "Criteria Weights" chart in Results to "Objective Weights"',
        ],
      },
    ],
  },
  {
    version: '0.2.4',
    date: '2026-04-09',
    sections: [
      {
        title: 'Documentation',
        items: [
          'Added Quick Reference Guide PDF to the About page \u2014 click "Open PDF" to view in a new browser tab',
        ],
      },
    ],
  },
  {
    version: '0.2.3',
    date: '2026-04-09',
    sections: [
      {
        title: 'Cloud Storage',
        items: [
          'AuthChip is now a single click target in both signed-in and signed-out states — the whole pill (avatar, name, divider, cloud icon) is one button',
          'Clicking the signed-in chip opens a lightweight account popover with the user\u2019s name, email, and a Sign Out button — no more navigating to the Settings tab to sign out',
          'Popover dismisses via Escape, outside click, or Cancel; Sign Out shows a "Signing out\u2026" loading state and guards against re-entry',
        ],
      },
    ],
  },
  {
    version: '0.2.2',
    date: '2026-04-07',
    sections: [
      {
        title: 'Cloud Storage',
        items: [
          'Added explicit Terms of Service and Privacy Policy consent before cloud sign-in — first-time users (and users on an outdated ToS version) must check a box and click "Enable Cloud Storage" before any Firebase Auth popup is opened',
          'Consent is recorded both locally (fast path on subsequent sign-ins) and in Firestore at users/{uid} with the current ToS version',
          'Outdated consent versions force a sign-out and re-consent',
        ],
      },
    ],
  },
  {
    version: '0.2.1',
    date: '2026-04-07',
    sections: [
      {
        title: 'Fixed',
        items: [
          'Cloud storage sign-in flow replaced with the standard pattern used by other SPERT Suite apps — sign-in buttons are now always visible when cloud storage is available, and the Local/Cloud radio only becomes active after signing in',
          'Removed the "radio-first" UX that caused a deadlock where clicking Cloud while signed out did nothing',
          'StorageContext reverted to the canonical single-mode shape from ARCHITECTURE.md \u00A74.4',
        ],
      },
    ],
  },
  {
    version: '0.2.0',
    date: '2026-04-07',
    sections: [
      {
        title: 'Cloud Storage',
        items: [
          'Optional Firebase-backed cloud storage — sign in with Google or Microsoft',
          'Global Settings modal (gear icon in header) for storage mode, sign-in, and export attribution',
          'Auth chip in header: split pill showing account status and quick access to settings',
          'Local → Cloud one-way migration with userId rewrite and provenance preservation',
          'Real-time sync across devices and tabs via Firestore onSnapshot',
          'Per-decision sharing (cloud mode, owner only) — add collaborators by email as editor or viewer',
          'Owner-controlled voting participation toggle for editors',
        ],
      },
      {
        title: 'Architecture',
        items: [
          'StorageAdapter interface converted to async — all methods return Promises',
          'Context-injected storage adapter (LocalStorageAdapter / FirestoreAdapter)',
          'AuthProvider + StorageProvider with storage-ready gate to prevent auth-loading race',
          'Monolithic Firestore document per decision (spertahp_projects/{modelId})',
          'Lightweight fingerprinting: _originRef (workspace UUID) and _changeLog on ModelDoc',
          'Simplified CollaboratorRole: owner / editor / viewer',
        ],
      },
    ],
  },
  {
    version: '0.1.1',
    date: '2026-04-05',
    sections: [
      {
        title: 'Legal',
        items: [
          'Updated Terms of Service and Privacy Policy to v04-05-2026',
          'Added SPERT\u00AE AHP to list of covered apps',
          'Updated effective date to April 5, 2026',
        ],
      },
    ],
  },
  {
    version: '0.1.0',
    date: '2026-04-05',
    sections: [
      {
        title: 'Features',
        items: [
          'AHP decision-making framework with pairwise comparisons',
          'Four comparison tiers: Quick, Balanced, Thorough, Complete',
          'LLSM+RAS weight computation for incomplete matrices',
          'Principal eigenvector for complete matrices',
          'Consistency ratio with Harker Option A for incomplete matrices',
          'Suggest repair for inconsistent comparisons',
          'Global synthesis with weighted criteria and alternatives',
          'Sensitivity analysis with crossover detection',
        ],
      },
      {
        title: 'Group Decision Support',
        items: [
          'AIJ and AIP group aggregation methods',
          'Kendall\'s W concordance with tie-corrected average ranking',
          'Disagreement analytics (CV, nMAD, band classification)',
          'Cosine similarity pairwise agreement',
          'Synthesis confidence badge (RED/AMBER/GREEN)',
        ],
      },
      {
        title: 'UX',
        items: [
          'Tab-based navigation (Setup / Compare / Results / Settings)',
          'Drag-and-drop reordering for criteria and alternatives (@dnd-kit)',
          'Dual-color comparison sliders — blue fills toward left item, amber fills toward right item, with smooth animated transitions',
          'Context-aware slider labels ("more important" for criteria, "more preferred w.r.t. [criterion]" for alternatives)',
          'Disagreement threshold configuration (strict/standard/exploratory presets)',
          'Dark mode with three-state toggle (light/dark/system) — persisted in localStorage',
          'About page with AHP methodology, data security, licensing, and warranty sections',
          'Changelog page with categorized version history',
        ],
      },
      {
        title: 'Legal',
        items: [
          'GNU GPL v3.0 license with attribution preservation terms (Section 7(b))',
          'Terms of Service and Privacy Policy (linked to spertsuite.com)',
          'SPERT\u00AE Suite branding in footer',
        ],
      },
      {
        title: 'Infrastructure',
        items: [
          'LocalStorage-based persistence',
          'Firebase adapter stub (Phase 2 ready)',
          'TypeScript strict mode with noUncheckedIndexedAccess',
          'Tailwind CSS v4 with @tailwindcss/vite plugin',
          'Vite 6, React 18, Vitest test framework',
          'Deployed on Vercel',
        ],
      },
    ],
  },
];
