# blunted — private writing clarity

A local writing-clarity app: one English analysis engine, one clarity
preset, a dependency-free downloadable HTML app, and Tauri v2 desktop
shells (Mac Apple Silicon + Windows x64). No accounts, no network, no
telemetry, no sync — forever free. Copy, Download (`.md` / `.txt`), Print,
and a settings file are the only outward actions. Find (Cmd/Ctrl+F) and
Download (Cmd/Ctrl+S) work from the keyboard.

> Screenshot: still pending — v0.1.1 shipped without one. The README will
> use a real screenshot of the built app, never a placeholder image.

## One focus

Single clarity preset (target grade 8; see `docs/clarity.md`). A highlight
means **review**, not wrong.

## Download & run (unsigned dev preview)

Both desktop builds are **unsigned** (no paid certificates, no Store —
this project stays free). Your OS will warn on first run; that is
expected. Do not disable Gatekeeper/SmartScreen system-wide. The safest
path is the portable file:

1. Download the portable HTML file from the release (e.g. `blunted-0.1.1.html`).
2. Turn networking off if you like — double-click it. Everything works.
3. Write. Copy or Download (`.md` / `.txt`) when done. Nothing leaves the device.

Mac: Gatekeeper warns about an unidentified developer (details:
`docs/mac-release.md`). Windows: SmartScreen warns about an unrecognized
app; verify the SHA-256 hash first (details: `docs/win-release.md`).

## Offline / privacy (with limits)

Analysis runs on-device; there is nothing to phone home to. Draft recovery
(localStorage on web, app-data file on desktop) is convenience storage —
a 3-slot rotating backup restores automatically with a visible notice —
**not** encrypted sync. Anyone with device access may read it. There is
no sync and there will never be one: your backup is your sync — copy the
exported `.md` where you like. Details: `docs/privacy.md`.

## Build from source

```sh
node --version   # >= 20
npm test         # engine fixtures (20 tests)
npm run build    # -> dist/index.html (~163 KB, deterministic)
```

Mac shell (Apple Silicon; needs Xcode Command Line Tools + Rust):

```sh
npm run build:tauri:mac
```

Windows shell (x64; needs MSVC + Rust — or use CI):

```sh
npm run build:tauri:win
```

## Scores and detectors — read this

- Grades are **estimates from surface counts** (ARI primary; Flesch-Kincaid
  and Coleman-Liau as details). They don’t know your reader, argument, or
  whether a term is necessary. Below 100 words / 5 sentences the grade is
  suppressed.
- **English-first.** Other scripts stay editable and export intact, but
  English scores/rules are suppressed for clearly non-English input. French
  and other languages may come later; the engine stays English-only for now.
- Detectors are heuristics with documented false positives (`docs/rules.md`).
  No grammar checking, no semantic rewrites, no tone judgment, no citation
  checking.
- blunted itself makes no AI requests. Where your OS offers system writing
  tools (right-click in the editor), they remain available — they run under
  your OS vendor's policy, not blunted's, and blunted sends nothing itself.

## Non-goals

AI, translation, spelling/grammar checks, factual checking, plagiarism,
collaboration, multi-document library, rich text, accounts, sync,
publishing, analytics, subscriptions, update checks, browser extensions,
Linux binaries, code signing / Store distribution.

## License

MIT — see `LICENSE`. Notices: `THIRD_PARTY_NOTICES.md`. Contributing:
`CONTRIBUTING.md`. Security: `SECURITY.md`.
