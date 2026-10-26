# blunted whole-product CEO review

Date: 2026-10-26. Revision: `7c547a6`. Base: `main` (local origin/HEAD).
Status: DONE_WITH_CONCERNS (CEO review complete; user selected engineering review next). Review only; application changes are not authorized.

## Contract and review boundary

User: “review everything”; D1 answer “b” selects HOLD SCOPE. Review the existing
desktop and portable product, marketing sources, architecture, reliability,
security, tests, performance, operations, release and UX. No feature additions
or scope cuts are accepted. No new approach decision was needed.

Working artifact: this file. It lets the owner decide which evidenced gaps to
address; it is a single review document, retired by a superseding review. No
separate certificate or dashboard implementation is proposed.

## System audit and evidence

- `git log --oneline -30`: release and signing repairs recur; latest source release
  is `ccaa8aa`, followed by CI ordering repair `7ee1664` and evidence `7c547a6`.
- `git diff main --stat`: no tracked changes. `git status --short`: untracked
  `marketing/`. `git stash list`: empty. Local branches: main only.
- No repository AGENTS.md, TODOS.md or per-feature design plan found. Existing
  product contract is README.md and docs/article-workspace.md. This is an audit
  of an existing product rather than a new feature specification.
- `npm test`: 58/58 pass, measured this run. `cargo test --offline --manifest-path
  src-tauri/Cargo.toml`: 5/5 pass, measured this run. These are local tests.
- Two `node scripts/build.mjs --out /private/tmp/blunted-ceo-review-{a,b}.html`
  outputs each measure 233456 bytes and SHA-256
  `241d77339c60d48b5966e1511dde26b4bfcb0865dfb8e2527f73a5c6e1f147ef`.
  They match existing dist/index.html and docs/v1.0-release.md's recorded hash.
- `git fetch origin main` failed: cannot open .git/FETCH_HEAD: Operation not
  permitted. `gh pr list` failed connecting to api.github.com. Remote PR count
  and release state are unverified. No paid action or remote mutation attempted.
- gstack recovery/design/brain helpers failed attempting mkdir under
  /Users/praveen/.gstack/projects/blunted. No saved project context was loaded.
  Durable metadata outside writable roots will not be claimed persisted.
- Aside readiness failed; market research uses web search fallback.

## Premise and existing leverage

The real problem is helping independent article writers revise their own prose
without sending it to a service or surrendering editorial judgment. The current
Write -> Review -> Read workflow addresses that pain directly. Whether its
heuristic advice helps real articles remains unverified: the five writer sessions
required by docs/article-workspace.md:87-97 have not been conducted according to
that document. Doing nothing retains this evidence gap and the storage concern
below. No new customer interview result is claimed.

Reuse: src/engine owns analysis; src/writer/article.js owns structure, export and
backup validation; src/ui/app.js owns user state and serialized save promises;
src-tauri/src/library.rs owns validated identities, recovery and file writes.
The boundaries support focused repairs. No rewrite is justified by this review.

```
CURRENT                         HELD SCOPE                    12-MONTH IDEAL
Offline article workspace  ->   Validate current promises -> Trusted offline
with local tests and gaps       and remedy proven gaps       article workflow
```

## Decision ledger

| ID and owner | Contract and evidence | Current | Proposed | Status | Exact approval and scope |
|---|---|---|---|---|---|
| MODE / owner | D1 mode menu | HOLD SCOPE | None | approved | User reply “b”; review posture only, no remedies approved |
| ARCH-01 / native storage owner | Folder persists across updates (README.md); load failure preserves files and blocks saving (docs/article-workspace.md:34-39). main.rs:39-60,71-96 and adapter.js:29-38 | Missing configured directory becomes None, indistinguishable from no setup; selection cancellation allows loading default storage. A disappearing directory during a session also changes data_dir's destination. | A: plan a fail-closed configured-root contract and its regressions. B: retain this as an unresolved review finding pending further evidence. | approved | D2 user reply “A”: retain configured root; block alternate-location saves; visible error/export/retry; regressions for configuration, missing root, cancellation and disappearance during save. Plan only; no implementation. |
| ERR-01 / analysis UI owner | Zero silent failures; app.js:187-192,227-240,697-703. Temporary harness replay injects Engine.analyze Error and observes busy=true, no message, Apply disabled. | Worker ok:false is ignored until fallback; main analysis catch returns silently; structure call sits outside catch. | A: visible recoverable analysis failure and coupled regression coverage. B: retain unresolved finding pending a real-document trigger. | approved | D3 user reply “A”: visible shared analysis failure state, clear busy, disable stale Apply, preserve writing/save/export, retry next edit, coupled failure/retry/stale-error regressions. Plan only. |
| SEC-01 / storage and UI owner | Clear confirmation promises all local app data; app.js:164-172,1130-1137; main.rs:182-205. Injected portable removeItem failure reproduces false success with retained draft. | Portable delete errors swallowed; native individual file errors ignored; UI can claim data cleared. | A: truthful complete/partial/failed clear contract with deletion-error regressions. B: retain unresolved finding without selecting remedy. | approved | D4 user reply “A”: accurate complete/partial/failed clearing on portable and native; already-absent is success; preserve editor on failure; coupled deletion-error/partial/success/absent-file regressions. Plan only; no actual deletion. |
| SEC-02 / desktop security owner | SECURITY.md least privilege; capabilities/main.json:9-19; main.rs:343; Cargo.toml:13. Source search finds no renderer filesystem-plugin calls. | Renderer holds broad unused text-file grants for Documents/Downloads/Desktop and app data. | A: remove unused filesystem-plugin grants, registration and dependency; verify intended custom-command paths. B: retain unresolved finding pending disposable native IPC verification. | approved | D5 user reply “A”: plan removal of unused fs grants, plugin registration and direct dependency; preserve custom commands/dialogs; verify builds, denied plugin access and selected-folder load/save/recovery/export. Plan only. |
| DATA-01 / workspace transition owner | app.js:1130-1137,1188-1191,1259-1267; controlled clear/save replay exercises both completion orders. Existing promise: preserve writing and accurately clear data. | Clear does not lock editing or mutation controls and does not own saveQueue through completion. | A: exclusive clear transition with queue/timer barrier and both-order regressions. B: retain concurrency finding unresolved pending native timing reproduction. | approved | D6 user reply “A”: exclusive clear transition using existing guard/queue; block editing/mutations, drain saves, invalidate pending writers; preserve SEC-01 failure behavior; both-order/repeat/timer/failure/no-resurrection regressions. Plan only. |
| DATA-02 / restore UI owner | app.js:1301-1342; paused-save UI replay reproduces Cancel null exception and mixed-backup restore. Existing restore promise: chosen validated backup and explicit conflict/settings choices. | In-flight restore reads mutable pendingRestore and live controls after awaits; Cancel and picker remain enabled. | A: snapshot backup/options at start and lock/guard changes through completion; coupled ordering regressions. B: retain unresolved finding for native interaction reproduction. | approved | D7 user reply “A”: snapshot validated backup/options before awaits; lock competing restore controls and ignore stale/competing file callbacks; preserve pre-confirmation Cancel, partial import/no-overwrite; coupled ordering/option/failure/unlock regressions. Plan only. |
| DATA-03 / portable storage owner | SECURITY.md last-good draft invariant; app.js:96-120,142-161,1595-1599. Aggregate-quota replay: valid backup c recovered, rotation removes it, main save fails, zero valid stored copies remain. | Corrupt previous main and backup values rotate before replacement main succeeds. | A: preserve at least one valid saved copy through recovery and failed writes, with slot/failure/reload regressions. B: retain finding unresolved pending real-browser quota reproduction. | approved | D8 user reply “A”: validate rotation inputs, preserve a valid stored copy until replacement main succeeds, retain three backups/editor/export; regressions for every recovery slot, write failure, quota pressure and reload. Plan only. |
| OBS-01 / close and preferences owner | app.js:1423-1426 versus visible scheduled preference failure at1490. Injected savePrefs rejection returns allowedToClose=true with no message. | Close swallows final preferences write error and returns success. | A: visible close-time preferences failure, retry or explicit exit without preferences, coupled tests preserving article state. B: leave finding unresolved. | approved | D9 user reply “A”: show final preference failure; keep window open until retry or explicit preference-only discard; preserve article guards; coupled failure/retry/discard/no-article-mutation tests. Plan only. |
| REL-01 / Windows release owner | README.md:51; docs/v1.0-release.md:29-33 offline installs pending; tauri.conf.json:42-45 embedBootstrapper; docs/win-release.md:32-36 network prerequisite. Official Tauri runtime deployment documentation confirms installer needs network when runtime missing. | Small bootstrapper installer; app runtime offline, cold installation can need network. | A: bundle offline runtime installer and retain offline-install gate. B: keep bootstrapper and explicitly narrow installation requirement to provisioned runtime/offline app use. | approved | D10 user reply “A”: plan offlineInstaller runtime embedding; align documentation/artifact hashes; disconnected Windows installation with runtime absent/present plus existing upgrade/offline-app checks. Plan only; no publication. |

## Section 1: Architecture Review

Current scope: HOLD SCOPE per D1 user “b”. MODE and ARCH-01 are approved, respectively by D1 “b” and D2 “A”.
ARCH-01 is an accepted corrective requirement. No feature additions, cuts, deferrals or application changes are approved.

```
textarea/title -> UI revision + immutable snapshot -> JS promise save queue
   |                         |                         |
   v                         v                         v
worker or engine         localStorage              Tauri IPC
   |                     (portable)                  |
   v                                                  v
Clarity/Structure -> explicit Apply       native mutex -> root selection
Read -> text nodes, local markup                          |
                                                         v
                                    ID validation -> backups -> tmp+flush+rename
```

Architecture strengths: stable IDs keep titles out of paths; immutable queued
snapshots prevent old acknowledgements marking new edits saved; native mutex
serializes library operations. Portable and desktop adapters reuse analysis.
No authentication service, database, cloud dependency or new secret is needed.

ARCH-01 (high, static source finding): configured_dir collapses an unreadable
configuration file or unavailable configured directory into no configuration.
data_dir then selects app storage. This affects every native save call, not only
startup. adapter.loadDoc asks for a folder when needs_folder is true, but ignores
the cancellation result and loads the default library. This can present a writer
with a different library or acknowledge writing to a different location. Existing
files are not shown to be deleted; the demonstrated mechanism is library splitting
and lost visibility. No installed-app reproduction is claimed.

```
existing configured root accessible -> load/save chosen root
no configuration                   -> first-run selection -> default if cancelled
configured root unavailable         -> currently same as no configuration [GAP]
root disappears after opening       -> next save may choose default root [GAP]
```

Existing error path for corrupt articles deliberately blocks whole-library load
and preserves originals (library.rs:134-150). That fail-closed precedent can be
reused for root failures instead of inventing another storage system.

Scale: library load reads every article and retains bodies in memory; native
mutex and a single JS queue serialize writes. At larger libraries startup and
JSON copies are likely limits, but no capacity failure or p99 was measured.
Unrecoverable article and unavailable storage are single points of workflow
failure. No new data flow, service or class is proposed.

Rollback: preserve a library backup before changing versions; legacy originals
remain, but pre-1.0 code does not understand the new multi-article library. Thus
binary rollback alone cannot promise access to post-migration articles.
Installed downgrade acceptance remains unverified.

## Answered decision (ARCH-01)

D2 user answer: **A**. Accepted exactly the recovery requirement and regression coverage in A. The comparison below is retained as decision history; it is not a pending menu.

Commitment comparison:

| Commitment | Source/approval or pending | Current | A | B |
|---|---|---|---|---|
| Hold product scope | D1 user b | Yes | Unchanged | Unchanged |
| Change application code during review | Not authorized | No | No | No |
| Preserve selected library identity | Existing persistence promise | Can silently change root | Plan error on unavailable configured root; preserve pointer and files | Record gap; remedy remains unresolved |
| First installation with no configuration | Existing fallback | Folder picker/default storage | Unchanged | Unchanged |
| Failure experience | Proposed remedy pending | Alternate/default root possible | Visible unavailable-library state; export current text; retry original root | No chosen remedy |
| Required regression proof | Pending, coupled to A | Five Rust tests do not cover configured root | Config unreadable, missing directory, cancellation and root disappearance during save; assert no default article write | No additional test plan approved |

Question: D2 — ARCH-01: What should the review plan require when a saved library folder disappears?
Project: blunted on main, whole-product review in HOLD SCOPE.
ELI10: The app remembers a folder for your articles. If that folder disappears, the current code can switch to app storage and show or save a different library. Your original files may still exist, but writing can become split between locations.
Stakes: A writer can believe an article was saved in the chosen library when it was saved elsewhere.
Recommendation: A because preserving library identity follows the existing file-preservation contract and needs a focused storage repair rather than a rewrite.
Note: options differ in kind, not coverage — no completeness score.
Net: Choose a concrete recovery requirement now, or keep the finding open while gathering more evidence. Neither option authorizes implementation.
Header: Missing library folder
A) Plan fail-closed recovery (recommended)
Effort M (human: about 1 day / CC+gstack: about 1 hour), low risk. Reuse the existing unavailable-library state; retain the configured root, block default-location writes, explain the failure, allow export, and retry the original location. Include regressions for unreadable configuration, missing folder, cancelled reselection and disappearance during saving. ✅ Keeps a writer's selected library identity stable across failures. ✅ Covers recovery and failed writes with observable regression assertions. ❌ Writing remains blocked until storage returns or the user resolves its location.
B) Leave finding unresolved
Effort S (human: about 30 minutes / CC+gstack: about 15 minutes), high risk remains unresolved. Zero implementation work; retain the finding and request an installed-app reproduction before selecting a remedy. ✅ Keeps the review from prescribing an untested interaction policy. ✅ Preserves the source evidence and separates it from native acceptance. ❌ Leaves alternate-location saving without an accepted recovery plan.


## Accepted remediation requirements

### ARCH-01: Preserve configured library identity

Native storage owner must distinguish absent configuration from unreadable
configuration or unavailable configured root. First-run fallback with no prior
configuration remains unchanged. When a configured root is unavailable, preserve
its pointer and original files, fail saves visibly without default-root writes,
keep export available and retry the original root. Reuse the existing
unavailable-library UI. Regression coverage must exercise unreadable config,
missing root, cancelled reselection and a root disappearing during saving.
The assertion is that no alternate library article is written or acknowledged
saved; local fixtures do not establish installed Mac/Windows acceptance.

Implementation touches existing main.rs storage selection, adapter.js load
handling, app.js unavailable-state integration and directly required tests.
Estimated 4–6 changed files; no new service/class or rewrite. Estimate, not approval
to implement. Human about 1 day; Codex+gstack about 1 hour, subject to native
verification availability.

### Temporal interrogation

Hour 1: distinguish fresh setup from configured-root failure in native storage;
preserve the existing no-configuration first-launch behavior.
Hours 2–3: trace load/save/close error propagation and both root-disappearance
orders, reusing the existing save queue rather than adding another queue.
Hours 4–5: verify dialog cancellation does not replace an existing pointer and
that export remains available while saving is blocked.
Hours 6+: run approved regressions; installed platform acceptance remains a
separate existing release gate. These are human-team sequencing estimates;
Codex+gstack estimate is about 1 hour excluding unavailable external acceptance.

Section 1 disposition: ARCH-01 resolved by D2 A. Proceed to Error & Rescue map.


## Section 2: Error & Rescue Map

Scope remains HOLD SCOPE, D1 b. ARCH-01 is accepted by D2 A, with no code edits.
This section audits existing behavior; unrelated feature proposals stay excluded.

| Method/codepath | Trigger / error class | Current rescue | User result | Coverage / disposition |
|---|---|---|---|---|
| configured_dir/data_dir | fs read error, missing configured root | Falls back to default | Different library/location possible | ARCH-01 accepted, D2 A |
| library::load | JSON/schema failure; exhausted backups | Return contextual Err; preserve originals | Library unavailable; export current writing | Rust recovery/unreadable tests; UI load-error fixture |
| library::save/write | invalid ID; mkdir/copy/write/sync/rename io::Error | Return Err -> save promise false | Visible save error; text retained; transition refuses | Rust invalid-path/write failure and JS failed-save fixtures |
| blunted_library_save | prefs write fails after article succeeds | Overall command fails | Conservative failed-save status although article may exist | Partial commit status unknown; observability owner, Section 8 |
| store.load portable | malformed/blocked localStorage reads | Parse catches; backup attempts; sometimes fresh start | Corrupt notice or empty state | Data-integrity semantics reserved for Section 4 |
| store.save portable | quota/security/storage exception | Show saving failed; return false | Export instruction | Detailed recovery/rotation examined in Section 4 |
| worker creation/postMessage/onerror | worker unavailable, runtime error | Main-thread fallback | Usually transparent | Existing stale-response tests do not cover complete failure |
| worker onmessage | ok:false for current revision | No immediate handling; fallback timer still runs | No immediate analysis error | ERR-01 pending |
| analyzeMainThread | Engine.analyze Error | catch and return | Review/Outline busy; no explanation | ERR-01 reproduced by injected exception |
| analyzeMainThread structureReport | structure analysis exception | Outside main analysis try/catch | Escapes; no local rescue contract | ERR-01 same analysis failure boundary |
| article FileReader | read error | Display current writing kept | Error message; no replaced text | Static source, no live OS file-error check |
| library restore validate/read/save | malformed/duplicate backup; read failure; partial import | Validate first; preserve existing IDs; stop with count | Explicit rejection/partial progress | JS validate/restore fixtures; import races owned Section 4 |
| export/saveFile | rejection or cancellation | Cancel/error text | Existing library retained | Static source and bridge fixtures, not native acceptance |
| schedulePrefs / prepareClose | preference write rejection | Scheduled save displays error; close path catch ignores | Close can hide final preference failure | Nonblocking evidence/diagnostic gap, Section 8 owner |
| clear data | failed deletes | UI catches rejected clear; native individual remove errors ignored | Success can be overstated | Security/deletion contract owned Section 3 |

```
analysis request
  +-> worker success/current revision -> render -> busy=false
  +-> worker failure/timeout -> main fallback
                                +-> success -> render
                                +-> engine throw -> return silently [ERR-01]
                                +-> structure throw -> escapes [ERR-01]
```

ERR-01 is medium severity: review can stall without an explanation, but this
probe did not lose article text. Reproduction script is
/private/tmp/blunted-ceo-analysis-failure.mjs, built from the existing
workspace.test.js harness without changing tracked tests. Its measured output:

```json
{"editor":"A changed article requiring analysis.","reviewBusy":"true","outlineBusy":"true","message":"","applyDisabled":true}
```

This is a synthetic failure-path replay. It proves the rescue gap, not engine
failure on normal user prose, browser rendering, or an installed desktop result.
Existing analysis revision checks should also suppress stale failure messages;
that invariant must remain when handling current failures.

## Answered decision (ERR-01)

D3 user answer: **A**. Accepted exactly the recovery behavior and coupled regressions in A; retained comparison is history, not a pending menu.

| Commitment | Source/approval or pending | Current | A | B |
|---|---|---|---|---|
| ARCH-01 | D2 A | Accepted | Unchanged | Unchanged |
| No application edits | User requested review; held scope | Yes | Unchanged | Unchanged |
| Current analysis fails | Injected replay + app.js:236-240 | Silent busy state | Visible error, clear busy, disable stale Apply | Finding stays open |
| Writing/save/export | Existing independent paths | Text retained in replay | Preserve all three | No new remedy selected |
| Recovery | Pending | User lacks explanation | Retry through existing next-edit analysis path; success clears failure | Await real-document trigger before choosing |
| Regression coverage | Coupled proposed remedy | No complete-failure assertion | Current worker failure, main/structure throws, successful retry, stale failures | No extra test plan approved |

Question: D3 — ERR-01: Should the plan require visible recovery when review analysis fails?
Project: blunted on main, whole-product review in HOLD SCOPE. ARCH-01 remains accepted by D2 A.
ELI10: Writing and review are separate. If the review engine fails, your text can remain safe while Review and Outline look stuck forever. The app currently catches one such error without explaining it.
Stakes: A writer cannot tell whether review is still working or has stopped.
Recommendation: A because one shared failure handler can make the existing review workflow recoverable without changing the product's scope.
Note: options differ in kind, not coverage — no completeness score.
Net: Plan a visible failure and recovery path now, or leave this reproduced handling gap unresolved. Neither option authorizes implementation.
Header: Analysis failure
A) Plan visible recovery (recommended)
Effort S (human: about 3 hours / CC+gstack: about 30 minutes), low risk. Handle current worker failures and main/structure exceptions through the same analysis failure state: clear busy flags, explain that review is unavailable, disable stale Apply, preserve writing/save/export and retry on the next edit. Reuse revision checks and add coupled failure/retry/stale-error regressions. ✅ Gives writers an explanation instead of an indefinite busy state. ✅ Preserves safe writing and verifies recovery without adding a service. ❌ Review advice remains unavailable until analysis succeeds again.
B) Leave finding unresolved
Effort S (human: about 30 minutes / CC+gstack: about 15 minutes), medium risk remains unresolved. Zero implementation work; keep the injected failure evidence and wait for a real-document failure before choosing the remedy. ✅ Separates a proven rescue gap from an unproven production trigger. ✅ Keeps the existing analysis behavior unchanged during this review. ❌ Leaves writers without an explanation when analysis does fail.


### ERR-01 accepted remediation

D3 A requires a shared current-revision analysis failure state for worker
failures and main/structure exceptions. Clear busy flags; show review unavailable;
disable stale Apply; preserve writing, saving and export; retry through the
existing next-edit path and clear the error after successful analysis. Reuse
revision checks to ignore stale errors. Coupled tests cover worker failure,
main/structure throws, successful retry and stale errors. Local injected fixtures
do not prove a production engine trigger or installed-platform acceptance.
Estimated files: app.js and workspace.test.js, plus shell/styles only if needed
for the existing status surface. Human ~3h / Codex+gstack ~30min. No new service.
Section 2 disposition: ERR-01 resolved by D3 A. Other nonblocking observations
retain the section owners named in the registry; no remedies are silently added.


## Section 3: Security & Threat Model

Scope remains HOLD SCOPE. ARCH-01 (D2 A) and ERR-01 (D3 A) are accepted corrective
requirements. No new accounts, service, telemetry, secret or dependency is
proposed. The same local user can invoke renderer actions; app data is explicitly
unencrypted. No multi-user authorization service is applicable to this product.

| Boundary / threat | Likelihood | Impact | Evidence / disposition |
|---|---|---|---|
| Pasted prose/Markdown executes scripts | Low in inspected paths | High | Preview constructs text nodes and known elements; raw HTML stays literal; rg finds no innerHTML/eval/network calls in application paths. Static review, not exploit certification. |
| Article ID escapes library root | Low | High | library.rs validate accepts only bounded alphanumeric/hyphen IDs; Rust traversal fixture passes. Local filesystem attackers/symlinks are not ruled out by an ID check. |
| Someone with device access reads drafts | Expected | High for sensitive writing | Explicit unencrypted local-data limitation in SECURITY.md and privacy.md; no new encryption proposal. |
| Clear action falsely claims deletion | Medium under storage faults | High for privacy expectations | SEC-01 replay below; native deletion errors also suppressed. Pending remedy decision. |
| Renderer IPC permissions exceed used bridge | Exposure exists; exploit not established | High if renderer compromised | capability grants fs text access across Documents/Downloads/Desktop; application bridge uses custom commands. Separate least-privilege analysis remains in this section after SEC-01 resolution. |
| Unbounded imported files/library consume memory | Unknown | Medium | No new limits invented; performance and input-boundary owners Sections 4/7 must assess existing behavior. |
| Dependency vulnerabilities | Unknown | Unknown | package-lock and Cargo.lock exist; no current advisory audit completed. No claim of clean dependencies. |

