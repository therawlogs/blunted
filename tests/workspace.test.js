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

test('desktop library opens independently, searches titles, creates and renames articles',async()=>{
 const h=await harness();assert.equal(h.get('libraryPanel').hidden,false);assert.equal(h.get('editor').value,'A saved article.');
 await h.input('librarySearch','two');assert.match(h.get('libraryList').textContent,/two/);assert.doesNotMatch(h.get('libraryList').textContent,/one/);
 await h.input('librarySearch','');await buttons(h.get('libraryList')).find(b=>b.textContent==='Rename').fire('click');await ticks();assert.equal(h.get('docTitle').value,'Renamed');
 await h.click('libraryNew');assert.equal(h.get('editor').value,'');assert.equal(h.document.body.dataset.review,'write');assert.ok(h.saved.some(a=>a.id.startsWith('article-')));
});
test('failed save prevents switching and leaves current text available to export',async()=>{
 const h=await harness({fail:true});await h.input('editor','Unsaved changes must survive.');
 const switching=buttons(h.get('libraryList')).find(b=>b.attrs['aria-label']==='Open two').fire('click');await ticks();await h.click('leaveKeep');await switching;await ticks();
 assert.equal(h.get('editor').value,'Unsaved changes must survive.');assert.match(h.get('statusSave').textContent,/failed/);assert.equal(h.saved.length,0);
});
test('an old save acknowledgement cannot mark newer text saved',async()=>{
 const h=await harness({deferred:true});await h.input('editor','First edit.');await h.timers(800);
 await h.input('editor','Second edit.');h.release();await ticks();
 assert.notEqual(h.get('statusSave').textContent,'Saved');await h.timers(800);assert.equal(h.saved.at(-1).body,'Second edit.');assert.equal(h.get('statusSave').textContent,'Saved');
});
test('trash keeps article contents and restore returns it to the active library',async()=>{
 const h=await harness();await buttons(h.get('libraryList')).find(b=>b.textContent==='Move to trash').fire('click');await ticks();
 assert.ok(h.saved.at(-1).trashedAt);assert.equal(h.saved.at(-1).body,'A saved article.');
 h.get('libraryTrash').checked=true;await h.get('libraryTrash').fire('change');
 await buttons(h.get('libraryList')).find(b=>b.textContent==='Restore').fire('click');await ticks();assert.equal(h.saved.at(-1).trashedAt,null);
});
test('Write/Review/Read preserve textarea contents, caret and scroll without replacing its node',async()=>{
 const h=await harness();const editor=h.get('editor');await h.input('editor','# Heading\n\nBody with **emphasis**.');editor.setSelectionRange(3,8);editor.scrollTop=90;
 await h.click('viewPreview');assert.match(h.get('readingPreview').textContent,/Heading/);assert.equal(h.get('editorWrap').hidden,true);
 await h.click('viewReview');assert.equal(h.get('editor'),editor);assert.equal(editor.selectionStart,3);assert.equal(editor.selectionEnd,8);assert.equal(editor.scrollTop,90);assert.match(editor.value,/\*\*emphasis\*\*/);
});
test('reviewers expose passage actions, dismissals persist until the passage changes',async()=>{
 const h=await harness();await h.input('editor','# Article\n\nIt is important to note that this article explains a method.\n\n### Gap\n\nLast paragraph.');await h.timers(150);await h.click('viewReview');
 const dismiss=buttons(h.get('issues')).find(b=>b.textContent==='Dismiss');assert.ok(dismiss);await dismiss.fire('click');await h.timers(800);assert.equal(h.saved.at(-1).dismissedNotes.length,1);
 h.get('reviewerSel').value='structure';await h.get('reviewerSel').fire('change');assert.match(h.get('issues').textContent,/Heading level 3/);assert.doesNotMatch(h.get('issues').textContent,/Self-review prompt/);h.get('findingGroup').value='prompts';await h.get('findingGroup').fire('change');assert.match(h.get('issues').textContent,/Self-review prompt/);
 await h.input('editor',h.get('editor').value.replace('explains','describes'));await h.timers(150);await h.timers(800);assert.equal(h.saved.at(-1).dismissedNotes.length,0);
});
test('whole-library restore offers copies or skips without overwriting existing IDs',async()=>{
 const h=await harness();const incoming=article('one','Imported distinct content.');
 h.get('libraryPick').files=[{content:JSON.stringify({app:'blunted-library',version:1,articles:[incoming]})}];await h.get('libraryPick').fire('change');h.get('restoreConflict').value='copy';await h.click('restoreConfirm');
 const copy=h.saved.find(a=>a.body===incoming.body);assert.ok(copy);assert.notEqual(copy.id,'one');assert.match(copy.title,/imported copy/);
 await h.click('libraryBackup');const backup=JSON.parse(h.files.at(-1).content);assert.equal(backup.articles.length,3);assert.equal(backup.articles.find(a=>a.id==='one').body,'A saved article.');
 h.get('libraryPick').files=[{content:JSON.stringify({app:'blunted-library',version:1,articles:[incoming]})}];await h.get('libraryPick').fire('change');h.get('restoreConflict').value='skip';const n=h.saved.length;await h.click('restoreConfirm');assert.equal(h.saved.length,n);
});
test('load failure blocks writes and portable HTML retains the single-draft storage keys',async()=>{
 const broken=await harness({loadError:true});await broken.input('editor','Keep this text.');await broken.timers(800);assert.equal(broken.saved.length,0);assert.match(broken.get('copyNote').textContent,/unavailable|could not be loaded/);
 const web=await harness({portable:true});await web.input('editor','Portable draft 🐦');await web.timers(800);assert.equal(JSON.parse(web.storage.get('blunted.doc.v1')).body,'Portable draft 🐦');assert.equal(web.storage.has('blunted.library'),false);
});

