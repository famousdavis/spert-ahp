# spert-ahp — Dependency Upgrade Plan v4
# App: spert-ahp v0.18.1 → v0.18.8 (7 PRs: A–G)
# Plan date: 2026-06-23
# Author: Claude Chat (planning); execution by Claude Code
# Saved to repo: 2026-06-23 (docs/upgrade-plan-v4.md) — persist-before-execute

---

## Revision history
**v1:** Initial plan. Blockers: audit gate broken (wrong stdin pattern, GHSA IDs instead of
package names, no error guard); PR B regen floats soaking versions to main.
**v2:** Fixed gate (canonical `node -e` pattern, package-name keys, error guard); added PR B
pre-regen pinning for four packages; added @protobufjs/utf8 to PR B scope; added AppFooter +
changelogData to every PR; override persistence stated in C–G; corrected grpc-js mechanism;
corrected recharts formatter site count.
**v3:** Recharts formatter fix corrected (`Number(v)` coercion at line 39; "run `tsc -b` first"
posture); PR B regen safety table extended to all 12 remaining caret deps (all verified safe);
react-is exact-pinned (18.3.1 in F, 19.2.5 in G); gitignore step added before baseline capture;
audit_gate gained JSON try/catch, baseline precondition, and no-arg regression runs on C/E; PR C
changelog corrected (pre-pins documented in PR B; PR C is version-tag only); overrides block in
every C–G snippet; grpc-js/protobufjs/utf8 mechanism corrected (regen clears, overrides persist);
react-is topology corrected; jsdom timing narrative clarified; health table severity rule stated;
visual smoke switched to `vite dev` (later reversed in v4).
**v4:**
- **PR B mechanism table:** corrected — protobufjs persistence override is `^7.6.3`, not
  `~1.9.16` (which is the `@grpc/grpc-js` override). Copy-paste error in v3's table.
- **PR B protobufjs verification:** reverted from hand-rolled semver comparison back to
  `require('semver').gte(pb,'7.6.3')`. `semver@6.3.1` is confirmed present in the tree.
- **PR C package.json snippet:** removed the destructive empty `"dependencies": {}` /
  `"devDependencies": {}` objects. Now shows only `"version"` and `"overrides"`.
- **Health table After-PR-D:** corrected Dashboard cell to 🟠.
- **PR F visual smoke:** reverted to `vite preview` (serves the built `dist/` bundle).
- **react-is 19.2.5:** confirmed published 2026-04-08 (75d, +15d past window).
- **PR F react-is topology:** added third copy — `prop-types/node_modules/react-is@16.13.1`.
- **useRef claim:** replaced with "exhaustive grep — zero bare no-arg `useRef()` calls in source."
- **Gitignore commit:** folded into PR A's commit.
- **TS6 `noUncheckedSideEffectImports`:** softened to "per TS6 release notes; `npm run build` is
  the authoritative verification."
- **PR G:** added note that test files are excluded from `tsc -b` type-checking.

**v4.1 (saved to repo + amended, 2026-06-23):** Persisted to `docs/upgrade-plan-v4.md` BEFORE any
execution (a prior session lost the plan to context overflow and reconstructed it mid-execution —
this avoids a repeat). All amendments below were verified against the live repo + npm registry on
2026-06-23:
- **Added "Ship-gate integration & deployment policy" section.** Per-PR deploy decision: deploy
  after A, B, F, G; **no deploy** for C, D, E. (C's tailwindcss/CSS output physically landed in PR
  B's lockfile regen, so C ships no new artifact; D is test-env only; E is dev-time only.) The
  squash-merge decision and `npx vercel --prod` are **operator actions, not automated.**
- **PR A/B/F/G:** added a **Deployment (operator)** subsection with the literal `npx vercel --prod`
  command + a production smoke. **PR C/D/E:** added an explicit **No deploy** note.
- **PR B:** added an **iCloud hydration check** (run `npm run build` once after install, before the
  formal gate). Corrected the `@protobufjs/utf8` mechanism: it clears because protobufjs 7.6.4
  *declares* `@protobufjs/utf8: ^1.1.1`, so forcing protobufjs ≥7.6.3 via the override **mandates**
  the patched utf8 — not a lucky regen float. utf8 stays **out** of the overrides block.
- **PR F:** replaced "open the app and verify" with a concrete **visual-smoke navigation path**
  grounded in `ResultsPanel.tsx` (no demo model exists — build one by hand; SensitivityChart needs
  a criterion click; VoterRadarChart needs ≥2 voters). Corrected the recharts soak prose: **3.9.0
  shipped 2026-06-23** (plan date), so 3.8.1 is no longer `latest` but remains the correct soaked
  target.
- **PR G:** added `@vitejs/plugin-react@4.7.0` note — peers only `vite: ^4.2||^5||^6||^7`, **no**
  React peer dependency, so it imposes no React-major constraint.
- **Audit-gate setup:** added a `git clean -fdx` warning + a baseline-recapture procedure. NOTE:
  there is **no `v0.18.1` git tag** (tagging stopped at v0.9.3) — recapture must check out the
  v0.18.1 **commit `0020cee`**, not a tag.
- **Verified:** recharts consuming surface is exactly **two** files — `PriorityChart.tsx` is a
  hand-rolled CSS bar chart (no recharts import), unaffected by PR F.

---

## Scope
**Starting version:** v0.18.1
**Ending version:** v0.18.8
**7 PRs (A–G):**

| PR | Focus | npm audit keys cleared |
|---|---|---|
| A | vite 7.3.5 CVE patch | `vite` |
| B | firebase 12.12.1 + npm overrides + lockfile regen | `protobufjs`, `@grpc/grpc-js`, `@protobufjs/utf8` |
| C | vitest/tailwindcss version-tag (versions landed in PR B) | — |
| D | jsdom 25 → 29 | `ws`, `form-data` |
| E | TypeScript 5.9 → 6.0 | — |
| F | recharts 2 → 3 | `lodash` |
| G | React 18 → 19 (4-package + react-is, atomic) | — |

**Not in this plan:** vite 8 + @vitejs/plugin-react 6.x (deferred), @dnd-kit bumps (all at
latest), @testing-library bumps (all at latest), esbuild LOW (chronic deferral — Windows
dev-server only), CI/Vercel Node changes, lint script, coverage provider.

---

## App context
**Stack:** Vite 7.3.2 / React 18.3.1 / TypeScript 5.9.3 / Vitest 4.1.4 / Firebase client SDK.
No firebase-admin, no native Node modules, no WebAuthn.
**Deployment:** static build to Vercel. Development on macOS.
**Repo:** `~/Documents/spert-ahp` (iCloud-synced — see environment notes).

**Gate sequence (every PR):** `npm run build && npm run test`
- `npm run build` = `tsc -b && vite build` — the ONLY step that type-checks app code.
  `tsconfig.json` excludes `src/**/__tests__/**`; vitest transpiles test files via esbuild and
  does not type-check them. Type regressions in test files are invisible to both gates.
- `npm run test` = `vitest run` — 30 files, jsdom environment, no coverage provider.
- No lint script. No standalone typecheck script. **No CI** (`.github/workflows` does not exist) —
  all gating is local; `gh pr merge` will not wait on checks because there are none.

**Install convention:** manually edit `package.json` to the exact target version, then
`npm install`. Never `npm install pkg@x` (writes a caret, defeating exact pinning).

**Version bump protocol (every PR — all four files required):**
1. `package.json` — `"version"` field
2. `CHANGELOG.md` — prepend entry with actual commit date
3. `src/components/shell/AppFooter.tsx` — hardcoded version string (currently `Version 0.18.1`, line 14)
4. `src/components/shell/changelogData.ts` — prepend entry (shape: `{ version, date, sections: [{ title, items: string[] }] }`)

---

## Ship-gate integration & deployment policy

**How this plan fits the standard ship-gate flow.** Each PR runs through the normal ship-gate
mechanics — branch from a freshly-synced `main`, version bump + changelog, stage specific files,
commit, push, open PR, squash-merge, then `git pull --ff-only` on main. The only deviation is the
**gate sequence**: this plan's per-PR `npm run build && npm run test && audit_gate` **replaces and
extends** the macro's standard `npm test` step (build and test are run explicitly, and `audit_gate`
is added after them). Everything else in the macro applies unchanged.

