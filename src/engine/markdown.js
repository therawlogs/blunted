// Markdown scope scanner — documented small scanner, NOT full CommonMark.
// Never deletes text or changes length; returns offset ranges into original string.
// Offsets are half-open UTF-16 indices matching textarea selectionStart/End.

export function scanDocument(text) {
  const excluded = []; // {from,to,kind}
  const headings = [];
  const quotes = [];
  const n = text.length;

  const push = (from, to, kind) => {
    if (to > from) excluded.push({ from, to, kind });
  };

  // 1. YAML frontmatter at document start: ---\n...\n--- (or ...\n)
  if (text.startsWith("---\n") || text.startsWith("---\r\n")) {
    const m = text.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n(---|\.\.\.)[ \t]*(\r?\n|$)/);
    if (m && m[0]) push(0, m[0].length, "frontmatter");
  }

  // 2. Fenced code blocks (``` and ~~~), info strings included.
  const fenceRe = /(^|\n)(`{3,}|~{3,})[^\n]*\n[\s\S]*?\n\2[ \t]*(?=\n|$)/g;
  let m;
  while ((m = fenceRe.exec(text)) !== null) {
    const start = m.index + (m[1] ? m[1].length : 0);
    push(start, start + m[0].length - (m[1] ? m[1].length : 0), "fenced-code");
  }

  // 3. Inline code spans (`code`), simple single-line matcher.
  const inlineRe = /`[^`\n]+`/g;
  while ((m = inlineRe.exec(text)) !== null) {
    if (!isInside(text, excluded, m.index)) push(m.index, m.index + m[0].length, "inline-code");
  }

  // helper: line-based scan for headings, quotes, refs, html blocks
  const lines = [];
  {
    let pos = 0;
    for (const part of text.split(/(?<=\n)/)) {
      lines.push({ start: pos, text: part });
      pos += part.length;
    }
  }

  for (const { start, text: line } of lines) {
    const stripped = line.replace(/\n$/, "");
    // ATX headings: # .. ######
    const hm = stripped.match(/^\s{0,3}#{1,6}\s+\S/);
    if (hm && !isInside(text, excluded, start)) {
      headings.push({ from: start, to: start + line.length, kind: "heading" });
      push(start, start + line.length, "heading");
      continue;
    }
    // Setext underline (=== / ---) — mark underline only
    if (/^\s{0,3}(=+|-+)\s*$/.test(stripped) && stripped.trim().length > 0) {
      if (!isInside(text, excluded, start)) push(start, start + line.length, "heading-underline");
      continue;
    }
    // Block quotes: lines starting with optional spaces + >
    if (/^\s{0,3}>\s?/.test(stripped)) {
      quotes.push({ from: start, to: start + line.length, kind: "quote" });
      // Quotes are visible but stylistic rules off by default (config excludeQuotes).
      // We record the range; analyze() decides whether to suppress rule issues there.
      continue;
    }
    // Reference definitions: [label]: url "title"
    if (/^\s{0,3}\[[^\]]+\]:\s*\S/.test(stripped)) {
      if (!isInside(text, excluded, start)) push(start, start + line.length, "ref-def");
      continue;
    }
    // HTML tags: exclude tag spans <...>, keep inner text eligible.
    const tagRe = /<[^<>\n]+>/g;
    let tm;
    while ((tm = tagRe.exec(line)) !== null) {
      const a = start + tm.index, b = a + tm[0].length;
      if (!isInside(text, excluded, a)) push(a, b, "html-tag");
    }
  }

  // 4. Links: [label](destination) — exclude destination, keep label.
  // Must run after fenced/inline exclusion check per-match.
  const linkRe = /\[([^\]\n]*)\]\(([^)\n]*)\)/g;
  while ((m = linkRe.exec(text)) !== null) {
    if (isInside(text, excluded, m.index)) continue;
    const full = m[0];
    const labelStart = m.index + 1;
    const parenIdx = m.index + full.indexOf("](");
    const destStart = parenIdx + 2;
    const destEnd = m.index + full.length - 1;
    push(destStart, destEnd, "link-destination");
    void labelStart;
  }
  // Images: ![alt](src) — same handling (alt stays, src excluded)
  // covered by linkRe above since ![...](...) contains [...](...).

  // 5. Bare URLs: https?://... and www....
  const urlRe = /\b(?:https?:\/\/|www\.)[^\s<>\]\)`]+/g;
  while ((m = urlRe.exec(text)) !== null) {
    if (!isInside(text, excluded, m.index)) push(m.index, m.index + m[0].length, "url");
  }
  // Autolinks <https://...>
  const autoRe = /<(https?:\/\/[^<>\s]+)>/g;
  while ((m = autoRe.exec(text)) !== null) {
    if (isInside(text, excluded, m.index)) continue;
    push(m.index, m.index + 1, "html-tag");
    push(m.index + m[0].length - 1, m.index + m[0].length, "html-tag");
  }

  excluded.sort((a, b) => a.from - b.from || a.to - b.to);
  return { excludedRanges: mergeRanges(excluded), headingRanges: headings, quoteRanges: quotes };
}

function isInside(text, ranges, idx) {
  for (const r of ranges) if (idx >= r.from && idx < r.to) return true;
  return false;
}

export function isExcluded(ranges, from, to) {
  for (const r of ranges) {
    if (from < r.to && to > r.from) return true;
  }
  return false;
}

export function rangeOverlap(ranges, from, to) {
  for (const r of ranges) {
    if (from < r.to && to > r.from) return r;
  }
  return null;
}

function mergeRanges(ranges) {
  if (!ranges.length) return ranges;
  const out = [ranges[0]];
  for (let i = 1; i < ranges.length; i++) {
    const last = out[out.length - 1];
    const cur = ranges[i];
    if (cur.from <= last.to) {
      last.to = Math.max(last.to, cur.to);
    } else out.push({ ...cur });
  }
  return out;
}
