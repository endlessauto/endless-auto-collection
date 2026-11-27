import { DurableObject } from "cloudflare:workers";

const HEADERS = { "content-type": "application/json", "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" };
const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: HEADERS });

export const RAFFLE_ENDS = "2026-11-29T23:59:59-08:00";
export const PRIZES = ["Endless Membership, 1 Month", "Full Car Detail or $100 Coupon", "Endless T-Shirt"];
const MAX_ENTRIES_PER_IP = 5;
const MAX_ADMIN_FAILS = 5;
const MAX_POINTS = 5;
const DISPOSABLE = new Set(["mailinator.com","guerrillamail.com","10minutemail.com","tempmail.com","temp-mail.org","yopmail.com","trashmail.com","sharklasers.com","getnada.com","throwawaymail.com","maildrop.cc","dispostable.com","fakeinbox.com","mailnesia.com","mintemail.com"]);
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

const weight = (e) => Math.min(MAX_POINTS, 1 + (e.ig_at ? 1 : 0) + (e.yt_at ? 1 : 0) + (e.google_at ? 1 : 0) + (e.bloggo_at ? 1 : 0)) + (e.bonus || 0);

const emailKey = (email) => {
  let [local, domain] = email.split("@");
  local = local.split("+")[0];
  if (domain === "gmail.com" || domain === "googlemail.com") {
    domain = "gmail.com";
    local = local.replace(/\./g, "");
  }
  return local + "@" + domain;
};
const nameKey = (name) => name.toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "");

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
    const cols = this.sql.exec("PRAGMA table_info(entries)").toArray().map((c) => c.name);
    for (const [col, type] of [["email_key", "TEXT"], ["name_key", "TEXT"], ["ig_key", "TEXT"], ["google_at", "INTEGER"], ["bloggo_at", "INTEGER"], ["removed_at", "INTEGER"], ["bonus", "INTEGER DEFAULT 0"]]) {
      if (!cols.includes(col)) this.sql.exec(`ALTER TABLE entries ADD COLUMN ${col} ${type}`);
    }
    for (const r of this.sql.exec("SELECT id, email, name, instagram_handle FROM entries WHERE email_key IS NULL").toArray()) {
      this.sql.exec(
        "UPDATE entries SET email_key = ?, name_key = ?, ig_key = ? WHERE id = ?",
        emailKey(r.email), nameKey(r.name), r.instagram_handle ? r.instagram_handle.toLowerCase() : null, r.id
      );
    }
    try { this.sql.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_entries_email_key ON entries(email_key)"); } catch {}
    this.sql.exec(`CREATE TABLE IF NOT EXISTS admin_fails (
      ip_hash TEXT PRIMARY KEY,
      count INTEGER NOT NULL,
      locked_until INTEGER NOT NULL
    )`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS bonus_awards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_id INTEGER NOT NULL,
      reason TEXT NOT NULL,
      points INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      UNIQUE (entry_id, reason)
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
    return this.sql.exec("SELECT ig_at, yt_at, google_at, bloggo_at, bonus FROM entries WHERE removed_at IS NULL").toArray().reduce((n, e) => n + weight(e), 0);
  }

  mine(token) {
    if (typeof token !== "string" || token.length < 20) return null;
    const row = this.sql.exec("SELECT * FROM entries WHERE token = ?", token).toArray()[0];
    if (!row) return null;
    return { name: row.name, entries: weight(row), instagram: !!row.ig_at, youtube: !!row.yt_at, google: !!row.google_at, bloggo: !!row.bloggo_at, bonus: row.bonus || 0 };
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
    if (path.startsWith("/admin/")) return await this.admin(request, path, body);
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

    if (DISPOSABLE.has(email.split("@")[1])) return reply({ error: "Use a real email address so we can reach you if you win." }, 400);
    const eKey = emailKey(email);
    if (this.sql.exec("SELECT 1 FROM entries WHERE email_key = ?", eKey).toArray().length) {
      return reply({ error: "That email is already entered. Good luck." }, 409);
    }

    const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "");
    this.sql.exec(
      "INSERT INTO entries (name, email, email_key, name_key, token, ip_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      name, email, eKey, nameKey(name), token, ipHash, Date.now()
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
      const igKey = handle.toLowerCase();
      if (this.sql.exec("SELECT 1 FROM entries WHERE ig_key = ? AND token <> ?", igKey, token).toArray().length) {
        return reply({ error: "That Instagram handle is already claimed on another entry." }, 409);
      }
      this.sql.exec(
        "UPDATE entries SET instagram_handle = ?, ig_key = ?, ig_at = COALESCE(ig_at, ?) WHERE token = ?",
        handle, igKey, Date.now(), token
      );
    } else if (b.action === "youtube") {
      this.sql.exec("UPDATE entries SET yt_at = COALESCE(yt_at, ?) WHERE token = ?", Date.now(), token);
    } else if (b.action === "google") {
      this.sql.exec("UPDATE entries SET google_at = COALESCE(google_at, ?) WHERE token = ?", Date.now(), token);
    } else if (b.action === "bloggo") {
      this.sql.exec("UPDATE entries SET bloggo_at = COALESCE(bloggo_at, ?) WHERE token = ?", Date.now(), token);
    } else {
      return reply({ error: "Unknown action." }, 400);
    }
    return reply(this.state(token));
  }

  async admin(request, path, b) {
    const key = this.env.RAFFLE_ADMIN_KEY;
    if (!key) return reply({ error: "Admin key not configured." }, 503);
    const ipHash = await sha256("eac-raffle-admin|" + (request.headers.get("cf-connecting-ip") || "unknown"));
    const f = this.sql.exec("SELECT count, locked_until FROM admin_fails WHERE ip_hash = ?", ipHash).toArray()[0];
    if (f && f.locked_until > Date.now()) return reply({ error: "Too many wrong passwords. Try again in 15 minutes." }, 429);
    const auth = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!safeEqual(auth, key)) {
      const count = (f ? f.count : 0) + 1;
      const lockedUntil = count >= MAX_ADMIN_FAILS ? Date.now() + 15 * 60000 : 0;
      this.sql.exec(
        "INSERT INTO admin_fails (ip_hash, count, locked_until) VALUES (?, ?, ?) ON CONFLICT(ip_hash) DO UPDATE SET count = ?, locked_until = ?",
        ipHash, lockedUntil ? 0 : count, lockedUntil, lockedUntil ? 0 : count, lockedUntil
      );
      return reply({ error: "Wrong password." }, 401);
    }
    if (f) this.sql.exec("DELETE FROM admin_fails WHERE ip_hash = ?", ipHash);

    if (path === "/admin/entries") {
      const rows = this.sql.exec(
        `SELECT e.id, e.name, e.email, e.instagram_handle, e.ig_at, e.yt_at, e.google_at, e.bloggo_at, e.bonus, e.removed_at, e.created_at,
          (SELECT COUNT(*) FROM entries o WHERE o.id <> e.id AND o.name_key = e.name_key AND o.removed_at IS NULL) AS same_name,
          (SELECT COUNT(*) FROM entries o WHERE o.id <> e.id AND o.ip_hash = e.ip_hash AND o.removed_at IS NULL) AS same_network
         FROM entries e ORDER BY e.id`
      ).toArray();
      const winners = this.sql.exec("SELECT * FROM winners ORDER BY id").toArray();
      return reply({ prizes: PRIZES, entries: rows.map((r) => ({ ...r, tickets: weight(r) })), winners });
    }

    if ((path === "/admin/remove" || path === "/admin/restore") && request.method === "POST") {
      const id = b.id;
      if (!Number.isInteger(id)) return reply({ error: "Unknown entry." }, 400);
      if (path === "/admin/remove") {
        if (this.sql.exec("SELECT 1 FROM winners WHERE entry_id = ? AND status = 'active'", id).toArray().length) {
          return reply({ error: "This entry is a current winner. Redraw that prize first." }, 409);
        }
        this.sql.exec("UPDATE entries SET removed_at = COALESCE(removed_at, ?) WHERE id = ?", Date.now(), id);
      } else {
        this.sql.exec("UPDATE entries SET removed_at = NULL WHERE id = ?", id);
      }
      return reply({ ok: true });
    }

    if (path === "/admin/bonus" && request.method === "POST") {
      const points = b.points;
      const reason = typeof b.reason === "string" ? b.reason.trim().slice(0, 60) : "";
      if (!Number.isInteger(points) || points === 0 || Math.abs(points) > 20 || !reason) return reply({ error: "Enter points and a reason." }, 400);
      const e = Number.isInteger(b.id)
        ? this.sql.exec("SELECT id, name, bonus FROM entries WHERE id = ? AND removed_at IS NULL", b.id).toArray()[0]
        : typeof b.token === "string" && b.token.length >= 20
          ? this.sql.exec("SELECT id, name, bonus FROM entries WHERE token = ? AND removed_at IS NULL", b.token).toArray()[0]
          : null;
      if (!e) return reply({ error: "That guest is not in the raffle." }, 404);
      if (this.sql.exec("SELECT 1 FROM bonus_awards WHERE entry_id = ? AND reason = ?", e.id, reason).toArray().length) {
        return reply({ error: e.name + " already has this bonus." }, 409);
      }
      const next = Math.max(0, (e.bonus || 0) + points);
      this.sql.exec("INSERT INTO bonus_awards (entry_id, reason, points, created_at) VALUES (?, ?, ?, ?)", e.id, reason, points, Date.now());
      this.sql.exec("UPDATE entries SET bonus = ? WHERE id = ?", next, e.id);
      return reply({ ok: true, name: e.name, bonus: next });
    }

    if (path === "/admin/reset-winners" && request.method === "POST") {
      this.sql.exec("DELETE FROM winners");
      return reply({ ok: true });
    }

    if (path === "/admin/draw" && request.method === "POST") {
      const prize = b.prize;
      if (!Number.isInteger(prize) || prize < 0 || prize >= PRIZES.length) return reply({ error: "Unknown prize." }, 400);
      const active = this.sql.exec("SELECT id FROM winners WHERE prize_index = ? AND status = 'active'", prize).toArray();
      if (active.length && !b.redraw) return reply({ error: "Prize already drawn. Pass redraw to replace the winner." }, 409);

      const pool = this.sql.exec(
        "SELECT * FROM entries WHERE removed_at IS NULL AND id NOT IN (SELECT entry_id FROM winners) ORDER BY id"
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
        winner: { id: chosen.id, name: chosen.name, email: chosen.email, instagram_handle: chosen.instagram_handle, ig: !!chosen.ig_at, yt: !!chosen.yt_at, google: !!chosen.google_at, bloggo: !!chosen.bloggo_at },
        pool_size: pool.length,
        total_tickets: totalTickets,
      });
    }
    return reply({ error: "Not found" }, 404);
  }
}
