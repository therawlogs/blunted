// Sentence segmentation.
// Preferred: Intl.Segmenter('en',{granularity:'sentence'}) then tested
// protections for abbreviations / decimals / URLs / domains.
// Fallback: deterministic scanner with abbreviation list, initials, decimals,
// ellipses, closing quotes/parens, ?!, punctuation-free final fragments.
// Paragraph ends can close a prose fragment; empty lines are not sentences.

const ABBREVS = new Set([
  "dr", "mr", "mrs", "ms", "prof", "sr", "jr", "st", "vs", "etc", "approx",
  "no", "fig", "eq", "al", "us", "u.s",
  "e.g", "i.e", "eg", "ie",
]);

function protectSpans(text) {
  // returns array of [from,to) spans that must not split: decimals, urls, domains, emails
  const spans = [];
  const push = (from, to) => spans.push([from, to]);
  let m;
  const urlRe = /\b(?:https?:\/\/|www\.)[^\s]+/g;
  while ((m = urlRe.exec(text)) !== null) push(m.index, m.index + m[0].length);
  const numRe = /\b\d+\.\d+\b/g;
  while ((m = numRe.exec(text)) !== null) push(m.index, m.index + m[0].length);
  const emailRe = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
  while ((m = emailRe.exec(text)) !== null) push(m.index, m.index + m[0].length);
  // domain names like example.com inside prose
  const domRe = /\b[\w-]+\.(?:com|org|net|edu|gov|io|app|ai|in|uk|de|fr)\b/gi;
  while ((m = domRe.exec(text)) !== null) {
    // avoid double-adding inside url spans
    if (!spans.some(([a, b]) => m.index >= a && m.index < b)) push(m.index, m.index + m[0].length);
  }
  return spans;
}

function inSpans(spans, idx) {
  for (const [a, b] of spans) if (idx >= a && idx < b) return true;
  return false;
}

export function segmentSentences(text, opts = {}) {
  const forceFallback = !!opts.forceFallback;
  const hasSegmenter = typeof Intl !== "undefined" && Intl.Segmenter && !forceFallback;
  let raw;
  if (hasSegmenter) {
    try {
      raw = segmentWithIntl(text);
    } catch {
      raw = fallbackSegment(text);
    }
  } else {
    raw = fallbackSegment(text);
  }
  // post-process: merge fragments split on protected abbreviations
  const spans = protectSpans(text);
  const merged = [];
  for (const s of raw) {
    if (merged.length === 0) { merged.push({ ...s }); continue; }
    const prev = merged[merged.length - 1];
    if (shouldMerge(prev, s, text, spans)) {
      prev.to = s.to;
      prev.text = text.slice(prev.from, prev.to);
    } else merged.push({ ...s });
  }
  // drop whitespace-only / empty
  const out = merged
    .map((s) => ({ from: s.from, to: s.to, text: text.slice(s.from, s.to) }))
    .filter((s) => /[\p{L}\p{N}]/u.test(s.text));
  return { sentences: out, usedFallback: !hasSegmenter };
}

function segmentWithIntl(text) {
  const seg = new Intl.Segmenter("en", { granularity: "sentence" });
  const out = [];
  for (const s of seg.segment(text)) {
    out.push({ from: s.index, to: s.index + s.segment.length, text: s.segment });
  }
  // Intl keeps trailing spaces in segment; trim end but keep offsets for text
  return out.map((s) => {
    const trimmedEnd = s.text.replace(/\s+$/, "");
    return { from: s.from, to: s.from + trimmedEnd.length, text: trimmedEnd };
  }).filter((s) => s.text.length > 0);
}

