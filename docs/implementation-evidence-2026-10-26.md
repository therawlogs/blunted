# Implementation evidence and remaining acceptance

**27 October reconciliation:** the historical implementation snapshot below preceded
publication. v1.1.0 was subsequently published from `548301e6fc46282b483a680311be72e75ccc5f5d`;
the changed Windows installer was built and all five asset digests verified.
See [release reconciliation](v1.1-release.md) and
[current local acceptance](acceptance-2026-10-27.md). Later working-tree review/settings
changes are not part of the published binary until separately packaged/released.

Date: 26 October 2026. Baseline and read-only remote HEAD: `7c547a625561a3717953c626bdee862bd39aeaa4`. The remote was checked with `git ls-remote origin HEAD`; the first sandbox attempt lacked DNS, and the approved read-only retry succeeded. Implementation is the current working-tree diff. The pre-existing review, contract and unrelated `marketing/` files were preserved. Nothing was published, pushed or deployed.

The user's subsequent request, “spin sub agents and get this done”, authorized implementation. Three agents handled native storage/permissions/packaging, transitions/import/exit, and analysis/portable persistence. The coordinating agent handled library recovery, integration, browser checks and documentation. A separate final engineering pass reviewed the integrated changes; its concrete findings were reproduced and repaired. No remaining source blocker was identified in that review. Platform and participant gates below remain incomplete.

## Completion ledger

| Package | Implementation/local proof | Platform/acceptance proof |
|---|---|---|
| R1 configured library | **Locally verified** — filesystem configuration/disappearance fixtures; availability-only retry; active editor and article-list refresh; browser failure/export/retry checks | **Blocked** — installed Windows and clean-Mac folder/upgrade acceptance require those environments |
| R2 analysis failures | **Locally verified** — worker/main/structure failure, stale ordering and recovery regressions; real browser main-analysis injection | **Blocked** — installed platform accessibility/IME acceptance |
| R3 truthful Clear | **Locally verified** — portable/native failed/partial/complete/absent cases; actual disposable native IPC; browser partial-result and keyboard checks | **Blocked** — installed Windows destructive fixture and accessibility acceptance |
| R4 least privilege | **Locally verified** — native checks plus actual renderer filesystem-plugin read/write denial and intended custom IPC/recovery/export on Mac | **Blocked** — Windows runtime and clean installed-Mac acceptance |
| R5 exclusive Clear | **Locally verified** — queue order, close ownership, stale timers/readers, repetition, unlock and conditional-focus regressions; browser progress/result keyboard checks | **Blocked** — installed cross-platform end-to-end acceptance |
| R6 stable import | **Locally verified** — immutable choices, stale readers, exact counts/content, partial/settings failures and queued preference regressions; browser file input/import and keyboard checks | **Blocked** — installed Windows/clean-Mac workflow and screen-reader acceptance |
| R7 portable last-good copy | **Locally verified** — every backup slot/write boundary and aggregate quota fixtures; real Chromium localStorage quota failure and successful reload recovery | **Blocked** — remaining supported browser/platform acceptance |
| R8 preferences exit | **Locally verified** — preferences retry/discard, dialog reset, late edits, prior article discard and repeated-close regressions; browser native-dialog initial focus/Escape/restoration | **Blocked** — installed Windows and clean-Mac final-exit acceptance; additional disposable native results are recorded in the native report |
| R9 offline installer | **Build verified** — `offlineInstaller` configuration; fresh Windows NSIS artifact built in CI and published with its own verified SHA-256 | **Pending environment** — disconnected Windows absent/present-runtime installation, offline launch and upgrade preservation remain unrun |
| Cross-cutting accessibility/Undo/performance | **Locally verified** for the bounded responsive, theme, forced-colors and keyboard checks below | **Blocked** — actual browser/native 200% zoom, installed platform Undo, IME, VoiceOver/Windows screen reader and representative-hardware typing acceptance |
| Five writer workflows | Not applicable | **Blocked** — five independent participants have not been recruited/authorized or observed |

