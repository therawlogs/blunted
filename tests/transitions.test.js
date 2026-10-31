import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as writer from '../src/writer/article.js';
import {analyze} from '../src/engine/analyze.js';
import {MODES} from '../src/engine/config.js';

const source=readFileSync(new URL('../src/ui/app.js',import.meta.url),'utf8');
class Node {
  constructor(tag='div') { this.tagName=tag.toUpperCase(); this.dataset={}; this.style={setProperty(){}}; this.listeners={}; this.children=[]; this.value=''; this.checked=false; this.hidden=false; this.disabled=false; this.selectionStart=0; this.selectionEnd=0; this.scrollTop=0; this.scrollLeft=0; this.attrs={}; this.classList={add(){},remove(){},toggle(){}}; }
  set textContent(v) { this.text=String(v); this.children=[]; }
  get textContent() { return (this.text||'')+this.children.map(n=>n.textContent).join(''); }
  appendChild(n) { this.children.push(n); return n; }
  addEventListener(type,cb) { (this.listeners[type]||=[]).push(cb); }
  async fire(type,extra={}) { for(const cb of this.listeners[type]||[]) await cb({target:this,preventDefault(){},stopPropagation(){},...extra}); }
  setAttribute(k,v) {this.attrs[k]=v;}
  removeAttribute(k) {delete this.attrs[k];}
  focus() {this.document.activeElement=this;}
  select() {this.selectionStart=0;this.selectionEnd=this.value.length;}
  setSelectionRange(s,e) {this.selectionStart=s;this.selectionEnd=e;}
  setRangeText(s,from,to) {this.value=this.value.slice(0,from)+s+this.value.slice(to);this.setSelectionRange(from+s.length,from+s.length);}
  querySelectorAll(selector) {return this.children.flatMap(n=>[...(selector==='.issue'&&n.className==='issue'?[n]:[]),...n.querySelectorAll(selector)]);}
  scrollIntoView() {}
  remove() {}
}
const article=(id,body='A saved article.')=>({id,title:id,body,createdAt:'2026-10-21T00:00:00Z',updatedAt:'2026-10-21T00:00:00Z'});
const ticks=async()=>{for(let i=0;i<12;i++) await Promise.resolve();};
async function harness({docs=[article('one'),article('two')],fail=false, deferred=false, portable=false,loadError=false,worker=false,savedPrefs=null}={}) {
  const nodes=new Map(), listeners={},timers=new Map(), saved=[],files=[],prefsSaved=[]; let timer=0,hold=null;
  const document={readyState:'loading',addEventListener(type,cb){(listeners[type]||=[]).push(cb);},getElementById(id){if(!nodes.has(id)){const n=this.createElement(id==='editor'?'textarea':'div');n.id=id;if(['workspaceDialog','preferencesDialog','metricsDialog','reviewOptionsDialog','leaveDialog','clearConfirmDialog','findingsView'].includes(id))n.hidden=true;nodes.set(id,n);}return nodes.get(id);},createElement(tag){const n=new Node(tag);n.document=this;return n;},createTextNode(t){const n=this.createElement('#text');n.textContent=t;return n;},createDocumentFragment(){return this.createElement('fragment');},querySelector(){return null;},querySelectorAll(){return [];},execCommand(){return false;}};
  document.body=document.createElement('body'); document.documentElement=document.createElement('html'); document.activeElement=document.body;
  const bridge={library:true,loadDoc:async()=>{if(loadError)throw Error('load failed');return {articles:structuredClone(docs),prefs:structuredClone(savedPrefs)};},saveDoc:async payload=>{if(fail)throw Error('disk full');if(deferred)await new Promise(r=>hold=r);saved.push(structuredClone(payload.doc));},savePrefs:async value=>{prefsSaved.push(structuredClone(value));},saveFile:async(name,content)=>{files.push({name,content});return true;},clearAll:async()=>{}};
  const window={BluntedEngine:{analyze,MODES,...writer},__BLUNTED_TAURI__:portable?null:bridge,addEventListener(type,cb){(listeners['window:'+type]||=[]).push(cb);},confirm(){return true;},prompt(){return 'Renamed';}};
  const workers=[];
  class WorkerStub { constructor(){this.requests=[];workers.push(this);} postMessage(request){this.requests.push(structuredClone(request));} }
  class BlobStub {}
  if(worker){window.Worker=WorkerStub;window.Blob=BlobStub;window.BluntedWorkerSrc='test';}
  const storage=new Map();
  const context={window,document,console,Worker:WorkerStub,Blob:BlobStub,URL:{createObjectURL:()=> 'blob:test'},navigator:{platform:'Mac'},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},setTimeout(cb,ms){const id=++timer;timers.set(id,{cb,ms});return id;},clearTimeout(id){timers.delete(id);},FileReader:class{readAsText(f){this.result=f.content;this.onload();}}};
  vm.runInNewContext(source,context);
  for(const cb of listeners.DOMContentLoaded)cb(); await ticks();
  const get=id=>document.getElementById(id);
  return {context,get,saved,files,prefsSaved,storage,listeners,document,bridge,window,workers, release(){deferred=false;hold?.();},setFail(v){fail=v;},async click(id){await get(id).fire('click');await ticks();},async input(id,value){get(id).value=value;await get(id).fire('input');await ticks();},async timers(ms){for(const [id,t] of [...timers])if(t.ms<=ms){timers.delete(id);t.cb();}await ticks();}};
}
const buttons=n=>n.children.flatMap(c=>[...(c.tagName==='BUTTON'?[c]:[]),...buttons(c)]);
async function confirmClear(h) { await h.click('btnClearData'); await h.click('clearConfirm'); }

