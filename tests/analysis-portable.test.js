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
async function harness({docs=[article('one'),article('two')],fail=false, deferred=false, portable=false,loadError=false,worker=false,savedPrefs=null,initialStorage=[],storageHooks={},engine={}}={}) {
  const nodes=new Map(), listeners={},timers=new Map(), saved=[],files=[],prefsSaved=[]; let timer=0,hold=null;
  const document={readyState:'loading',addEventListener(type,cb){(listeners[type]||=[]).push(cb);},getElementById(id){if(!nodes.has(id)){const n=this.createElement(id==='editor'?'textarea':'div');n.id=id;if(['workspaceDialog','preferencesDialog','metricsDialog','reviewOptionsDialog','leaveDialog','findingsView'].includes(id))n.hidden=true;nodes.set(id,n);}return nodes.get(id);},createElement(tag){const n=new Node(tag);n.document=this;return n;},createTextNode(t){const n=this.createElement('#text');n.textContent=t;return n;},createDocumentFragment(){return this.createElement('fragment');},querySelector(){return null;},querySelectorAll(){return [];},execCommand(){return false;}};
  document.body=document.createElement('body'); document.documentElement=document.createElement('html'); document.activeElement=document.body;
  const bridge={library:true,loadDoc:async()=>{if(loadError)throw Error('load failed');return {articles:structuredClone(docs),prefs:structuredClone(savedPrefs)};},saveDoc:async payload=>{if(fail)throw Error('disk full');if(deferred)await new Promise(r=>hold=r);saved.push(structuredClone(payload.doc));},savePrefs:async value=>{prefsSaved.push(structuredClone(value));},saveFile:async(name,content)=>{files.push({name,content});return true;},clearAll:async()=>{}};
  const window={BluntedEngine:{analyze,MODES,...writer,...engine},__BLUNTED_TAURI__:portable?null:bridge,addEventListener(type,cb){(listeners['window:'+type]||=[]).push(cb);},confirm(){return true;},prompt(){return 'Renamed';}};
  const workers=[];
  class WorkerStub { constructor(){this.requests=[];workers.push(this);} postMessage(request){this.requests.push(structuredClone(request));} }
  class BlobStub {}
  if(worker){window.Worker=WorkerStub;window.Blob=BlobStub;window.BluntedWorkerSrc='test';}
  const storage=new Map(initialStorage);
  const context={window,document,console,Worker:WorkerStub,Blob:BlobStub,URL:{createObjectURL:()=> 'blob:test'},navigator:{platform:'Mac'},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>{storageHooks.setItem?.(k,v,storage);storage.set(k,v);},removeItem:k=>storage.delete(k)},setTimeout(cb,ms){const id=++timer;timers.set(id,{cb,ms});return id;},clearTimeout(id){timers.delete(id);},FileReader:class{readAsText(f){this.result=f.content;this.onload();}}};
  vm.runInNewContext(source,context);
  for(const cb of listeners.DOMContentLoaded)cb(); await ticks();
  const get=id=>document.getElementById(id);
  return {get,saved,files,prefsSaved,storage,listeners,document,bridge,window,workers, release(){deferred=false;hold?.();},setFail(v){fail=v;},async click(id){await get(id).fire('click');await ticks();},async input(id,value){get(id).value=value;await get(id).fire('input');await ticks();},async timers(ms){for(const [id,t] of [...timers])if(t.ms<=ms){timers.delete(id);t.cb();}await ticks();}};
}
const buttons=n=>n.children.flatMap(c=>[...(c.tagName==='BUTTON'?[c]:[]),...buttons(c)]);