All nine source packages and the changed Windows artifact have been implemented/built. **Contract complete is not claimed.** Pending requirements retain their original acceptance scope in [the contract](implementation-contract-2026-10-26.md).

## Reproduction and regression receipts

- [Native repairs](native-repair-evidence-2026-10-26.md): unavailable configured roots were treated as absent, recursive load recreated missing roots, and Clear ignored deletion errors. Maintained Rust filesystem fixtures and disposable real IPC verify the repairs, including removed plugin denial. Contains fresh Mac artifact hashes/provenance.
- [Analysis and portable persistence](analysis-portable-evidence-2026-10-26.md): worker errors retained stale findings, main/structure exceptions lacked shared failure state, and corrupt main plus sole valid backup could lose all persisted recovery on failed rotation. Includes before/after output.
- [Clear/import/exit](transition-repair-evidence-2026-10-26.md): swallowed deletion/preferences errors, mutable import state, stale readers, unsynchronized final/imported preference writers and false absent-key removal counts. Controlled promise/timer ordering proves the failure and repair boundaries.
- R1 UI [before](evidence/implementation-2026-10-26/r1-ui-before.txt) and [after](evidence/implementation-2026-10-26/r1-ui-after.txt): unavailable library owns a persistent strip; Export works; Retry refreshes saved article metadata without adopting writing/preferences, preserves selection/scroll and respects focus moved during awaits. Desktop failure never presents the portable-edition explanation.
- Separate article/preferences persistence [baseline failures](evidence/implementation-2026-10-26/separate-persistence-before.txt): a durable portable article was reported as a failed article save when only preferences failed; the desktop structured partial outcome was ignored. Portable and native article acknowledgements now remain independent, with a precise preferences failure notice. The native filesystem fixture uses a directory at `prefs.json` to reject that write after the article succeeds.

Final integrated suites passed **100 Node tests** and **12 Rust tests**, with `cargo check --offline` and `git diff --check` passing. Final command output is saved in [Node tests](evidence/implementation-2026-10-26/node-tests.txt), [Rust tests](evidence/implementation-2026-10-26/rust-tests.txt) and [native check](evidence/implementation-2026-10-26/cargo-check.txt). Existing test files were retained. No production test hooks or new framework were added. Mocked DOM/native promises prove ordering and application outcomes, not OS permissions, native keyboard behavior or machine installation.

## Actual browser checks

Aside's Chromium browser ran disposable fixtures derived from `dist/index.html`, served only on `127.0.0.1:1428`. The desktop fixture injected a synthetic bridge before the app started; it never accessed the user's library. A separate portable fixture used only that test origin's storage. Temporary inputs were under `/tmp/blunted-browser-contract`; the source app contains no failure-injection switches. Browser runtime was 1440×900 CSS pixels, device pixel ratio 2, on this Apple Silicon Mac.

Observed checks:

