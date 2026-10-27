// Disposable Chromium typing measurement. No network, accounts or user library.
// Usage: node scripts/measure-typing.mjs /absolute/path/to/chromium [report.json]
// Requires Node 22+ for the built-in WebSocket client.
// Reports input-event-to-next-animation-frame latency, not native OS key latency.
import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir, platform, release, cpus, totalmem } from 'node:os';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const executable = process.argv[2];
if (typeof WebSocket !== 'function') throw new Error('This measurement harness requires Node 22+ (built-in WebSocket).');
if (!executable || !existsSync(executable)) throw new Error('Pass an existing Chromium executable path.');
const fixture = mkdtempSync(join(tmpdir(), 'blunted-typing-'));
const html = join(fixture, 'index.html');
execFileSync(process.execPath, ['scripts/build.mjs', '--out', html], { stdio: 'ignore' });
const browser = spawn(executable, ['--headless', '--no-sandbox', '--no-first-run', '--disable-background-networking', '--disable-sync', '--disable-extensions', '--remote-debugging-port=0', '--window-size=1360,900', '--user-data-dir=' + join(fixture, 'profile'), 'about:blank'], { stdio: 'ignore' });
let socket;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
try {
  const portFile = join(fixture, 'profile', 'DevToolsActivePort');
  for (let i = 0; !existsSync(portFile) && i < 100; i++) await delay(100);
  if (!existsSync(portFile)) throw new Error('Chromium did not expose its disposable debugging port.');
  const port = readFileSync(portFile, 'utf8').split('\n')[0];
  const targets = await (await fetch('http://127.0.0.1:' + port + '/json')).json();
  socket = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let nextId = 0;
  const pending = new Map();
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (!message.id) return;
    const callback = pending.get(message.id);
    if (!callback) return;
    pending.delete(message.id);
    clearTimeout(callback.timer);
    message.error ? callback.reject(new Error(JSON.stringify(message.error))) : callback.resolve(message.result);
  };
  const cdp = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextId;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, 10000);
    pending.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const result = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  await cdp('Page.enable');
  await cdp('Page.navigate', { url: pathToFileURL(html).href });
  for (let i = 0; i < 100 && !await evaluate('!!(document.getElementById("editor") && window.BluntedEngine)'); i++) await delay(100);
  await delay(500); // startup analysis and initial storage read
  await evaluate(`(() => {
    const editor = document.getElementById('editor');
    window.typingSamples = [];
    editor.addEventListener('beforeinput', () => {
      const start = performance.now();
      window.nextTypingFrame = new Promise(resolve => requestAnimationFrame(() => {
        const latency = performance.now() - start;
        window.typingSamples.push(latency); resolve(latency);
      }));
    }, true);
  })()`);
  const results = [];
  for (const words of [1000, 5000, 20000]) {
    const sentence = 'The local library helps a writer develop a clear article with useful headings and careful examples. ';
    const vocabulary = sentence.trim().split(/\s+/);
    const articleWords = Array.from({ length: words }, (_, i) => vocabulary[i % vocabulary.length]);
    const paragraphs = [];
    for (let i = 0; i < articleWords.length; i += 100) paragraphs.push(articleWords.slice(i, i + 100).join(' '));
    const prose = paragraphs.join('\n\n');
    await evaluate(`(() => { const e = document.getElementById('editor'); e.value = ${JSON.stringify(prose)}; e.dispatchEvent(new Event('input', { bubbles: true })); e.focus(); e.setSelectionRange(e.value.length, e.value.length); window.typingSamples = []; })()`);
    // Include the bundled offline grammar engine, including its cold setup.
    for (let attempt = 0; attempt < 300; attempt++) {
      if (await evaluate('document.getElementById("proofreadingStatus").textContent.includes("checked offline.")')) break;
      if (attempt === 299) throw new Error('Offline proofreading did not settle before measurement.');
      await delay(100);
    }
    for (let i = 0; i < 40; i++) {
      await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'a', code: 'KeyA', text: 'a', unmodifiedText: 'a' });
      await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'a', code: 'KeyA' });
      await evaluate('window.nextTypingFrame');
      await delay(100); // analysis remains enabled while typing at a fixed cadence
      if (i % 10 === 9) await delay(250); // let analysis run between short bursts
    }
    const samples = await evaluate('window.typingSamples');
    if (samples.length !== 40) throw new Error('Expected 40 real Chromium input events, received ' + samples.length);
    const sorted = [...samples].sort((a, b) => a - b);
    results.push({ initialWords: words, samples: samples.length, p50Ms: sorted[19], p95Ms: sorted[37], maxMs: sorted[39], rawMs: samples });
  }
  const report = {
    measuredAt: new Date().toISOString(), sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    builtHtmlSha256: createHash('sha256').update(readFileSync(html)).digest('hex'),
    workingTreeDiffSha256: execFileSync('sh', ['-c', 'git diff -- src scripts/build.mjs | shasum -a 256'], { encoding: 'utf8' }).trim().split(' ')[0],
    environment: { platform: platform(), kernel: release(), cpu: cpus()[0]?.model, logicalCpus: cpus().length, memoryBytes: totalmem(), node: process.version, browser: await cdp('Browser.getVersion'), viewport: await evaluate('({width: innerWidth, height: innerHeight, devicePixelRatio})') },
    method: 'Fresh disposable Chromium headless profile; portable build; Write view; bundled Harper spelling/grammar and autosave enabled; 100-word paragraphs; 40 CDP keydown/keyup pairs per document at >=100ms cadence plus 250ms pauses every ten events so analysis runs between bursts. Capture beforeinput to next requestAnimationFrame. Startup/document analysis settles before each run.',
    limits: 'Single development Mac/browser measurement. Not native key-to-photon latency, human IME, installed WebKit, Windows, representative-hardware acceptance or a product pass/fail threshold.',
    results
  };
  const json = JSON.stringify(report, null, 2) + '\n';
  if (process.argv[3]) writeFileSync(resolve(process.argv[3]), json);
  process.stdout.write(json);
} finally {
  socket?.close();
  browser.kill('SIGTERM');
  await delay(300);
  rmSync(fixture, { recursive: true, force: true });
}
