# blunted implementation contract

Date: 2026-10-26
Status: **Implemented in the working tree; local evidence recorded; mandatory external acceptance remains blocked.**
Baseline: `7c547a625561a3717953c626bdee862bd39aeaa4` (`main`).

This contract consolidates the approved CEO, engineering and design decisions in
[the review](ceo-review-2026-10-26.md). It is the implementation checklist for that
scope. The review retains the evidence and decision history. This document does
not certify that a repair, test, installation or user session has happened.

The contract-authoring request originally authorized this specification only. A
subsequent direct request on 26 October 2026 authorized implementation with
subagents. Implementation and bounded verification are recorded in
[the evidence ledger](implementation-evidence-2026-10-26.md); user-data deletion,
publication and live release settings remain outside that authorization.

## 1. Binding scope and invariants

Deliver all nine repair packages below, including their accepted presentation and
regression requirements. The six design tasks and eight engineering reconciliation
findings refine these packages; they are not additional independent features.
No approved requirement may disappear through a task split or a simpler design.

- Preserve the offline, desktop-first article workflow, portable single-draft
  edition, Markdown exports, independent library articles and three portable backups.
- Preserve writing, native textarea identity, selection, scroll, Undo and composition
  except where an existing, explicitly confirmed operation intentionally changes them.
- Keep article persistence, preferences persistence and analysis outcomes distinct.
  A successful retry or analysis is not an acknowledgement that writing was saved.
- Reuse existing native dialogs, save queue, transition guard, revision checks,
  selected-root bridge, CSS themes and Node/Rust testing tools.
- Preserve original files and user work when failure prevents safe completion.
  Report partial operations truthfully; do not promise rollback or secure erasure.
- No sync, accounts, app telemetry, AI service, new brand system, framework,
  broad refactor, automatic recovery retry or mid-import cancellation is added.

## 2. Repair packages and acceptance

### R1 — Configured library fails closed (`ARCH-01`)

Authority: CEO D2 A; Design D3/D11 A; engineering root-boundary and retry refinements.

Required behavior:

- Distinguish no configuration from an unreadable, missing or unavailable configured
  location. Preserve the selected path and existing files.
- Once configured, failure must not silently select default/alternate storage or
  write there. Cover disappearance between command preflight and actual I/O.
- `library.rs` must not recursively recreate an unavailable configured parent as a
  side effect of loading/saving. Preserve legitimate initial setup separately.
- Desktop-library failure remains a desktop-unavailable state, never portable mode.
- Show a persistent strip below the header and above the article, containing
  **Export article** and **Retry library**. Unrelated notices cannot replace it.
- Retry the original location. Do not run startup adoption in a way that replaces
  active writing, preferences, cursor or scroll with loaded data.
- On successful user-triggered retry, if focus is still on Retry, return it to the
  existing article body and preserve selection/scroll. Respect focus moved during
  the await. Failure retains the warning/actions. Background failure does not steal focus.
- Announce recovery only after actual availability is established; existing save
  acknowledgement rules still govern the Saved state.

Required proof: absent/malformed/unreadable configuration as applicable; initial
setup and folder-selection cancellation; missing configured root; root disappearing
during save/load; no alternate writes or unwanted parent recreation; export during
failure; retry success/failure; active-editor and conditional-focus preservation.
Use Rust filesystem fixtures plus UI bridge tests and actual disposable-folder checks.

### R2 — Recoverable analysis failures (`ERR-01`)

Authority: CEO D3 A; Design D6/D7 A; engineering derived-view refinement.

- A current-revision worker/main-thread/structure-analysis failure enters an explicit
  shared failure state, clears busy indicators and prevents stale Apply actions.
- Show persistent feature-owned messages in Review and Outline, using the matching
  feature name: “Review is unavailable. Your writing is unchanged. Editing again
  will retry.” Do not add a Write-mode analysis banner or new Retry button.
- Hide outdated notes, full findings, heading navigation, section lengths,
  analysis-derived score/detail displays and editorial annotations. Preserve text,
  editing, saving, exports and non-analysis information.
- The next edit retries analysis. Only a successful current-revision result may
  repopulate derived views. Obsolete successes and errors cannot replace current state.
- Passive errors do not interrupt typing. If a focused obsolete control is removed,
  preserve keyboard reachability through its stable local Review/Outline region.

