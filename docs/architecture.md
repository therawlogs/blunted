# Architecture

One engine, two deliverables.

```
src/engine/        pure JS: no DOM, storage, clipboard, FS, or network
  version.js       ENGINE_VERSION, CONFIG_VERSION
  graphemes.js     Intl.Segmenter grapheme counting (+ fallback)
  markdown.js      scope scanner → excludedRanges / headings / quotes
  syllables.js     exception table + vowel-group heuristic (approximate)
  tokenizer.js     Unicode word tokens with UTF-16 offsets
  segmenter.js     Intl.Segmenter + protections, deterministic fallback
  readability.js   ARI / FK / Coleman-Liau / SMOG + display + suppression
  config.js        Clear and Essay profiles, validation, sentence-mark algorithm
  rules/           helpers, passive, adverbs, wordlists
  analyze.js       pipeline → {metrics, sentences, issues, …}
  index.js         public re-exports (source use only)

src/writer/        pure article blocks, structure review, dismissals, backup validation

src/ui/            browser UI, dependency-free
  shell.html       HTML skeleton with build placeholders
  styles.css       system fonts, light/dark/system, forced-colors
  app.js           state, backdrop renderer, issue list, storage adapter

scripts/build.mjs  deterministic concat → dist/index.html (no timestamps)
dist/index.html    released portable artifact (generated, not edited)

src-tauri/         Desktop shell (macOS + Windows): main.rs commands + menus,
                    capabilities/main.json (least privilege), adapter.js
                    (shell-only bridge, injected by bundle-tauri.mjs)
tests/             node:test fixtures (engine + preset)
docs/              formulas, rules, clarity, privacy, a11y, mac/win-release
```

Data flow: `textarea → debounce 150ms → (Blob Worker | main-thread fallback)
→ analyze({text, profile, overrides…}) → render backdrop + score + issue list`.
Revision counters discard stale results. The engine never touches the DOM;
the UI never implements analysis.

Storage: the portable web adapter uses localStorage (one draft, prefs and three
rotating backups). The desktop adapter loads the legacy draft and migrates it
once into `articles/legacy-draft.json`; the original stays untouched. Subsequent
articles use stable random IDs, independent JSON files and three last-good
backups. There is no title-derived path and no central index to lose. Library
loading scans article files and backup-only identities. Unrecoverable articles
block loading and saving rather than disappearing from the library.

`src-tauri/src/library.rs` owns article validation, migration, atomic flushed writes
and recovery. `src-tauri/src/storage.rs` checks configured roots, reports Clear
outcomes and separates article durability from preference-save results.
Native commands serialize filesystem operations with a mutex. UI saves
use immutable snapshots and a promise queue; an old acknowledgement cannot mark
new edits saved. Switching waits for saving and stops on failure. Native window
close requests ask the UI to flush before exiting. Abrupt process termination
can still lose edits made since the last successful autosave.

`src/writer/article.js` supplies pure Markdown block scanning, section counts,
structure notes, paragraph-scoped dismissal keys and backup validation. It is
bundled into both the worker and main engine. The UI invalidates in-flight
analysis as soon as typing changes the text. Write, Review and Read toggle the
same textarea without replacing its contents or native undo history. Reading
preview uses text nodes and a bounded set of local markup, never raw HTML.

The desktop bridge uses `withGlobalTauri` and is injected only into the desktop
frontend. Portable HTML never includes native IPC or the multi-article library.
Backup import validates the entire file before writing, then imports articles
independently. Existing IDs can be skipped or copied, never silently replaced;
partial write failure reports how many articles were imported. Global settings
are optional on restore and pass through the existing allow-list sanitizer.

## Minimal workspace

The header opens tools on demand. Native dialogs host library and preferences;
the responsive inspector renders one active note. All-notes lists load in batches
without truncating the analysis results. Workspace preferences retain article ID,
selection, reading anchor and scroll position independently from article saves.
Passage navigation measures wrapped textarea text with a styled mirror. Reading
uses local DOM nodes and source offsets, never remote image or link requests.
Prose export includes an optional headline and excludes application metadata.
