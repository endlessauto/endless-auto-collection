(function () {
  function slug(v) {
    return String(v).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40).replace(/-+$/, "");
  }

  function classifyCta(href, el) {
    var tag = el && el.dataset && el.dataset.cta ? slug(el.dataset.cta) : "";
    if (tag) return tag;
    var h = String(href || "").toLowerCase();
    if (h.indexOf("tel:") === 0) return "call";
    if (h.indexOf("sms:") === 0) return "text";
    if (h.indexOf("mailto:") === 0) return "email";
    if (h.indexOf("maps.apple.com") !== -1 || h.indexOf("google.com/maps") !== -1) return "directions";
    if (h.indexOf("app.shopmonkey.cloud") !== -1) return "book-online";
    if (/^(https?:\/\/[^\/?#]+)?\/raffle(\.html)?\/?([?#].*)?$/.test(h)) return "raffle";
    return "";
  }

  if (typeof module !== "undefined" && module.exports) module.exports = { classifyCta: classifyCta };
  if (typeof window === "undefined") return;

  try {
    var path = location.pathname;
    if (/^\/admin(\/|$)/i.test(path)) return;
    if (navigator.doNotTrack === "1" || window.doNotTrack === "1") return;
    try {
      if (localStorage.getItem("eac.notrack")) return;
    } catch (e) {}

    var sid = "";
    try {
      sid = sessionStorage.getItem("eac.sid") || "";
    } catch (e) {}
    if (!/^[a-z0-9]{8,32}$/.test(sid)) {
      var bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      sid = "";
      for (var i = 0; i < 16; i++) sid += "abcdefghijklmnopqrstuvwxyz0123456789".charAt(bytes[i] % 36);
      try {
        sessionStorage.setItem("eac.sid", sid);
      } catch (e) {}
    }

    var send = function (ev) {
      try {
        ev.s = sid;
        ev.p = path;
        var body = JSON.stringify(ev);
        if (navigator.sendBeacon && navigator.sendBeacon("/api/analytics/e", body)) return;
        fetch("/api/analytics/e", { method: "POST", body: body, keepalive: true, headers: { "content-type": "text/plain" } }).catch(function () {});
      } catch (e) {}
    };

    var bareHost = function (h) {
      return String(h || "").toLowerCase().replace(/^www\./, "");
    };

    var source = function () {
      var m = /[?&]utm_source=([^&#]*)/.exec(location.search);
      if (m) {
        var u = decodeURIComponent(m[1].replace(/\+/g, " ")).toLowerCase().replace(/[^a-z0-9.-]+/g, "");
        if (u) return u.slice(0, 60);
      }
      var host = "";
      var rm = /^https?:\/\/([^\/?#:]+)/i.exec(document.referrer || "");
      if (rm) host = bareHost(rm[1]);
      return host && host !== bareHost(location.hostname) ? host : "";
    };

    var pv = { t: "pv" };
    var r = "";
    try {
      r = source();
    } catch (e) {}
    if (r) pv.r = r;
    send(pv);

    document.addEventListener(
      "click",
      function (e) {
        try {
          var el = e.target && e.target.closest ? e.target.closest("a, [data-cta]") : null;
          if (!el) return;
          var c = classifyCta(el.getAttribute("href") || "", el);
          if (c) send({ t: "cta", c: c });
        } catch (err) {}
      },
      true
    );

    var shownAt = document.visibilityState === "hidden" ? 0 : Date.now();
    var visibleMs = 0;
    var maxScroll = 0;
    var left = false;

    var trackScroll = function () {
      try {
        var d = document.documentElement;
        var room = d.scrollHeight - window.innerHeight;
        var pct = room <= 0 ? 100 : Math.round(((window.pageYOffset || d.scrollTop || 0) / room) * 100);
        if (pct > maxScroll) maxScroll = Math.min(100, pct);
      } catch (e) {}
    };
    window.addEventListener("scroll", trackScroll, { passive: true });
    trackScroll();

    var leave = function () {
      try {
        if (left) return;
        left = true;
        trackScroll();
        if (shownAt) visibleMs += Date.now() - shownAt;
        shownAt = 0;
        send({ t: "leave", v: Math.min(visibleMs, 1800000), y: maxScroll });
      } catch (e) {}
    };

    document.addEventListener("visibilitychange", function () {
      try {
        if (document.visibilityState === "hidden") leave();
      } catch (e) {}
    });
    window.addEventListener("pagehide", leave);
    window.addEventListener("pageshow", function (e) {
      try {
        if (!e.persisted) return;
        left = false;
        visibleMs = 0;
        maxScroll = 0;
        shownAt = document.visibilityState === "hidden" ? 0 : Date.now();
        trackScroll();
        path = location.pathname;
        send({ t: "pv" });
      } catch (err) {}
    });
  } catch (e) {}
})();