test('edits arriving during a switch save keep the current article open',async()=>{
 const h=await harness({deferred:true});await h.input('editor','Before switch.');
 const switching=buttons(h.get('libraryList')).find(b=>b.attrs['aria-label']==='Open two').fire('click');await ticks();
 assert.equal(h.get('editor').readOnly,true);
 await h.input('editor','A late input event.');h.release();await switching;await ticks();
 assert.equal(h.get('editor').value,'A late input event.');assert.equal(h.get('editor').readOnly,false);assert.match(h.get('copyNote').textContent,/changed while saving/);
});
test('native close waits for saving and refuses to lose text on a failed write',async()=>{
 const h=await harness({fail:true});h.window.confirm=()=>false;await h.input('editor','Keep before closing.');const closing=h.window.BluntedWorkspace.prepareClose();await ticks();await h.click('leaveKeep');assert.equal(await closing,false);
 h.setFail(false);assert.equal(await h.window.BluntedWorkspace.prepareClose(),true);assert.equal(h.saved.at(-1).body,'Keep before closing.');
});
test('backup preference restore is opt-in and reaches the native preferences writer',async()=>{
 const h=await harness();let preferences=null;h.bridge.savePrefs=async value=>{preferences=value;};
 h.get('libraryPick').files=[{content:JSON.stringify({app:'blunted-library',version:1,articles:[],settings:{prefs:{theme:'dark',fontFamily:'mono'}}})}];await h.get('libraryPick').fire('change');
 h.get('restoreSettings').checked=true;await h.click('restoreConfirm');assert.equal(preferences.theme,'dark');assert.equal(h.document.body.dataset.font,'mono');
});

test('a failed-save close offers an explicit discard choice after export',async()=>{
 const h=await harness({fail:true});await h.input('editor','Export before leaving.');let message='';h.window.confirm=m=>{message=m;return true;};
 const closing=h.window.BluntedWorkspace.prepareClose();await ticks();await h.click('leaveDiscard');assert.equal(await closing,true);assert.equal(h.saved.length,0);
});

test('worker responses from before an edit cannot restore stale findings during debounce',async()=>{
 const h=await harness({worker:true,docs:[article('one','It is important to note that this old sentence is here.')]});
 const worker=h.workers[0];const old=worker.requests[0];
 await h.input('editor','We utilize a new method.');
 worker.onmessage({data:{ok:true,rev:old.textRevision,result:analyze(old)}});
 assert.equal(h.get('issues').textContent,'');
 await h.timers(150);const current=worker.requests.at(-1);const result=analyze(current);result.structure=writer.structureReport(current.text);
 worker.onmessage({data:{ok:true,rev:current.textRevision,result}});
 assert.match(h.get('issues').textContent,/utilize/);assert.doesNotMatch(h.get('issues').textContent,/old sentence/);
});