function fallbackSegment(text) {
  const spans = protectSpans(text);
  const out = [];
  let start = 0;
  const n = text.length;
  let i = 0;
  const isBoundary = (idx) => {
    const c = text[idx];
    if (c !== "." && c !== "?" && c !== "!") return false;
    if (inSpans(spans, idx)) return false;
    // ellipses: only the last dot counts
    if (c === "." && (text[idx + 1] === "." )) return false;
    // decimal handled by spans; initials like J. K. — check single capital + dot + space + capital
    // look back for token before dot
    const before = text.slice(Math.max(0, idx - 12), idx);
    const wordM = before.match(/([A-Za-z][A-Za-z.]*)$/);
    if (wordM) {
      const word = wordM[1].replace(/\./g, "").toLowerCase();
      const withDots = wordM[1].toLowerCase();
      if (ABBREVS.has(word) || ABBREVS.has(withDots.replace(/\.+$/, ""))) {
        // abbreviation: boundary only if next non-space is end or starts new paragraph (blank line) or next char uppercase + long gap?
        // Conservative: do NOT split after e.g./i.e./Dr. unless followed by sentence end + capital AND not in abbrev list that rarely ends sentence.
        // Known sentence-enders that may also be abbrevs: etc., vs. — allow split if followed by capital or end.
        const rest = text.slice(idx + 1);
        const nm = rest.match(/^\s*["'”’)\]]*\s*([A-Z(])/);
        if (word === "etc" || word === "vs") {
          if (nm || /^\s*$/.test(rest)) return true;
          return false;
        }
        return false;
      }
      // single initial "J." followed by another initial or capital word: don't split
      if (/^[A-Z]$/.test(wordM[1]) || /^[A-Z]\.$/.test(wordM[1])) return false;
      // U.S. pattern: letter.dot.letter.dot — don't split mid-way
      if (/^[A-Za-z]\.[A-Za-z]$/.test(wordM[1])) return false;
    }
    return true;
  };
  while (i < n) {
    if (isBoundary(i)) {
      // consume closing quotes/parens/spaces
      let end = i + 1;
      while (end < n && /["'”’)\]]/.test(text[end])) end++;
      // paragraph break closes fragment
      const chunk = text.slice(start, end);
      if (/[\p{L}\p{N}]/u.test(chunk)) out.push({ from: start, to: end, text: chunk });
      // skip whitespace to next start
      let ns = end;
      while (ns < n && /[ \t]/.test(text[ns])) ns++;
      if (text[ns] === "\n") {
        while (ns < n && /\s/.test(text[ns])) ns++;
      }
      start = ns;
      i = ns;
      continue;
    }
    // blank line closes a punctuation-free fragment
    if (text[i] === "\n" && text[i + 1] === "\n") {
      const chunk = text.slice(start, i);
      if (/[\p{L}\p{N}]/u.test(chunk)) out.push({ from: start, to: i, text: chunk });
      let ns = i;
      while (ns < n && /\s/.test(text[ns])) ns++;
      start = ns;
      i = ns;
      continue;
    }
    i++;
  }
  const tail = text.slice(start);
  if (/[\p{L}\p{N}]/u.test(tail)) out.push({ from: start, to: n, text: tail });
  return out;
}

function shouldMerge(prev, cur, text, spans) {
  // if prev ends with a protected abbrev or inside protected span, merge
  const prevText = prev.text;
  const wordM = prevText.match(/([A-Za-z][A-Za-z.]*)\s*["'”’)\]]*\s*$/);
  if (wordM) {
    const w = wordM[1].replace(/\.+$/, "").toLowerCase();
    const dotted = wordM[1].toLowerCase().replace(/\.+$/, "");
    if (ABBREVS.has(w) || ABBREVS.has(dotted)) {
      if (w === "etc" || w === "vs") {
        // allow split when next starts with capital — already separated; keep split
        const first = (cur.text.match(/^\s*["'“‘(\[]*\s*([A-Za-z])/) || [])[1];
        if (first && first === first.toUpperCase()) return false;
        return true;
      }
      return true;
    }
    if (/^[a-z]\.[a-z]$/i.test(wordM[1].replace(/\s.*$/, ""))) return true; // U.S.
  }
  // boundary inside protected span
  if (inSpans(spans, prev.to - 1)) return true;
  return false;
}