1. Library startup rejection showed Export article and Retry library. Failed Retry retained the strip. Export returned exact active Markdown. Successful Retry kept the textarea, writing and selection `[4,12]`, focused the existing editor, and initially reported availability without Saved; only the later successful article write acknowledged Saved.
2. A real browser partial-Clear bridge result reported exactly one completed removal and one failure, retained writing, focused `clearStatus`, unlocked controls and allowed Tab onward. Native filesystem deletion outcomes are independently covered in the native report.
3. With Worker unavailable in the disposable fixture, an injected `BluntedEngine.analyze` exception removed findings/grades/heading navigation, showed matching Review/Outline failure text, preserved editor focus and independently saved writing. Restoring analysis and typing recovered current findings. [Recovered Review screenshot](evidence/implementation-2026-10-26/blunted-analysis-recovered.png).
4. Real localStorage quota was exhausted with synthetic filler keys: 88 accepted filler entries, 17 caught `QuotaExceededError` boundaries. Main contained corrupt JSON; backup C was the sole valid copy. Replacement reported Saving failed; new working text stayed in the editor. Reload recovered `Last valid persisted recovery copy.` from backup C. Synthetic filler was removed afterward. This is actual Chromium quota enforcement, distinct from the aggregate unit-test model.
5. Final preferences rejection opened the preferences-specific native HTML dialog. Keep working initially owned focus; Escape returned `false` from `prepareClose`, restored editor focus and retained exact writing. This is browser dialog integration. The isolated full native product also passed Cmd+W → preferences failure → Escape (window retained), Retry (native exit), reopen with writing preserved, and explicit preferences-only exit with the article file unchanged; see [the native report](native-repair-evidence-2026-10-26.md).
6. An actual file-input restore imported one synthetic article with exact ID/title/body. During a held save, `importStatus` was focused, said “Importing articles…”, and had `aria-busy=true`; controls were disabled. Keyboard Tab reached the available Close control. Completion reported `1 articles imported; 0 skipped`, retained exact content and respected focus moved during the wait.
7. Native browser Undo preserved its history across Write → Review → Read → Write: typing `X` appended it to `Native browser Undo fixture.`, then Cmd+Z restored the exact original text. This proves that Chromium browser flow on this Mac, not installed native Undo on both platforms.
8. Browser inspection found that a hidden More-menu opener had a nonempty `getClientRects()` despite being invisible. The repaired panel restoration checks actual visibility; real Escape from Outline then restored the visible Write control. This avoids trying to focus an invisible menu item.

Responsive checks used actual same-origin iframe viewports of **375, 560, 768, 1024 and 1360 CSS pixels**. Each had equal viewport/scroll width; recovery text wrapped within the viewport and both recovery actions measured 44px tall. Measurements are in [responsive-metrics.json](evidence/implementation-2026-10-26/responsive-metrics.json). Screenshots preserve each width. Side-inspector Review was inspected at 1360px in [light](evidence/implementation-2026-10-26/blunted-side-review-light.png) and [dark](evidence/implementation-2026-10-26/blunted-side-review-dark.png), with the article/recovery strip clear of the inspector.

A cached Chromium headless shell also ran the disposable app at 375×900 with `--force-high-contrast`; the rendered document reported `matchMedia('(forced-colors: active)').matches === true`. [Forced-colors screenshot](evidence/implementation-2026-10-26/blunted-forced-colors-375.png) was visually inspected. Light/dark tokens and actual forced-colors rendering were exercised; this is not Windows screen-reader acceptance.

A [200% CSS zoom smoke check](evidence/implementation-2026-10-26/blunted-css-zoom-200.png) kept the recovery strip within the viewport. Aside's page keyboard API did not change real browser zoom (device ratio and viewport stayed unchanged), so this is explicitly **not** accepted as actual 200% browser/native zoom. That acceptance remains open.

## Remaining execution and release boundary

- The Windows MSVC build and artifact SHA-256 are complete. On disconnected Windows machines/VMs, record OS/architecture/runtime state and installer hash for runtime-absent and runtime-present installation, offline launch and upgrade/data preservation.
- Run installed clean-Mac disconnected installation/launch and upgrade acceptance using the fresh local artifact. Local mounted-image checks and a disposable development runtime cannot establish this.
- Complete actual 200% zoom, native Undo across all views on both platforms, IME, VoiceOver and Windows screen-reader checks, action-target/contrast checks beyond the measured recovery actions, and representative-hardware/document typing latency. Do not infer these from VM tests or engine timings.
- With separate participant authorization, observe five independent writers through the complete required workflow and record failures/helpfulness. No recruitment messages were sent.

The original implementation results did not authorize publication; the later direct release request did, and publication is recorded separately above. These results do not authorize paid signing or purchases. Existing historical release hashes remain historical. Temporary verification services and disposable native apps are stopped at session completion; evidence files remain available for review.
