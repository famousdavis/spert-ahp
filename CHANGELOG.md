# SPERT® AHP — Changelog

## v0.8.2 (April 25, 2026)

### Fixed
- **Shared collaborators' judgments now reach synthesis.** Critical bug: `FirestoreAdapter.addCollaborator` wrote the new collaborator into the `collaborators` array and `members` map but never initialized a `responses[userId]` slot for them. When the collaborator opened the model and tried to save a pairwise judgment, `saveComparisons` threw `Response for {userId} not found`, which surfaced to the user as the misleading *"Save failed — you may have been signed out"* error. From the owner's side, no shared collaborator's data ever landed in Firestore, so synthesis silently aggregated only the owner's responses — producing global priority scores that ignored every student/teammate while the "comparisons changed — re-run synthesis" banner kept firing without changing the result. Fix: `addCollaborator` now writes an empty response slot at the same time as adding the collaborator.
- **Self-heal for legacy shared models.** Existing models that were shared before v0.8.2 still have collaborators with no response slot. `useAHP.loadModel` now detects this — when the current user is in the collaborators array but has no response slot, it lazy-creates one. Firestore rules permit editors to write `responses.{theirOwnUid}` since `responses` is not in the blocked-fields list, so the heal works for owners and editors alike. No manual remediation needed — every existing collaborator gets fixed the next time they open a shared model.

## v0.8.1 (April 25, 2026)

### Fixed
- **Clearer error message when an email is already registered with a different sign-in provider.** Users who previously signed in with Google and then tried Microsoft (or vice versa) on the same email saw an unhandled `auth/account-exists-with-different-credential` error fall through as a generic failure. The popup catch in `AuthContext.initiateSignIn` now surfaces a plain-English banner: *"An account with this email already exists using a different sign-in method. Please use the other provider (Google or Microsoft) — whichever you signed in with the first time."* No account-linking work — just a targeted error case so the user knows which button to press.

## v0.8.0 (April 20, 2026)

### Security
Second security audit pass, focused on the auth / cloud-storage subsystem. Seven Critical and seven Medium findings fixed through a single centralized sign-out architecture plus targeted patches. All sign-out paths now route through one helper so in-memory state, per-user PII, and storage mode reset atomically on every sign-out.

