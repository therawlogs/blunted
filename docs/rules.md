# Rules and false-positive policy

Every issue: `ruleId, category, severity (info/review/limit), confidence
(heuristic/deterministic), from/to (UTF-16, half-open), exactText,
explanation, alternatives, optional fix`. Stable keys use rule + text +
occurrence, never a raw offset across edits. One-click fixes recheck
`exactText` + revision and are single undoable edits; no bulk fixing.

## Passive voice (`passive`, heuristic, review)

Be/get auxiliary chain + optional `not`/adverbs (≤2) + irregular participle
(curated list) or regular `-ed` candidate; stops at punctuation. Positives:
`was written`, `has been sent`, `is being reviewed`, `got delayed`.
Negatives: `has written` (active perfect), `is tired/married/bored/
interested`, `are surprising`, `is running`. Labelled **Possible** passive
voice; no auto-rewrite (the actor is unknown). Methods sections may rightly
keep it.

## Adverbs / intensifiers (`adverb`, `intensifier`, heuristic, review)

`-ly` candidates minus exceptions (family, friendly, lovely, lonely, lively,
likely, only, early, ugly, holy, silly, apply, supply, reply, July, Italy…).
Full intensifier list flagged (`very`, `really`, `extremely`, `quite`,
`highly`, …). `just/well/fast/hard` are never
blanket-flagged. "Possible adverb — check whether it adds useful detail."

## Wordiness / hedges / filler (`wordiness`, `hedge`, `filler`)

Original curated lists (`src/engine/rules/wordlists.js`): `in order to→to`,
`due to the fact that→because`, `at this point in time→now`, … Hedges
(`may`, `appears to`, `suggests`, …) are context notes — deleting them can
fabricate certainty, so they are never auto-removed. `just` has no
blanket rule. Quotes are never rewritten.

## Simpler words (`simpler`, heuristic, review + explicit fix)

Short original dictionary: utilize→use, prior to→before, commence→start,
subsequent to→after… Alternatives may change meaning; case is preserved;
statistical `significant`, technical terms, names, and quotes are out of
scope (quotes excluded by the scanner).

## Repeated words (`repeated`, deterministic, review)

Adjacent duplicate lexical words across whitespace only — not punctuation,
code, or paragraph breaks. `had had` / `that that` are flagged as review
(they can be intentional), never auto-fixed.

## Placeholders (`todo`, deterministic)

TODO / FIXME / PLACEHOLDER / XXX / TBD scan, labelled as such. No
citation/coverage detection is claimed — a citation-shaped string
proves nothing.
