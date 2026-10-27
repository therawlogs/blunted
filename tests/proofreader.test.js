import {test} from 'node:test';
import assert from 'node:assert/strict';
import {checkEnglish} from '../src/proofreader/engine.js';
import {correctionForIssue} from '../src/writer/article.js';

test('bundled engine supplies spelling alternatives, grammar and article corrections', async () => {
  const text = 'I recieve teh package. She go home. This is a example.';
  const issues = await checkEnglish({text});
  for (const [original, replacement, category] of [['recieve', 'receive', 'spelling'], ['teh', 'the', 'spelling'], ['go', 'goes', 'grammar'], ['a', 'an', 'grammar']]) {
    const issue = issues.find(i => i.exactText === original);
    assert.ok(issue, original); assert.equal(issue.fix.replacement, replacement); assert.equal(issue.category, category);
  }
  assert.ok(issues.find(i => i.exactText === 'recieve').fix.replacements.length > 1);
});

test('UTF-16 offsets after emoji, combining marks and CRLF target exact original text', async () => {
  const text = '😀 🐦 Cafe\u0301.\r\nI recieve teh package. She go home.';
  const issues = await checkEnglish({text});
  assert.ok(issues.some(i => i.exactText === 'recieve'));
  for (const issue of issues) {
    assert.equal(text.slice(issue.from, issue.to), issue.exactText);
    const edit = correctionForIssue(text, issue); if (!edit) continue;
    assert.equal(edit.expectedText, text.slice(edit.from, edit.to));
  }
  assert.equal(issues.find(i => i.exactText === 'recieve').from, text.indexOf('recieve'));
});

test('Markdown metadata, code, links and quotes remain untouched; prose markup is preserved', async () => {
  const text = '---\ntitle: recieve teh\n---\n\nThis is **a example**. I recieve it.\n\n`recieve teh`\n\n```js\nconst recieve = "teh";\n```\n\n[Correct link](https://recieve.test/teh)\n\n> I recieve teh package.';
  const issues = await checkEnglish({text});
  assert.equal(issues.filter(i => i.exactText === 'recieve').length, 1);
  assert.ok(issues.every(i => i.from >= text.indexOf('This is') && i.to <= text.indexOf('`recieve')));
  const issue = issues.find(i => i.ruleId === 'harper:AnA'), edit = correctionForIssue(text, issue);
  const corrected = text.slice(0, edit.from) + edit.replacement + text.slice(edit.to);
  assert.ok(corrected.includes('**an example**'));
  assert.ok(corrected.includes('const recieve = "teh";'));
  assert.ok(corrected.includes('https://recieve.test/teh'));
});

test('quote checking is explicit and custom words do not leak between articles', async () => {
  const quoted = '> I recieve teh package.';
  assert.deepEqual(await checkEnglish({text: quoted}), []);
  assert.ok((await checkEnglish({text: quoted, includeQuotes: true})).some(i => i.exactText === 'recieve'));
  const text = 'We discuss quuxblunted today.';
  assert.ok((await checkEnglish({text})).some(i => i.exactText === 'quuxblunted'));
  assert.ok(!(await checkEnglish({text, personalWords: ['quuxblunted']})).some(i => i.exactText === 'quuxblunted'));
  assert.ok((await checkEnglish({text})).some(i => i.exactText === 'quuxblunted'));
});

test('English dialect changes are local and spelling/grammar can be disabled separately', async () => {
  const text = 'The colour of the theatre is beautiful.';
  assert.ok((await checkEnglish({text, dialect: 'american'})).some(i => i.exactText === 'colour'));
  assert.ok(!(await checkEnglish({text, dialect: 'british'})).some(i => i.exactText === 'colour'));
  const mistakes = 'I recieve teh package. She go home. This is a example.';
  const spelling = await checkEnglish({text: mistakes, grammar: false});
  assert.ok(spelling.length); assert.ok(spelling.every(i => i.category === 'spelling'));
  const grammar = await checkEnglish({text: mistakes, spelling: false});
  assert.ok(grammar.length); assert.ok(grammar.every(i => i.category === 'grammar'));
  assert.deepEqual(await checkEnglish({text: mistakes, spelling: false, grammar: false}), []);
});

test('ignored terms and rules suppress only matching findings', async () => {
  const issues = await checkEnglish({text: 'I recieve teh package. She go home.', ignoredTerms: ['recieve'], ignoredRuleIds: ['harper:The']});
  assert.ok(!issues.some(i => i.exactText === 'recieve' || i.exactText === 'teh'));
  assert.ok(issues.some(i => i.exactText === 'go'));
});

test('punctuation insertion is presented as a guarded replacement', async () => {
  const text = 'Hello,world. This is a example.';
  const issues = await checkEnglish({text});
  for (const issue of issues) {
    const edit = correctionForIssue(text, issue);
    if (edit) assert.equal(text.slice(edit.from, edit.to), edit.expectedText);
  }
  const comma = issues.find(i => i.ruleId === 'harper:CommaFixes'); assert.ok(comma);
  const edit = correctionForIssue(text, comma);
  assert.equal(text.slice(0, edit.from) + edit.replacement + text.slice(edit.to), 'Hello, world. This is a example.');
  assert.equal(comma.fix.consumeAdjacentSpace, false);
});
