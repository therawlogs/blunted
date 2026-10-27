import { test } from 'node:test';
import assert from 'node:assert/strict';
import { articleBlocks, structureReport, correctionForIssue, dismissalKey, validateLibraryBackup } from '../src/writer/article.js';
import { analyze } from '../src/engine/analyze.js';

test('structure preserves Unicode offsets and ignores headings in code, quotes and front matter', () => {
  const text = '---\ntitle: Hidden\n---\n# Café 🐦\n\nA first paragraph.\n\n```md\n### Not a heading\n```\n\n> ## Also not a heading\n\n### Next\n\nSecond paragraph.';
  const r = structureReport(text);
  assert.deepEqual(r.headings.map(h => h.text), ['Café 🐦', 'Next']);
  for (const i of r.issues) assert.equal(text.slice(i.from, i.to), i.exactText);
  assert.equal(r.issues.filter(i => i.ruleId === 'heading-gap').length, 1);
  assert.equal(r.sections[0].words, 7); // quoted prose counts toward section reading length
  assert.equal(r.sections[1].words, 2);
});
test('long paragraphs follow the profile threshold and prompts are explicitly labeled', () => {
  const text = '# Article\n\n' + 'word '.repeat(130);
  assert.equal(structureReport(text,120).issues.filter(i=>i.ruleId==='long-paragraph').length,1);
  assert.equal(structureReport(text,180).issues.filter(i=>i.ruleId==='long-paragraph').length,0);
  assert.match(structureReport(text).issues.find(i=>i.prompt).explanation,/Self-review prompt/);
});
test('paragraph-scoped dismissals survive unrelated edits and expire when their passage changes', () => {
  const text = 'First paragraph.\n\nIt is important to note that this is useful.\n\nLast paragraph.';
  const i = analyze({text}).issues.find(i=>i.category==='wordiness');
  assert.ok(i);
  const key = dismissalKey(i,text);
  const shifted = 'Extra words.\n\n' + text;
  const shiftedIssue = analyze({text:shifted}).issues.find(j=>j.ruleId===i.ruleId && j.exactText===i.exactText);
  assert.equal(dismissalKey(shiftedIssue,shifted),key);
  assert.notEqual(dismissalKey(i,text.replace('useful','necessary')),key);
});
test('Markdown blocks preserve lists, code, raw HTML and setext headings as data', () => {
  const r = articleBlocks('Title\n=====\n\n- café\n- 🐦\n\n~~~\n<img src="https://example.test/pixel">\n~~~\n\n<script>alert(1)</script>');
  assert.deepEqual(r.map(b=>b.type), ['heading','list','list','code','paragraph']);
  assert.match(r[3].text, /<img/);
  assert.match(r[4].text, /<script/);
});
test('backup validation rejects unsupported, malformed and duplicate articles before import', () => {
  const a = {id:'article-one',title:'Title',body:'Hello 🐦',createdAt:'today',updatedAt:'today'};
  const backup = {app:'blunted-library',version:1,articles:[a]};
  assert.deepEqual(validateLibraryBackup(backup),[a]);
  for(const invalid of [{...backup,version:2},{...backup,articles:[a,a]},{...backup,articles:[{...a,id:'../path'}]},{...backup,articles:[{...a,body:42}]}]) assert.throws(()=>validateLibraryBackup(invalid));
});
test('representative 1k, 5k and 20k articles retain exact review offsets', t => {
  for(const count of [1000,5000,20000]) {
    const paragraph = 'This article explains a useful method with concrete examples for readers. ';
    const text = '# Article\n\n' + Array.from({length:Math.ceil(count/110)},(_,i)=>'## Section '+i+'\n\n'+paragraph.repeat(10)).join('\n\n');
    const start = performance.now();
    const r = analyze({text}); const structure = structureReport(text);
    for(const i of [...r.issues,...structure.issues]) if(i.exactText) assert.equal(text.slice(i.from,i.to),i.exactText);
    t.diagnostic(`${count}-word target: ${r.metrics.totalWords} words analyzed in ${(performance.now()-start).toFixed(1)} ms (Node engine + structure, not a typing benchmark)`);
  }
});

test('a separate article title supplies the top heading level', () => {
 assert.equal(structureReport('## Section\n\nBody.',120,true).issues.filter(i=>i.ruleId==='heading-gap').length,0);
 assert.equal(structureReport('### Section\n\nBody.',120,true).issues.filter(i=>i.ruleId==='heading-gap').length,1);
});

test('ordered lists retain their source numbering',()=>{
 const blocks=articleBlocks('3. First finding\n4. Second finding\n9. Another finding');
 assert.deepEqual(blocks.map(b=>b.number),[3,4,9]);
});

test('heading corrections preserve Unicode, indentation, Markdown and CRLF', () => {
  for (const [text, expected] of [
    ['# Title\n\n  #### Café *birds* ###\n\nBody.', '  ## Café *birds* ###'],
    ['### First 🐦\r\n\r\nBody.', '# First 🐦\r'],
    ['Café *birds*\n  -----  \n\nBody.', 'Café *birds*\n  =====  ']
  ]) {
    const issue = structureReport(text).issues.find(i => i.ruleId === 'heading-gap');
    const edit = correctionForIssue(text, issue);
    assert.equal(edit.replacement, expected);
    const corrected = text.slice(0, edit.from) + edit.replacement + text.slice(edit.to);
    assert.equal(structureReport(corrected).issues.filter(i => i.ruleId === 'heading-gap').length, 0);
    assert.equal(corrected.slice(edit.from + edit.replacement.length), text.slice(edit.to));
  }
});

test('heading corrections respect a separate article title; judgment-based notes have no edits', () => {
  const text = '#### Section\n\n' + 'word '.repeat(130);
  const issues = structureReport(text, 120, true).issues;
  assert.equal(correctionForIssue(text, issues.find(i => i.ruleId === 'heading-gap')).replacement, '## Section');
  for (const issue of issues.filter(i => i.ruleId !== 'heading-gap')) assert.equal(correctionForIssue(text, issue), null);
});

test('shared correction rejects stale or malformed ranges and previews full deletions', () => {
  const text = 'We ran quickly today.';
  const issue = {from: 7, to: 14, exactText: 'quickly', fix: {replacement: ''}};
  assert.deepEqual(correctionForIssue(text, issue), {from: 7, to: 15, expectedText: 'quickly ', replacement: ''});
  for (const invalid of [{...issue, from: -1}, {...issue, to: 99}, {...issue, from: 7.5}, {...issue, exactText: 'slowly'}, {...issue, fix: {replacement: null}}, {...issue, to: 7}]) assert.equal(correctionForIssue(text, invalid), null);
  assert.equal(correctionForIssue('Different writing.', issue), null);
  assert.deepEqual(correctionForIssue(text, {...issue, fix: {replacement: '', consumeAdjacentSpace: false}}), {from: 7, to: 14, expectedText: 'quickly', replacement: ''});
});
test('article exports include the headline by default without application metadata',async()=>{
 const {exportArticle}=await import('../src/writer/article.js');
 assert.equal(exportArticle('A title','Body.'),'# A title\n\nBody.');
 assert.equal(exportArticle('A title','Body.',{markdown:false}),'A title\n\nBody.');
 assert.equal(exportArticle('A title','Body.',{headline:false}),'Body.');
 assert.equal(exportArticle('A title','# A title\n\nBody.'),'# A title\n\nBody.');
 assert.equal(exportArticle('A title','A title\n=======\n\nBody.'),'A title\n=======\n\nBody.');
});
