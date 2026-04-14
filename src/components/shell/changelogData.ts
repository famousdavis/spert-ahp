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
