import { test } from "node:test";
import assert from "node:assert/strict";
import { analyze, getMode, MODES } from "../src/engine/index.js";

// Named editable profiles have independent starting points.
test("Clear and Essay profile defaults", () => {
  assert.deepEqual(Object.keys(MODES), ["clear", "essay"]);
  assert.equal(getMode("clear").id, "clear");
  assert.equal(getMode("clear").targetGrade, 8);
  assert.equal(getMode("essay").id, "essay");
  assert.equal(getMode("essay").targetGrade, 12);
  // legacy ids with an unambiguous named profile migrate to Essay.
  assert.equal(getMode("essays").id, "essay");
  for (const legacy of ["social", "message", "email", "research"]) {
    assert.equal(getMode(legacy).id, "clear", legacy);
  }
  assert.equal(getMode("nonsense").id, "clear");
});

test("profile-specific thresholds and personal voice words", () => {
  const text = ("This is a clear and simple line with a few short words ").repeat(4) + "today.";
  const neutralGrade = { yellowGrade: 35, redGrade: 35, minGradeWords: 100 };
  const essay = analyze({ text, mode: "essay", overrides: neutralGrade });
  const clear = analyze({ text, mode: "clear", overrides: neutralGrade });
  assert.equal(essay.sentences[0].mark, "yellow");
  assert.equal(clear.sentences[0].mark, "red");
  const personal = analyze({ text: "We utilize tools.", personalWords: ["utilize"] });
  assert.ok(!personal.issues.some((i) => i.ruleId === "wordiness" && i.text.includes("utilize")));
});

test("strict rule setting includes quoted voice", () => {
  const text = '> "The report was written by the team."';
  const normal = analyze({ text, mode: "clear" });
  const strict = analyze({ text, mode: "clear", overrides: { rules: { passive: "strict" } } });
  assert.ok(!normal.issues.some((i) => i.ruleId === "passive"));
  assert.ok(strict.issues.some((i) => i.ruleId === "passive"));
});

// Non-English input: scores/rules suppressed, text intact
test("non-english suppression", () => {
  const hi = "यह एक लंबा परीक्षण वाक्य है जिसमें कई शब्द हैं और यह जारी रहता है ".repeat(6);
  const r = analyze({ text: hi });
  assert.equal(r.metrics.language.englishLikely, false);
  assert.ok(r.warnings.some((w) => w.code === "non-english"));
  // body untouched
  assert.ok(r.metrics.charCount > 0);
});

// TODO markers flagged, quotes excluded from style rules by default
test("todo + quotes", () => {
  const r = analyze({ text: "We measured the samples. TODO: add citation." });
  assert.ok(r.issues.some((i) => i.ruleId === "todo"));
  const q = analyze({ text: "> It was written very quickly.\n\nIt was written very quickly." });
  // only the non-quote occurrence flags passive/adverb
  const passives = q.issues.filter((i) => i.ruleId === "passive");
  assert.equal(passives.length, 1);
  assert.ok(passives[0].from > 10);
});

// Small sample: grade suppressed, suggestions kept
test("small sample suppression", () => {
  const r = analyze({ text: "It was written." });
  assert.equal(r.metrics.grade, null);
  assert.equal(r.metrics.gradeSuppressed, true);
  assert.ok(r.metrics.provisionalGrade || r.metrics.rawAri != null);
  assert.ok(r.issues.some((i) => i.ruleId === "passive"));
});

// Reading time
test("reading time estimate", () => {
  const short = analyze({ text: "Hello world." });
  assert.equal(short.metrics.readingTime, "<1 min");
  const long = analyze({ text: "word ".repeat(500) });
  assert.match(long.metrics.readingTime, /min/);
});

// Fix safety: simpler-word fix preserves case and exact text
test("simpler fix case", () => {
  const r = analyze({ text: "Utilize this tool." });
  const s = r.issues.find((i) => i.ruleId === "simpler");
  assert.ok(s);
  assert.equal(s.fix.replacement, "Use");
  assert.equal(s.exactText, "Utilize");
});

// Hedges are notes in the single preset (no Research-style off switch)
test("hedges noted", () => {
  const r = analyze({ text: "It may rain tomorrow, and the results suggest a trend." });
  assert.ok(r.issues.some((i) => i.ruleId === "hedge"));
});

// Rule overrides: flat & nested toggling, customized status check
test("rule overrides: flat and nested toggles", () => {
  const sample = "The report was written by Sam. We utilize tools in order to finish.";
  const def = analyze({ text: sample, overrides: { readingWpm: 200 } });
  assert.equal(def.config.customized, false);
  assert.ok(def.issues.some((i) => i.ruleId === "passive"));
  assert.ok(def.issues.some((i) => i.ruleId === "simpler"));

  // Flat overrides (as sent by UI)
  const flatOff = analyze({ text: sample, overrides: { passive: false, simpler: false } });
  assert.equal(flatOff.config.customized, true);
  assert.ok(!flatOff.issues.some((i) => i.ruleId === "passive"));
  assert.ok(!flatOff.issues.some((i) => i.ruleId === "simpler"));
  assert.ok(flatOff.issues.some((i) => i.ruleId === "wordiness"));

  // Nested overrides
  const nestedOff = analyze({ text: sample, overrides: { rules: { passive: false } } });
  assert.equal(nestedOff.config.customized, true);
  assert.ok(!nestedOff.issues.some((i) => i.ruleId === "passive"));
  assert.ok(nestedOff.issues.some((i) => i.ruleId === "simpler"));
});
