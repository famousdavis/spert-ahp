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