**Operator-controlled steps.** For this campaign the **squash-merge decision** and **`npx vercel
--prod`** are **operator actions, not automated.** An executing session takes each PR up to
*PR-open* (branch → changes → gates → commit → push → PR), then stops for the operator to merge
and (where the table below says so) deploy. Because each PR's branch is cut from a `main` that
already includes the prior merge, execution is necessarily **interleaved** with the operator's
merges — PR B cannot be cut until PR A is merged, etc.

**Deployment policy** (manual; `npx vercel --prod` from repo root → `ahp.spertsuite.com`):

| PR | Deploy? | Why |
|---|---|---|
| A — vite | **Deploy** | vite is the bundler; build output can change |
| B — firebase + regen | **Deploy** | firebase runtime SDK ships in the bundle; tailwindcss CSS output is (re)generated by this PR's lockfile regen |
| C — vitest/tailwind tag | **No deploy** | version-tag only; `npm install` yields minimal/no lockfile delta — no new artifacts (the tailwind/vitest versions physically landed in B) |
| D — jsdom | **No deploy** | test-environment only; `dist/` unchanged |
| E — typescript | **No deploy** | dev-time tool only; `dist/` unchanged |
| F — recharts | **Deploy** | recharts 3 runtime (redux-based internals, es-toolkit) ships in the bundle |
| G — react | **Deploy** | React runtime |

Each deploying PR carries a **Deployment (operator)** subsection with the command and a smoke;
C/D/E carry an explicit **No deploy** note.

---

## Audit gate setup (run once before cutting PR A branch)

```bash
# Step 1: Add the gitignore entry. This is folded into PR A's commit (not a
# direct-to-main commit — it goes on the chore/vite-7.3.5-v0.18.2 branch).
echo '/.audit-baseline.json' >> .gitignore

# Step 2: Capture the baseline from a clean tree at v0.18.1.
npm install                                        # ensure clean tree
npm audit --json 2>/dev/null > .audit-baseline.json
node -e '
  const d=require("./.audit-baseline.json");
  const keys=Object.keys(d.vulnerabilities||{}).sort();
  console.log(keys.length+" keys: "+keys.join(", "));
'
# Expected: 10 keys (VERIFIED from the live tree on 2026-06-23):
# @babel/core @grpc/grpc-js @protobufjs/utf8 esbuild form-data lodash postcss protobufjs vite ws
# Severities: critical 1, high 5, moderate 2, low 2.
#
# If the count or key set differs, rewrite the health trajectory table to match reality
# before proceeding. The gates are accurate only against the actual captured set.
```

```bash
# Step 3: Define audit_gate for this session.
# IMPORTANT: keys in npm audit --json vulnerabilities are PACKAGE NAMES, not GHSA ids.
audit_gate() {               # usage: audit_gate <PR-label> [expected-cleared-pkg-names…]
  local PR="$1"; shift
  npm audit --json 2>/dev/null > /tmp/audit-now.json || true
  AG_BASE="$PWD/.audit-baseline.json" AG_NOW=/tmp/audit-now.json \
  node -e '
    const fs=require("fs");
    // node -e: argv[0]=node binary, argv[1]=first real arg.
    // Correct destructure is [,prName,...expected]. Do NOT use [,,prName,...].
    const [,prName,...expected]=process.argv;
    let base,now;
    try { base=JSON.parse(fs.readFileSync(process.env.AG_BASE,"utf8")); }
    catch(e){ console.error("✗ baseline unreadable:",e.message); process.exit(1); }
    try { now=JSON.parse(fs.readFileSync(process.env.AG_NOW,"utf8")); }
    catch(e){ console.error("✗ current audit unreadable (network? run with sandbox disabled):",e.message); process.exit(1); }
    if(base.error||!base.vulnerabilities){ console.error("✗ baseline audit error or missing vulnerabilities"); process.exit(1); }
    if(now.error||!now.vulnerabilities){ console.error("✗ current audit error (network? run with sandbox disabled)"); process.exit(1); }
    const B=new Set(Object.keys(base.vulnerabilities));
    const N=new Set(Object.keys(now.vulnerabilities));
    // Precondition: every expected-cleared key must exist in the baseline.
    const notInBaseline=expected.filter(k=>!B.has(k));
    if(notInBaseline.length){ console.error("✗ expected-cleared keys not in baseline (typo?):",notInBaseline.join(", ")); process.exit(1); }
    const fresh=[...N].filter(k=>!B.has(k));
    if(fresh.length){ console.error("✗ NEW advisories introduced:",fresh.join(", ")); process.exit(1); }
    const still=expected.filter(k=>N.has(k));
    if(still.length){ console.error("✗ expected cleared but still present:",still.join(", ")); process.exit(1); }
    console.log("✓ audit gate "+prName+" — remaining:",[...N].join(", ")||"(none)");
  ' -- "$PR" "$@"
  local e=$?; rm -f /tmp/audit-now.json; return $e
}
```

**Audit gate notes:**
- Run `npm audit` with network access enabled (`dangerouslyDisableSandbox: true`).
- `esbuild` LOW will appear in every `remaining:` output — expected throughout (chronic deferral).
- PRs C and E run `audit_gate` with no expected-cleared args to catch any newly introduced advisory.
- If the registry discloses a new advisory against an already-installed package during execution,
  `audit_gate` will flag it as `fresh` on whatever PR runs next. This is correct (fail-closed).
  Determine whether the advisory affects this app; re-baselining is not required.

**Baseline durability (⟳ v4.1):**
- `.audit-baseline.json` is gitignored and untracked, so it **survives branch switches and
  `rm -rf node_modules`** — but **`git clean -fdx` will delete it.** Do NOT run `git clean -fdx`
  during the campaign (the iCloud "conflict copies" cleanup in Environment notes is the temptation —
  use the targeted `find ... -name "* 2.*"` check instead).
