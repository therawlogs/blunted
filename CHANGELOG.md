# Changelog

All notable changes to blunted will be documented here. Format follows
(loosely) Keep a Changelog; versions are `0.x` development previews.

## [0.1.4] — 2026-10-15

- Startup: reproduced the exception against the original app and shell:
  the app registered a `change` handler on `filePick`, but the shell omitted
  that element, throwing before `keydown` and the remaining handlers were
  registered. Add the missing file picker, register shortcuts before control
  wiring, and isolate preference/control initialization. A regression
  reproduces the missing-control exception and confirms F2 remains registered.
- Mobile: the Notes jump leaves room below the sticky header for the Notes
  heading and category chips.
- README and app metadata now describe the single Clear preset and include
  a real application screenshot. Named profiles remain future work.
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
  WebView2, +~1.8 MB), `win-build.yml` CI, portable `.zip` alongside
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
