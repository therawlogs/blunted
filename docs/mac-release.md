# Mac release (unsigned dev preview)

Status: **unsigned development preview.** No Developer ID signing, no
notarization, no stapling — those need a paid Apple Developer Program
membership the owner has not authorized. Gatekeeper will warn on first open;
that is expected. Never advise disabling Gatekeeper system-wide or running
blanket quarantine-removal commands.

## Build

Requirements: macOS with CommandLineTools (full Xcode only needed for
Developer ID signing/notarization), Rust stable, Node 20+.

```sh
npm test
npm run build            # dist/index.html
npm run bundle:tauri     # src-tauri/frontend/ (+ shell-only adapter)
npx tauri build --target aarch64-apple-darwin   # Apple Silicon only
```

Minimum system version: macOS 13.0 (pinned in `tauri.conf.json` from the
Tauri v2 webview baseline; re-verify when upgrading Tauri).

## Verify on a clean Mac (no dev credentials)

1. Confirm the Gatekeeper warning appears (unidentified developer) and stop
   there for non-technical users — or open via Finder context menu only if
   you accept the risk.
2. Offline startup: writing, analysis, Open, Copy, Download, settings work
   with networking disabled; no app-initiated remote requests.
3. Menu shortcuts: Cmd+N/O/S/C/Z/Shift+Z; Write/Review; font size;
   appearance. Note: Find focuses the editor (no in-page find UI in v1).
4. Export round-trip preserves UTF-8/Markdown/newlines.
5. Record `.app` size, compressed `.dmg` size, cold startup, and idle memory —
   never quote another app’s figures as ours.

## Publish

Tag releases (`v0.1.0`), attach the `.dmg` + checksums, and state the
unsigned status prominently. Release the portable `dist/index.html` first if
the bundle is not ready — but do not present the HTML as the Mac install
experience.

## Measured — v0.1.0 dev preview (30 Sep 2026, build machine only)

Built with Tauri CLI 2.12.0 (`@tauri-apps/cli`, devDependency, exact version
in `package-lock.json`), Rust 1.98.0, Node 26.8.1, CommandLineTools SDK
(no full Xcode). Target `aarch64-apple-darwin` only.

| Artifact | Size | SHA-256 |
|---|---|---|
| `dist/index.html` | 152K | `4f69ebed…4c872155c5` (see release notes for full hash) |
| `blunted.app` (in DMG) | 12M | — |
| `blunted` Mach-O binary (arm64, thin) | 12M | — |
| `blunted_0.1.0_aarch64.dmg` (compressed) | 3.4M | `c2dd6b4e…17519517a85` (see release notes for full hash) |

- Signature: ad-hoc only (`flags=0x20002 adhoc,linker-signed`), no Developer
  ID. Gatekeeper warning on other machines is expected and unverified.
- Smoke test (build machine): launched from mounted DMG, process stayed
  alive, quit cleanly via AppleScript. UI rendering, offline behavior, and
  menus not yet exercised.
- Not done: clean-Mac install, cold-startup timing, idle memory, screenshot.
  Rebuild reproduces `dist/index.html` byte-identically (verified same-sha
  rebuilds); the Rust bundle is not expected to be bit-reproducible.
