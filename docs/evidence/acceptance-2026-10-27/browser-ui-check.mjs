// Captured disposable Chromium UI-check script. Run from repository root with a Chromium executable argument.
import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir, platform, release, cpus, totalmem } from 'node:os';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const executable = process.argv[2];
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
  const report={at:new Date().toISOString(),checks:{},limits:'Isolated Chromium headless portable UI, not installed native or screen reader.'};
  const out=resolve('docs/evidence/acceptance-2026-10-27');
  const click=async selector=>{const p=await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};})()`);await cdp('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...p});await cdp('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...p});};
  const shot=async name=>writeFileSync(join(out,name),Buffer.from((await cdp('Page.captureScreenshot',{format:'png'})).data,'base64'));
  for(const [name,text,reviewer]of[['replacement','We utilize tools.','clarity'],['removal','We ran quickly today.','clarity'],['heading','#### Example\n\nA short paragraph.','structure']]){
    await evaluate(`(()=>{const e=document.getElementById('editor');e.value=${JSON.stringify(text)};e.dispatchEvent(new Event('input',{bubbles:true}));document.getElementById('reviewerSel').value=${JSON.stringify(reviewer)};document.getElementById('reviewerSel').dispatchEvent(new Event('change',{bubbles:true}));document.getElementById('viewReview').click();})()`);
    for(let i=0;i<40;i++){if(await evaluate('!!document.getElementById("applyNote")&&!document.getElementById("applyNote").disabled'))break;await delay(100);}
    const preview=await evaluate('Array.from(document.querySelectorAll(".correction-preview pre")).map(e=>e.textContent)');
    await shot('review-'+name+'.png');await click('#applyNote');
    const after=await evaluate('document.getElementById("editor").value');if(after===text)throw Error('Apply failed '+name);
    await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'z',code:'KeyZ',commands:['undo']});await cdp('Input.dispatchKeyEvent',{type:'keyUp',key:'z',code:'KeyZ'});
    const undone=await evaluate('document.getElementById("editor").value');if(undone!==text)throw Error('Undo failed '+name+JSON.stringify(undone));
    report.checks[name]={preview,after,oneStepBrowserUndo:true};await delay(300);
  }
  await evaluate('document.getElementById("openPreferences").click()');report.checks.settings={};
  for(const section of['Appearance','Review','Library']){await click('#settings'+section);report.checks.settings[section]=await evaluate(`({visible:!document.getElementById('settings${section}Panel').hidden,active:document.activeElement.id,pressed:document.getElementById('settings${section}').getAttribute('aria-pressed')})`);await shot('settings-'+section.toLowerCase()+'.png');}
  await click('#settingsAppearance');await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab'});await cdp('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab'});report.checks.settings.tabFocus=await evaluate('document.activeElement.id');
  await cdp('Emulation.setDeviceMetricsOverride',{width:375,height:900,deviceScaleFactor:1,mobile:false});report.checks.narrow=[];
  for(const section of['Appearance','Review','Library']){await click('#settings'+section);const sizes=await evaluate(`(()=>{const d=document.getElementById('preferencesDialog'),p=document.getElementById('settings${section}Panel');return{section:'${section}',viewport:innerWidth,pageWidth:document.documentElement.scrollWidth,dialogWidth:d.clientWidth,dialogScrollWidth:d.scrollWidth,panelWidth:p.clientWidth,panelScrollWidth:p.scrollWidth};})()`);report.checks.narrow.push(sizes);if(sizes.pageWidth>sizes.viewport||sizes.dialogScrollWidth>sizes.dialogWidth+1||sizes.panelScrollWidth>sizes.panelWidth+1)throw Error('Overflow '+JSON.stringify(sizes));await shot('settings-'+section.toLowerCase()+'-375.png');}
  report.checks.targets=await evaluate(`Array.from(document.querySelectorAll('#preferencesDialog button,#preferencesDialog input,#preferencesDialog select')).filter(e=>e.checkVisibility()).map(e=>{const r=e.getBoundingClientRect();return{id:e.id||e.textContent.trim(),width:r.width,height:r.height,clickableLabelHeight:e.type==='checkbox'?e.closest('label').getBoundingClientRect().height:null};})`);
  await click('#settingsAppearance');
  await evaluate("document.getElementById('themeSel').value='dark';document.getElementById('themeSel').dispatchEvent(new Event('change',{bubbles:true}))");
  await delay(400);report.checks.preferenceSaveNotice=await evaluate('document.getElementById("preferencesStatus").textContent');
  await cdp('Page.reload');await delay(600);await evaluate('document.getElementById("openPreferences").click()');
  report.checks.preferenceReload=await evaluate('({theme:document.getElementById("themeSel").value,bodyTheme:document.body.dataset.theme})');
  if(report.checks.preferenceReload.theme!=='dark')throw Error('Preference did not survive reload');
  await shot('settings-appearance-dark-375.png');
  writeFileSync(join(out,'browser-ui.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
} finally {
  socket?.close();
  browser.kill('SIGTERM');
  await delay(300);
  rmSync(fixture, { recursive: true, force: true });
}
