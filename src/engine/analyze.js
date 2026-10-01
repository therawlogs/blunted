// Pure engine: analyze({text, overrides, ignoredTerms})
// No DOM, storage, clipboard, filesystem, or network calls.
// Single clarity preset ("clear"). `mode` is accepted for backward
// compatibility (legacy Essay/Social/Message/Email/Research ids map to
// "clear") and otherwise ignored. `subject`/`emailReply` are accepted but
// ignored (email mode removed).
import { scanDocument, rangeOverlap } from "./markdown.js";
import { tokenize, countLettersDigits } from "./tokenizer.js";
import { segmentSentences } from "./segmenter.js";
import { countSyllables } from "./syllables.js";
import { ari, fleschKincaid, colemanLiau, smog, displayGrade, shouldSuppressGrade } from "./readability.js";
import { getMode, applyOverrides, sentenceMark } from "./config.js";
import { ENGINE_VERSION, CONFIG_VERSION } from "./version.js";
import { makeIssue, dedupeSort, findPhrases, inRanges } from "./rules/helpers.js";
import { findPassive } from "./rules/passive.js";
import { findAdverbs } from "./rules/adverbs.js";
import { WORDINESS, HEDGES, FILLER_OPENINGS, SIMPLER, TODO_PATTERNS, findRepeated } from "./rules/wordlists.js";
import { countGraphemes } from "./graphemes.js";

let revisionCounter = 0;

