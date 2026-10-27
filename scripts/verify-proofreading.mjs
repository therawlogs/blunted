// Cold-profile offline spelling/grammar UI verification with synthetic writing.
// Usage: node scripts/verify-proofreading.mjs /absolute/path/to/chromium [evidence-directory]
// Requires Node 22+ for the built-in WebSocket client.
// Requires Node 22+. Browser networking is disabled before the first app load.
import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir, platform, release, cpus, totalmem } from 'node:os';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const executable = process.argv[2];
if (typeof WebSocket !== 'function') throw new Error('This measurement harness requires Node 22+ (built-in WebSocket).');
if (!executable || !existsSync(executable)) throw new Error('Pass an existing Chromium executable path.');
const fixture = mkdtempSync(join(tmpdir(), 'blunted-proofreading-'));
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
  const evidence = resolve(process.argv[3] || 'docs/evidence/offline-proofreading-2026-10-27');
  mkdirSync(evidence, {recursive: true});
  const report = {at: new Date().toISOString(), builtHtmlSha256: createHash('sha256').update(readFileSync(html)).digest('hex'), builtHtmlBytes: readFileSync(html).length, checks: {}, network: [], limits: 'Fresh headless Chromium profile on this development Mac; synthetic writing. Not native WKWebView, Windows or clean-machine acceptance.'};
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Network.requestWillBeSent') {
      const url = message.params.request.url;
      report.network.push(url.startsWith('data:') ? 'data:embedded' : url.startsWith('file:') ? 'file:disposable-app' : url.startsWith('blob:') ? 'blob:packaged-worker' : url);
    }
  });
  const waitFor = async expression => {
    for (let i = 0; i < 250; i++) { if (await evaluate(expression)) return; await delay(100); }
    throw new Error('Timed out: ' + expression);
  };
  const click = async selector => {
    const rect = await evaluate(`(() => {const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing control');e.scrollIntoView({block:'nearest'});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};})()`);
    await cdp('Input.dispatchMouseEvent', {type:'mousePressed',button:'left',clickCount:1,...rect});
    await cdp('Input.dispatchMouseEvent', {type:'mouseReleased',button:'left',clickCount:1,...rect});
  };
  const body = () => evaluate('document.getElementById("editor").value');
  const setBody = async text => {
    await evaluate(`(() => {const e=document.getElementById('editor');e.value=${JSON.stringify(text)};e.dispatchEvent(new Event('input',{bubbles:true}));e.focus();e.setSelectionRange(0,0);})()`);
    await waitFor('document.getElementById("proofreadingStatus").textContent === "Spelling and grammar checked offline."');
  };
  const screenshot = async name => { const result = await cdp('Page.captureScreenshot', {format:'png'}); writeFileSync(join(evidence, name), Buffer.from(result.data, 'base64')); };
  await cdp('Page.enable'); await cdp('Network.enable');
  await cdp('Network.emulateNetworkConditions', {offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
  await cdp('Network.setBlockedURLs', {urls:['http://*','https://*','ws://*','wss://*']});
  await cdp('Page.navigate', {url:pathToFileURL(html).href});
  await waitFor('!!(window.BluntedProofreader && document.getElementById("editor") && !document.getElementById("editor").disabled)');
  await click('#viewReview');
  for (const [name, original, expected] of [
    ['spelling', 'I recieve the package.', 'I receive the package.'],
    ['agreement', 'She go home.', 'She goes home.'],
    ['article', 'This is a example.', 'This is an example.'],
    ['punctuation', 'Hello,world.', 'Hello, world.'],
    ['markdown', 'This is **a example**.', 'This is **an example**.'],
    ['unicode', '😀 I recieve the package.', '😀 I receive the package.'],
  ]) {
    await setBody(original);
    const preview = await evaluate('Array.from(document.querySelectorAll(".correction-preview pre"), e=>e.textContent)');
    if (preview.length !== 2) throw new Error('Missing preview: ' + name);
    await screenshot(name + '-preview.png'); await click('#applyNote');
    if (await body() !== expected) throw new Error('Incorrect Apply: ' + name + ': ' + await body());
    await cdp('Input.dispatchKeyEvent', {type:'keyDown',key:'z',code:'KeyZ',commands:['undo']});
    await cdp('Input.dispatchKeyEvent', {type:'keyUp',key:'z',code:'KeyZ'});
    if (await body() !== original) throw new Error('One-step Undo failed: ' + name);
    report.checks[name] = {preview,applied:expected,oneStepUndo:true};
  }
  await setBody('I recieve the package.');
  const selected = await evaluate(`(() => {const s=document.getElementById('correctionChoice');s.value=s.options[1].value;s.dispatchEvent(new Event('change',{bubbles:true}));return s.value;})()`);
  if (!await evaluate(`document.querySelectorAll('.correction-preview pre')[1].textContent===${JSON.stringify(selected)}`)) throw new Error('Alternative preview did not update');
  await click('#applyNote'); if (await body() !== 'I ' + selected + ' the package.') throw new Error('Alternative Apply mismatch');
  report.checks.alternatives = {selected,applied:await body()};
  await setBody('We discuss quuxblunted today.');
  const keep = await evaluate(`(() => {const e=Array.from(document.querySelectorAll('#issues button')).find(e=>e.textContent==='Keep this word');e.id='testKeepWord';return !!e;})()`);
  if (!keep) throw new Error('Missing Keep this word'); await click('#testKeepWord');
  await waitFor('document.getElementById("proofreadingStatus").textContent === "Spelling and grammar checked offline." && !document.getElementById("applyNote")');
  if (await body() !== 'We discuss quuxblunted today.') throw new Error('Keep word changed prose');
  report.checks.keepWord = true;
  await setBody('The colour of the theatre is beautiful.');
  await evaluate('document.getElementById("openPreferences").click();document.getElementById("settingsReview").click()');
  await evaluate(`(() => {const s=document.getElementById('proofreadingDialect');s.value='british';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await waitFor('document.getElementById("proofreadingStatus").textContent === "Spelling and grammar checked offline." && !document.getElementById("applyNote")');
  await cdp('Emulation.setDeviceMetricsOverride', {width:375,height:900,deviceScaleFactor:1,mobile:false});
  report.checks.narrowSettings = await evaluate(`(() => {const d=document.getElementById('preferencesDialog'),p=document.getElementById('settingsReviewPanel');return{viewport:innerWidth,page:document.documentElement.scrollWidth,dialog:d.clientWidth,dialogScroll:d.scrollWidth,panel:p.clientWidth,panelScroll:p.scrollWidth};})()`);
  if (report.checks.narrowSettings.page > 375 || report.checks.narrowSettings.dialogScroll > report.checks.narrowSettings.dialog || report.checks.narrowSettings.panelScroll > report.checks.narrowSettings.panel) throw new Error('Narrow settings overflow');
  await screenshot('offline-settings-375.png');
  await delay(1000); await evaluate('window.__beforeProofReload=true'); await cdp('Page.reload');
  await waitFor('!window.__beforeProofReload && !!window.BluntedProofreader && document.getElementById("proofreadingDialect")?.value === "british" && document.getElementById("proofreadingStatus")?.textContent === "Spelling and grammar checked offline."');
  report.checks.dialectReload = 'british';
  await evaluate('window.__originalWorker=window.Worker;window.BluntedProofreader.reset();window.Worker=function(){throw Error("Injected unavailable Worker")};');
  await evaluate('document.getElementById("editor").value="I recieve it.";document.getElementById("editor").dispatchEvent(new Event("input",{bubbles:true}))');
  await waitFor('document.getElementById("proofreadingStatus").textContent.includes("could not run")');
  if (await body() !== 'I recieve it.') throw new Error('Failure changed writing');
  await evaluate('window.Worker=window.__originalWorker'); await setBody('I receive it.'); report.checks.workerFailureAndRetry = true;
  if (report.network.some(url => /^https?:|^wss?:/.test(url))) throw new Error('Unexpected external request');
  report.networkDisabledBeforeFirstLoad = true;
  report.browser = await cdp('Browser.getVersion');
  writeFileSync(join(evidence, 'browser-offline.json'), JSON.stringify(report,null,2)+'\n');
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
} finally {
  socket?.close(); browser.kill('SIGTERM'); await delay(300); rmSync(fixture,{recursive:true,force:true});
}