Required proof: injected worker failure/fallback, main analysis exception, structure
exception, cleared busy state, all derived consumers unavailable, next-edit recovery,
stale success/error ordering and unchanged writing/save/export. Extend existing
workspace/revision tests through real boundaries, without production-only test seams.

### R3 — Truthful Clear results (`SEC-01`)

Authority: CEO D4 A; Design D5 A. Concurrency and focus also require R5.

- Propagate portable and native deletion errors. Distinguish complete, partial and
  failed clearing. Already-absent data counts as success; all intended removals
  must succeed before claiming complete clearing.
- Preserve editor writing on failed/partial completion. Describe only known
  removals/failures; do not claim that all files survived a partial deletion.
- Give Clear its own progress/result region beside the control in Preferences.
  Show “Clearing local data…” while busy, then the actual outcome and retained-writing
  explanation where applicable.
- Keep that result until another Clear attempt or panel closure; historical result
  persistence on reopening is not required. Save/copy notices cannot overwrite it.
- Repeated attempts retain the existing destructive confirmation. No rollback,
  automatic retry, expanded deletion scope or secure-erasure guarantee is introduced.

Required proof: portable removal rejection; native file deletion rejection; partial,
complete and already-absent cases; truthful UI and preserved editor. All destructive
fixtures must contain disposable synthetic data, never the user's real library.

### R4 — Remove unused renderer filesystem access (`SEC-02`)

Authority: CEO D5 A.

- Remove unused filesystem-plugin capability grants, native registration and direct
  Cargo dependency. Update the lockfile through normal dependency tooling if needed.
- Preserve intended custom native commands and dialogs, selected-folder access,
  article load/save, recovery and exports. Do not widen another capability as compensation.

Required proof: native build/checks; effective renderer filesystem-plugin calls are
denied in a disposable native runtime; intended selected-folder load/save/recovery/
export still work. A source search or deleted dependency alone does not prove runtime denial.

### R5 — Exclusive Clear transition (`DATA-01`)

Authority: CEO D6 A; Design D10 A.

- Use the existing transition guard and serialized save queue to give Clear
  exclusive ownership through completion. Temporarily block editing and competing
  mutations, drain pending writers and invalidate scheduled callbacks that could
  recreate cleared data.
- Cover both save-before-clear and clear-before-save completion orders, repeated
  requests and pending article/preferences/workspace timers as applicable.
- After confirmation, focus Clear's stable progress/result region. Retain it through
  complete/partial/failed outcomes. Unlock controls on every completion/failure path.
- If Preferences is deliberately closed, preserve normal opener restoration;
  late completion must not reopen it or steal focus. R3's truthful results still apply.

Required proof: controlled promise ordering, late timers/callbacks, repeated Clear,
failure/unlock, no unintended resurrection and stable/conditional focus. Verify
the destructive flow end to end against disposable storage as well as mocked ordering.

### R6 — Stable backup import (`DATA-02`)

Authority: CEO D7 A; Design D8/D9 A.

- Snapshot the validated backup and confirmed conflict/settings choices before
  awaits. Block competing restore controls and ignore stale/competing reader callbacks.
- Keep pre-confirmation Cancel. Preserve existing copy/skip behavior, originals,
  no-overwrite guarantees and truthful partial progress. Add no mid-import Cancel.
- Use an import-owned status beside existing Articles import controls. Show
  “Importing articles…” and mark the region busy, then known imported/skipped counts
  and settings outcome. Distinguish complete, all-skipped, interrupted and
  articles-imported/preferences-failed outcomes.
- Retain the result until another library operation or panel closure. Unrelated
  save/copy feedback cannot replace it. No new persisted operation history is required.
- On confirmed start, focus the stable status region; retain it through results.
  Announce meaningful transitions without per-article chatter. Tab reaches available
  controls. Respect deliberate panel closure and prevent late focus stealing.

Required proof: paused-save cancellation/selection races; changing options after
confirmation; out-of-order file reads; copy/skip/empty/all-skipped imports; article
save failure and preferences failure after partial progress; control unlock; status
ownership and real keyboard flow. No generic success assertion may stand in for counts/content.

### R7 — Preserve the last valid portable copy (`DATA-03`)

Authority: CEO D8 A.