- **Sign-out now clears in-memory decision state.** The `useAHP` reducer state (modelId, model, structure, collaborators, responses, synthesis) lives as a `useReducer` inside `App.tsx`. Previously, sign-out only called `firebaseSignOut` plus `switchMode('local')` — nothing cleared the in-memory state. A second user on the same browser saw the prior user's decision title, goal, criteria, alternatives, and responses rendered across Settings / Compare / Results until they manually clicked "All Decisions". Fix: a module-level `signOutCleanupRegistry` bridges the provider-nesting gap; `App.tsx` registers `ahpState.closeModel()` into it; `performSignOutWithCleanup` invokes the registry before revoking Firebase credentials (audit findings A1, A1-structural, F1, D4)
- **Export Attribution PII now cleared on sign-out.** The `ahp/exportAttribution` localStorage key stores the user's name and identifier (email or student ID) embedded in every exported JSON. Previously never cleared — a second user would see the prior user's identity pre-filled in the Export Attribution inputs and silently embedded in any export they produced. Now removed by `performSignOutWithCleanup` (audit finding A2-PII)
- **Cross-user Firestore contamination via migration closed.** `StorageSection.handleMigrate` and `handleSwitchToCloud` constructed a fresh `new LocalStorageAdapter()` and fed it to `uploadLocalToCloud`. The fresh adapter reads raw localStorage — shared across users on the same browser. If User A's localStorage was not cleared on sign-out (per suite-wide design, local-mode decisions are intentionally a shared-browser workspace), User B signing in and initiating migration could upload User A's decisions into User B's Firestore account with actor fields rewritten to User B's uid. Fix: migration now reads from the in-context adapter retrieved via `useStorage()`, guarded by an `instanceof LocalStorageAdapter` check. The read path is the same adapter instance the app has been writing through — cannot silently consume a stale fresh-read of another user's localStorage (audit finding C3)
- **ToS-mismatch sign-out now does full cleanup.** The `onAuthStateChanged` Branch B's version-mismatch forced-sign-out called `clearLocalConsent()` and `firebaseSignOut(auth)` directly, skipping the same cleanup that the user-initiated path did (which was itself incomplete). All three sign-out entry points — `StorageSection`, `AccountPopover`, and the ToS-mismatch branch — now route through a single zero-argument `performSignOutWithCleanup()` helper that clears consent state, PII, the has-uploaded flag, runs the registry (state reset + mode reset), then calls Firebase sign-out (audit findings A5, A6)
- **Storage mode now resets to `local` on every sign-out path.** Previously `ahp/storageMode` was reset only by two of the three sign-out paths. Now consistent across all paths via the centralized registry callback registered by `StorageProvider` (audit finding A4)
- **Local consent flag now cleared on every sign-out.** `ahp/tos-accepted-version` was cleared only on the version-mismatch path, not on the user-initiated path. Now uniformly cleared (audit finding A2-consent)
- **`ahp/hasUploadedToCloud` cleared on sign-out so the next user gets the migration prompt.** Previously the flag persisted forever after the first user's migration, suppressing the prompt for any subsequent user on the same browser (audit finding A2-HasUploaded)
- **ToS Firestore write now blocks local acceptance on failure.** `writeConsentRecord` previously swallowed Firestore errors internally and unconditionally set `ahp/tos-accepted-version`. On failure the local flag claimed acceptance while no Firestore record existed — other SPERT suite apps would re-prompt. Fix: `writeConsentRecord` now throws on failure; the caller surfaces a user-visible `signInError` banner via the new `AuthContext` `signInError` / `clearSignInError` slots, leaves `ahp/tos-write-pending` set so the next sign-in retries, and performs a full sign-out. The local flag is only set after the Firestore write has succeeded (audit finding A7)
- **Popup sign-in error handling overhauled.** Previously, `auth/popup-closed-by-user` and `auth/cancelled-popup-request` were re-thrown to `StorageSection` which surfaced them as generic "Sign-in failed" errors — closing the popup or double-clicking the button produced a confusing error banner. `auth/popup-blocked` had no recovery path. Fix: closed-by-user and cancelled-popup-request now return silently; `auth/popup-blocked` surfaces a specific "Sign-in was blocked by your browser. Please allow popups for this site and try again." banner via `signInError`; all other errors propagate normally. `setWritePending()` moved inside the try block and the catch clears the pending flag so a failed popup doesn't orphan the flag (audit finding D1)
- **Orphaned `modelId` on cloud → local switch fixed.** Previously, switching from cloud to local mode while viewing a cloud-only decision left `state.modelId` pointing to an inaccessible cloud ID; `LocalStorageAdapter.subscribeModel` is a no-op so the UI rendered stale Title/Goal from memory and save attempts silently failed. Fix: `App.tsx` now watches mode transitions and dispatches RESET when mode flips to `local` with a model open. The user lands cleanly on the Setup tab's local decisions list. Per spec, no keep-local-copy prompt in this release (audit findings C4, C5)
- **Unhandled rejection in `saveComparisons` during sign-out race.** `useAHP.saveComparisons` did not wrap the awaited `storage.saveComparisons` call. If a user clicked Sign Out while a save was in flight, the resulting Firestore `PERMISSION_DENIED` surfaced as an unhandled promise rejection. Wrapped in try/catch; on error, dispatches a SET_ERROR with a user-visible "Save failed — you may have been signed out" message (audit finding A3)

