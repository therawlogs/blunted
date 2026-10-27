# Native repair evidence, 26 October 2026

Baseline: `7c547a625561a3717953c626bdee862bd39aeaa4`; repaired state is the uncommitted diff in `src-tauri/`. Environment: macOS on Apple Silicon, Rust 1.98.0, Tauri 2.12.0. This record does not establish Windows, clean-machine or user acceptance. All deletion and fault fixtures used generated synthetic files under the OS temporary directory.

## Reproduction and repair

### R1 configured roots

Before repair, `cargo test --offline --manifest-path src-tauri/Cargo.toml disappeared_root_is_not_recreated -- --nocapture` failed with `load must fail closed`: `library::load` recreated the deleted root through recursive `create_dir_all`. The regression now checks both load and save against the same absent root, asserting the root stays absent.

A separate executable extracted the unchanged baseline `configured_dir` and `blunted_clear` function bodies from `git show HEAD:src-tauri/src/main.rs`. Only AppHandle/path resolution was replaced with a temporary fixture. Rustc then ran the functions against actual disposable files. Observed output:

```text
baseline configured missing root: Ok(None)
baseline clear result: Ready(Ok(()))
prefs still exists after claimed success: true
```

The configured pointer named a missing child; the Clear fixture deliberately made `prefs.json` a directory so file removal failed. The original implementation silently treated the unavailable configured root as absent and ignored the native deletion error. Reproduction source/executable: `/tmp/blunted-native-contract-20261026/baseline.rs` and `baseline` (temporary, not required by future tests).

The repaired native boundary distinguishes absent configuration from unreadable/invalid configuration and unavailable configured roots. Default setup is evaluated only for absent configuration. Selected roots are checked without creating parents. Library operations create only the immediate `articles` child with nonrecursive `create_dir`. The read-only retry command returns existing articles/location/recovery information without startup migration or preference adoption.

The maintained Rust fixtures cover absent/empty/relative/missing configuration, unreadable configuration and selected root with actual Unix permissions, initial library creation/migration, deleted roots, blocked article paths, preserved corrupt originals, backup recovery and read-only retry without directory/marker creation. Permissions tests restore fixture permissions before cleanup.

### R3 native Clear

Clear now returns `{status, removed, failed}`. Complete means every intended removal succeeded or was already absent. Partial and failed results retain the configured pointer for an explicit retry. Recursive deletion errors explicitly allow that some children may already have been removed. All intended file deletion errors propagate into the report. The maintained filesystem fixtures exercise complete/already-absent/partial/failed outcomes and safe title-derived legacy backup deletion, preserving unrelated files.

A real native IPC Clear test then introduced an empty directory at `selected/doc.backup.json` to reject an intended file deletion. Through the disposable native frontend, `blunted_clear` returned `partial`, reporting the successfully removed articles directory/preferences and the rejected backup path. The selected configuration and unrelated `original.txt` remained. After removing that synthetic blocking directory, the explicit second call returned `complete`, with only the configuration in `removed`; the third already-absent call returned `complete` with empty `removed` and `failed`. CUA read each actual native outcome. This tests native deletion reporting rather than the production editor confirmation/focus flow.

### R4 renderer privilege reduction

Removed filesystem-plugin capability grants, native plugin registration and direct Cargo dependency. `cargo test --offline` updated the lockfile normally. The filesystem crate remains a transitive dependency of the dialog plugin; it is not registered as a renderer plugin.

A separate disposable native debug bundle used the production Rust command handlers/capabilities with a temporary renderer fixture and Tauri configuration overrides:

```json
{"identifier":"app.blunted.contract-disposable","app":{"appDirectoriesOverride":"/tmp/blunted-native-contract-20261026/data"}}
```

The temporary configuration pointer selected `/tmp/blunted-native-contract-20261026/selected`. The fixture did not load the production editor or access the user's real library. Built with `npx tauri build --debug --bundles app --config /tmp/blunted-native-contract-20261026/config.json`; the initial non-bundled executable also ran under the same isolated configuration. A sandbox-only GUI launch could not initialize native services; an approved unsandboxed launch succeeded.

Actual webview IPC observations:

| Operation | Observed result |
|---|---|
| `plugin:fs|read_text_file` | Denied: `fs.read_text_file not allowed. Plugin not found` |
| `plugin:fs|write_text_file` | Denied: `fs.write_text_file not allowed. Plugin not found` |
| `blunted_load` | Selected temporary path returned, `needs_folder: false` |
| `blunted_library_save`, twice | Succeeded; article and first backup contain the expected distinct revisions |
| `blunted_library_load` | Returned `Second synthetic revision` |
| Corrupt main, then `blunted_library_load` | Recovered `First synthetic revision`, `recovered: ["contract-fixture"]` |
| `blunted_save_prefs` | Succeeded; resulting temporary preference file inspected |
| `blunted_save_as` | Native Save dialog saved exact `# Synthetic export\n\nNo user writing.` to temporary Markdown; return value `true` |
| `blunted_choose_folder`, Cancel | Native folder chooser returned `null`; selected-path pointer unchanged |

