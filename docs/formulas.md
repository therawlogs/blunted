# Formulas

W = eligible prose words · S = prose sentences · C = letters/digits in word
tokens · L = letters per 100 words · T = sentences per 100 words ·
Y = estimated syllables · P = words with ≥3 estimated syllables.

| Formula | Definition | Role | Limit |
|---|---|---|---|
| ARI | 4.71·C/W + 0.5·W/S − 21.43 | Primary | Long technical names inflate it; counting conventions matter |
| Flesch-Kincaid | 0.39·W/S + 11.8·Y/W − 15.59 | Optional detail | Syllable errors affect results |
| Coleman-Liau | 0.0588·L − 0.296·T − 15.8 | Optional detail | Length ≠ familiarity |
| SMOG | 1.0430·√(P·30/S) + 3.1291 | Research detail, ≥30 sentences | Developed for longer samples |

Display: `Estimated reading grade: 8` (U.S. school-grade scale), raw value to
one decimal in details only. Primary ARI is rounded **up**, floored at 1,
`College+` above 12; the raw result is preserved for debugging.

Reliability policy (product choice, not science): below 100 eligible words OR
5 sentences, the main grade is suppressed (`Too little text…`); provisional
values stay visible in details with a warning. Any zero denominator → `null`,
never NaN/Infinity/grade 0. No sentence-level FK or SMOG.

SMOG counts words with **three or more** syllables. Short-text SMOG is
suppressed as a conservative product choice, not because it is uncomputable.
Gunning Fog is omitted from v1: a faithful Fog needs proper-name/compound/
suffix rules a naive 3-syllable count cannot claim.

## Syllables (approximate — always)

Lowercase token for counting; strip possessives; count vowel groups; silent
final -e (except consonant+-le); -ed/-es endings usually silent except
sibilant -es and -ted/-ded; minimum 1. Small exception table in
`src/engine/syllables.js` (`listExceptions()`); unit-tested. Source text is
never modified and offsets never move for counting. Numbers, initialisms, and
unknown technical words are treated as uncertain.
