// Grapheme counting: Intl.Segmenter where available, else code-point fallback.
// string.length counts UTF-16 units — never use it for display budgets.
export function countGraphemes(s) {
  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    try {
      const seg = new Intl.Segmenter("en", { granularity: "grapheme" });
      let n = 0;
      for (const _ of seg.segment(s)) n++;
      return n;
    } catch { /* fall through */ }
  }
  return Array.from(s).length;
}

export function sliceGraphemes(s, max) {
  if (Array.from(s).length <= max) return s;
  return Array.from(s).slice(0, max).join("");
}
