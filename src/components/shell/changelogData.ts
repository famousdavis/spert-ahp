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