- If the baseline is lost, recapture **only from a clean v0.18.1 tree.** There is **no `v0.18.1`
  git tag** (tagging stopped at v0.9.3), so check out the v0.18.1 commit **`0020cee`** in a detached
  HEAD or separate worktree, `npm install`, `npm audit --json > .audit-baseline.json`, then return
  to your working branch. **Never recapture from a mid-campaign tree** — that bakes already-upgraded
  packages into the baseline and silently corrupts every subsequent gate. Cross-check any recapture
  against the verified plan-date set above (10 keys; crit 1 / high 5 / mod 2 / low 2).

---

## Health trajectory
**spert-devops dashboard view** (direct deps only; Dashboard column = worst-pending item):

| After | vite CVE | firebase | vitest/tailwind | jsdom | TS6 | recharts | React 19 | Dashboard |
|---|---|---|---|---|---|---|---|---|
| Start (v0.18.1) | 🔴 CVE | 🔴 CVE | 🟠 SoakEligible | 🟠 SoakEligible | 🟡 Eligible | 🟡 Eligible | 🟠 Intermediate | 🔴 |
| After PR A (v0.18.2) | ✅ | 🔴 | 🟠 | 🟠 | 🟡 | 🟡 | 🟠 | 🔴 |
| After PR B (v0.18.3) | ✅ | ✅ | ✅¹ | 🟠 | 🟡 | 🟡 | 🟠 | 🟠 |
| After PR C (v0.18.4) | ✅ | ✅ | ✅ | 🟠 | 🟡 | 🟡 | 🟠 | 🟠 |
| After PR D (v0.18.5) | ✅ | ✅ | ✅ | ✅ | 🟡 | 🟡 | 🟠 | 🟠 |
| After PR E (v0.18.6) | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | 🟠 | 🟠 |
| After PR F (v0.18.7) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟠 | 🟠 |
| After PR G (v0.18.8) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

¹ vitest/tailwindcss/@tailwindcss/vite pre-pinned to soaked targets in PR B's package.json edit;
their dashboard rows flip to Soak/OK after the PR B regen.

**npm audit transitive view** (advisory key counts):

| After | Critical | High | Moderate | Low | Notes |
|---|---|---|---|---|---|
| Start | 1 | 5 | 2 | 2 | 10 total (VERIFIED 2026-06-23) |
| After PR A | 1 | 4 | 2 | 2 | `vite` clears |
| After PR B | 0 | ≤3 | ≤1 | ≤1 | `protobufjs`, `@grpc/grpc-js`, `@protobufjs/utf8` clear; `postcss`/`@babel/core` may also self-clear via regen² |
| After PR C | 0 | ≤3 | ≤1 | ≤1 | no advisory change |
| After PR D | 0 | ≤1 | ≤1 | ≤1 | `ws`, `form-data` clear (jsdom 29 removes both deps) |
| After PR E | 0 | ≤1 | ≤1 | ≤1 | no advisory change |
| After PR F | 0 | 0 | ≤1 | ≤1 | `lodash` clears (recharts 3 removes lodash) |
| After PR G | 0 | 0 | ≤1 | ≤1 | `esbuild` LOW remains (chronic deferral) |

² `postcss` (moderate) and `@babel/core` (low) are caret-ranged transitives that the PR B regen
will likely float to their patched ceilings. Verify with `npm audit` after PR B. Not in PR B's
explicit expected-cleared list; if they persist, note them as low-priority deferred items.

**Post-plan dashboard suppressions** (data-only in spert-devops after PR G — no version bump):
- vite: suppress SoakEligible row (points at 8.0.x — deferred vite-8 major)
- @vitejs/plugin-react: suppress SoakEligible row (6.0.1 requires vite 8 — same deferral)

---

## Between-PR discipline
After every squash-merge:
```bash
git checkout main && git pull
```
Cut the next branch from updated main. All PRs touch `package.json` and `package-lock.json`.

**Soak targets are perishable. Re-derive from the live registry before cutting each branch:**
```bash
npm view <package> time --json | \
  node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); console.log(d['<version>']);"
```
Two targets are already known to have drifted since plan-writing — **re-derive both at branch-cut**:
- `recharts` `latest` is now **3.9.0** (published 2026-06-23). 3.8.1 remains the soaked target.
- `jsdom` `latest` is now **29.1.1**. See PR D for the target decision.

**Execution deadlines from plan date (2026-06-23):**

| Target | Expires when next-above clears | Runway |
|---|---|---|
| jsdom 29.1.0 | ~2026-06-29 (29.1.1 clears) | ~6 days |
| react/react-dom 19.2.5 | ~2026-07-05 (19.2.6 clears) | ~12 days |
| firebase 12.12.1 | ~2026-07-06 (12.13.0 clears) | ~13 days |
| tailwindcss/@tailwindcss/vite 4.2.4 | ~2026-07-07 (4.3.0 clears) | ~14 days |
| vitest 4.1.5 | ~2026-07-10 (4.1.6 clears) | ~17 days |
| @types/react 19.2.14 | ~2026-07-18 (19.2.15 clears) | ~25 days |
| react-is 19.2.5 | ~2026-07-05 (19.2.6 clears) | ~12 days |

Security value is front-loaded (A/B/D/F clear all CVEs); E and G are pure chores, so a late slip
costs no security posture. The tightest runways (jsdom at D, react at G) are both re-derived at
branch-cut, so a slip just bumps the target by a patch — not a risk.

---

## Environment notes (iCloud repo)
The repo lives under `~/Documents` (iCloud-synced). Known failure modes:
- **Native binary eviction:** iCloud can dehydrate `@esbuild/darwin-arm64`, `@rollup/rollup-darwin-arm64`,
  `@tailwindcss/oxide`. Symptom: "cannot find native binding" during `vite build` or `vite dev`.
  Fix: `rm -rf node_modules && npm install`. **This risk peaks at PR B's full regen — see PR B's
  iCloud hydration check.**
- **Conflict copies:** iCloud can create `Foo 2.tsx` duplicates in `src/`. Symptom: spurious TS2300
  errors. Check: `find . -name "* 2.*" -not -path "./node_modules/*" -not -path "./.git/*" -not -path "./dist/*"`.
  (Use this targeted check — NOT `git clean -fdx`, which would delete `.audit-baseline.json`.)
- **Stale Vite dep-optimization cache:** a stale `node_modules/.vite/` can cause `vite dev` to serve
  stale pre-bundled modules after a dependency change. Clear with `rm -rf node_modules/.vite` before
  running `vite dev`. (This cache does not affect `vite build` or `vite preview`.)

---

## PR A — vite CVE patch
**Branch:** `chore/vite-7.3.5-v0.18.2`
**Version bump:** 0.18.1 → 0.18.2
**audit_gate expected-cleared:** `vite`

### Why 7.3.5
The spert-devops assessment recommended `vite 7.3.2 → 8.0.16`, but that is the scanner
surfacing `latest`, not the minimal fix. GHSA-v6wh-96g9-6wx3 (NTLMv2 hash disclosure via
`launch-editor`) and GHSA-fx2h-pf6j-xcff (`server.fs.deny` bypass) both affect vite in
the 7.x line through 7.3.4. vite 7.3.4 was never published (the 7.3.x sequence is
7.3.0 → 7.3.1 → 7.3.2 → 7.3.3 → 7.3.5 — VERIFIED 2026-06-23); 7.3.5 is the first patched
7.x release. The v0.18.1 changelog describes these as affecting "7.0.0–7.3.3" — fully
consistent. Both vulnerabilities are Windows-only and dev-server-only; AHP develops on macOS
and deploys a static build.