### Added
- **Signed-in + local chip state.** The auth chip previously had only two branches: signed-in + cloud (avatar + cloud icon → account popover) and everything-else (lock icon + "Sign in" pill). A user signed in but in local mode fell through to the signed-out pill — rendering a misleading "Sign in" prompt to an already-authenticated user. New `AccountPopoverLocal` component handles the signed-in + local state (state d) with its own pill (avatar + name + lock icon) and popover offering two actions: "Switch to Cloud Storage" (navigation-only; opens Settings so the upload/skip prompt can appear in the visible Storage section) and "Sign Out" (routes through `performSignOutWithCleanup`). `AuthChip`'s `onClick` prop renamed to `onOpenSettings` for unambiguous intent (audit finding F2(d))
- **`signInError` / `clearSignInError` on `AuthContext`.** New context slots surface sign-in errors from `AuthContext` (where A7 and D1 errors originate) to `StorageSection` (which owns the error banner). `StorageSection` renders `signInError ?? error` in the existing red banner

### Infrastructure
- **`signOutCleanupRegistry` module.** Bridges the `AuthProvider → StorageProvider → App` provider nesting so `AuthContext` sign-out can reach `App`-scoped `useAHP` state and `StorageProvider`'s mode preference without prop drilling or hoisting state into a third context. `App.tsx` registers `ahpState.closeModel()`; `StorageProvider` registers the mode-to-local reset; `performSignOutWithCleanup` invokes `runSignOutCleanup()` before Firebase credential revocation
- **`performSignOutWithCleanup` helper.** Zero-argument `async` function that is the single entry point for every sign-out: clears consent state, Export Attribution, hasUploaded flag, runs the registry, then calls `firebaseSignOut(auth)`. All three previous sign-out paths (`StorageSection.handleSignOut`, `AccountPopover.handleSignOut`, `AuthContext` ToS-mismatch branch) now call this helper
- **`peekWritePending` and `clearWritePending` helpers** on `src/lib/consent.ts`. `peekWritePending` reads the flag without consuming it (used by the A7 Branch A refactor); `clearWritePending` removes the pending flag only (used by the D1 popup-failure catch path)
- **7 new tests** covering the cleanup registry and the centralized sign-out helper. All 170 existing + new tests pass

## v0.7.3 (April 18, 2026)

### Changed
- **"CR" acronym spelled out as "Consistency Ratio" in user-facing surfaces where the term is introduced or where space permits.** New users had no in-context way to know what "CR" stands for — it appeared bare on the consistency badge tooltip, advisor heading and body copy, tier selector, and the synthesis confidence badge. Affected strings: `ConsistencyBadge` fallback tooltip (tier/no-value case), `ConsistencyAdvisor` heading + partial-comparison caveat + per-row "Expected … drop" label, `TierSelector` tier-card subheadings, `SynthesisConfidenceBadge` "Avg …" row, and the two `confidenceLabel` constants produced by `consistencyRatio`. Compact "CR" retained in space-constrained displays where the term has already been established nearby: the badge pill itself, the per-voter row in `VoterBreakdownCard`, and the advisor progress-bar caption

## v0.7.2 (April 18, 2026)

### Security
First security audit pass on the codebase. Six findings fixed; four deferred with explicit justification.

