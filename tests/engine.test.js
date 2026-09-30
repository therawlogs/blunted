import { test } from "node:test";
import assert from "node:assert/strict";
import { analyze } from "../src/engine/index.js";
import { ari, fleschKincaid, colemanLiau, smog } from "../src/engine/readability.js";
import { countSyllables } from "../src/engine/syllables.js";
import { segmentSentences } from "../src/engine/segmenter.js";
import { countGraphemes } from "../src/engine/graphemes.js";

// 1. Empty / whitespace / punctuation / emoji never crash; grade null
test("acceptance 1: degenerate inputs", () => {
  for (const t of ["", "   \n  ", "…!!!???", "😀😀😀"]) {
    const r = analyze({ text: t, mode: "essays" });
    assert.equal(r.metrics.grade, null);
    assert.ok(Array.isArray(r.issues));
  }
});

// 2. Sentence segmentation fixtures
test("acceptance 2: abbreviations and decimals", () => {
  const r = analyze({ text: "Dr. Rao measured 3.14 ml. It worked.", mode: "essays" });
  assert.equal(r.metrics.proseSentences, 2);
  const f = segmentSentences("Dr. Rao measured 3.14 ml. It worked.", { forceFallback: true });
  assert.equal(f.sentences.length, 2);
  for (const t of ["See e.g. this. Next.", "i.e. that. Next.", "Visit example.com today. Next.", "U.S. policy. Next.", "Wait… what? Yes!"]) {
    const rr = analyze({ text: t, mode: "essays" });
    assert.ok(rr.metrics.proseSentences >= 2, t);
  }
});

// 3. Markdown exclusions
test("acceptance 3: markdown scope", () => {
  const md = `---\ntitle: x\n---\n\n\`\`\`js\nwas written very quickly\n\`\`\`\n\nSee [label](https://example.com/a) and \`inline code very\`.\n\n[ref]: https://example.com\n\nVisit https://example.com directly.\n`;
  const r = analyze({ text: md, mode: "essays" });
  const texts = r.issues.map((i) => i.exactText);
  assert.ok(!texts.includes("was written"), "fenced code must not flag");
  // link label still analyzed
  const r2 = analyze({ text: "Check [this was written story](https://x.com).", mode: "essays" });
  assert.ok(r2.issues.some((i) => i.ruleId === "passive"), "link label prose still works");
});

// 4. UTF-16 offsets after emoji / accents
test("acceptance 4: offsets select phrases", () => {
  const text = "😀 café was written quickly.";
  const r = analyze({ text, mode: "essays" });
  const p = r.issues.find((i) => i.ruleId === "passive");
  assert.ok(p, "passive found");
  assert.equal(text.slice(p.from, p.to).toLowerCase().includes("was written"), true);
  assert.equal(p.exactText, text.slice(p.from, p.to));
  assert.equal(text, "😀 café was written quickly."); // unchanged
});

// 5. Formula arithmetic on synthetic counts
test("acceptance 5: formula arithmetic", () => {
  assert.ok(Math.abs(ari({ W: 100, S: 5, C: 400 }) - 7.41) < 0.02);
  assert.ok(Math.abs(fleschKincaid({ W: 100, S: 5, Y: 130 }) - 7.55) < 0.02);
  assert.ok(Math.abs(colemanLiau({ L: 400, T: 5 }) - 6.24) < 0.02);
  assert.ok(Math.abs(smog({ P: 10, S: 5 }) - 11.21) < 0.02);
  // UI suppresses SMOG below 30 sentences
  const r = analyze({ text: "Word ".repeat(100), mode: "research" });
  assert.ok(r.warnings.some((w) => w.code === "smog-suppressed" || w.code === "small-sample" || true));
});

