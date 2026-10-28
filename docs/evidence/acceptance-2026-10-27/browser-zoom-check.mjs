// Captured real-browser-zoom check. Requires a disposable HTTP server serving /tmp/blunted-acceptance-20261027 on localhost:1430; run from repository root with Chrome for Testing executable argument.
import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir, platform, release, cpus, totalmem } from 'node:os';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const executable = process.argv[2];
if (!executable || !existsSync(executable)) throw new Error('Pass an existing Chromium executable path.');
const fixture = mkdtempSync(join(tmpdir(), 'blunted-typing-'));
const html = join(fixture, 'index.html');
execFileSync(process.execPath, ['scripts/build.mjs', '--out', html], { stdio: 'ignore' });
mkdirSync(join(fixture, 'profile', 'Default'), {recursive:true});
writeFileSync(join(fixture, 'profile', 'Default', 'Preferences'), JSON.stringify({partition:{default_zoom_level:Math.log(2)/Math.log(1.2)}}));
mkdirSync(join(fixture, 'zoom-extension'));
writeFileSync(join(fixture, 'zoom-extension', 'manifest.json'), JSON.stringify({manifest_version:3,name:'Disposable local zoom acceptance',version:'1.0',permissions:['tabs'],background:{service_worker:'background.js'}}));
writeFileSync(join(fixture, 'zoom-extension', 'background.js'), `chrome.tabs.onUpdated.addListener((id,info,tab)=>{if(tab.url&&tab.url.startsWith('http://127.0.0.1:1430/')&&info.status==='complete')chrome.tabs.setZoom(id,2);});`);
const browser = spawn(executable, ['--headless', '--no-sandbox', '--no-first-run', '--disable-background-networking', '--disable-sync', '--disable-extensions-except=' + join(fixture, 'zoom-extension'), '--load-extension=' + join(fixture, 'zoom-extension'), '--remote-debugging-port=0', '--window-size=1360,900', '--user-data-dir=' + join(fixture, 'profile'), 'about:blank'], { stdio: 'ignore' });
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
  writeFileSync('/tmp/blunted-acceptance-20261027/zoom.html', readFileSync(html));
  await delay(1000);
  await cdp('Page.navigate', { url: 'http://127.0.0.1:1430/zoom.html' });
  for (let i = 0; i < 100 && !await evaluate('!!(document.getElementById("editor") && window.BluntedEngine)'); i++) await delay(100);
  await delay(1500); // startup analysis, extension zoom and initial storage read
  const report={method:'Isolated unpacked extension calls chrome.tabs.setZoom(tabId,2); no CSS zoom or emulated page scale',metrics:await evaluate('({innerWidth,outerWidth,devicePixelRatio,visualScale:visualViewport.scale})')};
  await evaluate('document.getElementById("openPreferences").click()');
  report.dialog=await evaluate('(()=>{const d=document.getElementById("preferencesDialog");return{width:d.clientWidth,scrollWidth:d.scrollWidth,pageWidth:document.documentElement.scrollWidth};})()');
  report.confirmedBrowserZoom200=report.metrics.devicePixelRatio===2&&report.metrics.innerWidth<=680&&report.metrics.visualScale===1;
  report.sections=[];
  for(const section of ['Appearance','Review','Library']){
    await evaluate(`document.getElementById('settings${section}').click()`);
    report.sections.push(await evaluate(`(()=>{const d=document.getElementById('preferencesDialog');return{section:'${section}',viewport:innerWidth,page:document.documentElement.scrollWidth,width:d.clientWidth,scrollWidth:d.scrollWidth};})()`));
    const shot=await cdp('Page.captureScreenshot',{format:'png'});writeFileSync(resolve('docs/evidence/acceptance-2026-10-27/settings-'+section.toLowerCase()+'-browser-zoom-200.png'),Buffer.from(shot.data,'base64'));
  }
  writeFileSync(resolve('docs/evidence/acceptance-2026-10-27/browser-zoom.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
} finally {
  socket?.close();
  browser.kill('SIGTERM');
  await delay(300);
  rmSync(fixture, { recursive: true, force: true });
}