const MAIN='blunted.doc.v1', BACKUPS=['blunted.backup.v1a','blunted.backup.v1b','blunted.backup.v1c'];
const persisted=body=>JSON.stringify(article('portable',body));
for (const slot of BACKUPS) {
 test(`portable failed replacement retains the only valid copy recovered from ${slot}`,async()=>{
  const h=await harness({portable:true,initialStorage:[[MAIN,'corrupt'],...BACKUPS.map(k=>[k,k===slot?persisted('Recovered writing.'):'corrupt'])],storageHooks:{setItem(k){if(k===MAIN)throw Error('quota');}}});
  assert.equal(h.get('editor').value,'Recovered writing.');
  await h.input('editor','Working text stays available.');await h.timers(800);
  assert.equal(h.get('editor').value,'Working text stays available.');
  assert.ok([MAIN,...BACKUPS].some(k=>{try{return JSON.parse(h.storage.get(k)).body==='Recovered writing.';}catch{return false;}}));
  const reloaded=await harness({portable:true,initialStorage:[...h.storage]});assert.equal(reloaded.get('editor').value,'Recovered writing.');
 });
}
test('portable rotation validates inputs and retains three previous valid copies',async()=>{
 const h=await harness({portable:true,initialStorage:[[MAIN,persisted('Main.')],[BACKUPS[0],persisted('A.')],[BACKUPS[1],persisted('B.')],[BACKUPS[2],persisted('C.')]]});
 await h.input('editor','Replacement.');await h.timers(800);
 assert.equal(JSON.parse(h.storage.get(MAIN)).body,'Replacement.');assert.deepEqual(BACKUPS.map(k=>JSON.parse(h.storage.get(k)).body),['Main.','A.','B.']);
});
test('current worker failure clears every derived consumer, stays until next edit and preserves text/save/export',async()=>{
 const h=await harness({worker:true});const w=h.workers[0];let req=w.requests.at(-1);let r=analyze(req);r.structure=writer.structureReport(req.text);w.onmessage({data:{ok:true,rev:req.textRevision,result:r}});
 await h.input('editor','# Working\n\nWe utilize this method.');await h.timers(150);req=w.requests.at(-1);
 h.get('issues').focus();w.onmessage({data:{ok:false,rev:req.textRevision,error:'injected worker failure'}});
 assert.match(h.get('issues').textContent,/Review is unavailable/);assert.match(h.get('articleOutline').textContent,/Outline is unavailable/);
 assert.equal(h.get('issues').attrs['aria-busy'],'false');assert.equal(h.get('articleOutline').attrs['aria-busy'],'false');
 assert.equal(h.get('sectionLengths').textContent,'');assert.equal(h.get('detailsList').textContent,'');assert.equal(h.get('gradeMain').textContent,'');assert.equal(h.get('findingsList').textContent,'');assert.equal(h.get('allNotes').disabled,true);
 assert.equal(h.get('editor').value,'# Working\n\nWe utilize this method.');assert.equal(h.document.activeElement,h.get('issues'));
 await h.timers(2000);assert.match(h.get('issues').textContent,/Review is unavailable/);
 r=analyze(req);r.structure=writer.structureReport(req.text);w.onmessage({data:{ok:true,rev:req.textRevision,result:r}});assert.match(h.get('issues').textContent,/Review is unavailable/);
 await h.timers(800);assert.equal(h.saved.at(-1).body,h.get('editor').value);await h.click('btnDownload');assert.ok(h.files.at(-1).content.includes('Working'));
 await h.input('editor','We utilize a recovered method.');await h.timers(150);const current=w.requests.at(-1);r=analyze(current);r.structure=writer.structureReport(current.text);w.onmessage({data:{ok:true,rev:current.textRevision,result:r}});
 assert.doesNotMatch(h.get('issues').textContent,/unavailable/);assert.equal(h.get('allNotes').disabled,false);
 w.onmessage({data:{ok:false,rev:req.textRevision,error:'obsolete'}});assert.doesNotMatch(h.get('issues').textContent,/unavailable/);
});
for (const boundary of ['analyze','structureReport']) {
 test(`${boundary} exception creates the shared failure state and editing retries`,async()=>{
  let fail=true;const h=await harness({engine:{[boundary]:(...args)=>{if(fail)throw Error('injected '+boundary);return (boundary==='analyze'?analyze:writer.structureReport)(...args);}}});
  assert.match(h.get('issues').textContent,/Review is unavailable/);assert.match(h.get('articleOutline').textContent,/Outline is unavailable/);
  fail=false;await h.input('editor','We utilize recovered analysis.');await h.timers(150);assert.doesNotMatch(h.get('issues').textContent,/unavailable/);
 });
}