SEC-01 reproduction: /private/tmp/blunted-ceo-clear-failure.mjs reuses the existing
UI harness, saves synthetic prose, makes localStorage.removeItem throw, then
clicks Clear with the harness confirmation. It touches no user library. Output:

```json
{"status":"Local data cleared","message":"","editor":"","storedBody":"Synthetic writing that must be cleared."}
```

The error is swallowed by store.clear, so its caller sees successful completion
and resets the UI. Native blunted_clear propagates article-directory removal
errors but ignores legacy draft/backups/preferences/pointer removal failures.
An ENOENT (already absent) is benign; permission and other errors are not evidence
of deletion. UI text must distinguish failed or partial clearing. No secure disk
erasure guarantee is proposed. Partial deletion cannot truthfully promise that
all files were retained either.

## Answered decision (SEC-01)

D4 user answer: **A**. Accepted exactly the truthful-result requirement and coupled tests. Retained alternatives are history, not pending choices.

| Commitment | Source/approval or pending | Current | A | B |
|---|---|---|---|---|
| ARCH-01 / ERR-01 | D2 A / D3 A | Accepted | Unchanged | Unchanged |
| Application changes in review | Not authorized | None | None | None |
| Clear operation result | Existing clear confirmation | Can overstate success | Success only if intended app-data removal succeeds; already absent is success | Remedy unresolved |
| Failure/partial deletion | Pending | Hidden in several paths | Show accurate failed/partial result; retain current editor content on failure; never claim all files kept after partial deletion | Keep source/replay evidence only |
| Native/portable parity | Same visible product promise | Both suppress some errors | Both propagate meaningful deletion errors to UI | No remedy selected |
| Regression proof | Coupled pending remedy | No deletion-error assertion | Portable rejection; native file permission failure; partial deletion; successful and already-absent cases | No new test plan approved |

Question: D4 — SEC-01: Should the plan require accurate results when Clear local data fails?
Project: blunted on main, whole-product review in HOLD SCOPE. ARCH-01 and ERR-01 remain accepted.
ELI10: Clear local data currently can say it succeeded even when stored writing remains. I reproduced that in the portable UI with an injected deletion error; native code also ignores several file-deletion errors.
Stakes: A writer can believe private writing was removed when it is still stored.
Recommendation: A because deletion should report what actually happened and preserve the working copy when clearing fails.
Note: options differ in kind, not coverage — no completeness score.
Net: Make the existing clear action truthful, or leave this privacy-related handling gap unresolved. Neither option authorizes implementation or actual data deletion.
Header: Clear-data failure
A) Plan truthful clear results (recommended)
Effort M (human: about 4 hours / CC+gstack: about 45 minutes), low risk. Propagate deletion failures in portable and native storage, distinguish complete/partial/failed results, and show success only after all intended removals succeed; already-absent files count as success. Keep the editor intact on failure and test deletion rejection, partial progress, successful clearing and already-absent files. ✅ Prevents the UI from falsely assuring a writer that stored prose is gone. ✅ Preserves a working copy and verifies both storage implementations. ❌ A partial clear may need manual recovery or retry and cannot be rolled back automatically.
B) Leave finding unresolved
Effort S (human: about 30 minutes / CC+gstack: about 15 minutes), high risk remains unresolved. Zero implementation work; retain the reproduction and source finding without choosing a deletion-result policy. ✅ Preserves the evidence without making an unverified platform claim. ✅ Keeps this review separate from any destructive data operation. ❌ Leaves a privacy-sensitive false-success path without an accepted remedy.


### SEC-01 accepted remediation

D4 A requires portable and native deletion errors to reach the UI, distinguishing
complete/partial/failed clearing. Success requires all intended removals to
succeed, with already-absent data treated as success. Keep the current editor
intact on failure; do not claim files survived if a partial deletion occurred.
Coupled regression proof covers portable removal failure, native file removal
failure, partial deletion, successful removal and already-absent files. Fixtures
must use disposable data. This review authorizes no application changes or user
data deletion. Estimated app.js/main.rs plus their tests; human ~4h / Codex ~45m.


### SEC-02: Unused renderer filesystem grants

Static receipt: src-tauri/capabilities/main.json:9-19 grants filesystem access to
app config/data plus text read/write under Documents, Downloads and Desktop;
main.rs:343 registers tauri_plugin_fs; Cargo.toml:13 declares it. Source search
across src, adapter.js, native source, scripts and tests finds no application
filesystem-plugin call. Adapter.js:29-49 delegates storage/export to the custom
Rust commands; those commands use std::fs and the native file dialog.

Threat mechanism: code running in the local renderer could invoke granted
plugin commands instead of passing through application-selected library/export
flows. Likelihood of renderer compromise is not measured and no XSS or working
exploit is demonstrated. Impact would include text files outside the library.
The existing least-privilege requirement justifies evaluating unused grants.
Removing them cannot be claimed sufficient to secure all custom commands.

## Answered decision (SEC-02)

D5 user answer: **A**. Accepted exactly the permission-removal requirement and coupled native verification. Alternatives below are retained as history.

| Commitment | Source/approval or pending | Current | A | B |
|---|---|---|---|---|
| Prior accepted remedies | D2 A, D3 A, D4 A | Accepted | Unchanged | Unchanged |
| Application code during review | Review only | No changes | No changes | No changes |
| Filesystem plugin exposure | SECURITY.md least privilege; source usage search | Broad unused grants/plugin installed | Plan removal of fs grants, plugin registration and direct dependency | Remains unresolved |
| Library folder and export behavior | Existing product contract | Custom native commands | Preserve existing custom commands and user-selected dialogs | Unchanged |
| Verification | Coupled pending remedy | No native denial test this run | Build + disposable native checks for denied plugin access and working load/save/recovery/export | Gather disposable native evidence before selecting remedy |

Question: D5 — SEC-02: Remove the desktop renderer's unused filesystem permissions from the plan?
Project: blunted on main, whole-product review in HOLD SCOPE. Previously accepted remedies remain unchanged.
ELI10: The desktop page has permission to read and write text files across Documents, Downloads and Desktop. The app's current storage and export code uses separate Rust commands, and I found no calls needing those broader permissions.
Stakes: If renderer code were compromised, unused permissions could expose files beyond the article library. No exploit has been demonstrated.
Recommendation: A because removing unused authority follows the existing least-privilege contract while preserving the active storage paths.
Note: options differ in kind, not coverage — no completeness score.
Net: Plan removal of unused permission exposure, or keep it unresolved until a disposable native check. Neither option authorizes implementation.
Header: Unused file access
A) Plan removal (recommended)
Effort S (human: about 3 hours / CC+gstack: about 30 minutes), low risk. Remove unused fs grants, plugin registration and the direct dependency while retaining custom library commands and native dialogs. Verify native builds, denied filesystem-plugin calls, and working selected-folder load/save/recovery/export with disposable data. ✅ Reduces renderer authority without adding a replacement storage system. ✅ Preserves the active user flows and requires native regression evidence. ❌ Undocumented plugin usage could surface during verification and require reassessment.
B) Leave finding unresolved
Effort S (human: about 1 hour / CC+gstack: about 20 minutes), medium risk remains unresolved. Zero implementation work; retain the finding until native disposable IPC checks confirm the effective permission exposure and absence of required plugin usage. ✅ Avoids claiming a source-only permission review proves exploitability. ✅ Preserves existing behavior while gathering platform-specific evidence. ❌ Keeps broader unused permissions without an accepted removal plan.


### SEC-02 accepted remediation

D5 A requires removing unused filesystem-plugin grants, registration and direct
Cargo dependency, preserving existing custom library commands and native dialogs.
Required proof: native builds, denied filesystem-plugin access, and successful
selected-folder load/save/recovery/export using disposable data. Investigate any
unexpected dependency before weakening verification or removing intended flows.
Estimated files: capabilities/main.json, main.rs, Cargo.toml/Cargo.lock and directly
required tests/evidence. Human ~3h / Codex+gstack ~30min. No exploit claimed.
Section 3 disposition: SEC-01 (D4 A) and SEC-02 (D5 A) resolved for the plan.


## Section 4: Data Flow & Interaction Edge Cases

Accepted remedies: ARCH-01 D2 A, ERR-01 D3 A, SEC-01 D4 A and SEC-02 D5 A.
HOLD SCOPE remains D1 b. No application code or test file has been edited.

```
prose -> UI state/revision -> immutable save snapshot -> promise queue
  | nil/invalid fields: cleanArticle or native validate
  | empty body: valid article; remains writable/exportable
  | stale acknowledgement: compare current ID + full document snapshot
  | disk failure: false result, visible error, keep working or export
  v
native mutex -> validated stable ID -> rotate backups -> temp flush -> rename
  | corrupt main: newest valid backup, visible recovery
  | no valid backup: fail entire load; original files preserved
  | unavailable configured root: ARCH-01 accepted remedy
  v
Saved only when current document still equals acknowledged snapshot
```

Existing switch/new/import transitions call leaveArticle and use transitioning /
setWorkspaceBusy. Tests already cover failed save and late edits during switch.
No duplicate queue or generalized state framework is justified by the finding.

DATA-01 invariant: after the user confirms Clear, the operation must not silently
erase text entered while waiting or allow an overlapping application save to
repopulate cleared data while reporting completion. This is distinct from
SEC-01's deletion-failure reporting. SEC-01 approval does not approve DATA-01.

Clear awaits an existing saveQueue snapshot but never marks transitioning or
calls setWorkspaceBusy. The user can continue typing, producing new timers and
queued writes outside the awaited snapshot. The clear caller then replaces state
and textarea with a fresh document regardless of those newer edits.

```
Case A: save finishes before clear
Clear action                 Typing/save                  Shared state
confirm, await clear IPC  ->                              old article visible
                             type new text               new state + save timer
                             save completes              new text persisted
clear completes                                          backend emptied
reset editor                                             new text disappears
fresh consumer                                          empty library/editor

Case B: clear finishes before queued save
Clear action                 Typing/save                  Shared state
confirm, await clear IPC  ->                              old article visible
                             type new text               new state + save timer
                             submit save (waiting)        queued old-ID snapshot
clear completes                                          backend emptied
reset editor                                             blank new article
                             save completes              old-ID text reappears
fresh consumer                                          UI says cleared; storage has text
```

No application barrier excludes either completion order: clearing does not own
saveQueue to completion. The Rust mutex serializes individual filesystem commands
but does not prevent a later write after clear. The replay models serialized
storage completions in both orders; it does not simulate OS filesystem locking.

Reproduction /private/tmp/blunted-ceo-clear-race.mjs reuses the existing UI
harness and disposable in-memory backend. Measured outputs:

```json
{"order":"save-before-clear","editingEnabled":true,"editorAfterClear":"","simulatedDisk":[],"status":"Local data cleared"}
{"order":"clear-before-save","editingEnabled":true,"editorAfterClear":"","simulatedDisk":["New writing entered after clear began."],"status":"Local data cleared"}
```

Evidence kind: controlled UI/ordering replay with mocked storage. It proves
missing UI exclusion and state reset in both schedules, not the timing frequency
of installed Mac/Windows IPC. No user writing or native library was touched.
The recommended smallest remedy reuses the existing workspace transition guard.
Other Section 4 boundaries (backup/import/recovery) remain under review; this
section is not claimed complete before its decisions are settled.

## Answered decision (DATA-01)

D6 user answer: **A**. Accepted exactly the exclusive-clear boundary and coupled regression coverage. Alternatives retained below are history.

| Commitment | Source/approval or pending | Current | A | B |
|---|---|---|---|---|
| Earlier accepted remedies | D2 A–D5 A | Accepted | Unchanged | Unchanged |
| Delete-error semantics | SEC-01 D4 A | Truthful complete/partial/failed required | Unchanged | Unchanged |
| Clear/edit/save overlap | Existing writing and clear expectations | Editing and new saves allowed during clear | Exclusive transition; lock editing/mutations; drain saves; cancel/invalidate pending writers through completion | Concurrency remedy unresolved |
| Failure result | SEC-01 D4 A | Preserve working editor required | Unlock and preserve editor on failure | Unchanged |
| Regression proof | Coupled proposed remedy | No clear-vs-save schedule coverage | Both completion orders, second clear, pending timers, failure unlock and no post-success resurrection | No new test plan selected |
| Implementation now | Review only | None | None | None |

Question: D6 — DATA-01: Should Clear local data temporarily block editing and other mutations?
Project: blunted on main, whole-product review in HOLD SCOPE. SEC-01 and all earlier accepted remedies remain unchanged.
ELI10: Clearing storage takes time. The editor currently stays writable while it waits, so new text can be erased or saved back after clearing. Controlled tests reproduced both completion orders with a simulated storage backend.
Stakes: Writing entered during Clear can disappear, or stored writing can return while the UI says it was cleared.
Recommendation: A because reusing the existing transition guard and save queue gives Clear one exclusive boundary without a new storage system.
Note: options differ in kind, not coverage — no completeness score.
Net: Plan an exclusive clear operation, or retain this concurrency gap unresolved. Neither option authorizes implementation or actual deletion.
Header: Clearing while typing
A) Plan exclusive clearing (recommended)
Effort M (human: about 4 hours / CC+gstack: about 45 minutes), low risk. Reuse the transition guard to block editing and competing mutations, drain queued saves, and cancel or invalidate pending save/preferences timers through clear completion. Keep SEC-01's failure behavior; unlock safely afterward. Verify both completion orders, repeated Clear, pending timers, failure recovery and no post-success data resurrection. ✅ Prevents new writing from being erased during an in-flight clear. ✅ Stops pending application writes from recreating data after success. ❌ Editing pauses briefly while storage clearing finishes or fails.
B) Leave finding unresolved
Effort S (human: about 1 hour / CC+gstack: about 20 minutes), high risk remains unresolved. Zero implementation work; retain the controlled replay and seek installed-app timing evidence before choosing an exclusion policy. ✅ Preserves the distinction between mocked ordering and native timing. ✅ Leaves the accepted deletion-error remedy unchanged and separate. ❌ Keeps an evidenced concurrent-edit race without an accepted prevention plan.


### DATA-01 accepted remediation

D6 A requires clear to use the existing transition guard, temporarily block
editing and competing mutations, drain queued writes and cancel/invalidate pending
save/preferences timers through completion. Preserve SEC-01's truthful failure
reporting and editor retention, then safely unlock. Required regressions exercise
both save/clear completion orders, repeated Clear, pending timers, failure unlock
and absence of post-success data resurrection. Existing article-switch behavior
must remain unchanged. Estimated app.js/workspace.test.js and native integration
fixtures if needed; human ~4h / Codex+gstack ~45m. No implementation authorized.


### DATA-02: Restore must use one accepted backup and option snapshot

Static receipt: app.js:1317 lets Cancel set pendingRestore=null while a restore
is running; setWorkspaceBusy does not disable restoreCancel/libraryRestore/
libraryPick/restoreConflict/restoreSettings. The for-of starts from backup A,
but options and pendingRestore.settings are read after each awaited write.
A second successful FileReader can replace pendingRestore with backup B.

Invariant: one confirmed restore uses only the validated backup and conflict/
settings choices that the writer confirmed. Cancellation before starting remains
available. Existing partial-import reporting and no-overwrite guarantees remain
required; no transactional rollback or new mid-import cancellation is proposed.

```
Restore A                    Competing action           Shared state
confirm A -> await save A                                pendingRestore=A
                             Cancel                     pendingRestore=null
save A completes                                         article A committed
read settings                                            TypeError, no result

confirm A -> await save A                                pendingRestore=A
                             choose/read B              pendingRestore=B
save A completes                                         article A committed
read settings                                            B's preferences saved
fresh backup consumer                                    A content + B settings
```

Reverse order: Cancel completing before Confirm leaves pendingRestore null so
Confirm exits safely. Selecting B before Confirm should intentionally restore B.
Only the later action during A's awaits violates the accepted-input boundary.
Existing transitioning blocks a second Confirm but not Cancel, file callbacks or
live option changes. The native mutex cannot fix mutable renderer state.

Controlled replay /private/tmp/blunted-ceo-restore-race.mjs (existing UI harness,
mocked paused save, synthetic backup data) measured:

```json
{"action":"cancel","cancelDisabled":false,"pickerDisabled":false,"savedBodies":["Content from backup A."],"savedThemes":[],"rejected":"Cannot read properties of null (reading 'settings')","status":""}
{"action":"replace-backup","cancelDisabled":false,"pickerDisabled":false,"savedBodies":["Content from backup A."],"savedThemes":["dark"],"rejected":null,"status":"Imported 1 articles. Existing articles were kept. Writing preferences restored."}
```

The dark setting belongs to backup B; A requested light. This proves UI operation
state changes under controlled completion ordering, not native dialog timing.
No personal backup or filesystem was accessed. Repair belongs at the single
restore-operation boundary, reusing the current transition guard and validation.

## Answered decision (DATA-02)

D7 user answer: **A**. Accepted exactly the stable-restore input boundary and coupled regression coverage. Alternatives below are retained as history.

| Commitment | Source/approval or pending | Current | A | B |
|---|---|---|---|---|
| Earlier accepted remedies | D2 A–D6 A | Accepted | Unchanged | Unchanged |
| Selected backup/options | Existing explicit restore contract | Mutable after Confirm | Local snapshot before awaits; use it for all articles/options/settings | Remedy unresolved |
| Competing input | Pending correction | Cancel/picker/options can change operation state | Lock competing restore controls and ignore stale/competing reader callbacks during operation | No policy selected |
| Cancel before Confirm | Existing behavior | Available | Unchanged | Unchanged |
| Partial import and no overwrite | Existing behavior | Required | Unchanged | Unchanged |
| Regression proof | Coupled pending remedy | No in-flight Cancel/backup replacement test | Before/during completion orders; immutable options; no mixed restore; visible partial failure and unlock | No extra test plan selected |
| Application changes now | Review only | None | None | None |

Question: D7 — DATA-02: Freeze backup restore inputs after confirmation?
Project: blunted on main, whole-product review in HOLD SCOPE. Earlier accepted remedies remain unchanged.
ELI10: Restore keeps reading its choices while saves are running. Cancelling can cause an exception after an article imports; selecting another backup can combine the first backup's articles with the second backup's settings. Both happened in controlled UI replays.
Stakes: The restored library can differ from the backup and choices the writer confirmed.
Recommendation: A because one stable operation snapshot and the existing transition guard prevent mixed input without adding a new restore system.
Note: options differ in kind, not coverage — no completeness score.
Net: Make one confirmed restore use one stable set of inputs, or retain this restore race unresolved. Neither option authorizes implementation.
Header: Restore input race
A) Plan stable restore inputs (recommended)
Effort M (human: about 4 hours / CC+gstack: about 45 minutes), low risk. Snapshot the validated backup, conflict choice and settings choice before awaiting saves; lock competing restore controls and reject stale/competing file-reader callbacks until completion. Keep pre-confirmation Cancel, existing partial-import reporting and no-overwrite behavior. Verify both action orders, changed options, cancellation, second backup selection, failure reporting and safe unlock. ✅ Prevents articles and settings from different backups being combined. ✅ Eliminates the reproduced Cancel exception while preserving existing recovery choices. ❌ Once writing starts, the user must wait for completion or a reported partial failure before changing restore inputs.
B) Leave finding unresolved
Effort S (human: about 1 hour / CC+gstack: about 20 minutes), high risk remains unresolved. Zero implementation work; keep the replay evidence and seek an installed-app interaction reproduction before selecting a locking policy. ✅ Keeps controlled UI evidence separate from native dialog behavior. ✅ Leaves all earlier accepted remedies and restore guarantees unchanged. ❌ Retains an evidenced mixed-backup and exception path without an accepted prevention plan.


### DATA-02 accepted remediation

D7 A requires a local snapshot of validated backup, conflict choice and settings
choice before asynchronous restore work. Lock competing restore inputs and reject
stale/competing file-reader callbacks through completion. Preserve Cancel before
confirmation, existing partial-import reporting and no-overwrite behavior.
Regression proof covers both action orders, changed options, in-flight Cancel,
second backup selection, partial failures and safe unlock. Estimated app.js and
workspace.test.js; human ~4h / Codex+gstack ~45m. Application source is unchanged.


### DATA-03: Portable recovery rotation destroys the last valid stored copy

Invariant from SECURITY.md: corrupt JSON/full or disabled storage must never
destroy the last-good draft silently. Portable backup recovery reads a, then b,
then c. If only c is valid, initWith recovers it and schedules saving. Before
saving the recovered snapshot as main, store.save rotates c<-b, b<-a, a<-main
without validating the previous values. All stored slots can become invalid;
a failed main write then leaves no persisted valid article.

```
INPUT                       VALIDATION       TRANSFORM/PERSIST         OUTPUT
main invalid; a/b invalid -> recover c     -> rotate corrupt b over c -> no valid backup
c valid                                       rotate a/main too
recovered article in memory                 -> save main (quota fail) -> failed status
next load                                   -> parse all slots       -> no recovery
```

This is a sequential failure; no competing write or unusual async order is
required. Native library::save differs: it rotates only when read(main) validates,
so that guard is a useful existing pattern rather than a reason for a rewrite.

Controlled script: /private/tmp/blunted-ceo-backup-rotation-failure.mjs. It seeds
only synthetic localStorage values, implements an aggregate stored-value size
limit and throws QuotaExceededError when a proposed write exceeds that limit.
It does not fail arbitrarily by key. The limit is fixture-sized, not a claim
about any browser's quota. Initial recovery and preference writing succeed;
rotation then overwrites the only valid backup, and the larger main snapshot
exceeds the available fixture capacity.

```json
{"evidence":"aggregate-quota storage replay","quotaLimit":473,"validSlotsBefore":["blunted.backup.v1c"],"validSlotsAfter":[],"status":"Saving failed","editor":"Only valid saved writing."}
```

Evidence kind: portable UI/storage replay under a modeled quota. The codepath
and before/after valid-slot counts are observed; real-browser quota sizes and
filesystem durability are not inferred. No user localStorage was accessed.
The write error is visible, but destructive backup rotation itself is not;
the editor copy is the sole remaining valid article in this replay.

## Answered decision (DATA-03)

D8 user answer: **A**. Accepted exactly the last-valid-copy requirement and coupled regression proof. Retained alternatives are history.

| Commitment | Source/approval or pending | Current | A | B |
|---|---|---|---|---|
| Earlier accepted remedies | D2 A–D7 A | Accepted | Unchanged | Unchanged |
| Last-good saved copy | SECURITY.md | Can be overwritten by corrupt values before failed save | Preserve at least one valid stored copy until replacement main successfully stores | Remedy unresolved |
| Three rotating backups | Existing portable behavior | Required | Preserve three-slot scheme; validate recovery/rotation inputs | Unchanged |
| Failed save experience | Existing failure contract | Error shown; editor preserved | Preserve editor/export and expose backup failure where relevant | Unchanged |
| Regression proof | Coupled pending remedy | No recovered-c plus quota failure test | Recover from each slot; failure at each write; reload recovers valid old or new snapshot; corrupt inputs never replace sole valid copy | No extra test plan selected |
| Implementation now | Review only | None | None | None |

