# Windows release (unsigned)

Status: **unsigned.** No code-signing
certificate, no Microsoft Store listing — those cost money the project
will not spend. SmartScreen will warn on first run ("Windows protected
your PC" / "unrecognized app"); that is expected. Never advise disabling
SmartScreen system-wide.

## Build

Requirements: Windows 10/11 with MSVC build tools, Rust stable, Node 20+.
CI builds on `windows-latest` (x64).

```sh
npm test
npm run build            # dist/index.html
npm run bundle:tauri     # src-tauri/frontend/ (+ shell-only adapter)
npx tauri build --bundles nsis   # x64 NSIS installer
```

On Windows, print hashes before install with PowerShell:

```powershell
Get-FileHash .\Downloads\blunted_*_x64-setup.exe -Algorithm SHA256
Get-FileHash .\Downloads\blunted-win-x64-setup.zip -Algorithm SHA256
```

Compare the full SHA-256 value with the release listing before opening the
artifact. For local builds, pass the generated artifact path instead. Hash generation confirms which bytes were built; it does not
confirm installation or launch on a clean PC.

WebView2: `webviewInstallMode` is `offlineInstaller`. New installers embed
the offline WebView2 runtime installer so a missing runtime can be installed
without downloading it on the end-user machine. Building the installer can
require downloading the runtime build input. This configuration has not yet
been accepted on disconnected Windows machines with runtime absent and present;
no new Windows installer has been built in this Mac-only implementation run.
The app's writing and review workflow remains offline.

Installer mode: per-user (no admin prompt), installs under `%LOCALAPPDATA%`.

## Verify on a clean Windows PC (no dev tools)

1. Confirm the SmartScreen warning appears (unrecognized app) and stop
   there for non-technical users — or use More info → Run anyway only if
   you accept the risk and verified the SHA-256 hash.
   Alternative: download the `.zip`, right-click → Properties → Unblock
   before extracting; extracted files then carry no Mark-of-Web.
2. Disable networking before installation. Run separate runtime-absent and
   runtime-present cases; record Windows version, architecture, runtime state,
   installer filename and SHA-256, install/upgrade outcome and preserved library.
   Offline startup: writing, analysis, Open, Copy, Download, settings work
   with networking disabled; no app-initiated remote requests.
3. CRLF round-trip: open a `\r\n` file, edit, Download — newlines and
   UTF-8/Markdown preserved. Reserved names (`CON`, `PRN`, `AUX`, `NUL`,
   `COM1…`, trailing dots/spaces) are sanitized on save.
4. Display scaling 100%/125%/150%: backdrop highlights align with text;
   no console window on launch (release builds set `windows_subsystem`).
5. Record installer `.exe` size, installed size, cold startup — never quote
   another app's figures as ours.

Before opening the installer, run `Get-FileHash -Algorithm SHA256` on the
downloaded `.exe` and `.zip`, comparing each complete digest with
`SHA256SUMS.txt` and the release listing. Record the exact artifact name and
digest; a CI digest alone does not certify the downloaded file or its
installation.

## v0.1.5 withdrawn; v0.1.6 released

The `v0.1.5` release was withdrawn after its Mac app failed signature
validation and Gatekeeper blocked it. Its tag remains permanently attached to
commit `f9832e8` and will not be moved or reused. The corrected release is
`v0.1.6`; its Windows package is identified as a zipped setup installer, not
a portable app. The Windows artifacts from v0.1.5 were withdrawn with that
release and should not be used. The v0.1.6 installer and ZIP hashes match the
Windows CI manifest.

Before installation, run `Get-FileHash -Algorithm SHA256` on the downloaded
installer and compare the full digest with `SHA256SUMS.txt` and the release
listing. Test on a clean PC and complete the 0.1.4 upgrade scenario below.
Record results only after each check; keep unavailable checks explicitly
pending. The installer is unsigned and SmartScreen may warn.

If a bad final release is discovered, unpublish it, mark it withdrawn with the
reason, and never move or reuse its tag. Ship a fix under the next version.

## Measured — v0.1.3 dev preview (14 Oct 2026, CI only, never local)

Built on GitHub-hosted `windows-latest` (x64, stable Rust, Node 22 — see
the v0.1.3 `win-build` run for the exact toolchain), `--bundles nsis`.

| Artifact | Size | SHA-256 |
|---|---|---|
| `blunted_0.1.3_x64-setup.exe` | 3.5M | `ec78d620f52d6cedf55b74eb94ea7224c3b47ea6a3e6e38b756511239f3160ea` |
| `blunted-win-x64-portable.zip` (historical zipped setup installer; not a portable app) | 3.5M | `0dc9fc3958b597a0b52cf30b337a9a2a4971e9de9b50a24b8f701eb5be719803` |
| `dist/index.html` | 184368 bytes | `af80fd6747631c9529f3ef3f855367641a28c933b7c39e346b6549c425c7e0a7` |

- Signature: none. SmartScreen warning on download is expected and unverified.
- Engine tests pass on the Windows runner before bundling.
- `dist/index.html` is byte-identical to the macOS local build (same SHA).
- Not done: clean-PC install, 100%/125%/150% scaling check, IME/TSF,
  NVDA/JAWS pass, cold startup, CRLF round-trip on a real machine.

## v0.1.4 build — clean-machine verification pending

Build-machine artifact hashes are recorded below after the current build.
Clean-Windows installation and launch are not verified by the coding agent;
the owner should complete this record after testing a clean machine.

| Item | Result |
|---|---|
| `dist/index.html` (185892 bytes) SHA-256 | `da1c260bdcf254ae73bba00220ca7f28fbf21282d328ddf8a1554d55ef24e41a` |
| `blunted_0.1.4_x64-setup.exe` (3657110 bytes) SHA-256 | `ed99bcf4d497815169b7bfe5aca0d823dda677b2906022b271ac037d20ab0b31` |
| `blunted-win-x64-portable.zip` (historical zipped setup installer; not a portable app; 3639079 bytes) SHA-256 | `446954f80ce481462ceb33bd468876beb74455267f4415fde1ea1230341e4ae8` |
| Clean-Windows install and launch | Not yet verified — owner to record |
| Tester / machine / Windows version / date | Owner to record |

## v0.1.5 — withdrawn; Mac signature verification failed

RC1 CI passed for commit `5cd173a`; [RC2 Windows CI passed](https://github.com/therawlogs/blunted/actions/runs/38909642848)
for commit `f9832e8`, which remains the withdrawn `v0.1.5` tag target. The
Windows RC2 build passed, but do not use the withdrawn release files.

| Release artifact | SHA-256 |
|---|---|
| `blunted_0.1.5_x64-setup.exe` | `e9a27678fc59189fe1ae97e602b0dc1593f0bc069eda6ff9332adef6c2146711` |
| `blunted-win-x64-setup.zip` | `5c13c6f81bcecce6ac51fea98d5411de85313b73e8776100d3a080a6f4e1aa5d` |
| `blunted-0.1.5.html` | `d27c382c9a523618692086dbb25af1db547d408ad9df22f88bf39e990be4615c` |
| Release `SHA256SUMS.txt` | Attached to withdrawn release |

| Field | Result |
|---|---|
| Clean PC model / Windows version / date / tester | Pending owner-run test |
| Release tag / commit / downloaded installer filename | `v0.1.5` / `f9832e8`; downloaded filename and hash check pending |
| Downloaded setup `.exe` SHA-256 / manifest and listing match | Pending owner-run download check |
| Downloaded setup `.zip` SHA-256 / manifest and listing match | Pending owner-run download check |
| Signature status | Unsigned |
| Install / first launch / offline writing / autosave / recovery | Pending |
| 0.1.4 upgrade: profile settings and existing draft preserved | Pending |
| Upgrade autosave to chosen folder / restart and recovery | Pending |
| Result / issue reference / tester | Pending |

## v0.1.6 — release verification status

[Windows CI build and tests](https://github.com/therawlogs/blunted/actions/runs/38916568681)
passed for the same commit as the Mac build.

| Release artifact | SHA-256 |
|---|---|
| `blunted_0.1.6_x64-setup.exe` | `cd6f13bc3457a0780f78f0f1c82f2fa06cbf38c26ced6bb42c625f1f7a6b6225` |
| `blunted-win-x64-setup.zip` | `b487da3ee3a6cfe8f051e8e23a4ec61e372d7240b481dba73ed948a8534c614a` |
| `blunted-0.1.6.html` | `d27c382c9a523618692086dbb25af1db547d408ad9df22f88bf39e990be4615c` |
| Clean Windows install / launch / offline / autosave / recovery | Pending owner-run test |
| 0.1.4 upgrade and draft/profile preservation | Pending owner-run test |

The Windows installers were built by the successful `win-build` workflow on
`windows-latest` for tag `v0.1.4`. These build hashes do not confirm
clean-machine installation or launch.

## Measured — v0.1.2 dev preview (05 Oct 2026, CI only, never local)

Built on GitHub-hosted `windows-latest` (x64, stable Rust, Node 22 — see
the v0.1.2 `win-build` run for the exact toolchain), `--bundles nsis`.

| Artifact | Size | SHA-256 |
|---|---|---|
| `blunted_0.1.2_x64-setup.exe` | 3.6M | `ab544ef25b5f4997776b2bb647d5b66b3f8c72633ede4df67056d21c2fa4dab9` |
| `blunted-win-x64-portable.zip` (historical zipped setup installer; not a portable app) | 3.6M | `8b488e539c87b023da4b165bd8b8a6fe369c4b527f51d8ef6e6d36f10ff6c581` |
| `dist/index.html` | 164175 bytes | `8f57999ced5d2d1eabc2003c27e983ca0d438158b53ec0a125c908c0a1abc899` |

- Signature: none. SmartScreen warning on download is expected and unverified.
- Engine tests pass on the Windows runner before bundling.
- Not done: clean-PC install, 100%/125%/150% scaling check, IME/TSF,
  NVDA/JAWS pass, cold startup, CRLF round-trip on a real machine.

## v1.0.0

The minimal article workspace is released as v1.0.0. See
[release artifacts and verification evidence](v1.0-release.md) for source ref,
build runs, SHA-256 values and remaining installation acceptance checks.
