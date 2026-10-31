# Changelog

All notable changes to blunted will be documented here. Format follows
(loosely) Keep a Changelog.

## [1.2.1] - 2026-10-31

- Add genuine native whole-interface zoom, including 200% and Actual Size reset.
- Improve placeholder contrast in light and dark themes.
- Keep Clear confirmation in one accessible modal with a named warning, visible
  Cancel focus and safe cancellation/focus restoration.
- Clear stale autosave and preferences error notices after successful recovery,
  preserve unrelated notices, and expose the underlying reason for save failures.
- Expand the Mac acceptance ledger while keeping Windows, clean-Mac and
  independent-writer requirements separate.

## [1.2.0] - 2026-10-27

- Bundle Harper 3.0.0 for fully offline English spelling, grammar and punctuation
  checking. Preview alternatives, Apply individual undoable edits, keep intentional
  words for an article, and choose among five English varieties in Settings.

- Preview the original and proposed text before applying supported Clarity edits
  or Structure heading-level corrections. Edits stay offline and use native Undo;
  stale suggestions cannot change newer writing.
- Group settings into Appearance, Review and Library, with advanced review controls,
  separate destructive data controls and visible settings-save feedback.
- Preserve CRLF heading recognition and formatting in Structure review.
- Require an explicit in-app confirmation before clearing local data, and keep
  closing after Clear from recreating preferences.
- Reconcile published v1.1.0 artifacts with the remaining acceptance ledger;
  record additional local verification without claiming clean-machine acceptance.

## [1.1.0] — 2026-10-26

### Fixed

- Keep writing and export available when the selected library disappears, with
  an explicit retry that preserves the active article and editing position.
- Recover Review and Outline after analysis errors without exposing stale notes
  or changing writing, and retry analysis on the next edit.
- Report complete, partial and failed Clear outcomes accurately; preserve writing
  after incomplete clearing and prevent pending saves from recreating cleared data.
- Keep confirmed backup imports stable through asynchronous saves, preserve
  originals and report exact imported/skipped counts and preference outcomes.
- Preserve the last valid portable draft through corrupt saves and storage-quota
  failures, and distinguish saved articles from failed preference writes.
- Keep the native window open after a final preferences-save failure until retry
  succeeds or the writer explicitly exits without saving preferences.

### Changed

- Embed the offline WebView2 installer in new Windows packages instead of the
  network bootstrapper. Disconnected Windows installation remains unverified.

### Removed

- Unused renderer filesystem-plugin access. Selected-folder persistence and
  explicit native exports continue through the intended custom commands.

## [1.0.0] — 2026-10-21

- Article-first redesign: one header, stable 42rem prose column, title above
  text, quiet save footer and tools grouped under More.
- Single-note review inspector, active passage highlighting, complete incremental
  findings list and individual dismissal recovery. Remove bulk replacements.
- Independent navigation preferences, reading anchors, wrapped-passage scrolling,
  faithful numbering, omitted-image labels and headline-aware prose exports.

- Desktop article library with independent stable-ID files, legacy migration,
  recovery, search, rename, trash/restore and explicit library backup/restore.
- Quiet drafting, Markdown shortcuts, heading outline and safe reading/print
  preview. Clear/Essay remain writing profiles, separate from reviewers.
- Clarity and Structure reviews with passage actions, paragraph-scoped
  dismissals and immediate invalidation of stale analysis.
- Serialized save snapshots, failed-save switching protection and native
  close/quit-time flushing. Correct desktop bridge configuration and move
  blocking file/folder dialogs off the UI thread. Portable HTML remains a single-draft editor.
- See `docs/article-workspace.md` for validation and remaining acceptance gates.

## [0.1.6] — 2026-10-16

- Configure Tauri ad-hoc code signing for the macOS app bundle and verify the
  signature inside the DMG in CI. The downloaded DMG app passes strict deep
  signature verification. v0.1.5 was withdrawn and its tag remains unchanged.
- Carry forward v0.1.5 profile, writing-mode, and autosave changes. Clean
  machine installs and the 0.1.4 upgrade check remain pending.

## [0.1.5] — withdrawn 2026-10-16

- Add editable Clear and Essay profiles, per-rule strictness, personal voice
  words, and reviewed sample-based suggestions.
- Write mode hides review metrics and the review rail. Autosave stays enabled
  by default; desktop first run selects a persistent local folder and names
  drafts from their first line.
- README leads with a paste-and-flag example. The GitHub release was withdrawn
  after the macOS app failed signature verification and Gatekeeper blocked it
  with a damaged-app alert. Do not install or run v0.1.5. Its tag will not be
  moved or reused. The Mac DMG was unsigned and not notarized; the Windows
  installer was unsigned.

## [0.1.4] — 2026-10-15

- Startup: reproduced the exception against the original app and shell:
  the app registered a `change` handler on `filePick`, but the shell omitted
  that element, throwing before `keydown` and the remaining handlers were
  registered. Add the missing file picker, register shortcuts before control
  wiring, and isolate preference/control initialization. A regression
  reproduces the missing-control exception and confirms F2 remains registered.