vite 8 (Rolldown bundler) forces `@vitejs/plugin-react` to 6.x (peer: `^8.0.0` only —
incompatible with vite 7). That double-major is a separate approval-gated decision, deferred.

### Soak math
vite 7.3.5: CVE bypass — 60-day window does not apply. 7.3.5 is the ceiling of the 7.x
line; no expiry pressure.

### package.json changes
```json
{
  "version": "0.18.2",
  "devDependencies": {
    "vite": "7.3.5"
  }
}
```
(`"^7.3.2"` → exact `"7.3.5"`. `@vitejs/plugin-react` unchanged at `"^4.3.4"` → resolves 4.7.0.)

### Other file changes
**`.gitignore`** (before the `npm install` on this branch — included in the PR A commit):
```
/.audit-baseline.json
```
**AppFooter.tsx:** `Version 0.18.1` → `Version 0.18.2`
**changelogData.ts:** prepend:
```ts
{
  version: '0.18.2',
  date: '<actual-commit-date>',
  sections: [
    {
      title: 'Security',
      items: [
        'Upgrade vite 7.3.2 → 7.3.5 — clears GHSA-v6wh-96g9-6wx3 (NTLMv2 via launch-editor, Windows dev-server) and GHSA-fx2h-pf6j-xcff (server.fs.deny bypass, Windows only). vite 7.3.4 was never published; 7.3.5 is the first patched 7.x. vite 8 (Rolldown major) deferred.',
      ],
    },
  ],
},
```
**CHANGELOG.md:** prepend:
```markdown
## [0.18.2] - <actual-commit-date>
### Security
- Upgrade vite 7.3.2 → 7.3.5 (GHSA-v6wh-96g9-6wx3, GHSA-fx2h-pf6j-xcff — Windows dev-server only)
```

### Install
```bash
npm install   # within the ^7.3.2 range; no regen needed
```

### Gate sequence
```bash
npm run build
npm run test
audit_gate "PR-A" vite
```

### Deployment (operator)
After merge: `npx vercel --prod` from repo root. Production smoke: load `ahp.spertsuite.com`,
confirm the app boots (no white screen, no console errors), footer reads `Version 0.18.2`.

### Post-merge dashboard suppressions (data-only, in spert-devops)
- vite: suppress SoakEligible row (8.0.x requires Rolldown major approval — deferred)
- @vitejs/plugin-react: suppress SoakEligible row (6.0.1 requires vite 8 — same deferral)

---

## PR B — firebase CVE + transitive CVE cluster
**Branch:** `chore/firebase-12.12.1-v0.18.3`
**Version bump:** 0.18.2 → 0.18.3
**audit_gate expected-cleared:** `protobufjs` `@grpc/grpc-js` `@protobufjs/utf8`

> **PR B is the highest-risk step in the campaign and a hard dependency for PR C.** It bundles a
> firebase bump, a full lockfile regen, four pre-pins, and two new overrides — and it is where the
> iCloud native-binary eviction risk peaks. Treat the lockfile-verification script below as a hard
> stop on FAIL.

### What this PR clears

| Advisory | Severity | Dep path | Clearing mechanism | Override role |
|---|---|---|---|---|
| `protobufjs` | **critical** | firestore → @grpc/proto-loader → protobufjs | override `^7.6.3` forces 7.6.4 (ceiling); regen re-resolves the subtree | `"protobufjs": "^7.6.3"` persists the resolution through PRs C–G plain installs |
| `@grpc/grpc-js` | **high** | firestore → @grpc/grpc-js | override `~1.9.16` forces 1.9.16 (ceiling of 1.9.x; no 1.9.17 exists) | `"@grpc/grpc-js": "~1.9.16"` persists through PRs C–G |
| `@protobufjs/utf8` | **moderate** | protobufjs → @protobufjs/utf8 | **guaranteed by the protobufjs override**: protobufjs 7.6.4 declares `@protobufjs/utf8: ^1.1.1`, so forcing protobufjs ≥7.6.3 mandates the patched utf8 1.1.1 (VERIFIED 2026-06-23) | none — clears via the protobufjs dependency chain; **do NOT add utf8 to overrides** |

Both `@grpc/grpc-js` versions 4.13.0 and 4.14.0 of `@firebase/firestore` declare
`@grpc/grpc-js: ~1.9.0` — identical ranges. The firebase version change itself does not
drive the grpc-js resolution; the override + regen does. The overrides are load-bearing
for the subsequent plain-install PRs C–G.

### Regen float analysis — pre-pin all dangerous carets before regen
A full lockfile regen (`rm package-lock.json && rm -rf node_modules && npm install`) re-resolves
every caret-ranged dep to its current registry ceiling. Four packages have caret ranges that
would float to soaking (sub-60-day) versions:

| Package | Range | Soaking ceiling | Pre-pin to |
|---|---|---|---|
| vitest | `^4.1.4` | 4.1.9 (7d) | `4.1.5` |
| tailwindcss | `^4.2.2` | 4.3.1 (11d) | `4.2.4` |
| @tailwindcss/vite | `^4.2.2` | 4.3.1 (11d) | `4.2.4` |
| @types/react | `^18.3.12` | 18.3.31 (18d) | `18.3.28` (stays on 18 until PR G) |

**All other caret-ranged direct deps remaining after the PR B edits are verified safe** —
their current registry ceiling equals or is at their installed version:

| Package | Range | Ceiling = installed | Basis |
|---|---|---|---|
| @dnd-kit/core | `^6.3.1` | 6.3.1 ✓ | at npm latest |
| @dnd-kit/sortable | `^10.0.0` | 10.0.0 ✓ | at npm latest |
| @dnd-kit/utilities | `^3.2.2` | 3.2.2 ✓ | at npm latest |
| @testing-library/jest-dom | `^6.6.3` | 6.9.1 ✓ | at npm latest |
| @testing-library/react | `^16.1.0` | 16.3.2 ✓ | at npm latest |
| @types/react-dom | `^18.3.7` | 18.3.7 ✓ | at ceiling of 18.3.x (VERIFIED 2026-06-23) |
| @vitejs/plugin-react | `^4.3.4` | 4.7.0 ✓ | no 4.8.x exists |
| react | `^18.3.1` | 18.3.1 ✓ | no newer 18.x |
| react-dom | `^18.3.1` | 18.3.1 ✓ | no newer 18.x |
| recharts | `^2.15.0` | 2.15.4 ✓ | at ceiling of 2.15.x (368d) |
| jsdom | `^25.0.1` | 25.0.1 ✓ | only two 25.x versions exist |
| typescript | `^5.9.3` | 5.9.3 ✓ | no 5.9.4+ exists |

**Before cutting the PR B branch**, re-confirm the five "at npm latest" entries (the @dnd-kit
trio and @testing-library pair) against the live registry, since the regen is irreversible:
```bash
for pkg in @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities @testing-library/jest-dom @testing-library/react; do
  echo "$pkg latest: $(npm view $pkg dist-tags.latest)"
done
```
If any has a version above the installed lock, pin it to the locked version before the regen.