test('Clear portable removal rejection preserves writing and reports failure',async()=>{
 const h=await harness({portable:true});await h.input('editor','Keep this writing.');await h.timers(800);
 h.context.localStorage.removeItem=()=>{throw Error('denied');};await h.click('openPreferences');await confirmClear(h);
 assert.equal(h.get('editor').value,'Keep this writing.');assert.match(h.get('clearStatus').textContent,/could not|failed/i);
});
test('final preferences failure keeps native close open',async()=>{
 const h=await harness();h.bridge.savePrefs=async()=>{throw Error('denied');};const closing=h.window.BluntedWorkspace.prepareClose();await ticks();
 assert.equal(h.get('leaveDialog').hidden,false);assert.equal(h.get('leaveHeading').textContent,'Preferences could not be saved');await h.click('leaveKeep');assert.equal(await closing,false);
});
test('Clear drains prior save, blocks repeats and leaves no timer resurrection',async()=>{
 const h=await harness({deferred:true});await h.input('editor','Pending save.');await h.timers(800);let calls=0;h.bridge.clearAll=async()=>{calls++;assert.equal(h.saved.length,1);return {status:'complete',removed:[],failed:[]};};
 await h.click('openPreferences');await h.click('btnClearData');const clearing=h.get('clearConfirm').fire('click');await ticks();assert.equal(h.get('editor').readOnly,true);assert.equal(h.document.activeElement,h.get('clearStatus'));
 await confirmClear(h);assert.equal(calls,0);h.release();await clearing;await h.timers(1000);assert.equal(calls,1);assert.equal(h.saved.length,1);assert.equal(h.get('editor').value,'');assert.equal(h.get('editor').readOnly,false);assert.equal(h.document.activeElement,h.get('clearStatus'));
});
test('partial native Clear reports counts and retains editor with controls unlocked',async()=>{
 const h=await harness();h.bridge.clearAll=async()=>({status:'partial',removed:['one'],failed:['two denied']});await h.click('openPreferences');await confirmClear(h);
 assert.equal(h.get('editor').value,'A saved article.');assert.match(h.get('clearStatus').textContent,/partly cleared.*1 removals completed; 1 removals failed/);assert.equal(h.get('btnClearData').disabled,false);
 h.get('copyNote').textContent='Copied';assert.match(h.get('clearStatus').textContent,/partly/);
});
test('failed native Clear unlocks and deliberate panel closure keeps opener focus',async()=>{
 const h=await harness();let finish;h.bridge.clearAll=()=>new Promise((r,j)=>finish=j);h.get('openPreferences').focus();await h.click('openPreferences');await h.click('btnClearData');const attempt=h.get('clearConfirm').fire('click');await ticks();
 await h.get('preferencesDialog').fire('cancel');assert.equal(h.document.activeElement,h.get('openPreferences'));finish(Error('denied'));await attempt;assert.equal(h.document.activeElement,h.get('openPreferences'));assert.equal(h.get('editor').readOnly,false);assert.match(h.get('clearStatus').textContent,/could not/);
});
async function pick(h,articles,settings){h.get('libraryPick').files=[{content:JSON.stringify({app:'blunted-library',version:1,articles,settings})}];await h.get('libraryPick').fire('change');}
test('confirmed import snapshots backup, choices and settings across pending article save',async()=>{
 const h=await harness({deferred:true});await h.input('editor','Save before import');await h.timers(800);await h.click('openArticles');await pick(h,[article('one','Imported distinct')],{prefs:{theme:'dark'}});h.get('restoreConflict').value='copy';h.get('restoreSettings').checked=true;
 const importing=h.get('restoreConfirm').fire('click');await ticks();assert.equal(h.document.activeElement,h.get('importStatus'));assert.equal(h.get('restoreCancel').disabled,true);
 h.get('restoreConflict').value='skip';h.get('restoreSettings').checked=false;await h.click('restoreCancel');await pick(h,[]);h.release();await importing;
 const imported=h.saved.find(a=>a.body==='Imported distinct');assert.ok(imported);assert.notEqual(imported.id,'one');assert.equal(h.prefsSaved.at(-1).theme,'dark');assert.match(h.get('importStatus').textContent,/1 articles imported; 0 skipped.*restored/);assert.equal(h.document.activeElement,h.get('importStatus'));assert.equal(h.get('restoreCancel').disabled,false);
});
test('out-of-order backup readers and cancelled reads cannot replace the current selection',async()=>{
 const h=await harness();const readers=[];h.context.FileReader=class{readAsText(f){this.result=f.content;readers.push(this);}};
 await pick(h,[article('old','Old')]);await pick(h,[article('new','New')]);readers[1].onload();readers[0].onload();await h.click('restoreConfirm');assert.ok(h.saved.some(a=>a.id==='new'));assert.equal(h.saved.some(a=>a.id==='old'),false);
 await pick(h,[article('cancelled')]);await h.click('restoreCancel');readers[2].onload();assert.equal(h.get('restoreChoices').hidden,true);
});
test('all-skipped and empty imports report exact outcomes',async()=>{
 const h=await harness();await pick(h,[article('one')]);h.get('restoreConflict').value='skip';await h.click('restoreConfirm');assert.match(h.get('importStatus').textContent,/All articles skipped. 0 articles imported; 1 skipped/);
 await pick(h,[]);await h.click('restoreConfirm');assert.match(h.get('importStatus').textContent,/Import complete. 0 articles imported; 0 skipped/);
});
test('partial article import and preferences failure preserve actual counts',async()=>{
 const h=await harness();let calls=0;h.bridge.saveDoc=async p=>{if(++calls===2)throw Error('full');h.saved.push(structuredClone(p.doc));};await pick(h,[article('new1'),article('new2')]);await h.click('restoreConfirm');assert.match(h.get('importStatus').textContent,/interrupted: 1 articles imported; 0 skipped/);assert.equal(h.get('restoreConfirm').disabled,false);
 const fresh=await harness();fresh.bridge.savePrefs=async()=>{throw Error('full');};await pick(fresh,[article('new3')],{prefs:{theme:'dark'}});fresh.get('restoreSettings').checked=true;await fresh.click('restoreConfirm');assert.match(fresh.get('importStatus').textContent,/1 articles imported; 0 skipped. Preferences could not be saved/);assert.notEqual(fresh.document.body.dataset.theme,'dark');
});
test('preferences retry and explicit exit preserve article and reset later dialog mode',async()=>{
 const h=await harness();let calls=0;h.bridge.savePrefs=async()=>{if(++calls===1)throw Error('full');};const close=h.window.BluntedWorkspace.prepareClose();await ticks();await h.click('leaveSave');assert.equal(await close,true);assert.equal(h.get('editor').value,'A saved article.');
 h.bridge.savePrefs=async()=>{throw Error('full');};const exit=h.window.BluntedWorkspace.prepareClose();await ticks();await h.click('leaveDiscard');assert.equal(await exit,true);
 h.setFail(true);await h.input('editor','Ordinary unsaved text');const ordinary=h.window.BluntedWorkspace.prepareClose();await ticks();assert.equal(h.get('leaveHeading').textContent,'Keep this writing?');assert.equal(h.get('leaveDiscard').textContent,'Discard unsaved changes');await h.get('leaveDialog').fire('cancel');assert.equal(await ordinary,false);
});
test('late writing during final preferences await prevents a preferences-only exit',async()=>{
 const h=await harness();let reject;h.bridge.savePrefs=()=>new Promise((r,j)=>reject=j);const close=h.window.BluntedWorkspace.prepareClose();await ticks();await h.input('editor','New writing while preferences await');reject(Error('full'));await ticks();await h.click('leaveDiscard');assert.equal(await close,false);assert.equal(h.get('editor').value,'New writing while preferences await');
});
test('repeated close requests cannot replace the pending resolver',async()=>{
 const h=await harness();h.bridge.savePrefs=async()=>{throw Error('full');};const first=h.window.BluntedWorkspace.prepareClose();await ticks();assert.equal(await h.window.BluntedWorkspace.prepareClose(),false);await h.click('leaveKeep');assert.equal(await first,false);
});
test('Clear invalidates in-flight portable article and settings readers',async()=>{
 const h=await harness({portable:true});const readers=[];h.context.FileReader=class{readAsText(f){this.result=f.content;readers.push(this);}};
 h.get('filePick').files=[{name:'old.md',content:'Must not resurrect'}];await h.get('filePick').fire('change');h.get('settingsPick').files=[{content:JSON.stringify({app:'blunted',prefs:{theme:'dark'}})}];await h.get('settingsPick').fire('change');
 await confirmClear(h);readers[0].onload();readers[1].onload();await h.timers(1000);assert.equal(h.get('editor').value,'');assert.equal(h.storage.has('blunted.doc.v1'),false);assert.equal(h.storage.has('blunted.prefs.v1'),false);
});
test('portable Clear complete and already absent removals report completion without writes',async()=>{
 const h=await harness({portable:true});await h.input('editor','Disposable saved draft');await h.timers(800);assert.ok(h.storage.size);await confirmClear(h);assert.equal(h.storage.size,0);assert.equal(h.get('clearStatus').textContent,'Local data cleared.');await confirmClear(h);assert.equal(h.storage.size,0);assert.equal(h.get('editor').value,'');await h.timers(1000);assert.equal(h.storage.size,0);
});
test('deliberately closing Articles during import retains opener focus through completion',async()=>{
 const h=await harness();let release;h.bridge.saveDoc=p=>new Promise(r=>release=()=>{h.saved.push(structuredClone(p.doc));r();});h.get('openArticles').focus();await h.click('openArticles');await pick(h,[article('new','Synthetic import')]);const importing=h.get('restoreConfirm').fire('click');await ticks();await h.get('workspaceDialog').fire('cancel');assert.equal(h.document.activeElement,h.get('openArticles'));release();await importing;assert.equal(h.document.activeElement,h.get('openArticles'));assert.equal(h.get('workspaceDialog').hidden,true);assert.equal(h.saved.at(-1).body,'Synthetic import');
});
test('pending final preferences save owns transition and Clear cannot race or recreate data',async()=>{
 const h=await harness();let finishPreferences,clearCalls=0,persistedPreferences=false;
 h.bridge.savePrefs=()=>new Promise(resolve=>{finishPreferences=()=>{persistedPreferences=true;resolve();};});
 h.bridge.clearAll=async()=>{clearCalls++;persistedPreferences=false;return {status:'complete',removed:['preferences'],failed:[]};};
 const closing=h.window.BluntedWorkspace.prepareClose();await ticks();assert.equal(typeof finishPreferences,'function');
 await confirmClear(h);assert.equal(clearCalls,0,'Clear must respect final close ownership');
 await h.click('libraryNew');assert.equal(h.saved.length,0,'competing new article must respect close ownership');
 finishPreferences();assert.equal(await closing,true);assert.equal(persistedPreferences,true);
 await confirmClear(h);assert.equal(clearCalls,1);assert.equal(persistedPreferences,false);await h.timers(1000);assert.equal(persistedPreferences,false);
});
test('confirmed preferences import invalidates pending preference timers and owns queued write',async()=>{
 const h=await harness();const writes=[];let finishImport,persistedTheme;
 h.get('themeSel').value='light';await h.get('themeSel').fire('change');
 h.bridge.savePrefs=value=>{writes.push(value.theme);return new Promise(resolve=>{finishImport=()=>{persistedTheme=value.theme;resolve();};});};
 await pick(h,[],{prefs:{theme:'dark'}});h.get('restoreSettings').checked=true;
 const importing=h.get('restoreConfirm').fire('click');await ticks();assert.deepEqual(writes,['dark']);
 await h.timers(200);assert.deepEqual(writes,['dark'],'older scheduled preferences must not race imported preferences');
 await h.get('editor').fire('scroll');await h.timers(200);assert.deepEqual(writes,['dark']);
 finishImport();await importing;await h.timers(1000);assert.deepEqual(writes,['dark']);assert.equal(persistedTheme,'dark');assert.match(h.get('importStatus').textContent,/Writing preferences restored/);
});
test('explicit preferences-only exit discards changed preferences without another save attempt',async()=>{
 const h=await harness();let failPreferences,calls=0;h.bridge.savePrefs=()=>{calls++;return new Promise((resolve,reject)=>{failPreferences=reject;});};
 const closing=h.window.BluntedWorkspace.prepareClose();await ticks();h.get('themeSel').value='dark';await h.get('themeSel').fire('change');failPreferences(Error('full'));await ticks();
 await h.click('leaveDiscard');assert.equal(calls,1);assert.equal(await closing,true);assert.equal(h.get('editor').value,'A saved article.');
});
test('portable Clear does not count already absent keys as removed when sole main deletion fails',async()=>{
 const h=await harness({portable:true});await h.input('editor','Only persisted main');await h.timers(800);for(const key of [...h.storage.keys()])if(key!=='blunted.doc.v1')h.storage.delete(key);
 h.context.localStorage.removeItem=key=>{if(key==='blunted.doc.v1')throw Error('denied');h.storage.delete(key);};await confirmClear(h);
 assert.match(h.get('clearStatus').textContent,/could not be cleared. 0 removals completed; 1 removals failed/);assert.doesNotMatch(h.get('clearStatus').textContent,/partly/);assert.equal(h.get('editor').value,'Only persisted main');assert.equal(h.storage.size,1);
});
test('portable Clear truthfully reports unreadable storage without claiming unknown removals',async()=>{
 const h=await harness({portable:true});await h.input('editor','Keep unreadable draft');await h.timers(800);h.context.localStorage.getItem=key=>{if(key==='blunted.doc.v1')throw Error('read denied');return h.storage.get(key)??null;};
 await confirmClear(h);assert.match(h.get('clearStatus').textContent,/1 storage locations could not be checked; no removal was attempted there/);assert.ok(h.storage.has('blunted.doc.v1'));assert.equal(h.get('editor').value,'Keep unreadable draft');
});