The native Save/folder dialogs were operated through CUA. Evidence inputs are the temporary frontend/config; the normalized IPC report is `/tmp/blunted-native-contract-20261026/ipc-report.json`. Durable snapshots of the fixture HTML/config, normalized IPC report and extracted baseline reproduction are in `src-tauri/tests/fixtures/20261026/`; the `.rs.txt` baseline fixture must be compiled explicitly, never as a repaired-code regression. The saved Markdown is `/tmp/blunted-native-contract-20261026/blunted-disposable-export.md`. These prove selected-root IPC, recovery, export and effective plugin denial on this Mac development environment; they do not prove Windows behavior or installed clean-Mac acceptance.

### R9 offline Windows packaging

`bundle.windows.webviewInstallMode.type` is now `offlineInstaller`. Tauri embeds the offline WebView2 installer rather than the network bootstrapper. Installer production may require fetching build inputs; the disconnected end-user acceptance must still run with runtime absent and runtime present. Windows artifact generation and disconnected Windows installation are **Blocked**: this environment has no Windows machine/VM or Windows MSVC target/toolchain. Do not reuse historical artifact hashes as evidence for changed binaries.

## Local verification and remaining gates

`cargo test --offline --manifest-path src-tauri/Cargo.toml` and `cargo check --offline --manifest-path src-tauri/Cargo.toml` passed after the native changes. A later integrated run supplies the final count after the read-only retry regression was added.

Mac release build/hash/provenance results will be appended below. The package is ad-hoc signed, with no notarization or publication. Remaining external gates include Windows runtime-absent/present disconnected installation and upgrade preservation, installed clean-Mac offline acceptance, platform Undo, screen-reader/IME/performance and independent writer workflows. Root UI bridge integration and full product keyboard/visual checks are recorded in the integrated repair evidence.

## Final native checks and Mac artifact provenance

Final native unit suite: **12 passed, 0 failed** (`cargo test --offline --manifest-path src-tauri/Cargo.toml`). Native check passed (`cargo check --offline --manifest-path src-tauri/Cargo.toml`). Includes the post-preflight root-disappearance recheck, read-only retry and durable-article/preferences-failure tests. `blunted_library_save` now returns a structured camelCase `preferencesSaved`/`preferencesError` outcome after article durability; a later preference failure cannot reject an already durable article. The regression makes `prefs.json` a directory, verifies the article persisted, then removes the blocker and verifies preferences succeed.

`npm run build:tauri:mac` completed using normal checked-in configuration on macOS 27.2 (26B118), arm64, Node v26.8.1, Rust 1.98.0. The sandbox DMG attempt failed at `bundle_dmg.sh`; an approved unsandboxed build succeeded, and a final rebuild included the last native race repair and separate durable-article/preferences acknowledgements. Source is baseline plus the uncommitted implementation diff, not a published release or clean-machine installation. Normal production app directories were not launched.

| Artifact | Bytes | SHA-256 |
|---|---:|---|
| `src-tauri/target/aarch64-apple-darwin/release/bundle/dmg/blunted_1.0.0_aarch64.dmg` | 2164699 | `69a190f4c75d996987ddc68107a06eeb5ded7bb881e5acecfe6591fe4bcbe022` |
| `src-tauri/target/aarch64-apple-darwin/release/blunted` | 5051552 | `ce2e7ef41c7bdd83ce61eaea4509908828569b48ccf473f270d0833309687b1c` |
| DMG-embedded ad-hoc signed `blunted.app/Contents/MacOS/blunted` | 5022304 | `8d485954b727f2af9233822eb76bdc4c7d78cf893416df40edb23e0a1c80d4ea` |
| `dist/index.html` | 247401 | `dd0056a3a6a06c3cc301c364acf1d40e4d3e3c669656d99a8419acd57a00ec92` |
| `src-tauri/frontend/index.html` | 247446 | `4e233166672d55807fdcc11bbe07367a05d599af9f190202d38c3714194502b4` |

The DMG passed `hdiutil verify` (checksum valid). It was mounted read-only under `/tmp/blunted-native-contract-20261026/mounted-final` for `codesign --verify --deep --strict`, then detached. These prove local artifact structure/signature consistency, not notarization, cold installation or Gatekeeper acceptance on another Mac. Windows build/installation rows remain **Blocked** pending a Windows MSVC builder and disconnected machine/VM.

## Native final-exit integration

A second isolated debug bundle used the actual production frontend and `/tmp/blunted-native-contract-20261026/config-full.json`, with distinct identifier `app.blunted.contract-full-disposable`, selected synthetic library `selected-full` and app directories `data-full`. It loaded a clean saved synthetic article. Replacing only that fixture's `prefs.json` with a directory forced real native preference persistence failure. Cmd+W showed **Preferences could not be saved**, with initial focus on **Keep working**. Escape retained the window, preserved writing and restored preview focus. On a second attempt, removing the blocker while the dialog was open then choosing **Retry saving preferences** closed the actual native app. Reopening loaded the unchanged article. Reintroducing the fault and choosing **Exit without saving preferences** also closed the native app; filesystem inspection confirmed article contents unchanged and the failed preferences path remained a directory. CUA reported `App quit` for both successful exits.

This full-product native check ran before the final article-save acknowledgement refinement; its close implementation was unchanged by that refinement. The final Rust/Node regressions and rebuilt artifacts include the refinement. Windows/native late-edit scheduling, screen-reader/IME and installed-machine acceptance remain separate gates. No fixture app remains running. Durable normalized runtime reports are in `docs/evidence/implementation-2026-10-26/native-ipc-report.json` and `native-clear-and-close-report.json`.
