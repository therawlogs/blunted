# Third-party notices

`dist/index.html` (the portable app) contains original blunted code and the
bundled Harper spelling/grammar engine and dictionary. It has no external fonts
or runtime downloads.

## Bundled in the portable and desktop app

- **Harper / `harper.js` 3.0.0** — Apache License 2.0. Source:
  <https://github.com/Automattic/harper>, package `harper.js` 3.0.0.
  Its WebAssembly binary, dictionary and JavaScript wrapper are bundled from the
  pinned npm package with esbuild for browsers. The full license is in
  [licenses/Harper-APACHE-2.0.txt](licenses/Harper-APACHE-2.0.txt) and embedded in
  Settings → Library → About blunted → Third-party notices. These components run
  locally; no checking service or account is used.

## Design references

The following projects informed the design as documented ideas and test cases.
No code or word lists were copied from them:

- btford/write-good (MIT) — switchable suggestion rules with offsets.
- btford/passive-voice (MIT) — be/get auxiliary + participle detection shape.
- amperser/proselint (BSD-3-Clause) — rule families with explanations.
- Vale (MIT) — named rules, levels, scope awareness.
- simonw/tools `writing-style.html` (Apache-2.0 repo) — single-file UI workflow reference.
- Helge Sverre, “textarea overlay” article (2026) — backdrop alignment technique.
- twitter-text (Apache-2.0) — why an X-exact counter was deliberately omitted from v1.

## Desktop shell and build tooling

The native desktop shell is shipped in desktop installers, but not inside
portable `dist/index.html`. It depends on pinned crates and tooling:

- Tauri v2 + tauri-build (MIT / Apache-2.0 dual) and the direct plugins
  tauri-plugin-dialog and tauri-plugin-clipboard-manager. The unused renderer
  filesystem plugin was removed in v1.1.0.
- Rust standard library and serde/serde_json (MIT / Apache-2.0).
- Esbuild 0.25.12 (MIT) is development/build tooling used to produce the bundled
  proofreading worker. End users do not install or run esbuild.

Verify each pinned version’s license file before release; repository-level
licenses do not clear every asset. Names and trademark rights are separate
from copyright licenses.
