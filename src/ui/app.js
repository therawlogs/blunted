/* blunted UI — dependency-free. Expects window.BluntedEngine and
   window.BluntedWorkerSrc (both inlined by scripts/build.mjs).
   No network, no clipboard/FS access except on explicit user actions. */
(function () {
  "use strict";
  var Engine = window.BluntedEngine;
  var $ = function (id) { return document.getElementById(id); };

  var editor = $("editor"), backdrop = $("backdrop"), editorWrap = $("editorWrap");
  var issuesEl = $("issues"), issueCount = $("issueCount");
  var gradeMain = $("gradeMain"), gradeSub = $("gradeSub"), detailsList = $("detailsList");
  var statusWords = $("statusWords"), statusGrade = $("statusGrade"), statusSent = $("statusSent"),
      statusTime = $("statusTime"), statusSave = $("statusSave");
  var copyNote = $("copyNote"), srStatus = $("srStatus");

  var MODES = Engine.MODES;
  var SINGLE_MODE = "clear";

  // Migrate legacy stored mode ids (essays/social/message/email/research)
  // to the single preset. Unknown values also fall through to "clear".
  function normalizeMode(id) {
    if (id && MODES[id]) return id;
    if (id === "essays") return "essay";
    return SINGLE_MODE;
  }

  // ---------- state ----------
  var state = {
    id: articleId(),
    title: "", modeId: SINGLE_MODE, body: "",
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    ruleOverrides: {}, ignoredRuleIds: [], ignoredTerms: [], personalWords: [],
  };
  var prefs = { theme: "system", fontSize: 16, fontFamily: "serif", lineHeight: 1.8, wpm: 200, review: "write", privateSession: false, autosave: true, includeQuotes: false, includeHeader: false, exportHeadline: true, workspace: { activeId: "", positions: {} }, activeProfile: "clear", profiles: {}, proofreadingDialect: "american", spelling: true, grammar: true };
  var articles = [], libraryReady = false, loadFailed = false, transitioning = false;
  var saveQueue = Promise.resolve(), pendingRestore = null, previewOpen = false;
  var clearing = false, persistenceEpoch = 0, restoreReadRevision = 0, closePending = false, importing = false, localDataCleared = false;
  var reviewer = "clarity", activeNote = null, findingsLimit = 50;
  var panelOpener = null, panelOpeners = {}, prefsTimer = null, leaveResolve = null, workspaceTimer = null;
  var dirty = false;            // unsaved changes vs storage
  var lastAnalysis = null, analysisFailureRev = -1;
  var currentRev = 0;           // text revision counter (local)
  var lastWorkerRev = 0;
  var selectedIssue = -1;
  var composing = false;
  var activeCatFilter = "all";  // category summary tap-to-filter

  // Register document shortcuts before wiring optional UI controls. A
  // malformed/missing control must not prevent F2 or the other shortcuts
  // from being available for the rest of the session.
  document.addEventListener("keydown", function (e) {
    var mod = e.metaKey || e.ctrlKey;
    if (e.key === "F2") {
      e.preventDefault();
      stepIssue(e.shiftKey ? -1 : 1);
      return;
    }
    if (mod && (e.key === "s" || e.key === "S")) {
      if (tauri()) return;
      e.preventDefault();
      $("btnDownload").click();
      return;
    }
    if (mod && (e.key === "f" || e.key === "F")) {
      e.preventDefault();
      if ($("findBar").hidden) openFind();
      else { $("findInput").focus(); try { $("findInput").select(); } catch (err) {} }
      return;
    }
    if (e.key === "Escape") {
      if (!$("findBar").hidden) { closeFind(); return; }
      var open = document.querySelector("details[open]");
      if (open) { open.removeAttribute("open"); var summary=open.querySelector("summary"); if(summary) summary.focus(); e.preventDefault(); }
    }
  });

  // ---------- storage adapter ----------
  // Web backups rotate across three slots (newest first). The slots are
  // READ on corrupt/missing main docs — a backup is only useful if it can
  // restore. Tauri shells keep the same 3-slot rotation in app-data files.
  var LS_DOC = "blunted.doc.v1", LS_PREFS = "blunted.prefs.v1";
  var LS_BACKUPS = ["blunted.backup.v1a", "blunted.backup.v1b", "blunted.backup.v1c"];
  var storageOK = true, storageMsg = "";

  function tauri() { return window.__BLUNTED_TAURI__ || null; }

  function parseDoc(s) {
    if (!s) return null;
    try {
      var d = JSON.parse(s);
      return (d && typeof d.body === "string") ? d : null;
    } catch (e) { return null; }
  }

  var store = {
    load: function () {
      var t = tauri();
      if (t && t.loadDoc) return t.loadDoc(); // {doc, prefs, recovered?} or null; may throw
      var prefsOut = null;
      try {
        var p = localStorage.getItem(LS_PREFS);
        prefsOut = p ? JSON.parse(p) : null;
      } catch (e) { prefsOut = null; }
      var doc = null, recovered = false;
      try {
        doc = parseDoc(localStorage.getItem(LS_DOC));
        if (!doc) {
          for (var i = 0; i < LS_BACKUPS.length; i++) {
            try { doc = parseDoc(localStorage.getItem(LS_BACKUPS[i])); } catch (e) { doc = null; }
            if (doc) { recovered = true; break; }
          }
        }
      } catch (e) { doc = null; }
      if (!doc && !prefsOut) {
        // nothing stored at all — fresh start, not a failure
        return { doc: null, prefs: null };
      }
      if (!doc) {
        storageOK = false; storageMsg = "Saved draft unreadable and no backup worked: download a copy before writing.";
        return { doc: null, prefs: prefsOut, corrupt: true };
      }
      return { doc: doc, prefs: prefsOut, recovered: recovered };
    },
    save: function () {
      if (clearing) return Promise.resolve(false);
      if (!prefs.autosave) { setSaveState("Autosave off"); return Promise.resolve(false); }
      if (prefs.privateSession) { setSaveState("Private session — not saved"); return Promise.resolve(false); }
      var t = tauri();
      if (loadFailed || !libraryReady && t && t.library) { setSaveState("Storage unavailable — export your article"); return Promise.resolve(false); }
      var payload = JSON.parse(JSON.stringify({ doc: state, prefs: prefs }));
      if (t && t.saveDoc) {
        setSaveState("Saving…");
        var snapshot = JSON.stringify(payload.doc);
        var job = saveQueue.then(function () { return t.saveDoc({ doc: payload.doc, prefs: JSON.parse(JSON.stringify(prefs)) }); }).then(function (result) {
          $("libraryRecovery").hidden = true;
          var i = articles.findIndex(function (a) { return a.id === payload.doc.id; });
          if (i < 0) articles.push(payload.doc); else articles[i] = payload.doc;
          if (state.id === payload.doc.id && JSON.stringify(state) === snapshot) { setSaveState("Saved"); dirty = false; }
          if (result && result.preferencesSaved === false) copyNote.textContent = "Your article was saved, but preferences could not be saved.";
          if (!$("workspaceDialog").hidden && document.activeElement === editor) renderLibrary();
          return true;
        }, function () { setLibraryUnavailable(false); setSaveState("Saving failed — export your article to keep a copy."); return false; });
        saveQueue = job.then(function () {});
        return job;
      }
      try {
        // Read and validate history before any write. Main replacement is the
        // durability boundary: never rotate over a recovered backup before it.
        var previous = [];
        [LS_DOC].concat(LS_BACKUPS).forEach(function (key) {
          var raw = localStorage.getItem(key);
          if (parseDoc(raw)) previous.push(raw);
        });
        localStorage.setItem(LS_DOC, JSON.stringify(payload.doc));
        // Main is durable now. Best-effort history contains valid documents only;
        // quota failure at any rotation boundary still leaves that main copy.
        try {
          for (var slot = Math.min(previous.length, LS_BACKUPS.length) - 1; slot >= 0; slot--) {
            localStorage.setItem(LS_BACKUPS[slot], previous[slot]);
          }
        } catch (e) { /* successful main replacement remains available */ }
        setSaveState("Saved"); dirty = false; storageOK = true; storageMsg = "";
        try { localStorage.setItem(LS_PREFS, JSON.stringify(prefs)); }
        catch (e) { copyNote.textContent = "Your article was saved, but preferences could not be saved."; }
        return Promise.resolve(true);
      } catch (e) {
        storageOK = false;
        setSaveState("Saving failed");
        storageMsg = "Saving failed (storage full or blocked): Download .md to keep a copy.";
        return Promise.resolve(false);
      }
    },
    clear: function () {
      var t = tauri();
      if (t && t.clearAll) return t.clearAll();
      var removed = [], absent = [], failed = [], unknown = [];
      [LS_DOC, LS_PREFS].concat(LS_BACKUPS, ["blunted.backup.v1"]).forEach(function (key) {
        var exists;
        try { exists = localStorage.getItem(key) !== null; }
        catch (e) { unknown.push(key); failed.push(key + ": contents could not be checked; removal not attempted"); return; }
        if (!exists) { absent.push(key); return; }
        try { localStorage.removeItem(key); removed.push(key); }
        catch (e) { failed.push(key + ": " + (e.message || "removal failed")); }
      });
      return { status: failed.length ? (removed.length ? "partial" : "failed") : "complete", removed: removed, absent: absent, failed: failed, unknown: unknown };
    },
  };

  function setSaveState(s) {
    statusSave.textContent = s; statusSave.dataset.failed = /failed|unavailable|unreadable/i.test(s) ? "true" : "false";
    if(statusSave.dataset.failed === "true") copyNote.textContent = s;
  }

  // Library availability owns a persistent surface, separate from save acknowledgements.
  function setLibraryUnavailable(blockWrites) {
    if (!tauri() || !tauri().library) return;
    if (blockWrites !== false) loadFailed = true;
    $("libraryRecovery").hidden = false;
    $("portableLibrary").hidden = true;
    $("libraryRecoveryMessage").textContent = "Library unavailable. Your writing is still here. Export a copy, or retry the original library location.";
  }
  $("exportUnavailableArticle").addEventListener("click", function () { $("btnDownload").click(); });
  $("retryLibrary").addEventListener("click", async function () {
    var button = $("retryLibrary"), t = tauri();
    if (button.disabled || !t || !t.retryLibrary || transitioning) return;
    button.disabled = true;
    var retryEpoch = persistenceEpoch;
    try {
      await saveQueue;
      var available = await t.retryLibrary();
      if (retryEpoch !== persistenceEpoch) return;
      if (available === false) throw new Error("Library unavailable");
      var restoreEditorFocus = document.activeElement === button;
      if (available && Array.isArray(available.articles)) articles = available.articles.map(cleanArticle);
      loadFailed = false; libraryReady = true;
      $("libraryRecovery").hidden = true;
      $("portableLibrary").hidden = true;
      if (available && available.location) $("saveLocation").textContent = "Saved in: " + available.location;
      $("libraryPanel").hidden = $("workspaceDialog").hidden;
      renderLibrary();
      // Availability is not evidence that this article or these preferences were saved.
      setSaveState(dirty ? "Library available — changes not yet saved" : "Library available");
      srStatus.textContent = "Library available. Your current writing is unchanged.";
      if (restoreEditorFocus) {
        var start = editor.selectionStart, end = editor.selectionEnd, scroll = editor.scrollTop;
        editor.focus(); editor.setSelectionRange(start, end); editor.scrollTop = scroll;
      }
      schedulePrefs();
      if (dirty) scheduleSave();
    } catch (e) {
      setLibraryUnavailable();
      $("libraryRecoveryMessage").textContent = "Library is still unavailable. Your writing is unchanged. Export a copy, or retry the original library location.";
    } finally { button.disabled = false; }
  });

  // ---------- worker (Blob, no external file) + main-thread fallback ----------
  var worker = null, workerOK = false;
  try {
    if (window.Worker && window.Blob && window.BluntedWorkerSrc) {
      worker = new Worker(URL.createObjectURL(new Blob([window.BluntedWorkerSrc], { type: "text/javascript" })));
      workerOK = true;
      worker.onmessage = function (e) {
        var d = e.data || {};
        if (d.rev !== lastWorkerRev || d.rev !== currentRev) return; // stale
        if (analysisFailureRev === d.rev) return;
        if (!d.ok) { failAnalysis(d.rev); return; }
        try { receiveAnalysis(d.result); } catch (err) { failAnalysis(d.rev); }
      };
      worker.onerror = function () {
        workerOK = false;
        // A delayed error for an obsolete request cannot fail newer writing.
        if (lastWorkerRev === currentRev && analysisFailureRev !== currentRev) analyzeMainThread(null, currentRev);
      };
    }
  } catch (e) { worker = null; workerOK = false; }

  var debounceTimer = null, saveTimer = null, announceTimer = null;

  function scheduleAnalysis() {
    if (composing) return;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(runAnalysis, 150);
  }

  function runAnalysis() {
    currentRev += 1;
    var rev = currentRev;
    updateLargeDocNotice();
    var req = {
      text: editor.value, title: state.title, mode: prefs.activeProfile || SINGLE_MODE,
      overrides: buildOverrides(), ignoredTerms: state.ignoredTerms, personalWords: state.personalWords,
      ignoredRuleIds: state.ignoredRuleIds,
      textRevision: rev,
    };
    if (workerOK && worker) {
      lastWorkerRev = rev;
      try { worker.postMessage(req); } catch (e) { workerOK = false; analyzeMainThread(req, rev); }
      // safety: if worker silent for 2s, fall back (still render worker if it arrives later with newer rev)
      setTimeout(function () {
        if (rev !== currentRev || analysisFailureRev === rev || lastAnalysis && lastAnalysis.textRevision >= rev) return;
        analyzeMainThread(req, rev);
      }, 2000);
    } else {
      analyzeMainThread(req, rev);
    }
  }

  function analyzeMainThread(req, rev) {
    req = req || {
      text: editor.value, title: state.title, mode: prefs.activeProfile || SINGLE_MODE, overrides: buildOverrides(),
      ignoredTerms: state.ignoredTerms, personalWords: state.personalWords, ignoredRuleIds: state.ignoredRuleIds,
      textRevision: currentRev,
    };
    rev = rev || currentRev;
    if (rev !== currentRev || analysisFailureRev === rev) return;
    try {
      var r = Engine.analyze(req);
      if (Engine.structureReport) r.structure = Engine.structureReport(req.text, r.config.paragraphWords, !!req.title);
      if (rev !== currentRev) return;
      receiveAnalysis(r);
    } catch (e) { failAnalysis(rev); }
  }

  var proofreadingRequestRev = -1;
  function receiveAnalysis(r) {
    if (r.textRevision !== currentRev || analysisFailureRev === currentRev) return;
    if (!window.BluntedProofreader || !prefs.spelling && !prefs.grammar || r.metrics.language && r.metrics.language.englishLikely === false) {
      $("proofreadingStatus").textContent = !window.BluntedProofreader ? "Spelling and grammar are unavailable in this build." : !prefs.spelling && !prefs.grammar ? "Spelling and grammar checks are off." : "English spelling and grammar checks are paused for this text.";
      renderAnalysis(r); return;
    }
    if (proofreadingRequestRev === r.textRevision) return;
    proofreadingRequestRev = r.textRevision;
    var checkLabel = prefs.spelling && prefs.grammar ? "Spelling and grammar" : prefs.spelling ? "Spelling" : "Grammar";
    $("proofreadingStatus").textContent = "Checking " + checkLabel.toLowerCase() + " offline…";
    window.BluntedProofreader.check({text: editor.value, dialect: prefs.proofreadingDialect,
      spelling: prefs.spelling, grammar: prefs.grammar, personalWords: (state.personalWords || []).slice(),
      ignoredTerms: (state.ignoredTerms || []).slice(), ignoredRuleIds: (state.ignoredRuleIds || []).slice(), includeQuotes: prefs.includeQuotes,
    }).then(function (issues) {
      if (r.textRevision !== currentRev || analysisFailureRev === currentRev) return;
      r.issues = r.issues.filter(function (existing) { return !issues.some(function (issue) {
        return existing.from === issue.from && existing.to === issue.to && existing.fix && issue.fix && existing.fix.replacement === issue.fix.replacement;
      }); }).concat(issues).sort(function (a, b) { return a.from - b.from || a.to - b.to; });
      $("proofreadingStatus").textContent = checkLabel + " checked offline.";
      renderAnalysis(r);
    }).catch(function () {
      if (r.textRevision !== currentRev) return;
      $("proofreadingStatus").textContent = "Offline spelling and grammar could not run. Edit the article to retry, or turn these checks off in Settings.";
      failAnalysis(r.textRevision);
    });
  }

  function containsFocus(region, focused) {
    if (!region || !focused) return false;
    return region === focused || (region.contains ? region.contains(focused) : Array.prototype.some.call(region.children || [], function (child) { return containsFocus(child, focused); }));
  }

  function failAnalysis(rev) {
    if (rev !== currentRev) return;
    analysisFailureRev = rev; lastAnalysis = null; activeNote = null; selectedIssue = -1;
    clearTimeout(announceTimer);
    var outline = $("articleOutline"), focus = document.activeElement;
    var reviewFocus = containsFocus(issuesEl, focus) || containsFocus($("findingsView"), focus);
    var outlineFocus = containsFocus(outline, focus);
    issuesEl.textContent = "Review is unavailable. Your writing is unchanged. Editing again will retry.";
    issuesEl.hidden = false; issuesEl.setAttribute("aria-busy", "false");
    outline.textContent = "Outline is unavailable. Your writing is unchanged. Editing again will retry.";
    outline.setAttribute("aria-busy", "false");
    $("findingsView").hidden = true; $("findingsList").textContent = "";
    $("loadMoreNotes").hidden = true; $("sectionLengths").textContent = "";
    ["gradeMain", "gradeSub", "statusGrade", "statusSent", "statusTime", "detailsList", "versionLine", "issueCount", "issuePosition"].forEach(function (id) { $(id).textContent = ""; });
    $("gradeMeter").hidden = true; $("gradeMeterLbl").hidden = true;
    ["prevIssue", "nextIssue", "allNotes"].forEach(function (id) { $(id).disabled = true; });
    backdrop.textContent = editor.value;
    if (reviewFocus) issuesEl.focus();
    else if (outlineFocus) outline.focus();
  }

  // Large-document notice: analysis runs off the keystroke path (worker),
  // but very large docs may still lag behind typing.
  function updateLargeDocNotice() {
    var n = $("docNotice");
    if (!n) return;
    if (editor.value.length > 100000) {
      n.hidden = false;
      n.textContent = "Large document: analysis may lag behind typing. Typing itself stays responsive; Copy and Download always work.";
    } else {
      n.hidden = true;
      n.textContent = "";
    }
  }

  function buildOverrides() {
    var profile = prefs.profiles && prefs.profiles[prefs.activeProfile] || {};
    var o = Object.assign({}, profile, state.ruleOverrides);
    o.readingWpm = prefs.wpm;
    if (prefs.includeQuotes) o.excludeQuotes = false;
    return o;
  }

  function activeProfileConfig() {
    var base = MODES[prefs.activeProfile] || MODES.clear;
    var ov = (prefs.profiles && prefs.profiles[prefs.activeProfile]) || {};
    return Object.assign({}, base, ov, { rules: Object.assign({}, base.rules, ov.rules || {}) });
  }
  function renderProfileControls() {
    var cfg = activeProfileConfig();
    $("profileSel").value = prefs.activeProfile;
    ["targetGrade", "yellowWords", "redWords", "yellowGrade", "redGrade", "minGradeWords"].forEach(function (k) { $(k).value = cfg[k]; });
    buildRuleToggles();
  }
  function persistProfileField(key, value) {
    if (!prefs.profiles) prefs.profiles = {};
    if (!prefs.profiles[prefs.activeProfile]) prefs.profiles[prefs.activeProfile] = {};
    prefs.profiles[prefs.activeProfile][key] = value;
    runAnalysis(); scheduleSave();
  }
  function migrateLegacyRuleOverrides() {
    if (!state.ruleOverrides || !Object.keys(state.ruleOverrides).length) return;
    if (!prefs.profiles) prefs.profiles = {};
    var id = prefs.activeProfile === "essay" ? "essay" : "clear";
    if (!prefs.profiles[id]) prefs.profiles[id] = {};
    var rules = Object.assign({}, activeProfileConfig().rules);
    Object.keys(state.ruleOverrides).forEach(function (key) { if (key in rules) rules[key] = state.ruleOverrides[key]; });
    prefs.profiles[id].rules = rules;
    state.ruleOverrides = {};
  }

  // ---------- rendering ----------
  function esc(s) { return String(s); } // text nodes used everywhere; helper for clarity

  function renderAnalysis(r) {
    if (r.textRevision !== currentRev || analysisFailureRev === currentRev) return;
    $("allNotes").disabled = false;
    lastAnalysis = r;
    if (Engine.dismissalKey) {
      var keys=[];
      function identify(list,prefix){var counts={};list.forEach(function(i){var base=prefix+Engine.dismissalKey(i,editor.value),ordinal=counts[base]||0;counts[base]=ordinal+1;i._legacyDismissalKey=base;i._dismissalKey=base+"|"+ordinal;keys.push(base,i._dismissalKey);});}
      identify(r.issues,"clarity:");identify((r.structure && r.structure.issues)||[],"structure:");
      var before=state.dismissedNotes||[];state.dismissedNotes=before.filter(function(k){return keys.includes(k);});if(state.dismissedNotes.length!==before.length) dirty=true;
    }
    renderOutline(r.structure);
    renderScore(r);
    renderIssues(r);
    renderBackdrop(editor.value, r);
    if (dirty) scheduleSave();
    clearTimeout(announceTimer);
    announceTimer = setTimeout(announceStatus, 800);
  }

  // Cap backdrop decorations: DOM nodes scale with marks, so render the
  // first N in document order and note the rest stay in the issue list.
  var MAX_BG = 2000, MAX_UL = 2000;

  function catToUl(category) {
    if (category === "passive") return "u-passive";
    if (category === "adverb") return "u-adverb";
    if (category === "wordiness") return "u-wordy";
    if (category === "simpler") return "u-simpler";
    if (category === "repeated") return "u-repeated";
    if (category === "hedge") return "u-hedge";
    if (category === "todo") return "u-todo";
    return "u";
  }

  function renderBackdrop(text, r) {
    backdrop.textContent="";
    if(!activeNote || prefs.review !== "review" || previewOpen) { backdrop.textContent=text; return; }
    var from=activeNote.from,to=activeNote.to;
    backdrop.appendChild(document.createTextNode(text.slice(0,from)));
    var mark=document.createElement("span");mark.className="active-mark";mark.textContent=text.slice(from,to);backdrop.appendChild(mark);
    backdrop.appendChild(document.createTextNode(text.slice(to)+"\u200b"));syncScroll();
  }

  function renderScore(r) {
    var m = r.metrics;
    var wc = m.eligibleWords, tw = m.totalWords;
    statusWords.textContent = tw + (tw === 1 ? " word" : " words");
    statusSent.textContent = m.proseSentences === 1 ? "1 sentence" : m.proseSentences + " sentences";
    statusTime.textContent = m.readingTime + " read";
    var target = r.config.targetGrade || 8;
    var meter = $("gradeMeter"), fill = $("gradeFill"), tgt = $("gradeTarget"), mlbl = $("gradeMeterLbl");
    function paintMeter(gval) {
      if (!meter || !fill || !tgt) return;
      // scale 1..16 (College+ clamps at 16)
      var v = Math.max(1, Math.min(16, gval));
      var pct = ((v - 1) / 15) * 100;
      var tpct = ((Math.max(1, Math.min(16, target)) - 1) / 15) * 100;
      meter.hidden = false;
      fill.style.width = pct + "%";
      tgt.style.left = "calc(" + tpct + "% - 1px)";
      if (mlbl) {
        mlbl.hidden = false;
        mlbl.textContent = "Target: grade " + target + " marked ▼ · lower is simpler.";
      }
    }
    function hideMeter() {
      if (meter) meter.hidden = true;
      if (mlbl) mlbl.hidden = true;
    }
    if (m.grade) {
      var g = m.grade;
      gradeMain.textContent = g.label === "College+" ? "College+ reading level" : "Estimated reading grade: " + g.label;
      gradeMain.title = "U.S. school-grade scale (ARI" + (m.rawAri != null ? " " + m.rawAri.toFixed(1) : "") + "). An estimate — not a verdict.";
      gradeSub.textContent = "Target: grade " + target + ".";
      statusGrade.textContent = "Grade " + g.label;
      paintMeter(g.value || parseFloat(g.label) || target);
    } else if (m.provisionalGrade && wc >= 30 && m.rawAri != null) {
      // Early estimate from ~30 prose words (steady grade needs 100+/5+).
      var pg = m.provisionalGrade;
      var lbl = pg.label || String(Math.max(1, Math.ceil(m.rawAri)));
      gradeMain.textContent = lbl === "College+" ? "Early estimate: College+ (target grade " + target + ")" : "Early estimate: grade " + lbl + " (target " + target + ")";
      gradeMain.title = "Early estimate from ~30 words (ARI" + m.rawAri.toFixed(1) + "). Steady after 100+ prose words and 5+ sentences.";
      gradeSub.textContent = "Early estimate — target grade " + target + ". Steady estimate after 100+ words and 5+ sentences.";
      statusGrade.textContent = "~Grade " + lbl;
      paintMeter(pg.value || m.rawAri);
    } else {
      gradeMain.textContent = "Too little text for a steady estimate";
      gradeSub.textContent = "Keep writing — early estimate from ~30 words, steady after 100+ prose words and 5+ sentences. Target: grade " + target + ".";
      statusGrade.textContent = "—";
      hideMeter();
    }
    // details
    detailsList.textContent = "";
    var rows = [
      ["ARI (primary)", m.rawAri != null ? m.rawAri.toFixed(1) : "—"],
      ["Flesch-Kincaid", m.rawFk != null ? m.rawFk.toFixed(1) : "—"],
      ["Coleman-Liau", m.rawCl != null ? m.rawCl.toFixed(1) : "—"],
      ["SMOG", m.rawSmog != null ? (m.proseSentences >= 30 ? m.rawSmog.toFixed(1) : m.rawSmog.toFixed(1) + " (suppressed <30)") : "—"],
      ["Prose words", String(wc)],
      ["Sentences", String(m.proseSentences)],
      ["Characters", String(m.charCount)],
    ];
    for (var i = 0; i < rows.length; i++) {
      var dt = document.createElement("dt"); dt.appendChild(document.createTextNode(rows[i][0]));
      var dd = document.createElement("dd"); dd.appendChild(document.createTextNode(rows[i][1]));
      detailsList.appendChild(dt); detailsList.appendChild(dd);
    }
    var warns = r.warnings.map(function (w) { return w.message; }).join(" ");
    if (warns) {
      var dt2 = document.createElement("dt"); dt2.appendChild(document.createTextNode("Notes"));
      var dd2 = document.createElement("dd"); dd2.appendChild(document.createTextNode(warns));
      detailsList.appendChild(dt2); detailsList.appendChild(dd2);
    }
    $("versionLine").textContent = "Engine " + r.engineVersion + " · config v" + r.configVersion + (r.config.customized ? " · preset customized" : "") + ". Syllable metrics approximate.";
  }

  var CAT_LABEL = {
    spelling: "Spelling", grammar: "Grammar",
    sentence: "Sentence length", passive: "Passive voice", adverb: "Adverb",
    wordiness: "Wordiness", hedge: "Hedge", simpler: "Simpler word",
    repeated: "Repeated word", paragraph: "Paragraph", length: "Length",
    todo: "Placeholder",
  };

  function noteKey(issue) { return issue._dismissalKey || reviewer + ":" + Engine.dismissalKey(issue, editor.value); }
  function currentNotes() { return lastAnalysis ? (lastAnalysis._uiList || []) : []; }
  function renderIssues(r) {
    var focused = document.activeElement;
    var hadReviewFocus = focused && (focused.id === "applyNote" || focused.id === "dismissNote" || focused.id === "issues");
    var candidates = reviewer === "structure" ? ((r.structure && r.structure.issues) || []) : r.issues;
    var dismissed = state.dismissedNotes || [];
    var remaining = candidates.filter(function (i) { return !i.prompt && !(dismissed.includes(noteKey(i)) || dismissed.includes(i._legacyDismissalKey)); });
    var prompts = candidates.filter(function (i) { return i.prompt && !(dismissed.includes(noteKey(i)) || dismissed.includes(i._legacyDismissalKey)); });
    r._remaining = remaining; r._prompts = prompts;
    r._dismissed = candidates.filter(function (i) { return dismissed.includes(noteKey(i)) || dismissed.includes(i._legacyDismissalKey); });
    var group = $("findingGroup").value || "remaining";
    r._uiList = group === "prompts" ? prompts : group === "dismissed" ? r._dismissed : remaining;
    var unfilteredCount=r._uiList.length;
    if(activeCatFilter!=="all") r._uiList=r._uiList.filter(function(i){return i.category===activeCatFilter;});
    r._uiFull = r._uiList;
    var list = r._uiList, position = activeNote ? activeNote.from : editor.selectionStart || 0;
    var same = activeNote && list.map(function(i,n){return {i:i,n:n};}).filter(function(v){return v.i.ruleId === activeNote.ruleId && v.i.exactText === activeNote.exactText;}).sort(function(a,b){return Math.abs(a.i.from-position)-Math.abs(b.i.from-position);})[0];
    selectedIssue = same ? same.n : list.findIndex(function (i) { return i.to >= position; });
    if (selectedIssue < 0 && list.length) selectedIssue = 0;
    activeNote = list[selectedIssue] || null;
    issueCount.textContent = "(" + remaining.length + ")";
    $("issuePosition").textContent = list.length ? (selectedIssue + 1) + " / " + list.length : "";
    $("prevIssue").disabled = $("nextIssue").disabled = !list.length;
    issuesEl.textContent = ""; issuesEl.setAttribute("aria-busy", "false");
    if (!activeNote) {
      var empty = document.createElement("p"); empty.className = "muted";
      empty.textContent = activeCatFilter!=="all" && unfilteredCount ? "No notes in this category. Change the filter in Options." : group === "dismissed" ? "No dismissed notes." : group === "prompts" ? "No self-review prompts for this article." : r._dismissed.filter(function(i){return !i.prompt;}).length ? "No remaining findings. Your dismissed notes are kept separately." : "No findings detected. This is not a judgment of the article’s meaning.";
      issuesEl.appendChild(empty);
      if (prompts.length && group === "remaining") { var promptButton = document.createElement("button"); promptButton.type="button"; promptButton.textContent="Self-review prompts ("+prompts.length+")"; promptButton.addEventListener("click",function(){ $("findingGroup").value="prompts"; activeNote=null; renderIssues(r); renderBackdrop(editor.value,r); }); issuesEl.appendChild(promptButton); }
    } else {
      var issue = activeNote;
      var category = document.createElement("div"); category.className = "note-category"; category.textContent = issue.prompt ? "Self-review prompt" : (CAT_LABEL[issue.category] || "Structure");
      var excerpt = document.createElement("p"); excerpt.className = "note-excerpt"; excerpt.textContent = truncate(issue.exactText || "", 180);
      var explanation = document.createElement("p"); explanation.className = "note-explanation"; explanation.textContent = issue.explanation;
      issuesEl.appendChild(category); issuesEl.appendChild(excerpt); issuesEl.appendChild(explanation);
      var actions = document.createElement("div"); actions.className = "note-actions";
      var correction = Engine.correctionForIssue(editor.value, issue);
      if (correction && group !== "dismissed") {
        var preview = document.createElement("div"); preview.className = "correction-preview";
        var beforeLabel = document.createElement("p"); beforeLabel.className = "muted"; beforeLabel.textContent = "Original";
        var before = document.createElement("pre"); before.textContent = correction.expectedText;
        var afterLabel = document.createElement("p"); afterLabel.className = "muted"; afterLabel.textContent = "Proposed";
        var after = document.createElement("pre"); after.textContent = correction.replacement || "(Remove this text)";
        preview.appendChild(beforeLabel); preview.appendChild(before); preview.appendChild(afterLabel); preview.appendChild(after);
        issuesEl.appendChild(preview);
        if (issue.fix.replacements && issue.fix.replacements.length > 1) {
          var choiceLabel = document.createElement("label"); choiceLabel.className = "correction-choice"; choiceLabel.textContent = "Suggestion ";
          var choice = document.createElement("select"); choice.id = "correctionChoice";
          issue.fix.replacements.forEach(function (replacement) { var option = document.createElement("option"); option.value = replacement; option.textContent = replacement || "Remove this text"; choice.appendChild(option); });
          choice.value = issue.fix.replacement;
          choice.addEventListener("change", function () { if (lastAnalysis !== r || r.textRevision !== currentRev) return; issue.fix.replacement = choice.value; renderIssues(r); $("correctionChoice").focus(); });
          choiceLabel.appendChild(choice); issuesEl.appendChild(choiceLabel);
        }
        var apply = document.createElement("button"); apply.id = "applyNote"; apply.type = "button";
        apply.textContent = "Apply change";
        apply.addEventListener("click",function(){if(lastAnalysis === r) applyFix(issue, r.textRevision);}); actions.appendChild(apply);
      }
      var show = document.createElement("button"); show.type="button"; show.textContent="Show passage";
      show.addEventListener("click",function(){selectIssue(selectedIssue);}); actions.appendChild(show);
      if (issue.category === "spelling" && /^[\p{L}]+(?:['’][\p{L}]+)*$/u.test(issue.exactText)) {
        var keepWord = document.createElement("button"); keepWord.type = "button"; keepWord.textContent = "Keep this word";
        keepWord.addEventListener("click", function () {
          if (lastAnalysis !== r || r.textRevision !== currentRev || transitioning || closePending) return;
          if ((state.personalWords || []).length >= 300 && !state.personalWords.includes(issue.exactText)) {
            copyNote.textContent = "Your article already has 300 voice words. Edit the list in Settings → Review before adding another."; return;
          }
          state.personalWords = Array.from(new Set((state.personalWords || []).concat(issue.exactText)));
          $("personalWords").value = state.personalWords.join(", "); dirty = true; scheduleSave(); runAnalysis();
          issuesEl.focus();
        }); actions.appendChild(keepWord);
      }
      var dismiss = document.createElement("button"); dismiss.id="dismissNote"; dismiss.type="button"; dismiss.textContent = group === "dismissed" ? "Restore note" : "Dismiss";
      dismiss.addEventListener("click",function(){
        var key = noteKey(issue);
        var legacy=issue._legacyDismissalKey, hadLegacy=(state.dismissedNotes||[]).includes(legacy);
        state.dismissedNotes = (state.dismissedNotes || []).filter(function(k){return k!==key && !(group==="dismissed" && k===legacy);});
        if(group==="dismissed" && hadLegacy) candidates.filter(function(i){return i!==issue && i._legacyDismissalKey===legacy;}).forEach(function(i){if(!state.dismissedNotes.includes(noteKey(i)))state.dismissedNotes.push(noteKey(i));});
        if (group !== "dismissed") state.dismissedNotes.push(key);
        dirty=true; activeNote={from:issue.from, ruleId:"", exactText:""}; scheduleSave(); renderIssues(r); renderBackdrop(editor.value,r); issuesEl.focus();
        srStatus.textContent = group === "dismissed" ? "Note restored." : "Note dismissed.";
      }); actions.appendChild(dismiss); issuesEl.appendChild(actions);
    }
    if (!$("findingsView").hidden) renderFindings();
    if (hadReviewFocus) { var target = $(focused.id); if(target && target.id !== "issues" && !target.disabled) target.focus(); else issuesEl.focus(); }
  }
  function renderFindings() {
    if (analysisFailureRev === currentRev) return;
    var box=$("findingsList"); box.textContent="";
    var list=currentNotes();
    list.slice(0,findingsLimit).forEach(function(issue,index){
      var li=document.createElement("li"), b=document.createElement("button"); b.type="button";
      b.id="finding-"+index;b.textContent=(issue.prompt ? "Prompt: " : "")+truncate(issue.exactText || issue.explanation,100);
      b.setAttribute("aria-current",index===selectedIssue ? "true":"false");
      b.addEventListener("click",function(){closeFindings(); selectIssue(index);}); li.appendChild(b); box.appendChild(li);
    });
    $("loadMoreNotes").hidden = list.length <= findingsLimit;
    if(!list.length) box.textContent="No notes in this group.";
  }
  function closeFindings(){ $("findingsView").hidden=true; issuesEl.hidden=false; }

  function truncate(s, n) {
    s = String(s).replace(/\s+/g, " ");
    return s.length > n ? s.slice(0, n - 1) + "…" : s;
  }

  function selectIssue(idx) {
    closePreview(); var list=currentNotes(); if(!list[idx]) return;
    activeNote=list[idx];selectedIssue=idx;renderIssues(lastAnalysis);renderBackdrop(editor.value,lastAnalysis);
    editor.focus();editor.setSelectionRange(activeNote.from,activeNote.to);scrollToOffset(activeNote.from);rememberWorkspace();
  }
  function offsetY(off) {
    var mirror=document.createElement("div"), marker=document.createElement("span");
    var cs=getComputedStyle(editor);
    ["fontFamily","fontSize","fontWeight","fontStyle","lineHeight","letterSpacing","tabSize","whiteSpace","overflowWrap","wordBreak","padding","border","boxSizing"].forEach(function(k){mirror.style[k]=cs[k];});
    mirror.style.position="absolute";mirror.style.visibility="hidden";mirror.style.width=editor.clientWidth+"px";mirror.style.height="auto";mirror.style.left="-10000px";
    mirror.appendChild(document.createTextNode(editor.value.slice(0,off)));marker.textContent="\u200b";mirror.appendChild(marker);mirror.appendChild(document.createTextNode(editor.value.slice(off)));document.body.appendChild(mirror);
    var y=marker.getBoundingClientRect().top-mirror.getBoundingClientRect().top;mirror.remove();return y;
  }
  function scrollToOffset(off) {
    try {
      var y=offsetY(off);editor.scrollTop=Math.max(0,Math.min(editor.scrollHeight-editor.clientHeight,y-editor.clientHeight*.35));syncScroll();
      function reveal(){
        var top=document.querySelector(".masthead").getBoundingClientRect().bottom+16,bottom=window.innerHeight-20;
        var inspector=$("reviewInspector");if(!inspector.hidden && window.innerWidth<1360 && !previewOpen) bottom=Math.min(bottom,inspector.getBoundingClientRect().top-20);
        var line=parseFloat(getComputedStyle(editor).lineHeight)||28, point=editor.getBoundingClientRect().top+y-editor.scrollTop, end=point+line;
        var mark=document.querySelector(".active-mark");
        if(mark && activeNote && activeNote.from===off){var rect=mark.getClientRects()[0];if(rect){point=rect.top;end=rect.bottom;}}
        if(point<top || end>bottom) window.scrollBy(0,point-(top+Math.max(32,bottom-top)*.4));
      }
      reveal();if(window.requestAnimationFrame) window.requestAnimationFrame(reveal);
    } catch(e) { /* Geometry is unavailable in non-layout test environments. */ }
  }
  function stepIssue(dir) {
    if(prefs.review!=="review" || previewOpen) setReview("review");
    var list=currentNotes();if(!list.length) return;
    var n=(selectedIssue+dir+list.length)%list.length;closeFindings();selectIssue(n);issuesEl.focus();
  }

  // Both reviewers use the same guarded edit, through the native undo manager.
  function applyFix(issue, revision) {
    if (transitioning || closePending || composing) return false;
    var correction = Engine.correctionForIssue(editor.value, issue);
    if (revision !== currentRev || !correction) {
      copyNote.textContent = "Text changed — change not applied. Review the passage again.";
      return false;
    }
    var selection = {from: editor.selectionStart, to: editor.selectionEnd, scroll: editor.scrollTop};
    editor.focus(); editor.setSelectionRange(correction.from, correction.to);
    var ok = false;
    try { ok = document.execCommand(correction.replacement ? "insertText" : "delete", false, correction.replacement); } catch (e) {}
    if (!ok) {
      // setRangeText/value assignments do not reliably participate in native
      // Undo. Retain the writing instead of promising an undoable replacement.
      editor.setSelectionRange(selection.from, selection.to); editor.scrollTop = selection.scroll;
      copyNote.textContent = "This editor could not apply an undoable change. You can edit the passage manually.";
      return false;
    }
    // Native editing normally emits input synchronously; avoid processing twice.
    if (revision === currentRev) onTextInput();
    copyNote.textContent = "Applied. Undo with " + (navigator.platform.indexOf("Mac") !== -1 ? "Cmd+Z" : "Ctrl+Z") + " if the meaning changed.";
    return true;
  }

  function highlightNote(idx) { var list=currentNotes();if(!list[idx]) return;activeNote=list[idx];renderIssues(lastAnalysis);renderBackdrop(editor.value,lastAnalysis); }

  function announceStatus() {
    if (!lastAnalysis) return;
    var m = lastAnalysis.metrics;
    var g = m.grade ? (m.grade.label === "College+" ? "College plus" : "grade " + m.grade.label) : "no steady grade yet";
    var n = (lastAnalysis._uiList || []).length;
    srStatus.textContent = g + ", " + n + " issues, " + m.eligibleWords + " prose words.";
  }

  // ---------- find in document ----------
  // Plain case-insensitive substring search (no regex — predictable).
  // Native menu (Tauri) reaches this via the "blunted-find" window event.
  var findQuery = "", findMatches = [], findIdx = -1;
  var FIND_CAP = 1000;

  function recomputeFind() {
    findMatches = [];
    var q = findQuery;
    if (!q) { renderFindCount(); return; }
    var lower = editor.value.toLowerCase(), needle = q.toLowerCase();
    var pos = 0;
    while (findMatches.length < FIND_CAP) {
      var at = lower.indexOf(needle, pos);
      if (at === -1) break;
      findMatches.push(at);
      pos = at + Math.max(1, needle.length);
    }
    if (findIdx >= findMatches.length) findIdx = findMatches.length ? 0 : -1;
    renderFindCount();
  }

  function renderFindCount() {
    var el = $("findCount");
    if (!findQuery) { el.textContent = ""; return; }
    if (!findMatches.length) { el.textContent = "No matches"; return; }
    el.textContent = (findIdx + 1) + " of " + findMatches.length + (findMatches.length >= FIND_CAP ? "+" : "");
  }

  function showFindMatch(n, focusEditor) {
    if (!findMatches.length) return;
    findIdx = ((n % findMatches.length) + findMatches.length) % findMatches.length;
    var at = findMatches[findIdx];
    if (focusEditor && !previewOpen) editor.focus();
    try { editor.setSelectionRange(at, at + findQuery.length); } catch (e) {}
    if(previewOpen) scrollReadingTo(at); else scrollToOffset(at);
    renderFindCount();
  }

  function updateFindFromInput() {
    findQuery = $("findInput").value.replace(/[\r\n]+/g, "");
    if ($("findInput").value !== findQuery) $("findInput").value = findQuery;
    findIdx = -1;
    recomputeFind();
    if (findMatches.length) {
      // land on the match at/after the caret (caret is untouched while
      // typing in the find box, so this target is stable per keystroke)
      var caret = 0;
      try { caret = editor.selectionEnd || 0; } catch (e) {}
      var n = 0;
      while (n < findMatches.length && findMatches[n] < caret) n++;
      if (n >= findMatches.length) n = 0;
      showFindMatch(n, false);
    }
  }

  function openFind() {
    $("findBar").hidden = false;
    var inp = $("findInput");
    try {
      var s = editor.selectionStart || 0, e = editor.selectionEnd || 0;
      var sel = (s !== e) ? editor.value.slice(s, e) : "";
      if (sel && sel.length <= 80 && sel.indexOf("\n") === -1) inp.value = sel;
    } catch (err) {}
    inp.focus();
    try { inp.select(); } catch (err2) {}
    updateFindFromInput();
  }

  function closeFind() {
    $("findBar").hidden = true;
    findQuery = ""; findMatches = []; findIdx = -1;
    $("findCount").textContent = "";
    if(previewOpen) $("readingPreview").focus(); else editor.focus();
  }

  var findDeb = null;
  $("findInput").addEventListener("input", function () {
    clearTimeout(findDeb);
    findDeb = setTimeout(updateFindFromInput, 120);
  });
  $("findInput").addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!findMatches.length) updateFindFromInput();
      else showFindMatch(findIdx + (e.shiftKey ? -1 : 1), false);
    } else if (e.key === "Escape") {
      e.preventDefault(); e.stopPropagation();
      closeFind();
    }
  });
  $("findNext").addEventListener("click", function () {
    if (!findMatches.length) updateFindFromInput();
    else showFindMatch(findIdx + 1, true);
  });
  $("findPrev").addEventListener("click", function () {
    if (!findMatches.length) updateFindFromInput();
    else showFindMatch(findIdx - 1, true);
  });
  $("findClose").addEventListener("click", closeFind);
  window.addEventListener("blunted-find", openFind);

  // ---------- input / scroll sync ----------
  function syncScroll() {
    try {
      backdrop.scrollTop = editor.scrollTop;
      backdrop.scrollLeft = editor.scrollLeft;
    } catch (e) {}
  }

  function invalidateAnalysis() {
    currentRev += 1; // invalidate in-flight worker results immediately, before debounce
    lastAnalysis = null;
    issuesEl.setAttribute("aria-busy", "true");
    var apply=$("applyNote"); if(apply) apply.disabled=true;
    var choice=$("correctionChoice"); if(choice) choice.disabled=true;
    $("proofreadingStatus").textContent = prefs.spelling || prefs.grammar ? "Review will update after this edit." : "Spelling and grammar checks are off.";
    $("articleOutline").setAttribute("aria-busy", "true");
  }
  function onTextInput() {
    localDataCleared = false;
    invalidateAnalysis();
    backdrop.textContent = editor.value;
    state.body = editor.value;
    state.updatedAt = new Date().toISOString();
    dirty = true;
    setSaveState(prefs.privateSession ? "Private session — not saved" : "Editing…");
    updateSampleVisibility();
    if (!$("findBar").hidden) recomputeFind();
    scheduleAnalysis();
    scheduleSave();
  }

  // The sample loader is a first-run helper, not a feature: only offer it
  // while the document body is empty.
  function updateSampleVisibility() {
    $("btnSample").hidden = editor.value.length > 0;
  }

  editor.addEventListener("input", onTextInput);
  editor.addEventListener("scroll", syncScroll);
  editor.addEventListener("compositionstart", function () { composing = true; clearTimeout(debounceTimer); });
  editor.addEventListener("compositionend", function () { composing = false; scheduleAnalysis(); });
  // Click a highlight to jump to its note: the textarea sits above the
  // backdrop, so resolve the caret offset after click and mark the note
  // without moving the caret.
  editor.addEventListener("click", function () {
    setTimeout(function () {
      var list = lastAnalysis && lastAnalysis._uiList;
      if (!list || !list.length) return;
      var pos = 0;
      try { pos = editor.selectionStart; } catch (e) { return; }
      if (pos == null) return;
      // ignore clicks on empty space past end
      for (var i = 0; i < list.length; i++) {
        var it = list[i];
        if (it.from !== it.to && it.from <= pos && pos <= it.to) {
          // respect active filter already (list is filtered)
          highlightNote(i);
          return;
        }
      }
    }, 0);
  });
  if (window.ResizeObserver) {
    new ResizeObserver(syncScroll).observe(editor);
  }
  window.addEventListener("resize", syncScroll);

  // ---------- writing profiles ----------

  // ---------- rule toggles / settings ----------
  var RULE_LABELS = [
    ["passive", "Passive voice notes"], ["adverb", "Adverb (-ly) notes"],
    ["intensifier", "Intensifier notes"], ["wordiness", "Wordiness"],
    ["filler", "Filler openings"], ["simpler", "Simpler words"],
    ["repeated", "Repeated words"], ["todo", "Placeholder markers (TODO)"],
  ];

  function buildRuleToggles() {
    var box = $("ruleToggles");
    box.textContent = "";
    var cfg = activeProfileConfig();
    RULE_LABELS.forEach(function (pair) {
      var key = pair[0];
      if (!(key in cfg.rules)) return;
      var cur = cfg.rules[key];
      var lab = document.createElement("label");
      lab.className = "prow"; lab.appendChild(document.createTextNode(pair[1]));
      var cb = document.createElement("select"); cb.dataset.rule = key;
      [["off", "Off"], ["normal", "Normal"], ["strict", "Strict"]].forEach(function (x) { var op = document.createElement("option"); op.value=x[0]; op.textContent=x[1]; cb.appendChild(op); });
      cb.value = cur === false || cur === "off" ? "off" : cur === "strict" ? "strict" : "normal";
      cb.addEventListener("change", function () {
        var rules = Object.assign({}, activeProfileConfig().rules); rules[key] = cb.value === "off" ? false : cb.value;
        persistProfileField("rules", rules);
        syncRailToggle(key, cb.value !== "off");
        updateCustomNote(); runAnalysis(); scheduleSave();
      });
      lab.appendChild(cb);
      box.appendChild(lab);
    });
    // hedge tri-state
    var hlab = document.createElement("label");
    hlab.appendChild(document.createTextNode("Hedges"));
    var hsel = document.createElement("select");
    [["off", "Off"], ["note", "Normal"], ["strict", "Strict"]].forEach(function (o) {
      var op = document.createElement("option"); op.value = o[0]; op.textContent = o[1]; hsel.appendChild(op);
    });
    var hcur = cfg.rules.hedge;
    hsel.value = hcur === "off" ? "off" : hcur === "strict" ? "strict" : "note";
    hsel.setAttribute("aria-label", "Hedge handling");
    hsel.addEventListener("change", function () {
      var rules = Object.assign({}, activeProfileConfig().rules); rules.hedge = hsel.value; persistProfileField("rules", rules); updateCustomNote();
    });
    hlab.appendChild(hsel);
    box.appendChild(hlab);
  }

  function syncRailToggle() {} // Rule controls live in Preferences only.

  function updateCustomNote() {
    var n = Object.keys((prefs.profiles && prefs.profiles[prefs.activeProfile]) || {}).length;
    $("customNote").textContent = n ? "Customized (" + n + " override" + (n > 1 ? "s" : "") + ")." : "";
  }

  // merged Download menu: close the popover after picking a format
  ["btnDownload", "btnDownloadTxt"].forEach(function (id) {
    var b = $(id);
    if (b) b.addEventListener("click", function () {
      var m = $("dlMenu");
      if (m && m.open) { try { m.removeAttribute("open"); } catch (e) {} }
    });
  });
  $("profileSel").addEventListener("change", function (e) {
    prefs.activeProfile = e.target.value === "essay" ? "essay" : "clear";
    state.modeId = prefs.activeProfile; renderProfileControls(); updateCustomNote(); runAnalysis(); scheduleSave();
  });
  ["targetGrade", "yellowWords", "redWords", "yellowGrade", "redGrade", "minGradeWords"].forEach(function (key) {
    $(key).addEventListener("change", function (e) {
      var val = Number(e.target.value), lo = key === "minGradeWords" || key.indexOf("Words") >= 0 ? 5 : 1, hi = key === "redWords" ? 150 : key === "redGrade" ? 35 : key === "targetGrade" ? 30 : 100;
      var current = activeProfileConfig();
      var invalidPair = (key === "yellowWords" && val > current.redWords) || (key === "redWords" && val < current.yellowWords) || (key === "yellowGrade" && val > current.redGrade) || (key === "redGrade" && val < current.yellowGrade);
      if (!Number.isFinite(val) || val < lo || val > hi || invalidPair) { renderProfileControls(); return; }
      persistProfileField(key, val); renderProfileControls();
    });
  });
  $("btnResetMode").addEventListener("click", function () {
    if (prefs.profiles) delete prefs.profiles[prefs.activeProfile];
    renderProfileControls(); runAnalysis(); scheduleSave();
  });
  $("btnLearnSample").addEventListener("click", function () {
    var text = $("learnSample").value.trim();
    var words = (text.toLowerCase().match(/[a-z]{4,}/g) || []).filter(function (w) { return !/^(that|this|with|from|have|were|your|about|there|their|which|would|could|should|these|those|will|into|when|what|they|them|then|than|been|also|very|just|some|more|most|such|each|over|under|after|before|because|while|where|very)$/.test(w); });
    var counts = {}; words.forEach(function (w) { counts[w] = (counts[w] || 0) + 1; });
    var candidates = Object.keys(counts).filter(function (w) { return counts[w] >= 2; }).sort(function (a,b) { return counts[b]-counts[a]; }).slice(0, 12);
    var sampleWordCount = (text.match(/[a-z]+/g) || []).length;
    var sentenceCount = text.split(/[.!?]+/).filter(Boolean).length;
    var avg = sampleWordCount && sentenceCount ? Math.round(sampleWordCount / sentenceCount) : null;
    var box = $("learnSuggestions"); box.textContent = "";
    if (!text || (!candidates.length && !avg)) { box.textContent = "Add a longer sample to get useful suggestions."; return; }
    var head = document.createElement("p"); head.textContent = "Review these local suggestions before applying:"; box.appendChild(head);
    var wlabel = document.createElement("label"); var wcheck = document.createElement("input"); wcheck.type="checkbox"; wcheck.checked=true;
    wlabel.appendChild(wcheck); wlabel.appendChild(document.createTextNode(" Add repeated sample words to My voice words: " + candidates.join(", "))); box.appendChild(wlabel);
    var avgLabel = document.createElement("label"); var acheck = document.createElement("input"); acheck.type="checkbox"; acheck.checked=false;
    avgLabel.appendChild(acheck); avgLabel.appendChild(document.createTextNode(" Set yellow sentence threshold near sample average (" + avg + " words)")); box.appendChild(avgLabel);
    var accept = document.createElement("button"); accept.type="button"; accept.textContent="Apply selected suggestions"; box.appendChild(accept);
    accept.addEventListener("click", function () {
      if (wcheck.checked) state.personalWords = Array.from(new Set((state.personalWords || []).concat(candidates))).slice(0,300);
      if (acheck.checked && avg) persistProfileField("yellowWords", Math.min(activeProfileConfig().redWords, Math.max(10, Math.min(100, avg))));
      $("personalWords").value = state.personalWords.join(", "); box.textContent="Selected sample suggestions applied."; runAnalysis(); scheduleSave();
    });
  });

  $("fontSize").addEventListener("input", function (e) {
    prefs.fontSize = parseInt(e.target.value, 10) || 16;
    applyPrefs(); scheduleSave(); schedulePrefs();
  });
  $("fontFamily").addEventListener("change", function (e) {
    prefs.fontFamily = e.target.value || "serif";
    applyPrefs(); scheduleSave(); schedulePrefs();
  });
  $("lineHeight").addEventListener("change", function (e) {
    var lh = parseFloat(e.target.value);
    if (lh >= 1.2 && lh <= 2.5) { prefs.lineHeight = lh; applyPrefs(); scheduleSave(); schedulePrefs(); }
    else e.target.value = String(prefs.lineHeight || 1.8);
  });
  $("optHeader").addEventListener("change", function (e) {
    prefs.exportHeadline = e.target.checked; scheduleSave(); schedulePrefs();
  });
  $("wpm").addEventListener("change", function (e) {
    var v = parseInt(e.target.value, 10);
    if (v >= 100 && v <= 400) { prefs.wpm = v; runAnalysis(); scheduleSave(); schedulePrefs(); }
    else e.target.value = prefs.wpm;
  });
  $("optQuotes").addEventListener("change", function (e) {
    prefs.includeQuotes = e.target.checked; runAnalysis(); scheduleSave(); schedulePrefs();
  });
  $("optPrivate").addEventListener("change", function (e) {
    prefs.privateSession = e.target.checked;
    setSaveState(prefs.privateSession ? "Private session — not saved" : "—");
    scheduleSave(); schedulePrefs();
  });
  $("optAutoSave").addEventListener("change", function (e) {
    prefs.autosave = e.target.checked;
    if (!prefs.autosave) setSaveState("Autosave off");
    scheduleSave(); schedulePrefs();
  });
  $("themeSel").addEventListener("change", function (e) {
    prefs.theme = e.target.value; applyPrefs(); scheduleSave(); schedulePrefs();
  });
  ["spelling", "grammar"].forEach(function (key) {
    $("opt" + key.charAt(0).toUpperCase() + key.slice(1)).addEventListener("change", function (e) {
      prefs[key] = e.target.checked; runAnalysis(); schedulePrefs();
    });
  });
  $("proofreadingDialect").addEventListener("change", function (e) {
    if (["american", "british", "australian", "canadian", "indian"].indexOf(e.target.value) < 0) return;
    prefs.proofreadingDialect = e.target.value; runAnalysis(); schedulePrefs();
  });

  function applyPrefs() {
    $("optSpelling").checked = prefs.spelling; $("optGrammar").checked = prefs.grammar;
    $("proofreadingDialect").value = prefs.proofreadingDialect;
    document.body.dataset.theme = prefs.theme;
    document.body.dataset.font = prefs.fontFamily || "serif";
    document.documentElement.style.setProperty("--ed-font", prefs.fontSize + "px");
    document.documentElement.style.setProperty("--ed-lh", String(prefs.lineHeight || 1.8));
    $("fontVal").textContent = prefs.fontSize + "px";
    $("fontSize").value = prefs.fontSize;
    $("fontFamily").value = prefs.fontFamily || "serif";
    $("lineHeight").value = String(prefs.lineHeight || 1.8);
    $("wpm").value = prefs.wpm;
    $("optQuotes").checked = !!prefs.includeQuotes;
    $("optHeader").checked = prefs.exportHeadline !== false;
    $("optPrivate").checked = !!prefs.privateSession;
    $("optAutoSave").checked = prefs.autosave !== false;
    $("themeSel").value = prefs.theme;
    syncScroll();
  }

  // Write / Review
  function setReview(v) {
    closePreview();prefs.review=v;document.body.dataset.review=v;
    $("viewWrite").setAttribute("aria-pressed",v==="write" ? "true":"false");$("viewReview").setAttribute("aria-pressed",v==="review" ? "true":"false");$("viewPreview").setAttribute("aria-pressed","false");
    $("reviewInspector").hidden=v!=="review";
    if(v==="review" && lastAnalysis){ renderIssues(lastAnalysis);renderBackdrop(editor.value,lastAnalysis); }
    schedulePrefs();
  }
  $("viewWrite").addEventListener("click", function () { rememberWorkspace(); setReview("write"); });
  $("viewReview").addEventListener("click", function () { rememberWorkspace(); setReview("review"); if(activeNote) scrollToOffset(activeNote.from); });

  // ---------- actions ----------
  function confirmReplace() {
    if (!dirty && !editor.value) return true;
    if (!editor.value) return true;
    return window.confirm("Replace the current draft? Unsaved changes will be lost. Choose Cancel, then Download .md to keep a copy.");
  }

  $("btnNew").addEventListener("click", async function () {
    if (transitioning || closePending) return;
    if (tauri() && tauri().library) { await newArticle(); return; }
    if (!confirmReplace()) return;
    state = freshDoc();
    loadDocIntoUI(); setReview("write"); runAnalysis(); store.save();
  });

  $("btnOpen").addEventListener("click", function () { $("filePick").click(); });
  $("filePick").addEventListener("change", function (e) {
    if (transitioning || closePending) return;
    var epoch = persistenceEpoch;
    var f = e.target.files && e.target.files[0];
    if (!f) return;
    if (!(tauri() && tauri().library) && !confirmReplace()) { e.target.value = ""; return; }
    var rd = new FileReader();
    rd.onload = async function () {
      if (transitioning || closePending || epoch !== persistenceEpoch) return;
      var text = String(rd.result || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
      var next = freshDoc(); next.body = text; next.title = (f.name || "").replace(/\.(txt|md|markdown)$/i, "").slice(0,120);
      if (tauri() && tauri().library) {
        if (transitioning || closePending) { copyNote.textContent = "Finish the current library operation before importing."; return; }
        transitioning = true; setWorkspaceBusy(true);
        try {
          if (!await leaveArticle() || !await saveLibraryArticle(next)) return;
          state = next; loadDocIntoUI(); setReview("write"); runAnalysis(); setSaveState("Saved");
        } finally { transitioning = false; setWorkspaceBusy(false); }
      } else {
        state = next; loadDocIntoUI(); dirty = true; setReview("write"); runAnalysis(); store.save();
      }
    };
    rd.onerror = function () { copyNote.textContent = "Could not read that article. Current writing was kept."; };
    rd.readAsText(f);
    e.target.value = "";
  });

  // paste: accept plain text only
  editor.addEventListener("paste", function (e) {
    if (!e.clipboardData) return;
    e.preventDefault();
    var t = e.clipboardData.getData("text/plain");
    if (t == null) return;
    var ok = false;
    try { ok = document.execCommand("insertText", false, t); } catch (err) { ok = false; }
    if (!ok && editor.setRangeText) {
      try {
        var s0 = editor.selectionStart || 0, e0 = editor.selectionEnd || 0;
        editor.setRangeText(t, s0, e0, "end");
        ok = true;
      } catch (err2) { ok = false; }
    }
    if (!ok) {
      var s = editor.selectionStart || 0, en = editor.selectionEnd || 0;
      editor.value = editor.value.slice(0, s) + t + editor.value.slice(en);
      try { editor.setSelectionRange(s + t.length, s + t.length); } catch (err3) {}
    }
    onTextInput();
  });

  $("btnCopy").addEventListener("click", function () { copyText(exportText(false), "Article"); });

  function copyText(text, what) {
    copyNote.textContent = "";
    var done = function () { copyNote.textContent = what + " copied."; };
    var manual = function () {
      try { editor.focus(); editor.select(); } catch (e) {}
      copyNote.textContent = "Copy needs permission — text selected. Press " + (navigator.platform.indexOf("Mac") !== -1 ? "Cmd+C" : "Ctrl+C") + " to copy.";
    };
    if (tauri() && tauri().copyText) {
      try { tauri().copyText(text).then(done, manual); return; } catch (e) { manual(); return; }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, manual);
    } else manual();
  }

  $("btnDownload").addEventListener("click", function () {
    var name = downloadName();
    var built = buildMarkdown();
    var blob = new Blob([built], { type: "text/markdown;charset=utf-8" });
    if (tauri() && tauri().saveFile) {
      tauri().saveFile(name + ".md", built).then(
        function (ok) {
          if (ok === false) copyNote.textContent = "Save cancelled.";
          else copyNote.textContent = "Saved " + name + ".md.";
        },
        function () { fallbackDownload(blob, name, "md", true); });
      return;
    }
    fallbackDownload(blob, name, "md", true);
  });

  $("btnDownloadTxt").addEventListener("click", function () {
    var name = downloadName();
    var blob = new Blob([exportText(false)], { type: "text/plain;charset=utf-8" });
    if (tauri() && tauri().saveFile) {
      tauri().saveFile(name + ".txt", exportText(false)).then(
        function (ok) {
          if (ok === false) copyNote.textContent = "Save cancelled.";
          else copyNote.textContent = "Saved " + name + ".txt.";
        },
        function () { fallbackDownload(blob, name, "txt", false); });
      return;
    }
    fallbackDownload(blob, name, "txt", false);
  });

  function downloadName() {
    var name = (state.title || "untitled").replace(/[\\/:*?"<>|#%&{}$!'@+`=]/g, "").trim().slice(0, 80) || "untitled";
    // Windows reserved names + trailing dots/spaces are not valid filenames.
    name = name.replace(/[. ]+$/, "") || "untitled";
    if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(name)) name = "_" + name;
    return name;
  }

  function exportText(markdown) { return Engine.exportArticle ? Engine.exportArticle(state.title,editor.value,{headline:prefs.exportHeadline!==false,markdown:markdown}) : editor.value; }
  function buildMarkdown() { return exportText(true); }

  function fallbackDownload(blob, name, ext, headerAware) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name + "." + ext;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    copyNote.textContent = "Downloaded " + name + "." + ext + " (UTF-8" +
      (prefs.exportHeadline !== false ? ", with headline" : ", body only") + ").";
  }

  // ---------- settings export / import (manual file = the sync story) ----------
  $("btnExportSettings").addEventListener("click", function () {
    var data = {
      app: "blunted", version: 2,
      prefs: prefs, ruleOverrides: state.ruleOverrides, ignoredTerms: state.ignoredTerms, personalWords: state.personalWords,
    };
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "blunted-settings.json";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    copyNote.textContent = "Downloaded blunted-settings.json. Move it to your other device yourself and Import there.";
  });

  $("btnImportSettings").addEventListener("click", function () { $("settingsPick").click(); });
  $("settingsPick").addEventListener("change", function (e) {
    if (transitioning || closePending) return;
    var epoch = persistenceEpoch;
    var f = e.target.files && e.target.files[0];
    if (!f) return;
    var rd = new FileReader();
    rd.onload = function () {
      if (transitioning || closePending || epoch !== persistenceEpoch) return;
      var ok = false;
      try {
        var data = JSON.parse(String(rd.result || ""));
        if (data && data.app === "blunted" && data.prefs) {
          prefs = sanitizePrefs(data.prefs);
          state.ruleOverrides = sanitizeOverrides(data.ruleOverrides);
          state.ignoredTerms = Array.isArray(data.ignoredTerms)
            ? data.ignoredTerms.filter(function (s) { return typeof s === "string"; }).map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 200)
            : [];
          state.personalWords = Array.isArray(data.personalWords) ? data.personalWords.filter(function (s) { return typeof s === "string"; }).slice(0, 300) : [];
          migrateLegacyRuleOverrides();
          ok = true;
        }
      } catch (err) { ok = false; }
      if (ok) {
        applyPrefs();
        setReview(prefs.review === "write" ? "write" : "review");
        loadDocIntoUI(); runAnalysis(); scheduleSave();
        copyNote.textContent = "Settings imported.";
      } else {
        copyNote.textContent = "That file is not a blunted settings file — nothing changed.";
      }
    };
    try { rd.readAsText(f); } catch (err) { copyNote.textContent = "Could not read that file — nothing changed."; }
    e.target.value = "";
  });

  var KNOWN_RULES = ["passive", "adverb", "intensifier", "wordiness", "filler", "simpler", "repeated", "todo"];
  function sanitizeOverrides(o) {
    var out = {};
    if (!o || typeof o !== "object") return out;
    for (var i = 0; i < KNOWN_RULES.length; i++) {
      var k = KNOWN_RULES[i];
      if (o[k] === true || o[k] === false) out[k] = o[k];
    }
    if (o.hedge === "note" || o.hedge === "off") out.hedge = o.hedge;
    return out;
  }

  var SAMPLE = "The Editor’s Test\n\nDr. Rao measured 3.14 ml on Tuesday. It was written in the lab notebook at 9 a.m.\n\nIt is important to note that the samples were collected in order to facilitate subsequent analysis. We utilize approximately 5 ml per run, and the results were surprising.\n\nFriendly staff reply quickly. Really very good.\n\nThe the report needs tightening before Friday.";
  $("btnSample").addEventListener("click", function () {
    if (transitioning || closePending) return;
    if (editor.value && !window.confirm("Load the labelled sample? This replaces the current draft.")) return;
    state = freshDoc();
    state.title = "Sample";
    state.body = SAMPLE;
    loadDocIntoUI(); setReview("write"); runAnalysis(); store.save();
  });

  $("prevIssue").addEventListener("click", function () { stepIssue(-1); });
  $("nextIssue").addEventListener("click", function () { stepIssue(1); });

  $("docTitle").addEventListener("input", function (e) {
    localDataCleared = false;
    invalidateAnalysis();
    state.title = e.target.value; state.updatedAt = new Date().toISOString(); dirty = true; setSaveState("Editing…"); scheduleSave(); scheduleAnalysis();
  });

  var clearConfirmationOpen = false, clearReturnToSettings = false;
  function closeClearConfirmation() {
    var dialog = $("clearConfirmDialog");
    clearConfirmationOpen = false;
    if (dialog.close && dialog.open) dialog.close();
    dialog.hidden = true;
    if (clearReturnToSettings) {
      clearReturnToSettings = false;
      var settings = $("preferencesDialog"); settings.hidden = false;
      if (settings.showModal && !settings.open) settings.showModal();
    }
    if (!$("preferencesDialog").hidden) $("btnClearData").focus();
    else $("viewWrite").focus();
  }
  $("btnClearData").addEventListener("click", function () {
    if (transitioning || clearing || closePending || clearConfirmationOpen) return;
    clearConfirmationOpen = true;
    // WKWebView's accessibility tree can disappear with two stacked modals.
    // Suspend Settings and restore it after the confirmation has closed.
    var settings = $("preferencesDialog"); clearReturnToSettings = !settings.hidden;
    if (clearReturnToSettings) { if (settings.close && settings.open) settings.close(); settings.hidden = true; }
    var dialog = $("clearConfirmDialog"); dialog.hidden = false;
    if (dialog.showModal && !dialog.open) dialog.showModal();
    $("clearCancel").focus();
  });
  $("clearCancel").addEventListener("click", closeClearConfirmation);
  $("clearConfirmDialog").addEventListener("cancel", function (e) { e.preventDefault(); closeClearConfirmation(); });
  $("clearConfirm").addEventListener("click", async function () {
    if (!clearConfirmationOpen) return;
    closeClearConfirmation();
    if (transitioning || clearing || closePending) return;
    transitioning = true; clearing = true; persistenceEpoch++; restoreReadRevision++;
    clearTimeout(saveTimer); clearTimeout(prefsTimer); clearTimeout(workspaceTimer);
    setWorkspaceBusy(true);
    var region = $("clearStatus"); region.textContent = "Clearing local data…"; region.setAttribute("aria-busy", "true");
    if (!$("preferencesDialog").hidden) region.focus();
    try {
      await saveQueue;
      var result = await store.clear();
      if (result && (result.status && result.status !== "complete" || result.complete === false)) {
        var removed = (result.removed || []).length, failed = (result.failed || []).length;
        region.textContent = (result.status === "partial" || removed ? "Local data was partly cleared. " : "Local data could not be cleared. ") + removed + " removals completed; " + failed + " removals failed. " + ((result.unknown || []).length ? result.unknown.length + " storage locations could not be checked; no removal was attempted there. " : "") + "Your writing is unchanged in the editor; export it to keep a copy.";
        dirty = true; return;
      }
      if (window.BluntedProofreader) window.BluntedProofreader.reset();
      articles = []; renderLibrary(); state = freshDoc(); loadDocIntoUI(); runAnalysis();
      localDataCleared = true;
      region.textContent = "Local data cleared."; setSaveState("Local data cleared");
    } catch (e) {
      region.textContent = "Local data could not be completely cleared. Your writing is unchanged in the editor; some files may have been removed. Export your article to keep a copy.";
      dirty = true;
    } finally { region.setAttribute("aria-busy", "false"); clearing = false; transitioning = false; setWorkspaceBusy(false); }
  });

  $("btnPrint").addEventListener("click", function () { window.print(); });
  window.addEventListener("beforeprint", function () {
    renderReading($("printDoc"));
  });

  function freshDoc() {
    return {
      id: articleId(), title: "", modeId: prefs.activeProfile || SINGLE_MODE,
      body: "", createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(), ruleOverrides: {}, ignoredRuleIds: [], ignoredTerms: [], personalWords: [],
    };
  }

  function loadDocIntoUI() {
    closePreview();
    activeNote=null;
    clearTimeout(debounceTimer); currentRev += 1; lastAnalysis = null;
    activeCatFilter = "all";$("categoryFilter").value="all";
    editor.value = state.body || "";
    $("docTitle").value = state.title || "";
    $("ignoredTerms").value = (state.ignoredTerms || []).join(", ");
    $("personalWords").value = (state.personalWords || []).join(", ");
    state.modeId = normalizeMode(state.modeId);
    delete state.subject;
    buildRuleToggles(); updateCustomNote();
    updateSampleVisibility();
    dirty = false;
  }

  function scheduleSave() {
    if (clearing) return;
    var epoch = persistenceEpoch;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { if (!clearing && epoch === persistenceEpoch) store.save(); }, 800);
  }

  // ---------- article workspace ----------
  function cleanArticle(doc) {
    var out = Object.assign(freshDoc(), doc);
    out.title = typeof out.title === "string" ? out.title.slice(0,120) : "";
    ["ignoredTerms", "personalWords", "ignoredRuleIds", "dismissedNotes"].forEach(function (key) { out[key] = Array.isArray(out[key]) ? out[key].filter(function (v) { return typeof v === "string"; }) : []; });
    out.ruleOverrides = sanitizeOverrides(out.ruleOverrides);
    out.createdAt = typeof out.createdAt === "string" ? out.createdAt : new Date().toISOString();
    out.updatedAt = typeof out.updatedAt === "string" ? out.updatedAt : out.createdAt;
    return out;
  }
  function articleId() {
    if (window.crypto && window.crypto.randomUUID) return "article-" + window.crypto.randomUUID();
    return "article-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
  }
  var busyControls = [];
  function setWorkspaceBusy(busy) {
    if (busy) {
      busyControls = [];
      ["preferencesDialog", "reviewOptionsDialog", "libraryPanel"].forEach(function (id) {
        $(id).querySelectorAll("input, select, textarea, button").forEach(function (control) {
          if (control.dataset && control.dataset.close) return;
          busyControls.push({ control: control, disabled: control.disabled }); control.disabled = true;
        });
      });
    } else { busyControls.forEach(function (entry) { entry.control.disabled = entry.disabled; }); busyControls = []; }
    editor.readOnly = busy; $("docTitle").disabled = busy;
    $("libraryPanel").setAttribute("aria-busy", busy ? "true" : "false");
    ["btnNew", "btnOpen", "btnSample", "formatBold", "formatItalic", "formatHeading", "formatList", "btnClearData", "libraryNew", "libraryBackup", "libraryRestore", "libraryPick", "restoreConfirm", "restoreCancel", "restoreConflict", "restoreSettings", "btnImportSettings", "settingsPick"].forEach(function (id) { $(id).disabled = busy; });
  }
  function renderLibrary() {
    if (!libraryReady) return;
    var box = $("libraryList"); box.textContent = "";
    var query = $("librarySearch").value.toLowerCase(), trash = $("libraryTrash").checked;
    var list = articles.filter(function (a) { return !!a.trashedAt === trash && (a.title || "Untitled").toLowerCase().includes(query); })
      .sort(function (a,b) { return (b.updatedAt || "").localeCompare(a.updatedAt || ""); });
    list.forEach(function (a) {
      var li = document.createElement("li");
      var open = document.createElement("button"); open.type = "button";
      open.className="article-entry";open.setAttribute("aria-label","Open "+(a.title||"Untitled"));
      var label=document.createElement("strong");label.textContent=a.title||"Untitled";open.appendChild(label);open.disabled=!!a.trashedAt;
      open.setAttribute("aria-current", a.id === state.id ? "true" : "false");
      open.addEventListener("click", function () { switchArticle(a.id); }); li.appendChild(open);
      var date = document.createElement("span"); date.className = "muted";
      var parsed = new Date(a.updatedAt); date.textContent = " · " + (isNaN(parsed.getTime()) ? "Unknown date" : parsed.toLocaleString()); open.appendChild(date);
      var menu=document.createElement("details");menu.className="article-menu";
      var summary=document.createElement("summary");summary.textContent="Actions";summary.setAttribute("aria-label","Actions for "+(a.title||"Untitled"));menu.appendChild(summary);li.appendChild(menu);
      if (!a.trashedAt) {
        var rename = document.createElement("button"); rename.type = "button"; rename.textContent = "Rename";
        rename.setAttribute("aria-label", "Rename " + (a.title || "Untitled"));
        rename.addEventListener("click", async function () {
          if (transitioning || closePending) return;
          var title = window.prompt("Article title", a.title || ""); if (title === null) return;
          transitioning = true; setWorkspaceBusy(true);
          try {
          if (!await leaveArticle()) return;
          var next = Object.assign({}, articles.find(function (item) { return item.id === a.id; }), { title: title.slice(0,120), updatedAt: new Date().toISOString() });
          if (!await saveLibraryArticle(next)) return;
          if (state.id === next.id) { state.title = next.title; $("docTitle").value = next.title; }
          renderLibrary();
          } finally { transitioning = false; setWorkspaceBusy(false); }
        }); menu.appendChild(rename);
      }
      var toggle = document.createElement("button"); toggle.type = "button"; toggle.textContent = a.trashedAt ? "Restore" : "Move to trash";
      toggle.setAttribute("aria-label", toggle.textContent + ": " + (a.title || "Untitled"));
      toggle.addEventListener("click", async function () {
        if (transitioning || closePending) return;
        transitioning = true; setWorkspaceBusy(true);
        try {
        if (!await leaveArticle()) return;
        var next = Object.assign({}, articles.find(function (item) { return item.id === a.id; }), { trashedAt: a.trashedAt ? null : new Date().toISOString(), updatedAt: new Date().toISOString() });
        if (!await saveLibraryArticle(next)) return;
        if (next.trashedAt && state.id === next.id) {
          var other = articles.find(function (item) { return !item.trashedAt; });
          state = other ? JSON.parse(JSON.stringify(other)) : freshDoc();
          loadDocIntoUI(); setReview("write"); runAnalysis();
        }
        $("libraryStatus").textContent = next.trashedAt ? "Article moved to trash. Restore it from Show trash." : "Article restored.";
        renderLibrary(); $("libraryTrash").focus();
        } finally { transitioning = false; setWorkspaceBusy(false); }
      }); menu.appendChild(toggle); box.appendChild(li);
    });
    if (!list.length) { var empty = document.createElement("li"); empty.textContent = trash ? "Trash is empty." : "No matching articles. Create one to start writing."; box.appendChild(empty); }
  }
  async function saveLibraryArticle(doc) {
    if (!libraryReady || loadFailed) return false;
    if (prefs.privateSession) { $("libraryStatus").textContent = "Leave private session before changing the saved library."; return false; }
    var payload = JSON.parse(JSON.stringify(doc));
    var job = saveQueue.then(function () { return tauri().saveDoc({ doc: payload, prefs: JSON.parse(JSON.stringify(prefs)) }); }).then(function (result) {
      if (result && result.preferencesSaved === false) copyNote.textContent = "Your article was saved, but preferences could not be saved.";
      var index = articles.findIndex(function (a) { return a.id === payload.id; });
      if (index < 0) articles.push(payload); else articles[index] = payload;
      return true;
    }, function () { setLibraryUnavailable(false); $("libraryStatus").textContent = "Saving failed. Existing articles have been kept; export your current writing."; return false; });
    saveQueue = job.then(function () {});
    return job;
  }
  async function leaveArticle() {
    rememberWorkspace();clearTimeout(saveTimer);await saveQueue;if(!dirty) return true;
    if(prefs.autosave && !prefs.privateSession && await store.save()){
      if(!dirty) return true;copyNote.textContent="The article changed while saving. Stay here until the latest changes are saved.";return false;
    }
    var choice=await chooseLeave(prefs.privateSession?"This private writing has not been saved. Export it from More before discarding if you want a copy.":"Your latest changes have not been saved. You can keep working, save, or discard this working copy.");
    if(choice==="save") {var enabled=prefs.autosave;prefs.autosave=true;var saved=await store.save();prefs.autosave=enabled;schedulePrefs();return !!saved && !dirty;}
    if(choice==="discard"){dirty=false;return true;}return false;
  }
  async function switchArticle(id) {
    if (transitioning || closePending || id === state.id) return;
    transitioning = true; setWorkspaceBusy(true);
    try {
      if (!await leaveArticle()) return;
      var next = articles.find(function (a) { return a.id === id && !a.trashedAt; });
      if (!next) return;
      state = JSON.parse(JSON.stringify(next)); loadDocIntoUI(); setReview("write"); restoreWorkspace(); runAnalysis(); closePanel("workspaceDialog"); if(previewOpen) $("readingPreview").focus(); else editor.focus();
      srStatus.textContent = "Opened " + (state.title || "Untitled");
    } finally { transitioning = false; setWorkspaceBusy(false); }
  }
  async function newArticle() {
    if (transitioning || closePending || !libraryReady) return;
    transitioning = true; setWorkspaceBusy(true);
    try {
      if (!await leaveArticle()) return;
      var next = freshDoc();
      if (!prefs.privateSession && !await saveLibraryArticle(next)) return;
      state = next; loadDocIntoUI(); setReview("write"); restoreWorkspace(); runAnalysis(); renderLibrary(); closePanel("workspaceDialog"); $("docTitle").focus();
    } finally { transitioning = false; setWorkspaceBusy(false); }
  }
  $("librarySearch").addEventListener("input", renderLibrary);
  $("libraryTrash").addEventListener("change", renderLibrary);
  $("libraryNew").addEventListener("click", newArticle);
  $("libraryBackup").addEventListener("click", async function () {
    if (transitioning || closePending) return;
    $("importStatus").textContent = "";
    if (!await leaveArticle()) return;
    await saveQueue;
    var data = JSON.stringify({ app: "blunted-library", version: 1, exportedAt: new Date().toISOString(), articles: articles, settings: { prefs: prefs } }, null, 2);
    try {
      var ok = await tauri().saveFile("blunted-library.json", data);
      $("libraryStatus").textContent = ok ? "Library backup saved, including trash and settings." : "Backup cancelled.";
    } catch (e) { $("libraryStatus").textContent = "Backup failed. Your library is still on this device."; }
  });
  $("libraryRestore").addEventListener("click", function () { if (!transitioning && !closePending) $("libraryPick").click(); });
  $("libraryPick").addEventListener("change", function (e) {
    if (transitioning || closePending) return;
    var revision = ++restoreReadRevision;
    var file = e.target.files && e.target.files[0]; if (!file) return;
    pendingRestore = null; $("restoreChoices").hidden = true; $("importStatus").textContent = "";
    var reader = new FileReader();
    reader.onload = function () {
      if (revision !== restoreReadRevision || transitioning || closePending) return;
      try {
        var backup = JSON.parse(String(reader.result)); Engine.validateLibraryBackup(backup);
        pendingRestore = backup; $("restoreChoices").hidden = false;
        var conflicts = backup.articles.filter(function (a) { return articles.some(function (b) { return a.id === b.id; }); }).length;
        $("restoreSummary").textContent = backup.articles.length + " articles, including trash. " + conflicts + " existing IDs. Settings are included; choose whether to restore them.";
        if (!$("workspaceDialog").hidden && !$("libraryPanel").hidden) $("restoreConflict").focus();
      } catch (err) { $("importStatus").textContent = err.message || "Could not read this backup. Nothing changed."; }
    };
    reader.onerror = function () { if (revision === restoreReadRevision && !transitioning) $("importStatus").textContent = "Could not read the backup. Nothing changed."; };
    try { reader.readAsText(file); } catch (e) { reader.onerror(); } e.target.value = "";
  });
  $("restoreCancel").addEventListener("click", function () { if (transitioning || closePending) return; restoreReadRevision++; pendingRestore = null; $("restoreChoices").hidden = true; $("libraryRestore").focus(); });
  $("restoreConfirm").addEventListener("click", async function () {
    if (!pendingRestore || transitioning || closePending) return;
    var backup = JSON.parse(JSON.stringify(pendingRestore));
    var conflict = $("restoreConflict").value, restoreSettings = $("restoreSettings").checked;
    restoreReadRevision++; persistenceEpoch++; importing = true; transitioning = true;
    clearTimeout(prefsTimer); clearTimeout(workspaceTimer); setWorkspaceBusy(true);
    var region = $("importStatus"), count = 0, skipped = 0;
    region.textContent = "Importing articles…"; region.setAttribute("aria-busy", "true");
    if (!$("workspaceDialog").hidden) region.focus();
    try {
      if (!await leaveArticle()) { region.textContent = "Import did not start. 0 articles imported; 0 skipped. Current preferences retained."; return; }
      for (var incoming of backup.articles) {
        var doc = cleanArticle(JSON.parse(JSON.stringify(incoming)));
        if (articles.some(function (a) { return a.id === doc.id; })) {
          if (conflict === "skip") { skipped++; continue; }
          doc.id = articleId(); doc.title += " (imported copy)";
        }
        if (!await saveLibraryArticle(doc)) { region.textContent = "Import interrupted: " + count + " articles imported; " + skipped + " skipped. Saving failed. Existing articles were kept. Current preferences retained."; return; }
        count++;
      }
      var restoredSettings = false;
      if (restoreSettings && backup.settings && backup.settings.prefs) {
        var nextPrefs = sanitizePrefs(backup.settings.prefs);
        try { await queueNativePreferences(nextPrefs); prefs = nextPrefs; applyPrefs(); setReview(prefs.review); restoredSettings = true; }
        catch (e) { region.textContent = count + " articles imported; " + skipped + " skipped. Preferences could not be saved. Current preferences retained."; return; }
      }
      pendingRestore = null; $("restoreChoices").hidden = true;
      region.textContent = (count === 0 && skipped ? "All articles skipped. " : "Import complete. ") + count + " articles imported; " + skipped + " skipped. " + (restoredSettings ? "Writing preferences restored." : "Current preferences retained.");
    } catch (e) { region.textContent = "Import interrupted: " + count + " articles imported; " + skipped + " skipped. Current preferences retained."; }
    finally { renderLibrary(); region.setAttribute("aria-busy", "false"); importing = false; transitioning = false; setWorkspaceBusy(false); }
  });
  function renderOutline(report) {
    if (!report) return;
    var box = $("articleOutline"); box.textContent = ""; box.setAttribute("aria-busy","false");
    report.headings.forEach(function (h) {
      var b = document.createElement("button"); b.type = "button"; b.textContent = h.text;
      b.style.marginInlineStart = ((h.level - 1) * 12) + "px";
      b.addEventListener("click", function () { closePanel("workspaceDialog"); if(previewOpen){scrollReadingTo(h.from);$("readingPreview").focus();}else{editor.focus();editor.setSelectionRange(h.from,h.to);scrollToOffset(h.from);}rememberWorkspace(); }); box.appendChild(b);
    });
    if (!report.headings.length) box.textContent = "Your headings will appear here.";
    var sections = $("sectionLengths"); sections.textContent = "";
    report.sections.forEach(function (section) { var p = document.createElement("p"); p.textContent = section.title + " · " + section.words + " words"; sections.appendChild(p); });
  }
  // Preview renders known local markup only. Link inspection never requests a URL.
  function appendInline(parent,text) {
    var pattern=/(!?\[([^\]\n]+)\]\(([^\n)]*)\)|`([^`\n]+)`|\*\*([^*\n]+)\*\*|\*([^*\n]+)\*)/g,last=0,m;
    while((m=pattern.exec(text))){
      parent.appendChild(document.createTextNode(text.slice(last,m.index)));
      var node;
      if(m[2]){
        if(m[0][0]==="!"){node=document.createElement("span");node.className="image-placeholder";node.textContent="Image omitted: "+m[2]+" ("+m[3]+")";}
        else {node=document.createElement("details");node.className="source-link";var summary=document.createElement("summary");summary.textContent=m[2];summary.setAttribute("aria-label",m[2]+" — inspect link destination");node.appendChild(summary);var destination=document.createElement("span");destination.textContent=m[3]||"No destination";node.appendChild(destination);}
      } else {node=document.createElement(m[4]?"code":m[5]?"strong":"em");node.textContent=m[4]||m[5]||m[6];}
      parent.appendChild(node);last=pattern.lastIndex;
    }parent.appendChild(document.createTextNode(text.slice(last)));
  }
  function renderReading(target){
    target.textContent="";var blocks=Engine.articleBlocks?Engine.articleBlocks(editor.value):[];
    if(state.title && !(blocks[0] && blocks[0].type==="heading" && blocks[0].level===1 && blocks[0].text===state.title)){var title=document.createElement("h1");title.textContent=state.title;title.dataset.from="0";target.appendChild(title);}
    var list=null,listType=null,expected=null;
    blocks.forEach(function(b){
      var node;
      if(b.type==="list" || b.type==="ordered"){
        if(!list || listType!==b.type){list=document.createElement(b.type==="list"?"ul":"ol");listType=b.type;expected=b.number;if(b.type==="ordered") list.setAttribute("start",String(b.number||1));target.appendChild(list);}
        node=document.createElement("li");if(b.type==="ordered" && b.number!==expected) node.setAttribute("value",String(b.number));expected=(b.number||1)+1;
        node.dataset.from=String(b.from);node.dataset.to=String(b.to);appendInline(node,b.text);list.appendChild(node);return;
      }
      list=null;node=document.createElement(b.type==="heading"?"h"+b.level:b.type==="quote"?"blockquote":b.type==="code"?"pre":"p");node.dataset.from=String(b.from);node.dataset.to=String(b.to);
      if(b.type==="code") node.textContent=b.text;else appendInline(node,b.text);target.appendChild(node);
    });
    if(!blocks.length && editor.value) target.appendChild(document.createTextNode(editor.value));
  }
  function scrollReadingTo(off){
    var nodes=$("readingPreview").querySelectorAll("[data-from]");var target=null;
    for(var i=0;i<nodes.length;i++){if(Number(nodes[i].dataset.from)<=off) target=nodes[i];else break;}
    if(target && target.scrollIntoView) target.scrollIntoView({block:"start"});
  }
  function closePreview(){
    if(!previewOpen) return;var anchor=readingAnchor();previewOpen=false;$("readingPreview").hidden=true;editorWrap.hidden=false;document.body.dataset.preview="false";
    $("reviewInspector").hidden=prefs.review!=="review";$("viewPreview").setAttribute("aria-pressed","false");$("viewWrite").setAttribute("aria-pressed",prefs.review==="write"?"true":"false");$("viewReview").setAttribute("aria-pressed",prefs.review==="review"?"true":"false");
    if(anchor!==readEntryAnchor){editor.setSelectionRange(anchor,anchor);scrollToOffset(anchor);}
  }
  var readEntryAnchor=0;
  $("viewPreview").addEventListener("click",function(){
    if(previewOpen) return;rememberWorkspace();readEntryAnchor=editor.selectionStart||0;renderReading($("readingPreview"));previewOpen=true;$("readingPreview").hidden=false;editorWrap.hidden=true;document.body.dataset.preview="true";$("reviewInspector").hidden=true;
    $("viewPreview").setAttribute("aria-pressed","true");$("viewWrite").setAttribute("aria-pressed","false");$("viewReview").setAttribute("aria-pressed","false");$("moreMenu").open=false;$("readingPreview").focus();if(readEntryAnchor) scrollReadingTo(readEntryAnchor);readEntryAnchor=readingAnchor();rememberWorkspace();
  });

  function formatMarkdown(kind) {
    $("moreMenu").open=false;
    if (transitioning || closePending) return;
    closePreview();
    var from = editor.selectionStart, to = editor.selectionEnd, text = editor.value.slice(from,to), replacement;
    if (kind === "bold" || kind === "italic") { var mark = kind === "bold" ? "**" : "*"; replacement = mark + (text || "text") + mark; }
    else {
      from = editor.value.lastIndexOf("\n", from - 1) + 1;
      text = editor.value.slice(from,to);
      replacement = text.split("\n").map(function (line) { return (kind === "heading" ? "## " : "- ") + line; }).join("\n");
    }
    editor.focus(); editor.setSelectionRange(from,to);
    var ok = false; try { ok = document.execCommand("insertText", false, replacement); } catch (e) {}
    if (!ok) editor.setRangeText(replacement, from,to,"end");
    onTextInput();
  }
  ["Bold", "Italic", "Heading", "List"].forEach(function (kind) { $("format" + kind).addEventListener("click", function () { formatMarkdown(kind.toLowerCase()); }); });
  document.addEventListener("keydown", function (e) {
    if (document.activeElement !== editor || !(e.metaKey || e.ctrlKey) || e.altKey) return;
    if (e.key.toLowerCase() === "b" || e.key.toLowerCase() === "i") { e.preventDefault(); formatMarkdown(e.key.toLowerCase() === "b" ? "bold" : "italic"); }
  });
  window.BluntedWorkspace = {
    prepareClose: async function () {
      if (clearConfirmationOpen) { closeClearConfirmation(); return false; }
      if (transitioning || closePending) { copyNote.textContent = "Please wait for the current library operation to finish."; return false; }
      closePending = true;
      try {
        if (!await leaveArticle()) return false;
        var articleSnapshot = JSON.stringify(state);
        clearTimeout(prefsTimer); await saveQueue;
        if (tauri() && tauri().savePrefs && !prefs.privateSession && !localDataCleared) {
          for (;;) {
            var preferenceSnapshot = JSON.stringify(prefs), discardPreferences = false;
            try { await queueNativePreferences(JSON.parse(preferenceSnapshot)); }
            catch (e) {
              var choice = await chooseLeave("Your writing is protected separately. Preferences could not be saved. Retry, keep working, or exit without saving preferences.", "preferences");
              if (choice === "keep") return false;
              if (choice === "save") continue;
              if (choice !== "discard") return false;
              discardPreferences = true;
            }
            // A preferences-only decision never discards writing edited during this await.
            if (JSON.stringify(state) !== articleSnapshot || dirty || transitioning) return false;
            if (discardPreferences) break;
            if (JSON.stringify(prefs) !== preferenceSnapshot) continue;
            break;
          }
        }
        return !dirty && !transitioning && JSON.stringify(state) === articleSnapshot;
      } finally { closePending = false; }
    }
  };
  window.addEventListener("beforeunload", function (e) {
    if (dirty && !prefs.privateSession) { store.save(); if (dirty) { e.preventDefault(); e.returnValue = ""; } }
  });

  ["btnDownload","btnDownloadTxt","btnCopy","btnPrint","btnNew","btnOpen","btnSample"].forEach(function(id){$(id).addEventListener("click",function(){$("moreMenu").open=false;});});
  document.addEventListener("click",function(e){if(e.target.closest && !e.target.closest("#moreMenu")) $("moreMenu").open=false;});
  // Panels use native dialog focus containment; their opener receives focus on close.
  function openPanel(id, focusId) {
    panelOpener=document.activeElement;panelOpeners[id]=panelOpener;$("moreMenu").open=false;
    ["workspaceDialog","preferencesDialog","metricsDialog","reviewOptionsDialog"].forEach(function(other){if(id!=="leaveDialog" && other!==id && !$(other).hidden){if($(other).close) $(other).close();$(other).hidden=true;}});
    var panel=$(id);panel.hidden=false;if(panel.showModal && !panel.open) panel.showModal();
    if(focusId) $(focusId).focus();
  }
  function closePanel(id) {if (id === "workspaceDialog") { restoreReadRevision++; if (!transitioning) pendingRestore = null; $("importStatus").textContent = ""; } if (id === "preferencesDialog") $("clearStatus").textContent = ""; var panel=$(id);if(panel.close && panel.open) panel.close();panel.hidden=true;var opener=panelOpeners[id];if(opener && opener.focus && (!opener.checkVisibility || opener.checkVisibility()) && (!opener.getClientRects || opener.getClientRects().length)) opener.focus();else if(!initializing) $("viewWrite").focus();}
  function showNavigation(tab) {
    $("libraryPanel").hidden=tab!=="articles" || !libraryReady;$("portableLibrary").hidden=tab!=="articles" || !!(tauri() && tauri().library);
    $("outlinePanel").hidden=tab!=="outline";
    $("navArticles").setAttribute("aria-pressed",tab==="articles"?"true":"false");$("navOutline").setAttribute("aria-pressed",tab==="outline"?"true":"false");
    $("workspaceHeading").textContent=tab==="outline"?"Article outline":"Your articles";
    if(tab==="articles") renderLibrary();
  }
  $("openArticles").addEventListener("click",function(){showNavigation("articles");openPanel("workspaceDialog",libraryReady?"librarySearch":"navOutline");});
  $("openOutline").addEventListener("click",function(){showNavigation("outline");openPanel("workspaceDialog","navOutline");});
  $("navArticles").addEventListener("click",function(){showNavigation("articles");});$("navOutline").addEventListener("click",function(){showNavigation("outline");});
  function showSettings(section) {
    ["Appearance", "Review", "Library"].forEach(function (name) {
      $("settings" + name + "Panel").hidden = name !== section;
      $("settings" + name).setAttribute("aria-pressed", name === section ? "true" : "false");
    });
  }
  ["Appearance", "Review", "Library"].forEach(function (section) {
    $("settings" + section).addEventListener("click", function () { showSettings(section); });
  });
  $("openPreferences").addEventListener("click",function(){showSettings("Appearance");openPanel("preferencesDialog","themeSel");});
  $("openReviewMetrics").addEventListener("click",function(){openPanel("metricsDialog");});
  $("categoryFilter").addEventListener("change",function(){activeCatFilter=$("categoryFilter").value;activeNote=null;if(lastAnalysis){renderIssues(lastAnalysis);renderBackdrop(editor.value,lastAnalysis);}});
  $("openRules").addEventListener("click",function(){showSettings("Review");openPanel("preferencesDialog","profileSel");});
  $("openMetrics").addEventListener("click",function(){openPanel("metricsDialog");});
  $("reviewOptions").addEventListener("click",function(){openPanel("reviewOptionsDialog");});
  document.querySelectorAll("[data-close]").forEach(function(button){button.addEventListener("click",function(){closePanel(button.dataset.close);});});
  ["workspaceDialog","preferencesDialog","metricsDialog","reviewOptionsDialog"].forEach(function(id){$(id).addEventListener("cancel",function(e){e.preventDefault();closePanel(id);});});
  $("leaveDialog").addEventListener("cancel",function(e){e.preventDefault();finishLeave("keep");});
  function finishLeave(choice){ if(!leaveResolve) return; var resolve=leaveResolve;leaveResolve=null;closePanel("leaveDialog");resolve(choice); }
  $("leaveKeep").addEventListener("click",function(){finishLeave("keep");});$("leaveDiscard").addEventListener("click",function(){finishLeave("discard");});$("leaveSave").addEventListener("click",function(){finishLeave("save");});
  function chooseLeave(message, variant){
    if (leaveResolve) return Promise.resolve("keep");
    var preferences = variant === "preferences";
    $("leaveHeading").textContent = preferences ? "Preferences could not be saved" : "Keep this writing?";
    $("leaveKeep").textContent = "Keep working";
    $("leaveSave").textContent = preferences ? "Retry saving preferences" : "Save to library";
    $("leaveDiscard").textContent = preferences ? "Exit without saving preferences" : "Discard unsaved changes";
    $("leaveMessage").textContent=message;$("leaveSave").hidden=!preferences && (prefs.privateSession || !libraryReady);
    return new Promise(function(resolve){leaveResolve=resolve;openPanel("leaveDialog","leaveKeep");});
  }
  $("allNotes").addEventListener("click",function(){findingsLimit=50;issuesEl.hidden=true;$("findingsView").hidden=false;renderFindings();$("findingGroup").focus();});
  $("closeFindings").addEventListener("click",function(){closeFindings();issuesEl.focus();});
  $("findingGroup").value="remaining";
  $("findingGroup").addEventListener("change",function(){findingsLimit=50;activeNote=null;if(lastAnalysis){renderIssues(lastAnalysis);renderBackdrop(editor.value,lastAnalysis);}});
  $("loadMoreNotes").addEventListener("click",function(){var first=findingsLimit;findingsLimit+=50;renderFindings();var next=$("finding-"+first);if(next) next.focus();});
  $("reviewerSel").addEventListener("change",function(){reviewer=$("reviewerSel").value;activeCatFilter="all";$("categoryFilter").value="all";activeNote=null;$("findingGroup").value="remaining";closeFindings();if(lastAnalysis){renderIssues(lastAnalysis);renderBackdrop(editor.value,lastAnalysis);}rememberWorkspace();});
  $("resetDismissals").addEventListener("click",function(){if(!window.confirm("Reset dismissal decisions for this article? All dismissed notes will return.")) return;state.dismissedNotes=[];dirty=true;scheduleSave();if(lastAnalysis) renderIssues(lastAnalysis);srStatus.textContent="Dismissal decisions reset.";});

  // UI state is kept in preferences, separately from prose and modification dates.
  var initializing=true;
  function sanitizeWorkspace(value) {
    var out={activeId:"",positions:{}};if(!value || typeof value!=="object") return out;
    if(typeof value.activeId==="string" && /^[a-zA-Z0-9-]{1,100}$/.test(value.activeId)) out.activeId=value.activeId;
    if(value.positions && typeof value.positions==="object") Object.keys(value.positions).slice(-1000).forEach(function(id){
      if(!/^[a-zA-Z0-9-]{1,100}$/.test(id)) return;var p=value.positions[id];if(!p || typeof p!=="object") return;
      var next={};["start","end","scroll","page","anchor","reviewFrom"].forEach(function(k){if(Number.isFinite(p[k]) && p[k]>=0) next[k]=Math.min(p[k],100000000);});
      next.reading=p.reading===true;next.reviewer=p.reviewer==="structure"?"structure":"clarity";out.positions[id]=next;
    });return out;
  }
  function queueNativePreferences(value) {
    var snapshot = JSON.parse(JSON.stringify(value));
    var job = saveQueue.then(function () { return tauri().savePrefs(snapshot); });
    saveQueue = job.then(function () {}, function () {});
    return job;
  }
  var preferencesStatusRevision = 0;
  function preferenceStatus(message, failed) {
    $("preferencesStatus").textContent = message;
    $("preferencesStatus").setAttribute("data-failed", failed ? "true" : "false");
  }
  function schedulePrefs() {
    if (initializing) return;
    if (prefs.privateSession) { preferenceStatus("Private session: changes are temporary and are not saved."); return; }
    if (loadFailed) { preferenceStatus("Settings cannot be saved while the library is unavailable.", true); return; }
    if (clearing || importing || closePending) return;
    localDataCleared = false;
    var epoch = persistenceEpoch, statusRevision = ++preferencesStatusRevision;
    preferenceStatus("Saving settings…");
    function saved() { if (!prefs.privateSession && epoch === persistenceEpoch && statusRevision === preferencesStatusRevision) preferenceStatus("Settings saved on this device."); }
    function failed() {
      if (prefs.privateSession || epoch !== persistenceEpoch || statusRevision !== preferencesStatusRevision) return;
      preferenceStatus("Settings could not be saved. Try changing a setting again. Your article is kept separately.", true);
      copyNote.textContent="Preferences could not be saved. Your article is kept separately.";
    }
    clearTimeout(prefsTimer);prefsTimer=setTimeout(function(){
      if (prefs.privateSession || clearing || importing || closePending || epoch !== persistenceEpoch) return;
      if(tauri() && tauri().savePrefs){ var job=saveQueue.then(function(){if (prefs.privateSession) return; return tauri().savePrefs(JSON.parse(JSON.stringify(prefs)));}).then(saved,failed);saveQueue=job; }
      else {try{localStorage.setItem(LS_PREFS,JSON.stringify(prefs));saved();}catch(e){failed();}}
    },200);
  }
  function readingAnchor(){
    var nodes=$("readingPreview").querySelectorAll("[data-from]");
    for(var i=0;i<nodes.length;i++){if(nodes[i].getBoundingClientRect().bottom>88) return Number(nodes[i].dataset.from);}
    return editor.selectionStart || 0;
  }
  function rememberWorkspace(){
    if(initializing || !state || prefs.privateSession || clearing || importing) return;
    prefs.workspace=sanitizeWorkspace(prefs.workspace);prefs.workspace.activeId=state.id;
    prefs.workspace.positions[state.id]={start:editor.selectionStart||0,end:editor.selectionEnd||0,scroll:editor.scrollTop||0,page:window.scrollY||0,anchor:previewOpen?readingAnchor():editor.selectionStart||0,reading:previewOpen,reviewer:reviewer,reviewFrom:activeNote?activeNote.from:editor.selectionStart||0};schedulePrefs();
  }
  function restoreWorkspace(){
    var p=prefs.workspace && prefs.workspace.positions[state.id];
    if(p){editor.setSelectionRange(Math.min(p.start||0,editor.value.length),Math.min(p.end||p.start||0,editor.value.length));editor.scrollTop=p.scroll||0;reviewer=p.reviewer||"clarity";$("reviewerSel").value=reviewer;activeNote={from:p.reviewFrom||p.start||0,ruleId:"",exactText:""};if(window.scrollTo) window.scrollTo(0,p.page||0);}
    else {editor.setSelectionRange(0,0);editor.scrollTop=0;reviewer="clarity";$("reviewerSel").value=reviewer;activeNote=null;}
    prefs.workspace=sanitizeWorkspace(prefs.workspace);prefs.workspace.activeId=state.id;syncScroll();
    if(p && p.reading){editor.setSelectionRange(Math.min(p.anchor||0,editor.value.length),Math.min(p.anchor||0,editor.value.length));$("viewPreview").click();scrollReadingTo(p.anchor||0);}
  }
  ["select","keyup","mouseup","scroll","blur"].forEach(function(type){editor.addEventListener(type,function(){if(clearing) return;var epoch=persistenceEpoch;clearTimeout(workspaceTimer);workspaceTimer=setTimeout(function(){if(epoch===persistenceEpoch) rememberWorkspace();},100);});});
  window.addEventListener("scroll",function(){if(clearing) return;var epoch=persistenceEpoch;clearTimeout(workspaceTimer);workspaceTimer=setTimeout(function(){if(epoch===persistenceEpoch) rememberWorkspace();},150);});
  window.addEventListener("resize",function(){if(prefs.review==="review" && activeNote && !previewOpen) scrollToOffset(activeNote.from);});

  // ---------- init ----------
  function init() {
    editor.disabled = true; $("docTitle").disabled = true; $("btnNew").disabled = true; $("btnOpen").disabled = true;
    var loaded = null;
    try { loaded = store.load(); } catch (e) { loaded = null; }
    // Tauri loadDoc is async (IPC promise); web load is sync.
    if (loaded && typeof loaded.then === "function") {
      loaded.then(function (v) { initWith(v); }, function () { loadFailed = true; initWith(null); setLibraryUnavailable(); copyNote.textContent = "Library could not be loaded. Export any new writing or retry the original location."; setSaveState("Library unavailable — changes will not be saved"); });
    } else {
      initWith(loaded);
    }
  }

  function initWith(loaded) {
    if (tauri() && tauri().library && loaded && Array.isArray(loaded.articles)) {
      articles = loaded.articles.map(cleanArticle);
      libraryReady = true;
      var wanted=loaded.prefs && loaded.prefs.workspace && loaded.prefs.workspace.activeId;
      var active=articles.find(function(a){return a.id===wanted && !a.trashedAt;}) || articles.filter(function(a){return !a.trashedAt;}).sort(function(a,b){return b.updatedAt.localeCompare(a.updatedAt);})[0];
      loaded.doc = active || freshDoc();
      $("libraryPanel").hidden = false;
      $("portableLibrary").hidden=true;
      $("saveLocation").textContent=loaded.location ? "Saved in: "+loaded.location : "Saved on this device in the selected library folder.";
      renderLibrary();
    }
    if (loaded && loaded.needs_folder && tauri() && tauri().chooseFolder) {
      tauri().chooseFolder().then(function (path) {
        initWith(Object.assign({}, loaded, { needs_folder: false }));
        if (path) scheduleSave();
        else copyNote.textContent = "Folder not selected. Autosave will use app storage for now; choose a folder on next launch.";
      }, function () {
        initWith(Object.assign({}, loaded, { needs_folder: false }));
        copyNote.textContent = "Folder selection failed. Autosave will use app storage for now.";
      });
      return;
    }
    editor.disabled = false; $("docTitle").disabled = false; $("btnNew").disabled = false; $("btnOpen").disabled = false;
    var startupFailed = false;
    function startupStep(fn) {
      try { fn(); }
      catch (e) { startupFailed = true; }
    }
    var wasRecovered = !!(loaded && loaded.recovered);
    var wasCorrupt = !!(loaded && loaded.corrupt);
    if (loaded && loaded.prefs) {
      startupStep(function () {
        prefs = sanitizePrefs(loaded.prefs);
        delete prefs.replyMode; // removed with Email mode
      });
    }
    if (loaded && loaded.doc && typeof loaded.doc.body === "string") {
      startupStep(function () {
        state = cleanArticle(loaded.doc);
        state.modeId = normalizeMode(state.modeId);
        delete state.subject;
        if (!state.ruleOverrides || typeof state.ruleOverrides !== "object" || Array.isArray(state.ruleOverrides)) state.ruleOverrides = {};
        if (!Array.isArray(state.ignoredTerms)) state.ignoredTerms = [];
        if (!Array.isArray(state.personalWords)) state.personalWords = [];
        migrateLegacyRuleOverrides();
        if (!Array.isArray(state.ignoredRuleIds)) state.ignoredRuleIds = [];
      });
    }
    startupStep(applyPrefs);
    // Keep the editor's default font available even if an unrelated
    // preference control fails while applying saved preferences.
    startupStep(function () {
      if (!document.body.dataset.font) document.body.dataset.font = prefs.fontFamily || "serif";
    });
    startupStep(function () { setReview(prefs.review === "review" ? "review" : "write"); });
    startupStep(function () {
      editor.value = state.body || "";
      $("docTitle").value = state.title || "";
      $("ignoredTerms").value = state.ignoredTerms.join(", ");
      $("personalWords").value = state.personalWords.join(", ");
      dirty = false;
    });
    // These controls initialize independently so a failure applying fonts
    // or restoring document fields cannot leave either rule panel empty.
    startupStep(renderProfileControls);
    startupStep(updateCustomNote);
    startupStep(updateSampleVisibility);
    if (wasRecovered) {
      dirty = true; // re-save the recovered draft over the bad main slot
      setSaveState("Recovered from backup");
      copyNote.textContent = "Recovered your draft from a local backup — the main save was unreadable. Download a copy to be safe.";
      scheduleSave();
    } else if (wasCorrupt || !storageOK) {
      setSaveState(storageMsg || "Saved data unreadable");
      copyNote.textContent = storageMsg || "Saved data unreadable. Download a copy before writing.";
    }
    else if (prefs.privateSession) setSaveState("Private session — not saved");
    else setSaveState(loaded && loaded.doc ? "Saved" : "Ready");
    startupStep(restoreWorkspace);
    initializing=false;
    schedulePrefs();
    startupStep(syncScroll);
    startupStep(runAnalysis);
    if (startupFailed) {
      copyNote.textContent = "Some preferences or controls could not be initialized. Keyboard shortcuts remain available.";
    }
  }

  // Prefs from storage are untrusted input: keep known keys, sane ranges.
  function sanitizePrefs(p) {
    var out = {};
    var allow = ["theme", "fontSize", "fontFamily", "lineHeight", "wpm", "review", "privateSession", "autosave", "includeQuotes", "includeHeader", "exportHeadline", "workspace", "activeProfile", "profiles", "proofreadingDialect", "spelling", "grammar"];
    for (var i = 0; i < allow.length; i++) {
      if (p[allow[i]] !== undefined) out[allow[i]] = p[allow[i]];
    }
    if (["system", "light", "dark"].indexOf(out.theme) === -1) delete out.theme;
    if (!Number.isFinite(out.fontSize) || out.fontSize < 13 || out.fontSize > 24) delete out.fontSize;
    if (["system", "serif", "mono"].indexOf(out.fontFamily) === -1) delete out.fontFamily;
    if (!Number.isFinite(out.lineHeight) || out.lineHeight < 1.2 || out.lineHeight > 2.5) delete out.lineHeight;
    if (!Number.isFinite(out.wpm) || out.wpm < 100 || out.wpm > 400) delete out.wpm;
    if (out.review !== "write" && out.review !== "review") delete out.review;
    ["autosave", "privateSession", "includeQuotes", "includeHeader", "exportHeadline", "spelling", "grammar"].forEach(function (k) { if (typeof out[k] !== "boolean") delete out[k]; });
    if (["american", "british", "australian", "canadian", "indian"].indexOf(out.proofreadingDialect) < 0) delete out.proofreadingDialect;
    if (out.activeProfile !== "clear" && out.activeProfile !== "essay") out.activeProfile = "clear";
    if (!out.profiles || typeof out.profiles !== "object" || Array.isArray(out.profiles)) out.profiles = {};
    ["clear", "essay"].forEach(function (id) {
      var p = out.profiles[id]; if (!p || typeof p !== "object" || Array.isArray(p)) { delete out.profiles[id]; return; }
      ["targetGrade", "yellowWords", "redWords", "yellowGrade", "redGrade", "minGradeWords"].forEach(function (k) { if (!Number.isFinite(p[k])) delete p[k]; });
      if (p.targetGrade < 1 || p.targetGrade > 35) delete p.targetGrade;
      if (p.minGradeWords < 5 || p.minGradeWords > 100) delete p.minGradeWords;
      if (p.yellowWords < 5 || p.yellowWords > 100) delete p.yellowWords;
      if (p.redWords < 8 || p.redWords > 150) delete p.redWords;
      if (p.yellowGrade < 1 || p.yellowGrade > 30) delete p.yellowGrade;
      if (p.redGrade < 2 || p.redGrade > 35) delete p.redGrade;
      if (p.rules && typeof p.rules === "object" && !Array.isArray(p.rules)) {
        var clean = {}; KNOWN_RULES.concat(["hedge"]).forEach(function (k) { var v=p.rules[k]; if (v === true || v === false || v === "normal" || v === "strict" || (k === "hedge" && (v === "off" || v === "note"))) clean[k]=v; }); p.rules=clean;
      } else delete p.rules;
      if (p.yellowWords && p.redWords && p.redWords < p.yellowWords) { delete p.yellowWords; delete p.redWords; }
      if (p.yellowGrade && p.redGrade && p.redGrade < p.yellowGrade) { delete p.yellowGrade; delete p.redGrade; }
    });
    out.workspace = sanitizeWorkspace(out.workspace || prefs.workspace);
    return Object.assign({}, prefs, out);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
