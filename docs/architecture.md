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

Storage: web adapter uses localStorage (main doc + prefs + 3-slot rotating
backup) with honest status; unreadable saves restore from the newest
working backup with a visible notice. Tauri adapter overrides via
`window.__BLUNTED_TAURI__` backed by atomic writes to the selected local
folder and the same 3-slot rotation. Existing app-data drafts remain available
and are copied into the selected folder on first save. Folder choice lives in
app config across updates.
The portable HTML edition continues using browser localStorage. Stored prefs,
profile thresholds/rules, and voice words are allow-list sanitized on
load/import.