- **Firestore rules — editors can no longer write owner-governed fields.** The deployed `spertahp_projects` update rule previously guarded only `owner` and `members` against non-owner writes, leaving `resultsVisibility`, `synthesis`, `publishedSynthesisId`, and `collaborators` writable by any editor. The UI gated these to owners, but a determined editor could bypass via direct adapter or Firestore SDK calls — flipping `showAggregatedToVoters` to see other voters' data, republishing synthesis, or changing anyone's `isVoting` flag. Tightened the rule to forbid editor writes to all four keys (audit finding 3.3)
- **Firestore rules — profile enumeration blocked.** The deployed `spertahp_profiles` rule granted read access to any authenticated Firebase user (shared auth tenant across the SPERT suite), permitting bulk listing of every SPERT AHP user's displayName + email. Replaced `allow read` with `allow get` + a `list` rule constrained to `request.query.limit <= 1`. The share-by-email flow in SharingSection still works because its query is now `limit(1)`-constrained. Does not stop one-email-at-a-time probing — deliberate tradeoff for share-by-email UX without a Cloud Function (audit finding 3.6, Option B)
- **Export is now owner-only in cloud mode.** Previously any collaborator with project access (including viewers) could click "Export as JSON" and receive a file containing every voter's raw comparison matrices and all collaborator UIDs — bypassing the owner's `showAggregatedToVoters = false` privacy control. Added `mode !== 'cloud' || isOwner` gate on the Export UI in `SettingsPanel`. Local mode is unaffected (local user is always sole owner) (audit finding 8.2)
- **Import now whitelist-copies fields.** `importModel` previously spread `envelope.meta`, `envelope.structure`, `envelope.collaborators[]` items, and the original owner's response through to storage, which in local mode meant unknown/rogue fields on the uploaded JSON survived round-trips via `setJSON` → `getJSON`. Cloud mode was already safe because `FirestoreAdapter.createModelFromBundle` picks whitelisted fields explicitly. Defense-in-depth: every imported object now goes through explicit per-field pickers (`pickString`, `pickNumber`, `pickStatus`, `pickCompletionTier`, `pickDisagreementConfig`, `pickResultsVisibility`, `pickChangeLog`, `pickStructuredItem`, `pickStructure`, `pickComparisonMap`, `pickAlternativeMatrices`, `pickResponse`) (audit finding 1.3)
- **Import now enforces a 2 MB size cap.** `importModel` rejects raw JSON input over 2 MB before `JSON.parse`, and the test harness covers the error path. A legitimate AHP export at Complete tier with 50 voters is under 500 KB; 2 MB is generous headroom for authentic use while stopping malformed or malicious huge payloads that would hang the main thread (audit finding 1.4)
- **Checked-in firestore.rules now mirrors the deployed suite ruleset.** Previous repo file declared only the AHP-specific block; the canonical deployed rules cover all SPERT apps plus `/users/{uid}` for ToS records (which uses a `hasOnly()` whitelist of allowed fields — no consent-record forgery possible). Full suite rules now in the repo for diff-against-console verification (audit finding 7.1)

### Docs
- `SynthesisBundle` type comment documents the point-in-time-snapshot semantics: removing a collaborator after synthesis does NOT retroactively redact them from the stored bundle until synthesis is re-run. Expected behavior worth documenting so consumers don't assume retroactive redaction

### Audit items deferred with justification
- **7.2** (consent-bypass via localStorage) — cosmetic only. The Firestore consent record at `users/{uid}` is the authoritative artifact and is protected by a uid-matched `hasOnly()` whitelist
- **3.7** (spertahp_settings lacks `hasOnly()`) — path is currently unused by the AHP app. Will add hasOnly when AHP starts persisting settings to Firestore
- **v0.7.1 flagged bug** (state.responses lingering after collaborator removal) — re-assessed in this audit as correctness debt, not a security exposure. No render path surfaces other-user responses from state; exports read fresh from storage
- **Synthesis snapshot retention** — documented in the SynthesisBundle type comment per above; no code change

## v0.7.1 (April 18, 2026)

### Fixed
- **Cloud sync of Results Visibility settings.** When an owner toggled "show aggregated results to voters" or "show own rankings to voters" on one device, the change was dropped on other subscribed devices. The Firestore subscription handler rebuilt the model record field-by-field and omitted the `resultsVisibility` block, so `SET_MODEL` replaced the meta with one that silently lost the setting. Fix: preserve `resultsVisibility` (with defaults when absent) in the subscription decode path. Local mode was never affected — subscriptions are a no-op there and `loadModel` already backfills via the adapter's own meta unwrapper

### Refactor
First refactor pass on the codebase — no behavior change. All 153 pre-existing tests still pass; 8 new tests added for the extracted modules and the visibility bug fix. Three decompositions:

