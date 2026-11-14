(function () {
  var D = window.DECK, SHOOTS = D.shoots;
  var root = document.getElementById("root");
  var chipsEl = document.getElementById("chips");
  var syncEl = document.getElementById("sync");
  var filterBtn = document.getElementById("filter");
  var filterC = document.getElementById("filter-c");
  var copyBtn = document.getElementById("copy");
  var copyC = document.getElementById("copy-c");
  var allBtn = document.getElementById("toggle-all");
  var whoEl = document.getElementById("who");
  var KEY = "eacmedia." + D.key;
  var API = "/api/eacmedia/" + D.key;
  var st = {}, meta = {}, unsent = {}, online = true, openSet = {};

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function allShots(sh) { return (sh.groups || []).reduce(function (a, g) { return a.concat(g.shots); }, []); }
  function itemsOf(shots) { return shots.map(function (s) { return { id: s[0], p: s[1] }; }); }
  function shootItems(sh) { return sh.tasks ? sh.tasks.map(function (t) { return { id: t[0], p: "n" }; }) : itemsOf(allShots(sh)); }
  function ids(list) { return list.map(function (i) { return i.id; }).join(","); }

  function card(s) {
    return '<li class="card" data-id="' + s[0] + '" data-pri="' + s[1] + '" data-s="">' +
      '<div class="body"><div class="row1"><span class="id">' + s[0] + '</span><span class="pri">' + (s[1] === "m" ? "Must" : "Nice") + '</span><span class="ttl">' + esc(s[2]) + '</span></div>' +
      '<p class="desc">' + esc(s[3]) + '</p><div class="spec">' + esc(s[4]) + '</div><div class="by"></div></div>' +
      '<div class="acts"><button class="btn" type="button" data-act="got" aria-pressed="false">Got it</button>' +
      '<button class="btn" type="button" data-act="redo" aria-pressed="false">Redo</button></div></li>';
  }
  function taskCard(s) {
    return '<li class="card" data-id="' + s[0] + '" data-pri="n" data-s="">' +
      '<div class="body"><div class="row1"><span class="ttl task">' + esc(s[1]) + '</span></div><div class="by"></div></div>' +
      '<div class="acts"><button class="btn" type="button" data-act="got" aria-pressed="false">Done</button></div></li>';
  }
  function sum(title, cls) {
    return '<summary class="' + cls + '"><span class="s-t">' + title + '</span><span class="s-c"></span><i class="chev" aria-hidden="true"></i></summary>';
  }

  function build() {
    chipsEl.innerHTML = SHOOTS.map(function (sh) {
      return '<a class="chip" href="#' + sh.id + '" data-chip="' + sh.id + '"><span class="n">' + esc(sh.short) + '</span><span class="c">0/0</span><i class="t"><b></b></i></a>';
    }).join("");

    root.innerHTML = SHOOTS.map(function (sh) {
      var info = "";
      if (sh.ros || sh.bring || sh.questions) {
        var ros = sh.ros ? '<div class="box"><h4>Run of show</h4><ul>' + sh.ros.map(function (r) { return '<li><span>' + r[0] + '</span><span>' + esc(r[1]) + '</span></li>'; }).join("") + '</ul></div>' : "";
        var bring = sh.bring ? '<div class="box"><h4>Bring</h4><div class="gear">' + sh.bring.map(function (b) { return '<span>' + esc(b) + '</span>'; }).join("") + '</div></div>' : "";
        var qs = sh.questions ? '<div class="box plain"><h4>' + esc(sh.qtitle || "Questions") + '</h4><ul>' + sh.questions.map(function (q, i) { return '<li>' + (i + 1) + '. ' + esc(q) + '</li>'; }).join("") + '</ul></div>' : "";
        info = '<details class="fold info" data-key="' + sh.id + "-info" + '"><summary class="g-sum"><span class="s-t">' + (sh.infoTitle || "Run of show, gear and questions") + '</span><span class="s-c"></span><i class="chev" aria-hidden="true"></i></summary><div class="facts">' + ros + bring + qs + '</div></details>';
      }
      var tasks = sh.tasks ? '<ul class="cards">' + sh.tasks.map(taskCard).join("") + '</ul>' : "";
      var groups = (sh.groups || []).map(function (g, gi) {
        return '<details class="fold group" data-key="' + sh.id + "-g" + gi + '" data-ids="' + ids(itemsOf(g.shots)) + '">' +
          '<summary class="g-sum"><span class="s-t">' + esc(g.name) + '</span><span class="s-c"></span><i class="chev" aria-hidden="true"></i></summary>' +
          '<p class="note">' + esc(g.note) + '</p><ul class="cards">' + g.shots.map(card).join("") + '</ul></details>';
      }).join("");
      var cuts = sh.cuts ? '<details class="fold group cutsbox" data-key="' + sh.id + '-cuts"><summary class="g-sum"><span class="s-t">Cuts this shoot feeds</span><span class="s-c"></span><i class="chev" aria-hidden="true"></i></summary><p class="note">Ready means every shot the cut needs is marked Got it.</p><ul class="cuts">' + sh.cuts.map(function (c, i) {
        return '<li class="cut" data-needs="' + c[2].join(",") + '" data-ready="0"><div class="cut-h"><span class="cut-t">' + esc(c[0]) + '</span><span class="cut-s">0/' + c[2].length + '</span></div><p>' + esc(c[1]) + '</p><div class="miss"></div></li>';
      }).join("") + '</ul></details>' : "";
      return '<details class="shoot ' + sh.cls + '" id="' + sh.id + '" data-key="' + sh.id + '" data-ids="' + ids(shootItems(sh)) + '">' +
        '<summary class="shoot-sum"><span class="strip"></span><span class="sum-main"><span class="time">' + sh.time + '</span><span class="place">' + sh.place + '</span></span><span class="s-c"></span><i class="chev" aria-hidden="true"></i><span class="bar-t"><b></b></span></summary>' +
        '<div class="shoot-body"><p class="goal">' + esc(sh.goal) + '</p>' + info + tasks + groups + cuts + '</div></details>';
    }).join("");
  }

  function count(list) {
    var got = 0, must = 0, mg = 0;
    list.forEach(function (i) { var g = st[i.id] === "got"; if (g) got++; if (i.p === "m") { must++; if (g) mg++; } });
    return { got: got, total: list.length, must: must, mg: mg };
  }
  function byIds(str) { return str.split(",").map(function (id) { var c = root.querySelector('.card[data-id="' + id + '"]'); return { id: id, p: c ? c.dataset.pri : "n" }; }); }

  function paint() {
    root.querySelectorAll(".card").forEach(function (el) {
      var s = st[el.dataset.id] || "";
      el.dataset.s = s;
      el.querySelectorAll(".btn").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.act === s)); });
      var by = el.querySelector(".by"), m = meta[el.dataset.id];
      if (by) by.textContent = s && m ? (s === "got" ? (el.querySelector(".task") ? "Done" : "Got it") : "Redo") + (m.by ? " by " + m.by : "") + (m.at ? " at " + new Date(m.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "") : "";
    });
    var mustAll = 0, mustGot = 0;
    root.querySelectorAll("details[data-ids]").forEach(function (d) {
      var c = count(byIds(d.dataset.ids));
      var isShoot = d.classList.contains("shoot");
      var el = (isShoot ? d.querySelector(".shoot-sum .s-c") : d.querySelector(".g-sum .s-c"));
      var task = !!d.querySelector(".task");
      el.textContent = c.got + "/" + c.total + (c.must && !task ? " · must " + c.mg + "/" + c.must : "");
      d.dataset.done = c.total && c.got === c.total ? "1" : "0";
      if (isShoot) {
        d.querySelector(".bar-t b").style.width = (c.total ? c.got / c.total * 100 : 0) + "%";
        var chip = chipsEl.querySelector('[data-chip="' + d.id + '"]');
        chip.querySelector(".c").textContent = c.got + "/" + c.total;
        chip.querySelector(".t b").style.width = (c.total ? c.got / c.total * 100 : 0) + "%";
        if (!task) { mustAll += c.must; mustGot += c.mg; }
      }
      if (d.classList.contains("group")) d.classList.toggle("empty", !c.must);
    });
    root.querySelectorAll(".cut").forEach(function (el) {
      var need = el.dataset.needs.split(",");
      var miss = need.filter(function (i) { return st[i] !== "got"; });
      el.dataset.ready = miss.length ? "0" : "1";
      el.querySelector(".cut-s").textContent = miss.length ? (need.length - miss.length) + "/" + need.length + " shots" : "Ready to edit";
      el.querySelector(".miss").innerHTML = miss.length ? "Still needed: " + miss.map(function (i) { return '<button type="button" class="goto" data-goto="' + i + '">' + i + '</button>'; }).join(" ") : "";
    });
    filterC.textContent = filterBtn.getAttribute("aria-pressed") === "true" ? "must " + mustGot + "/" + mustAll : "show all";
    var anyOpen = root.querySelector("details.fold[open], details.shoot[open]");
    allBtn.querySelector(".n").textContent = anyOpen ? "Close all" : "Open all";
  }

  function saveOpen() {
    var o = {};
    root.querySelectorAll("details[data-key]").forEach(function (d) { if (d.open) o[d.dataset.key] = 1; });
    openSet = o;
    try { localStorage.setItem(KEY + ".open", JSON.stringify(o)); } catch (e) {}
  }
  root.addEventListener("toggle", function () { saveOpen(); paint(); }, true);

  function reveal(el) {
    var p = el.parentElement;
    while (p && p !== root) { if (p.tagName === "DETAILS") p.open = true; p = p.parentElement; }
    if (el.tagName === "DETAILS") el.open = true;
    saveOpen();
    setTimeout(function () { el.scrollIntoView({ behavior: "smooth", block: "start" }); }, 60);
  }

  document.addEventListener("click", function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (a) {
      var t = document.getElementById(a.getAttribute("href").slice(1));
      if (t && root.contains(t)) { e.preventDefault(); reveal(t); try { history.replaceState(null, "", "#" + t.id); } catch (x) {} }
      return;
    }
    var g = e.target.closest("[data-goto]");
    if (g) { var c = root.querySelector('.card[data-id="' + g.dataset.goto + '"]'); if (c) reveal(c); }
  });

  allBtn.addEventListener("click", function () {
    var anyOpen = !!root.querySelector("details[open]");
    root.querySelectorAll("details").forEach(function (d) { d.open = !anyOpen; });
    saveOpen(); paint();
  });

  function cacheSave() { try { localStorage.setItem(KEY, JSON.stringify({ st: st, meta: meta, unsent: unsent })); } catch (e) {} }
  function note(msg) { syncEl.textContent = msg; }
  function pendingCount() { return Object.keys(unsent).length; }
  function who() { return (whoEl.value || "").trim().slice(0, 30); }

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

  var flushing = false;
  function flush() {
    if (flushing) return Promise.resolve();
    flushing = true;
    var chain = Promise.resolve();
    Object.keys(unsent).forEach(function (id) {
      chain = chain.then(function () {
        var val = unsent[id];
        return fetch(API, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: id, s: val, by: who() }) })
          .then(function (r) { if (!r.ok) throw new Error("bad status"); return r.json(); })
          .then(function (j) { if (unsent[id] === val) delete unsent[id]; apply(j.state); });
      });
    });
    return chain.then(function () { online = true; status(); }, function () { online = false; status(); })
      .then(function () { flushing = false; if (pendingCount() && online) flush(); });
  }

  function status() {
    var n = pendingCount();
    if (!online) note(n ? "Offline. " + n + " change" + (n === 1 ? "" : "s") + " waiting to sync." : "Offline. Showing the last saved list.");
    else note(n ? "Syncing…" : "Synced with the team. Updates every few seconds.");
  }

  function pull() {
    if (flushing || pendingCount()) return flush();
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
    cacheSave(); paint(); status(); flush();
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
      var it = shootItems(sh), c = count(it);
      var redo = it.filter(function (i) { return st[i.id] === "redo"; }).map(function (i) { return i.id; });
      var left = it.filter(function (i) { return i.p === "m" && st[i.id] !== "got"; }).map(function (i) { return i.id; });
      lines.push("", sh.short + ": " + c.got + "/" + c.total + " shots", "Must-haves left: " + (left.length ? left.join(", ") : "none"));
      if (redo.length) lines.push("Redo: " + redo.join(", "));
    });
    return lines.join("\n");
  }
  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); } catch (e) {}
    document.body.removeChild(ta);
  }
  copyBtn.addEventListener("click", function () {
    var text = statusText();
    function done(ok) { copyC.textContent = ok ? "copied" : "select and copy"; setTimeout(function () { copyC.textContent = "for the team chat"; }, 2200); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { done(true); }, function () { fallbackCopy(text); done(false); });
    else { fallbackCopy(text); done(false); }
  });

  build();
  try {
    var c = JSON.parse(localStorage.getItem(KEY) || "{}") || {};
    st = c.st || {}; meta = c.meta || {}; unsent = c.unsent || {};
    openSet = JSON.parse(localStorage.getItem(KEY + ".open") || "{}") || {};
    whoEl.value = localStorage.getItem("eacmedia.name") || "";
    if (localStorage.getItem(KEY + ".must") === "1") { filterBtn.setAttribute("aria-pressed", "true"); document.body.classList.add("must-only"); }
  } catch (e) {}
  root.querySelectorAll("details[data-key]").forEach(function (d) { if (openSet[d.dataset.key]) d.open = true; });
  paint();
  if (location.hash) { var h = document.getElementById(location.hash.slice(1)); if (h && root.contains(h)) reveal(h); }
  note("Connecting to the team list…");
  pull();
  setInterval(function () { if (!document.hidden) pull(); }, 6000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) pull(); });
  window.addEventListener("online", pull);
})();