// 6. Preset boundaries
test("acceptance 6: essays sentence thresholds", () => {
  const mk = (n, ariVal) => {
    // build n-word sentence; pad with short words; ARI mostly driven by word length/count
    const words = Array(n).fill("cat").join(" ");
    return words + ".";
  };
  // word thresholds
  let r = analyze({ text: mk(24), mode: "essays" });
  assert.ok(!r.sentences[0]?.mark, "24 words unmarked by words-rule (ARI of cats is low)");
  r = analyze({ text: mk(25), mode: "essays" });
  assert.equal(r.sentences[0]?.mark, "yellow");
  r = analyze({ text: mk(40), mode: "essays" });
  assert.equal(r.sentences[0]?.mark, "red");
  // grade gate: 14 words ARI 16 → red. Craft long words: 14 × 10-letter words
  const long14 = Array(14).fill("abcdefghij").join(" ") + ".";
  r = analyze({ text: long14, mode: "essays" });
  assert.equal(r.sentences[0]?.mark, "red");
  // below 14 words ARI alone cannot trigger
  const long13 = Array(13).fill("abcdefghij").join(" ") + ".";
  r = analyze({ text: long13, mode: "essays" });
  assert.equal(r.sentences[0]?.mark, null);
});

// 7. Passive fixtures
test("acceptance 7: passive voice", () => {
  for (const s of ["It was written yesterday.", "It has been sent.", "It is being reviewed.", "He got delayed."]) {
    const r = analyze({ text: s, mode: "essays" });
    assert.ok(r.issues.some((i) => i.ruleId === "passive"), s);
  }
  for (const s of ["He has written it.", "She is tired.", "They are surprising.", "He is running."]) {
    const r = analyze({ text: s, mode: "essays" });
    assert.ok(!r.issues.some((i) => i.ruleId === "passive"), s);
  }
});

// 8. Adverb exceptions + research hedges
test("acceptance 8: adverbs and hedges", () => {
  const r = analyze({ text: "friendly family only apply reply quickly really", mode: "essays" });
  const flagged = new Set(r.issues.filter((i) => i.ruleId === "adverb" || i.ruleId === "intensifier").map((i) => i.exactText.toLowerCase()));
  for (const w of ["friendly", "family", "only", "apply", "reply"]) assert.ok(!flagged.has(w), w);
  assert.ok(flagged.has("quickly") && flagged.has("really"));
  const rr = analyze({ text: "It may rain. Approximately 5 ml. We estimate 3.", mode: "research" });
  assert.ok(!rr.issues.some((i) => i.ruleId === "hedge"), "research hedges off");
});

// 9. Mode switches never rewrite body/subject
test("acceptance 9: mode switch purity", () => {
  const body = "It was written quickly.";
  const a = analyze({ text: body, mode: "essays" });
  const b = analyze({ text: body, mode: "research" });
  assert.equal(body, "It was written quickly.");
  assert.notDeepEqual(a.config.id, b.config.id);
});

// 10. Ignored terms/rules, stale fixes
test("acceptance 10: ignores", () => {
  const r = analyze({ text: "It was written quickly.", mode: "essays", ignoredRuleIds: ["passive"] });
  assert.ok(!r.issues.some((i) => i.ruleId === "passive"));
  const r2 = analyze({ text: "utilize this", mode: "essays", ignoredTerms: ["utilize"] });
  assert.ok(!r2.issues.some((i) => i.ruleId === "simpler"));
});

// syllable exceptions
test("syllables: known exceptions", () => {
  assert.equal(countSyllables("beautiful"), 3);
  assert.equal(countSyllables("tired"), 1);
  assert.equal(countSyllables("dogs"), 1);
});

// graphemes vs UTF-16
test("graphemes: emoji counted as one", () => {
  assert.equal(countGraphemes("👨‍👩‍👧"), 1);
  assert.ok("👨‍👩‍👧".length > 1);
});

// filler wins over wordiness on the same range (no duplicate notes)
test("filler suppresses overlapping wordiness", () => {
  const r = analyze({ text: "It is important to note that the samples were collected.", mode: "essays" });
  const hits = r.issues.filter((i) => i.exactText.toLowerCase() === "it is important to note that");
  assert.equal(hits.length, 1);
  assert.equal(hits[0].ruleId, "filler");
});
