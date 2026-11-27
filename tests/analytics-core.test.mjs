import test from "node:test";
import assert from "node:assert/strict";
import { normalizePath, deviceFromUa, isBot, sanitizeEvent, summarize } from "../analytics-core.mjs";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const IPAD = "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

test("normalizePath", () => {
  assert.equal(normalizePath("/PPF.html?x=1#a"), "/ppf");
  assert.equal(normalizePath("/index.html"), "/");
  assert.equal(normalizePath("/index"), "/");
  assert.equal(normalizePath("/ppf/"), "/ppf");
  assert.equal(normalizePath(""), null);
  assert.equal(normalizePath("/admin/emails"), null);
  assert.equal(normalizePath("ppf"), null);
  assert.equal(normalizePath(5), null);
  assert.equal(normalizePath("/" + "a".repeat(120)), null);
});

test("isBot and deviceFromUa", () => {
  assert.equal(isBot("Googlebot/2.1"), true);
  assert.equal(isBot(""), true);
  assert.equal(isBot(IPHONE), false);
  assert.equal(deviceFromUa(IPHONE), "mobile");
  assert.equal(deviceFromUa(IPAD), "tablet");
  assert.equal(deviceFromUa(MAC), "desktop");
});

test("sanitizeEvent", () => {
  const ok = { s: "abcd1234", t: "pv", p: "/PPF.html" };
  assert.deepEqual(sanitizeEvent(ok, IPHONE), {
    sid: "abcd1234", type: "pv", path: "/ppf", src: "direct", cta: "", val: 0, scroll: 0, dev: "mobile",
  });
  assert.equal(sanitizeEvent({ ...ok, s: "BAD!" }, IPHONE), null);
  assert.equal(sanitizeEvent({ ...ok, p: "/admin" }, IPHONE), null);
  assert.equal(sanitizeEvent({ ...ok, t: "zap" }, IPHONE), null);
  assert.equal(sanitizeEvent({ ...ok, t: "cta" }, IPHONE), null);
  assert.equal(sanitizeEvent(ok, "Googlebot/2.1"), null);
  assert.equal(sanitizeEvent(null, IPHONE), null);
  assert.equal(sanitizeEvent({ ...ok, r: "www.endlessautocollection.com" }, IPHONE).src, "direct");
  assert.equal(sanitizeEvent({ ...ok, r: "https://www.Google.com/search?q=x" }, IPHONE).src, "google.com");
  const cta = sanitizeEvent({ ...ok, t: "cta", c: "book-now" }, IPHONE);
  assert.equal(cta.cta, "book-now");
  const leave = sanitizeEvent({ ...ok, t: "leave", v: 9e9, y: 250 }, IPHONE);
  assert.equal(leave.val, 1800000);
  assert.equal(leave.scroll, 100);
  assert.equal(sanitizeEvent({ ...ok, t: "leave", v: -5, y: -1 }, IPHONE).val, 0);
});

const NOW = Date.UTC(2026, 10, 25, 20, 0, 0);
const row = (o) => ({ ts: NOW - 3600000, sid: "a", type: "pv", path: "/", src: "google.com", dev: "mobile", cta: "", val: 0, scroll: 0, ...o });

test("summarize empty", () => {
  const s = summarize([], NOW, 7);
  assert.equal(s.visits, 0);
  assert.equal(s.pageviews, 0);
  assert.equal(s.bounceRate, 0);
  assert.equal(s.avgTimeSec, 0);
  assert.equal(s.daily.length, 7);
  assert.equal(s.daily[6].day, "2026-11-25");
  assert.equal(s.daily[0].day, "2026-11-19");
});

test("summarize two visits", () => {
  const rows = [
    row({ sid: "a", ts: NOW - 5000 }),
    row({ sid: "a", ts: NOW - 4000, path: "/ppf" }),
    row({ sid: "a", ts: NOW - 3000, type: "cta", path: "/ppf", cta: "book-now" }),
    row({ sid: "a", ts: NOW - 2000, type: "leave", path: "/ppf", val: 30000, scroll: 80 }),
    row({ sid: "b", ts: NOW - 4500, src: "direct", dev: "desktop" }),
    row({ sid: "old", ts: NOW - 40 * 86400000 }),
  ];
  const s = summarize(rows, NOW, 7);
  assert.equal(s.visits, 2);
  assert.equal(s.pageviews, 3);
  assert.equal(s.bounceRate, 0.5);
  assert.equal(s.avgTimeSec, 30);
  const ppf = s.topPages.find((p) => p.path === "/ppf");
  assert.deepEqual(ppf, { path: "/ppf", views: 1, exits: 1, exitRate: 1, avgTimeSec: 30, avgScroll: 80 });
  assert.equal(s.topPages[0].path, "/");
  assert.equal(s.topPages[0].exitRate, 0.5);
  assert.deepEqual(s.topCtas, [{ cta: "book-now", clicks: 1 }]);
  assert.deepEqual(s.funnel, { home: 2, service: 1, cta: 1 });
  assert.deepEqual(s.sources.sort((x, y) => x.src.localeCompare(y.src)), [{ src: "direct", visits: 1 }, { src: "google.com", visits: 1 }]);
  assert.equal(s.daily.reduce((n, d) => n + d.visits, 0), 2);
});

test("single pageview with cta is not a bounce", () => {
  const s = summarize([row({}), row({ type: "cta", cta: "call", ts: NOW - 1000 })], NOW, 7);
  assert.equal(s.bounceRate, 0);
});

test("avgTimeSec is per leave, not per visit", () => {
  const rows = [
    row({ sid: "a", ts: NOW - 6000 }),
    row({ sid: "a", ts: NOW - 5000, type: "leave", val: 10000 }),
    row({ sid: "a", ts: NOW - 4000, path: "/ppf" }),
    row({ sid: "a", ts: NOW - 3000, type: "leave", path: "/ppf", val: 30000 }),
    row({ sid: "a", ts: NOW - 2000, path: "/tint" }),
    row({ sid: "a", ts: NOW - 1000, type: "leave", path: "/tint", val: 20000 }),
  ];
  assert.equal(summarize(rows, NOW, 7).avgTimeSec, 20);
});
