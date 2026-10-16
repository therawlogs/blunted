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
    id: "doc-" + Date.now().toString(36),
    title: "", modeId: SINGLE_MODE, body: "",
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    ruleOverrides: {}, ignoredRuleIds: [], ignoredTerms: [], personalWords: [],
  };
  var prefs = { theme: "system", fontSize: 16, fontFamily: "serif", lineHeight: 1.8, wpm: 200, review: "review", privateSession: false, autosave: true, includeQuotes: false, includeHeader: false, activeProfile: "clear", profiles: {} };
  var dirty = false;            // unsaved changes vs storage
  var lastAnalysis = null;
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
      if (open && !/input|textarea|select/i.test(document.activeElement.tagName)) open.removeAttribute("open");
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
      if (!prefs.autosave) { setSaveState("Autosave off"); return; }
      if (prefs.privateSession) { setSaveState("Private session — not saved"); return; }
      var t = tauri();
      var payload = { doc: state, prefs: prefs };
      if (t && t.saveDoc) {
        try {
          var r = t.saveDoc(payload);
          // adapter returns a promise in the shell; failures surface async
          if (r && r.then) r.then(function () { setSaveState("Saved"); dirty = false; }, function () { setSaveState("Saving failed — Download .md to keep a copy."); });
          else { setSaveState("Saved"); dirty = false; }
        }
        catch (e) { setSaveState("Saving failed — Download .md to keep a copy."); }
        return;
      }
      try {
        var prev = null;
        try { prev = localStorage.getItem(LS_DOC); } catch (e) { prev = null; }
        if (prev) {
          // rotate: c <- b <- a <- previous main doc
          try {
            localStorage.setItem(LS_BACKUPS[2], localStorage.getItem(LS_BACKUPS[1]) || "");
            localStorage.setItem(LS_BACKUPS[1], localStorage.getItem(LS_BACKUPS[0]) || "");
            localStorage.setItem(LS_BACKUPS[0], prev);
          } catch (e) { /* rotation best-effort; main save matters most */ }
        }
        localStorage.setItem(LS_DOC, JSON.stringify(state));
        localStorage.setItem(LS_PREFS, JSON.stringify(prefs));
        setSaveState("Saved"); dirty = false;
      } catch (e) {
        storageOK = false;
        setSaveState("Saving failed");
        storageMsg = "Saving failed (storage full or blocked): Download .md to keep a copy.";
      }
    },
    clear: function () {
      var t = tauri();
      if (t && t.clearAll) { try { t.clearAll(); } catch (e) {} }
      try {
        localStorage.removeItem(LS_DOC); localStorage.removeItem(LS_PREFS);
        for (var i = 0; i < LS_BACKUPS.length; i++) localStorage.removeItem(LS_BACKUPS[i]);
        // legacy single-slot backup from v1
        localStorage.removeItem("blunted.backup.v1");
      } catch (e) {}
    },
  };

  function setSaveState(s) { statusSave.textContent = s; }

  // ---------- worker (Blob, no external file) + main-thread fallback ----------
  var worker = null, workerOK = false;
  try {
    if (window.Worker && window.Blob && window.BluntedWorkerSrc) {
      worker = new Worker(URL.createObjectURL(new Blob([window.BluntedWorkerSrc], { type: "text/javascript" })));
      workerOK = true;
      worker.onmessage = function (e) {
        var d = e.data || {};
        if (d.rev !== lastWorkerRev) return; // stale
        if (d.ok) renderAnalysis(d.result);
      };
      worker.onerror = function () { workerOK = false; analyzeMainThread(); };
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
      text: editor.value, mode: prefs.activeProfile || SINGLE_MODE,
      overrides: buildOverrides(), ignoredTerms: state.ignoredTerms, personalWords: state.personalWords,
      ignoredRuleIds: state.ignoredRuleIds,
      textRevision: rev,
    };
    if (workerOK && worker) {
      lastWorkerRev = rev;
      try { worker.postMessage(req); } catch (e) { workerOK = false; analyzeMainThread(req, rev); }
      // safety: if worker silent for 2s, fall back (still render worker if it arrives later with newer rev)
      setTimeout(function () {
        if (lastAnalysis && lastAnalysis.textRevision >= rev) return;
        analyzeMainThread(req, rev);
      }, 2000);
    } else {
      analyzeMainThread(req, rev);
    }
  }

  function analyzeMainThread(req, rev) {
    req = req || {
      text: editor.value, mode: prefs.activeProfile || SINGLE_MODE, overrides: buildOverrides(),
      ignoredTerms: state.ignoredTerms, personalWords: state.personalWords, ignoredRuleIds: state.ignoredRuleIds,
      textRevision: currentRev,
    };
    rev = rev || currentRev;
    if (rev < currentRev) return; // stale
    var r;
    try { r = Engine.analyze(req); }
    catch (e) { return; }
    if (rev < currentRev) return; // stale
    renderAnalysis(r);
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
    lastAnalysis = r;
    renderBackdrop(editor.value, r);
    renderScore(r);
    renderIssues(r);
    scheduleSave();
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
    // Build non-overlapping segments with class lists. Sentence marks =
    // backgrounds; word-level rule issues = per-category underlines.
    // Red wins (one bg). Sweep-line over sorted cuts: both mark lists are
    // in document order. Overlapping underlines keep every category class
    // (stylesheet order wins the paint); the notes list still shows each.
    var sentMarks = [];
    for (var i = 0; i < r.sentences.length && sentMarks.length < MAX_BG; i++) {
      var s = r.sentences[i];
      if (s.mark && !s.excluded) sentMarks.push({ from: s.from, to: s.to, cls: s.mark === "red" ? "mk-r" : "mk-y" });
    }
    var underlines = [];
    for (var j = 0; j < r.issues.length && underlines.length < MAX_UL; j++) {
      var is = r.issues[j];
      if (is.from === is.to) continue;
      if (is.category === "sentence" || is.category === "paragraph" || is.category === "length") continue;
      if (activeCatFilter !== "all" && is.category !== activeCatFilter) continue;
      underlines.push({ from: is.from, to: is.to, cls: catToUl(is.category) });
    }
    underlines.sort(function (a, b) { return a.from - b.from || a.to - b.to; });
    var cutSet = {};
    cutSet[0] = 1; cutSet[text.length] = 1;
    var k;
    for (k = 0; k < sentMarks.length; k++) { cutSet[sentMarks[k].from] = 1; cutSet[sentMarks[k].to] = 1; }
    for (k = 0; k < underlines.length; k++) { cutSet[underlines[k].from] = 1; cutSet[underlines[k].to] = 1; }
    var cuts = Object.keys(cutSet).map(Number).sort(function (a, b) { return a - b; });
    var frag = document.createDocumentFragment();
    var mi = 0;
    for (var c = 0; c < cuts.length - 1; c++) {
      var a = Math.max(0, cuts[c]), b = Math.min(text.length, cuts[c + 1]);
      if (b <= a) continue;
      while (mi < sentMarks.length && sentMarks[mi].to <= a) mi++;
      var cls = [];
      if (mi < sentMarks.length && sentMarks[mi].from <= a && b <= sentMarks[mi].to) cls.push(sentMarks[mi].cls);
      // all underline categories covering this slice (cuts align to every
      // boundary, so coverage is full containment)
      for (var u = 0; u < underlines.length; u++) {
        var ub = underlines[u];
        if (ub.from >= b) break;
        if (ub.from <= a && b <= ub.to) {
          if (cls.indexOf(ub.cls) === -1) cls.push(ub.cls);
        }
      }
      var chunk = text.slice(a, b);
      if (cls.length === 0) {
        frag.appendChild(document.createTextNode(chunk));
      } else {
        var sp = document.createElement("span");
        sp.className = cls.join(" ");
        sp.appendChild(document.createTextNode(chunk));
        frag.appendChild(sp);
      }
    }
    // trailing-newline alignment: textarea renders an extra line for final \n
    if (text.charAt(text.length - 1) === "\n") {
      var z = document.createElement("span");
      z.appendChild(document.createTextNode("​"));
      frag.appendChild(z);
    }
    backdrop.textContent = "";
    backdrop.appendChild(frag);
    syncScroll();
  }

  function renderScore(r) {
    var m = r.metrics;
    var wc = m.eligibleWords, tw = m.totalWords;
    statusWords.textContent = tw === wc ? wc + " words" : wc + " prose words (" + tw + " total)";
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
    sentence: "Sentence length", passive: "Passive voice", adverb: "Adverb",
    wordiness: "Wordiness", hedge: "Hedge", simpler: "Simpler word",
    repeated: "Repeated word", paragraph: "Paragraph", length: "Length",
    todo: "Placeholder",
  };

  function renderIssues(r) {
    issuesEl.textContent = "";
    selectedIssue = -1;
    var full = r.issues.filter(function (i) { return i.from !== i.to || i.severity === "limit" || i.severity === "info"; });
    r._uiFull = full;
    renderCatSummary(full);
    var list = activeCatFilter === "all" ? full : full.filter(function (i) { return i.category === activeCatFilter; });
    issueCount.textContent = full.length ? "(" + (activeCatFilter === "all" ? full.length : list.length + " of " + full.length) + ")" : "";
    updateNotesChip(full, r);
    if (!list.length) {
      var li = document.createElement("li");
      li.className = "empty-issues";
      li.appendChild(document.createTextNode(activeCatFilter === "all"
        ? "No issues found. A clear page is not a promise of perfect prose."
        : "No “" + (CAT_LABEL[activeCatFilter] || activeCatFilter) + "” notes — filter cleared list. Tap All to reset."));
      issuesEl.appendChild(li);
      r._uiList = list;
      // still re-render backdrop for filter changes (caller re-renders)
      return;
    }
    // cap DOM size for very long docs
    var cap = 400;
    for (var i = 0; i < Math.min(list.length, cap); i++) {
      (function (issue, idx) {
        var b = document.createElement("button");
        b.type = "button"; b.className = "issue"; b.dataset.sev = issue.severity; b.dataset.cat = issue.category;
        b.setAttribute("aria-label", (CAT_LABEL[issue.category] || issue.category) + ", " + issue.severity + ": " + issue.explanation);
        var cat = document.createElement("span"); cat.className = "cat";
        cat.appendChild(document.createTextNode((CAT_LABEL[issue.category] || issue.category) + " · " + issue.severity));
        var ex = document.createElement("span"); ex.className = "excerpt";
        ex.appendChild(document.createTextNode(issue.exactText ? truncate(issue.exactText, 120) : "—"));
        var why = document.createElement("span"); why.className = "why";
        why.appendChild(document.createTextNode(issue.explanation));
        b.appendChild(cat); b.appendChild(ex); b.appendChild(why);
        if (issue.fix && issue.fix.replacement != null && issue.from !== issue.to) {
          var f = document.createElement("span"); f.className = "fix";
          var fb = document.createElement("button");
          fb.type = "button";
          var lbl = issue.fix.replacement === "" ? "Remove word" : "Apply: “" + issue.fix.replacement + "”";
          fb.appendChild(document.createTextNode(lbl));
          fb.setAttribute("aria-label", lbl + " for " + (CAT_LABEL[issue.category] || issue.category));
          fb.addEventListener("click", function (ev) { ev.stopPropagation(); applyFix(issue); });
          f.appendChild(fb); b.appendChild(f);
        }
        b.addEventListener("click", function () { selectIssue(idx); });
        b.id = "issue-" + idx;
        var li2 = document.createElement("li");
        li2.appendChild(b);
        issuesEl.appendChild(li2);
      })(list[i], i);
    }
    if (list.length > cap) {
      var more = document.createElement("li");
      more.className = "empty-issues";
      more.appendChild(document.createTextNode("Showing first " + cap + " of " + list.length + " issues."));
      issuesEl.appendChild(more);
    }
    r._uiList = list;
  }

  var CAT_ORDER = ["passive", "adverb", "wordiness", "simpler", "repeated", "hedge", "todo", "sentence"];

  function renderCatSummary(full) {
    var box = $("catSummary");
    if (!box) return;
    box.textContent = "";
    if (!full.length) return;
    var counts = {};
    for (var i = 0; i < full.length; i++) {
      var c = full[i].category || "other";
      counts[c] = (counts[c] || 0) + 1;
    }
    function chip(cat, label) {
      var n = counts[cat] || 0;
      if (!n) return;
      var b = document.createElement("button");
      b.type = "button"; b.className = "chip";
      b.setAttribute("aria-pressed", activeCatFilter === cat ? "true" : "false");
      var d = document.createElement("span");
      d.className = "dot dot-" + (CAT_ORDER.indexOf(cat) !== -1 ? cat : "other");
      d.setAttribute("aria-hidden", "true");
      b.appendChild(d);
      b.appendChild(document.createTextNode(label + " "));
      var nn = document.createElement("span"); nn.className = "n";
      nn.appendChild(document.createTextNode(String(n)));
      b.appendChild(nn);
      b.setAttribute("aria-label", "Filter to " + n + " " + label + " notes");
      b.addEventListener("click", function () {
        activeCatFilter = (activeCatFilter === cat) ? "all" : cat;
        if (lastAnalysis) {
          renderBackdrop(editor.value, lastAnalysis);
          renderIssues(lastAnalysis);
        }
      });
      box.appendChild(b);
    }
    // All reset first
    var all = document.createElement("button");
    all.type = "button"; all.className = "chip";
    all.setAttribute("aria-pressed", activeCatFilter === "all" ? "true" : "false");
    all.appendChild(document.createTextNode("All "));
    var an = document.createElement("span"); an.className = "n";
    an.appendChild(document.createTextNode(String(full.length)));
    all.appendChild(an);
    all.setAttribute("aria-label", "Show all " + full.length + " notes");
    all.addEventListener("click", function () {
      activeCatFilter = "all";
      if (lastAnalysis) { renderBackdrop(editor.value, lastAnalysis); renderIssues(lastAnalysis); }
    });
    box.appendChild(all);
    var labels = { passive: "passive", adverb: "adverb", wordiness: "wordy", simpler: "simpler", repeated: "repeated", hedge: "hedge", todo: "todo", sentence: "sentence" };
    for (var k = 0; k < CAT_ORDER.length; k++) chip(CAT_ORDER[k], labels[CAT_ORDER[k]]);
    // any other categories present
    for (var key in counts) {
      if (CAT_ORDER.indexOf(key) === -1) chip(key, CAT_LABEL[key] || key);
    }
  }

  function updateNotesChip(full, r) {
    var chipEl = $("notesChip");
    if (!chipEl) return;
    if (!full.length) { chipEl.hidden = true; return; }
    chipEl.hidden = false;
    var g = r && r.metrics && (r.metrics.grade || r.metrics.provisionalGrade);
    var gl = g ? (g.label === "College+" ? "College+" : "grade " + g.label) : "no grade yet";
    chipEl.textContent = full.length + " notes · " + gl + " — tap to review";
  }

  function truncate(s, n) {
    s = String(s).replace(/\s+/g, " ");
    return s.length > n ? s.slice(0, n - 1) + "…" : s;
  }

  function selectIssue(idx) {
    var list = lastAnalysis && lastAnalysis._uiList;
    if (!list || !list[idx]) return;
    selectedIssue = idx;
    var issue = list[idx];
    var btns = issuesEl.querySelectorAll(".issue");
    for (var i = 0; i < btns.length; i++) btns[i].setAttribute("aria-current", i === idx ? "true" : "false");
    if (issue.from !== issue.to) {
      editor.focus();
      try { editor.setSelectionRange(issue.from, issue.to); } catch (e) {}
      // ensure visible
      scrollToOffset(issue.from);
    }
    var el = $("issue-" + idx);
    if (el && el.scrollIntoView) { try { el.scrollIntoView({ block: "nearest" }); } catch (e) {} }
  }

  function scrollToOffset(off) {
    // approximate: temporarily move selection already focuses; ensure textarea scrolls
    try {
      var ta = editor;
      var textBefore = ta.value.slice(0, off);
      var lines = textBefore.split("\n").length;
      var lineH = parseFloat(getComputedStyle(ta).lineHeight) || 27;
      ta.scrollTop = Math.max(0, lines * lineH - ta.clientHeight / 2);
      syncScroll();
    } catch (e) {}
  }

  function stepIssue(dir) {
    var list = lastAnalysis && lastAnalysis._uiList;
    if (!list || !list.length) return;
    var n = selectedIssue + dir;
    if (n < 0) n = list.length - 1;
    if (n >= list.length) n = 0;
    selectIssue(n);
    var el = $("issue-" + n);
    if (el) el.focus();
  }

  // one-click fix: single undoable edit, rechecks exactText + revision.
  // Empty replacements (adverb removals) also consume one adjacent space
  // so "ran quickly today" becomes "ran today", not "ran  today".
  function applyFix(issue, silent) {
    var revAtClick = currentRev;
    var cur = editor.value;
    if (!issue.fix || issue.fix.replacement == null) return false;
    if (cur.slice(issue.from, issue.to) !== issue.exactText) {
      if (!silent) copyNote.textContent = "Text changed — fix not applied. Review the issue again.";
      return false;
    }
    var from = issue.from, to = issue.to, rep = issue.fix.replacement;
    if (rep === "") {
      if (cur[to] === " " || cur[to] === "\t") to += 1;
      else if ((cur[from - 1] === " " || cur[from - 1] === "\t") && cur[to] !== "\n") from -= 1;
    }
    if (!silent) {
      try {
        editor.focus();
        editor.setSelectionRange(from, to);
      } catch (e) {}
    }
    var ok = false;
    if (!silent) {
      try { ok = document.execCommand("insertText", false, rep); } catch (e) { ok = false; }
    }
    if (!ok && editor.setRangeText) {
      // setRangeText stays inside the browser's undo history (one step),
      // unlike a value splice which breaks it.
      try {
        var wasFocused = (document.activeElement === editor);
        editor.setRangeText(rep, from, to, "end");
        if (!silent && !wasFocused) { /* keep focus where it was for bulk */ }
        ok = true;
      }
      catch (e) { ok = false; }
    }
    if (!ok) {
      // last resort: value splice (undo grouping may not hold everywhere)
      editor.value = cur.slice(0, from) + rep + cur.slice(to);
    }
    if (!silent) {
      onTextInput();
      copyNote.textContent = "Applied. Undo with " + (navigator.platform.indexOf("Mac") !== -1 ? "Cmd+Z" : "Ctrl+Z") + " if the meaning changed.";
    }
    void revAtClick;
    return true;
  }

  // Bulk: safe non-empty replacements only (wordiness, simpler, repeated).
  // Adverb removals stay per-note (they delete meaning); hedges never have
  // fixes. Applied back-to-front so offsets stay valid; each rechecks exactText.
  function applyAllFixes() {
    var list = lastAnalysis && (lastAnalysis._uiFull || lastAnalysis._uiList);
    if (!list || !list.length) return;
    var cands = list.filter(function (i) {
      return i.fix && i.fix.replacement != null && i.fix.replacement !== "" && i.from !== i.to;
    }).sort(function (a, b) { return b.from - a.from; });
    if (!cands.length) {
      copyNote.textContent = "No safe replacements to apply.";
      return;
    }
    var okN = 0, skipN = 0;
    editor.focus();
    for (var k = 0; k < cands.length; k++) {
      var it = cands[k];
      if (editor.value.slice(it.from, it.to) !== it.exactText) { skipN++; continue; }
      try { editor.setSelectionRange(it.from, it.to); } catch (e) {}
      var done = false;
      try { done = document.execCommand("insertText", false, it.fix.replacement); } catch (e) { done = false; }
      if (!done && editor.setRangeText) {
        try { editor.setRangeText(it.fix.replacement, it.from, it.to, "end"); done = true; }
        catch (e) { done = false; }
      }
      if (!done) {
        var cur = editor.value;
        editor.value = cur.slice(0, it.from) + it.fix.replacement + cur.slice(it.to);
        done = true;
      }
      if (done) okN++; else skipN++;
    }
    onTextInput();
    copyNote.textContent = "Applied " + okN + " safe fix" + (okN === 1 ? "" : "es") +
      (skipN ? " (" + skipN + " skipped — text changed)" : "") +
      ". Undo repeatedly to revert.";
  }

  function highlightNote(idx) {
    // Click-a-highlight path: mark the note + bring it into view without
    // stealing the editor caret.
    var btns = issuesEl.querySelectorAll(".issue");
    for (var i = 0; i < btns.length; i++) btns[i].setAttribute("aria-current", i === idx ? "true" : "false");
    selectedIssue = idx;
    var el = $("issue-" + idx);
    if (el && el.scrollIntoView) { try { el.scrollIntoView({ block: "nearest" }); } catch (e) {} }
  }

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
    if (focusEditor) editor.focus();
    try { editor.setSelectionRange(at, at + findQuery.length); } catch (e) {}
    scrollToOffset(at);
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
    editor.focus();
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

  function onTextInput() {
    state.body = editor.value;
    state.updatedAt = new Date().toISOString();
    dirty = true;
    setSaveState(prefs.privateSession ? "Private session — not saved" : "Editing…");
    updateSampleVisibility();
    if (!$("findBar").hidden) recomputeFind();
    scheduleAnalysis();
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
    buildRailToggles();
  }

  var RAIL_RULES = [
    ["passive", "Passive"], ["adverb", "Adverb"], ["wordiness", "Wordy"],
    ["simpler", "Simpler"], ["repeated", "Repeated"],
  ];

  function railChecked(key) {
    var cfg = activeProfileConfig();
    var cur = cfg.rules[key];
    return cur !== false && cur !== "off";
  }

  function buildRailToggles() {
    var box = $("railToggles");
    if (!box) return;
    box.textContent = "";
    RAIL_RULES.forEach(function (pair) {
      var key = pair[0];
      var lab = document.createElement("label");
      lab.className = "check";
      lab.title = "Toggle " + pair[1].toLowerCase() + " notes";
      var cb = document.createElement("input");
      cb.type = "checkbox"; cb.checked = railChecked(key); cb.dataset.railRule = key;
      cb.setAttribute("aria-label", pair[1] + " notes on/off");
      cb.addEventListener("change", function () {
        var rules = Object.assign({}, activeProfileConfig().rules); rules[key] = cb.checked;
        persistProfileField("rules", rules);
        // keep Preferences checkbox in sync without full rebuild
        var main = $("ruleToggles") && $("ruleToggles").querySelector('select[data-rule="' + key + '"]');
        if (main) main.value = cb.checked ? "normal" : "off";
        updateCustomNote(); runAnalysis(); scheduleSave();
      });
      lab.appendChild(cb);
      lab.appendChild(document.createTextNode(pair[1]));
      box.appendChild(lab);
    });
  }

  function syncRailToggle(key, on) {
    var box = $("railToggles");
    if (!box) return;
    var cb = box.querySelector('input[data-rail-rule="' + key + '"]');
    if (cb) cb.checked = !!on;
  }

  function updateCustomNote() {
    var n = Object.keys((prefs.profiles && prefs.profiles[prefs.activeProfile]) || {}).length;
    $("customNote").textContent = n ? "Customized (" + n + " override" + (n > 1 ? "s" : "") + ")." : "";
  }

  var applyAllBtn = $("btnApplyAll");
  if (applyAllBtn) applyAllBtn.addEventListener("click", applyAllFixes);
  // merged Download menu: close the popover after picking a format
  ["btnDownload", "btnDownloadTxt"].forEach(function (id) {
    var b = $(id);
    if (b) b.addEventListener("click", function () {
      var m = $("dlMenu");
      if (m && m.open) { try { m.removeAttribute("open"); } catch (e) {} }
    });
  });
  var notesChip = $("notesChip");
  if (notesChip) notesChip.addEventListener("click", function () {
    var h = $("issuesH");
    if (h && h.scrollIntoView) { try { h.scrollIntoView({ block: "start" }); } catch (e) {} }
    var first = $("issue-0");
    if (first) { try { first.focus({ preventScroll: true }); } catch (e) {} }
  });

  var ignoredDeb = null;
  $("ignoredTerms").addEventListener("input", function (e) {
    clearTimeout(ignoredDeb);
    ignoredDeb = setTimeout(function () {
      state.ignoredTerms = e.target.value.split(",").map(function (s) { return s.trim(); }).filter(Boolean);
      runAnalysis(); scheduleSave();
    }, 300);
  });
  $("personalWords").addEventListener("input", function (e) {
    clearTimeout(ignoredDeb);
    ignoredDeb = setTimeout(function () {
      state.personalWords = e.target.value.split(",").map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 300);
      runAnalysis(); scheduleSave();
    }, 300);
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
    applyPrefs(); scheduleSave();
  });
  $("fontFamily").addEventListener("change", function (e) {
    prefs.fontFamily = e.target.value || "serif";
    applyPrefs(); scheduleSave();
  });
  $("lineHeight").addEventListener("change", function (e) {
    var lh = parseFloat(e.target.value);
    if (lh >= 1.2 && lh <= 2.5) { prefs.lineHeight = lh; applyPrefs(); scheduleSave(); }
    else e.target.value = String(prefs.lineHeight || 1.8);
  });
  $("optHeader").addEventListener("change", function (e) {
    prefs.includeHeader = e.target.checked; scheduleSave();
  });
  $("wpm").addEventListener("change", function (e) {
    var v = parseInt(e.target.value, 10);
    if (v >= 100 && v <= 400) { prefs.wpm = v; runAnalysis(); scheduleSave(); }
    else e.target.value = prefs.wpm;
  });
  $("optQuotes").addEventListener("change", function (e) {
    prefs.includeQuotes = e.target.checked; runAnalysis(); scheduleSave();
  });
  $("optPrivate").addEventListener("change", function (e) {
    prefs.privateSession = e.target.checked;
    setSaveState(prefs.privateSession ? "Private session — not saved" : "—");
    scheduleSave();
  });
  $("optAutoSave").addEventListener("change", function (e) {
    prefs.autosave = e.target.checked;
    if (!prefs.autosave) setSaveState("Autosave off");
    scheduleSave();
  });
  $("themeSel").addEventListener("change", function (e) {
    prefs.theme = e.target.value; applyPrefs(); scheduleSave();
  });

  function applyPrefs() {
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
    $("optHeader").checked = !!prefs.includeHeader;
    $("optPrivate").checked = !!prefs.privateSession;
    $("optAutoSave").checked = prefs.autosave !== false;
    $("themeSel").value = prefs.theme;
    syncScroll();
  }

  // Write / Review
  function setReview(v) {
    prefs.review = v;
    document.body.dataset.review = v;
    $("viewWrite").setAttribute("aria-pressed", v === "write" ? "true" : "false");
    $("viewReview").setAttribute("aria-pressed", v === "review" ? "true" : "false");
    scheduleSave();
  }
  $("viewWrite").addEventListener("click", function () { setReview("write"); });
  $("viewReview").addEventListener("click", function () { setReview("review"); });

  // ---------- actions ----------
  function confirmReplace() {
    if (!dirty && !editor.value) return true;
    if (!editor.value) return true;
    return window.confirm("Replace the current draft? Unsaved changes will be lost. Choose Cancel, then Download .md to keep a copy.");
  }

  $("btnNew").addEventListener("click", function () {
    if (!confirmReplace()) return;
    state = freshDoc();
    loadDocIntoUI(); runAnalysis(); store.save();
  });

  $("btnOpen").addEventListener("click", function () { $("filePick").click(); });
  $("filePick").addEventListener("change", function (e) {
    var f = e.target.files && e.target.files[0];
    if (!f) return;
    if (!confirmReplace()) { e.target.value = ""; return; }
    var rd = new FileReader();
    rd.onload = function () {
      var text = String(rd.result || "");
      // Normalize Windows CRLF to LF so offsets and counts stay stable.
      text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
      state = freshDoc();
      // strip HTML? accept plain text only — FileReader gives text; pasted HTML handled on paste
      state.body = text;
      state.title = (f.name || "").replace(/\.(txt|md|markdown)$/i, "");
      loadDocIntoUI(); runAnalysis(); store.save();
    };
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

  $("btnCopy").addEventListener("click", function () { copyText(editor.value, "Body"); });

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
    var blob = new Blob([editor.value], { type: "text/plain;charset=utf-8" });
    if (tauri() && tauri().saveFile) {
      tauri().saveFile(name + ".txt", editor.value).then(
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

  // Optional YAML front-matter (title + export date) for the .md download.
  // Off by default: the plain default stays content-only.
  function buildMarkdown() {
    var body = editor.value;
    if (!prefs.includeHeader) return body;
    var lines = ["---"];
    var t = String(state.title || "").replace(/[\r\n]+/g, " ").replace(/---/g, "").trim().slice(0, 120);
    if (t) lines.push("title: " + t);
    try { lines.push("date: " + new Date().toISOString().slice(0, 10)); }
    catch (e) { /* date best-effort */ }
    lines.push("---", "", body);
    return lines.join("\n");
  }

  function fallbackDownload(blob, name, ext, headerAware) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name + "." + ext;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    copyNote.textContent = "Downloaded " + name + "." + ext + " (UTF-8" +
      (headerAware && prefs.includeHeader ? ", with title/date header" : ", content only") + ").";
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
    var f = e.target.files && e.target.files[0];
    if (!f) return;
    var rd = new FileReader();
    rd.onload = function () {
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
    if (editor.value && !window.confirm("Load the labelled sample? This replaces the current draft.")) return;
    state = freshDoc();
    state.title = "Sample";
    state.body = SAMPLE;
    loadDocIntoUI(); runAnalysis(); store.save();
  });

  $("prevIssue").addEventListener("click", function () { stepIssue(-1); });
  $("nextIssue").addEventListener("click", function () { stepIssue(1); });

  $("docTitle").addEventListener("input", function (e) {
    state.title = e.target.value; state.updatedAt = new Date().toISOString(); dirty = true; scheduleSave();
  });

  $("btnClearData").addEventListener("click", function () {
    if (!window.confirm("Clear all local blunted data on this device (draft, backup, preferences)? This cannot be undone. Download a copy first if needed.")) return;
    store.clear();
    state = freshDoc();
    loadDocIntoUI(); runAnalysis();
    setSaveState("Local data cleared");
  });

  $("btnPrint").addEventListener("click", function () { window.print(); });
  window.addEventListener("beforeprint", function () {
    // A textarea prints as an empty box, so render the draft into the
    // print-only sheet (title + date + plain text, no highlights).
    var el = $("printDoc");
    el.textContent = "";
    var h = document.createElement("h1");
    h.appendChild(document.createTextNode(state.title || "Untitled"));
    var meta = document.createElement("p");
    meta.className = "print-meta";
    var dstr = "";
    try { dstr = new Date().toISOString().slice(0, 10); } catch (e) {}
    meta.appendChild(document.createTextNode(dstr ? dstr + " · blunted (local only)" : "blunted (local only)"));
    var body = document.createElement("div");
    body.className = "print-body";
    body.appendChild(document.createTextNode(editor.value || ""));
    el.appendChild(h); el.appendChild(meta); el.appendChild(body);
  });

  function freshDoc() {
    return {
      id: "doc-" + Date.now().toString(36), title: "", modeId: prefs.activeProfile || SINGLE_MODE,
      body: "", createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(), ruleOverrides: {}, ignoredRuleIds: [], ignoredTerms: [], personalWords: [],
    };
  }

  function loadDocIntoUI() {
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
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { store.save(); }, 800);
  }

  // ---------- init ----------
  function init() {
    var loaded = null;
    try { loaded = store.load(); } catch (e) { loaded = null; }
    // Tauri loadDoc is async (IPC promise); web load is sync.
    if (loaded && typeof loaded.then === "function") {
      loaded.then(function (v) { initWith(v); }, function () { initWith(null); });
    } else {
      initWith(loaded);
    }
  }

  function initWith(loaded) {
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
        state = Object.assign(freshDoc(), loaded.doc);
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
    startupStep(function () { setReview(prefs.review === "write" ? "write" : "review"); });
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
    else setSaveState("—");
    startupStep(syncScroll);
    startupStep(runAnalysis);
    if (startupFailed) {
      copyNote.textContent = "Some preferences or controls could not be initialized. Keyboard shortcuts remain available.";
    }
  }

  // Prefs from storage are untrusted input: keep known keys, sane ranges.
  function sanitizePrefs(p) {
    var out = {};
    var allow = ["theme", "fontSize", "fontFamily", "lineHeight", "wpm", "review", "privateSession", "autosave", "includeQuotes", "includeHeader", "activeProfile", "profiles"];
    for (var i = 0; i < allow.length; i++) {
      if (p[allow[i]] !== undefined) out[allow[i]] = p[allow[i]];
    }
    if (["system", "light", "dark"].indexOf(out.theme) === -1) delete out.theme;
    if (!Number.isFinite(out.fontSize) || out.fontSize < 13 || out.fontSize > 24) delete out.fontSize;
    if (["system", "serif", "mono"].indexOf(out.fontFamily) === -1) delete out.fontFamily;
    if (!Number.isFinite(out.lineHeight) || out.lineHeight < 1.2 || out.lineHeight > 2.5) delete out.lineHeight;
    if (!Number.isFinite(out.wpm) || out.wpm < 100 || out.wpm > 400) delete out.wpm;
    if (out.review !== "write" && out.review !== "review") delete out.review;
    ["autosave", "privateSession", "includeQuotes", "includeHeader"].forEach(function (k) { if (typeof out[k] !== "boolean") delete out[k]; });
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
    return Object.assign({}, prefs, out);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
