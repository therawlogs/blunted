# v1.1 acceptance and local follow-up

Follow-up, 31 October 2026: [local release-mode Mac observations, findings and environment requirements](mac-acceptance-2026-10-31.md). This dated ledger remains historical; the follow-up distinguishes passed functional probes from local accessibility findings and untested platforms.

Update, 28 October 2026: the correction/settings work described below now ships in v1.2.0. See [the release and installed-upgrade evidence](v1.2-release.md). Historical v1.1 findings remain scoped to their original date; the open environment-dependent acceptance items remain open.

Date: 27 October 2026. The published v1.1.0 source is
`548301e6fc46282b483a680311be72e75ccc5f5d`; merged main is
`b839c9541380c66aebb93f81b6f99b66d2af2774`. Subsequent offline-correction and
settings changes are working-tree changes, not the published binary.

## Completed release checks

- v1.1.0 was published stable/latest at `2026-10-27T04:58:21Z`, with five asset
  sizes/digests checked. [Publication receipt](evidence/acceptance-2026-10-27/published-v1.1.0.json),
  [asset receipt](evidence/acceptance-2026-10-27/published-v1.1.0-assets.json).
- The Windows x64 offline-runtime NSIS installer was built in CI. Its SHA-256 is
  `0dfdf9bb4e36fff07b3fd7a572b2bf9c81c1203ab3a929da32ab411aa7340c4d`;
  a fresh local hash of the retained published artifact matched. A successful
  build does not prove offline installation with WebView2 absent or present.
- The development Mac's installed v1.1.0 launch/About and four unchanged article
  hashes were recorded previously in [the release manifest](evidence/v1.1.0/local-release-manifest.json).
  User writing contents are not included in evidence.
- `cargo test --locked --offline` passed all 12 Rust tests on this Mac again.

## Preview/settings implementation snapshot

This snapshot precedes the subsequent bundled spelling/grammar implementation.
See [offline proofreading](offline-proofreading.md) for the newer build, tests,
runtime checks and artifact hash. Published v1.1.0 remains unchanged.

The unreleased working tree adds shared original/proposed previews and guarded
Apply for Clarity replacements/removals and Structure heading gaps, grouped
Appearance/Review/Library settings, and explicit Clear confirmation. Paragraph
and opening feedback remain guidance. The confirmation defaults to Cancel and
suspends Settings so two modal dialogs do not coexist. Closing immediately after
successful Clear does not recreate preferences.

- `npm test`: **117/117 passed**, including stale edits, Markdown/CRLF preservation,
  unsupported undoable-edit failure, IME composition guard, post-Apply analysis
  failure, settings persistence/failure, explicit Clear cancellation and
  Clear-followed-by-close regressions. The composition guard test is automated
  logic evidence, not real IME acceptance.
- Portable and native frontend bundles built successfully. Two independent builds
  were byte-identical. Final portable HTML SHA-256:
  `778a5ef15d4b79b2c9a98e00eae506d9b3bb781dac9eb6e5a1dc8e17a108370b`.
- `git diff --check` passed. These changes have not been published or installed
  over `/Applications/blunted.app`; the published v1.1.0 receipts above remain
  specific to the original release.

## Typing measurement

[Reproducible harness](../scripts/measure-typing.mjs) and
[raw browser report](evidence/acceptance-2026-10-27/typing-browser.json) record
synthetic 1,000/5,000/20,000-word articles, 40 Chromium keyboard input events per
article, an isolated temporary profile, active analysis/autosave, and input-event
to next animation-frame timing. The report includes machine/browser versions,
sample values and source provenance. There is no invented numerical acceptance bar.

Apple M2, 16 GiB RAM, macOS 27.2, Chromium 151, 1360×900 viewport:

| Initial article words | Median input → next frame | 95th percentile | Maximum |
|---|---:|---:|---:|
| 1,000 | 1.5 ms | 4.2 ms | 8.4 ms |
| 5,000 | 2.8 ms | 8.7 ms | 15.0 ms |
| 20,000 | 10.9 ms | 14.5 ms | 14.9 ms |

This is **single development Mac, headless Chromium evidence**. It is not physical
key-to-photon timing, installed native WebKit performance, Windows performance,
IME acceptance, or representative-hardware acceptance.

## Current working-tree UI observations

