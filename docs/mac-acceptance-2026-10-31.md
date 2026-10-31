# Mac acceptance follow-up — 31 October 2026

Later local fix verification: [placeholder contrast, genuine native zoom and Clear AX repairs](mac-fixes-2026-10-31.md). Findings below describe the pre-fix release source.

Status: **local functional checks passed within scope; accessibility and measurement concerns remain**. No runtime source or installed app update was made. This report extends, rather than replaces, [the v1.2 release ledger](v1.2-release.md).

## Environment, isolation and evidence

MacBook Pro Mac14,7, Apple M2 (8 cores), 16 GB RAM; macOS 27.2 (26B123), arm64. The Applications app is version 1.2.0, strict/deep signature verification passed, executable SHA-256 `9ccda2109cdf16b7017476ee9328f2f3db3745c2f2068351830bfa6dd2f51e42`.

Cross-view Undo ran in `/Applications/blunted.app` using the existing synthetic “Offline corrections demo” article, restored to its original body. Destructive/failure/backup checks ran in a **release-mode rebuild** from unchanged v1.2.0 runtime source, with a separate identifier and `appDirectoriesOverride` plus a selected synthetic library under `dist/mac-acceptance-20261031`. Identity/configuration changes mean this is not untouched-installed-binary or clean-machine acceptance. No real article text was copied into evidence. Native UI was driven with CUA, not JavaScript editing/Undo emulation.

[Native observations and hashes](evidence/mac-acceptance-2026-10-31/native-observations.json), [charter](evidence/mac-acceptance-2026-10-31/charter.md), [native timing](evidence/mac-acceptance-2026-10-31/typing-native-roundtrip.json), [browser timing](evidence/mac-acceptance-2026-10-31/typing-browser.json), [static contrast calculations](evidence/mac-acceptance-2026-10-31/contrast-static.json).

## Completed locally

| Check | Observed result |
| --- | --- |
| Installed cross-view Undo | **Passed.** A synthetic edit survived Review → Read → Write; one Cmd+Z returned the exact original body. |
| Native Structure correction | **Passed in release fixture.** `### Skipped heading` proposed `## Skipped heading`; Apply changed the heading only; one Cmd+Z restored exact Markdown. Installed Clarity spelling/grammar Apply/Undo was demonstrated in the preceding local session; this follow-up does not relabel that as a new test. |
| Library disappearance and retry | **Passed in release fixture.** Renamed only the selected synthetic root. Unsaved body remained visible, recovery offered export/retry, failed retry retained it, and the missing root was not recreated. Restoring the original folder made retry succeed. |
| Permission denial and recovery | **Passed in release fixture.** Article directory mode 0500 independently rejected a write; native save exposed failure with working text retained. Restored mode 0700, retried, made another edit, and verified exact saved JSON body. |
| Recovery export | **Passed in release fixture.** System Save panel wrote Markdown with the exact synthetic title and unsaved body to the owned test directory. |
| Clear cancellation | **Passed functionally in release fixture.** Visible initial Cancel focus; Return cancelled, Escape cancelled, and Cmd+W cancelled pending confirmation and kept the window. Focus returned to Clear. |
| Clear confirmation, result and storage | **Passed functionally in release fixture.** After explicit action-time user authorization, Tab/Return confirmed Clear. Result container received focus, Tab reached About. After actual quit, both selected-library and overridden-data roots contained zero files. No resurrection occurred before deliberately creating the next fixture. |
| Backup into separate library | **Passed in release fixture.** Native backup exported one synthetic article. A separately selected empty library previewed 1 article/0 existing IDs, imported 1/skipped 0, displayed the exact body, and retained it after quit/relaunch. Both source and destination storage retained exact bodies. |
| Settings keyboard navigation | **Passed bounded smoke.** Settings initially focused Theme; Library then Tab reached Autosave. Save feedback was visible. This is not complete keyboard or assistive-technology acceptance. |

## Local findings and limitations: do not assign these to Windows or clean-Mac testing

