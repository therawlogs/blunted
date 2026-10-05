// Single clarity preset — one focus, not five modes.
// v2: Essay/Social/Message/Email/Research modes removed by owner decision.
// Any legacy mode id maps to "clear" so old drafts and callers keep working.
// Thresholds follow the former Essays/Email shape: target grade 8,
// yellow 25 words / grade 12, red 40 / grade 16.
import { CONFIG_SCHEMA_VERSION } from "./version.js";

export const MODES = {
  clear: {
    id: "clear", label: "Clear",
    targetGrade: 8,
    yellowWords: 25, redWords: 40, yellowGrade: 12, redGrade: 16,
    minGradeWords: 14, paragraphWords: 120, maxParagraphs: 0,
    characterBudget: 0,
    rules: { passive: true, adverb: true, intensifier: true, wordiness: true, hedge: "note", filler: true, simpler: true, repeated: true, todo: true },
    excludeQuotes: true, readingWpm: 200,
    emailChecks: null, schemaVersion: CONFIG_SCHEMA_VERSION,
  },
};

const LEGACY_IDS = new Set(["essays", "social", "message", "email", "research", "clear", "default"]);

export function getMode(id) {
  if (id && MODES[id]) return MODES[id];
  if (id && LEGACY_IDS.has(id)) return MODES.clear; // legacy preset → single preset
  return MODES.clear;
}

export function validateConfig(cfg) {
  const errors = [];
  for (const k of ["yellowWords", "redWords", "yellowGrade", "redGrade", "minGradeWords"]) {
    if (!Number.isFinite(cfg[k])) errors.push(`${k} must be finite`);
  }
  if (cfg.redWords < cfg.yellowWords) errors.push("redWords must be >= yellowWords");
  if (cfg.redGrade < cfg.yellowGrade) errors.push("redGrade must be >= yellowGrade");
  if (cfg.readingWpm != null && (cfg.readingWpm < 100 || cfg.readingWpm > 400)) errors.push("readingWpm 100–400");
  return errors;
}

export function applyOverrides(modeId, overrides = {}) {
  const base = { ...getMode(modeId), rules: { ...getMode(modeId).rules } };
  const ruleKeys = new Set(Object.keys(base.rules));
  const top = {};
  const flatRules = {};
  for (const [k, v] of Object.entries(overrides || {})) {
    if (k === "rules" || v === undefined) continue;
    if (ruleKeys.has(k)) flatRules[k] = v;
    else top[k] = v;
  }
  const nested = (overrides && overrides.rules) || {};
  const next = { ...base, ...top, rules: { ...base.rules, ...flatRules, ...nested } };
  const errors = validateConfig(next);
  if (errors.length) throw new Error("Invalid config: " + errors.join("; "));
  
  const NON_PRESET_KEYS = new Set(["readingWpm", "excludeQuotes"]);
  const ruleDiff = Object.keys(next.rules).some((k) => next.rules[k] !== base.rules[k]);
  const topDiff = Object.keys(top).some((k) => !NON_PRESET_KEYS.has(k) && top[k] !== base[k]);
  next.customized = ruleDiff || topDiff;

  // normalize any legacy stored id to the single preset
  next.id = "clear";
  return next;
}

// Sentence highlight algorithm per §8.
// Red if words>=redWords OR (words>=minGrade AND ari>=redGrade).
// Else yellow if words>=yellowWords OR (words>=minGrade AND ari>=yellowGrade).
export function sentenceMark({ wordCount, rawAri, cfg }) {
  if (wordCount >= cfg.redWords) return "red";
  if (wordCount >= cfg.minGradeWords && rawAri != null && rawAri >= cfg.redGrade) return "red";
  if (wordCount >= cfg.yellowWords) return "yellow";
  if (wordCount >= cfg.minGradeWords && rawAri != null && rawAri >= cfg.yellowGrade) return "yellow";
  return null;
}
