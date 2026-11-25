import { DurableObject } from "cloudflare:workers";
import { sanitizeEvent, summarize } from "./analytics-core.mjs";

const DAY_MS = 86400000;
const MAX_BODY = 600;
const MAX_PER_SID = 300;
const RETAIN_DAYS = 90;
const ROW_LIMIT = 200000;
const HEADERS = { "content-type": "application/json", "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" };

export class AnalyticsState extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY, ts INTEGER, sid TEXT, type TEXT, path TEXT,
      src TEXT, dev TEXT, cta TEXT, val INTEGER, scroll INTEGER
    )`);
    this.sql.exec("CREATE INDEX IF NOT EXISTS idx_events_ts ON events(ts)");
    this.sql.exec("CREATE INDEX IF NOT EXISTS idx_events_sid ON events(sid)");
    this.sql.exec("CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v INTEGER)");
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/api/analytics/e") return this.ingest(request);
    if (url.pathname === "/admin/analytics.json") return this.stats(url);
    return new Response(null, { status: 404 });
  }

  async ingest(request) {
    const text = await request.text();
    if (new TextEncoder().encode(text).length > MAX_BODY) return new Response(null, { status: 413 });
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      return new Response(null, { status: 400 });
    }
    try {
      const ev = sanitizeEvent(body, request.headers.get("user-agent"));
      if (!ev) return new Response(null, { status: 204 });
      const now = Date.now();
      const count = this.sql.exec("SELECT COUNT(*) AS n FROM events WHERE sid = ?", ev.sid).one().n;
      if (count < MAX_PER_SID) {
        this.sql.exec(
          "INSERT INTO events (ts, sid, type, path, src, dev, cta, val, scroll) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          now, ev.sid, ev.type, ev.path, ev.src, ev.dev, ev.cta, ev.val, ev.scroll,
        );
      }
      this.prune(now);
    } catch {}
    return new Response(null, { status: 204 });
  }

  prune(now) {
    const last = this.sql.exec("SELECT v FROM meta WHERE k = 'pruned'").toArray()[0];
    if (last && now - last.v < DAY_MS) return;
    this.sql.exec("DELETE FROM events WHERE ts < ?", now - RETAIN_DAYS * DAY_MS);
    this.sql.exec("INSERT OR REPLACE INTO meta (k, v) VALUES ('pruned', ?)", now);
  }

  stats(url) {
    const d = Number(url.searchParams.get("days"));
    const days = [7, 30, 90].includes(d) ? d : 7;
    const now = Date.now();
    const rows = this.sql
      .exec("SELECT ts, sid, type, path, src, dev, cta, val, scroll FROM events WHERE ts >= ? LIMIT ?", now - days * DAY_MS, ROW_LIMIT)
      .toArray();
    return new Response(JSON.stringify(summarize(rows, now, days)), { headers: HEADERS });
  }
}
