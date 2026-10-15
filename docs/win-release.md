# Windows release (unsigned dev preview)

Status: **unsigned development preview, forever free.** No code-signing
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
Get-FileHash .\src-tauri\target\x86_64-pc-windows-msvc\release\bundle\nsis\*-setup.exe -Algorithm SHA256
Get-FileHash .\src-tauri\target\x86_64-pc-windows-msvc\release\bundle\nsis\*.zip -Algorithm SHA256
Get-FileHash .\dist\index.html -Algorithm SHA256
```

Compare the full SHA-256 value with the release listing before opening the
artifact. Hash generation confirms which bytes were built; it does not
confirm installation or launch on a clean PC.

WebView2: `webviewInstallMode` is `embedBootstrapper` (+~1.8 MB). On
Windows 10 (April 2018+) and Windows 11 the WebView2 runtime ships with
the OS, so most users install nothing extra. If the runtime is missing or
too old, the installer fetches it (network needed for that step only).
The app itself never makes network requests.

Installer mode: per-user (no admin prompt), installs under `%LOCALAPPDATA%`.

## Verify on a clean Windows PC (no dev tools)

1. Confirm the SmartScreen warning appears (unrecognized app) and stop
   there for non-technical users — or use More info → Run anyway only if
   you accept the risk and verified the SHA-256 hash.
   Alternative: download the `.zip`, right-click → Properties → Unblock
   before extracting; extracted files then carry no Mark-of-Web.
2. Offline startup: writing, analysis, Open, Copy, Download, settings work
   with networking disabled; no app-initiated remote requests.
3. CRLF round-trip: open a `\r\n` file, edit, Download — newlines and
   UTF-8/Markdown preserved. Reserved names (`CON`, `PRN`, `AUX`, `NUL`,
   `COM1…`, trailing dots/spaces) are sanitized on save.
4. Display scaling 100%/125%/150%: backdrop highlights align with text;
   no console window on launch (release builds set `windows_subsystem`).
5. Record installer `.exe` size, installed size, cold startup — never quote
   another app's figures as ours.

## Publish

Tag releases (`v0.1.4`), attach the `-setup.exe` + portable `.zip` +
SHA-256 checksums, and state the unsigned status prominently. Release the
portable `dist/index.html` first if the bundle is not ready — but do not
present the HTML as the Windows install experience.

## Measured — v0.1.3 dev preview (14 Oct 2026, CI only, never local)

Built on GitHub-hosted `windows-latest` (x64, stable Rust, Node 22 — see
the v0.1.3 `win-build` run for the exact toolchain), `--bundles nsis`.

| Artifact | Size | SHA-256 |
|---|---|---|
| `blunted_0.1.3_x64-setup.exe` | 3.5M | `ec78d620f52d6cedf55b74eb94ea7224c3b47ea6a3e6e38b756511239f3160ea` |
| `blunted-win-x64-portable.zip` (setup exe, zipped) | 3.5M | `0dc9fc3958b597a0b52cf30b337a9a2a4971e9de9b50a24b8f701eb5be719803` |
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
| NSIS installer SHA-256 | Not built on this macOS host; generate on `windows-latest` |
| Portable ZIP SHA-256 | Not built on this macOS host; generate on `windows-latest` |
| Clean-Windows install and launch | Not yet verified — owner to record |
| Tester / machine / Windows version / date | Owner to record |

The Windows installers are built by the `win-build` workflow on
`windows-latest` when the `v0.1.4` tag is pushed. Record those artifact hashes
here; they do not confirm clean-machine installation or launch.

## Measured — v0.1.2 dev preview (05 Oct 2026, CI only, never local)

Built on GitHub-hosted `windows-latest` (x64, stable Rust, Node 22 — see
the v0.1.2 `win-build` run for the exact toolchain), `--bundles nsis`.

| Artifact | Size | SHA-256 |
|---|---|---|
| `blunted_0.1.2_x64-setup.exe` | 3.6M | `ab544ef25b5f4997776b2bb647d5b66b3f8c72633ede4df67056d21c2fa4dab9` |
| `blunted-win-x64-portable.zip` (setup exe, zipped) | 3.6M | `8b488e539c87b023da4b165bd8b8a6fe369c4b527f51d8ef6e6d36f10ff6c581` |
| `dist/index.html` | 164175 bytes | `8f57999ced5d2d1eabc2003c27e983ca0d438158b53ec0a125c908c0a1abc899` |

- Signature: none. SmartScreen warning on download is expected and unverified.
- Engine tests pass on the Windows runner before bundling.
- Not done: clean-PC install, 100%/125%/150% scaling check, IME/TSF,
  NVDA/JAWS pass, cold startup, CRLF round-trip on a real machine.
