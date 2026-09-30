# Third-party notices

`dist/index.html` (the portable app) contains **only original blunted code**
(engine + UI + build script output). No third-party code, fonts, or assets are
bundled in the web artifact.

The following projects informed the design as documented ideas and test cases.
No code or word lists were copied from them:

- btford/write-good (MIT) — switchable suggestion rules with offsets.
- btford/passive-voice (MIT) — be/get auxiliary + participle detection shape.
- amperser/proselint (BSD-3-Clause) — rule families with explanations.
- Vale (MIT) — named rules, levels, scope awareness.
- simonw/tools `writing-style.html` (Apache-2.0 repo) — single-file UI workflow reference.
- Helge Sverre, “textarea overlay” article (2026) — backdrop alignment technique.
- twitter-text (Apache-2.0) — why an X-exact counter was deliberately omitted from v1.

The **Mac shell** (build-time/development only, never shipped inside
`dist/index.html`) depends on pinned crates and tooling. Their licenses apply
to the shell build, not to the web artifact:

- Tauri v2 + tauri-build (MIT / Apache-2.0 dual) and plugins
  tauri-plugin-fs, tauri-plugin-dialog, tauri-plugin-clipboard-manager.
- Rust standard library and serde/serde_json (MIT / Apache-2.0).

Verify each pinned version’s license file before release; repository-level
licenses do not clear every asset. Names and trademark rights are separate
from copyright licenses.
