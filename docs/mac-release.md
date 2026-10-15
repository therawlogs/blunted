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
npm run build:tauri:mac  # Apple Silicon .dmg (bundles dmg only)
```

After building, print the artifact hashes with:

```sh
shasum -a 256 dist/index.html src-tauri/target/aarch64-apple-darwin/release/bundle/dmg/*.dmg
```

Compare the full SHA-256 value with the release listing before opening the
artifact. Hash generation confirms which bytes were built; it does not
confirm installation or launch on a clean Mac.

Minimum system version: macOS 13.0 (pinned in `tauri.conf.json` from the
Tauri v2 webview baseline; re-verify when upgrading Tauri).

## Verify on a clean Mac (no dev credentials)

1. Confirm the Gatekeeper warning appears (unidentified developer) and stop
   there for non-technical users — or open via Finder context menu only if
   you accept the risk.
2. Offline startup: writing, analysis, Open, Copy, Download, settings work
   with networking disabled; no app-initiated remote requests.
3. Menu shortcuts: Cmd+N/O/S/C/Z/Shift+Z; Write/Review; font size;
   appearance. Find opens the in-page search (same as Cmd+F in the browser build).
4. Export round-trip preserves UTF-8/Markdown/newlines.
5. Record `.app` size, compressed `.dmg` size, cold startup, and idle memory —
   never quote another app’s figures as ours.

## Publish

Tag releases (`v0.1.4`), attach the `.dmg` + checksums, and state the
unsigned status prominently. Release the portable `dist/index.html` first if
the bundle is not ready — but do not present the HTML as the Mac install
experience.

## Measured — v0.1.3 dev preview (14 Oct 2026, build machine only)

Built with Tauri CLI 2.12.0 (pinned devDependency), Rust 1.98.0, Node
v26.8.1, CommandLineTools SDK (no full Xcode). Target
`aarch64-apple-darwin`, `--bundles dmg`. Release size profile active
(`lto`, `opt-level="s"`, `strip`).

| Artifact | Size | SHA-256 |
|---|---|---|
| `dist/index.html` | 184368 bytes | `af80fd6747631c9529f3ef3f855367641a28c933b7c39e346b6549c425c7e0a7` |
| `blunted` Mach-O binary (arm64, thin) | 5.1M | — |
| `blunted_0.1.3_aarch64.dmg` (compressed) | 2.2M | `bf3a6cd0d1f10f3b7972fb3ee855872a9dfb30ebf9b282a1588b5487fc20dd2e` |

- Signature: ad-hoc only (`flags=0x20002 adhoc,linker-signed`), no Developer
  ID. Gatekeeper warning on other machines is expected and unverified.
- `dist/index.html` rebuilt byte-identically twice during this release
  (same SHA); deterministic build holds.
- Smoke test (build machine): DMG mounted, `blunted.app` present, app
  launched, process stayed alive, quit cleanly via AppleScript, volume
  ejected. Note: the first `tauri build` attempt failed transiently at
  `bundle_dmg.sh`; an immediate retry succeeded with no changes.
- Not done: clean-Mac install, cold-startup timing, idle memory,
  screenshot. The Rust bundle is not expected to be bit-reproducible.

## v0.1.4 build — clean-machine verification pending

Build-machine artifact hashes are recorded below. The published DMG is the
Mac CI artifact; it has a different digest from the local build because the
Rust bundle is not expected to be bit-reproducible.
Clean-Mac installation and launch are not verified by the coding agent;
the owner should complete this record after testing a clean machine.

| Item | Result |
|---|---|
| `dist/index.html` (185892 bytes) SHA-256 | `da1c260bdcf254ae73bba00220ca7f28fbf21282d328ddf8a1554d55ef24e41a` |
| Published `blunted_0.1.4_aarch64.dmg` (2289935 bytes, Mac CI) SHA-256 | `9d4835a5e3b7d49bb8635ab965aa458fdba0150ffe1ab135eb9416e4d6408258` |
| Local `blunted_0.1.4_aarch64.dmg` (2302038 bytes) SHA-256 | `41d4b883f89065fbf73eabeb78b85730f915b25b3dfe73bd913d214c5b3c2d86` |
| Clean-Mac install and launch | Not yet verified — owner to record |
| Tester / machine / macOS version / date | Owner to record |

## Measured — v0.1.2 dev preview (05 Oct 2026, build machine only)

Built with Tauri CLI 2.12.0 (pinned devDependency), Rust 1.98.0, Node
26.8.1, CommandLineTools SDK (no full Xcode). Target
`aarch64-apple-darwin`, `--bundles dmg`. Release size profile active
(`lto`, `opt-level="s"`, `strip`).

| Artifact | Size | SHA-256 |
|---|---|---|
| `dist/index.html` | 164175 bytes | `8f57999ced5d2d1eabc2003c27e983ca0d438158b53ec0a125c908c0a1abc899` |
| `blunted` Mach-O binary (arm64, thin) | 5.1M | — |
| `blunted_0.1.2_aarch64.dmg` (compressed) | 2.2M | `be162b1165ff8955301886a6cfc81399c20c1c125d422a566232d01f2f7c0a61` |

- Signature: ad-hoc only, no Developer ID. Gatekeeper warning on other
  machines is expected and unverified.
- `dist/index.html` is byte-identical to the macOS CI build (LF checkouts
  enforced repo-wide; the Windows CI copy differs only in line endings).
- Smoke test (build machine): DMG mounted, app launched, process stayed
  alive, quit cleanly. Note: with an older copy installed in
  `/Applications` (same bundle id), opening the DMG copy may activate the
  installed one instead — quit the old copy first when smoke-testing.
- Not done: clean-Mac install, cold-startup timing, idle memory,
  screenshot. The Rust bundle is not expected to be bit-reproducible.

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