test('worker runtime error falls back through the real main analysis boundary',async()=>{
 const h=await harness({worker:true});const w=h.workers[0];w.onerror();
 assert.doesNotMatch(h.get('issues').textContent,/unavailable/);assert.equal(h.get('issues').attrs['aria-busy'],'false');
});
test('worker fallback exception fails current analysis without interrupting the active editor',async()=>{
 const h=await harness({worker:true,engine:{analyze(){throw Error('fallback');}}});const editor=h.get('editor');editor.focus();editor.setSelectionRange(2,4);editor.scrollTop=55;h.workers[0].onerror();
 assert.match(h.get('issues').textContent,/Review is unavailable/);assert.equal(h.document.activeElement,editor);assert.equal(editor.selectionStart,2);assert.equal(editor.selectionEnd,4);assert.equal(editor.scrollTop,55);
});
test('obsolete worker runtime error cannot fail pending newer text',async()=>{
 const h=await harness({worker:true,engine:{analyze(){throw Error('main');}}});await h.input('editor','New writing.');h.workers[0].onerror();
 assert.doesNotMatch(h.get('issues').textContent,/unavailable/);await h.timers(150);assert.match(h.get('issues').textContent,/unavailable/);
});
test('failure moves a removed outline control to its stable local region',async()=>{
 const h=await harness({worker:true});const w=h.workers[0],req=w.requests.at(-1),r=analyze(req);r.structure=writer.structureReport('# Heading');w.onmessage({data:{ok:true,rev:req.textRevision,result:r}});
 const heading=buttons(h.get('articleOutline'))[0];heading.focus();w.onmessage({data:{ok:false,rev:req.textRevision,error:'failure'}});
 assert.equal(h.document.activeElement,h.get('articleOutline'));assert.match(h.get('articleOutline').textContent,/Outline is unavailable/);
});
for (const rejectedKey of [MAIN,...BACKUPS,'blunted.prefs.v1']) {
 test(`portable write rejection at ${rejectedKey} always leaves a reloadable valid copy`,async()=>{
  const original=persisted('Last persisted article.');const h=await harness({portable:true,initialStorage:[[MAIN,original],...BACKUPS.map(k=>[k,original])],storageHooks:{setItem(k){if(k===rejectedKey)throw Error('write rejected');}}});
  await h.input('editor','New article.');await h.timers(800);
  const reloaded=await harness({portable:true,initialStorage:[...h.storage]});assert.ok(['Last persisted article.','New article.'].includes(reloaded.get('editor').value));
  assert.equal(h.get('editor').value,'New article.');
 });
}
test('aggregate quota pressure during replacement preserves persisted recovery and working text',async()=>{
 const original=persisted('Only valid recovery.');const initial=[[MAIN,'{corrupt'],[BACKUPS[0],'x'],[BACKUPS[1],'x'],[BACKUPS[2],original]];
 const quota=initial.reduce((size,[k,v])=>size+k.length+v.length,0)+50;
 const h=await harness({portable:true,initialStorage:initial,storageHooks:{setItem(k,v,storage){const size=[...storage].reduce((n,[key,value])=>n+(key===k?0:key.length+value.length),0)+k.length+v.length;if(size>quota)throw Error('QuotaExceededError');}}});
 await h.input('editor','Working article longer than available capacity. '.repeat(30));await h.timers(800);
 const reloaded=await harness({portable:true,initialStorage:[...h.storage]});assert.equal(reloaded.get('editor').value,'Only valid recovery.');assert.match(h.get('statusSave').textContent,/failed/);assert.match(h.get('editor').value,/Working article/);
});

test('portable article save acknowledgement is independent of preferences rejection',async()=>{
 const h=await harness({portable:true,storageHooks:{setItem(k){if(k==='blunted.prefs.v1')throw Error('preferences quota');}}});
 await h.input('editor','Article is durably stored despite preferences failure.');await h.timers(800);
 assert.equal(JSON.parse(h.storage.get(MAIN)).body,'Article is durably stored despite preferences failure.');
 assert.equal(h.get('statusSave').textContent,'Saved');assert.match(h.get('copyNote').textContent,/article was saved, but preferences could not/);
});
