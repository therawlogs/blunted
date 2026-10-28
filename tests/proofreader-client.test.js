import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source = readFileSync(new URL('../src/proofreader/client.js', import.meta.url), 'utf8');
function harness() {
  const workers = [], timers = new Map(), revoked = []; let timer = 0;
  class Worker { constructor(url) { this.url = url; this.requests = []; workers.push(this); } postMessage(request) { this.requests.push(request); } terminate() { this.terminated = true; } }
  const window = {BluntedProofreaderSrc: 'worker source'};
  vm.runInNewContext(source, {window, Worker, Blob: class {}, URL: {createObjectURL: () => 'blob:' + workers.length, revokeObjectURL: url => revoked.push(url)}, setTimeout(fn) { timers.set(++timer, fn); return timer; }, clearTimeout(id) { timers.delete(id); }});
  return {client: window.BluntedProofreader, workers, timers, revoked, respond(issues = []) { const worker = workers.at(-1); worker.onmessage({data: {id: worker.requests.at(-1).id, ok: true, issues}}); }};
}
test('proofreader queue retains only one active and the latest pending request', async () => {
  const h = harness(); const first = h.client.check({text: 'first'});
  const obsolete = h.client.check({text: 'obsolete'}); const rejected = assert.rejects(obsolete, /Superseded/);
  const latest = h.client.check({text: 'latest'}); await rejected;
  assert.equal(h.workers[0].requests.length, 1);
  h.respond([{exactText: 'first'}]); await first;
  assert.equal(h.workers[0].requests[1].request.text, 'latest'); h.respond(); await latest;
  assert.equal(h.timers.size, 0);
});
test('worker failure rejects pending checks and a new edit can create a fresh worker', async () => {
  const h = harness(); const first = h.client.check({text: 'first'}), latest = h.client.check({text: 'latest'});
  const rejected = [assert.rejects(first, /could not run/), assert.rejects(latest, /could not run/)];
  const old = h.workers[0]; old.onerror(); await Promise.all(rejected);
  assert.equal(old.terminated, true); assert.equal(h.revoked.length, 1);
  const next = h.client.check({text: 'recovered'}); old.onerror();
  assert.notEqual(h.workers[1].terminated, true, 'an obsolete worker error must not kill the replacement');
  h.respond(); await next;
});
test('timeout releases the worker and reset rejects pending writing without retaining it', async () => {
  const h = harness(); const stalled = h.client.check({text: 'stalled'}); const rejected = assert.rejects(stalled, /too long/);
  [...h.timers.values()][0](); await rejected;
  const working = h.client.check({text: 'private writing'}); const reset = assert.rejects(working, /reset/);
  h.client.reset(); await reset; assert.equal(h.workers.at(-1).terminated, true); assert.equal(h.timers.size, 0);
});