- Mobile: the Notes jump leaves room below the sticky header for the Notes
  heading and category chips.
- README and app metadata describe offline writing and include a real
  application screenshot.
- Release docs record generated artifact hashes separately from clean-machine
  install results, which remain for the owner to complete and record.

## [0.1.3] — 2026-10-14

- Highlights by problem type: passive, adverb, wordy, simpler, and repeated
  each get their own underline colour + style, with a matching legend and
  category-coloured note labels.
- Notes: category summary chips above the list (`2 passive, 3 wordy…`),
  tap to filter (highlights + list); clicking a highlight jumps to its note.
- Grade: explicit early estimate from ~30 prose words with the grade-8
  target marked on a meter (steady estimate still 100+ words / 5+ sentences).
- Layout: slim sticky top bar, primary Copy button, merged Download menu
  (.md / .txt), mobile `Notes` chip jumping to the list.
- Fixes: one-click remove for adverbs/intensifiers (space-aware), keep-first
  fix for repeated words, plus `Apply all safe fixes` (wordiness, simpler,
  repeated — bulk rechecks each, undo stepwise).
- Rail: quick per-rule toggles (Passive/Adverb/Wordy/Simpler/Repeated) kept
  in sync with Preferences; `F2` / `Shift+F2` steps notes; editor defaults
  to serif.
- Release state: Mac/Windows builds stay unsigned — signing needs a paid
  membership the project will not take (see `docs/mac-release.md`).

## [0.1.2] — 2026-10-05

- Fix rule overrides: `applyOverrides` now correctly handles flat rule overrides
  from Preferences UI toggles (such as passive voice, adverbs, simpler words).
- Fix preset customization detection: non-preset preferences (e.g. `readingWpm`,
  `excludeQuotes`) no longer mistakenly trigger "preset customized" state.
- Accessibility / Color contrast: increased muted text contrast (`--muted: #6b655b`)
  in light theme to achieve 5.49:1 (exceeding WCAG AA 4.5:1 requirement).
- Regression tests: added automated tests for flat and nested rule overrides.

## [0.1.1] — 2026-10-01

- Single clarity preset: Essay/Social/Message/Email/Research modes removed
  (config v2). Legacy mode ids map to `clear`; old drafts migrate without
  rewrites. Email greeting/sign-off/subject notes, Social character budget,
  and Message paragraph-count notes removed with their modes.
- Windows x64 support: NSIS per-user installer (`embedBootstrapper`
  WebView2, +~1.8 MB), `win-build.yml` CI, zipped setup installer `.zip` alongside
  `-setup.exe`, `docs/win-release.md`. Unsigned forever (free).
- Windows correctness: CRLF normalized on open, reserved filenames
  (`CON`/`PRN`/`AUX`/…) sanitized on save, release size profile
  (`lto`, `opt-level="s"`, `strip`) in `src-tauri`.
- No-sync affirmed: manual export is the sync story; docs updated.
- Data safety: 3-slot backup rotation (web + desktop shells) that actually
  restores — unreadable saves fall back to the newest working backup with a
  visible "Recovered from backup" notice. Fixed desktop shells never
  restoring drafts (async IPC load mishandled as sync). Stored prefs are
  now allow-list sanitized on load/import.
- Export: optional title/date front-matter on `.md` download (off by
  default), Download `.txt`, Print via a print-only sheet (textareas print
  empty), settings export/import (`blunted-settings.json`) as the manual
  carry-your-settings path. Fixed NSIS `installMode` value (`currentUser`).
- Find in document: in-page search bar (Cmd/Ctrl+F, Enter/Shift+Enter,
  counts, prev/next), wired to the desktop Find menu. Shortcuts: Cmd/Ctrl+S
  downloads `.md` (browser; the shell menu owns it there).
- Comfort: editor font (system/serif/mono) + line spacing
  (compact/comfortable/roomy), sentence count in the status line,
  undo-preserving one-click fixes and paste (`setRangeText` before the
  value-splice last resort).
- Layout: status line + highlight legend moved above the editor (glanceable
  while writing) instead of below it.
- Build/CI: `npm ci` in all workflows, explicit test-file list (Node 22
  rejects a bare directory arg), LF checkouts enforced (`.gitattributes`)
  plus a deterministic-rebuild check — the portable HTML is byte-identical
  across macOS local + CI builds.

## [0.1.0] — 2026-09-30 (planned)

- Initial development preview: pure-JS analysis engine (ARI primary,
  Flesch-Kincaid + Coleman-Liau details, Research-only SMOG), five presets,
  offline single-file `dist/index.html` (textarea + backdrop, issue list,
  Copy/Download only), unsigned Tauri v2 Apple-Silicon shell scaffold.
- Known gaps: no Mac screenshot yet; Mac bundle not built/tested on a clean
  machine; Find menu focuses the editor (no in-page find UI); no worker
  fallback test in a real browser yet.
