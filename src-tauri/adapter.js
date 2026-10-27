/* blunted Tauri adapter — loaded ONLY in the desktop shell (see
   scripts/bundle-tauri.mjs). Never part of dist/index.html.
   Bridges window.__BLUNTED_TAURI__ using the raw __TAURI__ IPC globals so the
   shell needs no npm dependencies. */
(function () {
  "use strict";
  var T = window.__TAURI__ || {};
  var core = T.core, ev = T.event;
  if (!core || !core.invoke) return; // not under Tauri: web app falls back

  function click(id) {
    var el = document.getElementById(id);
    if (el && el.click) el.click();
  }
  function editorValue() {
    var ta = document.getElementById("editor");
    return ta ? ta.value : "";
  }
  function docTitle() {
    var t = document.getElementById("docTitle");
    var name = (t && t.value ? t.value : "untitled")
      .replace(/[\\/:*?"<>|#%&{}$!'@+`=]/g, "").trim().slice(0, 80) || "untitled";
    name = name.replace(/[. ]+$/, "") || "untitled";
    if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(name)) name = "_" + name;
    return name + ".md";
  }

  window.__BLUNTED_TAURI__ = {
    loadDoc: async function () {
      var legacy = await core.invoke("blunted_load");
      // Folder selection must finish before migrating into that folder.
      if (legacy.needs_folder) {
        await core.invoke("blunted_choose_folder");
        legacy = await core.invoke("blunted_load");
      }
      var library = await core.invoke("blunted_library_load");
      return { doc: null, prefs: legacy.prefs, articles: library.articles,
        location: legacy.location, recovered: legacy.recovered || library.recovered.length > 0 };
    },
    // Availability-only retry: never runs folder selection or returns a document
    // for startup adoption. The UI keeps the active writing and preferences.
    retryLibrary: async function () {
      return core.invoke("blunted_library_retry");
    },
    library: true,
    chooseFolder: function () { return core.invoke("blunted_choose_folder"); },
    saveDoc: function (payload) {
      return core.invoke("blunted_library_save", { doc: payload.doc, prefs: payload.prefs });
    },
    savePrefs: function (prefs) { return core.invoke("blunted_save_prefs", { prefs: prefs }); },
    clearAll: function () { return core.invoke("blunted_clear"); },
    copyText: function (text) { return core.invoke("blunted_copy", { text: text }); },
    saveFile: function (name, content) {
      return core.invoke("blunted_save_as", { name: name, content: content });
    },
  };

  // Native menu -> web UI actions.
  function onMenu(id) {
    switch (id) {
      case "new": click("btnNew"); break;
      case "open": click("btnOpen"); break;
      case "save-as": click("btnDownload"); break;
      case "find": {
        // In-page find UI (same as Cmd/Ctrl+F). Falls back to editor focus
        // if the find bar is unavailable.
        if (!window.dispatchEvent(new Event("blunted-find"))) break;
        var ta2 = document.getElementById("findInput") || document.getElementById("editor");
        if (ta2) ta2.focus();
        break;
      }
      case "view-write": click("viewWrite"); break;
      case "view-review": click("viewReview"); break;
      case "font-inc":
      case "font-dec": {
        var r = document.getElementById("fontSize");
        if (r) {
          r.value = String((parseInt(r.value, 10) || 16) + (id === "font-inc" ? 1 : -1));
          r.dispatchEvent(new Event("input", { bubbles: true }));
        }
        break;
      }
      case "theme-system":
      case "theme-light":
      case "theme-dark": {
        var s = document.getElementById("themeSel");
        if (s) {
          s.value = id.replace("theme-", "");
          s.dispatchEvent(new Event("change", { bubbles: true }));
        }
        break;
      }
      default: break;
    }
  }

  if (ev && ev.listen) {
    ev.listen("blunted-close", async function () {
      if (window.BluntedWorkspace && await window.BluntedWorkspace.prepareClose()) core.invoke("blunted_close");
    });
    ev.listen("blunted-menu", function (e) { onMenu(e.payload); });
  }
})();
