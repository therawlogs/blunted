// Tokenizer: Unicode letter tokens with internal apostrophes; hyphenated
// compounds count as ONE for counts (documented convention).
// Numbers count in visible totals but standalone numerics are excluded from
// English syllable metrics. Emoji are not prose words.
// Offsets are UTF-16 half-open [from,to) into the original string.

const WORD_RE = /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*(?:-[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*)*/gu;
const NUMERIC_RE = /^[0-9]+(?:[.,][0-9]+)*$/;
const EMOJI_RE = /^[\p{Extended_Pictographic}\p{Emoji_Component}]+$/u;

export function tokenize(text, excludedRanges = []) {
  const tokens = [];
  WORD_RE.lastIndex = 0;
  let m;
  while ((m = WORD_RE.exec(text)) !== null) {
    const from = m.index;
    const to = from + m[0].length;
    const raw = m[0];
    const excluded = overlaps(excludedRanges, from, to);
    const isNumeric = NUMERIC_RE.test(raw.replace(/,/g, ""));
    const isEmoji = EMOJI_RE.test(raw);
    const hasLetter = /[\p{L}]/u.test(raw);
    tokens.push({
      text: raw,
      from,
      to,
      excluded,
      isNumeric,
      isEmoji,
      // eligible prose word: has a letter, not emoji, not excluded
      eligible: hasLetter && !isEmoji && !excluded,
    });
  }
  return tokens;
}

function overlaps(ranges, from, to) {
  for (const r of ranges) if (from < r.to && to > r.from) return true;
  return false;
}

// Character counts for readability: letters/digits inside word tokens.
export function countLettersDigits(tokenText) {
  const m = tokenText.match(/[\p{L}\p{N}]/gu);
  return m ? m.length : 0;
}
