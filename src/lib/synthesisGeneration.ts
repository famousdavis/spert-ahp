/**
 * Module-level generation counter for in-flight synthesis operations.
 * Bumped in performSignOutWithCleanup() as the first step, so any
 * runSynthesis in progress at sign-out time discards its result before
 * writing to a revoked session.
 *
 * NOT bumped on mode-switch or component unmount — those events do not
 * clear the store, so valid in-flight synthesis results should still apply.
 *
 * resetSynthesisGenerationForTests is exported for test isolation only.
 * Do not call it in production code.
 */
let _generation = 0;

export function getSynthesisGeneration(): number {
  return _generation;
}

export function bumpSynthesisGeneration(): void {
  _generation++;
}

/** Test-only: resets counter to 0 for isolation between tests. */
export function resetSynthesisGenerationForTests(): void {
  _generation = 0;
}
