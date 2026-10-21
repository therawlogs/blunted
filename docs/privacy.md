# Privacy

- **Local only.** Analysis runs on your device (Web Worker or main thread).
  Export, library backup and Print are explicit user actions. No accounts, tokens, AI
  requests, telemetry, update checks, or network calls. Verify: disable
  networking, double-click `dist/index.html` — everything works.
- **Draft recovery is local convenience, not sync.** Autosave is on by
  default. Web: main save plus a
  3-slot rotating backup; on an unreadable save the newest working backup
  restores automatically with a visible "Recovered from backup" notice.
  Honest status throughout (`Saved` / `Recovered from backup` /
  `Saving failed`); private-session toggle writes nothing. Desktop shells ask
  once for a local folder. The desktop library writes independent, stable-ID
  article files under `articles/`, with three backups per article. Titles never
  determine file paths. Existing drafts are copied once into the library without
  removing the original. Trash is a reversible metadata flag, not deletion. The folder choice persists
  across app updates. Portable HTML continues using browser localStorage.
  No sync — carry article exports or a `blunted-library.json` backup yourself.
  Library backups include trash, article-specific review preferences and global
  settings; restore keeps existing articles or imports conflicting IDs as copies.
  Global preferences are restored only when explicitly selected.
- **Unencrypted.** Anyone with device access may read stored drafts. No
  vault, no account linking, no secure-storage claims.
- **Sample learning is local and user-approved.** The helper proposes
  repeated words and sentence-length preferences; it applies nothing until
  the user accepts selected suggestions.
- **No leak surfaces.** Pasted HTML is accepted as plain text; prose is never
  rendered via `innerHTML`, logged to console, or placed in URLs. External
  links (none bundled) would open only in the system browser on deliberate
  click.
- **No CSP theater.** The portable file ships without remote resources, eval,
  or fetches; a Blob worker is used only for analysis. The threat model and
  its limits are stated here instead of implied by headers.

Reading preview uses local text and known markup only. Raw HTML stays literal;
images are not fetched and links are shown as text. No preview network requests.
