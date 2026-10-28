# Offline spelling and grammar

Status: **v1.2.0**, released 28 October 2026. The implementation and
pre-release checks below are complete. Publication and the Applications upgrade
are separate steps recorded in [the v1.2.0 release status](v1.2-release.md).

## Use

Open **Review → Clarity**. Spelling and grammar notes appear alongside editorial
notes; **Options → Category** can show only Spelling or Grammar. Read the
explanation and **Original / Proposed** preview. Where alternatives exist, choose
one in **Suggestion**, then **Apply change**. Each applied correction is a native
undoable edit; Cmd/Ctrl+Z restores it. Nothing changes automatically while typing.

**Keep this word** adds an intentional spelling to the current article's voice
words without changing the writing. These words save/back up with the article;
they are not silently added to other articles. Manage them in **Settings → Review**.
The same section has independent spelling and grammar switches and American
(default), British, Australian, Canadian and Indian English choices. These global
preferences participate in existing settings export/import and private sessions.

This is English rule/dictionary-based checking, not Grammarly's proprietary
engine, generative rewriting or a guarantee of detecting every mistake. Long
paragraph and opening feedback remain guidance. Markdown code, metadata, URLs
and link destinations are protected; quoted text is opt-in through the existing
quote setting. Harper's Markdown parser determines eligibility within headings.

## Offline implementation

- **Pinned engine:** npm `harper.js` **3.0.0**, Apache-2.0. Upstream source and
  package provenance: [Harper](https://github.com/Automattic/harper),
  [official JavaScript documentation](https://writewithharper.com/docs/harperjs/linting).
- `binaryInlined` embeds the entire WebAssembly engine and dictionary in the
  generated HTML. Esbuild bundles the browser worker during development/build;
  users do not install Node, Java, a model, or dictionary packages.
- A dedicated Blob worker checks text off the typing thread. It allows only the
  embedded WASM data-URL fetch; external fetches fail closed. No service, account,
  update request or runtime download is used. The portable file is about **27.7 MB**.
- Requests are bounded to one active check plus the latest pending revision.
  Stale results/errors cannot revive old Apply actions. Timeout/worker failure
  clears derived review, preserves writing/export/save, and the next edit retries.
- The adapter validates pinned Harper's JavaScript UTF-16 ranges against the exact
  source text, converts insertion suggestions into guarded replacements, and
  preserves Harper's exact deletion range. Markdown is not reserialized.
- The existing preview/Apply path protects source text and revision, supports
  alternatives, and uses the browser/native Undo manager. A failed undoable edit
  leaves the writing untouched. Clearing local data resets the proofreading worker.
- Third-party attribution and the full Apache license are embedded in **Settings
  → Library → About blunted → Third-party notices**, and stored in
  [licenses](../licenses/Harper-APACHE-2.0.txt).

WebAssembly and Web Workers must be supported by the browser/WebView. If checking
cannot run, Review explains how to retry or turn these checks off; writing remains
available. No silent online fallback exists.

## Verification

- **132/132 Node tests passed**, including real bundled-engine spelling,
  agreement/articles/punctuation, alternatives, Unicode/CRLF and Markdown offsets,
  quote exclusion, dialects, per-article words, stale responses, failure/retry,
  settings persistence and queue bounds. Existing persistence/Clear tests remain.
- **12/12 Rust tests passed** again; native persistence code was not changed.
- **Offline browser proof:** a fresh disposable Chromium profile had networking
  disabled and HTTP/HTTPS/WebSocket URLs blocked **before the first load**.
  Spelling, agreement, articles, punctuation and Markdown previews/Apply/one-step
  Undo passed, including an emoji prefix. Alternatives, Keep this word, British
  English persistence across reload, 375px settings layout, injected worker
  failure and recovery also passed.
  [Executable verification](../scripts/verify-proofreading.mjs),
  [browser receipt](evidence/offline-proofreading-2026-10-27/browser-offline.json).
- **Native Mac proof:** an isolated Tauri debug app, with synthetic writing under
  `/tmp/blunted-offline-native-20261027`, ran the bundled checker in WKWebView.
  Spelling, verb agreement, indefinite articles and emoji-prefix Apply each
  restored the exact original with one Cmd+Z. Spelling could be disabled in native
  Settings without changing writing. The app was closed, its exact QA bundle and
  Launch Services registration removed; `/Applications/blunted.app` was untouched
  during that pre-release QA session.
  [Native receipt](evidence/offline-proofreading-2026-10-27/native-mac.json).
- Portable/native frontend bundles build successfully and portable rebuilding
  is byte-identical. The browser receipt identifies the verified HTML SHA-256.
- [Typing measurements](evidence/offline-proofreading-2026-10-27/typing-browser.json)
  record one development Mac, Chromium, synthetic documents and the enabled checker.
  These are input-to-next-frame observations, not native key-to-photon measurements
  or representative-hardware acceptance.

On this Apple M2 / 16 GiB development Mac, the observed input-to-next-frame p95
was **4.7 ms / 9.2 ms / 14.3 ms** for synthetic **1k / 5k / 20k**-word documents.
Forty input events per size were sent in bursts, with analysis enabled between
bursts. The raw report records every sample and methodology; no pass/fail latency
threshold or cross-platform guarantee is inferred.

[Build/dependency receipt](evidence/offline-proofreading-2026-10-27/build.json),
[Node log](evidence/offline-proofreading-2026-10-27/node-tests.txt),
[Rust log](evidence/offline-proofreading-2026-10-27/rust-tests.txt).

Windows runtime, clean-machine installation/upgrade, VoiceOver/Windows screen
reader, real IME and representative-hardware acceptance remain separate pending
requirements in [the acceptance ledger](acceptance-2026-10-27.md). The linked
pre-release receipts do not establish publication or installation; see the
[release status](v1.2-release.md) for those outcomes. No clean-machine or
cross-platform success is inferred from these local checks.
