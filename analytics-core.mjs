const SERVICES = ["/ppf", "/ceramic", "/tint", "/detailing", "/wraps", "/mechanical"];
const TYPES = ["pv", "cta", "leave"];
const DAY_MS = 86400000;
const BOT_RE = /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|curl|wget|python|node-fetch|go-http|java\//i;
const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" });

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, Number.isFinite(+n) ? +n : 0));
const ratio = (a, b) => (b ? a / b : 0);
const dayKey = (ts) => dayFmt.format(ts);

export function normalizePath(p) {
  if (typeof p !== "string" || !p.startsWith("/")) return null;
  let s = p.split("#")[0].split("?")[0].toLowerCase().replace(/\.html$/, "").replace(/\/+$/, "");
  if (s === "" || s === "/index") s = "/";
  if (s.length > 120 || s.startsWith("/admin")) return null;
  return s;
}

export function isBot(ua) {
  return typeof ua !== "string" || ua.trim() === "" || BOT_RE.test(ua);
}

export function deviceFromUa(ua) {
  const u = String(ua || "");
  if (/ipad|tablet/i.test(u) || (/android/i.test(u) && !/mobile/i.test(u))) return "tablet";
  if (/mobi|iphone|ipod|android/i.test(u)) return "mobile";
  return "desktop";
}

function sourceOf(r) {
  if (typeof r !== "string" || !r.trim()) return "direct";
  let host = r.trim().toLowerCase();
  try {
    if (host.includes("://")) host = new URL(host).hostname;
  } catch {
    return "direct";
  }
  host = host.replace(/^www\./, "").slice(0, 60);
  if (!host || host === "endlessautocollection.com" || host.endsWith(".endlessautocollection.com")) return "direct";
  return host;
}

export function sanitizeEvent(body, ua) {
  if (!body || typeof body !== "object" || isBot(ua)) return null;
  const { s, t, p, r, c, v, y } = body;
  if (typeof s !== "string" || !/^[a-z0-9]{8,32}$/.test(s)) return null;
  if (!TYPES.includes(t)) return null;
  const path = normalizePath(p);
  if (path === null) return null;
  let cta = "";
  if (t === "cta") {
    if (typeof c !== "string" || !/^[a-z0-9-]{1,40}$/.test(c)) return null;
    cta = c;
  }
  return {
    sid: s,
    type: t,
    path,
    src: sourceOf(r),
    cta,
    val: clamp(v, 0, 1800000),
    scroll: clamp(y, 0, 100),
    dev: deviceFromUa(ua),
  };
}

const tally = (map, key) => map.set(key, (map.get(key) || 0) + 1);

export function summarize(rows, now, days) {
  const cutoff = now - days * DAY_MS;
  const inWin = rows.filter((r) => r.ts >= cutoff && r.ts <= now).sort((a, b) => a.ts - b.ts);

  const visits = new Map();
  for (const r of inWin) {
    let v = visits.get(r.sid);
    if (!v) visits.set(r.sid, (v = { first: r, pvs: [], hasCta: false, paths: new Set() }));
    if (r.type === "pv") {
      v.pvs.push(r);
      v.paths.add(r.path);
    } else if (r.type === "cta") v.hasCta = true;
  }

  const pages = new Map();
  const page = (path) => {
    let p = pages.get(path);
    if (!p) pages.set(path, (p = { path, views: 0, exits: 0, timeSum: 0, timeN: 0, scrollSum: 0 }));
    return p;
  };
  const ctas = new Map();
  const sources = new Map();
  const devices = new Map();
  const dailyMap = new Map();
  const bump = (day, k) => {
    const d = dailyMap.get(day) || { visits: 0, pageviews: 0 };
    d[k]++;
    dailyMap.set(day, d);
  };

  let timeSum = 0;
  let timeN = 0;
  for (const r of inWin) {
    if (r.type === "pv") {
      page(r.path).views++;
      bump(dayKey(r.ts), "pageviews");
    } else if (r.type === "cta") tally(ctas, r.cta);
    else if (r.type === "leave") {
      const p = page(r.path);
      p.timeSum += r.val;
      p.scrollSum += r.scroll;
      p.timeN++;
      timeSum += r.val;
      timeN++;
    }
  }

  let pageviews = 0;
  let bounces = 0;
  const funnel = { home: 0, service: 0, cta: 0 };
  for (const v of visits.values()) {
    tally(sources, v.first.src);
    tally(devices, v.first.dev);
    bump(dayKey(v.first.ts), "visits");
    pageviews += v.pvs.length;
    if (v.pvs.length === 1 && !v.hasCta) bounces++;
    if (v.pvs.length) page(v.pvs[v.pvs.length - 1].path).exits++;
    if (v.paths.has("/")) {
      funnel.home++;
      if (SERVICES.some((s) => v.paths.has(s))) {
        funnel.service++;
        if (v.hasCta) funnel.cta++;
      }
    }
  }

  const topPages = [...pages.values()]
    .filter((p) => p.views > 0)
    .sort((a, b) => b.views - a.views)
    .slice(0, 15)
    .map((p) => ({
      path: p.path,
      views: p.views,
      exits: p.exits,
      exitRate: ratio(p.exits, p.views),
      avgTimeSec: ratio(p.timeSum, p.timeN) / 1000,
      avgScroll: ratio(p.scrollSum, p.timeN),
    }));

  const ranked = (m, kName, vName) =>
    [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => ({ [kName]: k, [vName]: n }));

  const [y, m, d] = dayKey(now).split("-").map(Number);
  const daily = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(Date.UTC(y, m - 1, d - i)).toISOString().slice(0, 10);
    const e = dailyMap.get(day);
    daily.push({ day, visits: e ? e.visits : 0, pageviews: e ? e.pageviews : 0 });
  }

  return {
    days,
    visits: visits.size,
    pageviews,
    bounceRate: ratio(bounces, visits.size),
    avgTimeSec: ratio(timeSum, timeN) / 1000,
    topPages,
    topCtas: ranked(ctas, "cta", "clicks").slice(0, 15),
    sources: ranked(sources, "src", "visits"),
    devices: ranked(devices, "dev", "visits"),
    funnel,
    daily,
  };
}
