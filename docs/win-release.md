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

Tag releases (`v0.1.1`), attach the `-setup.exe` + portable `.zip` +
SHA-256 checksums, and state the unsigned status prominently. Release the
portable `dist/index.html` first if the bundle is not ready — but do not
present the HTML as the Windows install experience.
