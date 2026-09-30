// Adverbs / intensifiers. Suffix rule does NOT identify part of speech —
// label "Possible adverb".
const LY_EXCEPTIONS = new Set((
  "family friendly lovely lonely lively likely only early ugly holy silly apply supply reply july italy " +
  "fully ally bully belly chilly daily dilly dally folly gully hilly jelly rally tally valley belly " +
  "fly sly shy cry dry try july"
).split(/\s+/));

const INTENSIFIERS = ["very", "really", "extremely", "quite", "highly", "deeply", "truly", "utterly", "totally", "completely", "absolutely", "simply", "merely", "rather"];
// "just/well/fast/hard" are NOT blanket-flagged.
const SELECTED_VAGUE = new Set(["very", "really", "extremely", "quite"]);

export { INTENSIFIERS, SELECTED_VAGUE };

export function findAdverbs(tokens, mode) {
  const out = [];
  const adverbOn = mode.rules.adverb;
  const intensMode = mode.rules.intensifier; // true | "selected" | false
  for (const t of tokens) {
    if (!t.eligible) continue;
    const w = t.text.toLowerCase();
    if (intensMode === true && INTENSIFIERS.includes(w)) {
      out.push({ from: t.from, to: t.to, kind: "intensifier", word: t.text });
      continue;
    }
    if (intensMode === "selected" && SELECTED_VAGUE.has(w)) {
      out.push({ from: t.from, to: t.to, kind: "intensifier", word: t.text });
      continue;
    }
    if (!adverbOn) continue;
    if (intensMode !== true && INTENSIFIERS.includes(w) && intensMode !== "selected") continue;
    if (w.endsWith("ly") && w.length > 4 && !LY_EXCEPTIONS.has(w)) {
      out.push({ from: t.from, to: t.to, kind: "adverb", word: t.text });
    }
  }
  return out;
}
