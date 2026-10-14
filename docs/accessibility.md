# Accessibility

- Native `textarea` owns the text: typing, selection, undo, IME, dictation,
  and VoiceOver behavior stay platform-standard. Analysis never touches the
  input value and pauses during composition.
- Highlights live in an `aria-hidden` backdrop; every issue is a real button
  in a list that selects its source range and focuses the editor on request.
  Highlights-off (Write mode / fallback) loses no information.
- Severity is never color-only: each issue carries a text category + severity
  label and a distinct border; forced-colors mode uses outlines.
  Problem-type underlines also vary by style (passive solid, adverb dashed,
  wordy wavy, simpler dotted, repeated double) plus a text legend and
  category chips — never color alone.
- Notes navigation: Prev/Next buttons plus `F2` / `Shift+F2` (next/previous
  note) from anywhere; clicking a highlight in the editor marks its note
  without moving the caret. On narrow screens a `Notes` chip jumps to the list.
- Brief `aria-live` status after a pause (grade + issue count), never per
  keystroke. Visible focus, 44px targets, logical tab order, in-page find
  (Enter/Shift+Enter, live match count, Escape closes), usable at 320px
  and 200% zoom, WCAG AA contrast targets (light theme `--muted: #6b655b` at 5.49:1;
  dark theme at 5.75:1).
- Tested: keyboard-only flows, VoiceOver on Mac (manual — see release
  checklist), Hindi/Japanese IME composition, emoji/combining-mark offsets.
  NVDA/JAWS on Windows not yet tested.
