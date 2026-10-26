# Offline article workflow

Version 1.0.0 is a desktop-first expansion for independent writers working
on essays, explainers and opinion pieces. Older versions do not include this workflow.

## Use the app

1. Open **Articles** for search, New and your article titles. Each article has a
   menu for rename or trash. The panel menu contains trash, backup, restore and
   save-location information. Outline is available here and through **More**.
2. Write in the centred article column. The title sits above the Markdown source.
   Formatting lives in More; Cmd/Ctrl+B and Cmd/Ctrl+I remain available.
   The footer shows words and save status; select the word count for metrics.
3. Choose **Review** for one active Clarity or Structure note. Inspect its passage,
   explanation and optional replacement before Apply or Dismiss. Previous/Next
   and F2/Shift+F2 navigate. All notes offers incrementally loaded remaining notes,
   separate self-review prompts and dismissed notes. Restore individual dismissals
   without resetting other decisions. Options holds rules and detailed statistics.
4. **Read** renders the article locally. Outline stays in Read. Numbered lists keep
   their numbering; omitted images have labelled placeholders. Link destinations
   can be disclosed without fetching them. Raw HTML remains literal text.
5. More contains Markdown/plain-text export, Copy and Print. Exports include the
   headline by default; turn that option off for body-only output. Application
   metadata stays out of prose. Print uses the clean reading layout.

The article column stays at a maximum of 42rem in all modes. Review uses a
288px side inspector from 1360px, and a bottom inspector below that width.
Navigation and reading positions are stored separately from article dates.

The desktop library stores all articles independently in the selected folder's
`articles/` subfolder. New article IDs are independent of titles. Existing
single-draft data is copied once, leaving legacy files untouched. Missing or
corrupt main files restore from the newest valid backup. If no backup works,
loading stops with a visible error and files are preserved. In v1.1.0, use
**Export article** to keep current writing, then **Retry library** after restoring
the original location. Retry preserves the active writing and editing position.

Saved means the current article snapshot was written successfully. Save errors
remain visible and actionable. When switching with unsaved work, choose Keep
working, Save or Discard; private sessions offer Keep working or Discard.
Export from More while continuing work, then retry the transition. Closing a
normal desktop window waits for saving. Force quitting or power loss can lose
changes since the latest successful autosave.

**Back up library** exports articles, trash, review settings and global writing
preferences to one JSON file. **Restore backup** validates it before import.
For existing article IDs, choose separate copies or skip. Nothing is silently
overwritten. Global preferences are optional on restore. Imports commit one
article at a time; a disk failure reports partial progress. Retrying with Skip
avoids duplicate IDs; copies intentionally receive new IDs. Backups are plain,
unencrypted files. Keep them somewhere safe yourself; there is no sync.

Portable HTML retains one localStorage draft, its existing recovery slots and
individual exports/settings files. It includes outline, preview and reviewers;
the desktop library and library backups are not exposed there.

## Delivery and acceptance

Implemented in order: library and save protection; writing/navigation;
Clarity/Structure reviews; export/backup and acceptance checks.

Automated checks:

- `npm test`: 58 passing tests covering engine and startup regressions, independent article workflows,
  queued-save acknowledgements, switching after failure, trash/restore,
  preview selection/scroll preservation, dismissals and backup conflict choices.
- `cargo test --offline --manifest-path src-tauri/Cargo.toml`: five passing filesystem
  migration, same-title independence, corrupt/missing main recovery, trash
  persistence, invalid paths and write failures.
- Article fixtures target 1,000, 5,000 and 20,000 words, verify exact UTF-16 note
  offsets and report engine plus structure duration. These are not UI latency
  measurements or guarantees about hardware performance.
- `npm run build` and `npm run bundle:tauri`: portable and native frontend bundles.

Local verification on macOS used an ad-hoc-signed debug QA bundle with a
separate application identifier and a disposable folder under `/private/tmp`.
First launch, real folder selection, legacy migration, creation, saving,
switching, trash/restore and close/reopen were exercised. Applying a Clarity
replacement and native Cmd+Z restored the original wording. The legacy file
remained intact, and independent article/backup files were inspected. An initial
first-launch hang was reproduced and corrected by moving blocking native dialog
commands off the main UI thread, as required by the dialog library.

Browser checks exercised drafting, both reviewers, reading preview and Undo
after a Write → Read → Write round trip. This does not establish Windows
behavior, installed release behavior or screen-reader acceptance.

Release gates still require installed Mac and Windows cold launches without
networking, real save-folder permissions/errors and upgrade checks, native
Undo across view switches on both platforms, assistive-technology checks, typing latency
on representative hardware and a completed article from each of five
independent writers. Do not label those gates complete based on unit tests.

For writer acceptance, ask each participant to import or start a real article,
organize it with headings, complete both review passes, export it, close/reopen
it and restore a backup into a separate test library. Record observed failures
and whether each review helped. Resolve text-loss, recovery and blocked-workflow
problems before broad release. Recruitment and sessions have not been conducted.
