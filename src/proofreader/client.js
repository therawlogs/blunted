// One active request and one latest pending request keep typing ahead of linting.
// Blob worker + embedded WASM data URL: no network or runtime downloads.
(function () {
  'use strict';
  var worker = null, sourceUrl = null, active = null, pending = null, nextId = 0;
  function fail(error) {
    if (worker) worker.terminate();
    worker = null;
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    sourceUrl = null;
    var jobs = [active, pending]; active = pending = null;
    jobs.forEach(function (job) { if (job) { clearTimeout(job.timer); job.reject(error); } });
  }
  function start() {
    if (active || !pending) return;
    active = pending; pending = null;
    try {
      if (!worker) {
        sourceUrl = URL.createObjectURL(new Blob([window.BluntedProofreaderSrc], {type: 'text/javascript'}));
        worker = new Worker(sourceUrl);
        var instance = worker;
        worker.onmessage = function (event) {
          if (worker !== instance) return;
          if (!active || event.data.id !== active.id) return;
          var job = active; active = null; clearTimeout(job.timer);
          if (event.data.ok) job.resolve(event.data.issues);
          else job.reject(new Error(event.data.error || 'Offline proofreading failed.'));
          start();
        };
        worker.onerror = function () { if (worker === instance) fail(new Error('The offline proofreading worker could not run.')); };
      }
      active.timer = setTimeout(function () { fail(new Error('Offline proofreading took too long.')); }, 20000);
      worker.postMessage({id: active.id, request: active.request});
    } catch (error) { fail(error); }
  }
  window.BluntedProofreader = {
    check: function (request) {
      return new Promise(function (resolve, reject) {
        if (pending) pending.reject(new Error('Superseded proofreading request.'));
        pending = {id: ++nextId, request: request, resolve: resolve, reject: reject};
        start();
      });
    },
    reset: function () { fail(new Error('Proofreading reset.')); },
  };
})();
