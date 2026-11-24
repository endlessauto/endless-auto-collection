import { DurableObject } from "cloudflare:workers";

const HEADERS = { "content-type": "application/json", "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" };
const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: HEADERS });

export const RAFFLE_ENDS = "2026-11-29T23:59:59-08:00";
export const PRIZES = ["One Month Full Car Detailing Package", "Exterior Car Detail", "Endless T-Shirt"];
const MAX_ENTRIES_PER_IP = 5;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const HANDLE_RE = /^[A-Za-z0-9._]{1,30}$/;

const randInt = (n) => {
  const limit = Math.floor(0x100000000 / n) * n;
  const buf = new Uint32Array(1);
  do crypto.getRandomValues(buf); while (buf[0] >= limit);
  return buf[0] % n;
};

const sha256 = async (s) => {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
};

const safeEqual = (a, b) => {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
};

const weight = (e) => 1 + (e.ig_at ? 1 : 0) + (e.yt_at ? 1 : 0);

export class RaffleState extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      token TEXT NOT NULL UNIQUE,
      ip_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      instagram_handle TEXT,
      ig_at INTEGER,
      yt_at INTEGER
    )`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS winners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prize_index INTEGER NOT NULL,
      entry_id INTEGER NOT NULL,
      pool_size INTEGER NOT NULL,
      total_tickets INTEGER NOT NULL,
      drawn_at INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'active'
    )`);
  }

  total() {
    return this.sql.exec("SELECT COUNT(*) AS c FROM entries").one().c;
  }

  mine(token) {
    if (typeof token !== "string" || token.length < 20) return null;
    const row = this.sql.exec("SELECT * FROM entries WHERE token = ?", token).toArray()[0];
    if (!row) return null;
    return { name: row.name, entries: weight(row), instagram: !!row.ig_at, youtube: !!row.yt_at };
  }

  state(token) {
    const ends = new Date(RAFFLE_ENDS).getTime();
    const daysLeft = Math.max(0, Math.ceil((ends - Date.now()) / 86400000));
    return { total: this.total(), daysLeft, open: Date.now() < ends, me: this.mine(token) };
  }

  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname.replace("/api/raffle", "");
    let body = {};
    if (request.method === "POST") {
      try { body = await request.json(); } catch { return reply({ error: "Invalid request" }, 400); }
    }

    if (path === "/state" && request.method === "GET") return reply(this.state(url.searchParams.get("token")));
    if (path === "/enter" && request.method === "POST") return this.enter(request, body);
    if (path === "/bonus" && request.method === "POST") return this.bonus(body);
    if (path.startsWith("/admin/")) return this.admin(request, path, body);
    return reply({ error: "Not found" }, 404);
  }

  async enter(request, b) {
    if (Date.now() >= new Date(RAFFLE_ENDS).getTime()) return reply({ error: "This giveaway has closed." }, 410);
    if (b.website) return reply({ error: "Could not enter." }, 400);
    const name = typeof b.name === "string" ? b.name.trim().replace(/\s+/g, " ") : "";
    const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
    if (name.length < 2 || name.length > 80) return reply({ error: "Enter your full name." }, 400);
    if (email.length > 120 || !EMAIL_RE.test(email)) return reply({ error: "Enter a valid email address." }, 400);

    const ip = request.headers.get("cf-connecting-ip") || "unknown";
    const ipHash = await sha256("eac-raffle|" + ip);
    const perIp = this.sql.exec("SELECT COUNT(*) AS c FROM entries WHERE ip_hash = ?", ipHash).one().c;
    if (perIp >= MAX_ENTRIES_PER_IP) return reply({ error: "Too many entries from this network. Email us if this is a mistake." }, 429);

    if (this.sql.exec("SELECT 1 FROM entries WHERE email = ?", email).toArray().length) {
      return reply({ error: "That email is already entered. Good luck." }, 409);
    }

    const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "");
    this.sql.exec(
      "INSERT INTO entries (name, email, token, ip_hash, created_at) VALUES (?, ?, ?, ?, ?)",
      name, email, token, ipHash, Date.now()
    );
    return reply({ token, ...this.state(token) });
  }

  bonus(b) {
    if (Date.now() >= new Date(RAFFLE_ENDS).getTime()) return reply({ error: "This giveaway has closed." }, 410);
    const token = b.token;
    if (!this.mine(token)) return reply({ error: "Enter the giveaway first." }, 401);
    if (b.action === "instagram") {
      const handle = typeof b.handle === "string" ? b.handle.trim().replace(/^@/, "") : "";
      if (!HANDLE_RE.test(handle)) return reply({ error: "Enter your Instagram handle." }, 400);
      this.sql.exec(
        "UPDATE entries SET instagram_handle = ?, ig_at = COALESCE(ig_at, ?) WHERE token = ?",
        handle, Date.now(), token
      );
    } else if (b.action === "youtube") {
      this.sql.exec("UPDATE entries SET yt_at = COALESCE(yt_at, ?) WHERE token = ?", Date.now(), token);
    } else {
      return reply({ error: "Unknown action." }, 400);
    }
    return reply(this.state(token));
  }

  admin(request, path, b) {
    const key = this.env.RAFFLE_ADMIN_KEY;
    if (!key) return reply({ error: "Admin key not configured." }, 503);
    const auth = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!safeEqual(auth, key)) return reply({ error: "Unauthorized" }, 401);

    if (path === "/admin/entries") {
      const rows = this.sql.exec(
        "SELECT id, name, email, instagram_handle, ig_at, yt_at, created_at FROM entries ORDER BY id"
      ).toArray();
      const winners = this.sql.exec("SELECT * FROM winners ORDER BY id").toArray();
      return reply({ prizes: PRIZES, entries: rows.map((r) => ({ ...r, tickets: weight(r) })), winners });
    }

    if (path === "/admin/draw" && request.method === "POST") {
      const prize = b.prize;
      if (!Number.isInteger(prize) || prize < 0 || prize >= PRIZES.length) return reply({ error: "Unknown prize." }, 400);
      const active = this.sql.exec("SELECT id FROM winners WHERE prize_index = ? AND status = 'active'", prize).toArray();
      if (active.length && !b.redraw) return reply({ error: "Prize already drawn. Pass redraw to replace the winner." }, 409);

      const pool = this.sql.exec(
        "SELECT * FROM entries WHERE id NOT IN (SELECT entry_id FROM winners) ORDER BY id"
      ).toArray();
      if (!pool.length) return reply({ error: "No eligible entries left." }, 409);
      const totalTickets = pool.reduce((n, e) => n + weight(e), 0);
      let pick = randInt(totalTickets);
      let chosen = pool[pool.length - 1];
      for (const e of pool) {
        pick -= weight(e);
        if (pick < 0) { chosen = e; break; }
      }
      this.sql.exec("UPDATE winners SET status = 'redrawn' WHERE prize_index = ? AND status = 'active'", prize);
      this.sql.exec(
        "INSERT INTO winners (prize_index, entry_id, pool_size, total_tickets, drawn_at) VALUES (?, ?, ?, ?, ?)",
        prize, chosen.id, pool.length, totalTickets, Date.now()
      );
      return reply({
        prize: PRIZES[prize],
        winner: { id: chosen.id, name: chosen.name, email: chosen.email, instagram_handle: chosen.instagram_handle, ig: !!chosen.ig_at, yt: !!chosen.yt_at },
        pool_size: pool.length,
        total_tickets: totalTickets,
      });
    }
    return reply({ error: "Not found" }, 404);
  }
}