- **Firestore synthesis codec** ([src/storage/firestoreSynthesisCodec.ts](src/storage/firestoreSynthesisCodec.ts)). Firestore does not support nested arrays, so `summary.localPriorities` and `individual.individualLocalPriorities` are JSON-stringified on write and parsed on read. That workaround was duplicated across four sites: `FirestoreAdapter.saveSynthesis`, `FirestoreAdapter.getSynthesis`, `FirestoreAdapter.createModelFromBundle`, and the `useAHP` subscription handler. All four now share one `serializeSynthesisForFirestore` / `deserializeSynthesisFromFirestore` pair
- **Synthesis math pipeline** ([src/hooks/synthesisPipeline.ts](src/hooks/synthesisPipeline.ts)). `useAHP.runSynthesis` was 243 lines that interleaved storage I/O, voter-data gathering, AIJ aggregation, eigenvector/LLSM computation, per-voter priorities, confidence signals, and hashing. Extracted to `computeSynthesis(inputs)` which returns `{ synthesisId, bundle }`. The hook becomes a thin orchestrator: compute → persist → dispatch. `useAHP.ts` went from 533 to 301 lines
- **PairwiseComparisonLayer component** ([src/components/comparison/PairwiseComparisonLayer.tsx](src/components/comparison/PairwiseComparisonLayer.tsx)). The criteria-layer render block and the per-criterion alternatives-layer render block in `ComparisonPanel` were ~80% duplicated — ConsistencyBadge, advisor, convergence/connectivity warnings, owner matrix details, pairs list, weights display. Extracted to a shared component consumed by both. `ComparisonPanel.tsx` went from 405 to 188 lines
- Minor cleanup: removed a dead `void serverTimestamp` suppression in `FirestoreAdapter.ts` (import was unused)

## v0.7.0 (April 18, 2026)

### JSON Export/Import
- Export any decision as a portable JSON file from the Settings tab. The envelope includes meta, structure, collaborators, responses, and the currently published synthesis, plus an `_exportedBy` attribution block pulled from app-level Export Attribution
- Import a previously exported decision from the Setup screen via a new "Import from JSON" button. The importer automatically becomes the owner; the app navigates into the imported model after a successful load
- On import, foreign collaborators and their responses are dropped. The original owner's response is remapped to the current user — the importer becomes the sole voter. Synthesis is stripped and `status: 'synthesized'` reverts to `'open'` so the imported model recomputes against its new voter set
- `_originRef` is preserved across import (provenance stays with the file), and an `imported` entry is appended to `_changeLog`
- Export Attribution copy in the global Settings modal is no longer marked "(future feature)" — the fields are wired into the export envelope

### Architecture
- New `AHPExportBundle` and `AHPExportEnvelope` types in `src/types/ahp.ts`
- `createModelFromBundle` promoted from a `FirestoreAdapter`-only method to the `StorageAdapter` interface. `LocalStorageAdapter` gains an implementation that composes existing `createModel` / `addCollaborator` / `createResponse` / `saveSynthesis` calls. `FirestoreAdapter.createModelFromBundle` now inlines synthesis into the monolithic document (single write) using the same JSON-string serialization that `saveSynthesis` applies to nested arrays
- `FirestoreAdapter.ModelBundle` is now a type alias for `AHPExportBundle` — `migration.ts` continues to work with a single-line `synthesis: null` addition
- New `APP_VERSION` constant in `src/core/models/constants.ts`, stamped into the export envelope
- New `src/storage/exportModel.ts` and `src/storage/importModel.ts` utilities keep export/import logic out of the adapters themselves
- `ATTRIBUTION_KEY` exported from `AppSettingsModal.tsx` so the export utility imports the canonical constant instead of duplicating the string

### Tests
- New `src/__tests__/exportImport.test.ts` with four groups: schema round-trip, end-to-end local round-trip through `useAHP`, version/shape guard, and UID-remap + synthesis-strip behavior (8 tests)

## v0.6.2 (April 18, 2026)

