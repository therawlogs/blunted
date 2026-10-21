# Accessibility

- A native textarea owns typing, selection, undo and composition. Analysis
  runs after a pause and does not rewrite the input.
- Text-labelled mode controls, visible focus and 44px control targets accompany
  the quiet article surface. Interface typography is separate from prose fonts.
- Native modal dialogs contain Articles, preferences and transition decisions.
  Closing restores focus to the opener. More closes with Escape.
- Review highlights only the active passage in an aria-hidden backdrop. The
  inspector exposes category, passage, explanation and individual action buttons.
  Previous/Next and F2/Shift+F2 navigate; All notes incrementally exposes all
  findings. Dismissed notes are individually restorable.
- Find supports Enter/Shift+Enter and Escape in editing and reading views.
  Save status is announced; save failures remain visible. Forced colors have
  explicit focus and passage outlines.
- Browser geometry checks covered 390, 768, 1180 and 1440px widths in all three
  modes and a long wrapped passage above the bottom inspector. Automated
  fixtures cover Unicode offsets, focus controls and workspace restoration.
- Manual VoiceOver, NVDA/JAWS, IME and 200% zoom acceptance remains required.
  Automated and visual checks do not establish screen-reader acceptance.