- Validate rotation inputs. Keep at least one valid persisted copy until replacement
  main storage succeeds, including recovery from any backup slot with corrupt main data.
- Preserve three backups, working editor text and export access. Do not rotate
  corrupt content over the only valid copy before a replacement is durable.

Required proof: recovery from each slot; corrupt main/other slots; write rejection
and aggregate quota pressure at meaningful write boundaries; reload after failed
replacement still finds a valid persisted copy. Include real-browser storage-failure
checks where available; a synthetic quota model is local evidence, not browser acceptance.

### R8 — Honest preferences failure during exit (`OBS-01`)

Authority: CEO D9 A; Design D4 A; engineering late-edit/dialog-isolation refinements.

- A final preferences-save failure keeps the window open until retry succeeds or
  the writer explicitly chooses a preferences-only exit.
- Reuse the leave dialog with a preferences-specific variant titled
  **Preferences could not be saved**, with **Keep working**, **Retry saving preferences**
  and **Exit without saving preferences**. Explain the failed object precisely.
- Preserve Keep working initial focus, Escape=Keep working, native containment and
  opener restoration. Reset title, message, labels and resolver state for each use;
  later article-close prompts must not inherit preferences-only actions.
- Preserve article protections through the final preferences await. Recheck current
  dirty/operation state before granting exit, while retaining an intentional prior
  article discard. Preferences-only discard must not discard newly edited writing.

Required proof: preference rejection/retry/explicit exit; no article mutation;
late edits while preferences save is pending; preserved intentional article discard;
repeated close attempts; preferences dialog followed by ordinary article dialog;
native final-exit behavior with disposable writing.

### R9 — Genuinely offline Windows installation (`REL-01`)

Authority: CEO D10 A.

- Use Tauri's `offlineInstaller` WebView runtime embedding instead of the network
  bootstrapper. Align release/install documentation with actual package behavior.
- Build required release artifacts and record their hashes/provenance. Do not reuse
  the baseline artifact hash to describe changed binaries.
- Verify disconnected Windows installation with runtime absent and runtime present,
  then offline app launch and existing upgrade/data-preservation paths. Preserve
  existing Mac acceptance requirements.

Required proof: configuration/build checks plus actual disconnected Windows machine
or VM records identifying OS, architecture, runtime state, installer hash and outcome.
Local configuration tests and CI artifacts cannot establish cold-machine installation.
This package does not authorize signing purchases, uploads, publication or deployment.

## 3. Execution order and change boundaries

1. Refresh repository/remote evidence before implementation; if unavailable, record
   that limit and avoid claiming current remote parity. Inspect existing changes
   and preserve the review document and unrelated `marketing/` work.
2. Reproduce each applicable failure before repairing it. Reuse bounded review
   probes where valid; turn the important behavior into maintainable regression
   coverage. Preserve synthetic pre-fix and post-fix evidence.
3. Implement R1 storage boundaries; R3/R5 truthful exclusive clearing together;
   R6 snapshot-safe imports; R7 portable persistence; R8 close protection; R2 analysis
   recovery. Wire each accepted UI treatment with its owning repair, not as detached polish.
4. R4 permission reduction may be prepared alongside the native work but requires
   verification of working intended commands after integration. R9 packaging
   preparation is independent; Windows availability blocks its acceptance only.
5. Sequence edits to shared UI/state/tests. No parallel agents or worktrees are
   required by this contract. Preserve the existing module boundaries; named files
   below are an estimate, not a mandatory count or a license for unrelated edits.
6. Run integrated regression/build checks, browser/native checks and acceptance
   gates; update documentation and evidence to match what actually passed.

Expected authored areas: `src/ui/app.js`, `src/ui/shell.html`, `src/ui/styles.css`,
`src-tauri/src/main.rs`, `src-tauri/src/library.rs`, native adapter/capability/Cargo
configuration, Tauri packaging configuration, existing tests and affected docs.
Generated outputs/lockfiles may change through their normal build tools.

## 4. Verification and evidence contract

Use existing `npm test`, `cargo test --offline --manifest-path src-tauri/Cargo.toml`
where dependencies are available, the build scripts and appropriate native bundle
checks. Extend current workspace/storage/native fixtures; add no production-only
test hooks. Keep existing startup, article, engine, portable and native regressions.
No existing test is approved for retirement.

