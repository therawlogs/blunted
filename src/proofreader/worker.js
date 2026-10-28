import {checkEnglish} from './engine.js';

// The only fetch Harper needs is its embedded WASM data URL. Fail closed if a
// dependency ever attempts to load a remote binary, rules, dictionary or service.
const localFetch = self.fetch.bind(self);
self.fetch = function (input, options) {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  if (!url.startsWith('data:application/wasm;base64,')) return Promise.reject(new Error('Proofreading is offline: external requests are disabled.'));
  return localFetch(input, options);
};

self.onmessage = async function ({data}) {
  try { self.postMessage({id: data.id, ok: true, issues: await checkEnglish(data.request)}); }
  catch (error) { self.postMessage({id: data.id, ok: false, error: String(error && error.message || error)}); }
};
