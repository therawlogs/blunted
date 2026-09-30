# blunted — private writing clarity

A local writing-clarity app: one English analysis engine, five writing
presets, a dependency-free downloadable HTML app, and a Tauri v2 Mac wrapper
(Apple Silicon). No accounts, no network, no telemetry. Copy and Download
`.md` are the only outward actions.

> Screenshot: pending — the UI is built but no screenshot has been captured
> yet. The README will carry a real screenshot of the built app before any
> public release. Do not ship with a placeholder image.

## Five modes

Essays · Social Media · Message · Email · Research. Each has its own grade
target, sentence thresholds, paragraph advice, and rule set
(see `docs/presets.md`). A highlight means **review**, not wrong.

## Download & run (unsigned dev preview)

The Mac build is **unsigned**: Gatekeeper will warn about an unidentified
developer. That is expected for this preview — do not disable Gatekeeper
system-wide. The safest path is the portable file:

1. Download `index.html` from the release.
2. Turn networking off if you like — double-click it. Everything works.
3. Write. Copy or Download `.md` when done. Nothing leaves the device.

## Offline / privacy (with limits)

Analysis runs on-device; there is nothing to phone home to. Draft recovery
(localStorage on web, app-data file on Mac) is convenience storage, **not**
encrypted sync — anyone with device access may read it. Details:
`docs/privacy.md`.

## Build from source

```sh
node --version   # >= 20
npm test         # engine fixtures (19 tests)
npm run build    # -> dist/index.html (~150 KB, deterministic)
```

Mac shell (Apple Silicon; needs Xcode + Rust):

```sh
npm run bundle:tauri
npx tauri build --target aarch64-apple-darwin
```

## Scores and detectors — read this

- Grades are **estimates from surface counts** (ARI primary; Flesch-Kincaid
  and Coleman-Liau as details). They don’t know your reader, argument, or
  whether a term is necessary. Below 100 words / 5 sentences the grade is
  suppressed.
- **English-first.** Other scripts stay editable and export intact, but
  English scores/rules are suppressed for clearly non-English input.
- Detectors are heuristics with documented false positives (`docs/rules.md`).
  No grammar checking, no semantic rewrites, no tone judgment, no citation
  checking. No X-exact counter in v1 (grapheme budget only).
- blunted itself makes no AI requests. Where your macOS offers system Writing
  Tools (right-click in the editor), they remain available — they run under
  Apple's policy, not blunted's, and blunted sends nothing itself.

## Non-goals

AI, translation, spelling/grammar checks, factual checking, plagiarism,
collaboration, rich text, accounts, sync, publishing, analytics,
subscriptions, update checks, browser extensions, Windows/Linux binaries.

## License

MIT — see `LICENSE`. Notices: `THIRD_PARTY_NOTICES.md`. Contributing:
`CONTRIBUTING.md`. Security: `SECURITY.md`.
