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
  click() {return this.fire("click");}
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
  const document={readyState:'loading',addEventListener(type,cb){(listeners[type]||=[]).push(cb);},getElementById(id){if(!nodes.has(id)){const n=this.createElement(id==='editor'?'textarea':'div');n.id=id;if(['workspaceDialog','preferencesDialog','metricsDialog','reviewOptionsDialog','leaveDialog','findingsView'].includes(id))n.hidden=true;nodes.set(id,n);}return nodes.get(id);},createElement(tag){const n=new Node(tag);n.document=this;return n;},createTextNode(t){const n=this.createElement('#text');n.textContent=t;return n;},createDocumentFragment(){return this.createElement('fragment');},querySelector(){return null;},querySelectorAll(){return [];},execCommand(){return false;}};
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
  return {get,saved,files,prefsSaved,storage,listeners,document,bridge,window,workers, release(){deferred=false;hold?.();},setFail(v){fail=v;},async click(id){await get(id).fire('click');await ticks();},async input(id,value){get(id).value=value;await get(id).fire('input');await ticks();},async timers(ms){for(const [id,t] of [...timers])if(t.ms<=ms){timers.delete(id);t.cb();}await ticks();}};
}
const buttons=n=>n.children.flatMap(c=>[...(c.tagName==='BUTTON'?[c]:[]),...buttons(c)]);

test('unavailable desktop library owns a persistent recovery strip and retries without adopting loaded writing',async()=>{
 const h=await harness({loadError:true});
 assert.equal(h.get('libraryRecovery').hidden,false);
 await h.input('editor','My active writing.');
 const editor=h.get('editor');editor.setSelectionRange(3,8);editor.scrollTop=71;
 h.bridge.retryLibrary=async()=>({location:'/original/location',articles:[article('existing','Existing library writing.')]});
 await h.click('retryLibrary');
 assert.equal(h.get('libraryRecovery').hidden,true);
 assert.equal(editor.value,'My active writing.');assert.equal(editor.selectionStart,3);assert.equal(editor.selectionEnd,8);assert.equal(editor.scrollTop,71);
 assert.notEqual(h.get('statusSave').textContent,'Saved');
 assert.match(h.get('libraryList').textContent,/existing/);
 await h.click('libraryBackup');assert.ok(JSON.parse(h.files.at(-1).content).articles.some(a=>a.id==='existing' && a.body==='Existing library writing.'));
 await h.timers(800);assert.equal(h.saved.at(-1).body,'My active writing.');
});
test('retry retains failure actions and only restores focus when Retry still owns focus',async()=>{
 const h=await harness({loadError:true});let release;
 h.bridge.retryLibrary=()=>new Promise(resolve=>release=resolve);
 h.get('retryLibrary').focus();const retry=h.click('retryLibrary');await ticks();
 h.get('docTitle').focus();release({});await retry;
 assert.equal(h.document.activeElement,h.get('docTitle'));
 const failed=await harness({loadError:true});failed.bridge.retryLibrary=async()=>{throw Error('still absent');};
 await failed.click('retryLibrary');assert.equal(failed.get('libraryRecovery').hidden,false);assert.equal(failed.get('retryLibrary').disabled,false);
 const recovered=await harness({loadError:true});recovered.bridge.retryLibrary=async()=>({});recovered.get('retryLibrary').focus();await recovered.click('retryLibrary');assert.equal(recovered.document.activeElement,recovered.get('editor'));
});
test('save failure keeps export reachable and unrelated notices cannot replace the warning',async()=>{
 const h=await harness({fail:true});await h.input('editor','Export this surviving text.');await h.timers(800);
 assert.equal(h.get('libraryRecovery').hidden,false);const message=h.get('libraryRecoveryMessage').textContent;
 h.get('copyNote').textContent='Unrelated copy message';assert.equal(h.get('libraryRecoveryMessage').textContent,message);
 await h.click('exportUnavailableArticle');assert.equal(h.files.length,1);assert.match(h.files[0].content,/Export this surviving text/);
});

test('article acknowledgement stays distinct from a rejected preferences write',async()=>{
 const h=await harness();h.bridge.saveDoc=async payload=>{h.saved.push(structuredClone(payload.doc));return {preferencesSaved:false};};
 await h.input('editor','Article persistence succeeds independently.');await h.timers(800);
 assert.equal(h.get('statusSave').textContent,'Saved');assert.match(h.get('copyNote').textContent,/article was saved, but preferences could not/);
 h.get('copyNote').textContent='';await h.click('libraryNew');assert.equal(h.get('editor').value,'');assert.match(h.get('copyNote').textContent,/article was saved, but preferences could not/);
});

test('successful autosave clears its prior failure warning without deleting unrelated notices',async()=>{
 const h=await harness({fail:true});await h.input('editor','Preserve newest writing.');await h.timers(800);
 assert.match(h.get('copyNote').textContent,/Saving failed/);assert.match(h.get('libraryRecoveryMessage').textContent,/Details: disk full/);
 h.setFail(false);await h.input('editor','Recovered and saved writing.');await h.timers(800);
 assert.equal(h.get('statusSave').textContent,'Saved');assert.equal(h.get('copyNote').textContent,'');assert.equal(h.saved.at(-1).body,'Recovered and saved writing.');
 h.get('copyNote').textContent='Unrelated export notice';await h.input('editor','Another saved edit.');await h.timers(800);assert.equal(h.get('copyNote').textContent,'Unrelated export notice');
});

test('native library actions clear a recovered preferences warning',async()=>{
 const h=await harness();h.bridge.saveDoc=async payload=>{h.saved.push(structuredClone(payload.doc));return {preferencesSaved:false};};
 await h.input('editor','Saved with preferences failure.');await h.timers(800);assert.match(h.get('copyNote').textContent,/preferences could not be saved/);
 h.bridge.saveDoc=async payload=>{h.saved.push(structuredClone(payload.doc));return {preferencesSaved:true};};await h.click('libraryNew');assert.equal(h.get('copyNote').textContent,'');
});
