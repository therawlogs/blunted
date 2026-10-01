# Changelog

All notable changes to blunted will be documented here. Format follows
(loosely) Keep a Changelog; versions are `0.x` development previews.

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
