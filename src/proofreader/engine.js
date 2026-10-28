// Harper runs inside our dedicated worker. Its complete WASM/dictionary payload
// is embedded in the generated HTML; this module never contacts a service.
import {LocalLinter, Dialect, SuggestionKind} from 'harper.js';
import {binaryInlined} from 'harper.js/binaryInlined';
import {scanDocument} from '../engine/markdown.js';

export const DIALECTS = {american: Dialect.American, british: Dialect.British, australian: Dialect.Australian, canadian: Dialect.Canadian, indian: Dialect.Indian};
const CORRECTNESS = new Set(['Agreement', 'BoundaryError', 'Capitalization', 'Eggcorn', 'Formatting', 'Grammar', 'Malapropism', 'Miscellaneous', 'Nonstandard', 'Punctuation', 'Regionalism', 'Repetition', 'Spelling', 'Typo', 'Usage', 'WordOrder']);
let ready, dictionaryKey, activeDialect;

async function getLinter() {
  if (!ready) ready = (async () => {
    const linter = new LocalLinter({binary: binaryInlined, dialect: Dialect.American});
    await linter.setup();
    return linter;
  })().catch(error => { ready = null; dictionaryKey = activeDialect = undefined; throw error; });
  return ready;
}

export async function checkEnglish({text = '', dialect = 'american', spelling = true, grammar = true, personalWords = [], ignoredTerms = [], ignoredRuleIds = [], includeQuotes = false} = {}) {
  if (!spelling && !grammar || !text.trim()) return [];
  const linter = await getLinter();
  const nextDialect = DIALECTS[dialect] ?? Dialect.American;
  if (activeDialect !== nextDialect) {
    await linter.setDialect(nextDialect); activeDialect = nextDialect;
    dictionaryKey = undefined; // Harper rebuilds its dictionary when dialect changes.
  }
  const ignored = new Set([...personalWords, ...ignoredTerms].map(word => String(word).toLowerCase()));
  const words = [...ignored].filter(word => /^[\p{L}]+(?:['’][\p{L}]+)*$/u.test(word)).sort();
  const nextDictionaryKey = JSON.stringify(words);
  if (dictionaryKey !== nextDictionaryKey) {
    await linter.clearWords(); await linter.importWords(words); dictionaryKey = nextDictionaryKey;
  }
  const {excludedRanges, quoteRanges} = scanDocument(text);
  const protectedRanges = excludedRanges.filter(range => !['heading', 'heading-underline'].includes(range.kind));
  if (!includeQuotes) protectedRanges.push(...quoteRanges);
  const overlaps = (from, to) => protectedRanges.some(range => from < range.to && to > range.from);
  const disabled = new Set(ignoredRuleIds);
  // The UI already gates non-English documents. Harper's experimental language
  // isolation can suppress misspellings precisely when a short sentence has typos.
  const groups = await linter.organizedLints(text, {language: 'markdown', isolateEnglish: false});
  const issues = [];
  for (const [rule, lints] of Object.entries(groups)) for (const lint of lints) {
    let span, suggestions = [];
    try {
      const kind = lint.lint_kind();
      const isSpelling = kind === 'Spelling' || kind === 'Typo';
      if (!CORRECTNESS.has(kind) || !(isSpelling ? spelling : grammar) || disabled.has('harper:' + rule)) continue;
      span = lint.span();
      // Pinned harper.js 3.0.0 exposes UTF-16 spans (the Rust core uses scalar
      // offsets). Verify the exact source slice before exposing any edit.
      const from = span.start, to = span.end;
      if (!Number.isInteger(from) || !Number.isInteger(to) || from >= to || overlaps(from, to)) continue;
      const exactText = text.slice(from, to);
      if (ignored.has(exactText.toLowerCase()) || exactText !== lint.get_problem_text()) continue;
      suggestions = lint.suggestions();
      const replacements = [...new Set(suggestions.map(suggestion => {
        const replacement = suggestion.get_replacement_text();
        return suggestion.kind() === SuggestionKind.InsertAfter ? exactText + replacement : replacement;
      }))].filter(replacement => replacement !== exactText);
      issues.push({
        id: `harper:${rule}@${from}-${to}`, ruleId: 'harper:' + rule,
        category: isSpelling ? 'spelling' : 'grammar', severity: 'review', confidence: 'heuristic',
        from, to, exactText, explanation: lint.message(), source: 'Harper 3.0.0',
        fix: replacements.length ? {replacement: replacements[0], replacements, consumeAdjacentSpace: false} : null,
      });
    } finally {
      for (const suggestion of suggestions) suggestion.free();
      if (span) span.free();
      lint.free();
    }
  }
  return issues.sort((a, b) => a.from - b.from || a.to - b.to);
}