Question: D8 — DATA-03: Preserve the last valid portable backup when saving recovered text fails?
Project: blunted on main, whole-product review in HOLD SCOPE. Earlier accepted remedies remain unchanged.
ELI10: The portable app can recover your article from its oldest backup, then overwrite that backup with corrupt data before the new save succeeds. In a controlled quota test, the new save failed and no valid stored copy remained, although the text was still open in the editor.
Stakes: Closing or reloading after that failure can remove the only remaining way to recover the article.
Recommendation: A because retaining a validated copy until replacement succeeds satisfies the existing last-good-draft promise with a focused storage repair.
Note: options differ in kind, not coverage — no completeness score.
Net: Plan safe backup replacement, or keep this reproduced recovery gap unresolved. Neither option authorizes implementation.
Header: Last valid backup
A) Plan safe backup replacement (recommended)
Effort M (human: about 4 hours / CC+gstack: about 45 minutes), low risk. Validate rotation inputs and preserve at least one valid stored copy until a valid replacement main save succeeds; retain the three-slot scheme and editor/export on failure. Reuse the native validated-main rotation pattern where applicable. Test recovery from every slot, failure at each write, quota pressure and successful reload of a valid old or new snapshot. ✅ Prevents failed recovery saves from destroying the sole valid stored article. ✅ Verifies the persisted recovery path rather than relying on text remaining open. ❌ Rotation and backup-write failures need more explicit handling and fixtures.
B) Leave finding unresolved
Effort S (human: about 1 hour / CC+gstack: about 20 minutes), high risk remains unresolved. Zero implementation work; retain the quota replay and seek a real-browser reproduction before selecting a rotation remedy. ✅ Keeps modeled quota evidence separate from browser-specific limits. ✅ Preserves the existing recovery promise and all prior accepted remedies. ❌ Leaves a reproduced last-valid-copy loss path without an accepted prevention plan.


### DATA-03 accepted remediation

D8 A requires validating portable rotation inputs and preserving at least one
valid stored copy until a valid replacement main successfully stores. Preserve
the existing three-slot backup scheme and the editor/export failure path.
Regression coverage must recover from each slot, fail individual writes, model
quota pressure and confirm reload finds a valid old or new snapshot. Reuse the
native validated-main guard where applicable; no storage rewrite is approved.
Estimated app.js/workspace.test.js, human ~4h / Codex+gstack ~45m. Plan only.


### Section 4 interaction coverage and disposition

| Interaction / boundary | Edge case | Existing handling or accepted plan | Evidence boundary |
|---|---|---|---|
| Article switch/new | save rejection or late edit | Refuse transition; preserve current writing | Existing controlled JS fixtures |
| Normal autosave | old acknowledgement/new edit | ID and full-snapshot equality guard | Existing deferred-save fixture |
| Native load | missing/corrupt article, backup-only identity | Recover valid backup or fail load preserving originals | Five local Rust tests include these paths |
| Stable identity | same-title articles and traversal ID | Independent IDs; validate path token | Local Rust tests |
| Empty library/body | no saved articles; zero-length prose | Fresh article; empty body valid | UI and engine fixtures; no minimum writing requirement |
| Backup validation | wrong version/type/duplicate IDs | Validate whole backup before writing | Existing writer fixtures |
| Restore conflicts | copy/skip and partial write failure | No overwrite; per-article progress; DATA-02 fixes mutable inputs | Fixtures plus controlled race replay |
| Clear | double action/typing/pending writes | DATA-01 accepted exclusive transition; SEC-01 accepted truthful failures | Both-order mocked replay; not fixed yet |
| Portable recovery | corrupt main and quota failure | DATA-03 accepted last-valid-copy protection | Aggregate-quota replay; not fixed yet |
| Network/back button/jobs | remote outage, retry jobs | No remote app flow or server jobs; browser navigation falls under portable beforeunload | Static architecture; no new network feature |

No new capacity, sync, encryption, multi-process conflict mechanism or file-format
expansion is proposed. External modification and simultaneous app instances have
not been accepted or tested as conflict-safe use cases; no conflict-safety claim
is made. Three Section 4 remedies are approved, not implemented. Section 4 is
complete for this review boundary with DATA-01/02/03 governed by D6/7/8 A.

## Section 5: Code Quality Review

WARNING: app.js is 1,654 lines [measured: wc -l src/ui/app.js] and mixes storage,
view state, rendering and handlers. Several handlers branch more than five ways,
notably restoreConfirm and initialization. This makes asynchronous operation
boundaries easy to overlook; DATA-01/02 provide concrete evidence of that cost.
A wholesale module rewrite would add risk without improving the accepted
outcomes. Preserve the engine/writer/native boundaries, and implement the already
approved guards/immutable snapshots/shared analysis rescue at their owning
boundaries. No independent extraction project or new service is proposed.

The pure writer module is 88 lines [measured: wc -l src/writer/article.js] and the
native library is 245 lines [measured: wc -l src-tauri/src/library.rs]. Existing
validation, promise queue, revision counter, native mutex and unavailable-library
state are the reuse points. Similar-looking UI handlers are not alone grounds
for extraction. Tests and fixtures sometimes use compressed one-line code; this
is a readability concern, not evidence requiring unrelated formatting changes.

Complexity check: expected union is about 8–10 changed source/test/config/docs
files [estimated], with no new service/class. Every boundary serves an accepted
repair or required verification. Fewer new abstractions, not fewer correctness
requirements, is the appropriate reduction. No deferral or scope cut is proposed.
Section 5 disposition: maintainability concern recorded; no new remedy decision
needed beyond already accepted focused changes.

## Section 6: Test Review

Existing evidence remains 58 JavaScript tests and five Rust tests [measured:
commands recorded in System audit]. Source has not changed during this review.
The browser-like JS harness is a VM with fake DOM, FileReader and IPC; it cannot
prove browser layout, native dialogs, undo, permissions, IME or screen readers.
The Rust tests use real disposable filesystem roots but do not test an installed
release app. This distinction is already explicit in article-workspace.md:74-97.

```
engine + writer --------------------------> unit fixtures (existing)
  empty/Unicode/Markdown/offsets             known arithmetic/rules assertions
UI save + switch ------------------------> VM integration fixtures (existing)
  save rejected / stale ack / late edit
native library --------------------------> Rust filesystem fixtures (existing)
  migration / same titles / corruption
accepted root/analysis/clear/restore -----> coupled regressions (planned, D2-D8)
  failures + both await orders + retry
installed Mac/Windows -------------------> existing acceptance gate (pending)
  offline install/launch + permissions + undo
real writers + assistive technology ----> existing acceptance gate (pending)
```

| Requirement / approval | Observable assertion and rejected wrong result | Verification / no_claim |
|---|---|---|
| ARCH-01 D2 A | Unavailable configured root produces no alternate article write/acknowledgement | Native root fixtures + caller integration; no_claim=installed acceptance until run |
| ERR-01 D3 A | Current failure clears busy and shows error; stale failure cannot replace newer success; writing/save/export remain usable | Controlled engine/worker failures and retry; no_claim=real-document trigger or native rendering |
| SEC-01 D4 A | Clear never reports complete after non-benign removal failure; editor retained; partial progress truthful | Portable failures and disposable native files; no_claim=secure disk erasure |
| SEC-02 D5 A | Removed plugin commands denied while selected-folder/library/export flows succeed | Native build and disposable IPC checks; no_claim=absence of all vulnerabilities |
| DATA-01 D6 A | Both clear/save schedules prevent editing loss and post-clear resurrection | Controlled pauses/timers/competing actions; no_claim=all OS IPC timing |
| DATA-02 D7 A | Every restored article and settings value belongs to confirmed snapshot; Cancel before start works; in-flight competing inputs cannot mutate it | Controlled callback/save orders; no_claim=native picker timing |
| DATA-03 D8 A | After any failed write, reload finds at least one valid prior/new snapshot; every recovery slot covered | Aggregate quota/write-fault storage fixture; no_claim=browser quota amount or disk durability |

These seven regression gaps are covered by their individual accepted remedies;
no separate test expansion is silently added. Friday-night confidence for these
repairs means verifying preserved prose after failure/reload, not only checking
success labels. Hostile/chaos cases are the already-approved removal errors,
paused saves, competing callbacks and quota failures. Fixtures should use
explicit pause/release points rather than wall-clock sleeps or random timing.
No LLM/prompt/eval surface exists in this app. Pyramid: many pure/unit and mocked
UI tests, fewer native filesystem tests, and uncompleted installed acceptance.
Section 6 disposition: planned coverage follows D2–D8 exactly; existing external
acceptance requirements remain pending and are not waived.

## Section 7: Performance Review

WARNING: typing latency and installed startup/memory are unverified. The existing
representative fixture measured 1,111 / 5,107 / 20,203 analyzed words at 7.3 / 17.9 /
60.5 ms respectively [measured: this review's npm test output]. Those are single
Node engine+structure runs, not p99, browser typing latency or hardware promises.
The 233,456-byte portable artifact is measured in System audit; deterministic
bytes do not imply responsive input.

Top candidate slow paths: native full-library scan/JSON parsing at startup;
main-thread fallback plus layout/passage measurement on a long article; repeated
full-document/array snapshots and dismissal-key matching. p99 and memory ceilings
are unknown, not estimated as results. A tenfold/hundredfold larger library will
increase retained article bytes and serialized IO, but no saturation threshold
was measured. Load reads full bodies; UI renders library titles without paging.
Worker fallback can put analysis back on the input thread; a worker alone does
not establish typing responsiveness. No caching rewrite is justified without
profiling. There is no DB/index, connection pool, N+1 ORM query, server worker or
network retry budget to tune. Existing hardware latency acceptance remains the
right gate; no new performance feature or benchmark suite is proposed.
Section 7 disposition: evidence limitation retained under existing acceptance;
no new implementation decision or relaxation is proposed.

## Section 8: Observability & Debuggability Review

Local save/status notices, per-operation library messages and the existing
recovery/release docs are the app's operational surfaces. No network telemetry,
remote dashboard, analytics service or prose logging is appropriate: those would
violate the existing local-only/no-telemetry contract. Alerts here mean visible
and announced local failures, not external monitoring. A support report can use
version/hash, OS, operation and a synthetic reproduction, following SECURITY.md.

Accepted ERR-01 and SEC-01 close two silent-reporting paths. ARCH-01 preserves
storage identity. Native error strings often lose their context at UI catch
sites; diagnostics remain limited and must not be represented as a complete
incident trace. No additional diagnostic export/logging subsystem is proposed.

OBS-01 is a remaining concrete silent failure: prepareClose catches savePrefs
rejection and returns true. The scheduled preference-save path already shows a
failure notice, but the final close path does not. Controlled replay
/private/tmp/blunted-ceo-close-preference-failure.mjs changes theme to dark,
rejects savePrefs, then calls prepareClose:

```json
{"allowedToClose":true,"themeInMemory":"dark","message":"","articleText":"A saved article.","preferencesSaved":0}
```

Evidence kind: injected IPC failure in existing UI harness; article text stays
intact. Actual installed preference-write failure and OS close behavior remain
unverified. This is medium severity, not article-text loss. A close-time error
needs explicit handling rather than catch-and-ignore.

## Answered decision (OBS-01)

D9 user answer: **A**. Accepted exactly the visible close-time recovery and coupled tests. Alternatives below are history.

| Commitment | Source/approval or pending | Current | A | B |
|---|---|---|---|---|
| Earlier remedies | D2 A–D8 A | Accepted | Unchanged | Unchanged |
| Final preference write fails | Visible failure contract; app.js:1425 | Silently allow close | Show failure; retry or explicitly close without saving preferences | Remedy unresolved |
| Article contents/save protection | Existing contract | Separate from preferences | Preserve existing article save/leave protections | Unchanged |
| Telemetry/logging | Existing non-goal | None | None added | None added |
| Regression proof | Coupled proposed remedy | No close-preference-failure assertion | Rejection, retry success, explicit preference-only discard, no article mutation | No extra test plan selected |
| Implementation now | Review only | None | None | None |

Question: D9 — OBS-01: Make preference-save failures visible before closing?
Project: blunted on main, whole-product review in HOLD SCOPE. Earlier accepted remedies remain unchanged.
ELI10: The app makes a final attempt to save preferences when closing. If that write fails, it currently hides the error and closes anyway. A controlled replay kept the article intact but lost the preference write without any warning.
Stakes: Settings or working position can disappear on reopen while the writer believes closing saved everything.
Recommendation: A because a visible retry or explicit preference-only discard removes a silent failure while preserving article safety.
Note: options differ in kind, not coverage — no completeness score.
Net: Plan an honest close-time preference decision, or leave the reproduced silent-failure path unresolved. Neither option authorizes implementation.
Header: Preferences on close
A) Plan visible close recovery (recommended)
Effort S (human: about 2 hours / CC+gstack: about 20 minutes), low risk. Show a final preference-save failure and keep the window open until retry succeeds or the user explicitly chooses to close without saving preferences. Preserve article-save protections and add rejection, successful retry, explicit preference-only discard and no-article-mutation regressions. ✅ Prevents silent loss of settings and working position during closing. ✅ Keeps article safety separate from an explicit preference-loss choice. ❌ A failed preferences write adds one close-time decision for the user.
B) Leave finding unresolved
Effort S (human: about 30 minutes / CC+gstack: about 15 minutes), medium risk remains unresolved. Zero implementation work; retain the injected failure evidence without choosing a close policy. ✅ Keeps synthetic IPC evidence separate from installed OS behavior. ✅ Leaves article protection and all prior accepted remedies unchanged. ❌ Keeps an observed silent close-time failure without an accepted recovery plan.


### OBS-01 accepted remediation

D9 A requires visible final preference-save failure, retaining the window until
retry succeeds or the writer explicitly chooses to close without saving
preferences. Keep article save/leave guards independent and intact. Coupled tests
cover rejection, successful retry, explicit preference-only discard, and no
article mutation. Estimated app.js, shell.html if required for the distinct close
choice, workspace.test.js; human ~2h / Codex+gstack ~20min. No telemetry added.
Section 8 disposition: OBS-01 resolved by D9 A. Diagnostic limitations remain
explicit; no new logging/export subsystem is proposed.


## Section 9: Deployment & Rollout Review

Existing release evidence is docs/v1.0-release.md at release source ccaa8aa,
followed by CI ordering repair 7ee1664. Checksums and signature verification
establish artifact identity/integrity, not installed acceptance. This review's
portable byte match does not revalidate remote DMG/EXE assets or current CI.
Remote refresh failed as recorded in System audit; no latest remote success is
inferred. Mac remains Apple Silicon/ad-hoc-signed; Windows x64/unsigned. Paid
signing, notarization and Store distribution remain explicit non-goals.

Existing gates retained: installed Mac/Windows cold offline launch, real storage
permissions/errors and upgrade behavior, native Undo across modes, assistive
technology/IME/zoom acceptance, representative typing latency, and completed
article/backup workflow for each of five independent writers. No recruitment,
new user contact, live setting change or release publication is authorized.
Missing hardware/writer evidence remains pending; local tests cannot waive it.

```
accepted repairs -> local regressions -> deterministic portable + native builds
 -> candidate artifacts/hashes/signature checks -> installed offline/upgrade checks
 -> existing accessibility/performance/writer acceptance -> owner release decision
```

There is no hosted deployment, database migration or multi-service rollout.
Legacy article migration preserves originals and uses a deterministic identity;
a marker prevents repeated migration. Back up the library before any upgrade.
Partial imports already report progress; accepted DATA-02 stabilizes their inputs.
No runtime feature-flag service is needed for these correctness repairs. All
accepted fixes should be verified together against their direct regressions,
then the existing acceptance gates, without adding unrelated features.

```
bad candidate discovered -> stop distribution decision (owner)
 -> preserve/export current library -> withdraw affected version if authorized
 -> keep old tag immutable -> repair and verify next version
 -> restore compatible library/exports if needed
```

Binary rollback alone does not make pre-1.0 code understand multi-article files.
Never promise reverse migration without a verified data restore path. Existing
release docs already prescribe immutable withdrawn tags. First five minutes of
installed acceptance: verify downloaded hash, install/start offline, select a
disposable folder, edit/save/reopen. First-hour workflow: review/apply/undo,
export, backup and restore into a separate disposable library. These are existing
acceptance outcomes, not proof that this review executed them.

REL-01: deployment requirement conflict. README.md:51 says clean-machine offline
installation remains pending; v1.0-release.md:32 similarly lists offline installs.
The Windows release guide explicitly permits a network prerequisite to acquire
WebView2. tauri.conf.json uses embedBootstrapper, not offlineInstaller. We must
choose whether installation is self-contained offline or explicitly requires
runtime provisioning; silently selecting either would change a stated gate.

Primary sources checked this review:
- https://v2.tauri.app/distribute/windows-installer/#webview2-installation-options
  distinguishes embedBootstrapper (network required) and offlineInstaller (runtime
  installer embedded, larger package, works without installation-time internet).
- https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/distribution
  says offline deployment includes the Evergreen Standalone Installer and checks
  runtime presence. Runtime presence must be checked rather than assumed on every
  supported PC. No installed Windows test was run this review.

Both options retain offline writing/review, the no-app-network/no-telemetry
contract, unsigned distribution, no paid service, and every other acceptance
gate. Microsoft runtime provisioning/updating is distinct from app network calls;
no broader never-network OS guarantee is invented. Package size must be measured
from the built artifact rather than copied from documentation estimates.

## Answered decision (REL-01)

D10 user answer: **A**. Accepted exactly offline runtime-installer packaging and its coupled documentation/acceptance checks. Alternatives below are history.

| Commitment | Source/approval or pending | Current | A | B |
|---|---|---|---|---|
| Earlier accepted remedies | D2 A–D9 A | Accepted | Unchanged | Unchanged |
| Offline writing/review | Existing product contract | Required | Unchanged | Unchanged |
| Clean-machine offline installation with absent runtime | README.md:51 and release evidence vs Windows guide | Conflicting gate/prerequisite | Retain gate; plan offlineInstaller runtime embedding | Explicitly revise gate: prerequisite runtime provisioned first; only app operation offline |
| Windows download | Existing embedBootstrapper | Small; may fetch runtime | Larger self-contained installation package | Retain small bootstrapper |
| Docs/verification | Coupled packaging/gate choice | Inconsistent installation statements | Align docs; build/hash; offline VM tests with runtime absent/present and upgrade | Align docs; test prerequisite failure and provisioned-runtime offline launch/upgrade; withdraw self-contained installation claim |
| Other gates/paid signing | Existing contracts | Pending / non-goal | Unchanged | Unchanged |
| Implementation/publication now | Review only | None | None | None |

Question: D10 — REL-01: Must the Windows installer work offline when WebView2 is absent?
Project: blunted on main, whole-product review in HOLD SCOPE. Earlier accepted remedies remain unchanged.
ELI10: The app runs offline, but its current Windows installer may need internet to install WebView2 first. The release documents also list clean-machine offline installation as a pending requirement. Those are different promises and need one explicit choice.
Stakes: A writer on a disconnected PC without WebView2 can download blunted elsewhere and still be unable to install it.
Recommendation: A because embedding the offline runtime installer preserves the stated clean-machine offline-install gate; the tradeoff is a larger download.
Note: options differ in kind, not coverage — no completeness score.
Net: A preserves self-contained offline installation; B keeps the smaller installer and explicitly narrows installation support. Neither authorizes implementation or publication.
Header: Windows offline install
A) Plan offline installation (recommended)
Effort M (human: about 1 day / CC+gstack: about 1 hour, plus Windows acceptance availability), low risk. Plan Tauri offlineInstaller packaging, consistent documentation and generated artifact hashes. Require disconnected Windows installation with WebView2 absent and present, plus the existing upgrade/offline-app checks. ✅ Preserves the documented clean-machine offline-install requirement. ✅ Gives disconnected PCs a packaged path to the required runtime. ❌ The installer becomes substantially larger and needs real Windows acceptance.
B) Keep runtime prerequisite
Effort S (human: about 3 hours / CC+gstack: about 30 minutes, plus Windows acceptance availability), medium risk. Keep embedBootstrapper and explicitly revise the gate and user docs: WebView2 must be installed/provisioned before offline operation. Verify the missing-runtime prerequisite behavior and offline app use/upgrade with runtime present; all other gates stay required. ✅ Retains the smaller existing installer and packaging approach. ✅ Makes installation prerequisites explicit instead of implying offline setup. ❌ A disconnected PC without WebView2 still cannot install independently; this narrows the recorded installation requirement.


### REL-01 accepted remediation

D10 A retains clean-machine offline installation, using Tauri offlineInstaller
packaging. Align Windows/user/release documentation and record generated artifact
hashes. Verify disconnected installation with WebView2 absent and present, then
existing upgrade and offline app workflows. Installer size must be measured after
building. Estimated tauri.conf.json, win-release.md and corresponding release /
README evidence plus directly required checks; human ~1 day / Codex+gstack ~1h,
excluding Windows availability. No signing purchase, publication or live change
is authorized. Section 9 disposition: REL-01 resolved by D10 A; all existing
external acceptance gaps remain required and pending.


## Section 10: Long-Term Trajectory Review

The held scope remains a small offline article workspace for independent writers,
not a publishing, sync, AI, citation or collaboration platform. Preserve the
non-goals in README.md. The strongest near-term improvement is trust in stored
writing and clear recovery, supported by the accepted failure-path evidence.
Whether review advice improves real articles remains an acceptance question, not
an established differentiator or a reason to add more detectors.

