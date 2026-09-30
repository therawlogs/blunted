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
  config.js        5 presets, validation, sentence-mark algorithm
  rules/           helpers, passive, adverbs, wordlists
  analyze.js       pipeline → {metrics, sentences, issues, …}
  index.js         public re-exports (source use only)

src/ui/            browser UI, dependency-free
  shell.html       HTML skeleton with build placeholders
  styles.css       system fonts, light/dark/system, forced-colors
  app.js           state, backdrop renderer, issue list, storage adapter

scripts/build.mjs  deterministic concat → dist/index.html (no timestamps)
dist/index.html    released portable artifact (generated, not edited)

src-tauri/         Mac shell (Apple Silicon): main.rs commands + menus,
                   capabilities/main.json (least privilege), adapter.js
                   (shell-only bridge, injected by bundle-tauri.mjs)
tests/             node:test fixtures (engine + modes)
docs/              formulas, rules, presets, privacy, a11y, mac-release
```

Data flow: `textarea → debounce 150ms → (Blob Worker | main-thread fallback)
→ analyze({text, mode, overrides…}) → render backdrop + score + issue list`.
Revision counters discard stale results. The engine never touches the DOM;
the UI never implements analysis.

Storage: web adapter uses localStorage (`blunted.doc.v1`, prefs, last-good
backup) with honest status; Tauri adapter overrides via
`window.__BLUNTED_TAURI__` backed by atomic app-data writes + backup.
