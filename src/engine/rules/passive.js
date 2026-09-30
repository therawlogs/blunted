// Possible passive voice — be/get auxiliary + optional not/adverbs + participle.
// Labels "Possible passive voice"; no auto rewrite (actor unknown).
// Handles: was written, has been sent, is being reviewed, will be approved, got delayed.
// Excludes: is tired/married/bored/interested, has written (active perfect), is running.

const BE_FORMS = new Set([
  "am", "is", "are", "was", "were", "be", "been", "being",
  "has", "have", "had", "will", "would", "shall", "should", "may", "might", "must", "can", "could",
  "isn't", "aren't", "wasn't", "weren't", "hasn't", "haven't", "hadn't", "won't", "wouldn't",
]);
const GET_FORMS = new Set(["get", "gets", "got", "getting"]);
const ADVERB_SKIP = new Set(["not", "already", "always", "never", "often", "usually", "recently", "just", "still", "also", "even", "really", "very", "quite"]);

// Curated irregular past participles (original small list for v1; provenance: standard English morphology).
const IRREGULAR = new Set((
  "written sent reviewed approved delayed built broken chosen done drawn driven eaten fallen " +
  "forgotten given grown hidden known taken taught thought told understood paid made found " +
  "heard held kept left lost meant met sold spent stood stuck struck sworn swept taught torn " +
  "worn collected measured considered used shown grown proven established compared based " +
  "included involved required performed obtained achieved observed noted reported recorded " +
  "created tested driven selected affected accepted expected"
).split(/\s+/));

// Adjective/copula exclusions — -ed words that are usually adjectives, not passive.
const ADJECTIVE_EXCLUSIONS = new Set([
  "tired", "married", "bored", "interested", "surprising", "surprised", "interesting",
  "excited", "worried", "pleased", "delighted", "ashamed", "running",
]);

export function findPassive(text, sentenceGroups) {
  const out = [];
  // sentenceGroups: [{from, to, toks}] with toks pre-grouped in one pass.
  for (const g of sentenceGroups) {
    const toks = g.toks;
    const lower = toks.map((t) => t.text.toLowerCase());
    for (let i = 0; i < toks.length; i++) {
      const w = lower[i];
      const isAux = BE_FORMS.has(w) || GET_FORMS.has(w);
      if (!isAux) continue;
      // scan ahead up to 4 tokens: [have/has/had/been/being/be]* + not/adverb{0,2} + participle
      let j = i + 1;
      let steps = 0;
      // consume auxiliaries chain: been, being, be
      while (j < toks.length && ["been", "being", "be"].includes(lower[j]) && steps < 3) { j++; steps++; }
      // optional not + up to two adverbs
      let adv = 0;
      while (j < toks.length && ADVERB_SKIP.has(lower[j]) && adv < 3) { j++; adv++; }
      if (j >= toks.length) continue;
      const cand = lower[j];
      if (ADJECTIVE_EXCLUSIONS.has(cand)) continue;
      // "has written" active perfect: have + plain past (no been/being) + irregular that is also past tense?
      // Heuristic: if aux is have/has/had and no been/being consumed and candidate is not clearly passive context, require been/being OR be+participle.
      const consumedBeen = toks.slice(i + 1, j).some((t) => ["been", "being", "be"].includes(t.text.toLowerCase()));
      const isHave = ["has", "have", "had"].includes(w);
      if (isHave && !consumedBeen) continue; // "has written" active — skip
      if (cand === "running") continue;
      const isIrregular = IRREGULAR.has(cand);
      const isRegular = /[a-z]+ed$/i.test(cand) && cand.length > 3 && !ADJECTIVE_EXCLUSIONS.has(cand);
      const isApprovedN = /^(approved|reviewed|delayed|sent|written)$/.test(cand);
      if (!(isIrregular || isRegular || isApprovedN)) continue;
      // stop at punctuation between aux and participle
      const between = text.slice(toks[i].to, toks[j].from);
      if (/[.;:!?]/.test(between)) continue;
      out.push({ from: toks[i].from, to: toks[j].to });
    }
  }
  return out;
}
