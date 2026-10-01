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
    return SINGLE_MODE;
  }

  // ---------- state ----------
  var state = {
    id: "doc-" + Date.now().toString(36),
    title: "", modeId: SINGLE_MODE, body: "",
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    ruleOverrides: {}, ignoredRuleIds: [], ignoredTerms: [],
  };
  var prefs = { theme: "system", fontSize: 16, fontFamily: "system", lineHeight: 1.8, wpm: 200, review: "review", privateSession: false, includeQuotes: false, includeHeader: false };
  var dirty = false;            // unsaved changes vs storage
  var lastAnalysis = null;
  var currentRev = 0;           // text revision counter (local)
  var lastWorkerRev = 0;
  var selectedIssue = -1;
  var composing = false;

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
      text: editor.value, mode: SINGLE_MODE,
      overrides: buildOverrides(), ignoredTerms: state.ignoredTerms,
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
      text: editor.value, mode: SINGLE_MODE, overrides: buildOverrides(),
      ignoredTerms: state.ignoredTerms, ignoredRuleIds: state.ignoredRuleIds,
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
    var o = Object.assign({}, state.ruleOverrides);
    o.readingWpm = prefs.wpm;
    if (prefs.includeQuotes) o.excludeQuotes = false;
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
    statusSent.textContent = m.proseSentences === 1 ? "1 sentence" : m.proseSentences + " sentences";
    statusTime.textContent = m.readingTime + " read";
    if (m.grade) {
      var g = m.grade;
      gradeMain.textContent = g.label === "College+" ? "College+ reading level" : "Estimated reading grade: " + g.label;
      gradeMain.title = "U.S. school-grade scale (ARI" + (m.rawAri != null ? " " + m.rawAri.toFixed(1) : "") + "). An estimate — not a verdict.";
      gradeSub.textContent = "Target: grade " + r.config.targetGrade + ".";
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
    todo: "Placeholder",
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
    if (!ok && editor.setRangeText) {
      // setRangeText stays inside the browser's undo history (one step),
      // unlike a value splice which breaks it.
      try { editor.setRangeText(issue.fix.replacement, issue.from, issue.to, "end"); ok = true; }
      catch (e) { ok = false; }
    }
    if (!ok) {
      // last resort: value splice (undo grouping may not hold everywhere)
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
  if (window.ResizeObserver) {
    new ResizeObserver(syncScroll).observe(editor);
  }
  window.addEventListener("resize", syncScroll);

  // ---------- single preset ----------
  // No mode tabs: one clarity preset. Legacy stored modeIds are migrated
  // to "clear" on load; selection/body/title are never rewritten.

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
    var cfg = MODES[SINGLE_MODE];
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
        state.ruleOverrides[key] = cb.checked;
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
      return k !== "readingWpm" && k !== "excludeQuotes";
    }).length;
    $("customNote").textContent = n ? "Customized (" + n + " override" + (n > 1 ? "s" : "") + ")." : "";
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
  $("fontFamily").addEventListener("change", function (e) {
    prefs.fontFamily = e.target.value || "system";
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
  $("themeSel").addEventListener("change", function (e) {
    prefs.theme = e.target.value; applyPrefs(); scheduleSave();
  });

  function applyPrefs() {
    document.body.dataset.theme = prefs.theme;
    document.body.dataset.font = prefs.fontFamily || "system";
    document.documentElement.style.setProperty("--ed-font", prefs.fontSize + "px");
    document.documentElement.style.setProperty("--ed-lh", String(prefs.lineHeight || 1.8));
    $("fontVal").textContent = prefs.fontSize + "px";
    $("fontSize").value = prefs.fontSize;
    $("fontFamily").value = prefs.fontFamily || "system";
    $("lineHeight").value = String(prefs.lineHeight || 1.8);
    $("wpm").value = prefs.wpm;
    $("optQuotes").checked = !!prefs.includeQuotes;
    $("optHeader").checked = !!prefs.includeHeader;
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
      app: "blunted", version: 1,
      prefs: prefs, ruleOverrides: state.ruleOverrides, ignoredTerms: state.ignoredTerms,
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

  document.addEventListener("keydown", function (e) {
    var mod = e.metaKey || e.ctrlKey;
    if (mod && (e.key === "s" || e.key === "S")) {
      // Download .md — same path as the button (Tauri dialog or browser file).
      // Skipped inside the desktop shell: the native Save As… menu owns
      // Cmd/Ctrl+S there, and firing both would stack two dialogs.
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

  function freshDoc() {
    return {
      id: "doc-" + Date.now().toString(36), title: "", modeId: SINGLE_MODE,
      body: "", createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(), ruleOverrides: {}, ignoredRuleIds: [], ignoredTerms: [],
    };
  }

  function loadDocIntoUI() {
    editor.value = state.body || "";
    $("docTitle").value = state.title || "";
    $("ignoredTerms").value = (state.ignoredTerms || []).join(", ");
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
    var wasRecovered = !!(loaded && loaded.recovered);
    var wasCorrupt = !!(loaded && loaded.corrupt);
    if (loaded && loaded.prefs) {
      prefs = sanitizePrefs(loaded.prefs);
      delete prefs.replyMode; // removed with Email mode
    }
    if (loaded && loaded.doc && typeof loaded.doc.body === "string") {
      state = Object.assign(freshDoc(), loaded.doc);
      state.modeId = normalizeMode(state.modeId);
      delete state.subject;
    }
    applyPrefs();
    setReview(prefs.review === "write" ? "write" : "review");
    loadDocIntoUI();
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
    // font sync for backdrop
    syncScroll();
    runAnalysis();
  }

  // Prefs from storage are untrusted input: keep known keys, sane ranges.
  function sanitizePrefs(p) {
    var out = {};
    var allow = ["theme", "fontSize", "fontFamily", "lineHeight", "wpm", "review", "privateSession", "includeQuotes", "includeHeader"];
    for (var i = 0; i < allow.length; i++) {
      if (p[allow[i]] !== undefined) out[allow[i]] = p[allow[i]];
    }
    if (["system", "light", "dark"].indexOf(out.theme) === -1) delete out.theme;
    if (!Number.isFinite(out.fontSize) || out.fontSize < 13 || out.fontSize > 24) delete out.fontSize;
    if (["system", "serif", "mono"].indexOf(out.fontFamily) === -1) delete out.fontFamily;
    if (!Number.isFinite(out.lineHeight) || out.lineHeight < 1.2 || out.lineHeight > 2.5) delete out.lineHeight;
    if (!Number.isFinite(out.wpm) || out.wpm < 100 || out.wpm > 400) delete out.wpm;
    if (out.review !== "write" && out.review !== "review") delete out.review;
    return Object.assign({}, prefs, out);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