### Fixed
- Consistency Advisor no longer suggests targets outside the Saaty scale. The raw eigenvector-implied ratio `w[i] / w[j]` is unbounded and could produce values like `1/15x` or `12x` on severely inconsistent matrices — the advisor would render these in the spotlight and the ghost slider marker would render off the track. `rankJudgments` now clamps `impliedValue` to `[1/9, 9]` before returning, so the advisor always points to a Saaty-valid target the user can physically set
- CR-improvement math is unaffected: `buildMatrix` clamps to the same range internally, so `crDelta` already reflected the improvement achievable at the Saaty bound. Only the displayed target and ghost position are affected
- New test: `rankJudgments` invariant that `impliedValue` always lands in `[1/9, 9]`

## v0.6.1 (April 18, 2026)

### Consistency Advisor Polish
- Advisor language now matches the layer: "more preferred" on alternative-layer rankings, "more important" on the decision-factor layer. Previously the advisor always said "important" even when the comparison slider below it said "preferred"
- Fallback strings for out-of-range values ("Equally important" / "Equally preferred") are also mode-aware now
- Transitivity prose ("A is Xx more important than B...") uses the same mode-dependent phrasing

### Ghost Consistency Indicator
- New passive marker on each comparison slider: a muted downward arrow plus dashed vertical line at the slider position that would make the judgment consistent with the user's other answers. Rendered only when the advisor has a CR-improvement target for that pair and it differs from the current thumb position
- The ghost is visual only — it does not move the thumb or apply any value
- Hover tooltip describes which side the consistency target favors
- Ghost is `aria-hidden` since the spotlight row above conveys the same information accessibly

### Architecture
- `rankJudgments` and `findTransitivityViolations` computation lifted from `ConsistencyAdvisor` up to `ComparisonPanel` / `AlternativeLayer`, so the advisor spotlight and the per-row ghost share one `RankedJudgment[]` source of truth (no duplicate computation, guaranteed agreement)
- `ConsistencyAdvisor` is now a pure view component taking `ranked`, `violations`, and `mode` as props
- `ComparisonInput` accepts a new optional `impliedValue?: number` prop

## v0.6.0 (April 17, 2026)

### Consistency Advisor
- New inline advisor below the CR badge (Compare tab) when CR exceeds 10%, ranking the judgments most likely to be driving inconsistency
- Each spotlight row shows the user's current answer, the eigenvector-implied value, and the expected CR drop if reconsidered
- Reconsider button scrolls to and highlights the relevant comparison with an amber ring; respects `prefers-reduced-motion`
- Row cap of 3 with a small-n floor (`totalPairs - 1`) so the advisor never surfaces every judgment as a top offender
- Collapsible transitivity explanations (Complete tier only), in plain English, for triples whose stored values materially contradict their implied product
- CR progress bar renders current ratio against the 10% target

### Compare Tab Scroll Context
- Layer tabs are sticky at the top of the Compare panel while scrolling
- New collapsible "Reminder: decision goal" below the sticky tab row
- Context banners above each comparison section name the goal (criteria layer) or criterion (alternatives layer) being ranked against

### Results Chart
- `PriorityChart` rewritten with CSS bars — long factor/alternative labels now wrap cleanly instead of overflowing or colliding with adjacent bars
- Kept the original props interface; both consumers (ResultsPanel, VoterBreakdownCard) need no changes
- Re-run Synthesis button demoted to a small outlined secondary control in the Results header row

### Copy
- Consistency badge tooltip strings simplified — partial-comparison modes (tier 2/3) now read "CR estimate — based on partial comparisons"; Complete tier reads "Full confidence CR"
- Internal `Harker` references retained in code comments documenting the math; no longer surfaced in user-facing UI

### Math Layer
- New `rankJudgments(n, comparisons, tier)` — ranks observed judgments by CR-improvement potential; powers the Consistency Advisor spotlight
- New `findTransitivityViolations(n, comparisons, tier)` — detects (i, j, k) triples where stored values contradict the implied product; tier-gated internally and filters near-zero (<0.1 log magnitude) and out-of-scale (>9 or <1/9 implied) cases

## v0.5.0 (April 14, 2026)

