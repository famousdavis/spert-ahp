# SPERT® AHP — Changelog

## v0.1.0 (March 19, 2026)

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