test('all findings remain reachable beyond 400 through incremental loading',async()=>{
 const h=await harness();await h.input('editor','We utilize this method.\n\n'.repeat(450));await h.timers(150);await h.click('viewReview');
 assert.equal(h.get('issuePosition').textContent,'1 / 450');await h.click('allNotes');assert.equal(h.get('findingsList').children.length,50);
 for(let i=0;i<8;i++)await h.click('loadMoreNotes');assert.equal(h.get('findingsList').children.length,450);assert.equal(h.get('loadMoreNotes').hidden,true);
 await buttons(h.get('findingsList')).at(-1).fire('click');assert.equal(h.get('issuePosition').textContent,'450 / 450');
});
test('review selection survives an unrelated edit and prompts are separate from findings',async()=>{
 const h=await harness();await h.input('editor','It is important to note that this report was written in order to utilize the method.');await h.timers(150);await h.click('viewReview');await h.click('nextIssue');assert.match(h.get('issues').textContent,/was written/);
 await h.input('editor',h.get('editor').value+'\n\nA new paragraph.');await h.timers(150);assert.match(h.get('issues').textContent,/was written/);assert.equal(h.get('issuePosition').textContent,'2 / 4');
 h.get('reviewerSel').value='structure';await h.get('reviewerSel').fire('change');assert.equal(h.get('issueCount').textContent,'(0)');assert.match(h.get('issues').textContent,/Self-review prompts/);
});
test('dismissed notes can be inspected and individually restored without resetting other decisions',async()=>{
 const h=await harness();await h.input('editor','We utilize this method.');await h.timers(150);await h.click('viewReview');
 await buttons(h.get('issues')).find(b=>b.textContent==='Dismiss').fire('click');assert.match(h.get('issues').textContent,/No remaining findings/);
 h.get('findingGroup').value='dismissed';await h.get('findingGroup').fire('change');assert.match(h.get('issues').textContent,/utilize/);
 await buttons(h.get('issues')).find(b=>b.textContent==='Restore note').fire('click');h.get('findingGroup').value='remaining';await h.get('findingGroup').fire('change');assert.match(h.get('issues').textContent,/utilize/);
});
test('last opened article and its position restore independently from modification dates',async()=>{
 const prefs={workspace:{activeId:'two',positions:{two:{start:2,end:5,scroll:40,reviewer:'structure'}}}};
 const h=await harness({savedPrefs:prefs});assert.equal(h.get('docTitle').value,'two');assert.equal(h.get('editor').selectionStart,2);assert.equal(h.get('editor').selectionEnd,5);assert.equal(h.get('editor').scrollTop,40);assert.equal(h.get('reviewerSel').value,'structure');
 await h.click('viewReview');await h.timers(200);assert.equal(h.saved.length,0);assert.equal(h.prefsSaved.at(-1).workspace.activeId,'two');
});
test('private writing can be discarded explicitly to switch without enabling saving',async()=>{
 const h=await harness();h.get('optPrivate').checked=true;await h.get('optPrivate').fire('change');await h.input('editor','A private working copy.');
 const switching=buttons(h.get('libraryList')).find(b=>b.attrs['aria-label']==='Open two').fire('click');await ticks();await h.click('leaveDiscard');await switching;
 assert.equal(h.get('docTitle').value,'two');assert.equal(h.saved.length,0);assert.equal(h.get('optPrivate').checked,true);
});

test('dismissing one repeated passage does not dismiss the other identical passage',async()=>{
 const h=await harness();await h.input('editor','We utilize this method.\n\nWe utilize this method.');await h.timers(150);await h.click('viewReview');assert.equal(h.get('issueCount').textContent,'(2)');
 await buttons(h.get('issues')).find(b=>b.textContent==='Dismiss').fire('click');assert.equal(h.get('issueCount').textContent,'(1)');assert.match(h.get('issues').textContent,/utilize/);
});
test('old dismissal keys survive and can be restored individually',async()=>{
 const body='We utilize this method.\n\nWe utilize this method.';const issue=analyze({text:body}).issues.find(i=>i.category==='simpler');
 const old=article('one',body);old.dismissedNotes=['clarity:'+writer.dismissalKey(issue,body)];const h=await harness({docs:[old]});await h.click('viewReview');assert.equal(h.get('issueCount').textContent,'(0)');
 h.get('findingGroup').value='dismissed';await h.get('findingGroup').fire('change');await buttons(h.get('issues')).find(b=>b.textContent==='Restore note').fire('click');assert.equal(h.get('issueCount').textContent,'(1)');assert.match(h.get('issues').textContent,/utilize/);
});

test('opening Read persists its view separately from article changes',async()=>{
 const h=await harness();await h.click('viewPreview');await h.timers(200);
 assert.equal(h.prefsSaved.at(-1).workspace.positions.one.reading,true);assert.equal(h.saved.length,0);
});
