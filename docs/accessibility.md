# Accessibility

- Native `textarea` owns the text: typing, selection, undo, IME, dictation,
  and VoiceOver behavior stay platform-standard. Analysis never touches the
  input value and pauses during composition.
- Highlights live in an `aria-hidden` backdrop; every issue is a real button
  in a list that selects its source range and focuses the editor on request.
  Highlights-off (Write mode / fallback) loses no information.
- Severity is never color-only: each issue carries a text category + severity
  label and a distinct border; forced-colors mode uses outlines.
- Brief `aria-live` status after a pause (grade + issue count), never per
  keystroke. Visible focus, 44px targets, logical tab order, Escape dismisses
  popovers, usable at 320px and 200% zoom, WCAG AA contrast targets.
- Tested: keyboard-only flows, VoiceOver on Mac (manual — see release
  checklist), Hindi/Japanese IME composition, emoji/combining-mark offsets.
