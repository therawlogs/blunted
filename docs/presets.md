# Clarity preset

Single focus, not five modes. v2 removed the Essay / Social / Message /
Email / Research presets by owner decision: one document, one threshold
set, English-only for now. Legacy stored mode ids (`essays`, `social`,
`message`, `email`, `research`) map to `clear` on load — old drafts keep
working, nothing is rewritten.

| Preset | Target | Yellow words/grade | Red words/grade | Paragraph note |
|---|---|---|---|---|
| Clear | 8 | 25 / 12 | 40 / 16 | >120 words |

Algorithm: red if `words ≥ redWords` OR (`words ≥ minGradeWords` AND
`rawARI ≥ redGrade`); else yellow by the same shape. minGradeWords = 14.
Red wins; one background per sentence. Below the grade gate only word
counts trigger. No warning merely for exceeding the document target.

Rules on: passive, adverbs, intensifiers (full list), wordiness, hedges
(noted, never auto-removed), filler, simpler words, repeated words,
TODO/FIXME/PLACEHOLDER markers. Quotes excluded from style rules by
default (toggleable). No character budget, no paragraph-count limit, no
greeting/sign-off checks — those belonged to the removed Social, Message,
and Email modes.

Overrides are validated (`red ≥ yellow`, finite values, wpm 100–400),
resettable, and surfaced ("Customized"). Disabling a rule stops its
issues; hiding marks is a separate view concern (Write vs Review).
