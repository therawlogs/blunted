import { test } from "node:test";
import assert from "node:assert/strict";
import { analyze } from "../src/engine/index.js";

// Non-English input: scores/rules suppressed, text intact
test("non-english suppression", () => {
  const hi = "यह एक लंबा परीक्षण वाक्य है जिसमें कई शब्द हैं और यह जारी रहता है ".repeat(6);
  const r = analyze({ text: hi, mode: "essays" });
  assert.equal(r.metrics.language.englishLikely, false);
  assert.ok(r.warnings.some((w) => w.code === "non-english"));
  // body untouched
  assert.ok(r.metrics.charCount > 0);
});

// Email mode: greeting/sign-off completeness notes, reply silences them
test("email checks", () => {
  const noGreet = "Please send the report by Friday.\n\nThanks,\nSam\n";
  const r = analyze({ text: noGreet, mode: "email", subject: "Report" });
  assert.ok(r.issues.some((i) => i.ruleId === "email-greeting"));
  const r2 = analyze({ text: noGreet, mode: "email", emailReply: true });
  assert.ok(!r2.issues.some((i) => i.ruleId === "email-greeting"));
  // subject budget
  const long = "x".repeat(70);
  const r3 = analyze({ text: "Hi Sam,\n\nSee notes.\n\nBest,\nJo\n", mode: "email", subject: long });
  assert.ok(r3.issues.some((i) => i.ruleId === "email-subject"));
});

// Research: TODO markers flagged, quotes excluded from style rules by default
test("research todo + quotes", () => {
  const r = analyze({ text: "We measured the samples. TODO: add citation.", mode: "research" });
  assert.ok(r.issues.some((i) => i.ruleId === "todo"));
  const q = analyze({ text: "> It was written very quickly.\n\nIt was written very quickly.", mode: "essays" });
  // only the non-quote occurrence flags passive/adverb
  const passives = q.issues.filter((i) => i.ruleId === "passive");
  assert.equal(passives.length, 1);
  assert.ok(passives[0].from > 10);
});

// Small sample: grade suppressed, suggestions kept
test("small sample suppression", () => {
  const r = analyze({ text: "It was written.", mode: "essays" });
  assert.equal(r.metrics.grade, null);
  assert.equal(r.metrics.gradeSuppressed, true);
  assert.ok(r.metrics.provisionalGrade || r.metrics.rawAri != null);
  assert.ok(r.issues.some((i) => i.ruleId === "passive"));
});

// Social budget: limit-level issue, never blocks export (export is UI-side)
test("social character budget", () => {
  const r = analyze({ text: "cat ".repeat(100), mode: "social" });
  assert.ok(r.issues.some((i) => i.ruleId === "character-budget" && i.severity === "limit"));
});

// Reading time
test("reading time estimate", () => {
  const short = analyze({ text: "Hello world.", mode: "essays" });
  assert.equal(short.metrics.readingTime, "<1 min");
  const long = analyze({ text: "word ".repeat(500), mode: "essays" });
  assert.match(long.metrics.readingTime, /min/);
});

// Fix safety: simpler-word fix preserves case and exact text
test("simpler fix case", () => {
  const r = analyze({ text: "Utilize this tool.", mode: "essays" });
  const s = r.issues.find((i) => i.ruleId === "simpler");
  assert.ok(s);
  assert.equal(s.fix.replacement, "Use");
  assert.equal(s.exactText, "Utilize");
});
