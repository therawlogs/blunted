// Preset configuration — proposed v1 product defaults, NOT scientific
// boundaries or exact Hemingway cutoffs. All values in one versioned object;
// mode changes never rewrite the draft.
import { CONFIG_SCHEMA_VERSION } from "./version.js";

export const MODES = {
  essays: {
    id: "essays", label: "Essays",
    targetGrade: 8,
    yellowWords: 25, redWords: 40, yellowGrade: 12, redGrade: 16,
    minGradeWords: 14, paragraphWords: 150, maxParagraphs: 0,
    characterBudget: 0,
    rules: { passive: true, adverb: true, intensifier: true, wordiness: true, hedge: "note", filler: true, simpler: true, repeated: true, todo: false },
    excludeQuotes: true, readingWpm: 200,
    emailChecks: null, schemaVersion: CONFIG_SCHEMA_VERSION,
  },
  social: {
    id: "social", label: "Social Media",
    targetGrade: 6,
    yellowWords: 18, redWords: 30, yellowGrade: 10, redGrade: 14,
    minGradeWords: 10, paragraphWords: 80, maxParagraphs: 0,
    characterBudget: 280,
    rules: { passive: true, adverb: true, intensifier: true, wordiness: true, hedge: "note", filler: true, simpler: true, repeated: true, todo: false },
    excludeQuotes: true, readingWpm: 200,
    emailChecks: null, schemaVersion: CONFIG_SCHEMA_VERSION,
  },
  message: {
    id: "message", label: "Message",
    targetGrade: 5,
    yellowWords: 15, redWords: 25, yellowGrade: 9, redGrade: 13,
    minGradeWords: 10, paragraphWords: 60, maxParagraphs: 2,
    characterBudget: 0,
    rules: { passive: true, adverb: true, intensifier: true, wordiness: true, hedge: "note", filler: true, simpler: true, repeated: true, todo: false },
    excludeQuotes: true, readingWpm: 200,
    emailChecks: null, schemaVersion: CONFIG_SCHEMA_VERSION,
  },
  email: {
    id: "email", label: "Email",
    targetGrade: 8,
    yellowWords: 25, redWords: 40, yellowGrade: 12, redGrade: 16,
    minGradeWords: 14, paragraphWords: 120, maxParagraphs: 0,
    characterBudget: 0,
    rules: { passive: true, adverb: true, intensifier: true, wordiness: true, hedge: "note", filler: true, simpler: true, repeated: true, todo: false },
    excludeQuotes: true, readingWpm: 200,
    emailChecks: { mode: "new", greeting: true, signoff: true, subjectBudget: 60 },
    schemaVersion: CONFIG_SCHEMA_VERSION,
  },
  research: {
    id: "research", label: "Research",
    targetGrade: 12,
    yellowWords: 35, redWords: 55, yellowGrade: 16, redGrade: 20,
    minGradeWords: 14, paragraphWords: 200, maxParagraphs: 0,
    characterBudget: 0,
    rules: { passive: true, adverb: false, intensifier: "selected", wordiness: true, hedge: "off", filler: true, simpler: true, repeated: true, todo: true },
    excludeQuotes: true, readingWpm: 200,
    emailChecks: null, schemaVersion: CONFIG_SCHEMA_VERSION,
  },
};

export function getMode(id) {
  return MODES[id] || MODES.essays;
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
  const next = { ...base, ...overrides };
  if (overrides.rules) next.rules = { ...base.rules, ...overrides.rules };
  const errors = validateConfig(next);
  if (errors.length) throw new Error("Invalid config: " + errors.join("; "));
  next.customized = Object.keys(overrides).length > 0;
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
