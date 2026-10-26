# Clear, import and close repair evidence

Date: 2026-10-26. Baseline: `7c547a625561a3717953c626bdee862bd39aeaa4`.
Implementation is the working-tree diff in `src/ui/app.js`, the Clear/import status regions in `src/ui/shell.html`, and `tests/transitions.test.js`.

## Reproduction and root causes

Before editing, `node --test tests/transitions.test.js` ran two tests against baseline source. Both failed: a throwing portable `removeItem` was swallowed and the editor was reset to empty; a rejecting native `savePrefs` was swallowed and close succeeded without showing the dialog. Test inputs were synthetic strings and in-memory storage, never the actual library.

After implementing the repairs, all twelve then-existing tests were additionally run against `git show HEAD:src/ui/app.js` (temporary baseline test with its source read pointed at `/tmp/blunted-transition-baseline.js`). All twelve failed. In particular the older backup reader replaced a newer selection, partial native Clear erased the editor, late writing during final preferences save still allowed exit, and repeated close allowed a competing request. Temporary baseline test was removed afterward.

Root causes were swallowed deletion/preferences failures, no exclusive Clear ownership, mutable import choices/backup read after awaits, no reader revision identity, and no recheck of article state after final preferences save.

## Repaired local checks

`node --test tests/transitions.test.js`: **20 passed, 0 failed** (Node VM on local macOS host).

- Portable deletion rejection preserves writing; native partial reports preserve writing and exact known removal/failure counts.
- Clear waits behind an already-started article save, rejects repeated requests, maintains progress-region focus, unlocks on success/failure, and cancels pending article/preferences/workspace timers. In-flight article/settings reader callbacks are invalidated by a persistence epoch and cannot resurrect data after Clear.
- Closing Preferences during a pending Clear, or Articles during a pending import, restores the opener and completion does not steal focus. Portable complete/already-absent removal paths leave storage empty after scheduled timers are drained.
- Import snapshots validated articles, copy/skip selection and settings selection before the first await; delayed save, cancel and competing selection cannot alter them.
- Out-of-order backup reads and reads arriving after cancellation cannot replace the pending backup.
- Empty/all-skipped imports and partial article/preferences failures report imported/skipped counts and settings outcomes. Controls unlock and stable import region retains focus while its panel stays open.
- Final preferences rejection keeps the close pending. Retry, explicit preferences-only exit, Keep working, Escape, subsequent ordinary article-dialog labels, repeated-close resolver isolation and late writing protection are covered.

These are deterministic bridge/DOM/storage fixtures. They prove application ordering and outcomes at mocked native/storage boundaries; they do not prove operating-system deletion behavior, installed native close, browser keyboard containment, screen-reader announcements, IME, native Undo, or browser storage quota enforcement. Native filesystem fixtures belong to the native repair evidence; actual disposable browser/native checks and platform acceptance remain required by the contract.

## Evidence states

R3/R5/R6/R8 application logic and VM regression proof: **Locally verified** within the boundaries above. Bounded actual browser/native keyboard and disposable-storage checks are now recorded in [the integrated evidence](implementation-evidence-2026-10-26.md). Installed cross-platform acceptance remains **Blocked**. No user data was deleted and no release action was performed.

## Integration review follow-up

A deterministic additional reproduction found that final native preferences saving ran outside the serialized queue: Clear could delete files while the final write was pending, then that write could recreate preferences. The new regression initially failed (`Clear` invoked once during the pending close). Final close now owns competing mutating transitions while leaving typing possible, and final preferences attempts use the shared save queue.

Another deterministic reproduction compared the pre-review import scheduling behavior with the repaired source. While an imported dark-preferences write was pending, a scheduled older light-preferences write started too (`[dark, light]` instead of `[dark]`). Confirmed import now invalidates old preference/workspace timers, suppresses scheduling during import, and queues imported preferences after existing writers.

A third regression initially observed a second save attempt after the writer explicitly chose preferences-only exit while preferences had changed. Explicit preferences discard now bypasses the preferences snapshot retry after checking article/operation safety; new writing still blocks exit.

Follow-up proof is again Node VM boundary evidence, not installed native acceptance.

Final truthful-count review reproduced a portable Clear result incorrectly reporting five absent keys as five removals while the sole existing main key could not be deleted. The regression failed before repair with “partly cleared. 5 removals completed”; it now reports failure with zero removals. Clear records absent keys separately and they still satisfy successful completion when no removals fail. If reading a key fails, its contents are unknown, that key is preserved, and the result explicitly reports that it could not be checked and no removal was attempted there. A separate regression covers this read failure.
