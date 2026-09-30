# Presets

Proposed v1 product defaults — editable starting points, not scientific
boundaries or recovered Hemingway cutoffs. One versioned config object;
mode changes never rewrite the draft.

| Mode | Target | Yellow words/grade | Red words/grade | Paragraph note | Extra |
|---|---|---|---|---|---|
| Essays | 8 | 25 / 12 | 40 / 16 | >150 words | Normal adverb/wordiness notes |
| Social | 6 | 18 / 10 | 30 / 14 | >80 words | 280-grapheme budget (neutral, adjustable) |
| Message | 5 | 15 / 9 | 25 / 13 | >60 words or >2 paras | Tone checklist optional, off by default |
| Email | 8 | 25 / 12 | 40 / 16 | >120 words | Subject field; reply mode |
| Research | 12 | 35 / 16 | 55 / 20 | >200 words | Hedges preserved; quotes excluded; SMOG detail |

Algorithm: red if `words ≥ redWords` OR (`words ≥ minGradeWords` AND
`rawARI ≥ redGrade`); else yellow by the same shape. minGradeWords = 14
(Essays/Email/Research), 10 (Social/Message). Red wins; one background per
sentence. Below the grade gate only word counts trigger. No warning merely
for exceeding the document target.

Social counting uses grapheme clusters (`Intl.Segmenter` + fallback), never
`string.length`. The X-exact counter is deliberately omitted from v1: X uses
weighted URL/Unicode rules (twitter-text, Apache-2.0) that a grapheme count
must not claim to match.

Overrides are validated (`red ≥ yellow`, finite values, wpm 100–400),
resettable per mode, and surfaced (“preset customized”). Disabling a rule
stops its issues; hiding marks is a separate view concern.