### Individual Voter Breakdown
- Synthesis pipeline now computes per-voter factor weights, alternative scores, and global rankings
- New "Individual Voter Rankings" section in Results with expandable per-voter cards showing factor weights, alternative scores, and CR
- Grey "incomplete" badge flags factors where a voter had no alternative comparisons (uniform fallback applied)
- VoterRadarChart now renders when 2+ voters have individual priority data

### Results Visibility Controls
- New owner-only "Results Visibility" section in Settings (cloud mode)
- "Allow voters to see aggregated results" toggle (default: off) — owner decides when to share group results
- "Allow voters to see their own rankings" toggle (default: on) — voters can review their individual breakdown
- Non-owners see a placeholder message when aggregated results are hidden

### Architecture
- Extracted shared `useProfiles` hook from SharingSection for reuse across voter breakdown and sharing UI
- `SynthesisIndividual` extended with `individualAlternativeScores`, `individualLocalPriorities`, and `individualIncompleteCriteria`
- `ModelDoc` extended with optional `resultsVisibility` field (backward-compatible defaults)
- Firestore serialization handles nested array fields in individual synthesis data

## v0.4.1 (April 13, 2026)

### Fixed
- Fixed "Nested arrays are not supported" error when running synthesis in cloud mode — `localPriorities` (a 2D array) is now serialized as JSON before writing to Firestore and deserialized on read

## v0.4.0 (April 13, 2026)

### Language
- Renamed "criteria" / "criterion" to "decision factors" / "factor" across all UI surfaces — more accessible for non-AHP-specialists while avoiding the goal/objective collision identified in terminology review
- "Decision Factors" used in headers and tab labels; "factors" in tight spaces like placeholders and chart labels
- About page retains "criteria" for AHP methodology accuracy

## v0.3.0 (April 13, 2026)

### Sharing
- Collaborator list now displays user names and emails instead of truncated Firebase UIDs — profiles are fetched from Firestore on render with graceful fallback

### UX
- Redesigned comparison slider with intensity bars — 17 vertical bars grow taller toward the edges to communicate preference strength, color fills outward from center (blue left, amber right)
- Fixed slider direction — dragging toward an item now means you prefer that item (previously inverted)
- Slider thumb repositioned below the intensity bars for clearer visual separation
- Fixed bug where editing existing criteria or alternative names would swallow keystrokes — inputs now use local state with blur-to-save
- Long item labels now wrap instead of truncating with ellipsis in both comparison sliders and Current Weights charts
- Current Weights bar chart enforces a minimum bar width so small percentages remain visible

### Comparison Matrix
- Comparison matrix table is now hidden for non-owner collaborators
- For owners, the matrix is collapsed behind a "Show comparison matrix" toggle (default closed)

### Language
- Renamed "Criteria weights" tab to "Objectives" for more accessible language
- Renamed "Criteria Weights" chart in Results to "Objective Weights"

### Maintenance
- Removed stale compiled `.js`/`.js.map` artifacts from `src/` that were shadowing `.tsx` sources and causing Vite to serve outdated code
- Version display in Changelog and About pages now derived dynamically from changelog data

## v0.2.4 (April 9, 2026)

### Documentation
- Added Quick Reference Guide PDF to the About page — click "Open PDF" to view in a new browser tab

## v0.2.3 (April 9, 2026)

### Cloud Storage
- AuthChip is now a single click target in both signed-in and signed-out states — the whole pill (avatar, name, divider, cloud icon) is one button
- Clicking the signed-in chip opens a lightweight account popover with the user's name, email, and a Sign Out button — no more navigating to the Settings tab to sign out
- Popover dismisses via Escape, outside click, or Cancel; Sign Out shows a "Signing out…" loading state and guards against re-entry

### Maintenance
- Removed stale compiled `.js`/`.jsx` artifacts from `src/` that were shadowing `.tsx` sources and causing Vite to serve stale code

## v0.2.2 (April 7, 2026)

