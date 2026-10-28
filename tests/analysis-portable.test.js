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
async function harness({docs=[article('one'),article('two')],fail=false, deferred=false, portable=false,loadError=false,worker=false,proofreader=null,undoableEdits=false,savedPrefs=null,initialStorage=[],storageHooks={},engine={}}={}) {
  const nodes=new Map(), listeners={},timers=new Map(), saved=[],files=[],prefsSaved=[]; let timer=0,hold=null;
  const document={readyState:'loading',addEventListener(type,cb){(listeners[type]||=[]).push(cb);},getElementById(id){if(!nodes.has(id)){const n=this.createElement(id==='editor'?'textarea':'div');n.id=id;if(['workspaceDialog','preferencesDialog','metricsDialog','reviewOptionsDialog','leaveDialog','findingsView'].includes(id))n.hidden=true;nodes.set(id,n);}return nodes.get(id);},createElement(tag){const n=new Node(tag);n.document=this;return n;},createTextNode(t){const n=this.createElement('#text');n.textContent=t;return n;},createDocumentFragment(){return this.createElement('fragment');},querySelector(){return null;},querySelectorAll(){return [];},execCommand(command, unused, replacement){
    if(!undoableEdits || !['insertText','delete'].includes(command))return false;
    const editor=this.getElementById('editor');editor.setRangeText(command==='delete'?'':replacement,editor.selectionStart,editor.selectionEnd);
    for(const listener of editor.listeners.input||[])listener({target:editor});
    return true;
  }};
  document.body=document.createElement('body'); document.documentElement=document.createElement('html'); document.activeElement=document.body;
  const bridge={library:true,loadDoc:async()=>{if(loadError)throw Error('load failed');return {articles:structuredClone(docs),prefs:structuredClone(savedPrefs)};},saveDoc:async payload=>{if(fail)throw Error('disk full');if(deferred)await new Promise(r=>hold=r);saved.push(structuredClone(payload.doc));},savePrefs:async value=>{prefsSaved.push(structuredClone(value));},saveFile:async(name,content)=>{files.push({name,content});return true;},clearAll:async()=>{}};
  const window={BluntedEngine:{analyze,MODES,...writer,...engine},__BLUNTED_TAURI__:portable?null:bridge,addEventListener(type,cb){(listeners['window:'+type]||=[]).push(cb);},confirm(){return true;},prompt(){return 'Renamed';}};
  if(proofreader)window.BluntedProofreader=proofreader;
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


test('Clarity previews the exact replacement and Apply saves the edited writing', async()=>{
 const h=await harness({docs:[article('one','We utilize this method.')],undoableEdits:true});
 assert.match(h.get('issues').textContent,/OriginalutilizeProposeduse/);
 const apply=buttons(h.get('issues')).find(b=>b.id==='applyNote');assert.ok(apply);
 await apply.fire('click');await h.timers(800);
 assert.equal(h.get('editor').value,'We use this method.');assert.equal(h.saved.at(-1).body,'We use this method.');
 assert.match(h.get('copyNote').textContent,/Undo with Cmd\+Z/);
});
test('Structure uses the same preview and Apply path for heading gaps', async()=>{
 const h=await harness({docs:[article('one','# Title\n\n  #### Café *birds* ###\n\nBody.')],undoableEdits:true});
 h.get('reviewerSel').value='structure';await h.get('reviewerSel').fire('change');
 assert.match(h.get('issues').textContent,/Original  #### Café \*birds\* ###Proposed  ## Café \*birds\* ###/);
 await buttons(h.get('issues')).find(b=>b.id==='applyNote').fire('click');await h.timers(150);
 assert.equal(h.get('editor').value,'# Title\n\n  ## Café *birds* ###\n\nBody.');
 assert.equal(buttons(h.get('issues')).some(b=>b.id==='applyNote'),false);
});
test('old Apply closure cannot edit after unrelated writing changes', async()=>{
 const h=await harness({docs:[article('one','We utilize this method.')],undoableEdits:true});
 const apply=buttons(h.get('issues')).find(b=>b.id==='applyNote');
 await h.input('editor','We utilize this method. More writing.');await apply.fire('click');
 assert.equal(h.get('editor').value,'We utilize this method. More writing.');
});
test('unsupported undoable edit retains writing and restores selection', async()=>{
 const h=await harness({docs:[article('one','We utilize this method.')]});
 h.get('editor').setSelectionRange(1,3);h.get('editor').scrollTop=25;
 await buttons(h.get('issues')).find(b=>b.id==='applyNote').fire('click');
 assert.equal(h.get('editor').value,'We utilize this method.');assert.equal(h.get('editor').selectionStart,1);assert.equal(h.get('editor').selectionEnd,3);assert.equal(h.get('editor').scrollTop,25);
 assert.match(h.get('copyNote').textContent,/could not apply an undoable change/);
});
test('Clarity deletion removes the previewed neighboring space', async()=>{
 const h=await harness({docs:[article('one','We ran quickly today.')],undoableEdits:true});
 assert.match(h.get('issues').textContent,/Proposed\(Remove this text\)/);
 await buttons(h.get('issues')).find(b=>b.id==='applyNote').fire('click');
 assert.equal(h.get('editor').value,'We ran today.');
});

test('a post-Apply analysis failure retains the corrected writing and saving', async()=>{
 let fail=false;const h=await harness({docs:[article('one','We utilize this method.')],undoableEdits:true,engine:{analyze(req){if(fail)throw Error('analysis unavailable');return analyze(req);}}});
 fail=true;await buttons(h.get('issues')).find(b=>b.id==='applyNote').fire('click');await h.timers(800);
 assert.equal(h.get('editor').value,'We use this method.');assert.match(h.get('issues').textContent,/Review is unavailable/);
 assert.equal(h.saved.at(-1).body,'We use this method.');
});

test('Apply cannot interrupt active IME composition', async()=>{
 const h=await harness({docs:[article('one','We utilize this method.')],undoableEdits:true});
 const apply=buttons(h.get('issues')).find(b=>b.id==='applyNote');
 await h.get('editor').fire('compositionstart');await apply.fire('click');
 assert.equal(h.get('editor').value,'We utilize this method.');
 await h.get('editor').fire('compositionend');await apply.fire('click');
 assert.equal(h.get('editor').value,'We use this method.');
});


const spellingIssue = text => ({from:text.indexOf('recieve'),to:text.indexOf('recieve')+7,exactText:'recieve',ruleId:'harper:SpellCheck',category:'spelling',explanation:'Possible misspelling.',fix:{replacement:'receive',replacements:['receive','relieve']}});
test('asynchronous spelling checks cannot render stale notes after a new edit', async()=>{
 const requests=[];const h=await harness({docs:[article('one','I recieve it.')],proofreader:{check:request=>new Promise((resolve,reject)=>requests.push({request,resolve,reject})),reset(){}}});
 await h.input('editor','We receive it.');await h.timers(150);
 requests[0].resolve([spellingIssue(requests[0].request.text)]);await ticks();assert.equal(h.get('issues').textContent,'');
 requests[1].resolve([]);await ticks();assert.match(h.get('proofreadingStatus').textContent,/checked offline/);assert.doesNotMatch(h.get('issues').textContent,/recieve/);
 requests[0].reject(Error('obsolete'));assert.equal(h.get('editor').value,'We receive it.');
});
test('spelling alternatives update the preview and Apply uses the selected replacement', async()=>{
 const h=await harness({docs:[article('one','I recieve it.')],undoableEdits:true,proofreader:{check:async request=>request.text.includes('recieve')?[spellingIssue(request.text)]:[],reset(){}}});
 const label=h.get('issues').children.find(n=>n.className==='correction-choice');assert.ok(label);
 const choice=label.children[0];choice.value='relieve';await choice.fire('change');assert.match(h.get('issues').textContent,/Proposedrelieve/);
 await buttons(h.get('issues')).find(b=>b.id==='applyNote').fire('click');assert.equal(h.get('editor').value,'I relieve it.');
});
test('Keep this word is article-scoped, saved with the article and never rewrites writing', async()=>{
 const proofreader={check:async request=>request.personalWords.includes('recieve')?[]:[spellingIssue(request.text)],reset(){}};
 const h=await harness({docs:[article('one','I recieve it.')],proofreader});
 await buttons(h.get('issues')).find(b=>b.textContent==='Keep this word').fire('click');await h.timers(800);
 assert.equal(h.get('editor').value,'I recieve it.');assert.ok(h.saved.at(-1).personalWords.includes('recieve'));assert.doesNotMatch(h.get('issues').textContent,/Possible misspelling/);
});
test('proofreading failure clears Apply but keeps writing, export and saving; editing retries', async()=>{
 let fail=false;const h=await harness({docs:[article('one','I recieve it.')],proofreader:{check:async request=>{if(fail)throw Error('WASM unavailable');return request.text.includes('recieve')?[spellingIssue(request.text)]:[];},reset(){}}});
 fail=true;await h.input('editor','I recieve it. More writing.');await h.timers(800);
 assert.match(h.get('issues').textContent,/Review is unavailable/);assert.match(h.get('proofreadingStatus').textContent,/could not run/);assert.equal(buttons(h.get('issues')).some(b=>b.id==='applyNote'),false);
 assert.equal(h.saved.at(-1).body,'I recieve it. More writing.');await h.click('btnDownload');assert.ok(h.files.at(-1).content.includes('More writing'));
 fail=false;await h.input('editor','We receive it.');await h.timers(150);assert.doesNotMatch(h.get('issues').textContent,/unavailable/);
});
test('proofreading settings persist and switching both checks off keeps other reviews working', async()=>{
 const requests=[];const h=await harness({proofreader:{check:async request=>{requests.push(request);return [];},reset(){}}});
 h.get('proofreadingDialect').value='british';await h.get('proofreadingDialect').fire('change');await h.timers(200);
 assert.equal(requests.at(-1).dialect,'british');assert.equal(h.prefsSaved.at(-1).proofreadingDialect,'british');
 h.get('optSpelling').checked=false;await h.get('optSpelling').fire('change');h.get('optGrammar').checked=false;await h.get('optGrammar').fire('change');await h.timers(200);
 assert.equal(h.prefsSaved.at(-1).spelling,false);assert.equal(h.prefsSaved.at(-1).grammar,false);assert.match(h.get('proofreadingStatus').textContent,/checks are off/);assert.equal(h.get('allNotes').disabled,false);
});

test('editing the title immediately invalidates a heading correction before analysis debounce', async()=>{
 const original='### Section\n\nBody.';
 const h=await harness({docs:[{...article('one',original),title:''}],undoableEdits:true});
 h.get('reviewerSel').value='structure';await h.get('reviewerSel').fire('change');
 assert.match(h.get('issues').textContent,/Proposed# Section/);
 const oldApply=buttons(h.get('issues')).find(b=>b.id==='applyNote');assert.ok(oldApply);
 await h.input('docTitle','An article title');await oldApply.fire('click');
 assert.equal(h.get('editor').value,original,'the pre-title heading fix must not apply during the150ms debounce');
 await h.timers(150);assert.match(h.get('issues').textContent,/Proposed## Section/);
 await buttons(h.get('issues')).find(b=>b.id==='applyNote').fire('click');
 assert.equal(h.get('editor').value,'## Section\n\nBody.');assert.equal(h.get('docTitle').value,'An article title');
});
