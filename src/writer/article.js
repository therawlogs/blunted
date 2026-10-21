// Pure article tools. Source offsets are UTF-16, matching textarea selections.
export function articleBlocks(text) {
  const blocks = [];
  const lines = Array.from(text.matchAll(/[^\n]*(?:\n|$)/g)).filter(m => m[0]);
  let fence = null, code = null, frontmatter = false;
  for (const m of lines) {
    const line = m[0].replace(/\n$/, ''), from = m.index, to = from + line.length;
    if (from === 0 && line === '---') { frontmatter = true; continue; }
    if (frontmatter) { if (line === '---') frontmatter = false; continue; }
    const f = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (f && !fence) { fence = f[1]; code = { type: 'code', text: '', from, to }; blocks.push(code); continue; }
    if (fence) {
      code.to = to;
      if (f && f[1][0] === fence[0] && f[1].length >= fence.length && !f[2].trim()) fence = null;
      else code.text += line + '\n';
      continue;
    }
    if (!line.trim()) continue;
    const h = line.match(/^ {0,3}(#{1,6})[ \t]+(.+?)(?:[ \t]+#+[ \t]*)?$/);
    if (h) { blocks.push({ type: 'heading', level: h[1].length, text: h[2].trim(), from, to }); continue; }
    // Setext headings: reinterpret the preceding single paragraph.
    const prior = blocks[blocks.length - 1];
    if (/^ {0,3}(=+|-+)\s*$/.test(line) && prior && prior.type === 'paragraph' && prior.to + 1 === from && !prior.text.includes('\n')) {
      prior.type = 'heading'; prior.level = line.trim()[0] === '=' ? 1 : 2; prior.to = to; continue;
    }
    let type = 'paragraph', content = line;
    if (/^\s*>/.test(line)) { type = 'quote'; content = line.replace(/^\s*> ?/, ''); }
    else if (/^\s*(?:[-+*]|\d+[.)])\s+/.test(line)) { type = /^\s*\d/.test(line) ? 'ordered' : 'list'; content = line.replace(/^\s*(?:[-+*]|\d+[.)])\s+/, ''); }
    else if (/^(?: {4}|\t)/.test(line)) { type = 'code'; content = line.replace(/^(?: {4}|\t)/, ''); }
    if (prior && prior.type === type && ['paragraph', 'quote', 'code'].includes(type) && prior.to + 1 === from) {
      prior.text += '\n' + content; prior.to = to;
    } else blocks.push({ type, text: content, from, to, ...(type === 'ordered' ? {number: Number(line.match(/^\s*(\d+)/)[1])} : {}) });
  }
  return blocks;
}

export function structureReport(text, paragraphWords = 120, hasTitle = false) {
  const blocks = articleBlocks(text);
  const words = s => (s.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu) || []).length;
  const headings = blocks.filter(b => b.type === 'heading');
  const sections = [{ title: 'Opening', from: 0, to: headings[0]?.from ?? text.length, words: 0 }];
  headings.forEach((h, i) => sections.push({ title: h.text, from: h.from, to: headings[i + 1]?.from ?? text.length, words: 0 }));
  let si = 0;
  for (const b of blocks) {
    while (si + 1 < sections.length && b.from >= sections[si + 1].from) si++;
    if (!['heading', 'code'].includes(b.type)) sections[si].words += words(b.text);
  }
  const issues = [];
  function note(b, ruleId, explanation, prompt = false) {
    issues.push({ from: b.from, to: b.to, exactText: text.slice(b.from, b.to), category: 'structure', ruleId, severity: 'info', explanation, prompt });
  }
  let level = hasTitle ? 1 : 0;
  for (const b of blocks) {
    if (b.type === 'heading') {
      if (b.level > level + 1) note(b, 'heading-gap', `Heading level ${b.level} skips level ${level + 1}. Consider a consistent hierarchy.`);
      level = b.level;
    }
    if (b.type === 'paragraph' && words(b.text) > paragraphWords) note(b, 'long-paragraph', `This paragraph has ${words(b.text)} words (profile threshold: ${paragraphWords}). Consider a break where the idea changes.`);
  }
  const first = blocks.find(b => b.type === 'paragraph');
  if (first) note(first, 'opening-prompt', 'Self-review prompt: does this opening tell your intended reader what the article will explore? This is a question, not a detected problem.', true);
  issues.sort((a,b) => a.from - b.from || a.to - b.to);
  return { headings, sections: sections.filter(s => s.words || s.title !== 'Opening'), issues };
}

export function dismissalKey(issue, text) {
  const start = text.lastIndexOf('\n\n', Math.max(0, issue.from - 1)) + 2;
  const end = text.indexOf('\n\n', issue.to);
  return JSON.stringify([issue.ruleId || issue.category, text.slice(Math.max(0, start === 1 ? 0 : start), end < 0 ? text.length : end), issue.exactText, issue.explanation]);
}

export function validateLibraryBackup(value) {
  if (!value || value.app !== 'blunted-library' || value.version !== 1 || !Array.isArray(value.articles)) throw new Error('Not a supported blunted library backup.');
  const ids = new Set();
  for (const a of value.articles) {
    if (!a || typeof a.id !== 'string' || !/^[a-zA-Z0-9-]{1,100}$/.test(a.id) || ids.has(a.id) || typeof a.body !== 'string' || typeof a.title !== 'string' || typeof a.createdAt !== 'string' || typeof a.updatedAt !== 'string' || (a.trashedAt != null && typeof a.trashedAt !== 'string')) throw new Error('Backup contains an invalid or duplicate article. Nothing was imported.');
    ids.add(a.id);
  }
  return value.articles;
}

// The headline is article prose, never YAML/application metadata.
export function exportArticle(title, body, {headline = true, markdown = true} = {}) {
  const clean = String(title || '').replace(/[\r\n]+/g, ' ').trim();
  const first = articleBlocks(String(body))[0];
  if (!headline || !clean || (first?.type === 'heading' && first.level === 1 && first.text === clean)) return String(body);
  return (markdown ? '# ' : '') + clean + '\n\n' + String(body);
}