### Cloud Storage
- Added explicit Terms of Service and Privacy Policy consent before cloud sign-in — first-time users (and users on an outdated ToS version) must check a box and click "Enable Cloud Storage" before any Firebase Auth popup is opened
- Consent is recorded both locally (fast path on subsequent sign-ins) and in Firestore at `users/{uid}` with the current ToS version
- Outdated consent versions force a sign-out and re-consent

## v0.2.1 (April 7, 2026)

### Fixed
- Cloud storage sign-in flow replaced with the standard pattern used by other SPERT Suite apps — sign-in buttons are now always visible when cloud storage is available, and the Local/Cloud radio only becomes active after signing in
- Removed the "radio-first" UX that caused a deadlock where clicking Cloud while signed out did nothing
- StorageContext reverted to the canonical single-mode shape from ARCHITECTURE.md §4.4

## v0.2.0 (April 7, 2026)

### Cloud Storage
- Optional Firebase-backed cloud storage — sign in with Google or Microsoft
- Global Settings modal (gear icon in header) for storage mode, sign-in, and export attribution
- Auth chip in header: split pill showing account status and quick access to settings
- Local → Cloud one-way migration with userId rewrite and provenance preservation
- Real-time sync across devices and tabs via Firestore onSnapshot
- Per-decision sharing (cloud mode, owner only) — add collaborators by email as editor or viewer
- Owner-controlled voting participation toggle for editors

### Architecture
- StorageAdapter interface converted to async — all methods return Promises
- Context-injected storage adapter (LocalStorageAdapter / FirestoreAdapter)
- AuthProvider + StorageProvider with storage-ready gate to prevent auth-loading race
- Monolithic Firestore document per decision (`spertahp_projects/{modelId}`)
- Lightweight fingerprinting: `_originRef` (workspace UUID) and `_changeLog` on ModelDoc
- Simplified CollaboratorRole: owner / editor / viewer

## v0.1.1 (April 5, 2026)

### Legal
- Updated Terms of Service and Privacy Policy to v04-05-2026
- Added SPERT® AHP to list of covered apps
- Updated effective date to April 5, 2026

## v0.1.0 (April 5, 2026)

### Features
- AHP decision-making framework with pairwise comparisons
- Four comparison tiers: Quick, Balanced, Thorough, Complete
- LLSM+RAS weight computation for incomplete matrices
- Principal eigenvector for complete matrices
- Consistency ratio with Harker Option A for incomplete matrices
- Suggest repair for inconsistent comparisons
- Global synthesis with weighted criteria and alternatives
- Sensitivity analysis with crossover detection

### Group Decision Support
- AIJ and AIP group aggregation methods
- Kendall's W concordance with tie-corrected average ranking
- Disagreement analytics (CV, nMAD, band classification)
- Cosine similarity pairwise agreement
- Synthesis confidence badge (RED/AMBER/GREEN)

### UX
- Tab-based navigation (Setup / Compare / Results / Settings)
- Drag-and-drop reordering for criteria and alternatives (@dnd-kit)
- Dual-color comparison sliders — blue fills toward left item, amber fills toward right item, with smooth animated transitions
- Context-aware slider labels ("more important" for criteria, "more preferred w.r.t. [criterion]" for alternatives)
- Disagreement threshold configuration (strict/standard/exploratory presets)
- Dark mode with three-state toggle (light/dark/system) — persisted in localStorage
- About page with AHP methodology, data security, licensing, and warranty sections
- Changelog page with categorized version history

### Legal
- GNU GPL v3.0 license with attribution preservation terms (Section 7(b))
- Terms of Service and Privacy Policy (linked to spertsuite.com)
- SPERT® Suite branding in footer

### Infrastructure
- LocalStorage-based persistence
- Firebase adapter stub (Phase 2 ready)
- TypeScript strict mode with noUncheckedIndexedAccess
- Tailwind CSS v4 with @tailwindcss/vite plugin
- Vite 6, React 18, Vitest test framework
- Deployed on Vercel