test('grouped settings expose the requested section and keep keyboard focus on its opener',async()=>{
 const h=await harness();await h.click('openPreferences');
 assert.equal(h.get('settingsAppearancePanel').hidden,false);assert.equal(h.get('settingsReviewPanel').hidden,true);assert.equal(h.document.activeElement,h.get('themeSel'));
 await h.click('settingsLibrary');assert.equal(h.get('settingsLibraryPanel').hidden,false);assert.equal(h.get('settingsAppearancePanel').hidden,true);assert.equal(h.get('settingsLibrary').attrs['aria-pressed'],'true');
 await h.click('openRules');assert.equal(h.get('settingsReviewPanel').hidden,false);assert.equal(h.get('settingsLibraryPanel').hidden,true);assert.equal(h.document.activeElement,h.get('profileSel'));
});
test('grouped settings retain existing preferences and announce successful persistence',async()=>{
 const h=await harness({savedPrefs:{theme:'dark',fontFamily:'mono',fontSize:19,lineHeight:2.1,wpm:240}});
 await h.click('openPreferences');assert.equal(h.get('themeSel').value,'dark');assert.equal(h.get('fontFamily').value,'mono');
 h.get('themeSel').value='light';await h.get('themeSel').fire('change');assert.match(h.get('preferencesStatus').textContent,/Saving/);await h.timers(200);
 assert.equal(h.prefsSaved.at(-1).theme,'light');assert.equal(h.prefsSaved.at(-1).fontFamily,'mono');assert.equal(h.prefsSaved.at(-1).wpm,240);assert.match(h.get('preferencesStatus').textContent,/saved on this device/);
});
test('settings save failure is visible in its dialog and a subsequent change retries',async()=>{
 const h=await harness();h.bridge.savePrefs=async()=>{throw Error('denied');};await h.click('openPreferences');h.get('themeSel').value='dark';await h.get('themeSel').fire('change');await h.timers(200);
 assert.match(h.get('preferencesStatus').textContent,/could not be saved/);assert.equal(h.get('preferencesStatus').attrs['data-failed'],'true');assert.equal(h.get('editor').value,'A saved article.');
 h.bridge.savePrefs=async()=>{};h.get('themeSel').value='light';await h.get('themeSel').fire('change');await h.timers(200);assert.equal(h.get('preferencesStatus').attrs['data-failed'],'false');assert.match(h.get('preferencesStatus').textContent,/saved on this device/);
});
test('settings save independently of article autosave and private sessions keep changes temporary',async()=>{
 const h=await harness();h.get('optAutoSave').checked=false;await h.get('optAutoSave').fire('change');h.get('themeSel').value='dark';await h.get('themeSel').fire('change');await h.timers(200);
 assert.equal(h.prefsSaved.at(-1).theme,'dark');assert.equal(h.prefsSaved.at(-1).autosave,false);assert.equal(h.saved.length,0);
 const writes=h.prefsSaved.length;h.get('themeSel').value='light';await h.get('themeSel').fire('change');h.get('optPrivate').checked=true;await h.get('optPrivate').fire('change');await h.timers(1000);
 assert.equal(h.prefsSaved.length,writes);assert.match(h.get('preferencesStatus').textContent,/temporary/);
});


