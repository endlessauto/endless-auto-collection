(function () {
  var D = window.DECK, SHOOTS = D.shoots;
  var root = document.getElementById("root");
  var chipsEl = document.getElementById("chips");
  var syncEl = document.getElementById("sync");
  var filterBtn = document.getElementById("filter");
  var filterC = document.getElementById("filter-c");
  var copyBtn = document.getElementById("copy");
  var copyC = document.getElementById("copy-c");
  var KEY = "eacmedia." + D.key;
  var st = {};
  var meta = {};
  var unsent = {};
  var API = "/api/eacmedia/" + D.key;
  var whoEl = document.getElementById("who");
  var online = true;

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function allShots(sh) { return (sh.groups || []).reduce(function (a, g) { return a.concat(g.shots); }, []); }

  function card(s) {
    var id = s[0], p = s[1];
    return '<li class="card" data-id="' + id + '" data-pri="' + p + '" data-s="">' +
      '<div class="body"><div class="row1"><span class="id">' + id + '</span><span class="pri">' + (p === "m" ? "Must" : "Nice") + '</span><span class="ttl">' + esc(s[2]) + '</span></div>' +
      '<p class="desc">' + esc(s[3]) + '</p><div class="spec">' + esc(s[4]) + '</div><div class="by"></div></div>' +
      '<div class="acts"><button class="btn" type="button" data-act="got" aria-pressed="false">Got it</button>' +
      '<button class="btn" type="button" data-act="redo" aria-pressed="false">Redo</button></div></li>';
  }
  function taskCard(s) {
    return '<li class="card" data-id="' + s[0] + '" data-pri="n" data-s="">' +
      '<div class="body"><div class="row1"><span class="ttl task">' + esc(s[1]) + '</span></div></div>' +
      '<div class="acts"><button class="btn" type="button" data-act="got" aria-pressed="false">Done</button></div></li>';
  }

  function build() {
    chipsEl.innerHTML = SHOOTS.filter(function (s) { return s.id !== "prep"; }).map(function (sh) {
      return '<a class="chip" href="#' + sh.id + '" data-chip="' + sh.id + '"><span class="n">' + esc(sh.short) + '</span><span class="c">0/0</span><i class="t"><b></b></i></a>';
    }).join("") + '<a class="chip" href="#prep" data-chip="prep"><span class="n">Tonight</span><span class="c">0/0</span><i class="t"><b></b></i></a>';

    root.innerHTML = SHOOTS.map(function (sh) {
      var ros = sh.ros ? '<div class="box"><h3>Run of show</h3><ul>' + sh.ros.map(function (r) { return '<li><span>' + r[0] + '</span><span>' + esc(r[1]) + '</span></li>'; }).join("") + '</ul></div>' : "";
      var bring = sh.bring ? '<div class="box"><h3>Bring</h3><div class="gear">' + sh.bring.map(function (b) { return '<span>' + esc(b) + '</span>'; }).join("") + '</div></div>' : "";
      var qs = sh.questions ? '<div class="box plain"><h3>Questions for Josh</h3><ul>' + sh.questions.map(function (q, i) { return '<li>' + (i + 1) + '. ' + esc(q) + '</li>'; }).join("") + '</ul></div>' : "";
      var facts = (ros || bring || qs) ? '<div class="facts">' + ros + bring + qs + '</div>' : "";
      var tasks = sh.tasks ? '<div class="group"><ul class="cards">' + sh.tasks.map(taskCard).join("") + '</ul></div>' : "";
      var groups = (sh.groups || []).map(function (g) {
        return '<section class="group"><h3>' + esc(g.name) + '</h3><p class="note">' + esc(g.note) + '</p><ul class="cards">' + g.shots.map(card).join("") + '</ul></section>';
      }).join("");
      var cuts = sh.cuts ? '<section class="group"><h3>Cuts this shoot feeds</h3><p class="note">Ready means every shot the cut needs is marked Got it.</p><ul class="cuts">' + sh.cuts.map(function (c, i) {
        return '<li class="cut" data-cut="' + sh.id + '-' + i + '" data-needs="' + c[2].join(",") + '" data-ready="0"><div class="cut-h"><span class="cut-t">' + esc(c[0]) + '</span><span class="cut-s">0/' + c[2].length + '</span></div><p>' + esc(c[1]) + '</p><div class="miss"></div></li>';
      }).join("") + '</ul></section>' : "";
      return '<section class="shoot ' + sh.cls + '" id="' + sh.id + '"><div class="strip"></div><div class="head"><div class="time">' + sh.time + '</div><div class="place">' + sh.place + '</div></div><p class="goal">' + esc(sh.goal) + '</p>' + facts + tasks + groups + cuts + '</section>';
    }).join("");
  }

  function items(sh) {
    return sh.tasks ? sh.tasks.map(function (t) { return { id: t[0], p: "n" }; }) : allShots(sh).map(function (s) { return { id: s[0], p: s[1] }; });
  }

  function paint() {
    root.querySelectorAll(".card").forEach(function (el) {
      var s = st[el.dataset.id] || "";
      el.dataset.s = s;
      el.querySelectorAll(".btn").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.act === s)); });
      var by = el.querySelector(".by");
      if (by) {
        var m = meta[el.dataset.id];
        by.textContent = s && m ? (s === "got" ? "Got it" : "Redo") + (m.by ? " by " + m.by : "") + (m.at ? " at " + new Date(m.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "") : "";
      }
    });
    var mustAll = 0, mustGot = 0;
    SHOOTS.forEach(function (sh) {
      var it = items(sh);
      var got = it.filter(function (i) { return st[i.id] === "got"; }).length;
      var must = it.filter(function (i) { return i.p === "m"; });
      var mg = must.filter(function (i) { return st[i.id] === "got"; }).length;
      if (!sh.tasks) { mustAll += must.length; mustGot += mg; }
      var chip = chipsEl.querySelector('[data-chip="' + sh.id + '"]');
      if (chip) {
        chip.querySelector(".c").textContent = sh.tasks ? got + "/" + it.length + " done" : got + "/" + it.length + " · must " + mg + "/" + must.length;
        chip.querySelector(".t b").style.width = (it.length ? (got / it.length) * 100 : 0) + "%";
      }
    });
    root.querySelectorAll(".cut").forEach(function (el) {
      var need = el.dataset.needs.split(",");
      var miss = need.filter(function (i) { return st[i] !== "got"; });
      el.dataset.ready = miss.length ? "0" : "1";
      el.querySelector(".cut-s").textContent = miss.length ? (need.length - miss.length) + "/" + need.length + " shots" : "Ready to edit";
      el.querySelector(".miss").innerHTML = miss.length ? "Still needed: <b>" + miss.join(", ") + "</b>" : "";
    });
    root.querySelectorAll(".group").forEach(function (g) {
      g.classList.toggle("empty", g.querySelectorAll(".card").length > 0 && !g.querySelector('.card[data-pri="m"]'));
    });
    filterC.textContent = filterBtn.getAttribute("aria-pressed") === "true" ? "must " + mustGot + "/" + mustAll : "show all";
  }

  function cacheSave() { try { localStorage.setItem(KEY, JSON.stringify({ st: st, meta: meta, unsent: unsent })); } catch (e) {} }
  function note(msg) { syncEl.textContent = msg; }
  function pendingCount() { return Object.keys(unsent).length; }

  function apply(server) {
    var ns = {}, nm = {};
    Object.keys(server || {}).forEach(function (id) {
      var v = server[id];
      if (v && (v.s === "got" || v.s === "redo")) { ns[id] = v.s; nm[id] = { by: v.by || "", at: v.at || 0 }; }
    });
    Object.keys(unsent).forEach(function (id) {
      if (unsent[id]) { ns[id] = unsent[id]; nm[id] = { by: who(), at: Date.now() }; } else { delete ns[id]; delete nm[id]; }
    });
    st = ns; meta = nm;
    cacheSave();
    paint();
  }

  function who() { return (whoEl.value || "").trim().slice(0, 30); }

  var flushing = false;
  function flush() {
    if (flushing) return Promise.resolve();
    flushing = true;
    var ids = Object.keys(unsent);
    var chain = Promise.resolve();
    ids.forEach(function (id) {
      chain = chain.then(function () {
        var val = unsent[id];
        return fetch(API, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: id, s: val, by: who() }) })
          .then(function (r) { if (!r.ok) throw new Error("bad status"); return r.json(); })
          .then(function (j) { if (unsent[id] === val) delete unsent[id]; apply(j.state); });
      });
    });
    return chain.then(function () { online = true; status(); }, function () { online = false; status(); }).then(function () { flushing = false; if (pendingCount() && online) flush(); });
  }

  function status() {
    var n = pendingCount();
    if (!online) note(n ? "Offline. " + n + " change" + (n === 1 ? "" : "s") + " waiting to sync." : "Offline. Showing the last saved list.");
    else note(n ? "Syncing…" : "Synced with the team. Updates every few seconds.");
  }

  function pull() {
    if (flushing || pendingCount()) { return flush(); }
    return fetch(API, { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("bad status"); return r.json(); })
      .then(function (j) { online = true; apply(j.state); status(); })
      .catch(function () { online = false; status(); });
  }

  root.addEventListener("click", function (e) {
    var b = e.target.closest(".btn");
    if (!b) return;
    var id = b.closest(".card").dataset.id;
    var next = st[id] === b.dataset.act ? null : b.dataset.act;
    if (next) { st[id] = next; meta[id] = { by: who(), at: Date.now() }; } else { delete st[id]; delete meta[id]; }
    unsent[id] = next;
    cacheSave();
    paint();
    status();
    flush();
  });

  whoEl.addEventListener("change", function () { try { localStorage.setItem("eacmedia.name", who()); } catch (e) {} });

  filterBtn.addEventListener("click", function () {
    var on = filterBtn.getAttribute("aria-pressed") !== "true";
    filterBtn.setAttribute("aria-pressed", String(on));
    document.body.classList.toggle("must-only", on);
    try { localStorage.setItem(KEY + ".must", on ? "1" : "0"); } catch (e) {}
    paint();
  });

  function statusText() {
    var lines = [D.title + " status"];
    SHOOTS.filter(function (s) { return !s.tasks; }).forEach(function (sh) {
      var it = items(sh);
      var got = it.filter(function (i) { return st[i.id] === "got"; }).length;
      var redo = it.filter(function (i) { return st[i.id] === "redo"; }).map(function (i) { return i.id; });
      var left = it.filter(function (i) { return i.p === "m" && st[i.id] !== "got"; }).map(function (i) { return i.id; });
      lines.push("");
      lines.push(sh.short + ": " + got + "/" + it.length + " shots");
      lines.push("Must-haves left: " + (left.length ? left.join(", ") : "none"));
      if (redo.length) lines.push("Redo: " + redo.join(", "));
    });
    return lines.join("\n");
  }

  copyBtn.addEventListener("click", function () {
    var text = statusText();
    function done(ok) { copyC.textContent = ok ? "copied" : "select and copy"; setTimeout(function () { copyC.textContent = "for the team chat"; }, 2200); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, function () { fallback(text); done(false); });
    } else { fallback(text); done(false); }
  });
  function fallback(text) {
    var ta = document.createElement("textarea");
    ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); } catch (e) {}
    document.body.removeChild(ta);
  }

  build();
  try {
    var c = JSON.parse(localStorage.getItem(KEY) || "{}") || {};
    st = c.st || {}; meta = c.meta || {}; unsent = c.unsent || {};
    whoEl.value = localStorage.getItem("eacmedia.name") || "";
    if (localStorage.getItem(KEY + ".must") === "1") { filterBtn.setAttribute("aria-pressed", "true"); document.body.classList.add("must-only"); }
  } catch (e) {}
  paint();
  note("Connecting to the team list…");
  pull();
  setInterval(function () { if (!document.hidden) pull(); }, 6000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) pull(); });
  window.addEventListener("online", pull);
})();