For every repair, record: baseline/repaired commit or diff, reproduction inputs,
command or manual procedure, environment, observed before/after result and evidence
path. For failure injection, identify the mocked boundary and what it cannot prove.
Record actual artifact hashes after builds. Test counts alone are not acceptance.

The newest engineering QA artifact preserves the original nine repair families and
the final design assertions. Its requirements are consolidated above; this contract
does not depend on private local artifact paths remaining available.

### Responsive and accessible recovery surfaces

- Preserve existing theme tokens, native dialogs, article column and inspector
  patterns. No redesign of navigation or typography is required.
- Verify narrow layouts at 375/560px, intermediate 768/1024px and side-inspector
  layout at 1360px+. Recovery text/actions wrap and remain reachable.
- Verify 200% zoom, light/dark/forced colors, visible focus, meaningful accessible
  names/status announcements and minimum 44px action targets. CSS min-height and
  simulated focus alone do not prove these conditions.
- Verify actual native/browser keyboard movement, including panel closure during
  awaits, stale control removal and dialog mode changes. Preserve IME, composition,
  native Undo and the writer's selection/scroll.

### Existing acceptance gates remain required

- Installed Mac and Windows cold install/launch without networking; upgrades preserve
  existing libraries; Windows additionally satisfies R9's absent/present runtime cases.
- Real selected-folder permission failures and folder disappearance; intended IPC
  works and removed filesystem-plugin access is effectively denied.
- Native Undo across view switches on both platforms.
- VoiceOver and Windows screen-reader acceptance, IME, zoom, targets and contrast.
- Typing latency on representative hardware and documents; record conditions/results
  without inventing a numerical performance threshold or claiming a unit test proves it.
- Each of five independent writers completes a real article workflow: start/import,
  headings, both review passes, export, close/reopen and restore a backup into a
  separate test library. Record failures and whether review helped. Resolve text-loss,
  recovery and blocked-workflow problems before broad release.

Device, reviewer or participant availability can block a particular acceptance row;
it must not prevent completion of unrelated locally possible implementation work.
Recruitment, messaging participants, paid services and publication require their own
authorization; do not fabricate those results to close the contract.

## 5. Completion ledger and release boundary

Use these exact evidence states: **Not started**, **Implemented—unverified**,
**Locally verified**, **Platform accepted**, **Blocked**, **Failed**. A blocked or
failed requirement is incomplete. Include the concrete blocker and next action.

| Package | Implementation/local proof | Platform/acceptance proof |
|---|---|---|
| R1 configured library | Locally verified | Blocked |
| R2 analysis failures | Locally verified | Blocked |
| R3 truthful Clear | Locally verified | Blocked |
| R4 least privilege | Locally verified | Blocked |
| R5 exclusive Clear | Locally verified | Blocked |
| R6 stable import | Locally verified | Blocked |
| R7 portable last-good copy | Locally verified | Blocked |
| R8 preferences exit | Locally verified | Blocked |
| R9 offline installer | Implemented—unverified | Blocked |
| Cross-cutting accessibility/Undo/performance | Locally verified | Blocked |
| Five writer workflows | Not applicable | Blocked |

Local states above cover only the evidence boundaries listed in the linked ledger.
Windows artifact generation, platform acceptance and independent writer sessions
remain incomplete; neither completion label is claimed.

**Implementation complete** means all nine packages are implemented, required local
regressions/builds pass, documentation is accurate and remaining external gates are
explicitly listed. This label does not mean this entire contract is complete.

**Contract complete** requires every mandatory implementation, platform and writer
acceptance requirement above to have passing evidence, with no unresolved text-loss,
recovery, blocked-workflow or release-blocking failure. Finish with a fresh engineering
review of the implemented changes and visual/keyboard QA of the actual UI.

Neither label authorizes release. Publication, merging/deployment, paid signing and
other external writes follow the applicable separately authorized release workflow.
Do not claim production readiness from a reviewed plan, local tests, hashes or a
successful build alone.

## 6. Changes to this contract

The accepted behavior is fixed by the referenced decisions. Routine implementation
mechanics and necessary regression proof need no new product decision. If an actual
constraint makes an approved outcome infeasible or introduces a new policy/tradeoff,
record the exact conflict, preserve completed work and ask only about that change.
Never silently downgrade a requirement or mark a deferral complete.