test('Clear requires explicit confirmation and Cancel or Escape leaves storage untouched',async()=>{
 const h=await harness({portable:true});await h.input('editor','Keep this disposable draft.');await h.timers(800);const stored=[...h.storage];await h.click('openPreferences');await h.click('settingsLibrary');
 await h.click('btnClearData');assert.equal(h.get('clearConfirmDialog').hidden,false);assert.equal(h.document.activeElement,h.get('clearCancel'));assert.deepEqual([...h.storage],stored);assert.notEqual(h.get('editor').readOnly,true);
 await h.click('clearCancel');assert.equal(h.get('clearConfirmDialog').hidden,true);assert.equal(h.document.activeElement,h.get('btnClearData'));assert.deepEqual([...h.storage],stored);
 await h.click('clearConfirm');assert.deepEqual([...h.storage],stored,'a stale confirmation must not delete');
 await h.click('btnClearData');await h.get('clearConfirmDialog').fire('cancel');assert.equal(h.get('clearConfirmDialog').hidden,true);assert.equal(h.document.activeElement,h.get('btnClearData'));assert.deepEqual([...h.storage],stored);assert.equal(h.get('editor').value,'Keep this disposable draft.');
});
test('native close dismisses Clear confirmation and requires a separate close attempt',async()=>{
 const h=await harness();let clearCalls=0;h.bridge.clearAll=async()=>{clearCalls++;return {status:'complete',removed:[],failed:[]};};await h.click('openPreferences');await h.click('settingsLibrary');await h.click('btnClearData');
 assert.equal(await h.window.BluntedWorkspace.prepareClose(),false);assert.equal(h.get('clearConfirmDialog').hidden,true);assert.equal(h.document.activeElement,h.get('btnClearData'));assert.equal(clearCalls,0);assert.equal(h.get('editor').value,'A saved article.');
 assert.equal(await h.window.BluntedWorkspace.prepareClose(),true);assert.equal(clearCalls,0);
});
test('closing after complete Clear does not recreate cleared preferences',async()=>{
 const h=await harness();let persistedPreferences=true,writes=0;
 h.bridge.savePrefs=async()=>{writes++;persistedPreferences=true;};
 h.bridge.clearAll=async()=>{persistedPreferences=false;return {status:'complete',removed:['preferences'],failed:[]};};
 await h.click('openPreferences');await h.click('settingsLibrary');await confirmClear(h);assert.equal(persistedPreferences,false);assert.equal(h.get('clearStatus').textContent,'Local data cleared.');
 const before=writes;assert.equal(await h.window.BluntedWorkspace.prepareClose(),true);assert.equal(writes,before,'close must not save preferences after Clear');assert.equal(persistedPreferences,false);await h.timers(1000);assert.equal(persistedPreferences,false);
});

