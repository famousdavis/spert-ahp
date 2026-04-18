# SPERT® AHP — Changelog

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