export function analyze({ text = "", mode = "clear", overrides = {}, ignoredTerms = [], ignoredRuleIds = [], subject = "", emailReply = false, textRevision = null, segmenterFallback = false } = {}) {
  const src = String(text ?? "");
  const modeCfg = applyOverrides(mode, overrides);
  const rev = textRevision ?? ++revisionCounter;

  const { excludedRanges, headingRanges, quoteRanges } = scanDocument(src);
  const tokens = tokenize(src, excludedRanges);
  const seg = segmentSentences(src, { forceFallback: segmenterFallback });

  // eligible prose words vs total
  const eligibleTokens = tokens.filter((t) => t.eligible);
  const totalWords = tokens.filter((t) => /[\p{L}]/u.test(t.text)).length;
  const eligibleWords = eligibleTokens.length;

  // sentences: filter out those fully inside excluded ranges (code/frontmatter/ref)
  // Headings already excluded. Quotes handled via excludeQuotes flag for RULES only (still visible).
  // Single linear sweep assigns tokens to sentences (both in document order).
  const ordered = [...seg.sentences].sort((a, b) => a.from - b.from);
  const groups = ordered.map((s) => ({ s, toks: [] }));
  {
    let gi = 0;
    for (const t of tokens) {
      if (!t.eligible) continue;
      while (gi < groups.length && t.from >= groups[gi].s.to) gi++;
      if (gi >= groups.length) break;
      const g = groups[gi];
      if (t.to > g.s.from && t.from < g.s.to) g.toks.push(t);
    }
  }
  const tokenByFrom = new Map(tokens.map((t) => [t.from, t]));
  const proseSentences = [];
  const allSentInfo = [];
  for (const g of groups) {
    const s = g.s;
    const fullyExcluded = excludedFully(excludedRanges, s.from, s.to);
    const wc = g.toks.length;
    const inQuote = quoteRanges.some((q) => s.from < q.to && s.to > q.from);
    allSentInfo.push({ ...s, wordCount: wc, excluded: fullyExcluded, inQuote, _toks: g.toks });
    if (!fullyExcluded && wc > 0) proseSentences.push({ ...s, wordCount: wc, inQuote, _toks: g.toks });
  }

  // Language gate: English-first. Heuristic, never claimed exact.
  const lang = detectLanguage(src, eligibleTokens);
  const englishAllowed = lang.englishLikely !== false;

  // Count-based metrics over eligible prose
  let C = 0, Y = 0, P = 0;
  for (const t of eligibleTokens) {
    C += countLettersDigits(t.text);
    if (!t.isNumeric) {
      const sy = countSyllables(t.text);
      Y += sy;
      if (sy >= 3) P += 1;
    }
  }
  const W = eligibleWords;
  const S = proseSentences.length;
  const L = W ? (C / W) * 100 : null;
  const T = W ? (S / W) * 100 : null;

  const rawAri = ari({ W, S, C });
  const rawFk = fleschKincaid({ W, S, Y });
  const rawCl = L != null && T != null ? colemanLiau({ L, T }) : null;
  const rawSmog = smog({ P, S });
  const suppressed = shouldSuppressGrade({ eligibleWords: W, proseSentences: S });
  const grade = rawAri == null ? null : displayGrade(rawAri);

  // sentence marks (review-level)
  const sentences = allSentInfo.map((s) => {
    const { _toks, ...pub } = s;
    if (s.excluded || s.wordCount === 0) return { ...pub, mark: null, rawAri: null };
    const sentTokens = _toks || [];
    let cC = 0;
    for (const t of sentTokens) cC += countLettersDigits(t.text);
    const rAri = ari({ W: s.wordCount, S: 1, C: cC });
    const mark = englishAllowed ? sentenceMark({ wordCount: s.wordCount, rawAri: rAri, cfg: modeCfg }) : null;
    return { ...pub, mark, rawAri: rAri };
  });

  // ---- rules ----
  const issues = [];
  const ignoredSet = new Set((ignoredTerms || []).map((s) => String(s).toLowerCase()));
  const ignoredRules = new Set(ignoredRuleIds || []);
  const quoteOnly = (from, to) =>
    modeCfg.excludeQuotes && quoteRanges.some((q) => from >= q.from && to <= q.to);

  const allow = (ruleId, from, to, exact) => {
    if (ignoredRules.has(ruleId)) return false;
    if (exact && ignoredSet.has(exact.toLowerCase())) return false;
    if (inRanges(excludedRanges, from, to)) return false;
    if (quoteOnly(from, to)) return false;
    return true;
  };

  if (englishAllowed) {
    // passive
    if (modeCfg.rules.passive && !ignoredRules.has("passive")) {
      const passiveGroups = proseSentences.map((s) => ({ from: s.from, to: s.to, toks: s._toks || [] }));
      for (const r of findPassive(src, passiveGroups)) {
        if (!allow("passive", r.from, r.to)) continue;
        issues.push(makeIssue({
          ruleId: "passive", category: "passive", from: r.from, to: r.to, text: src,
          explanation: "Possible passive voice. If the actor matters, name them.",
        }));
      }
    }
    // adverbs / intensifiers
    if ((modeCfg.rules.adverb || modeCfg.rules.intensifier) && !ignoredRules.has("adverb")) {
      for (const r of findAdverbs(tokens, modeCfg)) {
        if (!allow(r.kind === "intensifier" ? "intensifier" : "adverb", r.from, r.to, r.word)) continue;
        issues.push(makeIssue({
          ruleId: r.kind === "intensifier" ? "intensifier" : "adverb",
          category: "adverb",
          from: r.from, to: r.to, text: src,
          explanation: r.kind === "intensifier"
            ? "Intensifier — check whether it adds useful detail."
            : "Possible adverb — check whether it adds useful detail.",
        }));
      }
    }
    // filler ranges first: a wordiness hit on the same range is a duplicate
    // note, so the more precise filler label wins.
    const fillerRanges = [];
    if (modeCfg.rules.filler) {
      for (const f of FILLER_OPENINGS) {
        for (const m of findPhrases(src, [f])) {
          if (allow("filler", m.from, m.to, m.match)) fillerRanges.push({ from: m.from, to: m.to });
        }
      }
    }
    const overlapsFiller = (from, to) => fillerRanges.some((r) => from < r.to && to > r.from);
    // wordiness
    if (modeCfg.rules.wordiness) {
      for (const w of WORDINESS) {
        for (const m of findPhrases(src, [w.from])) {
          if (!allow("wordiness", m.from, m.to, m.match)) continue;
          if (overlapsFiller(m.from, m.to)) continue;
          issues.push(makeIssue({
            ruleId: "wordiness", category: "wordiness", from: m.from, to: m.to, text: src,
            explanation: w.to ? `Wordy — consider “${w.to}”.` : "Wordy — consider cutting.",
            alternatives: w.to ? [w.to] : [],
            fix: w.to ? { replacement: preserveCase(m.match, w.to) } : null,
          }));
        }
      }
    }
    // hedges: kept as notes (single preset); "off" only via override
    if (modeCfg.rules.hedge === "note") {
      for (const h of HEDGES) {
        // single-word hedges need token-exact; phrases via findPhrases
        for (const m of findPhrases(src, [h])) {
          if (!allow("hedge", m.from, m.to, m.match)) continue;
          if (h === "may" || h === "might" || h === "could") {
            // avoid flagging inside code already excluded; keep note-level
          }
          issues.push(makeIssue({
            ruleId: "hedge", category: "hedge", severity: "review", confidence: "heuristic",
            from: m.from, to: m.to, text: src,
            explanation: "Hedge — keep if it expresses real uncertainty.",
          }));
        }
      }
    }
    // filler openings (ranges precomputed above; emit the winning note here)
    if (modeCfg.rules.filler) {
      for (const r of fillerRanges) {
        issues.push(makeIssue({
          ruleId: "filler", category: "wordiness", from: r.from, to: r.to, text: src,
          explanation: "Filler opening — consider cutting.",
        }));
      }
    }
    // simpler words
    if (modeCfg.rules.simpler) {
      for (const s of SIMPLER) {
        for (const m of findPhrases(src, [s.from])) {
          if (!allow("simpler", m.from, m.to, m.match)) continue;
          // don't touch statistical "significant" — not in list; proper names/quotes already excluded via ranges
          issues.push(makeIssue({
            ruleId: "simpler", category: "simpler", from: m.from, to: m.to, text: src,
            explanation: `Simpler alternative: “${s.to}” — keep original if meaning differs.`,
            alternatives: [preserveCase(m.match, s.to)],
            fix: { replacement: preserveCase(m.match, s.to) },
          }));
        }
      }
    }
    // repeated words (adjacent duplicates across whitespace only)
    if (modeCfg.rules.repeated) {
      for (const r of findRepeated(tokens)) {
        const prevTok = tokenByFrom.get(r.from);
        const gapStart = prevTok ? prevTok.to : r.from;
        const gap = src.slice(gapStart, r.to - r.word.length);
        // gap must be whitespace-only, single block (no blank line, no punctuation)
        if (!/^\s+$/.test(gap)) continue;
        if (/\n\s*\n/.test(src.slice(r.from, r.to))) continue;
        if (/[.,;:!?'"“”‘’()\-]/.test(gap)) continue;
        if (!allow("repeated", r.from, r.to)) continue;
        const intentional = r.word === "had" || r.word === "that";
        issues.push(makeIssue({
          ruleId: "repeated", category: "repeated", from: r.from, to: r.to, text: src,
          explanation: intentional
            ? "Repeated word — “had had” / “that that” can be intentional; review."
            : "Repeated word — possible duplicate.",
          fix: null,
        }));
        void gap;
      }
    }
    // TODO scan (placeholder markers — on in the single preset)
    if (modeCfg.rules.todo) {
      for (const m of findPhrases(src, TODO_PATTERNS)) {
        if (ignoredRules.has("todo")) continue;
        issues.push(makeIssue({
          ruleId: "todo", category: "todo", from: m.from, to: m.to, text: src,
          explanation: "Placeholder marker — resolve before sharing.",
        }));
      }
    }
  }

  // sentence-length issues (review-level, one background per sentence; red wins)
  for (const s of sentences) {
    if (!s.mark || s.excluded) continue;
    if (modeCfg.excludeQuotes && s.inQuote) continue;
    issues.push(makeIssue({
      ruleId: s.mark === "red" ? "sentence-long-red" : "sentence-long-yellow",
      category: "sentence", severity: "review", confidence: "deterministic",
      from: s.from, to: s.to, text: src,
      explanation: s.mark === "red" ? "Long sentence — consider splitting." : "Lengthy sentence — review for clarity.",
    }));
  }

  // paragraph advice (never errors)
  const paragraphs = src.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const paraInfos = paragraphs.map((p) => ({ words: (p.match(/[\p{L}\p{N}]+/gu) || []).length }));
  const longParas = paraInfos.filter((p) => p.words > modeCfg.paragraphWords).length;
  if (modeCfg.paragraphWords && longParas > 0) {
    issues.push(makeIssue({
      ruleId: "paragraph-long", category: "paragraph", severity: "info", confidence: "deterministic",
      from: 0, to: 0, text: src,
      explanation: `${longParas} paragraph${longParas > 1 ? "s" : ""} over ${modeCfg.paragraphWords} words — advice, not an error.`,
    }));
  }
  if (modeCfg.maxParagraphs && paragraphs.length > modeCfg.maxParagraphs) {
    issues.push(makeIssue({
      ruleId: "message-paragraphs", category: "paragraph", severity: "info", confidence: "deterministic",
      from: 0, to: 0, text: src,
      explanation: `Document has ${paragraphs.length} paragraphs — consider shortening.`,
    }));
  }

  // character budget (limit-level, never disables copy/download)
  const charCount = countGraphemes(src);
  if (modeCfg.characterBudget && charCount > modeCfg.characterBudget) {
    issues.push(makeIssue({
      ruleId: "character-budget", category: "length", severity: "limit", confidence: "deterministic",
      from: 0, to: 0, text: src,
      explanation: `Over character budget (${charCount} / ${modeCfg.characterBudget}).`,
    }));
  }

  // email checks removed with the Email mode (single preset has no
  // greeting/sign-off/subject notes). `email` stays null for compatibility.
  const warnings = [];
  if (segmenterFallback || seg.usedFallback) warnings.push({ code: "segmenter-fallback", message: "Using fallback sentence segmenter (Intl.Segmenter unavailable)." });
  if (!englishAllowed) warnings.push({ code: "non-english", message: "Non-English input detected — English scores and word rules suppressed." });
  if (suppressed) warnings.push({ code: "small-sample", message: "Too little text for a steady estimate." });
  if (rawSmog != null && S < 30) warnings.push({ code: "smog-suppressed", message: "SMOG suppressed below 30 sentences (conservative product choice)." });

  const email = null;
  void subject; void emailReply; void mode;

  // reading time estimate
  const wpm = modeCfg.readingWpm || 200;
  const minutes = W / wpm;
  const readingTime = minutes < 1 ? "<1 min" : `${Math.max(1, Math.round(minutes))} min`;

  const final = dedupeSort(issues.filter((i) => !(i.from === 0 && i.to === 0) || ["paragraph-long", "message-paragraphs", "character-budget"].includes(i.ruleId)));

  return {
    metrics: {
      totalWords, eligibleWords: W, proseSentences: S,
      rawAri, rawFk, rawCl, rawSmog,
      grade: suppressed ? null : grade,
      gradeSuppressed: suppressed,
      provisionalGrade: grade,
      readingTime, charCount,
      language: lang,
    },
    sentences,
    issues: final,
    excludedRanges, headingRanges, quoteRanges,
    paragraphs: paraInfos.length,
    warnings,
    email,
    engineVersion: ENGINE_VERSION,
    configVersion: CONFIG_VERSION,
    config: modeCfg,
    textRevision: rev,
  };
}

function excludedFully(ranges, from, to) {
  if (from >= to) return true;
  // fully excluded if every char is inside some excluded range
  // approximate: sentence's word tokens all excluded AND no eligible tokens
  for (const r of ranges) {
    if (from >= r.from && to <= r.to) return true;
  }
  return false;
}

function preserveCase(orig, repl) {
  if (!orig || !repl) return repl;
  if (orig[0] === orig[0].toUpperCase()) return repl[0].toUpperCase() + repl.slice(1);
  return repl;
}

// Very small heuristic language gate. Never claimed exact.
// Suppresses English rules only for clearly non-English input.
function detectLanguage(src, eligibleTokens) {
  if (!src.trim()) return { code: "unknown", englishLikely: true };
  const scriptRanges = /[\u0900-\u097F\u3040-\u30FF\u4E00-\u9FFF\uAC00-\uD7AF\u0600-\u06FF\u0400-\u04FF\u0370-\u03FF\u0590-\u05FF\u0E00-\u0E7F]/g;
  const scriptHits = (src.match(scriptRanges) || []).length;
  const totalChars = Array.from(src).length || 1;
  if (scriptHits / totalChars > 0.3) {
    return { code: "non-en", englishLikely: false, detail: "non-Latin script majority" };
  }
  // Latin-script text: only suppress when there is positive non-English
  // evidence (non-ASCII Latin letters) AND no common English words in a
  // reasonable sample. Pure-ASCII text (word lists, repetitions, proper
  // nouns) stays English-analyzed to avoid false suppression.
  const nonAsciiLatin = (src.match(/[à-ÿā-žñçßøåæœ]/gi) || []).length;
  const words = eligibleTokens.map((t) => t.text.toLowerCase());
  const common = new Set(["the", "a", "and", "of", "to", "in", "is", "it", "you", "that", "for", "on", "with"]);
  const hits = words.filter((w) => common.has(w)).length;
  if (words.length >= 20 && hits === 0 && nonAsciiLatin > words.length * 0.2) {
    return { code: "non-en?", englishLikely: false, detail: "non-English Latin diacritics without English function words" };
  }
  return { code: "en", englishLikely: true };
}

export { detectLanguage };
