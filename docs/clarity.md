# Writing profiles

blunted ships two editable English profiles. A highlight means review, not a verdict.

| Profile | Target grade | Yellow words / grade | Red words / grade |
|---|---:|---:|---:|
| Clear | 8 | 25 / 12 | 40 / 16 |
| Essay | 12 | 35 / 14 | 55 / 18 |

Sentence marks use the selected profile’s limits. Red wins; grade thresholds
apply only after the minimum sentence length. Adjust thresholds in Preferences.
Each detector can be Off, Normal, or Strict. Strict checks quoted text too;
Normal follows the profile quote-exclusion setting. Rule settings and thresholds are
saved per profile and travel with exported settings.

The rules cover passive voice, adverbs, intensifiers, wordiness, filler,
hedges, simpler-word suggestions, repeated words, and TODO/FIXME markers.
Quotes are excluded by default. “My voice words” are kept local and suppress
matching word-choice notes. No rule rewrites prose without an explicit action.

## Learn from a sample

Paste a sample you wrote and request suggestions. blunted uses repeated words
and sentence length to propose optional profile changes. Review and accept
each suggestion before it is applied. Samples are analyzed on-device and are
not included in diagnostics or network requests.

## Limits

Grade estimates use surface counts, not meaning or audience. The engine is
English-first; other languages remain editable, but English scores and rules
are suppressed when non-English input is likely. See `formulas.md` and
`rules.md` for methodology and known heuristic limits.

## Editorial reviewers

Profiles and reviewers are separate. Clear and Essay tune checks; Clarity
reviews existing prose patterns, while Structure reports heading hierarchy gaps,
paragraphs over the profile threshold and section word counts. Structure also
provides a labeled opening self-review question. It does not detect missing
arguments, verify facts or judge whether evidence supports a claim.

Each note offers Show passage and Dismiss. Dismissals belong to an article and
survive unrelated edits while their paragraph, trigger and explanation remain
unchanged. Editing that passage makes the note eligible again. Show dismissed
notes resets dismissals. Findings are invalidated immediately on text input;
old worker responses cannot reintroduce stale notes. F2 enters Review and moves
to a note; Shift+F2 moves back.

Review shows one active passage. Previous/Next and All notes keep all findings
reachable without marking every category at once. Self-review prompts and
previously dismissed findings have separate views. Apply is always individual;
there is no bulk replacement. Detailed metrics and rule controls live in Options.
