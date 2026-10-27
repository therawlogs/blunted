# Native Mac acceptance observations — 27 October 2026

These observations exercise the current working-tree frontend in a disposable
Tauri debug app bundle on the development Mac. They are **not** clean-Mac,
disconnected-install, untouched published-release, Windows, or screen-reader
acceptance. The installed `/Applications/blunted.app` and its real writing were
not opened or changed by this verification.

## Environment and isolation

- macOS 27.2 (26B118), arm64.
- Base checkout: `b839c9541380c66aebb93f81b6f99b66d2af2774`, with the current
  offline correction/settings working-tree changes.
- Command: `tauri build --debug --bundles app --config
  /tmp/blunted-native-acceptance-20261027/config.json`.
- Bundle: `src-tauri/target/debug/bundle/macos/blunted Acceptance QA.app`, ad-hoc
  signed; not notarized.
- Identifier: `app.blunted.acceptance-20261027`.
- `appDirectoriesOverride`: `/tmp/blunted-native-acceptance-20261027/data`.
- Selected library: `/tmp/blunted-native-acceptance-20261027/library`.
- Window: `blunted disposable acceptance 20261027`, 1180 × 760.
- Embedded frontend SHA-256:
  `b812a5eda00fdd2e6e3265aa7288f7a18d8d639ec288ba1dd9d1db02c460b3fb`.
- Executable SHA-256:
  `08b683dbef1a1ada5e9ccaf1048b1d357d6dae684d16505de35ee09651b453f6`.

All UI input used the native CUA app interface, with fresh accessibility
observations between actions. No JavaScript emulation of editing or Undo was
used. All article content was synthetic.

## Observed results

| Scenario | Result and boundary |
| --- | --- |
| Undo across views | **Passed in native fixture.** Typed a marker, switched Write → Review → Read → Write, focused the same textarea and pressed Cmd+Z. Exact original body returned. |
| Clarity preview, Apply and Undo | **Passed in native fixture.** Original `utilize`, proposed `use`, explicit Apply change updated the article. One Cmd+Z restored `utilize`. |
| Structure preview, Apply and Undo | **Passed in native fixture.** With a separate article title, `### A skipped heading` proposed `## A skipped heading`. Apply changed only that heading. One Cmd+Z restored the complete original heading. |
| Grouped settings | **Passed bounded native smoke.** Appearance, Review and Library groups exposed their intended controls; advanced review settings were collapsed. Library tab followed by Tab reached Autosave. No real preferences were changed. |
| Selected-folder disappearance | **Passed in native fixture.** Renamed only the disposable selected library while the article was open. Editing triggered a visible Library unavailable recovery strip. Writing remained in the textarea; missing root was not recreated. |
| Retry while unavailable | **Passed in native fixture.** Retry reported still unavailable and retained the exact working body. |
| Native recovery export | **Passed in native fixture.** Recovery Export article opened the system Save panel. Saved into the disposable root; exported Markdown exactly matched the synthetic title and working body. |
| Restored-folder retry | **Passed in native fixture.** Restored the original directory, retried, saw Library available and current writing unchanged. A subsequent edit autosaved the exact body to the original selected library. |
| Clear storage and result focus | **Passed bounded native fixture.** Clear removed article/history/preferences/config files. Result said Local data cleared and its stable result container had focus. Tab reached About blunted. Later filesystem inspection found no JSON or config resurrection. |
| Clear confirmation | **Initially failed; functional repair passed.** The initial synchronous `window.confirm` did not surface a confirmation. The final explicit dialog passed Cancel/Escape/default focus/close/confirm checks below. Native assistive-technology acceptance remains open. |
| Genuine native 200% zoom | **Pending.** The View menu exposes font-size changes, which do not establish whole-interface zoom. No native 200% zoom was exercised. |

## Still required

- Complete installed-release and clean-machine checks under their original
  environment requirements. This debug bundle does not replace those checks.
- VoiceOver, IME and full accessibility measurements were not exercised here and
  remain pending. Selected-folder permissions were exercised below.

## Clear confirmation repair retest

The explicit in-app confirmation dialog was rebuilt into the same isolated
native bundle. Frontend SHA-256:
`f8233828a167149211f26b52cdd31692b09e05c978bfe306d77b3f2f644c08f9`;
executable SHA-256:
`70af3a01d6b3082b96d2c557dd62de65aa3ec03a3c0c4a262084de0de6bcdf61`.

- **Passed:** clicking Clear opened a visible confirmation with the Cancel focus
  ring. Files remained intact before confirmation.
- **Passed:** Return activated the default Cancel action; Escape also cancelled.
  Both restored focus to Clear local data and preserved the exact synthetic
  article and folder configuration.
- **Passed:** Cmd+W during pending confirmation cancelled the dialog and retained
  the native window and writing.
- **Passed:** opening again, pressing Tab then Return explicitly confirmed Clear.
  Article/history/config files were removed; the result container had focus.
- **Accessibility defect found:** while Settings and Clear confirmation were
  simultaneously modal, the native accessibility tree exposed neither dialog's
  controls, although the confirmation was visible and keyboard-operable. This
  requires separating the modal lifetimes and another native retest; do not
  count this intermediate build as complete native confirmation accessibility.

## Final native retest and cleanup

The final build suspends Settings before opening confirmation and explicitly
labels confirmation as an `alertdialog`. Its embedded frontend SHA-256 is
`192071634b75077dd1a94093736821095e5a3fb4f59f81f8327f6d19cced2fd4`;
executable SHA-256 is
`4fdf7f5064ad50914fa7be0c46620f445259060e6c0cd8c6334545e3cdaeffd7`.

- **Permission failure passed:** set the disposable `library/articles` directory
  to mode `0500`, first confirmed a host write raised `PermissionError`, then
  typed in the native app. The recovery strip offered Export article and Retry;
  the full working body remained available and the persisted original was
  unchanged. Restored the directory's original mode, retried, typed another
  marker and verified the exact working body persisted in the original library.
- **Final confirmation passed functionally:** the confirmation was visible with
  the initial Cancel focus ring. Return chose Cancel. Escape cancelled. Cmd+W
  cancelled the pending dialog and kept the window open. The exact saved body
  and folder configuration remained intact after all three cases.
- **Explicit Clear and post-quit storage passed:** Tab from Cancel to the
  destructive action, then Return, removed the disposable files. The stable
  result container had focus; Tab reached About blunted. Escaped Settings and
  actually quit the native app. A subsequent filesystem check found both
  `library` and `data` free of files: no article, backup, preferences or folder
  configuration reappeared after quitting.
- **Native AX limitation remains:** even with only one modal and explicit
  alertdialog semantics, CUA's native AX snapshot exposed no confirmation
  controls. The screenshot showed the visible dialog and focus ring, and native
  keyboard input worked. This does not establish VoiceOver behavior; native
  assistive-technology acceptance remains unverified.
- **Cleanup completed:** app inventory reported the QA app no longer running.
  Removed only the exact disposable `blunted Acceptance QA.app` bundle. Launch
  Services inspection found zero matching QA registrations. The installed
  `/Applications/blunted.app` remains present and was not changed. Synthetic
  exports, configuration and verification records remain under the isolated
  `/tmp/blunted-native-acceptance-20261027` artifact directory.
