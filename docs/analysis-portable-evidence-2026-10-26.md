# Analysis and portable persistence repair evidence

Date: 2026-10-26. Baseline: `7c547a625561a3717953c626bdee862bd39aeaa4`.
Repair: working-tree diff in `src/ui/app.js`, Review/Outline accessibility attributes in
`src/ui/shell.html`, and `tests/analysis-portable.test.js`.
Environment: macOS host, Node.js v26.8.1; Node VM bridge and DOM fixture.
All storage fixtures contain synthetic articles held in a test-owned Map.

## R2: recoverable analysis failures

State: **Locally verified** for the listed VM regression boundaries;
**Blocked** for actual installed native keyboard/screen-reader/Undo and platform acceptance.

Reproduction command: `node --test tests/analysis-portable.test.js` before the repair.
The baseline failed the current worker-error, main analysis exception and structure
exception assertions. Worker `ok:false` retained stale Review content; the main
exception silently returned; the structure exception escaped without feature-owned
failure presentation. Evidence: [baseline output](evidence/2026-10-26/r2-r7-before.txt).

The repaired UI has one current-revision failure state. It clears findings, annotations,
Outline navigation/section lengths and score/detail displays, clears busy indicators,
and keeps persistent feature-named messages in Review and Outline. Saved writing,
export and textarea identity are independent. A failure is terminal for that revision,
including late success/timeout fallback; a new edit permits recovery. Worker runtime
failure falls back through the existing main-thread analysis boundary. Stale worker
successes, errors and runtime failure do not replace newer state.

Coverage includes worker result failure, worker runtime fallback success/failure,
main analysis exception, structure exception, old error/new success ordering,
late success after failure, next-edit recovery, save and Markdown export, editor
focus/selection/scroll retention and removed Outline control focus restoration.
The errors are injected into the existing Worker/BluntedEngine boundaries in the VM;
there is no production-only test hook. DOM fixture focus proves state decisions,
not browser focus containment, layout or assistive-technology announcements.

## R7: preserve the last valid portable copy

State: **Locally verified** for validation, ordering, rejection and synthetic quota
boundaries; **Blocked** for actual browser storage/quota acceptance where unavailable.

Baseline reproduction: corrupt main and backup A/B, valid backup C, then reject the
main replacement write. Rotation overwrote C with corrupt data before the rejected
main write, so reload lost the only persisted recovery. The initial seven-case run
failed that invariant (other slots survived that particular ordering).

The repair snapshots only parseable document history, writes replacement main first,
then rotates three backup slots from validated snapshots. A rejected replacement
cannot mutate backup history. Rotation rejection after main succeeds still leaves
valid persisted replacement main. Existing editor contents and Markdown export stay
available.

Coverage includes recovery from each of A/B/C with corrupt main/other slots,
three-slot history contents, failure on main/A/B/C/preferences write boundaries,
reload after rejection, and aggregate storage size rejection at main replacement.
The quota test sums all key/value lengths before each write and rejects growth over
an explicit fixture limit. This is a synthetic quota model, not actual browser
storage acceptance. Real browser localStorage writes and actual quota behavior need
separate evidence; next action is run the built portable edition under disposable
browser storage, inject a main-write rejection and reload, then exercise real quota.

## After repair

`node --test tests/analysis-portable.test.js`: **17 passed, 0 failed**.
Evidence: [targeted output](evidence/2026-10-26/r2-r7-after.txt).
Integrated suite/build results belong in the parent implementation ledger after
all concurrently edited repair packages are integrated. No cold install, native
Undo, screen-reader, writer study, artifact publication or release is claimed here.

## Integrated verification

The final targeted file has 18 passing tests after the article/preferences outcome
regression was added. Real Chromium quota exhaustion, main-analysis failure/recovery,
responsive/keyboard checks and their limits are recorded in
[the integrated evidence](implementation-evidence-2026-10-26.md).
