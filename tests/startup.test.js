import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

const appSource = readFileSync(new URL("../src/ui/app.js", import.meta.url), "utf8");
const shellSource = readFileSync(new URL("../src/ui/shell.html", import.meta.url), "utf8");

class ElementStub {
  constructor(tagName = "div", failValue = false) {
    this.tagName = tagName.toUpperCase();
    this.dataset = {};
    this.style = { setProperty() {} };
    this.children = [];
    this.listeners = {};
    this.value = "";
    this.checked = false;
    this.hidden = false;
    this.open = false;
    this.textContent = "";
    this.classList = { add() {}, remove() {}, toggle() {} };
    if (failValue) {
      let value = "";
      Object.defineProperty(this, "value", {
        get() { return value; },
        set(next) {
          if (this.tagName === "SELECT" && this.id === "themeSel") throw new Error("injected preference control failure");
          value = next;
        },
      });
    }
  }
  addEventListener(type, callback) { this.listeners[type] = callback; }
  appendChild(child) { this.children.push(child); return child; }
  setAttribute() {}
  removeAttribute() {}
  click() {}
  focus() {}
  select() {}
  setSelectionRange() {}
  scrollIntoView() {}
  querySelector() { return null; }
  querySelectorAll() { return []; }
  getBoundingClientRect() { return { top: 0, left: 0, width: 100, height: 20 }; }
}

function makeHarness({ missingElement = null, savedPrefs = null, failPreferenceControl = false } = {}) {
  const nodes = new Map();
  const documentListeners = {};
  const store = new Map();
  if (savedPrefs) store.set("blunted.prefs.v1", JSON.stringify(savedPrefs));
  const document = {
    readyState: "loading",
    body: new ElementStub("body"),
    documentElement: new ElementStub("html"),
    activeElement: new ElementStub("textarea"),
    addEventListener(type, callback) { documentListeners[type] = callback; },
    getElementById(id) {
      if (id === missingElement) return null;
      if (!nodes.has(id)) {
        const tag = ["themeSel", "fontFamily", "lineHeight", "wpm", "fontSize"].includes(id) ? "select" : "div";
        const node = new ElementStub(tag, failPreferenceControl);
        node.id = id;
        nodes.set(id, node);
      }
      return nodes.get(id);
    },
    createElement(tag) { return new ElementStub(tag); },
    createTextNode(text) { const node = new ElementStub("#text"); node.textContent = text; return node; },
    createDocumentFragment() { return new ElementStub("#fragment"); },
    querySelector() { return null; },
    querySelectorAll() { return []; },
  };
  const window = {
    BluntedEngine: {
      MODES: { clear: { rules: { passive: true, adverb: true, intensifier: true, wordiness: true, hedge: "note", filler: true, simpler: true, repeated: true, todo: true } } },
      analyze() {
        return {
          sentences: [], issues: [], warnings: [],
          metrics: { eligibleWords: 0, totalWords: 0, proseSentences: 0, readingTime: 0, rawAri: null, rawFk: null, rawCl: null, rawSmog: null },
          config: { targetGrade: 8, customized: false }, engineVersion: "test", configVersion: 1,
        };
      },
    },
    addEventListener() {},
    confirm() { return true; },
  };
  const localStorage = {
    getItem(key) { return store.has(key) ? store.get(key) : null; },
    setItem(key, value) { store.set(key, value); },
    removeItem(key) { store.delete(key); },
  };
  const context = {
    window, document, localStorage, console, Date, Number, String, Array, Object, JSON, Math, RegExp,
    parseInt, parseFloat, setTimeout() { return 1; }, clearTimeout() {},
  };
  let exception = null;
  try { vm.runInNewContext(appSource, context); }
  catch (error) { exception = error; }
  return { document, nodes, documentListeners, exception };
}

test("missing file picker reproduces the startup exception without blocking F2", () => {
  const h = makeHarness({ missingElement: "filePick" });
  assert.match(h.exception.message, /addEventListener/);
  const handler = h.documentListeners.keydown;
  assert.equal(typeof handler, "function");
  assert.match(handler.toString(), /stepIssue\(e\.shiftKey \? -1 : 1\)/);
  for (const shiftKey of [false, true]) {
    let prevented = false;
    handler({ key: "F2", shiftKey, preventDefault() { prevented = true; } });
    assert.equal(prevented, true);
  }
  assert.equal(h.nodes.has("btnSample"), false, "the injected exception would have aborted later registration");
});

test("app shell supplies the file picker required by startup wiring", () => {
  assert.match(shellSource, /id="filePick"/);
});

test("preference initialization failure still applies the font and builds both rule panels", () => {
  const h = makeHarness({ failPreferenceControl: true });
  assert.equal(h.exception, null);
  h.documentListeners.DOMContentLoaded();
  assert.equal(h.document.body.dataset.font, "serif");
  assert.equal(h.nodes.get("railToggles").children.length, 5);
  assert.equal(h.nodes.get("ruleToggles").children.length, 9);
  assert.equal(typeof h.nodes.get("btnSample").listeners.click, "function");
});

test("fresh install defaults to Serif", () => {
  const h = makeHarness();
  assert.equal(h.exception, null);
  h.documentListeners.DOMContentLoaded();
  assert.equal(h.document.body.dataset.font, "serif");
  assert.equal(h.nodes.get("fontFamily").value, "serif");
});

test("saved font preference is restored during startup", () => {
  const h = makeHarness({ savedPrefs: { fontFamily: "mono" } });
  assert.equal(h.exception, null);
  h.documentListeners.DOMContentLoaded();
  assert.equal(h.document.body.dataset.font, "mono");
  assert.equal(h.nodes.get("fontFamily").value, "mono");
});