### package.json changes (apply all in one edit before regen)
```json
{
  "version": "0.18.3",
  "dependencies": {
    "firebase": "12.12.1"
  },
  "devDependencies": {
    "@types/react": "18.3.28",
    "@tailwindcss/vite": "4.2.4",
    "tailwindcss": "4.2.4",
    "vitest": "4.1.5"
  },
  "overrides": {
    "protobufjs": "^7.6.3",
    "@grpc/grpc-js": "~1.9.16"
  }
}
```
(firebase: `"^12.11.0"` → exact. Four pre-pins: caret → exact. overrides: new block.
`@protobufjs/utf8` is intentionally NOT overridden — it clears via the protobufjs chain.)

### Install (lockfile regen required)
```bash
rm package-lock.json
rm -rf node_modules
npm install
```
Expect incidental transitive patch bumps in the regenerated lockfile — acceptable (don't pin
transitives you don't own). `postcss` and `@babel/core` may also self-clear via this regen;
verify with `npm audit` after install.

### iCloud hydration check (⟳ v4.1 — run BEFORE the formal gate)
The `rm -rf node_modules` regen above is the campaign's peak iCloud native-binary eviction
moment. Immediately after `npm install` completes, run `npm run build` ONCE before the formal
gate sequence:
```bash
npm run build   # hydration probe
```
If it fails with "cannot find native binding" (esbuild / rollup / @tailwindcss/oxide), that is
iCloud dehydration — NOT a real failure. Recover and retry:
```bash
rm -rf node_modules && npm install && npm run build
```
Only once a clean build succeeds, proceed to the lockfile verification and the formal gate.

### Lockfile verification (FAIL here is a hard stop)
```bash
node -e "
const semver=require('semver');
const l=require('./package-lock.json');
const checks={
  firebase:'12.12.1',
  '@firebase/firestore':'4.14.0',
  '@grpc/grpc-js':'1.9.16',
  '@protobufjs/utf8':'1.1.1',
  vitest:'4.1.5',
  tailwindcss:'4.2.4',
  '@tailwindcss/vite':'4.2.4',
  '@types/react':'18.3.28',
};
let pass=true;
Object.entries(checks).forEach(([k,v])=>{
  const got=l.packages['node_modules/'+k]?.version;
  if(got===v) console.log('ok',k,got);
  else { console.error('FAIL',k,'got',got,'expected',v); pass=false; }
});
const pb=l.packages['node_modules/protobufjs']?.version;
if(semver.gte(pb,'7.6.3')) console.log('ok protobufjs',pb,'(>=7.6.3)');
else { console.error('FAIL protobufjs',pb,'expected >=7.6.3'); pass=false; }
process.exit(pass?0:1);
"
```

### Gate sequence
```bash
npm run build
npm run test
audit_gate "PR-B" protobufjs @grpc/grpc-js @protobufjs/utf8
```
After the gate, note the remaining advisory keys (should be `ws form-data lodash esbuild` plus
possibly `postcss @babel/core` if they did not self-clear). This is your reference for PRs C–D.

### Other file changes
**AppFooter.tsx:** `Version 0.18.2` → `Version 0.18.3`
**changelogData.ts:** prepend:
```ts
{
  version: '0.18.3',
  date: '<actual-commit-date>',
  sections: [
    {
      title: 'Security',
      items: [
        'Upgrade firebase 12.11.0 → 12.12.1 (CVE-motivated; advances @firebase/firestore 4.13.0 → 4.14.0)',
        'Add npm overrides (protobufjs ≥7.6.3, @grpc/grpc-js ~1.9.16) + lockfile regen — clears critical protobufjs, high @grpc/grpc-js, and moderate @protobufjs/utf8 from the firebase subtree',
      ],
    },
    {
      title: 'Chores',
      items: [
        'Pre-pin vitest 4.1.4 → 4.1.5, tailwindcss 4.2.2 → 4.2.4, @tailwindcss/vite 4.2.2 → 4.2.4 (versions tagged in v0.18.4)',
        'Pre-pin @types/react to exact 18.3.28 (ceiling-pin ahead of lockfile regen)',
      ],
    },
  ],
},
```
**CHANGELOG.md:** prepend:
```markdown
## [0.18.3] - <actual-commit-date>
### Security
- Upgrade firebase 12.11.0 → 12.12.1 (CVE-motivated; clears protobufjs critical,
  @grpc/grpc-js high, @protobufjs/utf8 moderate via regen + npm overrides)
- Add npm overrides: protobufjs ≥7.6.3, @grpc/grpc-js ~1.9.16
### Chores
- Pre-pin vitest → 4.1.5, tailwindcss/@tailwindcss/vite → 4.2.4 (tagged in v0.18.4)
- Pre-pin @types/react → 18.3.28 (ceiling-pin ahead of regen)
```

### Deployment (operator)
After merge: `npx vercel --prod`. **Highest-value deploy smoke of the campaign** — it exercises
the firebase 12.12.1 runtime: load prod, sign in (Firebase auth path), open a cloud-stored model
and confirm it loads/saves, footer reads `Version 0.18.3`. Watch the console for Firestore/auth
errors.

### Soak math
firebase 12.12.1: 63d, +3d past window (CVE-motivated; bypass applies either way).
Next above: 12.13.0 (47d). Expires: ~**2026-07-06** (~13d runway). Re-derive if not executed by then.

---

## PR C — vitest + tailwindcss version-tag
**Branch:** `chore/vitest-tailwind-v0.18.4`
**Version bump:** 0.18.3 → 0.18.4

The dependency version changes (vitest 4.1.4→4.1.5, tailwindcss 4.2.2→4.2.4,
@tailwindcss/vite 4.2.2→4.2.4) were committed in PR B's package.json edit as mandatory
pre-pins ahead of the regen. PR C is the canonical attribution tag — it runs the gates
and provides the release version for these changes.

### package.json changes
```json
{
  "version": "0.18.4",
  "overrides": {
    "protobufjs": "^7.6.3",
    "@grpc/grpc-js": "~1.9.16"
  }
}
```
(Only `"version"` changes. Dependency versions are already at 4.1.5/4.2.4/4.2.4 from PR B.
The overrides block is shown in full — keep it unchanged.)

### Install
```bash
npm install   # confirms pre-pinned versions; minimal lockfile delta expected
```

### Other file changes
**AppFooter.tsx:** `Version 0.18.3` → `Version 0.18.4`
**changelogData.ts:** prepend:
```ts
{
  version: '0.18.4',
  date: '<actual-commit-date>',
  sections: [
    {
      title: 'Chores',
      items: [
        'Version tag: vitest 4.1.4 → 4.1.5, tailwindcss 4.2.2 → 4.2.4, @tailwindcss/vite 4.2.2 → 4.2.4 (versions pre-landed in v0.18.3 lockfile regen)',
      ],
    },
  ],
},
```
**CHANGELOG.md:** prepend:
```markdown
## [0.18.4] - <actual-commit-date>
### Chores
- Version tag: vitest 4.1.4 → 4.1.5, tailwindcss 4.2.2 → 4.2.4, @tailwindcss/vite 4.2.2 → 4.2.4
  (versions pre-landed in v0.18.3 regen; this is the canonical attribution tag)
```

### Gate sequence
```bash
npm run build
npm run test
audit_gate "PR-C"   # no expected-cleared args — runs the new-advisory regression check
```

### Deployment
**No deploy.** Version-tag only. The vitest/tailwind versions physically landed in PR B's lockfile
regen, so `npm install` here yields a minimal-or-empty lockfile delta and ships no new artifact.

### Soak math
vitest 4.1.5: 63d, +3d. Next above: 4.1.6 (43d). Expires: ~**2026-07-10** (17d).
tailwindcss 4.2.4: 63d, +3d. Next above: 4.3.0 (46d). Expires: ~**2026-07-07** (14d).
@tailwindcss/vite 4.2.4: same as tailwindcss.

---

## PR D — jsdom 25 → 29 (major; clears ws + form-data CVEs)
**Branch:** `chore/jsdom-29.1.0-v0.18.5`
**Version bump:** 0.18.4 → 0.18.5
**audit_gate expected-cleared:** `ws` `form-data`

### Why jsdom 29 clears ws and form-data
jsdom 25.0.1 depends on `ws ^8.18.0` and `form-data ^4.0.0`. jsdom 29.1.0 removes both
entirely (replacing them with `undici`). The two HIGH advisories clear as a side-effect —
no overrides needed for them.

### Target: jsdom 29.1.0 — RE-DERIVE AT BRANCH-CUT
jsdom 29.1.0 was published 2026-04-27. The operator approved targeting 29.1.0 directly. As of
2026-06-23, **`jsdom` `latest` is already 29.1.1** (published 2026-04-30). The execution deadline
is when 29.1.1 completes its soak at ~**2026-06-29** (~6 days from plan date). **Re-derive at
branch-cut:** if 29.1.1 has cleared its 60-day soak by execution time, target **29.1.1** instead
(update the branch name, version checks, and changelog accordingly). Either is a single-patch
difference; both remove ws + form-data.

`^25.0.1` cannot cross the major boundary into 29.x, so `npm install` fully re-resolves
jsdom's dependency subtree from scratch.

### package.json changes
```json
{
  "version": "0.18.5",
  "devDependencies": {
    "jsdom": "29.1.0"
  },
  "overrides": {
    "protobufjs": "^7.6.3",
    "@grpc/grpc-js": "~1.9.16"
  }
}
```
(`"^25.0.1"` → exact `"29.1.0"` — or `29.1.1` if re-derived. Keep overrides block.)

### Install
```bash
npm install   # jsdom subtree fully re-resolved across the major boundary
```

### Lockfile verification
```bash
node -e "
const l=require('./package-lock.json');
console.log('ws:', l.packages['node_modules/ws']?.version ?? 'GONE ✓');
console.log('form-data:', l.packages['node_modules/form-data']?.version ?? 'GONE ✓');
console.log('jsdom:', l.packages['node_modules/jsdom']?.version);
console.log('protobufjs:', l.packages['node_modules/protobufjs']?.version, '(must be >=7.6.3)');
console.log('@grpc/grpc-js:', l.packages['node_modules/@grpc/grpc-js']?.version, '(must be 1.9.16)');
"
# ws/form-data lines are indicative; audit_gate is the authoritative check.
```

### Gate sequence
```bash
npm run build
npm run test    # 30 files under jsdom — primary DOM regression gate
audit_gate "PR-D" ws form-data
```

### Deployment
**No deploy.** jsdom is the test environment only; the production `dist/` bundle is unchanged.

### Other file changes
**AppFooter.tsx:** `Version 0.18.4` → `Version 0.18.5`
**changelogData.ts:** prepend:
```ts
{
  version: '0.18.5',
  date: '<actual-commit-date>',
  sections: [
    {
      title: 'Security',
      items: [
        'Upgrade jsdom 25.0.1 → 29.1.0 — clears ws HIGH and form-data HIGH (jsdom 29 removes both, replacing with undici)',
      ],
    },
    {
      title: 'Chores',
      items: [
        'jsdom major upgrade: 25 → 29 (test environment only)',
      ],
    },
  ],
},
```
**CHANGELOG.md:** prepend:
```markdown
## [0.18.5] - <actual-commit-date>
### Security
- Upgrade jsdom 25.0.1 → 29.1.0 (clears ws HIGH + form-data HIGH; jsdom 29 removes both)
### Chores
- jsdom major upgrade: 25 → 29 (test environment only)
```

---

## PR E — TypeScript 5.9 → 6.0 (major, approved)
**Branch:** `chore/typescript-6.0.3-v0.18.6`
**Version bump:** 0.18.5 → 0.18.6

### Why TS6 is low-risk for this app
TypeScript 6.0.3 is `latest` (published 2026-04-16; VERIFIED 2026-06-23). TypeScript 6.0 is
believed (per TS6 release notes) to default `noUncheckedSideEffectImports` to `true`. The app has
one side-effect import: `import './index.css'` in `src/main.tsx`. This is covered by
`src/vite-env.d.ts` → `/// <reference types="vite/client" />` → `node_modules/vite/client.d.ts`
which declares `declare module '*.css' {}`. **No `css.d.ts` needed.** `npm run build` is the
authoritative verification — if the flag did not default to true, PR E simply builds cleanly.

All other TS6 default changes are neutralized by existing tsconfig settings: `target: ES2022`,
`module: ESNext`, `moduleResolution: bundler`, `strict: true`, `esModuleInterop: true`,
`types: ["vitest/globals"]`. No `ignoreDeprecations` shim needed. (TS 7.0 is in RC — explicitly
deferred; this PR targets the 6.0.3 stable.)

**Note on test file coverage:** `tsconfig.json` excludes `src/**/__tests__/**`. Test files are
esbuild-transpiled by vitest at runtime and are not type-checked by `tsc -b`. A TS6 type
regression in a test file is invisible to both `npm run build` and `npm run test`.

### Soak math
typescript 6.0.3: 68d, +8d. Current `latest`. No expiry pressure.

### package.json changes
```json
{
  "version": "0.18.6",
  "devDependencies": {
    "typescript": "6.0.3"
  },
  "overrides": {
    "protobufjs": "^7.6.3",
    "@grpc/grpc-js": "~1.9.16"
  }
}
```
(`"^5.9.3"` → exact `"6.0.3"`. Keep overrides block.)

### Install
```bash
npm install
```

### Gate sequence
```bash
npm run build   # tsc -b — the only gate for TS6 regressions in app code
npm run test
audit_gate "PR-E"   # no expected-cleared — new-advisory regression check
```

### Deployment
**No deploy.** TypeScript is a dev-time/build-time tool; it emits no runtime change here and
`dist/` is unchanged.

### Other file changes
**AppFooter.tsx:** `Version 0.18.5` → `Version 0.18.6`
**changelogData.ts:** prepend:
```ts
{
  version: '0.18.6',
  date: '<actual-commit-date>',
  sections: [
    {
      title: 'Chores',
      items: [
        'Upgrade TypeScript 5.9.3 → 6.0.3 (major). Single side-effect import (index.css) covered by vite/client ambient types.',
      ],
    },
  ],
},
```
**CHANGELOG.md:** prepend:
```markdown
## [0.18.6] - <actual-commit-date>
### Chores
- Upgrade TypeScript 5.9.3 → 6.0.3 (major)
```

---

## PR F — recharts 2 → 3 (major, approved; clears lodash CVE)
**Branch:** `chore/recharts-3.8.1-v0.18.7`
**Version bump:** 0.18.6 → 0.18.7
**audit_gate expected-cleared:** `lodash`

### recharts 2→3 migration notes
recharts 3.8.1 drops lodash/react-smooth/recharts-scale and adds @reduxjs/toolkit /
react-redux / reselect / immer / es-toolkit internally. The app's recharts consuming surface is
exactly **two** files — `SensitivityChart.tsx` and `VoterRadarChart.tsx` (VERIFIED 2026-06-23 via
`grep -rln "from 'recharts'"`). `PriorityChart.tsx` is a hand-rolled CSS bar chart with **no**
recharts import — unaffected by this PR. Both recharts files use only stable public props — none of
the removed v3 APIs are in use. recharts 3 does not require a Redux `<Provider>` wrapper.

### Formatter callbacks in SensitivityChart.tsx
**Run `npm run build` first and fix only lines that actually error.** Do not blanket-edit.
Line numbers VERIFIED 2026-06-23. Expected behavior per recharts 3 types:
- **Lines 34, 37** (XAxis/YAxis `tickFormatter`): typed as `any` in recharts 3 — existing
  `(v: number) => string` annotation is bivariant-assignable and likely compiles unchanged.
- **Line 40** (Tooltip `labelFormatter`): typed as `any` or a label-specific type — likely
  compiles unchanged.
- **Line 39** (Tooltip `formatter`): recharts 3 types the value as
  `ValueType = number | string | (number | string)[]`. The existing `(v: number) =>` annotation
  with body `(v * 100)` will likely error. The correct fix is to coerce in the body:
  ```tsx
  formatter={(v) => `${(Number(v) * 100).toFixed(1)}%`}
  ```
  Do **not** use bare `(v) =>` with the original `v * 100` body (the union makes `v * 100`
  a type error). Do not use an explicit annotation listing the full union (body still fails
  on non-number members). `Number(v)` is the safe coercion.

### react-is peer dependency
recharts 3 makes `react-is` a **required peer** (VERIFIED 2026-06-23: recharts@3.8.1
`peerDependencies` lists `react-is: ^16.8||^17||^18||^19`; it is NOT a regular dependency). Add it
as a direct dep at exact version `18.3.1` to match the React 18 runtime and pin the resolution
deterministically (npm 7+ would otherwise auto-install an arbitrary react-is to satisfy the peer).

**react-is topology in the current tree (three copies — VERIFIED 2026-06-23):**
- `node_modules/react-is@17.0.2` — top-level, satisfies `pretty-format@27.5.1 → ^17.0.1`
- `node_modules/recharts/node_modules/react-is@18.3.1` — nested under recharts 2
- `node_modules/prop-types/node_modules/react-is@16.13.1` — nested under prop-types

**After installing `react-is@18.3.1` as a direct dep:**
- `node_modules/react-is@18.3.1` — top-level (promoted by the new direct dep; satisfies
  recharts 3's peer)
- `node_modules/pretty-format/node_modules/react-is@17.0.2` — demoted to nested
- `node_modules/prop-types/node_modules/react-is@16.13.1` — unchanged
All three copies persisting after install is expected — do not treat any of them as a failure.

### Soak math (⟳ v4.1 corrected)
recharts 3.8.1: published 2026-03-25 (90d, +30d). **3.8.1 is the soaked intermediate target.**
recharts `latest` is now **3.9.0** (published 2026-06-23 — the same afternoon as the plan date),
so 3.8.1 is no longer `latest`, but 3.9.0 is 0 days old and not yet soaked. 3.8.1 remains correct;
3.9.0 soaks ~**2026-08-22**. Re-derive at branch-cut.
react-is 18.3.1: 787d. No expiry.

### package.json changes
```json
{
  "version": "0.18.7",
  "dependencies": {
    "recharts": "3.8.1",
    "react-is": "18.3.1"
  },
  "overrides": {
    "protobufjs": "^7.6.3",
    "@grpc/grpc-js": "~1.9.16"
  }
}
```
(recharts: `"^2.15.0"` → exact. react-is: new direct dep, exact pin. Keep overrides.)

### Install
```bash
npm install
```

### Lockfile verification
```bash
node -e "
const l=require('./package-lock.json');
const topRI=l.packages['node_modules/react-is']?.version;
console.log('react-is (top-level):', topRI, topRI==='18.3.1'?'✓':'FAIL');
const nested=l.packages['node_modules/pretty-format/node_modules/react-is']?.version;
if(nested) console.log('react-is (nested under pretty-format):', nested, '(expected)');
const pp=l.packages['node_modules/prop-types/node_modules/react-is']?.version;
if(pp) console.log('react-is (nested under prop-types):', pp, '(expected)');
console.log('protobufjs:', l.packages['node_modules/protobufjs']?.version, '(must be >=7.6.3)');
console.log('@grpc/grpc-js:', l.packages['node_modules/@grpc/grpc-js']?.version, '(must be 1.9.16)');
"
```

### Gate sequence
```bash
npm run build   # catches recharts 3 type breaks — run first, fix only what actually errors
npm run test
audit_gate "PR-F" lodash
```

### Visual smoke (mandatory) — navigation path (⟳ v4.1)
recharts 3 rewrote its rendering internals and the test suite has **zero** chart-rendering
assertions, so this smoke is the ONLY runtime verification. `npm run build` already ran in the
gate; serve the built bundle:
```bash
npx vite preview
```
**There is no built-in demo/sample model** (verified 2026-06-23) — you must build one by hand.
Both recharts charts live in `src/components/results/ResultsPanel.tsx`, reached via the **Results
tab**. (The "Global Priority Scores" / "Factor Weights" bars on that tab are `PriorityChart` — CSS,
not recharts — and are NOT part of this smoke.)

1. **SensitivityChart** (recharts `LineChart`): build a model with **≥2 criteria and ≥2
   alternatives** (use ≥3 alternatives to make a ranking crossover likely). Complete all pairwise
   comparisons. Results tab → **Run Synthesis**. Under the **"Sensitivity Analysis"** heading,
   **click a criterion button** — the chart is hidden until a criterion is selected (`sweep` is
   `null` until `activeCriterion` is set). Verify the line chart renders. Cycle through criteria to
   find one whose weight sweep flips the ranking, confirming the red `ReferenceDot` **crossover
   markers** draw.
2. **VoterRadarChart** ("Voter Priority Comparison", recharts `RadarChart`): renders only when
   `Object.keys(individualPriorities).length >= 2` — i.e. a **multi-voter** model with ≥2 voters who
   each completed comparisons and were included in synthesis. Set up a 2-voter model (cloud sharing
   with a second voting collaborator, or whatever multi-voter path the environment supports), run
   synthesis, and confirm the radar renders with all axes and fill regions. **If a 2-voter setup is
   impractical for the smoke, verify SensitivityChart cleanly and explicitly note that the radar was
   not exercised** — do not silently skip it.

### Other file changes
**AppFooter.tsx:** `Version 0.18.6` → `Version 0.18.7`
**changelogData.ts:** prepend (finalize the formatter item to the actual outcome at commit — either
remove it if no coercion was needed, or state it definitively):
```ts
{
  version: '0.18.7',
  date: '<actual-commit-date>',
  sections: [
    {
      title: 'Security',
      items: [
        'Upgrade recharts 2.15.4 → 3.8.1 — clears lodash HIGH advisory (recharts 3 removes lodash)',
      ],
    },
    {
      title: 'Chores',
      items: [
        'recharts major upgrade: 2 → 3 (drops lodash/react-smooth; adds redux-toolkit-based state, es-toolkit)',
        'Add react-is 18.3.1 as direct dependency (recharts 3 peer requirement)',
        // Include the next line only if tsc -b required the Number(v) fix at line 39:
        // 'Coerce Tooltip formatter value via Number(v) in SensitivityChart.tsx for recharts 3 type compatibility',
      ],
    },
  ],
},
```
**CHANGELOG.md:** prepend:
```markdown
## [0.18.7] - <actual-commit-date>
### Security
- Upgrade recharts 2.15.4 → 3.8.1 (clears lodash HIGH advisory)
### Chores
- recharts major upgrade: 2 → 3
- Add react-is 18.3.1 as direct dep (recharts 3 peer requirement)
```

### Deployment (operator)
After merge: `npx vercel --prod`. Smoke on prod: open a completed model's Results tab and repeat
the SensitivityChart + VoterRadarChart checks above against the live bundle; footer reads
`Version 0.18.7`.

---

## PR G — React 18 → 19 cluster (5 packages, atomic, approved)
**Branch:** `chore/react-19.2.5-v0.18.8`
**Version bump:** 0.18.7 → 0.18.8

**Packages (all move in one PR):**
- react 18.3.1 → 19.2.5
- react-dom 18.3.1 → 19.2.5
- @types/react 18.3.28 → 19.2.14 (was pre-pinned to 18.3.28 in PR B; now moves to 19)
- @types/react-dom 18.3.7 → 19.2.3
- react-is 18.3.1 → 19.2.5 (exact; tracks the React major; published 2026-04-08, 75d, +15d past window)

### Why all five move together
`@types/react 19` describes the v19 API surface. Running v19 types against a v18 runtime
produces type/runtime mismatches. All four react packages must be atomic. react-is 19.2.5
tracks the React major for recharts 3's peer spec consistency.

### React 19 migration notes for this app
`src/main.tsx` already uses `ReactDOM.createRoot(...).render(...)` — the v19-correct API. No
`ReactDOM.render`, `findDOMNode`, legacy string refs, or `React.FC` with implicit children.

**useRef:** @types/react 19 removes the zero-argument `useRef()` overload. An exhaustive grep
across `src/` finds zero bare no-arg `useRef()` or `useRef<T>()` calls — every call site passes
an initializer (VERIFIED 2026-06-23, ~22 sites). No action required at any site.

**@vitejs/plugin-react (⟳ v4.1):** held at `^4.3.4` (resolves to 4.7.0). VERIFIED 2026-06-23 —
`@vitejs/plugin-react@4.7.0` declares only `vite: ^4.2||^5||^6||^7` as a peer and has **no React
peer dependency**, so it imposes no constraint on the React major. No change needed for React 19.

The migration surface is primarily type-level, caught by `npm run build`. The most likely
residual: JSX namespace or `ReactNode` differences under `@types/react 19`.

**Note on test file coverage:** as in PR E, `tsc -b` does not type-check test files
(`src/**/__tests__/**` is excluded from `tsconfig.json`). A React 19 type regression in a test
file — where `@types/react` changes are most likely to surface in JSX-heavy render tests — will not
be caught by either gate.

### Soak math
react/react-dom 19.2.5: 76d, +16d. **Next above: 19.2.6 (48d). Expires: ~2026-07-05 (~12d —
tightest in this plan).** Execute before ~Jul 5 or re-derive.
react-is 19.2.5: 75d, +15d. Published 2026-04-08 (same release day as react 19.2.5). Same
expiry trajectory.
@types/react 19.2.14: 132d, +72d. Next above: 19.2.15 (35d). Expires: ~2026-07-18 (25d).
@types/react-dom 19.2.3: 223d. Current `latest`. No expiry.

### package.json changes
```json
{
  "version": "0.18.8",
  "dependencies": {
    "react": "19.2.5",
    "react-dom": "19.2.5",
    "react-is": "19.2.5"
  },
  "devDependencies": {
    "@types/react": "19.2.14",
    "@types/react-dom": "19.2.3"
  },
  "overrides": {
    "protobufjs": "^7.6.3",
    "@grpc/grpc-js": "~1.9.16"
  }
}
```
(react/react-dom: `"^18.3.1"` → exact. react-is: `"18.3.1"` → exact `"19.2.5"`.
@types/react: `"18.3.28"` → exact. @types/react-dom: `"^18.3.7"` → exact. Keep overrides.)

### Install
```bash
npm install
```

### Lockfile verification
```bash
node -e "
const l=require('./package-lock.json');
const checks={
  react:'19.2.5','react-dom':'19.2.5','react-is':'19.2.5',
  '@types/react':'19.2.14','@types/react-dom':'19.2.3',
};
let pass=true;
Object.entries(checks).forEach(([k,v])=>{
  const got=l.packages['node_modules/'+k]?.version;
  if(got===v) console.log('ok',k,got);
  else { console.error('FAIL',k,'got',got,'expected',v); pass=false; }
});
console.log('protobufjs:', l.packages['node_modules/protobufjs']?.version, '(must be >=7.6.3)');
console.log('@grpc/grpc-js:', l.packages['node_modules/@grpc/grpc-js']?.version, '(must be 1.9.16)');
process.exit(pass?0:1);
"
```

### Gate sequence
```bash
npm run build   # tsc -b — catches React 19 type incompatibilities in app code
npm run test    # @testing-library/react 16.3.2 already peers ^18||^19 — no change needed
audit_gate "PR-G"   # no expected-cleared; verify remaining set is only esbuild (+ any uncleared postcss/@babel)
```

### Deployment (operator)
After merge: `npx vercel --prod`. Smoke on prod: exercise the main flow (create/open a model, run
synthesis, view Results), confirm no React-19 runtime errors in the console, footer reads
`Version 0.18.8`.

### Other file changes
**AppFooter.tsx:** `Version 0.18.7` → `Version 0.18.8`
**changelogData.ts:** prepend:
```ts
{
  version: '0.18.8',
  date: '<actual-commit-date>',
  sections: [
    {
      title: 'Chores',
      items: [
        'Upgrade React 18.3.1 → 19.2.5 — react, react-dom, react-is, @types/react, @types/react-dom (atomic major upgrade). App already uses createRoot API; zero legacy call sites.',
      ],
    },
  ],
},
```
**CHANGELOG.md:** prepend:
```markdown
## [0.18.8] - <actual-commit-date>
### Chores
- Upgrade React 18.3.1 → 19.2.5 (react, react-dom, react-is, @types/react, @types/react-dom — atomic)
```
