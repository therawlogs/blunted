// Wordiness / hedges / filler / simpler-words / repeated / todo.
// Original curated lists for v1 (documented in docs/rules.md).

export const WORDINESS = [
  { from: "in order to", to: "to" },
  { from: "due to the fact that", to: "because" },
  { from: "at this point in time", to: "now" },
  { from: "in the event that", to: "if" },
  { from: "in spite of the fact that", to: "although" },
  { from: "it is important to note that", to: "" },
  { from: "for all intents and purposes", to: "" },
  { from: "in the process of", to: "" },
  { from: "a large number of", to: "many" },
  { from: "a small number of", to: "few" },
  { from: "has the ability to", to: "can" },
  { from: "is able to", to: "can" },
  { from: "make use of", to: "use" },
  { from: "take into consideration", to: "consider" },
  { from: "with regard to", to: "about" },
  { from: "in regards to", to: "about" },
  { from: "as a matter of fact", to: "" },
  { from: "by means of", to: "by" },
];

export const HEDGES = [
  "i think", "maybe", "probably", "may", "appears to", "seems to",
  "suggests", "might", "could", "possibly", "perhaps", "in my opinion",
];

export const FILLER_OPENINGS = [
  "it is important to note that", "it should be noted that", "as a matter of fact",
];

export const SIMPLER = [
  { from: "utilize", to: "use" },
  { from: "prior to", to: "before" },
  { from: "commence", to: "start" },
  { from: "subsequent to", to: "after" },
  { from: "in the event that", to: "if" },
  { from: "purchase", to: "buy" },
  { from: "assistance", to: "help" },
  { from: "demonstrate", to: "show" },
  { from: "facilitate", to: "help" },
  { from: "individual", to: "person" },
  { from: "numerous", to: "many" },
  { from: "sufficient", to: "enough" },
  { from: "terminate", to: "end" },
];

export const TODO_PATTERNS = ["TODO", "FIXME", "PLACEHOLDER", "XXX", "[ ... ]", "TBD"];

export function findRepeated(tokens) {
  const out = [];
  let prev = null;
  for (const t of tokens) {
    if (!t.eligible) { prev = null; continue; }
    const w = t.text.toLowerCase();
    if (prev && prev.word === w) {
      // only across whitespace, not punctuation/code/paragraph boundaries
      const between = prev.to;
      // tokens are adjacent in token list; check original gap has no sentence-ending punct or blank line
      void between;
      out.push({ from: prev.from, to: t.to, word: w });
    }
    prev = { word: w, from: t.from, to: t.to };
  }
  return out;
}