test('Clear keeps the existing Settings modal open and restores its controls after cancellation',async()=>{
 const h=await harness();const settings=h.get('preferencesDialog');let closes=0;
 settings.showModal=function(){this.open=true;};settings.close=function(){this.open=false;closes++;};
 await h.click('openPreferences');assert.equal(settings.open,true);
 await h.click('btnClearData');assert.equal(settings.open,true,'confirmation must not close the native modal');assert.equal(closes,0);assert.equal(settings.attrs['aria-labelledby'],'clearConfirmHeading');
 assert.equal(h.get('settingsControls').hidden,true);assert.equal(h.get('clearConfirmDialog').hidden,false);assert.equal(h.document.activeElement,h.get('clearCancel'));
 await settings.fire('cancel');assert.equal(settings.open,true);assert.equal(settings.attrs['aria-labelledby'],'preferencesHeading');assert.equal(h.get('settingsControls').hidden,false);assert.equal(h.get('clearConfirmDialog').hidden,true);assert.equal(h.document.activeElement,h.get('btnClearData'));
});

test('preferences recovery clears only its stale storage warning',async()=>{
 const h=await harness();h.bridge.savePrefs=async()=>{throw Error('temporary permission failure');};
 await h.click('openPreferences');h.get('themeSel').value='dark';await h.get('themeSel').fire('change');await h.timers(200);assert.match(h.get('copyNote').textContent,/Preferences could not be saved/);
 h.bridge.savePrefs=async()=>{};h.get('themeSel').value='light';await h.get('themeSel').fire('change');await h.timers(200);assert.equal(h.get('copyNote').textContent,'');
});

test('portable autosave clears a recovered preferences warning after a successful preferences write',async()=>{
 const h=await harness({portable:true});const original=h.context.localStorage.setItem;
 h.context.localStorage.setItem=(key,value)=>{if(key==='blunted.prefs.v1')throw Error('quota');original(key,value);};
 await h.input('editor','Article survives preferences quota error.');await h.timers(800);assert.match(h.get('copyNote').textContent,/preferences could not be saved/i);
 h.context.localStorage.setItem=original;await h.input('editor','Recovered portable article.');await h.timers(800);assert.equal(h.get('copyNote').textContent,'');assert.equal(JSON.parse(h.storage.get('blunted.doc.v1')).body,'Recovered portable article.');
});
