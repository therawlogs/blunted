// Syllables: deterministic exception table + vowel-group heuristic.
// Lowercase for counting; strip possessives; silent-e and -ed/-es handling.
// All syllable-based metrics are approximate — documented in docs/formulas.md.
// Do NOT strip accents from source text or move offsets.

const EXCEPTIONS = new Map(Object.entries({
  // common irregular / silent patterns (small curated table, unit-tested)
  "the": 1, "a": 1, "i": 1,
  "people": 2, "every": 2, "everywhere": 3, "business": 2, "different": 3,
  "beautiful": 3, "family": 3, "friendly": 2, "lovely": 2, "lonely": 2,
  "lively": 2, "likely": 2, "only": 2, "early": 2, "poetry": 3, "science": 2,
  "quiet": 2, "orange": 2, "chocolate": 3, "vegetable": 4, "interesting": 4,
  "interested": 4, "tired": 1, "bored": 1, "married": 2, "surprising": 3,
  "measured": 2, "collected": 3, "written": 2, "sent": 1, "being": 2,
  "because": 2, "about": 2, "above": 2, "again": 2, "really": 3, "very": 2,
  "idea": 3, "real": 2, "hour": 1, "our": 1, "their": 1, "there": 1,
  "queue": 1, "one": 1, "two": 1, "three": 1, "seven": 2, "eleven": 3,
  "suggests": 2, "approximately": 5, "estimate": 3, "means": 1,
}));

const SILENT_ED_EXCEPTIONS = new Set([
  // -ed pronounced as extra syllable
  "wicked", "naked", "learned", "beloved", "blessed", "crooked", "ragged",
  "wretched", "sacred", "rugged", "jagged", "dogged",
]);

export function listExceptions() {
  return [...EXCEPTIONS.keys()].sort();
}

export function countSyllables(rawToken) {
  if (!rawToken) return 0;
  let w = String(rawToken).toLowerCase();
  // strip leading/trailing non-letters (keep internal apostrophes/hyphens for split)
  w = w.replace(/^[^a-zà-ÿā-ž]+|[^a-zà-ÿā-ž]+$/gi, "");
  if (!w) return 0;
  // standalone numbers / initialisms: uncertain → treat conservatively
  if (/^[0-9]+$/.test(w)) return 1;
  if (/^([a-z]\.){2,}$/.test(w)) return (w.match(/[a-z]/gi) || []).length;
  // possessive
  w = w.replace(/['’]s$/, "").replace(/['’]$/, "");
  // hyphenated: sum parts
  if (w.includes("-")) {
    return Math.max(1, w.split("-").map((p) => countSimple(p)).reduce((a, b) => a + b, 0));
  }
  return countSimple(w);
}

function countSimple(w) {
  if (!w) return 0;
  if (EXCEPTIONS.has(w)) return EXCEPTIONS.get(w);
  if (w.length <= 2) return 1;
  // vowel groups
  const groups = (w.match(/[aeiouy]+/g) || []).length;
  let n = groups;
  // silent final e (but not -le after consonant, e.g. "apple" keeps 2)
  if (/e$/.test(w) && n > 1) {
    if (!/[^aeiou]le$/.test(w)) n -= 1;
  }
  // -ed endings: usually silent unless exception or preceded by t/d
  if (/ed$/.test(w) && n > 1) {
    const stem = w.slice(0, -2);
    if (!SILENT_ED_EXCEPTIONS.has(w) && !/[td]ed$/.test(w) && !/ted$/.test(w) && !/ded$/.test(w)) {
      // if stem already ends with e, -ed adds nothing; else vowel-group count over-counted?
      // vowel groups already counted "ed" as one group only if 'e' adjacent to nothing else.
      // Remove it when the 'e' in -ed formed its own group.
      if (/[^aeiouy]ed$/.test(w)) n -= 1;
      void stem;
    }
  }
  // -es endings: usually silent (likes, makes) unless sibilant (watches, boxes)
  if (/es$/.test(w) && n > 1 && /[^aeiouy]es$/.test(w)) {
    if (!/(s|sh|ch|x|z|o)es$/.test(w)) n -= 1;
  }
  return Math.max(1, n);
}

export function isPolysyllable3plus(token) {
  return countSyllables(token) >= 3;
}