Three-layer comparison: [Layer 1] focused Markdown editor/library/preview is a
well-established shape; iA's official Quick Tour describes that combination
(https://ia.net/writer/how-to/quick-tour). [Layer 2] the checked iA material also
emphasizes focused writing; it does not establish demand for blunted or prove a
market gap. [Layer 3] for this specific no-account/no-network product, safe local
recovery and individually chosen explanations are more directly connected to its
promise than feature breadth. This is an inference from the product contract,
not independent customer research. No expansion proposal follows from it.

Debt: the large UI module concentrates state knowledge; installed/user acceptance
is incomplete; release evidence and untracked marketing sources need explicit
provenance when used. These are recorded concerns, not a new cleanup/refactor
project. Existing architecture/workflow docs give a newcomer a useful entry;
the architecture tree's abbreviated tests description is incomplete compared
with current writer/workspace tests, so implementation documentation must describe
the accepted repaired paths accurately. Historical measurements stay historical.

Reversibility: 3/5 [review judgment], because source/config changes are reversible
but migrated library data and partial imports require backups/exports rather than
a blind binary downgrade. Retain stable IDs, atomic native writes, original legacy
files and explicit copy/skip behavior. A year from now, the pure-engine/writer,
UI-adapter and native-library split is understandable if operation boundaries
remain explicit. No new platform or custom persistence framework is justified.
Section 10 disposition: no new required choice; preserve current scope and all
D2–D10 accepted corrective requirements.

## Section 11: Design & UX Review

DESIGN_SCOPE is present: existing Write/Review/Read, dialogs and user-visible
failure states are being reviewed. This is source and saved-image review, not a
new live browser/device audit. Read docs/images/blunted-minimal-review.png and
blunted-minimal-read.png during this review; their provenance is historical
v1.0.0 documentation. Source CSS retains one 42rem article column, a 288px side
inspector from 1360px, and a bottom inspector below that breakpoint. The saved
images support the intended hierarchy; they do not verify current small-screen,
zoom or assistive-technology behavior.

The initial experience is article-first, with Articles and More opening tools.
Review exposes one note, its passage, explanation and individual Apply/Dismiss;
Read renders locally and omits remote images. This matches explanatory editorial
support, rather than claiming automatic semantic correctness. The saved Review
example's suggested replacement can change meaning; its explicit keep-original
warning and user choice are essential. No new semantic capability is proposed.

```
first launch -> select local folder / explicit fresh default -> Write article
  Write <-> Review -> inspect note -> Apply or Dismiss -> native Undo
    |          | failure -> ERR-01 visible state -> edit/retry
    +<-> Read + Outline -> export/print
    |
  Articles -> search/new/rename/trash/restore
    +-> backup -> choose file -> validate -> confirm fixed inputs -> import
    |                                              DATA-02 -> partial/error/success
    +-> Clear -> exclusive boundary (DATA-01) -> honest result (SEC-01)
  close -> flush article -> flush preferences -> success / OBS-01 explicit choice
  unavailable configured library -> ARCH-01 error/export/retry
```

| Feature | Loading | Empty | Error | Success | Partial |
|---|---|---|---|---|---|
| Library | Startup disables editing during load | Fresh article/no matching titles | Existing load block; ARCH-01 handles root identity | Loaded independent articles | Whole load stops on unrecoverable article; originals retained |
| Review/Outline | aria-busy after edits | No findings/self-review prompts distinct | ERR-01 accepted visible rescue | Current-revision notes and navigation | All notes incrementally accessible |
| Save | Saving status | Empty body valid | Keep writing/export; ARCH-01 stable location | Current snapshot acknowledged | Preferences can fail after article write; conservative failed result |
| Restore | Transition/read-only while saving | Empty backup validates | Rejection/partial progress; DATA-02 stable choices | Imported count | Per-article commits and explicit count |
| Clear | DATA-01 exclusive transition planned | Already absent succeeds under SEC-01 | SEC-01 accurate failure, retain editor | All intended removals succeed | Explicit partial result |
| Close | Wait for article/prefs | Clean article still saves prefs | OBS-01 accepted retry/explicit preference-only discard | Exit after protections | No promise of atomic article+preferences transaction |

Journey: start writing quickly; understand one review note; keep or reject it;
read the whole piece; export and reopen confidently. The accepted storage and
failure remedies protect the confidence part. No generic dashboard/redesign or
animation work is proposed. There is no separate DESIGN.md; CSS and existing
screenshots document the current intent, so absence alone is not a defect.

Accessibility sources provide native textarea, labels, dialog/focus restoration,
keyboard review/find controls, status announcements and forced-colors styling.
CSS supplies minimum control heights, not proof every target meets every size
criterion. Touch-target geometry, screen readers, IME, 200% zoom and real typing
remain existing acceptance requirements; no pass is inferred from labels/tests.
The accepted busy/error/exclusion states must retain those controls and focus
behavior. No new pixel-level remedy was established by this static review.
A later live design review can evaluate rendered behavior after implementation.
Section 11 disposition: reviewed; existing accepted failure-state requirements
apply, and existing device/accessibility acceptance remains pending.

## Outside Voice outcome

Preflight command reported CODEX_MODE: not_installed for Claude Code. Reviews
are enabled; no external provider was started. The specified native fallback
requires a Plan-agent type, background timer and TaskStop interface not offered
by this host. Per the skill, do not substitute a general-purpose agent.
Outside voice unavailable: install/repair the Claude Code provider or use a host
with the required bounded Plan-agent interface. Continuing with missing coverage.
No completed external or native fallback review, no independent finding count,
no clean verdict and no cross-model agreement are claimed. The prompt was prepared in private temporary storage, was not sent, and was
removed after the provider was found unavailable.
Outside history fields (not persisted): provider=claude-code, host=codex,
phase=plan-review, outside_status=unavailable, source=none, status=unavailable,
reason=CLI not installed and bounded native fallback unsupported. Durable
history writes under ~/.gstack are outside this task's writable roots.

## Binding decisions and approval readiness

User-approved review posture: MODE, D1 b, HOLD SCOPE.
Approved remedies and exact answer references:
- ARCH-01 / D2 A: stable configured library identity and specified regressions.
- ERR-01 / D3 A: visible recoverable analysis failure and specified regressions.
- SEC-01 / D4 A: truthful complete/partial/failed clear and specified regressions.
- SEC-02 / D5 A: remove unused filesystem-plugin authority and native verification.
- DATA-01 / D6 A: exclusive clear boundary and specified ordering regressions.
- DATA-02 / D7 A: stable confirmed restore inputs and specified callback regressions.
- DATA-03 / D8 A: preserve last valid portable copy and failure/reload regressions.
- OBS-01 / D9 A: visible final preference failure, retry/explicit discard, tests.
- REL-01 / D10 A: offline Windows runtime packaging, docs and installed checks.

All are plan approvals, not proof of implementation, installed acceptance,
publication, user contact or paid spending authority. No proposed B alternative
is accepted; each remains decision history. No scope addition/cut/deferral was
selected. No unresolved plan remedy or TODO proposal remains.
Approval readiness: PASS — MODE D1 b and ARCH-01 D2 A, ERR-01 D3 A, SEC-01 D4 A,
SEC-02 D5 A, DATA-01 D6 A, DATA-02 D7 A, DATA-03 D8 A, OBS-01 D9 A, REL-01 D10 A.
Review navigation is an administrative choice and cannot change these remedies.


## NOT in scope

No newly proposed scope item was deferred or rejected, and no TODO was approved
for deferral. All nine accepted items repair existing promises or resolve their
delivery requirements. Deferred list: none. Rejected list: none. TODOS.md is not
created. Existing product non-goals remain unchanged: cloud/sync/accounts, AI,
publishing, collaboration, grammar/fact/citation/plagiarism systems, Linux
binaries, paid signing/Store distribution and telemetry. A broad UI rewrite,
custom storage framework or new diagnostics service is not part of any approval.

## What already exists

Reuse pure engine/writer functions, stable IDs and validated native writes;
reuse the UI revision guard, save promise queue and transition flag; reuse
load-failure/export messages and local status surfaces. Keep the current native
file-dialog/custom-command boundary when removing the unused fs plugin. Preserve
legacy originals, three rotating backups, explicit restore copy/skip decisions,
independent article dates and workspace positions. Existing tests and deterministic
builds are foundations; their passing result is not proof of the missing cases.

## Dream state delta

Completing the accepted plan would make the existing offline workflow safer and
its failure states understandable. It would not prove demand, article quality,
installed accessibility or hardware responsiveness. Those remain the documented
acceptance outcomes. No platform expansion is needed for the 12-month direction.

## Consolidated Failure Modes Registry

Planned remedies below are not implemented. CRITICAL GAP uses the skill's formal
rule for an unrescued, untested, user-silent failure, not a claim that each row
has Critical security severity. It includes medium-impact silent failures.

| Codepath | Failure mode | Rescued currently? | Existing direct regression? | User sees | Logged? | Accepted remedy |
|---|---|---|---|---|---|---|
| configured_dir/data_dir | Prior root missing/unreadable switches storage | N | N | Silent root-failure fallback | N | ARCH-01, CRITICAL GAP |
| analysis fallback | Current analysis exception | N | N | Silent busy state | N | ERR-01, CRITICAL GAP |
| store.clear/native individual deletes | Meaningful deletion error swallowed | N | N | Silent failure behind success | N | SEC-01, CRITICAL GAP |
| filesystem plugin | Excess unused renderer authority | Not a rescue path | N | No policy cue | N | SEC-02; static risk, no exploit claimed |
| clear handler | New edit/save overlaps clear | N | N | Silent text loss/resurrection behind success | N | DATA-01, CRITICAL GAP |
| restoreConfirm | Cancel/replacement mutates confirmed input | N | N | Silent mixed inputs or unhandled exception | N | DATA-02, CRITICAL GAP |
| portable rotation | Corrupt values replace sole valid backup before failed main write | N | N | Backup loss silent; main failure visible | N | DATA-03, CRITICAL GAP for backup loss |
| prepareClose | Final preference write rejected | N | N | Silent preference loss | N | OBS-01, CRITICAL GAP |
| Windows bootstrapper | Runtime absent on disconnected PC | N for self-contained install | N | Runtime acquisition/installer failure | Unknown | REL-01 |
| native library load | Corrupt/missing main, valid backup | Y | Y | Recovered notice | N prose logging | Existing Rust recovery tests |
| native library load | All copies unreadable | Y | Y | Library unavailable, files retained | N prose logging | Existing Rust and UI load fixtures |
| native library save | Traversal/invalid ID or write failure | Y | Y | Failed save | N prose logging | Existing invalid-path/write fixtures |
| UI save ack | Old save completes after newer edit | Y | Y | Remains editing until latest saved | N | Existing deferred-save fixture |
| switch/close article | Article save fails | Y | Y | Keep/Save/Discard choice | N | Existing failure/close fixtures |
| backup validation | Invalid version/type/duplicate ID | Y | Y | Backup rejected before writes | N | Existing writer/restore fixtures |
| restore article loop | Later article write fails after partial commits | Y | N for direct partial-count assertion | Explicit imported count | N | Preserved, direct proof coupled to DATA-02 |

Formal CRITICAL GAP count: seven [derived from the seven marked rows above].
These are current-product gaps with approved repairs, not seven unresolved review
decisions. Actual implementation and regression passes are still required.
The Section 2 map remains the Error & Rescue Registry; these rows add the
cross-section failure classification rather than replacing its exception/rescue
notes. Native io::Error/JSON/schema failures, storage QuotaExceededError/
SecurityError, worker failures and JS exceptions have distinct boundaries there.

## Consolidated State and Verification Diagrams

Accepted target operation boundaries (current gaps are documented in sections):

```
clean -> edit -> dirty -> queued immutable snapshot -> saving
                       ^                             |
                       | newer edit/old ack          +-> success + same snapshot -> clean
                       +-----------------------------+-> failure -> dirty + error/export

ready -> exclusive clear -> success -> fresh document
            |                 (pending writers invalidated)
            +-> failure/partial -> retained editor + honest status -> ready
ready -> snapshot confirmed restore -> sequential imports -> success -> ready
                  |                             +-> partial failure/count -> ready
                  + competing Cancel/picker/options blocked; stale callback ignored
```

Impossible target transitions: a root failure cannot acknowledge an alternate
save (ARCH-01); a stale result cannot enable Apply (ERR-01); overlapping typing
cannot silently race Clear (DATA-01); a second backup cannot mutate an active
restore (DATA-02); failed recovery saving cannot erase the sole valid stored
copy (DATA-03). Each is enforced by its approved boundary, not by a new service.

```
regression verification -> JS suite + Rust filesystem suite
 -> deterministic portable build + native packaging
 -> installer/IPC checks on disposable platform state
 -> existing installed/accessibility/hardware/five-writer acceptance
 -> release owner decides publication separately
```

Architecture, shadow data paths, operation schedules, error flow, UX journey,
state machine, test coverage, deployment and rollback diagrams appear above.
Stale diagram audit: docs/architecture.md's component map remains structurally
accurate; its abbreviated tests label omits writer/workspace coverage. No old
system diagram is replaced by an incompatible architecture. Review diagrams
mark accepted target behavior separately from current failures. No architecture
rewrite or diagram-only task is created.

## Premise evidence table

| Premise | Claim | Receipt | Verdict |
|---|---|---|---|
| Offline workflow exists | Write/Review/Read and local preview share article state | src/ui/app.js:1369-1400 | verified static + existing tests |
| Independent native articles exist | Validated IDs, separate files, recovery | src-tauri/src/library.rs:35-150 | verified local Rust tests |
| Current suite passes | JS and Rust counts recorded above | package.json:8; src-tauri/src/library.rs:153 | measured local run |
| Portable reproducibility | Two fresh outputs match release-recorded portable hash | docs/v1.0-release.md:26; scripts/build.mjs:85 | measured local build; remote assets unverified |
| Least privilege | Renderer filesystem grants exceed observed use | src-tauri/capabilities/main.json:9-19 | verified static; effective native denial pending |
| Offline installer mode exists | Installed CLI schema supports offlineInstaller | node_modules/@tauri-apps/cli/config.schema.json:2959 | verified local schema and official docs |
| Current remote state | PRs/assets/live CI are current | docs/v1.0-release.md:8-11 | unverified; fetch/CLI refresh failed |
| Installed platform acceptance | Clean Mac/Windows workflows pass | docs/article-workspace.md:87-91 | unverified |
| Assistive technology acceptance | Screen readers/IME/zoom/targets work | docs/accessibility.md:19-20 | unverified |
| UI/hardware performance | Representative typing/startup latency acceptable | docs/minimalism-validation.md:33-35 | unverified |
| Writer value | Each of five independent writers completed a real article workflow | docs/article-workspace.md:90-97 | unverified |
| Dependency advisories | Current dependencies have no relevant vulnerability | src-tauri/Cargo.lock:1; package-lock.json:1 | unverified; advisory scan not run |

unverified=6 [derived from the six unverified premise rows]. These are evidence
gaps; none is silently converted into a positive product claim.

## Reality check receipts

The default wave policy is quoted from the invoked skill: "default one PR per
wave". No .gstack/ship-policy.json exists in this checkout; no split is proposed.
This is planning only, not authority to create a PR. User remedy approvals come
from D2 A through D10 A, not from that default. There is no linked issue whose
requests were omitted. No accepted work is parked in a backlog.

REALITY: premise-table pass Evidence table distinguishes six unverified outcomes from source/local checks docs/ceo-review-2026-10-26.md:1
REALITY: already-done finding Existing release implements the base workflow; local origin/main log found no same-day repair; fetch blocked so remote duplication check incomplete 7c547a6
REALITY: surface-check pass npm/cargo/build commands executed; Tauri build help and installed config schema checked; nsis is Windows-only, not locally executed node_modules/@tauri-apps/cli/config.schema.json:2959
REALITY: binding-decisions pass All current human approvals retained in ledger; branch decision-search returned no prior records docs/ceo-review-2026-10-26.md:62
REALITY: numbers pass Counts/hashes/bytes locally measured; individual effort and file counts estimated; historical external claims remain unverified docs/ceo-review-2026-10-26.md:18
REALITY: deferred-asks pass No linked issue and no approved deferral; retained external acceptance remains mandatory docs/article-workspace.md:87
REALITY: pr-count pass Missing local ship-policy; retain quoted default single-wave policy; no PR creation authorized docs/ceo-review-2026-10-26.md:1
REALITY: prior-art finding Adopt documented offlineInstaller schema; no vendored patch; upstream issue/PR search not completed node_modules/@tauri-apps/cli/config.schema.json:2959
REALITY: contract-assumptions pass Runtime installer option checked in installed merged dependency schema; no cross-repo default imported node_modules/@tauri-apps/cli/config.schema.json:2959
REALITY: units pass Existing input units and analysis thresholds retained; no retune needed because accepted scope changes none src/engine/config.js:1
REALITY: perf-table finding arm64 Node v26.8.1 local fixture, one noninterleaved run; UI p50/p95 and pathological browser latency unmeasured tests/article.test.js:43
REALITY: dependency-fallback pass Offline runtime packaging needs Windows acceptance; absent it, no claim of completed offline installation docs/ceo-review-2026-10-26.md:1
REALITY: obligation-tiers pass All nine remedies remain required next implementation wave, none deferred; no service/class expansion docs/ceo-review-2026-10-26.md:62


PLAN_REALITY: phase=ceo rows=13/13 missing=none verdict=complete
First checker run found units marked n/a; repaired to pass with explicit unchanged
units/thresholds, then reran successfully. Upstream/live-remote/performance
coverage findings remain visible, not converted into passes.

## Implementation Tasks

Synthesized only from exact D2 A through D10 A approvals. These are unstarted
implementation tasks; review approval does not authorize editing application
source in this session. P1 blocks release; P2 should be completed in the same
repair wave. Verification commands refer to existing package scripts/CLI help;
platform checks are not claimed executed. No new cleanup, research or feature
project is added. Estimates exclude unavailable device/writer acceptance and
use the individual judgment estimates already shown in the decisions.

- [ ] **T1 (P1, human: ~8h / Codex+gstack: ~60min) — native storage: Preserve configured library identity.**
  - Surfaced by: ARCH-01 / D2 A; see its owning review section and answered decision.
  - Files: `src-tauri/src/main.rs`, `src-tauri/adapter.js`, `src/ui/app.js`, `tests/workspace.test.js`.
  - Work: Distinguish no config from unreadable/unavailable configured root; preserve pointer and original files; block alternate writes; expose export/retry.
  - Verify: Native root failure fixtures and UI caller checks: missing/read-error/cancel/root disappearance never write or acknowledge an alternate article.

- [ ] **T2 (P2, human: ~3h / Codex+gstack: ~30min) — analysis UI: Expose analysis failure and recovery.**
  - Surfaced by: ERR-01 / D3 A; see its owning review section and answered decision.
  - Files: `src/ui/app.js`, `tests/workspace.test.js`.
  - Work: Use one current-revision failure state, clear busy, disable stale Apply, preserve writing/save/export and retry next edit.
  - Verify: Worker failure, main/structure exception, successful retry and stale-error tests; npm test.

- [ ] **T3 (P1, human: ~4h / Codex+gstack: ~45min) — clear storage: Report accurate complete/partial/failed clear results.**
  - Surfaced by: SEC-01 / D4 A; see its owning review section and answered decision.
  - Files: `src/ui/app.js`, `src-tauri/src/main.rs`, `tests/workspace.test.js`.
  - Work: Propagate meaningful portable/native delete errors; already absent succeeds; retain editor on failure and report partial progress honestly.
  - Verify: Disposable storage deletion failures, partial progress, absent and successful cases; local JS/Rust checks.

- [ ] **T4 (P2, human: ~3h / Codex+gstack: ~30min) — desktop authority: Remove unused filesystem plugin authority.**
  - Surfaced by: SEC-02 / D5 A; see its owning review section and answered decision.
  - Files: `src-tauri/capabilities/main.json`, `src-tauri/src/main.rs`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`.
  - Work: Remove unused fs grants/registration/direct dependency; preserve custom library commands and dialogs.
  - Verify: Native build; disposable IPC confirms denied plugin commands and successful selected-folder load/save/recovery/export. Native platform proof remains pending until run.

- [ ] **T5 (P1, human: ~4h / Codex+gstack: ~45min) — workspace transitions: Make clear an exclusive operation.**
  - Surfaced by: DATA-01 / D6 A; see its owning review section and answered decision.
  - Files: `src/ui/app.js`, `tests/workspace.test.js`.
  - Work: Reuse transition guard and save queue; block editing/mutations, drain writes and invalidate pending writers through completion.
  - Verify: Both clear/save orders, repeated Clear, pending save/prefs timers, failure unlock and no data resurrection; retain T3 behavior.

- [ ] **T6 (P1, human: ~4h / Codex+gstack: ~45min) — restore: Freeze confirmed restore inputs.**
  - Surfaced by: DATA-02 / D7 A; see its owning review section and answered decision.
  - Files: `src/ui/app.js`, `tests/workspace.test.js`.
  - Work: Snapshot backup/conflict/settings choices; lock competing controls and reject competing/stale reader callbacks; preserve pre-confirm Cancel and partial/no-overwrite behavior.
  - Verify: Both action orders, changed options, in-flight Cancel, second backup, partial failure and safe unlock; no mixed-backup article/settings values.

- [ ] **T7 (P1, human: ~4h / Codex+gstack: ~45min) — portable recovery: Protect the last valid stored copy.**
  - Surfaced by: DATA-03 / D8 A; see its owning review section and answered decision.
  - Files: `src/ui/app.js`, `tests/workspace.test.js`.
  - Work: Validate rotation inputs; retain a valid stored copy until replacement main succeeds, preserving three backups and editor/export failure behavior.
  - Verify: Every recovery slot, each failed write, aggregate quota pressure and reload of a valid old/new snapshot; corrupt slots never replace the sole valid copy.

- [ ] **T8 (P2, human: ~2h / Codex+gstack: ~20min) — close: Handle final preference-save failure explicitly.**
  - Surfaced by: OBS-01 / D9 A; see its owning review section and answered decision.
  - Files: `src/ui/app.js`, `src/ui/shell.html`, `tests/workspace.test.js`.
  - Work: Show failure and keep window open until retry or explicit preference-only discard; preserve article guards.
  - Verify: Rejected write, successful retry, explicit preference-only discard and unchanged article contents; npm test plus native close acceptance when available.

- [ ] **T9 (P1, human: ~8h / Codex+gstack: ~60min) — Windows packaging: Package offline WebView2 installation.**
  - Surfaced by: REL-01 / D10 A; see its owning review section and answered decision.
  - Files: `src-tauri/tauri.conf.json`, `docs/win-release.md`, `README.md`.
  - Work: Use offlineInstaller, align prerequisite/support wording and record generated artifact hashes/size without altering historical release evidence.
  - Verify: Windows build and disconnected installation with runtime absent/present, upgrade and offline app workflows; no release until existing acceptance gates are met.


_No new tasks from Sections 5, 7, 10 or 11 beyond their applicable accepted
cross-section requirements._ Section 6 coverage belongs to its nine approved
repairs, not a separate speculative test expansion. Existing acceptance actions
remain mandatory under docs/article-workspace.md:87-97 and docs/accessibility.md:19-20;
record actual tester/device/version/hash/results before marking them complete.
This review did not recruit writers or authorize contacting anyone.

Task ordering: native root identity first; implement clear result/exclusion
repairs together while retaining their independent assertions; restore and
portable recovery next; analysis/close/authority repairs in the same wave; package
the verified result. Maintain the existing native mutex and UI queue, rather than
adding a new persistence layer. REL-01 depends on a Windows acceptance environment;
its absence blocks that acceptance claim, not local repairs.

Complete task aggregation records follow. The prescribed ~/.gstack task JSONL
file is **not persisted**, because that location is outside writable roots; the
records are preserved here in the permitted review artifact, not substituted
into another aggregator path. No task JSONL aggregation success is claimed.

```jsonl
{"phase": "ceo-review", "run_id": "2026-10-26-blunted-whole-product", "branch": "main", "commit": "7c547a6", "id": "T1", "priority": "P1", "component": "native storage", "files": ["src-tauri/src/main.rs", "src-tauri/adapter.js", "src/ui/app.js", "tests/workspace.test.js"], "effort_human": "8h", "effort_cc": "60min", "title": "Preserve configured library identity", "source_finding": "ARCH-01 / D2 A"}
{"phase": "ceo-review", "run_id": "2026-10-26-blunted-whole-product", "branch": "main", "commit": "7c547a6", "id": "T2", "priority": "P2", "component": "analysis UI", "files": ["src/ui/app.js", "tests/workspace.test.js"], "effort_human": "3h", "effort_cc": "30min", "title": "Expose analysis failure and recovery", "source_finding": "ERR-01 / D3 A"}
{"phase": "ceo-review", "run_id": "2026-10-26-blunted-whole-product", "branch": "main", "commit": "7c547a6", "id": "T3", "priority": "P1", "component": "clear storage", "files": ["src/ui/app.js", "src-tauri/src/main.rs", "tests/workspace.test.js"], "effort_human": "4h", "effort_cc": "45min", "title": "Report accurate complete/partial/failed clear results", "source_finding": "SEC-01 / D4 A"}
{"phase": "ceo-review", "run_id": "2026-10-26-blunted-whole-product", "branch": "main", "commit": "7c547a6", "id": "T4", "priority": "P2", "component": "desktop authority", "files": ["src-tauri/capabilities/main.json", "src-tauri/src/main.rs", "src-tauri/Cargo.toml", "src-tauri/Cargo.lock"], "effort_human": "3h", "effort_cc": "30min", "title": "Remove unused filesystem plugin authority", "source_finding": "SEC-02 / D5 A"}
{"phase": "ceo-review", "run_id": "2026-10-26-blunted-whole-product", "branch": "main", "commit": "7c547a6", "id": "T5", "priority": "P1", "component": "workspace transitions", "files": ["src/ui/app.js", "tests/workspace.test.js"], "effort_human": "4h", "effort_cc": "45min", "title": "Make clear an exclusive operation", "source_finding": "DATA-01 / D6 A"}
{"phase": "ceo-review", "run_id": "2026-10-26-blunted-whole-product", "branch": "main", "commit": "7c547a6", "id": "T6", "priority": "P1", "component": "restore", "files": ["src/ui/app.js", "tests/workspace.test.js"], "effort_human": "4h", "effort_cc": "45min", "title": "Freeze confirmed restore inputs", "source_finding": "DATA-02 / D7 A"}
{"phase": "ceo-review", "run_id": "2026-10-26-blunted-whole-product", "branch": "main", "commit": "7c547a6", "id": "T7", "priority": "P1", "component": "portable recovery", "files": ["src/ui/app.js", "tests/workspace.test.js"], "effort_human": "4h", "effort_cc": "45min", "title": "Protect the last valid stored copy", "source_finding": "DATA-03 / D8 A"}
{"phase": "ceo-review", "run_id": "2026-10-26-blunted-whole-product", "branch": "main", "commit": "7c547a6", "id": "T8", "priority": "P2", "component": "close", "files": ["src/ui/app.js", "src/ui/shell.html", "tests/workspace.test.js"], "effort_human": "2h", "effort_cc": "20min", "title": "Handle final preference-save failure explicitly", "source_finding": "OBS-01 / D9 A"}
{"phase": "ceo-review", "run_id": "2026-10-26-blunted-whole-product", "branch": "main", "commit": "7c547a6", "id": "T9", "priority": "P1", "component": "Windows packaging", "files": ["src-tauri/tauri.conf.json", "docs/win-release.md", "README.md"], "effort_human": "8h", "effort_cc": "60min", "title": "Package offline WebView2 installation", "source_finding": "REL-01 / D10 A"}
```

## Completion Summary

| Item | Result |
|---|---|
| Mode | HOLD SCOPE, user D1 b |
| System audit | Released workflow exists; no tracked source diff; untracked marketing and this review; stashes empty; remote refresh unavailable |
| Step 0 | Existing-product audit; nine exact remedies approved D2 A–D10 A; no feature additions/cuts |
| Section 1 Architecture | One root-identity issue, ARCH-01 |
| Section 2 Errors | Fifteen error/codepath rows mapped; analysis rescue gap governed by ERR-01; storage/close gaps governed by later accepted rows |
| Section 3 Security | Two issues; clear false-success has high privacy impact; unused grants are conditional exposure, no exploit demonstrated |
| Section 4 Data/UX | Ten interaction boundaries mapped; three corrective requirements DATA-01/02/03 |
| Section 5 Quality | One maintainability concern; no unrelated rewrite/extraction approved |
| Section 6 Tests | Coverage diagram and assertions produced; nine accepted remedy-specific verification requirements; current suite 58 JS + 5 Rust passes |
| Section 7 Performance | Representative UI latency/hardware acceptance missing; Node timing is not typing latency/p99 |
| Section 8 Observability | One additional silent close-time failure, OBS-01; no telemetry/logging service added |
| Section 9 Deployment | Runtime bootstrapper conflicts with offline-install gate; REL-01 approved; installed and writer acceptance pending |
| Section 10 Future | Reversibility 3/5 judgment; UI concentration, verification debt and provenance concerns retained |
| Section 11 Design | Source + two saved screenshots reviewed; accepted failure-state repairs apply; no live browser/device/a11y pass claimed |
| NOT in scope | Existing non-goals retained; no newly deferred/rejected scope items |
| Existing leverage / dream delta | Recorded; reuse present engine/UI/native boundaries and strengthen trust in the same product |
| Error/rescue registry | Section 2 mapped; consolidated failure registry has sixteen rows and seven formal CRITICAL GAP rows |
| Critical gap meaning | Current unrescued, untested, user-silent paths; approved remedies do not imply repairs have shipped |
| TODO proposals/updates | None; no TODOS.md created |
| Scope expansion proposals | None in HOLD SCOPE; nine corrective requirements accepted |
| CEO expansion archive/spec metrics | Skipped by HOLD SCOPE route; no 0H expansion archive required |
| Outside voice | Claude Code unavailable; bounded Plan fallback unsupported; no completed independent review |
| Lake Score | N/A; all decisions differed in kind and had no coverage score |
| Diagrams | Architecture, data/shadow paths, two-order schedules, error flow, UX, state, tests, deployment and rollback |
| Stale diagrams | No incompatible system diagram found; architecture tests annotation is abbreviated |
| Unresolved plan decisions | Zero; nine exact approvals retained |
| Reality rows | 13/13; six unverified premise outcomes remain explicitly unverified |
| Task artifact | Nine Markdown tasks and complete records persisted here; prescribed external task JSONL not persisted |
| Review metadata | History, question/decision logs and learnings outside writable roots not persisted; no success claimed |
| Review-read dashboard | NO_REVIEWS; skip_eng_review=false; required Eng Review missing |
| Implementation/release | Not started; no app code, remote setting, user contact or release asset changed |
| Review outcome | DONE_WITH_CONCERNS: review complete; nine approved repairs and external acceptance still outstanding |

Counts in this summary are derived from the named rows/sections above; measured
test/build values are traced to System audit. Review run count is this one
invocation continued across user decisions, not one run per D-number.

## Operational notes and artifact verification

Durable observations from this review: renderer transitions must freeze input and
exclude competing writers across awaits; a backup rotation must not overwrite a
sole valid recovery copy before main replacement succeeds; a mutex serializes
native calls but does not protect mutable UI operation state. These observations
are preserved in this review only. No memory/learning store was updated.
Best-effort history and brain writes are skipped because their prescribed roots
are not writable. The existing dashboard was read and returned NO_REVIEWS;
current review is unlogged, not a saved history entry. Cache refresh is likewise
not started because it writes outside writable roots. No background agent or
provider is running. Telemetry was off at skill start; do not imply transmitted
or saved analytics. An end-helper attempt will only be made after final gate /
review navigation if it can honor this boundary.

Approval readiness remains PASS against MODE D1 b and all nine D2 A–D10 A
remedies. Sections 1–10 and UI Section 11 are executed. Working review is saved
and verified below; no currentDecision remains. All former B menus are answered
history. Remaining product acceptance is not an unresolved plan choice.



## Review chaining decision (administrative; no remedy scope change)

Actual answer: D11 **A**, user authorized engineering review of this saved plan. No implementation authority or remedy scope changed.

D11 — Next review
Reply A, B or C. Options differ in kind, not coverage — no completeness score.

The CEO review has settled what needs correcting. Engineering review checks how
these storage, asynchronous-state and packaging repairs fit together before
implementation. Design review checks the detailed failure interactions and
accessibility. Neither was completed by this CEO review.

Recommendation: A because the accepted plan contains several interacting save,
clear and restore boundaries that need engineering review first.

A) Run engineering review next (recommended)
Effort M (human: about 1 day / Codex+gstack: about 1 hour), low risk. Run
/plan-eng-review on this saved plan, retaining the nine exact approvals. It checks
the storage/state contracts and regression design together, and addresses the
required engineering gate. It adds another review stage before implementation.

B) Run design review next
Effort M (human: about half a day / Codex+gstack: about 45 minutes), low risk. Run
/plan-design-review on the same accepted plan. It examines failure messages,
focus and disabled-control behavior, and helps retain accessible user journeys.
The required engineering review still remains afterward.

C) Handle further reviews manually
Effort S (human: about 5 minutes to record the handoff / Codex+gstack: about 1
minute), medium risk remains. End automated chaining and leave the saved plan
for the owner to arrange follow-up. It preserves all approvals and keeps timing
under the owner's control. Engineering review and installed acceptance remain
uncleared; zero implementation work is authorized by this choice.

Net: choose the next review workflow, or finish here with the saved plan. This
administrative selection does not approve implementation, release or any new
remedy and is excluded from the unresolved plan-decision count.


## Engineering review — target and scope record

Target and report destination: this saved plan, docs/ceo-review-2026-10-26.md.
The original CEO plan and all approvals above remain unchanged. Engineering
review is review-only, not implementation. D-numbering in this section belongs
to the engineering invocation, not the earlier CEO invocation.

Preparation: engineering D1 user “b” skipped office-hours and retained the saved
CEO plan as input. Engineering D2 user “A” confirmed Original arrangement:
estimated up to eleven existing files and zero new classes/services; no feature
cut, additional service or forced edit to an unnecessary file.

Scope record: feature answers = no cuts proposed; structure = A, engineering
D2; accepted scope = all nine CEO requirements ARCH-01 D2 A, ERR-01 D3 A, SEC-01
D4 A, SEC-02 D5 A, DATA-01 D6 A, DATA-02 D7 A, DATA-03 D8 A, OBS-01 D9 A and
REL-01 D10 A; pending remedies = none. Scope Challenge result: scope accepted
as-is (FULL_REVIEW). No implementation or extra proof-depth policy is approved
by the administrative structure choice.

Evidence and persistence: use current source/interfaces and the existing Node
VM/Rust fixtures. No AGENTS.md or TODOS.md found in this checkout. No root-level
project brain context exists for blunted; context helpers previously failed
trying to create forbidden ~/.gstack paths, so no fresh digest is claimed.
Aside readiness remains unavailable; reuse the same-day official Tauri and
Microsoft runtime documentation for the existing offline packaging choice.
No novel concurrency framework or architectural pattern is proposed. The
existing transition flag/save queue/native mutex are the reuse points.
Remote refresh remains unverified; current local HEAD is 7c547a6 and no source
change has been made. A required engineering history write under ~/.gstack is
outside permitted roots; the final outcome must distinguish preserved file
notes from formally persisted gstack review credit.


## Engineering Scope Challenge findings and dispositions

No new scope change is needed. Reuse existing queue, immutable article snapshots,
transition flag, native mutex, validated IDs, local failure messages and Tauri
packaging. There is no proposed infrastructure or concurrency framework to add.
The baseline workflow already exists at ccaa8aa; these are repairs, not a rebuild.
Local origin/main history has no same-day repair hits, but fetch/remote refresh
was blocked, so remote duplication and current PR state remain unverified.
No existing TODOS.md or linked issue introduces a hidden dependency. Paid signing,
network telemetry, accounts and platform expansion remain outside scope.
[Layer 1] preserve native file IO and standard Promise/mutex boundaries.
[Layer 2] use the checked installed Tauri schema/official offlineInstaller mode.
[Layer 3] identify each operation's complete lifetime before choosing its guard;
one filesystem mutex cannot protect mutable renderer choices across awaits.
Dispositions: scope accepted as-is, engineering D2 A. All nine CEO remedies
remain accepted with their existing proof obligations. No new remedy pending.

## Engineering Section 1: Architecture

[CRITICAL] (confidence: 9/10) src-tauri/src/library.rs:76 — recursive directory
creation can recreate a missing configured root after command-layer validation.
Motivating current line: `fs::create_dir_all(&dir).map_err(|e| e.to_string())?;`
where `dir = root.join("articles")` (line 75). The load path repeats recursive
creation at line 95. Plan baseline ARCH-01 / CEO D2 A explicitly covers a root
that disappears during saving and forbids alternate-location recovery by default.
Runtime evidence is static source and std::fs recursive-creation semantics, not
an installed disappearing-volume test.

Required implementation detail under ARCH-01: the library boundary must not
recursively recreate an unavailable configured root between validation and IO.
Keep fresh default setup distinct from configured-root operations, and propagate
missing-parent/write errors. Extend native fixtures at the existing library
boundary for disappearance between preflight and child-directory creation. No
new guarantee about inode identity, external writers or disk power-loss safety
is inferred. Source changes may therefore need library.rs in addition to main.rs.

This refines an estimated file list, not feature scope: estimated unique named
files becomes twelve if every original optional file is needed. The original
arrangement stays intact, with no new class/service/module. Do not change an
otherwise unnecessary file to hit an estimate. No feature cut or hard file-count
ceiling was approved. Disposition: accepted as necessary implementation/proof for
ARCH-01, exact CEO D2 A; not a new independently selectable recovery policy.

[CRITICAL] (confidence: 10/10) src/ui/app.js:1425 and src/ui/app.js:697-707 — the
close flow can allow native exit after a newer unsaved edit arrives during final
preference saving. Motivating current close line:
`if (await leaveArticle()) { clearTimeout(prefsTimer); if(tauri() && tauri().savePrefs && !prefs.privateSession) { await saveQueue; try{await tauri().savePrefs(JSON.parse(JSON.stringify(prefs)));}catch(e){} } return true; }`
Motivating edit lines: `state.body = editor.value;` and `dirty = true;`.
Adapter caller: `if (window.BluntedWorkspace && await window.BluntedWorkspace.prepareClose()) core.invoke("blunted_close");` (adapter.js:94).

Plan baseline OBS-01 / CEO D9 A says preserve article-save protections; existing
article-workspace.md promises normal close waits for saving. The final exit
permission must therefore recheck article/operation state after asynchronous
preference work, retaining the window when a late edit is unsaved. Keep explicit
article discard behavior intact; do not demand saving content the writer already
chose to discard. No new edit-blocking UI policy is chosen here.

Bounded replay /private/tmp/blunted-eng-close-late-edit.mjs uses the existing UI
harness with paused savePrefs, edits during that await, then releases it:

```json
{"editingEnabled":true,"allowedToClose":true,"articleWrites":0,"textStillInEditor":"New text entered during final preference save.","status":"Editing…"}
```

This is controlled IPC ordering, not an installed OS-close execution. Required
proof under OBS-01: pause final prefs write, introduce a late edit, complete the
write, and assert no close grant while that edit remains unsaved; also verify
successful retry and intentional prior discard. Disposition: accepted necessary
caller-boundary proof for exact OBS-01 / CEO D9 A, not a new product policy.

```
UI intent -> revision/state -> snapshot -> Promise queue -> adapter invoke
                    |                                 |
       exclusive operation guard                      v
          clear / restore / close                 native mutex
                    |                                 |
         validated/frozen inputs               configured-root resolver
                    |                                 |
          explicit result/error             library write/load boundary
                                                      |
                                        no recursive missing-root recreation
```

Distribution: existing build scripts produce portable HTML and inject the
adapter only into native frontend. Removing the fs plugin leaves custom commands
and native dialogs. offlineInstaller changes Windows packaging, not the app's
network behavior; existing CI builds and hashes its outputs, but disconnected
VM acceptance is required. No hosted service, DB or remote auth boundary exists.
Article size/library cardinality remain potential startup/memory limits, not
new fixed-capacity promises. Root/IO failure must reach the writer, native command
errors must not be transformed into successful saves, and async UI inputs must
stay frozen for the chosen operation lifetime. Rollback still requires compatible
library/exports, not a blind downgrade to single-draft binaries.

Section 1 Dispositions: both findings carried into exact ARCH-01 and OBS-01
approvals. No new unanswered remedy, scope change or extraction proposal.

## Engineering Section 2: Code Quality

[INFORMATIONAL] (confidence: 9/10) src/ui/app.js:35-36,1247-1267,1423-1426 — saves,
restore, clear and close share state but do not all cover their full operation
lifetimes. Existing lines `var articles = [], libraryReady = false, loadFailed = false, transitioning = false;` and
`var saveQueue = Promise.resolve(), pendingRestore = null, previewOpen = false;` already supply a small owning boundary.
DATA-01/02 and OBS-01 approve repairing those specific paths; a general workflow
framework, service or state-library migration would be unrelated scope.
Disposition: use the existing guards/queue for their accepted callers, no new
extraction choice or public test-only seam.

Shared-code rubric: actual queue users are store.save at app.js:132,
saveLibraryArticle at1251 and schedulePrefs at1490. Article saves need immutable
document/ack checks; preference-only writes need separate dirty semantics. They
are similar but not equivalent contracts, so do not merge them merely to remove
syntax. No cross-language JS/Rust storage abstraction is proposed. Shared analysis
failure handling is already explicitly approved by ERR-01 / CEO D3 A: worker
onmessage/onerror and main/structure fallback are its verified callers.

No independent shared-code extraction is recommended, so no claimed line savings
are fabricated. Reusing a small analysis rescue can increase test/integration
lines while improving reliability; do not treat code-size reduction as the goal.
Caller-specific differences (article vs preferences, portable vs native,
first-run vs unavailable selected root) must remain explicit. Catch-and-ignore
paths are already governed by ERR-01/SEC-01/OBS-01. The architecture diagram still
fits these boundaries. Existing compressed UI/test code is a readability concern,
not permission for an unrelated formatting rewrite.
Section 2 Dispositions: the owning-boundary finding is covered by DATA-01/02,
ERR-01 and OBS-01; no new independently selectable extraction is needed.


## Engineering Section 3: Tests

Framework detection: package.json:8 uses Node's built-in node:test runner; native
filesystem tests are Rust #[test] in src-tauri/src/library.rs. No testing section
in repository AGENTS.md exists. Read app.js/native command source, then read the
complete workspace.test.js, article.test.js, library.rs and adapter.js in
dedicated source/test calls before this trace. No new framework is proposed.
The existing suite's 58 JS + 5 Rust result is reused from the CEO pass on unchanged
source, not described as a fresh engineering test run. The close late-edit replay
was newly executed in this engineering review. No production code/test suite was
implemented. All bounded probes use synthetic writing and fake or disposable IO.

[CRITICAL] (confidence: 9/10) tests/workspace.test.js:100-113 and
src-tauri/src/library.rs:153-245 — existing tests protect failure-close, explicit
discard and article recovery, but do not exercise the approved final-preference
close race or missing configured root across directory creation. Motivating test
line: `assert.equal(await closing,false);` follows article save failure, not a
paused final savePrefs. Native existing test `invalid_paths_and_write_failure`
uses a root that already exists and blocks its articles child; it does not
remove the configured parent between resolver and library entry.
Disposition: extend owning fixtures for exact ARCH-01/OBS-01 outcomes. No new
behavior or optional proof-depth decision is needed.

The other seven approved repairs retain their previously approved direct tests.
Together these are nine repair-contract families with missing direct proof of
their target failure handling, not a count of every branch or a whole-codebase
coverage percentage. Preserve existing successful path/regression tests.

```
CODE PATHS / APPROVED TARGET                         USER FLOWS
[GAP] ARCH-01 root resolver + library IO              [GAP ->E2E] chosen library
  no config -> fresh setup/default                    missing before/during save
  config read error / selected root missing -> Err     cancel reselection preserves pointer
  available -> library load/save                       no alternate save or parent recreation
  disappears before child create/write -> Err
  invalid ID/schema -> reject (existing ★★★)
  main valid -> rotate -> temp/write/flush/rename
  corrupt main -> valid backup / exhausted -> Err (existing ★★★)

[GAP] ERR-01 request/worker/fallback                  [GAP] editing while review fails
  no worker / post throws -> main fallback             busy clears, Apply disabled, export/save usable
  stale rev result/error -> ignore                     next edit retries, success clears error
  worker current ok:false / engine/structure throw -> visible failure
  current success -> render -> busy=false

[GAP] SEC-01 + DATA-01 clear                         [GAP ->E2E] clear local data
  cancel confirmation -> unchanged                     new typing/second clear/prefs timers
  busy -> reject competing mutation                     cannot race operation lifetime
  exclusive guard -> invalidate timers -> drain queue
  delete already absent -> success; real IO error -> failed/partial
  success -> clear intended working/persisted app state
  failure -> retain working editor, honest partial state, unlock

[GAP] SEC-02 grants/plugin removal                  [GAP ->E2E] native storage/export
  plugin command denied                               selected-folder and dialog paths succeed
  existing custom commands + validation retained

[GAP] DATA-02 restore                               [GAP ->E2E] confirmed backup import
  file missing -> no action; malformed/version/duplicate -> reject (existing ★★★)
  validation succeeds -> preview; cancel before confirm -> unchanged
  busy/no pending input -> no second operation
  snapshot backup/conflict/settings before await
  leaveArticle keep -> abort; save fails -> retain; discard -> intentional
  conflict skip -> next; copy -> new ID (existing ★★)
  private saved-library mutation -> refuse (existing guard retained)
  write failure -> count partial, preserve originals; unlock
  settings opted out -> keep; opted in -> sanitize/save; save error -> visible partial
  competing reader/cancel/option changes -> cannot mutate confirmed snapshot

[GAP] DATA-03 portable recovery                     [GAP ->E2E] recover/reopen after quota failure
  valid main -> use; invalid/missing -> a/b/c valid scan
  no valid copy -> no invented recovery
  recovered valid copy -> preserve until replacement succeeds
  every backup/main/prefs write fault -> honest save state, keep valid article
  reload -> valid old/new article; three slots remain the scheme

[GAP] OBS-01 close                                  [GAP ->E2E] normal close/retry/discard
  transitioning -> wait; dirty -> leave/save/keep/explicit discard (existing ★★★)
  normal prefs flush -> error: retry or explicit preference-only discard
  private -> do not add a preference write
  final async return -> recheck late article/operation state before exit grant
  late unsaved edit -> keep open; intentional prior discard remains valid

[GAP] REL-01 offline Windows installer              [GAP ->E2E] disconnected install/upgrade
  runtime absent -> bundled runtime installer; runtime present -> app install
  setup failure -> visible installer error; no runtime app network dependency
  install succeeds -> offline launch/save/reopen/export + existing upgrade checks
```

Legend: GAP = no existing direct target-contract proof; ★★★ = existing behavior,
edge and error assertions; ★★ = existing happy/conflict assertions. E2E marks
native/browser integration requirements, not a mandate to introduce an E2E
framework. The diagrams include existing branches to preserve and accepted target
branches to implement; no future test is counted as executed coverage.

Existing proof to retain: immutable old save acknowledgements, switch failure and
late edit, trash restoration, copy/skip, stale worker success, individual and
legacy dismissals, working-position dates, private discard and portable storage
keys. These are regression obligations rather than candidates for removal.
App file/drop import, export, native menu and renderer interactions must be checked
at their real boundary where VM mocks hide OS/browser semantics. Reuse the
already documented installed/assistive-technology acceptance requirements.

Value-bar application: extend tests/workspace.test.js for UI/queue/callback
boundaries and library.rs native fixtures for filesystem boundaries. No public
export, debug flag, injected production hook or test-only wrapper is required.
Use explicit deferred promises/controllable timers, not wall-clock races. No
LLM, prompt or eval feature is present; no eval suite is needed. No test is
proposed merely to increase count. No existing test is obsolete.
Section 3 Dispositions: required proof for nine previously approved contracts;
no new test policy, framework, retirement or unanswered assertion choice.

## Engineering Section 4: Performance

[INFORMATIONAL] (confidence: 9/10) src-tauri/src/library.rs:68-69,110-149 and
src/ui/app.js:1295 — native loading reads full article JSON into memory and backup
serialization creates another whole-library representation. Motivating source:
`let doc: Value = serde_json::from_str(&fs::read_to_string(path).ok()?).ok()?;`
and `var data = JSON.stringify({ app: "blunted-library", version: 1, exportedAt: new Date().toISOString(), articles: articles, settings: { prefs: prefs } }, null, 2);`.
Scale of a practical limit is unknown: no installed library-size/startup/typing
benchmark was executed. This is existing behavior, not evidence that the accepted
repair plan introduces a performance regression. Do not invent a cache, index,
fixed article cap, timeout or database to solve an unmeasured issue.

Preserve off-keystroke analysis and bounded findings rendering. Main-thread
fallback still needs the existing representative-hardware latency acceptance;
Node engine fixtures do not establish input responsiveness. Freezing restore
inputs adds a backup snapshot whose memory should be accounted for; retain one
operation snapshot, not copies per imported article beyond its required per-save
snapshot. This is a necessary implementation detail of DATA-02, not a new
capacity guarantee. Save serialization remains single-queue; no connection pool,
server request or query batching feature exists. Native IO is blocking within
existing asynchronous commands; don't add sleep-based retry loops or background
services without a distinct approved reason.

Disposition: keep existing hardware acceptance pending and measure actual
packaged installer size under REL-01. No new performance feature, benchmark suite
or changed threshold is approved or required by this review.

## Engineering Outside Voice

Same host/provider preflight previously reported Claude Code not installed; no
completed external review exists. This invocation will recheck availability at
finalization. A fallback requires the skill's bounded Plan-agent/TaskStop
interface, which is not offered; do not substitute a general-purpose agent.
No agent has been spawned and no independent agreement is claimed.

## Engineering implementation dependencies

Sequential implementation, no parallelization opportunity for the shared UI
repair module. Packaging/metadata can be prepared independently, but full native
acceptance waits for the integrated repaired frontend. This is a module-conflict
plan, not permission to create worktrees, spawn agents or edit application code.

| Step | Modules touched | Depends on |
|---|---|---|
| Root identity and native storage error contract | src-tauri/src, src-tauri adapter, src/ui, tests | — |
| Clear result and exclusive lifetime | src/ui, src-tauri/src, tests | root contract where errors overlap |
| Restore/portable recovery/analysis/close repairs | src/ui, tests | sequence edits within shared UI module; retain native interface contract |
| Unused plugin removal | src-tauri configuration/source | coordinate with native storage edits |
| Offline packaging/docs | src-tauri configuration, docs | can prepare config independently; acceptance after integrated native build |
| Existing installed/platform/user acceptance | native/frontend artifacts, docs | verified integrated candidate |

No independent lane is newly authorized. Do not make Windows availability block
independent local regressions; it blocks only the corresponding acceptance claim.
Keep main.rs/lib.rs overlapping edits sequential. No new TODO is proposed.


## Engineering test-plan artifact (complete content; prescribed file verified)

The complete QA input below is staged for the skill-prescribed project artifact.
It is preserved in this report and the prescribed QA file was copied and byte-verified during finalization.

# Test Plan
Generated by /plan-eng-review on 2026-10-26
Branch: main
Repo: therawlogs/blunted

## Affected Pages/Routes
- Native main window: selected-folder library, review, clear, restore and close.
- Portable local index.html: single-draft review/save/recovery/clear.
- Windows installer: disconnected setup and upgrade. No hosted routes exist.

## Key Interactions to Verify
- Write, review, read, export and reopen preserve article contents.
- Clear reports accurate results and excludes competing application mutations.
- Restore uses the confirmed backup, conflicts/settings choices and partial count.
- Close protects article text and exposes final preference-write failure.
- Offline Windows setup includes its runtime prerequisite.

## Edge Cases
- **E1** — Remove the configured parent between root validation and library IO; cancel reselection.
  Value: protects=no alternate article write or parent recreation; fails_when=recursive child creation recreates an unavailable root; why_new=existing blocked-child fixture keeps parent present; seam=none; no_claim=real removable-volume timing
- **E2** — Deliver an old worker failure after a newer success; fail worker/main/structure paths.
  Value: protects=only current analysis changes the displayed state; fails_when=old error replaces current notes or current failure stays busy; why_new=stale-success coverage omits current/stale failure; seam=none; no_claim=native worker and browser event timing
- **E3** — Make an already-absent file and a later deletion error occur in one clear attempt.
  Value: protects=absent is success and partial failure is truthful; fails_when=all-success or all-retained message hides partial deletion; why_new=no direct partial deletion assertions; seam=none; no_claim=secure erasure and immutable OS files not exercised
- **E4** — Use disposable library/export locations after removing plugin grants.
  Value: protects=intended native command paths remain usable; fails_when=permission cleanup accidentally removes required behavior; why_new=mock bridge does not exercise command permissions; seam=none; no_claim=arbitrary private file reads are not tested
- **E5** — Fire pending save/preferences callbacks during and after Clear, including a second Clear.
  Value: protects=pending app writers cannot recreate cleared state; fails_when=old timer or callback writes after reported success; why_new=save ordering fixture does not invalidate clear generations; seam=none; no_claim=all external writers or multiple app processes
- **E6** — Replace a pending reader result before/during/after restore confirmation; simulate a later article save failure.
  Value: protects=stable input snapshot and accurate partial progress; fails_when=reader mutates confirmed data or failed import overstates progress; why_new=existing restore fixture completes without races or faults; seam=none; no_claim=native file dialog behavior
- **E7** — Put the only valid article in backup c, corrupt the other slots, then fail each storage write.
  Value: protects=last valid article remains reloadable; fails_when=invalid rotations erase the sole recovery copy; why_new=no current quota/recovered-c test; seam=none; no_claim=real browser storage capacity
- **E8** — Type new prose while final preference saving waits; also exercise private mode and intentional prior discard.
  Value: protects=close cannot lose newer unsaved writing; fails_when=late edit is unsaved when prepareClose returns true; why_new=existing close test faults article save rather than final prefs; seam=none; no_claim=OS-level close until installed acceptance
- **E9** — Disable networking before setup on a Windows image without WebView2; repeat with it present and through upgrade.
  Value: protects=runtime prerequisite is packaged and upgrade remains safe; fails_when=installer fetches runtime or upgrade loses data; why_new=CI build output proves packaging not offline install; seam=none; no_claim=platform combinations not actually exercised

## Critical Paths
- **F1** — Open and save the selected library, then repeat with that folder unavailable.
  Value: protects=selected library identity and writing survive root failure; fails_when=missing root silently switches storage or is recreated; why_new=existing native tests do not remove the configured parent; seam=none; no_claim=installed OS/volume behavior until platform checks run
- **F2** — Edit prose, force review failure, keep writing/exporting, then retry through a later edit.
  Value: protects=review failures are visible without blocking writing; fails_when=busy stays stuck or stale Apply remains usable; why_new=stale-success fixture does not test analysis failure; seam=none; no_claim=real-document trigger and native rendering
- **F3** — Clear disposable app data with successful, partial and failed removal results.
  Value: protects=clear status matches actual deletion outcome; fails_when=UI reports full deletion after a meaningful removal error; why_new=no direct deletion-error fixture exists; seam=none; no_claim=secure disk erasure
- **F4** — Verify unavailable filesystem-plugin commands and working selected-folder/native export flows.
  Value: protects=least privilege without breaking intended file operations; fails_when=plugin authority remains or custom library/export breaks; why_new=VM bridge cannot enforce native permissions; seam=none; no_claim=all vulnerabilities or other users filesystem boundaries
- **F5** — Begin Clear while a save waits; exercise both completions and repeated input.
  Value: protects=no writing loss or recreation during Clear; fails_when=typing or a queued writer survives the exclusive boundary; why_new=existing deferred-save tests do not clear storage; seam=none; no_claim=all installed IPC timing schedules
- **F6** — Confirm backup A, then attempt Cancel, changed options and backup B while saving waits.
  Value: protects=one restore uses the confirmed backup and choices; fails_when=articles/settings come from different backups or Cancel crashes; why_new=copy/skip test has no overlapping reader/cancel; seam=none; no_claim=native picker timing
- **F7** — Recover from each portable backup with constrained storage; reload after failed writes.
  Value: protects=at least one valid stored copy survives failed recovery save; fails_when=rotation destroys the sole valid article before main save; why_new=portable fixture checks successful save only; seam=none; no_claim=actual browser quota sizes or physical durability
- **F8** — Close with an unsuccessful preference save, retry or explicitly discard preferences.
  Value: protects=article safety and honest preference-close choices; fails_when=close hides preferences failure or grants exit with late unsaved prose; why_new=article-close fixture omits final preference await; seam=none; no_claim=installed native exit until platform checks run
- **F9** — Install the candidate Windows package disconnected, with runtime absent and present.
  Value: protects=offline installation and existing offline app workflow; fails_when=setup needs network or upgrade loses existing writing; why_new=build/hash checks do not install on a clean PC; seam=none; no_claim=other Windows architectures or versions not tested

## Tests to Retire
- None. Existing migration, storage, UI and engine contracts remain required.

## Pending Decisions
- None. Required proof derives from exact CEO D2 A through D10 A, including article protection and root disappearance.

## Evidence limits
- Extend existing Node VM and Rust filesystem fixtures; no new framework or production-only test seam.
- Native permissions, dialogs, final exit and disconnected installer checks require installed disposable platform state.
- VoiceOver/NVDA/JAWS, IME/zoom, representative latency and five independent writer workflows remain existing acceptance gates, not completed tests.


## Engineering task refinements and approval readiness

Keep T1–T9 above and their exact CEO approvals. T1 also touches existing
library.rs to cover the approved missing-root-during-IO contract. T8 includes
late-edit protection through final preference saving, which is required to
preserve the approved article-close protections. These are necessary code/proof
details of ARCH-01 and OBS-01, not new product policies. Estimated named files
are twelve if all previously optional files need changes; zero new classes or
services. Do not edit an unnecessary file to meet a count estimate. No additional
implementation task, framework, feature, arbitrary size limit or deferral is
approved. Task aggregation records are staged for their prescribed location.

Engineering approval ledger: baseline ARCH-01 CEO D2 A; ERR-01 CEO D3 A;
SEC-01 CEO D4 A; SEC-02 CEO D5 A; DATA-01 CEO D6 A; DATA-02 CEO D7 A; DATA-03
CEO D8 A; OBS-01 CEO D9 A; REL-01 CEO D10 A. Engineering D1 b skipped discovery;
engineering D2 A retained the existing arrangement. No administrative answer
is used as remedy approval. No policy or assertion is left pending.
Approval readiness: PASS — exact nine CEO remedy answers and engineering
structure D2 A retained; required root/close proof follows their original contracts.

## Engineering reality receipts

REALITY: premise-table pass Existing source and approved plan are separated from proposed implementation; inherited six external premise outcomes remain unverified docs/ceo-review-2026-10-26.md:1
REALITY: already-done finding Base workflow already exists at ccaa8aa; local history inspected but remote fetch remains unavailable 7c547a6
REALITY: surface-check pass Existing package commands and installed Tauri schema are checked; platform installer acceptance remains unrun package.json:8
REALITY: binding-decisions pass Exact CEO approvals and engineering structure selection retained; no hidden default replaces them docs/ceo-review-2026-10-26.md:62
REALITY: numbers pass Counts are derived from task records and explicit section families; timings reused from unchanged-source CEO evidence, effort estimated docs/ceo-review-2026-10-26.md:18
REALITY: deferred-asks pass No linked issue or newly deferred scope; prior acceptance gates remain required docs/article-workspace.md:87
REALITY: pr-count pass No local policy file; original quoted single-wave default retained, no split or PR creation authorized docs/ceo-review-2026-10-26.md:1
REALITY: prior-art finding No vendor patch proposed; documented offlineInstaller adopted, upstream issue/PR coverage not refreshed node_modules/@tauri-apps/cli/config.schema.json:2959
REALITY: contract-assumptions pass Existing resolver/queue/IPC signatures checked; proposed behavior is not counted as running code src-tauri/adapter.js:29
REALITY: units pass No input unit or analysis threshold change; no retune justified by accepted scope src/engine/config.js:1
REALITY: perf-table finding Existing single-run Node fixture is not UI p50/p95, installed startup or pathological workload proof tests/article.test.js:43
REALITY: dependency-fallback pass Native/Windows acceptance blocks its own claim, not independent local repairs docs/article-workspace.md:87
REALITY: obligation-tiers pass All nine repairs remain in required wave with no scope cut or new service docs/ceo-review-2026-10-26.md:62

## Engineering completion summary

- Scope Challenge: scope accepted as-is, FULL_REVIEW; engineering D2 A.
- Reality rows: thirteen applicable rows emitted; six inherited unverified external premises.
- Architecture: two critical implementation/proof gaps, carried into ARCH-01/OBS-01.
- Code quality: one informational operation-boundary issue; no unrelated extraction.
- Tests: execution/flow diagram produced; nine approved repair-contract families need direct target proof. Complete QA artifact has nine critical paths and nine edge-case cards.
- Performance: one informational whole-library IO/memory concern; scale unknown, existing hardware acceptance retained.
- Four-section issues_found: thirteen (two architecture + one quality + nine test-contract gaps + one performance); not thirteen new independent defects.
- Failure modes: nine current silent-path gaps (seven inherited plus missing-root recreation and final-close late edit); planned remedies are not implemented.
- NOT in scope / existing leverage / dependencies: recorded; original non-goals retained, no new TODOs.
- Unresolved engineering decisions: zero. Lake Score: N/A, administrative choices differed in kind.
- Outside voice: Claude Code preflight rechecked not_installed; bounded Plan-agent fallback unsupported; no completed review or agreement claimed.
- Parallelization: one shared repair stream; sequential implementation of shared UI/native modules. Packaging configuration can be prepared independently; no worktree/agent launch authorized.
- Verification: reuse unchanged-source 58 JS + 5 Rust passes; new controlled late-close replay confirms current failure. Native installed/Windows/accessibility/hardware/writer acceptance is unverified.
- Artifacts: review notes preserved here; prescribed QA/task files were copied and byte-verified; history is recorded only after this report read-back. No application source, test suite, release, setting or user-contact operation changed.
- Durable observations: full operation lifetimes matter across awaits; recursive directory creation can undermine a prior root-availability check. No memory store is updated.


## Engineering finalization artifacts

Verified QA test plan: /Users/praveen/.gstack/projects/therawlogs-blunted/praveen-main-eng-review-test-plan-20261026-120926.md

Verified task JSONL: /Users/praveen/.gstack/projects/therawlogs-blunted/tasks-eng-review-20261026-120926.jsonl

The standalone artifacts match their complete prepared contents. QA contains nine critical paths and nine edge cases, each with a value card; tasks contain the nine previously approved repairs with root/close proof refinements. The report is saved and read back before the required history helper runs. Successful history persistence is confirmed by helper completion and the subsequent dashboard, not assumed from this text. No memory/learning store or network synchronization is updated. All original CEO content/approvals remain preserved.

Engineering approval readiness: PASS — exact CEO D2 A through D10 A and engineering structure D2 A. Source changes are not authorized or implemented.



## Design review — target, setup and initial assessment

Target: this saved blunted plan. User chose engineering navigation A to run
plan-design-review. All nine original CEO approvals and engineering required
root/close proof refinements remain fixed. No application changes are authorized.
Design D-numbering restarts for this invocation; D1 A is gstack community telemetry
consent only, not a product/design remedy. Setting was applied and read back as
community. It changes tool reporting, not blunted's no-telemetry product contract.

Audit: local GitHub origin, base main from origin/HEAD; HEAD 7c547a6. Recent history
contains prior contrast/workspace/release work but no completed design review.
Tracked source diff remains empty. No repository AGENTS.md, TODOS.md or DESIGN.md
found. Existing CSS and saved workspace screenshots are the visual baseline.
UI scope includes library availability, analysis errors, clear, restore and close
states, not a visual redesign or new feature. Existing warm paper/ink colors,
Georgia-style article type, system UI type, centered column, mode controls and
native dialogs should be reused. Brand/product brain-cache reads failed on
forbidden cache creation; no fresh digest is claimed. Source and human approvals
remain the authoritative context.

Step 0 initial design-completeness impression: 7/10 (judgment, not measured UI
quality). Layout and core journeys are documented, while exact failure-state
presentation, recovery-action labels and focus destinations need design detail.
A 10/10 plan would make those interactions and responsive/accessibility behavior
explicit within the existing scope, with individual decisions for genuinely new
presentation choices. The original user instruction “review everything” answers
the focus question: all seven dimensions, with no scope reduction or reapproval
of settled remedies. Pass-specific scores are not yet evaluated.

Mockup setup: designer binary version probe succeeded (DESIGN_READY), but its
first variants command failed before generation: “No OpenAI API key found.”
The result reported requested=0, saved=[], succeeded=0, count=0 and one failure
entry for the missing key. No image call, paid-image success, comparison board or
approved mockup is claimed. Detailed fallback at skill line979 requires text-only
review and forbids a substitute hand-built board. No replacement HTML/CSS board
was created. Private brief remains excluded from Git; artifact directory is
~/.gstack/projects/therawlogs-blunted/designs/failure-recovery-20261026.

Outside-voice choice is administrative and approves no design remedy. Claude Code
preflight remains not_installed; a native in-host independent completeness voice
is available only if the user selects that option. No reviewer has been spawned.


## CODEX (IN-HOST) SUBAGENT (design completeness)

Design D2 user answer: A. Native independent read-only review completed against
this saved plan and relevant UI source. External Claude Code remains unavailable.
[single-model] Overall native design-completeness score: 7/10. Completion marker:
INDEPENDENT DESIGN-COMPLETENESS REVIEW COMPLETE — 7/10; six actionable
presentation/documentation findings; fixed remedy scope retained.

| Native finding | Severity | Evidence | Missing decision / disposition |
|---|---|---|---|
| 1: unavailable-library presentation | High | app.js:1444-1450,1522; shell.html:68-84; ARCH-01 | Persistent location/recovery controls, desktop-unavailable distinction and focus need detail. Desktop must not be relabelled portable: faithful ARCH-01 contract. Presentation placement is DES-01, pending in Pass 1. |
| 2: preference-only exit presentation | High | shell.html:165; app.js:1423-1466; OBS-01 | Article-discard wording must not describe preference-only exit. Preserve separate article guard; labels/layout/focus reviewed in Pass 2. DES-02 pending analysis. |
| 3: clear partial/failed result presentation | High | app.js:1130-1137,176-178; SEC-01/DATA-01 | Explain clearing/complete/partial/failed, retained unsaved editor, actions and result ownership. DES-03 pending Pass 2. |
| 4: analysis failure presentation | Medium | app.js:187-240,700-702; ERR-01 | Review/outline failure must remain distinguishable from storage failure, with stale-content treatment and existing next-edit retry. DES-04 pending Pass 2. |
| 5: restore progress and result focus | Medium | app.js:1318-1342; shell.html:72-80; DATA-02 | Visible progress and stable focus while controls lock; success/all-skipped/partial/preferences-failed distinctions. DES-05 pending Pass 2/6. |
| 6: unresolved-decision reporting | Medium | earlier terminal report versus design setup | Earlier sentinel described settled CEO/engineering contracts. New presentation choices are now separately recorded and final report is updated. Factual report correction, no product-policy choice or new approval needed. |

No critical design finding. Existing article-first hierarchy and the warm-paper /
serif-prose / system-control language fit this offline app. No imagery, new card
layout, animation or redesign is recommended. Source and historical screenshots
do not establish current rendered/keyboard/screen-reader/platform acceptance.

### DESIGN OUTSIDE VOICES — LITMUS SCORECARD

| Check | Native in-host | Claude Code | Consensus |
|---|---|---|---|
| Brand clear on first screen | YES: existing wordmark, palette and article emphasis | Unavailable | No external comparison |
| One visual anchor | YES: title and centered article | Unavailable | No external comparison |
| Scannable hierarchy | YES: modes, contextual tools and article rows | Unavailable | No external comparison |
| Each section has one job | YES: writing/review/library/preferences separate | Unavailable | No external comparison |
| Cards earn their use | YES: no decorative grid; tool/dialog boundaries | Unavailable | No external comparison |
| Motion serves purpose or is intentionally absent | NOT SPECIFIED: no animation system in source; preserve absence | Unavailable | No external comparison |
| Usable without decorative shadows | YES, qualitative: type/spacing/borders carry UI | Unavailable | No external comparison |

Hard rejections: none from native review. External hard-rejection coverage is
unavailable, not a confirmed pass. No cross-model agreement is claimed. Preserve
existing lack of new motion as an unchanged design contract, not animation work.

## Design Pass 1: Information Architecture (in progress)

Before score: 8/10 [design judgment]. Existing hierarchy is clear: article first,
then view modes, then contextual review or Articles/More tools. The important
missing information-hierarchy choice is where unavailable-library recovery stays
visible while writing. A 10/10 plan specifies that presentation without changing
normal article layout or hiding the writer's unsaved status behind unrelated copy
feedback. No hard-rejection grid/card/marketing pattern was found.

```
blunted main window
  header: identity + Articles + Write / Review / Read + More
  article: title + prose / local reading preview
  status: words + save state
  requested inspector: review note, explanation, Apply / Dismiss
  Articles dialog: library list / Outline / backup tools
  unavailable desktop library: still a desktop library failure, not portable mode
  DES-01 pending: prominent in-context recovery strip OR footer + Articles recovery
```

Faithful contract carried under ARCH-01 (CEO D2 A): desktop edition identity and
configured location remain even when libraryReady is false; writing remains
exportable, saves remain blocked and retry targets the original library. Portable
single-draft guidance must depend on edition capability, not a failed load.
This follows the established separate desktop/portable contracts; it does not
approve a new library management feature. Exact presentation placement remains
unapproved below. No focus destination or additional recovery policy is decided
by the placement alternatives; those remain governed by existing conventions or
later concrete design choices.

## Design decision ledger

| ID | Owner/pass | Fixed approved behavior | Proposed presentation | State / authority |
|---|---|---|---|---|
| DES-01 | Pass 1 | ARCH-01 CEO D2 A: blocked writes, preserve configured location, export/retry | A: persistent strip above article; B: persistent footer cue and recovery actions in Articles; C: no placement selected | approved A, Design D3; persistent strip above article |
| DES-02 | Pass 2 | OBS-01 CEO D9 A; separate article protection retained | Preferences-specific variant of existing leave dialog | approved A, Design D4 |
| DES-03 | Pass 2 | SEC-01/DATA-01 CEO D4/D6 A | Operation-owned progress/result beside Clear in Preferences | approved A, Design D5 |
| DES-04 | Pass 2 | ERR-01 CEO D3 A | Failure message inside Review and Outline; hide outdated analysis results | approved A, Design D6 and D7 |
| DES-05 | Pass 2/6 | DATA-02 CEO D7 A | Progress/results beside import controls in Articles; focus operation status | approved A, Design D8 and D9 |

## currentDecision (DES-01)

| Commitment | Approval/current | A | B | C |
|---|---|---|---|---|
| All nine remedies and engineering proof | Approved, fixed | Unchanged | Unchanged | Unchanged |
| Root failure: no alternate save; preserve path; export/retry | ARCH-01 CEO D2 A | Unchanged | Unchanged | Unchanged |
| Desktop failure vs portable mode | Existing edition contract | Desktop-unavailable state | Desktop-unavailable state | Desktop-unavailable state; presentation still pending |
| Error/recovery presentation | New choice pending | Persistent strip below header, above article, with Export article and Retry library | Persistent unavailable-library footer cue; Export article and Retry library in Articles | No treatment selected; design gap unresolved |
| Normal successful workspace | Existing CSS/layout | Existing layout when no error | Existing layout | Unchanged |
| Focus behavior / unrelated errors | Not selected here | No new policy selected | No new policy selected | Remain pending where unspecified |
| Implementation now | Review only | None | None | None |

Question: Design D3 — DES-01: Where should unavailable-library recovery stay visible?
Project: blunted on main; nine approved repairs and engineering proof remain fixed.
ELI10: When the selected library cannot be reached, writing can remain in the window without being saved. The plan already requires export and retry, but does not say where the warning and actions live. A shared notice can be replaced by unrelated feedback.
Stakes: A writer may overlook that new writing is unsaved or struggle to find recovery.
Recommendation: A because visible system status should stay next to the affected writing rather than rely on opening a tool panel.
Note: options differ in kind, not coverage — no completeness score.
Net: Choose the presentation of the already-approved library failure state. No storage behavior, focus policy or implementation is newly authorized.
Header: Library recovery placement
A) Above the article (recommended)
Effort S (human: about 30 minutes / Codex: about 10 minutes to specify), low risk. Show a persistent strip below the header and above the article while the library is unavailable, with Export article and Retry library. It makes the unsaved condition and recovery actions immediately visible and keeps unrelated copy feedback separate, but adds visual weight while writing during a storage failure.
B) Footer and Articles
Effort S (human: about 30 minutes / Codex: about 10 minutes to specify), low risk. Keep a persistent unavailable-library cue in the existing footer and place Export article and Retry library in Articles. It preserves a quieter article surface and groups recovery with library tools, but requires opening Articles to act and makes the warning less prominent.
C) Leave placement unresolved
Effort S (human: about 10 minutes / Codex: about 5 minutes to record), medium risk remains. Keep the approved failure behavior and postpone only this presentation choice, with zero implementation work. It preserves all existing approvals and avoids settling layout now, but leaves the implementer without an accepted warning/action placement and keeps this design gap unresolved.

## Design D3 answer and Pass 1 completion

User selected A. DES-01 is approved: while the configured desktop library is unavailable, show a persistent strip below the header and above the article with Export article and Retry library. Preserve the existing normal workspace when healthy. Keep this state distinct from portable mode and unrelated transient notices. All ARCH-01 storage protections remain fixed. This approval chooses placement only; no new focus policy or implementation is authorized.

Pass 1 score: 8 before, 10 after the accepted hierarchy specification (plan assessment, not measured usability). No further information-architecture issues in the bounded repair scope.

## Design Pass 2: Interaction State Coverage (in progress)

Before score: 7/10. Required recovery behavior is approved, but four visible interaction treatments remain unresolved. The table below faithfully summarizes approved outcomes; pending presentation is explicitly marked.

| Feature | Loading/busy | Empty | Error | Success | Partial |
|---|---|---|---|---|---|
| Selected desktop library | Existing loading state; preserve writing | Existing empty library, no invented documents | DES-01 persistent strip, export/retry; blocked alternate writes | Existing article/library presentation | No new partial-load policy approved |
| Analysis | Existing busy state; failure must clear busy | Existing no-notes/outline state | Preserve writing/save/export; disable stale Apply; next edit retries; placement pending DES-04 | Current-revision review and outline | No invented partial analysis result |
| Clear local data | Existing transition guard, competing mutations blocked | Already absent data counts as success | Truthful failure; preserve writing; presentation pending DES-03 | Truthful complete result | Truthful partial result; no rollback claim; presentation pending DES-03 |
| Restore backup | Snapshot confirmed inputs; block competing controls | Existing no-backup state; all-skipped result acknowledged | Preserve completed progress, no overwrite; presentation pending DES-05 | Imported articles/settings result | State actual progress and preferences failure; pending DES-05 |
| Close preferences save | Window remains open until retry or explicit preferences-only discard | Not applicable | Visible preference-specific failure; article protection separate; presentation pending DES-02 | Close only after final article-state guard | Never label article data discarded because only preferences failed |

### DES-02 source and tradeoff

Verified `src/ui/shell.html:165` currently uses the article-focused title “Keep this writing?” and action “Discard unsaved changes”. `src/ui/app.js:1464` opens it focused on Keep working; Escape also keeps working. `prepareClose` currently swallows the final preferences-save failure. OBS-01 already requires visible failure, retry, and explicit preferences-only discard. Reusing article wording would misrepresent what exit abandons. This decision chooses how to present that existing contract, not whether article protection exists.

## currentDecision (DES-02)

Question: Design D4 — DES-02: How should a preferences-only save failure appear during exit?
Recommendation: A. Match the message and actions to the failed object so the writer understands exactly what can be lost.
A) Dedicated variant of the existing leave dialog (recommended). Title “Preferences could not be saved”; explain that this failure concerns preferences and that article protection still applies. Actions: Keep working, Retry saving preferences, Exit without saving preferences. Reuse the native dialog style. Specification effort S (human about 30 minutes / Codex about 10 minutes), low risk. Clear at the moment of exit; adds one dialog variant. No new focus policy selected in this question.
B) Persistent inline preferences error. Stop exit and return to Preferences with the same three clearly labelled actions there. Specification effort S (human about 45 minutes / Codex about 15 minutes), low risk. Keeps context beside settings, but interrupts exit by moving to another surface. No new focus policy selected in this question.
C) Defer presentation. Retain OBS-01 requirements and leave the exact surface/labels unresolved. Specification effort S (human about 10 minutes / Codex about 5 minutes), medium risk remains: implementation may reuse misleading article-discard wording.
Fixed across all options: retry/explicit preference-only discard, article guard through final await, no silent exit, no implementation during review. Options differ in presentation, not completeness.

## Design D4 answer

User selected A. DES-02 is approved: a preferences-specific variant of the existing leave dialog, titled “Preferences could not be saved”, with Keep working, Retry saving preferences, and Exit without saving preferences. Explain that this failure concerns preferences; preserve the separate article protections, including the final article-state check through the preferences await. Reuse existing native dialog styling. The choice does not authorize an article-discard shortcut, a new focus policy, or implementation.

## currentDecision (DES-03)

Question: Design D5 — DES-03: Where should Clear local data progress and results remain visible?
Evidence: src/ui/app.js:1130-1137 currently uses shared copyNote on failure and the save-status footer for success; setSaveState at 176-178 also shares notices. Neither provides a stable operation-owned result. Clear is initiated within Preferences (src/ui/shell.html:156). SEC-01 and DATA-01 already require truthful complete/partial/failed results, preserved writing on failure and exclusive clearing.
Recommendation: A. Keep feedback beside the action that caused it, and preserve it when unrelated save/copy notices change (visibility of system status).
A) Persistent Clear result in Preferences (recommended). Give the existing Clear control its own progress/result region. Show “Clearing local data…” while busy; complete, partial or failed afterwards. Partial/failed results describe known removals and failures without guessing, and explain that the editor's writing is retained. Keep the result until another Clear attempt or the Preferences panel closes; do not replace it with unrelated notices. Reopening need not persist historical results. Existing Clear confirmation governs any repeat attempt. Specification effort S (human about 30 minutes / Codex about 10 minutes), low risk; contextual and restrained, but a closed panel hides the result.
B) Dedicated result dialog. After clearing ends, show complete/partial/failed details in a separate dialog, with Close returning to Preferences. Busy progress remains beside Clear. Same truthful content and preservation rules; existing confirmation governs repeats. Specification effort S (human about 45 minutes / Codex about 15 minutes), low risk; result is prominent, but adds an interruption and dialog transition.
C) Defer result surface. Keep the approved truthful outcomes and concurrency protections, leaving result ownership/placement unresolved. Specification effort S (human about 10 minutes / Codex about 5 minutes); medium risk remains that shared transient notices obscure a partial failure.
Fixed across options: no secure-erasure guarantee, rollback, automatic retry, new deletion scope, or new recovery policy; no implementation now. Focus handling remains for the accessibility pass. Options differ in presentation, not completeness.

## Design D5 answer

User selected A. DES-03 is approved: an operation-owned region beside Clear in Preferences shows clearing progress, then complete/partial/failed results. Retain the result until another Clear attempt or panel closure; no historical persistence is required on reopening. Unrelated notices cannot overwrite it. Partial/failed results describe only known removals and failures, and explain retained editor writing. Repeat attempts use the existing Clear confirmation. Preserve SEC-01/DATA-01, with no new deletion scope, rollback, automatic retry or secure-erasure claim. Focus handling remains for Pass 6. Review only.

## currentDecision (DES-04 placement)

Question: Design D6 — DES-04: Where should an analysis failure be explained?
Evidence: app.js:204-242 silently returns on main-thread analysis exceptions; app.js:697-703 sets Review and Outline busy. shell.html:54 has shared copyNote, while Review (56-64) and Outline (85) have their own surfaces. ERR-01 already requires current-revision error ownership, cleared busy indicators, disabled stale Apply, preserved writing/save/export and retry on the next edit. Placement remains a distinct design choice from how old results are displayed.
Recommendation: A. Put the explanation beside the unavailable capability, preserving the quiet writing workspace and distinguishing analysis from saving (contextual system status).
A) In Review and Outline (recommended). Each affected surface shows a persistent analysis-owned explanation when opened: “Review is unavailable. Your writing is unchanged. Editing again will retry.” Use “Outline” for its corresponding surface. A shared failure can drive both, but unrelated save/copy messages cannot replace it. Write mode gains no new banner. Specification effort S (human about 30 minutes / Codex about 10 minutes), low risk; contextual, but a writer sees it only when inspecting analysis.
B) Persistent notice below the article. Show the same analysis-only explanation in Write and Review, with a matching notice in Outline. Specification effort S (human about 30 minutes / Codex about 10 minutes), low risk; visible immediately, but adds a writing interruption for an optional capability.
C) Defer placement. Preserve ERR-01 and leave location unresolved. Specification effort S (human about 10 minutes / Codex about 5 minutes), medium risk that a transient shared notice is missed or mistaken for a save failure.
Fixed: no new Retry button or retry policy, no focus move selected here, no storage warning conflation, and no implementation. Old-result treatment is still pending separately; this answer cannot select it. Options differ in presentation, not completeness.

## Design D6 answer

User selected A. DES-04 placement is approved: show a persistent analysis-owned explanation inside each affected Review/Outline surface, using the corresponding feature name: “Review is unavailable. Your writing is unchanged. Editing again will retry.” Keep Write mode free of a new analysis banner. Unrelated save/copy notices cannot replace the explanation. ERR-01 current-revision ownership, cleared busy state, stale Apply protection and next-edit retry remain fixed. This answer does not choose old-result treatment or focus movement.

## currentDecision (DES-04 old results)

Question: Design D7 — DES-04: What should happen to old analysis results after the current analysis fails?
Evidence: app.js:697-703 invalidates lastAnalysis and disables Apply after an edit but leaves previously rendered note/outline content in the DOM. app.js:1344-1355 renders heading buttons tied to offsets from that analysis; renderAnalysis at 296-310 also drives scores and annotations. A current-revision failure message alone does not explain whether those old results remain visible. This is a real presentation decision, separate from failure-message placement.
Recommendation: A. Replace stale derived results with the accepted error state so obsolete findings, offsets and scores cannot appear current (error prevention and truthful system status).
A) Hide outdated results (recommended). On a current-revision failure, replace old notes, findings, heading navigation, section lengths and analysis-derived scores with unavailable states; remove stale editorial annotations, retaining the text itself. Keep editing, saving, export and non-analysis information available. A successful current-revision analysis repopulates the affected surfaces. Specification effort S (human about 30 minutes / Codex about 10 minutes), low risk; clearest state, but loses access to prior analysis during the failure.
B) Retain an explicitly outdated snapshot. Keep prior derived results visibly labelled “Outdated — based on earlier writing”, with all stale analysis actions disabled, including navigation tied to offsets and note mutation. Keep the accepted error explanation. Specification effort M (human about 1 hour / Codex about 20 minutes), medium risk; preserves reference context but adds snapshot-state complexity and visual ambiguity.
C) Defer old-result treatment. Preserve ERR-01 and approved message placement, leaving the remaining stale-content ambiguity unresolved. Specification effort S (human about 10 minutes / Codex about 5 minutes); medium risk that obsolete content appears current.
Fixed across options: never apply an old fix, never replace writer text with analysis output, no new retry control, no implementation now. Options differ in treatment, not completeness. Focus implications are addressed in Pass 6 without presuming an answer here.

## Design D7 answer

User selected A. DES-04 old-result treatment is approved: on current-revision analysis failure, replace obsolete notes/findings, outline navigation, section lengths and analysis-derived scores with unavailable states. Remove stale editorial annotations while retaining the article text. Keep editing, saving, export and non-analysis information available. Repopulate only after a successful current-revision analysis. Preserve the D6 explanation inside Review and Outline, ERR-01 retry behavior and stale-response rejection. No implementation now.

## currentDecision (DES-05 presentation)

Question: Design D8 — DES-05: How should backup import progress and results be presented?
Evidence: shell.html:72 already has libraryStatus with role=status beside restoreChoices. app.js:1316-1342 disables Confirm, but provides no explicit import-start message; success returns focus to Import backup while partial/preferences-failed exits have different paths. DATA-02 already fixes snapshots, competing controls and truthful partial progress. This question covers visible progress/result ownership; focus is reviewed separately in Pass 6.
Recommendation: A. Extend the existing Articles status region so the writer sees the operation beside its controls without an extra dialog (continuity and visible system status).
A) In Articles beside import controls (recommended). Use an import-owned status in the existing libraryStatus area: “Importing articles…” while busy, then actual imported/skipped counts and settings outcome. Distinguish all-skipped, complete, interrupted, and articles-imported/preferences-failed; never claim rollback or unconditional success. Retain the result until the next library operation or panel closure, rather than overwrite it with save/copy notices. Show the library region as busy during import. Specification effort S (human about 30 minutes / Codex about 10 minutes), low risk; reuses existing UI, but the result is hidden when Articles closes.
B) Dedicated import progress/result dialog. Show the same outcomes in a separate modal, with Close after completion returning to Articles; no mid-import cancellation is introduced. Specification effort M (human about 1 hour / Codex about 20 minutes), low-to-medium risk; prominent progress, but adds a modal transition and more focus plumbing.
C) Defer presentation. Preserve DATA-02 and leave progress/result ownership unspecified. Specification effort S (human about 10 minutes / Codex about 5 minutes); medium risk of unclear busy or partial outcomes.
Fixed across options: confirmed input snapshot, pre-confirm Cancel, blocked competing restore controls, stale-reader rejection, preserved originals, no overwrite, rollback, automatic retry or mid-import Cancel policy. Report only known counts; no new persistence tracking requirement. No implementation now. Options differ in presentation, not completeness.

## Design D8 answer and Pass 2 completion

User selected A. DES-05 presentation is approved: an import-owned status beside the existing Articles import controls shows “Importing articles…” while busy, then known imported/skipped counts and the settings outcome. Distinguish complete, all-skipped, interrupted and articles-imported/preferences-failed outcomes. Retain the result until the next library operation or panel closure, without unrelated save/copy replacement. Mark the library region busy during import. DATA-02 snapshots, pre-confirm Cancel, blocked competing controls, stale-reader rejection and original preservation remain fixed. No new cancellation, automatic retry, rollback or persistence tracking. Focus remains pending.

Pass 2 score: 7 before, 10 after for visible interaction-state specification within the nine repairs. Accessibility focus requirements are not scored as resolved here. Update the Pass 2 table's pending surface references using D4–D8; the numbered answer sections are authoritative.

## Design Pass 3: User Journey and Emotional Arc

Score: 8 before, 10 after this faithful storyboard. No new journey choice; no issues, moving on. Emotions below are intended support, not user-research findings.

| Step | Writer does | Intended experience | Accepted support |
|---|---|---|---|
| 1 | Opens existing article and writes | Concentration | Preserve existing article-first workspace; no new healthy-state chrome |
| 2 | Selected library becomes unavailable | Understand the risk within seconds | Persistent above-article warning; distinguish desktop failure from portable mode; preserve path and writing |
| 3 | Exports writing or retries original library | Regain control | Existing approved export/retry protections, no silent alternate save |
| 4 | Opens Review after analysis failure | Understand the limit without doubting saving | Localized failure explanation; hide outdated analysis; keep writing/save/export |
| 5 | Edits again | Continue working | Approved next-edit retry; current-revision success replaces failure |
| 6 | Imports a backup | Understand progress over minutes | Existing conflict/settings choices, stable confirmed snapshot, explicit busy/result states and truthful partial progress |
| 7 | Clears data or exits after preferences failure | Understand exactly what happened | Operation-owned Clear results; preferences-specific exit dialog; separate article protection |

Time horizons: five seconds—identify storage vs analysis vs preferences failure; five minutes—recover/continue without losing the working article; five years—consistent honest outcomes support trust, without claiming proven trust or demand. No emotional marketing copy or new feature is added.

## Design Pass 4: AI Slop Risk

Classifier: OPERATE. The win is writing and recovering an article, not responding to a marketing composition. Score: 8 before, 8 after; no new hard-rejection pattern in the proposed repair surfaces. This is a source/plan assessment; no new generated mockup or live render exists.

Hard-rejection checks: generic first-screen SaaS grid—absent; image/weak brand—no image proposed; headline without action—recovery messages have explicit actions; busy image behind text—absent; repeated mood statements—absent; carousel—absent; stacked-card app layout—absent. Native reviewer agrees on these observations, not an external-model corroboration.

| Litmus | Result and evidence |
|---|---|
| Product unmistakable | YES: existing blunted wordmark and article workspace preserved |
| Strong anchor | YES: article, unchanged |
| Scannable | YES: existing Write/Review/Articles/Preferences labels; new status names its failed operation |
| One job per area | YES: recovery strip, analysis panels and operation results each own one task |
| Cards necessary | YES for cardless treatment: no decorative cards proposed |
| Motion improves hierarchy | NO motion proposed or required for these repairs; preserve immediate visible states |
| Works without decorative shadows | YES: hierarchy derives from article layout, labels and boundaries |

Inherited cautions remain: source uses system UI typography, small utility/status text and mostly browser-default surface styling. These trigger parts of the skill's universal/blacklist guidance, but do not establish a new repair-scope brand requirement. Preserve approved existing style; do not introduce an unsolicited font or animation overhaul. Contrast/targets/zoom remain acceptance work. The score stays below 10 rather than claiming all generic style criteria pass.

## Design Pass 5: Design System Alignment

Score: 8 before, 9 after explicit source-token mapping. DESIGN.md is absent; alignment is to verified source rather than an invented design document. A later full brand-system project could use /design-consultation; it is outside this repair review, not a blocker silently converted into scope.

Reuse src/ui/styles.css: --bg #faf9f7, --ink #24221f, --muted #6b655b, --line #e6e1d8, --accent #285b91, --focus #0b5fff; dark/system theme overrides remain authoritative. Keep --ui-family for controls and --ed-family/--ed-font/--ed-lh for article text and writer-selected preferences. New recovery messages use existing surface/ink/line/accent/focus tokens, never fixed light-only colors. Reuse native dialog and wrapping .leave-actions for D4; existing Articles status for D8; Preferences grouping for D5. D3's strip is a new required region within the existing vocabulary, not a card or floating toast. This is faithful specification of accepted style preservation, not a new visual choice.

No new design-system issue requiring a decision within scope; moving on. Missing DESIGN.md and unverified rendered behavior prevent a perfect score.

## Design Pass 6: Responsive and Accessibility (in progress)

Before score: 7/10. Source uses a 42rem article column, a wide-screen inspector from 1360px, a bottom inspector below that, and a compact header/dialog treatment at 560px. Existing native dialog containment/opener restoration is in app.js:1435-1442. Preserve these patterns; do not introduce a mobile navigation redesign. New status text/actions must wrap within their existing surfaces and remain reachable at 200% zoom; dark/forced-color support, visible focus, 44px targets, contrast and screen-reader checks remain required acceptance, not current proof.

The import confirmation currently disables the focused Confirm button; success explicitly focuses Import backup, while partial/failure paths do not (app.js:1316-1342). The accepted busy lock therefore needs a deliberate focus treatment. This concrete choice is independent of the already accepted inline status surface.

## currentDecision (DES-05 import focus)

Question: Design D9 — DES-05: Where should keyboard focus go during and after backup import?
Recommendation: A. Keep a stable reading position on the operation status when its initiating control is disabled (predictable focus and visible system status).
A) Focus the import status (recommended). Once confirmation starts import, move focus to its status region, which remains present through busy and result states. Keep the result there for success, all-skipped and partial/failure; the writer can Tab to available controls. Announce meaningful state transitions without per-article chatter. If the writer deliberately closes the panel, honor normal opener restoration; do not reopen it or steal focus on late completion. Specification effort S (human about 30 minutes / Codex about 10 minutes), low risk; outcome remains easy to read, but adds one purposeful focus move.
B) Keep focus on Confirm. Keep the initiating button focusable with aria-disabled while busy, guard all activation, and announce the inline status. Retain that button after completion until the writer dismisses the result or chooses another operation. Specification effort M (human about 1 hour / Codex about 20 minutes), medium risk; preserves control position, but changes completion cleanup and requires robust disabled-action semantics.
C) Defer focus treatment. Keep accepted import behavior/presentation but leave this keyboard gap unresolved. Specification effort S (human about 10 minutes / Codex about 5 minutes), medium risk of focus dropping when Confirm is disabled/hidden.
Fixed: no mid-import Cancel, no focus trap beyond existing native modal behavior, no change to data recovery, no implementation now. Options differ in interaction, not completeness.

## Design D9 answer

User selected A. DES-05 focus is approved: when confirmed import begins, move focus to its stable status region and retain it through busy and complete/all-skipped/partial/failed results. Tab reaches available controls. Announce meaningful transitions without per-article chatter. Honor deliberate panel closure and normal opener restoration; late completion must not reopen the panel or steal focus. This does not add mid-import cancellation. DATA-02 and D8 remain fixed; no implementation now.

### Pass 6 faithful reuse: preferences dialog and ordinary announcements

The accepted D4 dialog reuses existing chooseLeave initial focus on Keep working and Escape=Keep working, along with native modal containment and opener restoration (app.js:1435-1466). Preserve those established behaviors for the preferences variant; retry failure leaves the dialog available, successful exit still requires the article-state guard. This is the already selected existing-dialog pattern, not a new destructive-action focus default. Passive analysis errors should use status announcements rather than interrupt typing; only a focused stale control removed by D7 needs a safe local focus fallback to its persistent Review/Outline region. Do not announce failure for stale revisions. These preserve current keyboard reachability and accepted current-revision behavior.

### Pass 6 remaining focus findings

DES-06: Clear's initiating button is disabled during the approved exclusive transition; the new D5 progress/result region has no selected keyboard focus treatment. Source setWorkspaceBusy app.js:1188-1192 disables btnClearData. This parallels import but its answer cannot be inferred from D9 because it is a separate action.
DES-07: D3 retry may remove the unavailable-library strip on success while Retry holds focus. Startup or background failure must not steal focus, but user-triggered retry completion requires a safe landing when its control disappears. This is distinct from Clear and will be asked separately.

## currentDecision (DES-06 Clear focus)

Question: Design D10 — DES-06: Where should keyboard focus go while Clear runs and when its result appears?
Recommendation: A. Keep focus on the operation-owned result so disabling Clear cannot drop keyboard position (predictable focus and explicit destructive-operation feedback).
A) Focus Clear's progress/result region (recommended). After the existing confirmation is accepted, focus the D5 region beside Clear; keep it stable through complete/partial/failed results. Tab reaches re-enabled controls when the operation ends. If Preferences is deliberately closed, preserve ordinary opener restoration and prevent late focus stealing. Specification effort S (human about 30 minutes / Codex about 10 minutes), low risk; outcome is immediately readable, with one purposeful focus move.
B) Keep focus on Clear. Make its control focusable with aria-disabled while busy and guard repeated activation; announce progress/results without moving focus. Re-enable it when the exclusive transition ends. Specification effort M (human about 1 hour / Codex about 20 minutes), medium risk; preserves button position but requires extra inactive-control semantics and guards.
C) Defer focus. Preserve truthful clearing/results and locking, but leave this keyboard gap unresolved. Specification effort S (human about 10 minutes / Codex about 5 minutes); medium risk of focus dropping on a disabled control.
Fixed across options: existing confirmation, no additional deletion, no automatic retry, exclusive lock, preserved writing on failure, no implementation. Options differ in interaction, not completeness.

## Design D10 answer

User selected A. DES-06 is approved: after accepting the existing Clear confirmation, focus the D5 progress/result region beside Clear. Keep it stable through complete/partial/failed outcomes; Tab reaches re-enabled controls after the exclusive transition ends. Honor deliberate Preferences closure and normal opener restoration, without late focus stealing. Preserve existing deletion scope, confirmation, failure protection and locking. No implementation now.

## currentDecision (DES-07 Retry focus)

Question: Design D11 — DES-07: Where should focus land when a successful library retry removes the warning strip?
Evidence: D3 approves a strip containing Retry library that disappears when the configured library is available again. If Retry retains focus, removing that strip removes the focused control. Existing article body editor and Articles opener are both established destinations; startup/background failures should not steal focus.
Recommendation: A. Return to the writing task after an explicitly requested recovery, while respecting any focus move made during the await (task continuity).
A) Return to the article body (recommended). If focus is still on Retry when the user-triggered retry succeeds, move it to the existing article body editor, preserving its current text, selection and scroll; announce library availability without claiming unsaved writing has already been persisted. If retry fails, keep the warning/actions and focus there. If the writer has moved focus, do not move it back. Background/startup failure never moves focus. Specification effort S (human about 30 minutes / Codex about 10 minutes), low risk; resumes writing, but moves away from library tools.
B) Focus the existing Articles opener. On success, if focus is still on Retry, move it to the established Articles control, without automatically opening it. Same failed-retry, moved-focus and background rules as A. Specification effort S (human about 30 minutes / Codex about 10 minutes), low risk; preserves library-task context but requires another action to resume the article.
C) Defer recovery focus. Preserve D3 and ARCH-01 but leave the disappearing-control focus gap unresolved. Specification effort S (human about 10 minutes / Codex about 5 minutes); medium risk of losing keyboard position.
Fixed across options: retry only the original configured location; no alternate/default writes; no success claim before actual recovery; no new save policy or implementation. Options differ in focus destination, not completeness.

## Design D11 answer

User selected A. DES-07 is approved: after user-triggered library retry succeeds, if focus is still on Retry, return it to the existing article body while preserving text, selection and scroll. Announce availability without claiming pending writing is saved. If focus moved during the await, respect it. Failed retry retains the warning/actions; startup/background failure does not move focus. Preserve ARCH-01 original-location protections. No implementation now.

### Pass 6 completion

Score: 7 before, 9 after specification. D9–D11 resolve the concrete operation-focus gaps. Existing dialog behavior and passive status announcements are preserved as described above. Required viewport verification: at 375px/560px, wrap warning and recovery actions inside the article width and existing compact header/dialog layout; at 768px/1024px preserve the existing bottom inspector and keep messages/actions reachable above it or by ordinary scrolling; at 1360px+ preserve the 288px side inspector and article column. At 200% zoom, allow vertical reflow and dialog scrolling without clipped recovery actions or horizontal page overflow. These are verification criteria for accepted components, not a new navigation design.

Require accessible names, keyboard reachability, visible focus using --focus, meaningful non-repetitive status announcements, both theme palettes/forced colors, minimum 44px action targets and readable contrast. Do not claim source min-height alone proves target geometry. No recovery animation is introduced. Screen-reader, IME, actual target/contrast/zoom and installed-platform checks remain unverified acceptance gates, explaining the non-perfect score.

## Design Pass 7: Unresolved Decisions

Unscored. Reconciled all seven named presentation findings against individual answers. Nine product design decisions D3–D11 were individually answered A. D1 telemetry consent and D2 independent-voice authorization are workflow choices and contribute zero to that count. DES-04 had separate placement and outdated-content choices; DES-05 had separate presentation and focus choices. DES-06 and DES-07 were separately asked. No unanswered product remedy remains. Historical question blocks remain for traceability; their later answer sections supersede pending wording.

## Design scope exclusions

- Brand/font overhaul or a new DESIGN.md: preserve existing accepted style; full design consultation is a separate project.
- New animation, mobile navigation, sync, accounts, AI or telemetry in the app: no approved product scope for these additions.
- New cancellation, rollback, automatic retries or alternate storage destinations: existing approved recovery contracts govern.
- Generated visual approval: generator returned no images because credentials were unavailable; zero mockups generated or approved, no replacement board claimed.

## Design reuse inventory

Existing article-first layout; source CSS theme/focus/spacing and writer font preferences; native dialogs, wrapping actions and opener restoration; Articles status and import controls; Preferences Clear control; worker/current-revision analysis, save queue and transition guard. No DESIGN.md exists. Reuse these rather than add a component framework.

## Design Implementation Tasks

Synthesized from approved findings; these add UI specifications to the existing nine repair tasks, not nine new backend features. Estimates assume the already approved repair foundations are implemented; native/browser acceptance may require devices and reviewers.

- [ ] **T1 (P1, human: ~2h / Codex: ~20min)** — Library recovery — Implement persistent library failure strip and conditional retry focus
  - Surfaced by: ARCH-01; DES-01 D3 A; DES-07 D11 A
  - Files: src/ui/app.js, src/ui/shell.html, src/ui/styles.css
  - Verify: Inject root unavailability and retry success/failure; verify export, original-location protection, moved-focus handling and preserved editor selection/scroll.

- [ ] **T2 (P1, human: ~1h / Codex: ~15min)** — Close preferences — Add preferences-specific leave-dialog variant
  - Surfaced by: OBS-01; DES-02 D4 A
  - Files: src/ui/app.js, src/ui/shell.html
  - Verify: Reject final preferences save; exercise keep/retry/preference-only exit, Escape and article edits during await.

- [ ] **T3 (P1, human: ~2h / Codex: ~20min)** — Clear results — Own Clear progress/results and stable keyboard focus
  - Surfaced by: SEC-01/DATA-01; DES-03 D5 A; DES-06 D10 A
  - Files: src/ui/app.js, src/ui/shell.html
  - Verify: Inject complete/partial/failed clearing, verify retained writing, exclusive barrier, stable focus and no unrelated notice overwrite.

- [ ] **T4 (P1, human: ~2h / Codex: ~20min)** — Analysis states — Show contextual analysis errors and remove stale derived results
  - Surfaced by: ERR-01; DES-04 D6/D7 A
  - Files: src/ui/app.js, src/ui/shell.html
  - Verify: Exercise worker/main/structure failures and stale responses; verify unavailable notes/outline/scores, safe controls, next-edit recovery and unchanged writing/save/export.

- [ ] **T5 (P1, human: ~2h / Codex: ~20min)** — Backup import — Present import progress/results and stable operation focus
  - Surfaced by: DATA-02; DES-05 D8/D9 A
  - Files: src/ui/app.js, src/ui/shell.html
  - Verify: Exercise complete/all-skipped/partial/preferences-failed import, stale readers and competing choices; verify known counts, focus and no late focus stealing.

- [ ] **T6 (P1, human: ~3h plus reviewer/device time / Codex: ~45min plus reviewer/device time)** — Recovery accessibility — Verify approved recovery surfaces across responsive and accessible modes
  - Surfaced by: Design Pass 6; existing accessibility acceptance contract
  - Files: src/ui/app.js, src/ui/shell.html, src/ui/styles.css, docs/accessibility.md
  - Verify: Run appropriate existing regressions and targeted keyboard/browser checks at 375/560/768/1024/1360 widths, 200% zoom, light/dark/forced colors; record screen-reader/IME and installed-platform acceptance separately.


_No new tasks from Pass 3 journey, Pass 4 style assessment or Pass 5 token mapping; preserve their existing contracts._

## Design approval reconciliation

Approved build work maps only to D3–D11 and the nine prior CEO repairs. No outside-review suggestion alone is authority. DES-01 D3; DES-02 D4; DES-03 D5; DES-04 D6/D7; DES-05 D8/D9; DES-06 D10; DES-07 D11: all A. No TODO proposal remains; in-scope verification is included above rather than deferred. No TODOS.md created. Native single-model review supplied six findings; Claude Code unavailable, no external-model corroboration. Six tasks are unimplemented.

## Design Review Completion Summary

| Item | Result |
|---|---|
| System audit | No DESIGN.md; existing offline article editor and failure/recovery scope |
| Step 0 initial impression | 7/10, separate from minimum-pass aggregate |
| Pass 1 information architecture | 8 → 10 |
| Pass 2 states | 7 → 10 |
| Pass 3 journey | 8 → 10 |
| Pass 4 style specificity | 8 → 8 |
| Pass 5 design system | 8 → 9 |
| Pass 6 responsive/accessibility | 7 → 9 |
| Pass 7 decisions | 7 named findings resolved, 0 deferred |
| Decisions made | 9 individually approved product choices |
| Overall minimum-pass score | 7 → 8/10 |
| Scope exclusions/reuse inventory | Written above |
| TODO proposals | 0 |
| Mockups | 0 generated, 0 approved |
| Implementation | 6 supplemental tasks; no app changes |
| Unresolved decisions | 0 |

The bounded plan is design-complete; this is plan quality, not implemented UI quality or release acceptance. Run visual/keyboard QA after repairs. Engineering must reconcile the added interaction specifications before implementation is considered locked; the earlier engineering report did not review this final design supplement.

## Engineering reconciliation — final design supplement (2026-10-26)

Target: this saved plan's accepted D3–D11 design supplement. Existing CEO and first engineering review remain binding. No product implementation authorized by this review. Scope accepted as-is (FULL_REVIEW); no new product remedy choice needed.

### Preparation and scope challenge

The prior office-hours skip is reused; do not re-offer it. No separate design-doc helper result was returned; the selected document contains the completed design specification. Startup proactive preference A saves core suggestions; it approves no engineering remedy. Estimated selected implementation files: five (app.js, shell.html, styles.css, tests/workspace.test.js, docs/accessibility.md); zero new classes/services, so no new complexity selector. The larger nine-repair arrangement remains the exact prior approved arrangement; this supplement adds no service or packaging artifact. Existing Node VM and native dialog APIs are reused [Layer 1]; no new architectural/concurrency pattern requires external research. Brain digests unavailable due cache-directory permission; no memory-derived assumption. Learning search returned no relevant record; no learning writes performed.

Local source history has no implementation commit after 7c547a6; no revert hit for selected paths. Fetch again failed opening .git/FETCH_HEAD, so remote freshness is unknown. No remote completion inferred. No TODOS.md or linked issue introduces additional requests. Existing one-wave/one-PR default remains; no PR created. Prior local test/build results remain historical evidence, not freshly rerun or acceptance of future UI.

### Premise table

| Premise | Claim | Receipt | Verdict |
|---|---|---|---|
| Style and focus primitives | Existing themes, native dialog containment and opener restoration can be reused | src/ui/styles.css:2; src/ui/app.js:1435 | verified source |
| Current tests | Node VM fixture models focus but not browser dialog layout or assistive technology | tests/workspace.test.js:11; docs/accessibility.md:19 | verified limitation |
| Retry safety | Startup initializer can replace editor state, so cannot be blindly reused for recovery | src/ui/app.js:1528; src/ui/app.js:1565 | verified interface hazard, proposed caller not implemented |
| Remote fixes | Remote contains no newer work | .git/FETCH_HEAD fetch failed | unverified; must refresh before implementation gate |

unverified=1. Estimates below are planning estimates, not measured performance.

REALITY: premise-table pass verified local premises and isolated remote unknown docs/ceo-review-2026-10-26.md:2367
REALITY: already-done finding fetch permission denied; local history inspected, remote freshness unknown src/ui/app.js:1528
REALITY: surface-check pass existing commands read from package scripts; helper commands executed package.json:9
REALITY: binding-decisions pass exact D3-D11 answers retained; decision search returned no overriding record docs/ceo-review-2026-10-26.md:2322
REALITY: numbers pass five selected files estimated, zero new services, nine approved design choices docs/ceo-review-2026-10-26.md:2322
REALITY: deferred-asks pass no linked issue; acceptance carried forward docs/accessibility.md:19
REALITY: pr-count pass one wave default; no split or publication proposed package.json:2

### 1. Architecture review

[INFORMATIONAL] (confidence: 9/10) src/ui/app.js:1565 — `if (loaded && loaded.doc && typeof loaded.doc.body === "string") {` is the startup load path. A proposed Retry caller must not use initialization to replace current writing, preferences or cursor. Preserve D3/D11 and ARCH-01 by retrying original-root availability/loading separately from active-editor adoption; only mark recovery after actual original-root success. Let the existing save policy govern pending writing; do not claim retry itself saved it. Failure retains unavailable status. This is required implementation detail of prior approved preservation, not a new merge policy. Disposition: accepted exact ARCH-01/D11 contract.

[INFORMATIONAL] (confidence: 9/10) src/ui/app.js:302-307 — `renderOutline(r.structure); renderScore(r); renderIssues(r); renderBackdrop(editor.value, r);` exposes several consumers. Apply D7's unavailable/current state consistently to notes, full findings, headings, section lengths, score/detail displays and annotations, with a current-revision check on success and error. Older replies cannot clear current failure; editing/save/export remain independent. Disposition: accepted exact ERR-01/D6/D7 contract.

```text
original-root retry -> original bridge load/probe
  failure -> preserve editor + unavailable strip + export/retry
  success -> update library availability without adopting loaded.doc into editor
    still focused on Retry? yes -> editor focus, preserve selection/scroll
                            no -> leave focus alone
    saving -> existing approved policy; only save acknowledgement may say Saved

analysis request(revision) -> worker / main fallback / structure report
  obsolete response or error -> ignore
  current failure -> clear busy -> unavailable derived views -> next edit retries
  current success -> atomically publish current derived views

Clear/import confirmed -> existing transition/queue + immutable inputs
  operation-owned status focused -> busy -> truthful result -> controls unlock
  panel closed deliberately? -> opener restored; late completion never steals focus
```

Security/deployment: no new IPC, permissions, network, storage destination or release artifact; retain SEC-02 least privilege and REL-01 installer acceptance. Existing native data boundaries remain covered by the original review.

### 2. Code quality review

[INFORMATIONAL] (confidence: 9/10) src/ui/shell.html:165 — `Keep this writing?` and `Discard unsaved changes` belong to the article dialog; app.js:1464 `function chooseLeave(message)` changes only its message. D4 requires a preferences-specific variant with complete title/button/message reset per invocation, so a later article failure cannot inherit preferences-only labels/actions or vice versa. Preserve per-invocation resolver ownership and existing Keep working/Escape behavior. Disposition: accepted exact D4/OBS-01 behavior; no new extraction or service.

Reuse existing openPanel/closePanel and saveQueue/transition guard, while preserving operation-specific state. The Clear, import and retry statuses have different lifetimes; similar wording does not justify an option-heavy shared status controller. No extraction proposed, so no invented line-saving claim. A small local helper is implementation mechanics only if it preserves these distinct contracts. No app refactor is authorized.

### 3. Test review

Existing tests: tests/workspace.test.js:70 preserves editor node/selection/scroll; :81 copy/skip import; :88 load failure blocks writes/portable keys; :100 and :110 article-close save/discard; :115 stale worker success. They do not prove the new error surfaces, focus ownership, status lifetime or preference-dialog reset. Node focus is a stub at :18 and nodes are synthesized by id; only real browser/native checks establish geometry, native focus containment and actual accessible announcements.

```text
[GAP required] root unavailable -> export/retry -> success/failure -> conditional focus
[GAP required] prefs close failure -> keep/retry/exit -> article guard -> next article dialog reset
[GAP required] Clear -> confirmation -> lock/status -> complete/partial/fail -> unlock/focus [→E2E]
[GAP required] current analysis failure -> all derived views unavailable -> next edit -> current success
  [existing ★★★] stale worker success during debounce (workspace.test.js:115)
  [GAP required] stale error/success after a newer failure; structure failure
[GAP required] import -> immutable choices -> progress -> complete/skipped/partial/prefs-failed [→E2E]
  [existing ★★] copy/skip and preference opt-in (workspace.test.js:81,104)
[GAP required] real keyboard -> panel closure/reopen -> late result -> no focus theft
```

No numeric coverage percentage is claimed: paths span future code and existing mocks. Extend the existing workspace fixture through its real bridge and DOM boundary, using controlled promises/failures; no production-only test export or framework. Preserve original nine regression families and current startup/engine/article/native tests. New assertions are necessary proof of exact approved behavior, not new optional scope. No tests retired and no LLM/eval scope (entirely offline deterministic app).

Five additional test-family gaps: library retry preservation; preferences dialog isolation; Clear result/focus ownership; analysis stale-result presentation; import result/focus ownership. Each is mapped to exact design answers, not a sixth backend defect. Dispositions: accepted D3–D11 and prior regression contracts. QA artifact includes these plus inherited acceptance.

### 4. Performance review

No new performance finding. Keep status announcements to meaningful transitions (D9), not one per imported article. Retain one lightweight failure region per operation rather than duplicate the library or article into recovery DOM. Existing full-library load and sequential import I/O remain the prior performance concern; no new cache, benchmark or cancellation architecture is justified by these UI choices. Library-size timing and typing responsiveness remain unknown until representative acceptance. Disposition: prior concern carried forward; no new remedy.

### Failure modes and outside voice

Existing silent paths still present in current source: main analysis catch returns without UI (app.js:236) and final preferences catch swallows failure (app.js:1425). Two critical silent gaps are carried into this supplement's analysis/close paths, not newly reproduced defects. Other proposed path failures have explicit approved handling but remain unimplemented and untested; do not label their hypothetical failures observed.

Claude Code preflight again returned not_installed; outside reviews not disabled (stored value unset). Required bounded fallback needs Plan/TaskStop/background-timer tool surfaces absent from this host. No outside task launched, no completed review, no cross-model credit. Native design review remains historical single-model evidence, not an engineering outside voice.

### Reconciliation decision ledger

| Finding | Actual authority | Disposition |
|---|---|---|
| Retry must preserve active editor | CEO ARCH-01; Design D3/D11 A | exact approved contract; no new adoption policy |
| All analysis-derived consumers become unavailable | CEO ERR-01; Design D6/D7 A | exact approved contract |
| Preferences variant must not leak into article dialog | CEO OBS-01; Design D4 A | exact approved contract |
| Five required UI test families | Design D3–D11 A; existing regression contracts | required proof, no new policy |

Approval readiness: PASS — ARCH-01, ERR-01, OBS-01 and Design D3–D11 checked against actual answers. Setup A and navigation A add no remedy authority. Unresolved decisions: 0.

### Execution and scope

Sequential implementation, no parallelization opportunity for this UI supplement: shared src/ui state, dialogs and tests. Preserve original independent packaging preparation lane; its Windows acceptance does not block unrelated local UI preparation. Implement existing storage/queue repairs before wiring the respective presentation, then verify each feature plus unchanged article behavior. No new branch, worktree, framework, service or publication needed by this review. Existing design task T1–T6 remain the implementation checklist; this reconciliation adds constraints/assertions to them, not duplicate feature tasks. Refresh remote evidence before implementation/ship gates.

NOT in scope: app implementation, new brand design, new cancellation/rollback/save policy, broader performance refactor or remote release. What already exists: native dialogs, shared queue/transition guard, selected-root bridge, revision guards, source CSS tokens and workspace tests; reuse all. No new TODO proposals; no suppressed speculative findings.

### Engineering reconciliation completion summary

Scope accepted as-is; five selected files estimated, zero new services. Four-section findings: 2 architecture + 1 code-quality + 5 test-family gaps + 0 performance = 8. Scope challenge remote-freshness finding and outside unavailability counted separately. Critical silent gaps: 2 inherited instances, not two new product defects. Unverified premises: 1 remote state. Unresolved decisions: 0. No fresh implementation/test acceptance claimed. Engineering and design specifications reconciled; all nine original repairs and six supplemental design tasks remain unimplemented.

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|---|---|---|---|---|---|
| CEO Review | /plan-ceo-review | Scope/strategy | 1 | ISSUES OPEN; source retained, history unlogged | Nine approved unimplemented repairs |
| Eng Review | /plan-eng-review | Final design reconciliation | 2 | ISSUES OPEN (PLAN); choices resolved | Latest: eight mapped findings, two inherited silent gaps; zero unresolved; design supplement reconciled |
| Outside Review | Claude Code preflight | Independent opinion | 0 completed | UNAVAILABLE | Not installed; bounded native fallback unavailable |
| Design Review | /plan-design-review | Failure UI/accessibility | 1 | CLEAN (PLAN, FULL); accepted content preserved | 7→8, nine choices; final report hash superseded by this appended reconciliation |
| DX Review | /plan-devex-review | Developer experience | 0 | NOT RUN | No developer-facing expansion |

**OUTSIDE COVERAGE:** plan-review Claude Code unavailable; no completed external engineering review. Prior design native subagent was single-model and does not fill this gap.

**VERDICT:** All relevant plan reviews complete and final design supplement reconciled. Approved implementation choices are settled. Repairs, regression proof, remote freshness and installed/platform/user acceptance remain pending. NOT CLEARED for release; eng review required after implementation.

NO UNRESOLVED DECISIONS
