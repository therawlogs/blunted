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
  var statusWords = $("statusWords"), statusGrade = $("statusGrade"),
      statusTime = $("statusTime"), statusSave = $("statusSave");
  var copyNote = $("copyNote"), srStatus = $("srStatus");

  var MODES = Engine.MODES;
  var MODE_ORDER = ["essays", "social", "message", "email", "research"];

  // ---------- state ----------
  var state = {
    id: "doc-" + Date.now().toString(36),
    title: "", modeId: "essays", body: "", subject: "",
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    ruleOverrides: {}, ignoredRuleIds: [], ignoredTerms: [],
  };
  var prefs = { theme: "system", fontSize: 16, wpm: 200, review: "review", privateSession: false, includeQuotes: false, replyMode: false };
  var dirty = false;            // unsaved changes vs storage
  var lastAnalysis = null;
  var currentRev = 0;           // text revision counter (local)
  var lastWorkerRev = 0;
  var selectedIssue = -1;
  var composing = false;

  // ---------- storage adapter ----------
  var LS_DOC = "blunted.doc.v1", LS_PREFS = "blunted.prefs.v1", LS_BACKUP = "blunted.backup.v1";
  var storageOK = true, storageMsg = "";

  function tauri() { return window.__BLUNTED_TAURI__ || null; }

  var store = {
    load: function () {
      var t = tauri();
      if (t && t.loadDoc) return t.loadDoc(); // {doc, prefs} or null; may throw
      try {
        var d = localStorage.getItem(LS_DOC), p = localStorage.getItem(LS_PREFS);
        return {
          doc: d ? JSON.parse(d) : null,
          prefs: p ? JSON.parse(p) : null,
        };
      } catch (e) {
        storageOK = false; storageMsg = "Recovery unavailable: download a copy.";
        return { doc: null, prefs: null, corrupt: true };
      }
    },
    save: function () {
      if (prefs.privateSession) { setSaveState("Private session — not saved"); return; }
      var t = tauri();
      var payload = { doc: state, prefs: prefs };
      if (t && t.saveDoc) {
        try { t.saveDoc(payload); setSaveState("Saved"); dirty = false; }
        catch (e) { setSaveState("Saving failed"); }
        return;
      }
      try {
        var prev = localStorage.getItem(LS_DOC);
        if (prev) localStorage.setItem(LS_BACKUP, prev); // last-good backup
        localStorage.setItem(LS_DOC, JSON.stringify(state));
        localStorage.setItem(LS_PREFS, JSON.stringify(prefs));
        setSaveState("Saved"); dirty = false;
      } catch (e) {
        storageOK = false;
        setSaveState("Saving failed");
        storageMsg = "Recovery unavailable: download a copy.";
      }
    },
    clear: function () {
      var t = tauri();
      if (t && t.clearAll) { try { t.clearAll(); } catch (e) {} }
      try { localStorage.removeItem(LS_DOC); localStorage.removeItem(LS_PREFS); localStorage.removeItem(LS_BACKUP); } catch (e) {}
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
      text: editor.value, mode: state.modeId,
      overrides: buildOverrides(), ignoredTerms: state.ignoredTerms,
      ignoredRuleIds: state.ignoredRuleIds, subject: state.subject,
      emailReply: prefs.replyMode, textRevision: rev,
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
      text: editor.value, mode: state.modeId, overrides: buildOverrides(),
      ignoredTerms: state.ignoredTerms, ignoredRuleIds: state.ignoredRuleIds,
      subject: state.subject, emailReply: prefs.replyMode, textRevision: currentRev,
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
    var o = Object.assign({}, state.ruleOverrides);
    o.readingWpm = prefs.wpm;
    if (prefs.includeQuotes) o.excludeQuotes = false;
    if (state.modeId === "email") o.emailChecks = { mode: "new", greeting: true, signoff: true, subjectBudget: 60 };
    return o;
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

  function renderBackdrop(text, r) {
    // Build non-overlapping segments with class lists. Sentence marks =
    // backgrounds; word-level rule issues = underlines. Red wins (one bg).
    // Sweep-line over sorted cuts: both mark lists are in document order.
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
      underlines.push({ from: is.from, to: is.to });
    }
    var cutSet = {};
    cutSet[0] = 1; cutSet[text.length] = 1;
    var k;
    for (k = 0; k < sentMarks.length; k++) { cutSet[sentMarks[k].from] = 1; cutSet[sentMarks[k].to] = 1; }
    for (k = 0; k < underlines.length; k++) { cutSet[underlines[k].from] = 1; cutSet[underlines[k].to] = 1; }
    var cuts = Object.keys(cutSet).map(Number).sort(function (a, b) { return a - b; });
    var frag = document.createDocumentFragment();
    var mi = 0, ui = 0;
    for (var c = 0; c < cuts.length - 1; c++) {
      var a = Math.max(0, cuts[c]), b = Math.min(text.length, cuts[c + 1]);
      if (b <= a) continue;
      while (mi < sentMarks.length && sentMarks[mi].to <= a) mi++;
      while (ui < underlines.length && underlines[ui].to <= a) ui++;
      var cls = [];
      if (mi < sentMarks.length && sentMarks[mi].from <= a && b <= sentMarks[mi].to) cls.push(sentMarks[mi].cls);
      if (ui < underlines.length && underlines[ui].from <= a && b <= underlines[ui].to) cls.push("u");
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
    statusTime.textContent = m.readingTime + " read";
    if (m.grade) {
      var g = m.grade;
      gradeMain.textContent = g.label === "College+" ? "College+ reading level" : "Estimated reading grade: " + g.label;
      gradeMain.title = "U.S. school-grade scale (ARI" + (m.rawAri != null ? " " + m.rawAri.toFixed(1) : "") + "). An estimate — not a verdict.";
      gradeSub.textContent = "Target for " + (MODES[state.modeId] ? MODES[state.modeId].label : state.modeId) + ": grade " + r.config.targetGrade + ".";
      statusGrade.textContent = "Grade " + g.label;
    } else {
      gradeMain.textContent = "Too little text for a steady estimate";
      gradeSub.textContent = "Keep word count and suggestions below. Need 100+ prose words and 5+ sentences.";
      statusGrade.textContent = "—";
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
    email: "Email", todo: "Placeholder",
  };

  function renderIssues(r) {
    issuesEl.textContent = "";
    selectedIssue = -1;
    var list = r.issues.filter(function (i) { return i.from !== i.to || i.severity === "limit" || i.severity === "info"; });
    issueCount.textContent = list.length ? "(" + list.length + ")" : "";
    if (!list.length) {
      var li = document.createElement("li");
      li.className = "empty-issues";
      li.appendChild(document.createTextNode("No issues found. A clear page is not a promise of perfect prose."));
      issuesEl.appendChild(li);
      return;
    }
    // cap DOM size for very long docs
    var cap = 400;
    for (var i = 0; i < Math.min(list.length, cap); i++) {
      (function (issue, idx) {
        var b = document.createElement("button");
        b.type = "button"; b.className = "issue"; b.dataset.sev = issue.severity;
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
          fb.appendChild(document.createTextNode("Apply: “" + issue.fix.replacement + "”"));
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

  // one-click fix: single undoable edit, rechecks exactText + revision
  function applyFix(issue) {
    var revAtClick = currentRev;
    var cur = editor.value;
    if (cur.slice(issue.from, issue.to) !== issue.exactText) {
      copyNote.textContent = "Text changed — fix not applied. Review the issue again.";
      return;
    }
    try {
      editor.focus();
      editor.setSelectionRange(issue.from, issue.to);
    } catch (e) {}
    var ok = false;
    try { ok = document.execCommand("insertText", false, issue.fix.replacement); } catch (e) { ok = false; }
    if (!ok) {
      // fallback: value splice (single undo step may not hold everywhere; documented)
      editor.value = cur.slice(0, issue.from) + issue.fix.replacement + cur.slice(issue.to);
    }
    onTextInput();
    copyNote.textContent = "Applied. Undo with " + (navigator.platform.indexOf("Mac") !== -1 ? "Cmd+Z" : "Ctrl+Z") + " if the meaning changed.";
    void revAtClick;
  }

  function announceStatus() {
    if (!lastAnalysis) return;
    var m = lastAnalysis.metrics;
    var g = m.grade ? (m.grade.label === "College+" ? "College plus" : "grade " + m.grade.label) : "no steady grade yet";
    var n = (lastAnalysis._uiList || []).length;
    srStatus.textContent = g + ", " + n + " issues, " + m.eligibleWords + " prose words.";
  }

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
  if (window.ResizeObserver) {
    new ResizeObserver(syncScroll).observe(editor);
  }
  window.addEventListener("resize", syncScroll);

  // ---------- mode tabs ----------
  var tabsEl = $("modeTabs");
  MODE_ORDER.forEach(function (id) {
    var t = document.createElement("button");
    t.type = "button"; t.role = "tab"; t.id = "tab-" + id;
    t.textContent = MODES[id].label;
    t.setAttribute("aria-selected", id === state.modeId ? "true" : "false");
    t.tabIndex = id === state.modeId ? 0 : -1;
    t.addEventListener("click", function () { setMode(id); });
    t.addEventListener("keydown", function (e) {
      var i = MODE_ORDER.indexOf(id);
      if (e.key === "ArrowRight") { var n = MODE_ORDER[(i + 1) % MODE_ORDER.length]; setMode(n); $("tab-" + n).focus(); }
      if (e.key === "ArrowLeft") { var p = MODE_ORDER[(i - 1 + MODE_ORDER.length) % MODE_ORDER.length]; setMode(p); $("tab-" + p).focus(); }
    });
    tabsEl.appendChild(t);
  });

  function setMode(id) {
    if (!MODES[id]) return;
    state.modeId = id; // never rewrites body/subject/title/selection
    var selS = null, selE = null;
    try { selS = editor.selectionStart; selE = editor.selectionEnd; } catch (e) {}
    for (var i = 0; i < MODE_ORDER.length; i++) {
      var t = $("tab-" + MODE_ORDER[i]);
      if (t) {
        t.setAttribute("aria-selected", MODE_ORDER[i] === id ? "true" : "false");
        t.tabIndex = MODE_ORDER[i] === id ? 0 : -1;
      }
    }
    $("subjectWrap").hidden = id !== "email";
    $("btnCopyEmail").hidden = id !== "email";
    $("replyWrap").hidden = id !== "email";
    buildRuleToggles();
    updateCustomNote();
    try { if (selS != null) editor.setSelectionRange(selS, selE); } catch (e) {}
    runAnalysis();
    store.saveSoon ? store.saveSoon() : scheduleSave();
  }

  // ---------- rule toggles / settings ----------
  var RULE_LABELS = [
    ["passive", "Passive voice notes"], ["adverb", "Adverb (-ly) notes"],
    ["intensifier", "Intensifier notes"], ["wordiness", "Wordiness"],
    ["filler", "Filler openings"], ["simpler", "Simpler words"],
    ["repeated", "Repeated words"],
  ];

  function buildRuleToggles() {
    var box = $("ruleToggles");
    box.textContent = "";
    var cfg = MODES[state.modeId];
    RULE_LABELS.forEach(function (pair) {
      var key = pair[0];
      if (!(key in cfg.rules)) return;
      var cur = state.ruleOverrides[key] !== undefined ? state.ruleOverrides[key]
        : cfg.rules[key];
      var on = cur === true || cur === "note" || cur === "selected";
      var lab = document.createElement("label");
      lab.className = "check";
      var cb = document.createElement("input");
      cb.type = "checkbox"; cb.checked = !!on; cb.dataset.rule = key;
      cb.addEventListener("change", function () {
        var b = MODES[state.modeId].rules[key];
        var val;
        if (typeof b === "string") val = cb.checked ? (b === "off" ? "note" : b) : "off";
        else val = cb.checked;
        if (key === "intensifier" && typeof b === "string") val = cb.checked ? "selected" : false;
        state.ruleOverrides[key] = val;
        updateCustomNote(); runAnalysis(); scheduleSave();
      });
      lab.appendChild(cb);
      lab.appendChild(document.createTextNode(pair[1]));
      box.appendChild(lab);
    });
    // hedge tri-state
    var hlab = document.createElement("label");
    hlab.appendChild(document.createTextNode("Hedges"));
    var hsel = document.createElement("select");
    [["note", "Note"], ["off", "Off"]].forEach(function (o) {
      var op = document.createElement("option"); op.value = o[0]; op.textContent = o[1]; hsel.appendChild(op);
    });
    var hcur = state.ruleOverrides.hedge !== undefined ? state.ruleOverrides.hedge : cfg.rules.hedge;
    hsel.value = hcur === "off" ? "off" : "note";
    hsel.setAttribute("aria-label", "Hedge handling");
    hsel.addEventListener("change", function () {
      state.ruleOverrides.hedge = hsel.value; updateCustomNote(); runAnalysis(); scheduleSave();
    });
    hlab.appendChild(hsel);
    box.appendChild(hlab);
  }

  function updateCustomNote() {
    var n = Object.keys(state.ruleOverrides).filter(function (k) {
      return k !== "readingWpm" && k !== "excludeQuotes" && k !== "emailChecks";
    }).length;
    $("customNote").textContent = n ? "This preset is customized (" + n + " override" + (n > 1 ? "s" : "") + ")." : "";
  }

  $("btnResetMode").addEventListener("click", function () {
    state.ruleOverrides = {};
    buildRuleToggles(); updateCustomNote(); runAnalysis(); scheduleSave();
  });

  var ignoredDeb = null;
  $("ignoredTerms").addEventListener("input", function (e) {
    clearTimeout(ignoredDeb);
    ignoredDeb = setTimeout(function () {
      state.ignoredTerms = e.target.value.split(",").map(function (s) { return s.trim(); }).filter(Boolean);
      runAnalysis(); scheduleSave();
    }, 300);
  });

  $("fontSize").addEventListener("input", function (e) {
    prefs.fontSize = parseInt(e.target.value, 10) || 16;
    applyPrefs(); scheduleSave();
  });
  $("wpm").addEventListener("change", function (e) {
    var v = parseInt(e.target.value, 10);
    if (v >= 100 && v <= 400) { prefs.wpm = v; runAnalysis(); scheduleSave(); }
    else e.target.value = prefs.wpm;
  });
  $("optQuotes").addEventListener("change", function (e) {
    prefs.includeQuotes = e.target.checked; runAnalysis(); scheduleSave();
  });
  $("optReply").addEventListener("change", function (e) {
    prefs.replyMode = e.target.checked; runAnalysis(); scheduleSave();
  });
  $("optPrivate").addEventListener("change", function (e) {
    prefs.privateSession = e.target.checked;
    setSaveState(prefs.privateSession ? "Private session — not saved" : "—");
    scheduleSave();
  });
  $("themeSel").addEventListener("change", function (e) {
    prefs.theme = e.target.value; applyPrefs(); scheduleSave();
  });

  function applyPrefs() {
    document.body.dataset.theme = prefs.theme;
    document.documentElement.style.setProperty("--ed-font", prefs.fontSize + "px");
    $("fontVal").textContent = prefs.fontSize + "px";
    $("fontSize").value = prefs.fontSize;
    $("wpm").value = prefs.wpm;
    $("optQuotes").checked = !!prefs.includeQuotes;
    $("optReply").checked = !!prefs.replyMode;
    $("optPrivate").checked = !!prefs.privateSession;
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
    state = freshDoc(state.modeId);
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
      state = freshDoc(state.modeId);
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
    if (!ok) {
      var s = editor.selectionStart || 0, en = editor.selectionEnd || 0;
      editor.value = editor.value.slice(0, s) + t + editor.value.slice(en);
      try { editor.setSelectionRange(s + t.length, s + t.length); } catch (err2) {}
    }
    onTextInput();
  });

  $("btnCopy").addEventListener("click", function () { copyText(editor.value, "Body"); });
  $("btnCopyEmail").addEventListener("click", function () {
    var t = (state.subject ? state.subject + "\n\n" : "") + editor.value;
    copyText(t, "Email");
  });

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
    var name = (state.title || "untitled").replace(/[\\/:*?"<>|#%&{}$!'@+`=]/g, "").trim().slice(0, 80) || "untitled";
    var blob = new Blob([editor.value], { type: "text/markdown;charset=utf-8" });
    if (tauri() && tauri().saveFile) {
      tauri().saveFile(name + ".md", editor.value).then(
        function (ok) {
          if (ok === false) copyNote.textContent = "Save cancelled.";
          else copyNote.textContent = "Saved " + name + ".md.";
        },
        function () { fallbackDownload(blob, name); });
      return;
    }
    fallbackDownload(blob, name);
  });

  function fallbackDownload(blob, name) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name + ".md";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    copyNote.textContent = "Downloaded " + name + ".md (UTF-8, content only).";
  }

  var SAMPLE = "The Editor’s Test\n\nDr. Rao measured 3.14 ml on Tuesday. It was written in the lab notebook at 9 a.m.\n\nIt is important to note that the samples were collected in order to facilitate subsequent analysis. We utilize approximately 5 ml per run, and the results were surprising.\n\nFriendly staff reply quickly. Really very good.\n\nThe the report needs tightening before Friday.";
  $("btnSample").addEventListener("click", function () {
    if (editor.value && !window.confirm("Load the labelled sample? This replaces the current draft.")) return;
    state = freshDoc(state.modeId);
    state.title = "Sample";
    state.body = SAMPLE;
    loadDocIntoUI(); runAnalysis(); store.save();
  });

  $("prevIssue").addEventListener("click", function () { stepIssue(-1); });
  $("nextIssue").addEventListener("click", function () { stepIssue(1); });

  $("docTitle").addEventListener("input", function (e) {
    state.title = e.target.value; state.updatedAt = new Date().toISOString(); dirty = true; scheduleSave();
  });
  $("docSubject").addEventListener("input", function (e) {
    state.subject = e.target.value; state.updatedAt = new Date().toISOString(); dirty = true; scheduleAnalysis();
  });

  $("btnClearData").addEventListener("click", function () {
    if (!window.confirm("Clear all local blunted data on this device (draft, backup, preferences)? This cannot be undone. Download a copy first if needed.")) return;
    store.clear();
    state = freshDoc("essays");
    loadDocIntoUI(); runAnalysis();
    setSaveState("Local data cleared");
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      var open = document.querySelector("details[open]");
      if (open && !/input|textarea|select/i.test(document.activeElement.tagName)) open.removeAttribute("open");
    }
  });

  function freshDoc(modeId) {
    return {
      id: "doc-" + Date.now().toString(36), title: "", modeId: modeId || "essays",
      body: "", subject: "", createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(), ruleOverrides: {}, ignoredRuleIds: [], ignoredTerms: [],
    };
  }

  function loadDocIntoUI() {
    editor.value = state.body || "";
    $("docTitle").value = state.title || "";
    $("docSubject").value = state.subject || "";
    $("ignoredTerms").value = (state.ignoredTerms || []).join(", ");
    setModeSilent(state.modeId || "essays");
    buildRuleToggles(); updateCustomNote();
    updateSampleVisibility();
    dirty = false;
  }

  function setModeSilent(id) {
    state.modeId = MODES[id] ? id : "essays";
    for (var i = 0; i < MODE_ORDER.length; i++) {
      var t = $("tab-" + MODE_ORDER[i]);
      if (t) {
        t.setAttribute("aria-selected", MODE_ORDER[i] === state.modeId ? "true" : "false");
        t.tabIndex = MODE_ORDER[i] === state.modeId ? 0 : -1;
      }
    }
    $("subjectWrap").hidden = state.modeId !== "email";
    $("btnCopyEmail").hidden = state.modeId !== "email";
    $("replyWrap").hidden = state.modeId !== "email";
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { store.save(); }, 800);
  }

  // ---------- init ----------
  function init() {
    var loaded = null;
    try { loaded = store.load(); } catch (e) { loaded = null; }
    if (loaded && loaded.prefs) prefs = Object.assign(prefs, loaded.prefs);
    if (loaded && loaded.doc && typeof loaded.doc.body === "string") {
      state = Object.assign(freshDoc("essays"), loaded.doc);
    }
    applyPrefs();
    setReview(prefs.review === "write" ? "write" : "review");
    loadDocIntoUI();
    if (!storageOK) setSaveState(storageMsg);
    else if (prefs.privateSession) setSaveState("Private session — not saved");
    else setSaveState("—");
    // font sync for backdrop
    syncScroll();
    runAnalysis();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
