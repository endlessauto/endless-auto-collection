import { DurableObject } from "cloudflare:workers";

const HEADERS = { "content-type": "application/json", "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" };
const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: HEADERS });

const CATEGORIES = ["Main", "Side", "Dessert", "Drinks", "Other"];
const MAX_ITEMS = 150;
const MAX_PER_IP = 6;
const STATUSES = ["going", "maybe", "cant"];
const MAX_RSVPS = 300;
const ACTIVITY = { going: "is going", maybe: "is a maybe", cant: "can't make it" };
const MAX_COMMENTS = 500;
const MAX_COMMENTS_PER_IP = 40;
const MAX_RSVP_PER_IP = 20;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
const LINK_RE = /https?:|www\.|\.(com|net|org|io|co|ru|xyz)\b|@\w/i;

const sha256 = async (s) => {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
};

const clean = (v, max) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");

export class PotluckState extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS dishes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      dish TEXT NOT NULL,
      category TEXT NOT NULL,
      token TEXT NOT NULL,
      ip_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id INTEGER,
      name TEXT NOT NULL,
      body TEXT NOT NULL,
      token TEXT NOT NULL,
      ip_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )`);
    for (const col of ["kind TEXT", "rsvp_id INTEGER"]) {
      try { this.sql.exec(`ALTER TABLE comments ADD COLUMN ${col}`); } catch {}
    }
    this.sql.exec(`CREATE TABLE IF NOT EXISTS rsvps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      status TEXT NOT NULL,
      token TEXT NOT NULL,
      ip_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )`);
    try { this.sql.exec("ALTER TABLE rsvps ADD COLUMN email TEXT"); } catch {}
  }

  exportRsvps() {
    return this.sql.exec("SELECT name, status, email, created_at FROM rsvps ORDER BY id ASC").toArray();
  }

  commentList() {
    return reply({ items: this.sql.exec("SELECT id, parent_id, name, body, kind, created_at FROM comments ORDER BY id ASC").toArray() });
  }

  async comment(request, b) {
    if (b.website) return reply({ error: "Could not post that." }, 400);
    const name = clean(b.name, 30);
    const body = clean(b.body, 400);
    if (name.length < 2) return reply({ error: "Enter your first name." }, 400);
    if (body.length < 2) return reply({ error: "Write a comment first." }, 400);
    if (LINK_RE.test(name) || LINK_RE.test(body)) return reply({ error: "No links or handles in comments." }, 400);
    let parent = null;
    if (b.parent_id !== undefined && b.parent_id !== null) {
      parent = Number(b.parent_id);
      const row = this.sql.exec("SELECT parent_id FROM comments WHERE id = ?", parent).toArray()[0];
      if (!row) return reply({ error: "That comment is gone." }, 404);
      if (row.parent_id !== null) parent = row.parent_id;
    }
    const ipHash = await sha256("eac-potluck|" + (request.headers.get("cf-connecting-ip") || "unknown"));
    const last = this.sql.exec("SELECT MAX(created_at) AS t FROM comments WHERE ip_hash = ?", ipHash).one().t;
    if (last && Date.now() - last < 8000) return reply({ error: "Give it a few seconds before posting again." }, 429);
    if (this.sql.exec("SELECT COUNT(*) AS c FROM comments").one().c >= MAX_COMMENTS) return reply({ error: "Comments are full. Message us on Instagram." }, 429);
    if (this.sql.exec("SELECT COUNT(*) AS c FROM comments WHERE ip_hash = ?", ipHash).one().c >= MAX_COMMENTS_PER_IP) return reply({ error: "That's plenty from one connection." }, 429);
    const token = crypto.randomUUID();
    const id = this.sql.exec("INSERT INTO comments (parent_id, name, body, token, ip_hash, created_at) VALUES (?, ?, ?, ?, ?, ?) RETURNING id", parent, name, body, token, ipHash, Date.now()).one().id;
    return reply({ id, token });
  }

  commentRemove(request, b) {
    const id = Number(b.id);
    if (!Number.isInteger(id)) return reply({ error: "Invalid request" }, 400);
    const key = this.env.RAFFLE_ADMIN_KEY;
    const auth = (request.headers.get("authorization") || "").replace(/^Bearer /, "");
    const admin = !!key && auth === key;
    if (!admin && typeof b.token !== "string") return reply({ error: "Invalid request" }, 400);
    const where = admin ? "id = ?" : "id = ? AND token = ?";
    const args = admin ? [id] : [id, b.token];
    this.sql.exec(`DELETE FROM comments WHERE parent_id IN (SELECT id FROM comments WHERE ${where})`, ...args);
    this.sql.exec(`DELETE FROM comments WHERE ${where}`, ...args);
    return reply({ ok: true });
  }

  activity(rsvpId, name, status) {
    this.sql.exec("DELETE FROM comments WHERE rsvp_id = ?", rsvpId);
    this.sql.exec(
      "INSERT INTO comments (parent_id, name, body, token, ip_hash, created_at, kind, rsvp_id) VALUES (NULL, ?, ?, ?, 'rsvp', ?, ?, ?)",
      name, ACTIVITY[status], crypto.randomUUID(), Date.now(), status, rsvpId
    );
  }

  rsvpList() {
    return reply({ items: this.sql.exec("SELECT id, name, status FROM rsvps ORDER BY id DESC").toArray() });
  }

  async rsvp(request, b) {
    if (b.website) return reply({ error: "Could not save that." }, 400);
    const name = clean(b.name, 30);
    if (!STATUSES.includes(b.status)) return reply({ error: "Pick Going, Maybe, or Can't." }, 400);
    if (name.length < 2) return reply({ error: "Enter your first name." }, 400);
    if (LINK_RE.test(name)) return reply({ error: "Just your first name, no links." }, 400);
    const email = clean(b.email, 254).toLowerCase();
    if (!EMAIL_RE.test(email)) return reply({ error: "Enter a valid email so we can send updates." }, 400);
    if (b.id !== undefined && b.id !== null) {
      const id = Number(b.id);
      if (!Number.isInteger(id) || typeof b.token !== "string") return reply({ error: "Invalid request" }, 400);
      this.sql.exec("UPDATE rsvps SET name = ?, status = ?, email = ? WHERE id = ? AND token = ?", name, b.status, email, id, b.token);
      if (this.sql.exec("SELECT COUNT(*) AS c FROM rsvps WHERE id = ? AND token = ?", id, b.token).one().c) this.activity(id, name, b.status);
      return reply({ ok: true });
    }
    const ipHash = await sha256("eac-potluck|" + (request.headers.get("cf-connecting-ip") || "unknown"));
    if (this.sql.exec("SELECT COUNT(*) AS c FROM rsvps").one().c >= MAX_RSVPS) return reply({ error: "RSVPs are full. Message us on Instagram." }, 429);
    if (this.sql.exec("SELECT COUNT(*) AS c FROM rsvps WHERE ip_hash = ?", ipHash).one().c >= MAX_RSVP_PER_IP) return reply({ error: "That's plenty from one connection. Message us on Instagram." }, 429);
    const token = crypto.randomUUID();
    const id = this.sql.exec("INSERT INTO rsvps (name, status, email, token, ip_hash, created_at) VALUES (?, ?, ?, ?, ?, ?) RETURNING id", name, b.status, email, token, ipHash, Date.now()).one().id;
    this.activity(id, name, b.status);
    return reply({ id, token });
  }

  rsvpRemove(b) {
    const id = Number(b.id);
    if (!Number.isInteger(id) || typeof b.token !== "string") return reply({ error: "Invalid request" }, 400);
    if (this.sql.exec("SELECT COUNT(*) AS c FROM rsvps WHERE id = ? AND token = ?", id, b.token).one().c) this.sql.exec("DELETE FROM comments WHERE rsvp_id = ?", id);
    this.sql.exec("DELETE FROM rsvps WHERE id = ? AND token = ?", id, b.token);
    return reply({ ok: true });
  }

  list() {
    const items = this.sql.exec("SELECT id, name, dish, category FROM dishes ORDER BY id DESC").toArray();
    return reply({ items });
  }

  async fetch(request) {
    const path = new URL(request.url).pathname.replace("/api/potluck", "");
    if (path === "/list" && request.method === "GET") return this.list();
    if (path === "/comments" && request.method === "GET") return this.commentList();
    if (path === "/rsvp-list" && request.method === "GET") return this.rsvpList();
    if (request.method !== "POST") return reply({ error: "Not found" }, 404);
    let b;
    try { b = await request.json(); } catch { return reply({ error: "Invalid request" }, 400); }
    if (path === "/add") return this.add(request, b);
    if (path === "/remove") return this.remove(b);
    if (path === "/edit") return this.edit(b);
    if (path === "/comment") return this.comment(request, b);
    if (path === "/comment-remove") return this.commentRemove(request, b);
    if (path === "/rsvp") return this.rsvp(request, b);
    if (path === "/rsvp-remove") return this.rsvpRemove(b);
    return reply({ error: "Not found" }, 404);
  }

  async add(request, b) {
    if (b.website) return reply({ error: "Could not add that." }, 400);
    const name = clean(b.name, 30);
    const dish = clean(b.dish, 60);
    const category = CATEGORIES.includes(b.category) ? b.category : "Other";
    if (name.length < 2) return reply({ error: "Enter your first name." }, 400);
    if (dish.length < 2) return reply({ error: "Enter what you're bringing." }, 400);
    if (LINK_RE.test(name) || LINK_RE.test(dish)) return reply({ error: "Keep it to the name of the dish, no links." }, 400);
    const ip = request.headers.get("cf-connecting-ip") || "unknown";
    const ipHash = await sha256("eac-potluck|" + ip);
    if (this.sql.exec("SELECT COUNT(*) AS c FROM dishes").one().c >= MAX_ITEMS) return reply({ error: "The list is full. Message us on Instagram." }, 429);
    if (this.sql.exec("SELECT COUNT(*) AS c FROM dishes WHERE ip_hash = ?", ipHash).one().c >= MAX_PER_IP) return reply({ error: "That's plenty. Remove one to add another." }, 429);
    const token = crypto.randomUUID();
    const id = this.sql.exec(
      "INSERT INTO dishes (name, dish, category, token, ip_hash, created_at) VALUES (?, ?, ?, ?, ?, ?) RETURNING id",
      name, dish, category, token, ipHash, Date.now()
    ).one().id;
    return reply({ id, token });
  }

  remove(b) {
    const id = Number(b.id);
    if (!Number.isInteger(id) || typeof b.token !== "string") return reply({ error: "Invalid request" }, 400);
    this.sql.exec("DELETE FROM dishes WHERE id = ? AND token = ?", id, b.token);
    return reply({ ok: true });
  }

  edit(b) {
    const id = Number(b.id);
    const dish = clean(b.dish, 60);
    const name = clean(b.name, 30);
    const category = CATEGORIES.includes(b.category) ? b.category : "Other";
    if (!Number.isInteger(id) || typeof b.token !== "string") return reply({ error: "Invalid request" }, 400);
    if (name.length < 2) return reply({ error: "Enter your first name." }, 400);
    if (dish.length < 2) return reply({ error: "Enter what you're bringing." }, 400);
    if (LINK_RE.test(name) || LINK_RE.test(dish)) return reply({ error: "Keep it to the name of the dish, no links." }, 400);
    this.sql.exec("UPDATE dishes SET name = ?, dish = ?, category = ? WHERE id = ? AND token = ?", name, dish, category, id, b.token);
    return reply({ ok: true });
  }
}