- Real Chromium editing applied Clarity `utilize` → `use`, removed the adverb
  `quickly` including its adjacent space, and corrected Structure `#### Example`
  → `# Example` for an article without a separate title. Each edit was restored
  by one browser Undo command. Preview screenshots are in
  `evidence/acceptance-2026-10-27/review-*.png`.
- All three grouped settings sections fit a real 375px CSS viewport: page width
  375px, dialog client/scroll width 349px, panel client/scroll width 317px.
  The first check found a 2px range-input margin overflow; zeroing that margin
  fixed the repeated check. Native browser Tab advanced through the navigation;
  a changed theme reported Settings saved and survived reload. Visible Library
  buttons and associated checkbox labels measured at least 44px tall.
  [UI metrics and outcomes](evidence/acceptance-2026-10-27/browser-ui.json),
  [dark narrow Appearance](evidence/acceptance-2026-10-27/settings-appearance-dark-375.png),
  [narrow Library](evidence/acceptance-2026-10-27/settings-library-375.png).
  These bounded measurements do not cover every app target or assistive technology.
- **Actual 200% browser zoom passed** for Appearance, Review and Library using
  Chrome for Testing's `chrome.tabs.setZoom(tabId, 2)` in a disposable profile on
  localhost. The result was `innerWidth=680`, `outerWidth=1360`,
  `devicePixelRatio=2`, `visualViewport.scale=1`; CSS zoom and pinch emulation
  were not used. All three dialogs had client/scroll width 654px; the page fit
  its 680px viewport. [Metrics](evidence/acceptance-2026-10-27/browser-zoom.json),
  [Appearance at 200%](evidence/acceptance-2026-10-27/settings-appearance-browser-zoom-200.png).
  Native-app 200% zoom remains a separate unrun requirement.
- See [native Mac observations](native-acceptance-2026-10-27.md) for real
  WKWebView Apply/Undo, cross-view Undo, folder disappearance and real permission
  failure/retry/export. The initial Clear confirmation failure was repaired:
  native Cancel/Escape/default focus/pending-close/explicit-confirm checks passed,
  and actual quit after Clear left no article, history, preferences or config
  files recreated. This is an isolated packaged debug app, not the untouched
  installed release or a clean Mac. CUA's native AX snapshot still did not expose
  confirmation controls; VoiceOver acceptance remains unverified. The disposable
  QA app was closed, its bundle removed and its registration absent on cleanup.
- [Theme token contrast](evidence/acceptance-2026-10-27/theme-token-contrast.json)
  records relative-luminance ratios for text/accent/focus colors against each
  solid light/dark background. This bounded token calculation does not close
  rendered-component or full-platform contrast acceptance.

## Acceptance still requiring evidence

| Requirement | Status and exact remaining boundary |
|---|---|
| Windows offline install/launch/upgrade | **Pending environment.** Run disconnected with WebView2 absent and present; record OS/architecture/runtime state, installer SHA-256 and preserved library. |
| Clean-Mac offline install/launch/upgrade | **Pending clean environment.** Local development-Mac installation cannot substitute. |
| Installed Windows/clean-Mac storage, IPC and Clear | **Pending platform acceptance.** Exercise permissions/disappearance, plugin denial/intended IPC, recovery/export and destructive Clear confirmation/focus/storage with disposable data. Earlier Rust/browser/disposable-runtime evidence remains narrower. |
| Installed native Undo | **Partial.** Isolated development-Mac WKWebView Undo and Chromium Undo passed; untouched installed-release/clean-Mac and Windows workflows remain unrun. |
| Accessibility and composition | **Partial.** Genuine Chromium 200% browser zoom passed for all settings groups. Native zoom, VoiceOver, Windows screen reader, IME and complete targets/contrast/focus checks remain open. CSS zoom and forced-colors smoke checks remain bounded. |
| Representative typing responsiveness | **Partial.** One-machine/browser measurement is available; representative hardware and installed platform/document conditions remain to be recorded. |
| Five independent writer workflows | **Pending participants.** Observe complete start/import/headings/both reviews/export/close-reopen/backup restore into a separate test library. No recruitment messages were sent. |

No failed or unrun platform requirement is marked passed by publication, compilation,
unit tests or browser simulation. Subsequent local verification should append exact
observations and retain each untested platform boundary.
