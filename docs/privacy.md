# Privacy

- **Local only.** Analysis runs on your device (Web Worker or main thread).
  Copy/Download are the only outward actions. No accounts, tokens, AI
  requests, telemetry, update checks, or network calls. Verify: disable
  networking, double-click `dist/index.html` — everything works.
- **Draft recovery is opt-in convenience, not sync.** Web: bounded
  localStorage snapshots with honest status (`Saved` /
  `Recovery unavailable` / `Saving failed`); private-session toggle writes
  nothing. Mac: atomic app-data writes with last-good backup.
- **Unencrypted.** Anyone with device access may read stored drafts. No
  vault, no account linking, no secure-storage claims.
- **No leak surfaces.** Pasted HTML is accepted as plain text; prose is never
  rendered via `innerHTML`, logged to console, or placed in URLs. External
  links (none bundled) would open only in the system browser on deliberate
  click.
- **No CSP theater.** The portable file ships without remote resources, eval,
  or fetches; a Blob worker is used only for analysis. The threat model and
  its limits are stated here instead of implied by headers.