| Item | Current result and next requirement |
| --- | --- |
| Genuine native 200% interface zoom | **Blocked by product support.** Native View menu has font-size changes, not whole-interface zoom. No native 200% result is claimed. Add/verify a real whole-interface zoom path, then test all groups and workflows. Browser 200% evidence remains narrower. |
| Placeholder contrast | **Static failure.** In light theme title placeholder is 2.70:1 (below 3:1 even as large text), body placeholder 2.96:1 (below 4.5:1). Dark body placeholder is 4.38:1 (below 4.5:1). Plain muted text still passes at 5.49:1 light / 7.62:1 dark. Values include shipped opacity compositing. Correct opacity/color and verify actual rendered states before closing contrast acceptance. No CSS was changed in this checks-only task. |
| Clear native accessibility | **Concern reproduced.** Screenshot showed the dialog, Cancel focus ring and destructive control; native CUA AX exposed neither control. Keyboard operation passed. This alone establishes neither VoiceOver failure nor success. A real VoiceOver test and any needed semantic repair remain required. |
| VoiceOver | **Blocked verification.** Cmd+F5 did not establish activation; selecting VoiceOver timed out. Subsequent process inventory showed no VoiceOver process. No spoken announcements were heard/verified. Needs a working VoiceOver/operator session on this Mac; a clean Mac is not inherently required. |
| Real IME composition | **Not run.** Enabled sources contain only U.S. layout plus character/press-and-hold/emoji helpers. No composition IME is configured. Configure a composition input source and exercise marked text, commit/cancel, analysis during composition, and Undo on this Mac. Unicode paste is not a substitute. |
| Full targets/contrast/focus | **Partial.** Earlier bounded settings target measurements and this keyboard smoke remain valid only for their stated scope. Full rendered native controls, both themes, dialog states and focus traversal still need measurement. |
| Runtime IPC/plugin restrictions | **Not run in untouched installed release.** Capability source was inspected: no arbitrary filesystem/shell/HTTP plugin permission is granted. No release runtime invocation inspector was available. Static capability review and older fixture probes do not replace a denial/no-side-effect probe against the release runtime. |
| Native typing latency | **Not established.** Native input accepted 10 samples each at 1k/5k/20k words. CUA key-to-returned-AX observations ranged 421–610 / 543–699 / 1216–2579 ms; those include automation, serialization and AX cost and cannot be interpreted as app input latency. Need native input-to-frame instrumentation or a calibrated physical observation method. |

The existing portable measurement harness was rerun on this Mac with a fresh headless Chromium profile, Harper and autosave enabled, 40 key events per size. Input-event-to-next-frame p95 was **5.1 / 14.5 / 9.7 ms** at 1k / 5k / 20k words. Raw samples, hardware and conditions are saved above. This is single-machine browser evidence, not native or representative-hardware acceptance. The sandbox blocked Chromium's port initially; the authorized unsandboxed rerun completed. No product latency pass/fail threshold is inferred.

## Requires another environment or participants

| Requirement | Exactly what remains |
| --- | --- |
| Windows | Disconnected install with WebView2 absent and present; disconnected first launch; upgrade with library/history preserved; selected-folder permission/disappearance and recovery/export/retry; runtime IPC/plugin denial with no forbidden writes; Clear cancel/confirm/focus/post-quit storage; cross-view and correction Undo; Windows screen reader, composition IME, true 200% layouts and full target/contrast/focus; native typing measurements with hardware/document conditions. A successful CI installer build does not close these. |
| Clean Mac | Install the published DMG on an environment without development caches/state; disconnected first launch; prepare existing writing, upgrade disconnected and verify exact preservation. Exercise installed storage/recovery/export/IPC/Clear and Undo under that clean environment. The development-Mac upgrade and isolated rebuilt fixture do not establish this. |
| Independent writers | Five people independently complete start/import, drafting/headings, both reviews, correction preview/Apply/Undo, export, close/reopen, and backup restore into a separate library. Record observations/problems and participants' actual acceptance. No sessions or recruitment are claimed. |
| Representative hardware | Native typing conditions on additional representative Mac/Windows hardware. Current Mac/browser samples and CUA timing are insufficient. |

## Cleanup and boundaries

The temporary app was quit and its exact bundle and launcher registration removed after retaining sanitized evidence. The Applications app was preserved. Synthetic backup/export/library artifacts remain only under the ignored `dist/mac-acceptance-20261031` fixture directory for review; no real library configuration was changed. VoiceOver was not observed running after the attempted check. No tests, build gates, CI, preferences of the real app, runtime code, release tag or published assets were modified. Gstack bookkeeping outside the writable workspace was unavailable; no bound QA receipt or blanket accessibility pass is claimed.
