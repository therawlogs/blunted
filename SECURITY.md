# Security policy

blunted is an offline, local-only app. There are no accounts, servers, or
update channels to attack — that is the point.

## What is in scope

- The engine or UI executing pasted/dropped text (must remain inert text;
  never `innerHTML`, never evaluated).
- Storage handling: corrupt JSON, full/disabled storage, schema migration must
  never destroy the last-good draft silently.
- The Tauri shell: capabilities must stay least-privilege. No shell execution,
  no remote IPC, no network permissions, no updater.

## What is not promised

- Storage is **unencrypted local data**. Anyone with device access may read it.
- The unsigned dev preview shows a Gatekeeper warning on Mac and a
  SmartScreen warning on Windows. Do not disable either system-wide or run
  blanket quarantine-removal commands.

## Reporting

Open a private issue with the repository owner including: app version
(engine version from the About panel), artifact (portable HTML hash,
`.dmg` / `-setup.exe` name), OS + version, and reproduction text that
contains no personal data.
