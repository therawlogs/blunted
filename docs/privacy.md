# Privacy

- **Local only.** Analysis runs on your device (Web Worker or main thread).
  Copy/Download are the only outward actions. No accounts, tokens, AI
  requests, telemetry, update checks, or network calls. Verify: disable
  networking, double-click `dist/index.html` — everything works.
- **Draft recovery is local convenience, not sync.** Autosave is on by
  default. Web: main save plus a
  3-slot rotating backup; on an unreadable save the newest working backup
  restores automatically with a visible "Recovered from backup" notice.
  Honest status throughout (`Saved` / `Recovered from backup` /
  `Saving failed`); private-session toggle writes nothing. Desktop shells ask
  once for a local folder and write first-line-named drafts there with the same
  3-slot backup rotation. Existing app-data drafts remain recoverable and are
  copied into the selected folder on first save. The folder choice persists
  across app updates. Portable HTML continues using browser localStorage.
  No sync and never will be — carry `.md` + `blunted-settings.json` yourself.
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
