// Shared rule helpers: offset-safe matching, dedupe, sort.
export function makeIssue({ ruleId, category, severity = "review", confidence = "heuristic", from, to, text, explanation, alternatives = [], fix = null }) {
  return {
    id: `${ruleId}@${from}-${to}`,
    ruleId, category, severity, confidence, from, to,
    exactText: text.slice(from, to),
    explanation, alternatives, fix,
  };
}

export function dedupeSort(issues) {
  const seen = new Set();
  const out = [];
  for (const i of issues) {
    const k = `${i.ruleId}:${i.from}:${i.to}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(i);
  }
  out.sort((a, b) => a.from - b.from || severityRank(a.severity) - severityRank(b.severity));
  return out;
}

function severityRank(s) {
  return s === "limit" ? 0 : s === "review" ? 1 : 2;
}

// Find all case-insensitive matches of phrases with word boundaries, UTF-16 offsets.
export function findPhrases(text, phrases, { from = 0, to = text.length } = {}) {
  const out = [];
  const lower = text.toLowerCase();
  for (const p of phrases) {
    const needle = p.toLowerCase();
    let idx = lower.indexOf(needle, from);
    while (idx !== -1 && idx + needle.length <= to) {
      const before = text[idx - 1];
      const after = text[idx + needle.length];
      const okB = idx === 0 || !/[\p{L}\p{N}]/u.test(before);
      const okA = idx + needle.length >= text.length || !/[\p{L}\p{N}]/u.test(after);
      if (okB && okA) out.push({ from: idx, to: idx + needle.length, match: text.slice(idx, idx + needle.length) });
      idx = lower.indexOf(needle, idx + 1);
    }
  }
  return out;
}

export function inRanges(ranges, from, to) {
  for (const r of ranges) if (from < r.to && to > r.from) return true;
  return false;
}
