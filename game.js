import { DurableObject } from "cloudflare:workers";
import { QUESTIONS, QUESTION_SECONDS } from "./trivia-questions.js";

const HEADERS = { "content-type": "application/json", "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" };
const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: HEADERS });
const MAX_PLAYERS = 300;
const MAX_CANDIDATES = 60;
const MAX_PHOTO = 600000;
const voterToken = (t) => typeof t === "string" && /^[A-Za-z0-9_-]{20,64}$/.test(t);
const TRIVIA_POINTS = 2;
const VOTE_POINTS = 2;

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
const clean = (v, n) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, n) : "");
const secs = (q) => (q && q.seconds) || QUESTION_SECONDS;

export class GameState extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec("CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL)");
    this.sql.exec("CREATE TABLE IF NOT EXISTS players (token TEXT PRIMARY KEY, name TEXT NOT NULL, raffle_token TEXT, joined_at INTEGER NOT NULL)");
    this.sql.exec("CREATE TABLE IF NOT EXISTS answers (token TEXT NOT NULL, qi INTEGER NOT NULL, choice INTEGER NOT NULL, ms INTEGER NOT NULL, PRIMARY KEY (token, qi))");
    this.sql.exec("CREATE TABLE IF NOT EXISTS candidates (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, caption TEXT, link_token TEXT, photo BLOB, car BLOB, created_at INTEGER NOT NULL)");
    this.sql.exec("CREATE TABLE IF NOT EXISTS votes (token TEXT PRIMARY KEY, candidate_id INTEGER NOT NULL)");
    this.sql.exec("CREATE TABLE IF NOT EXISTS admin_fails (ip_hash TEXT PRIMARY KEY, count INTEGER NOT NULL, locked_until INTEGER NOT NULL)");
  }

  // MARK: - Storage helpers

  kvGet(k, fallback) {
    const r = this.sql.exec("SELECT v FROM kv WHERE k = ?", k).toArray()[0];
    return r ? JSON.parse(r.v) : fallback;
  }
  kvSet(k, v) {
    this.sql.exec("INSERT INTO kv (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v", k, JSON.stringify(v));
  }
  rawGame() { return this.kvGet("g", { phase: "lobby", qi: -1, qStart: 0 }); }
  game() {
    const g = this.rawGame();
    const q = QUESTIONS[g.qi];
    if (g.phase !== "question" || !q) return g;
    const players = this.sql.exec("SELECT COUNT(*) AS c FROM players").one().c;
    const answered = this.sql.exec("SELECT COUNT(*) AS c FROM answers WHERE qi = ?", g.qi).one().c;
    if (players > 0 && answered >= players) {
      const next = { ...g, phase: "reveal" };
      this.kvSet("g", next);
      return next;
    }
    if (Date.now() >= g.qStart + secs(q) * 1000) return { ...g, phase: "reveal" };
    return g;
  }
  voteMode() { return this.kvGet("v", "closed"); }
  player(token) {
    if (typeof token !== "string" || token.length < 20) return null;
    return this.sql.exec("SELECT * FROM players WHERE token = ?", token).toArray()[0] || null;
  }

  // MARK: - Trivia scoring

  scoredCount(g) {
    if (g.phase === "reveal") return g.qi + 1;
    if (g.phase === "lobby") return 0;
    return Math.max(0, g.qi);
  }

  leaderboard() {
    const g = this.game();
    const upto = this.scoredCount(g);
    const players = this.sql.exec("SELECT token, name, raffle_token FROM players").toArray();
    const score = {};
    for (const a of this.sql.exec("SELECT token, qi, choice, ms FROM answers WHERE qi < ?", upto).toArray()) {
      const q = QUESTIONS[a.qi];
      if (!q || a.choice !== q.answer) continue;
      const frac = Math.min(1, a.ms / (secs(q) * 1000));
      score[a.token] = (score[a.token] || 0) + Math.round(1000 * (1 - frac / 2));
    }
    const rows = players.map((p) => ({ token: p.token, name: p.name, inRaffle: !!p.raffle_token, score: score[p.token] || 0 }));
    rows.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
    let rank = 0, prev = null;
    rows.forEach((r, i) => { if (r.score !== prev) { rank = i + 1; prev = r.score; } r.rank = rank; });
    return rows;
  }

  triviaState(token, host) {
    const g = this.game();
    const q = QUESTIONS[g.qi];
    const out = { phase: g.phase, qi: g.qi, total: QUESTIONS.length, now: Date.now(), players: this.sql.exec("SELECT COUNT(*) AS c FROM players").one().c };
    if ((g.phase === "question" || g.phase === "reveal") && q) {
      out.q = { prompt: q.prompt, image: q.image || null, credit: q.credit || null, options: q.options };
      out.endsAt = g.qStart + secs(q) * 1000;
      out.seconds = secs(q);
      out.answered = this.sql.exec("SELECT COUNT(*) AS c FROM answers WHERE qi = ?", g.qi).one().c;
      if (g.phase === "reveal" || host) out.answer = q.answer;
      if (g.phase === "reveal") {
        const dist = [0, 0, 0, 0];
        for (const r of this.sql.exec("SELECT choice, COUNT(*) AS c FROM answers WHERE qi = ? GROUP BY choice", g.qi).toArray()) dist[r.choice] = r.c;
        out.dist = dist;
      }
    }
    const lb = this.leaderboard();
    if (g.phase === "reveal" || g.phase === "final") out.top = lb.slice(0, 5).map((r) => ({ name: r.name, score: r.score, rank: r.rank }));
    const p = this.player(token);
    if (p) {
      const mine = lb.find((r) => r.token === p.token);
      const a = this.sql.exec("SELECT choice FROM answers WHERE token = ? AND qi = ?", p.token, g.qi).toArray()[0];
      out.me = { name: p.name, choice: a ? a.choice : null, score: mine.score, rank: mine.rank, of: lb.length };
      if (g.phase === "reveal" && q) {
        const row = this.sql.exec("SELECT choice, ms FROM answers WHERE token = ? AND qi = ?", p.token, g.qi).toArray()[0];
        out.me.correct = !!row && row.choice === q.answer;
        out.me.gained = out.me.correct ? Math.round(1000 * (1 - Math.min(1, row.ms / (secs(q) * 1000)) / 2)) : 0;
      }
    }
    if (host) {
      out.sample = QUESTIONS.some((x) => x.sample);
      out.board = lb.slice(0, 10);
      out.roster = this.sql.exec("SELECT name FROM players ORDER BY joined_at DESC LIMIT 60").toArray().map((r) => r.name);
    }
    return out;
  }

  // MARK: - Vote

  candidateRows() {
    return this.sql.exec(
      `SELECT c.id, c.name, c.caption, c.link_token, (c.car IS NOT NULL) AS has_car,
        (SELECT COUNT(*) FROM votes v WHERE v.candidate_id = c.id) AS votes
       FROM candidates c ORDER BY c.id`
    ).toArray();
  }

  voteState(token, host) {
    const mode = this.voteMode();
    const rows = this.candidateRows();
    const out = {
      mode,
      candidates: rows.map((r) => ({ id: r.id, name: r.name, caption: r.caption || "", hasCar: !!r.has_car })),
      voters: this.sql.exec("SELECT COUNT(*) AS c FROM votes").one().c,
    };
    const p = this.player(token);
    if (token) out.joined = !!p;
    out.anonVotes = true;
    if (voterToken(token)) {
      const v = this.sql.exec("SELECT candidate_id FROM votes WHERE token = ?", token).toArray()[0];
      out.myVote = v ? v.candidate_id : null;
    }
    const top = Math.max(0, ...rows.map((r) => r.votes));
    if (mode === "revealed" || host) {
      out.results = rows.map((r) => ({ id: r.id, name: r.name, votes: r.votes, winner: top > 0 && r.votes === top }));
    }
    if (host) {
      out.players = this.sql.exec("SELECT token, name FROM players ORDER BY name").toArray();
      out.links = Object.fromEntries(rows.map((r) => [r.id, !!r.link_token]));
    }
    return out;
  }

  // MARK: - Routing

  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname.replace("/api/game", "");
    const isPost = request.method === "POST";

    if (path.startsWith("/host/")) return await this.host(request, url, path.slice(5));

    if (path === "/trivia/state" && !isPost) return reply(this.triviaState(url.searchParams.get("token"), false));
    if (path === "/vote/state" && !isPost) return reply(this.voteState(url.searchParams.get("token"), false));
    if (path === "/vote/photo" && !isPost) return this.photo(url);

    if (!isPost) return reply({ error: "Not found" }, 404);
    let b;
    try { b = await request.json(); } catch { return reply({ error: "Invalid request" }, 400); }

    if (path === "/join") return await this.join(b);
    if (path === "/trivia/answer") return this.answer(b);
    if (path === "/vote/cast") return this.cast(b);
    return reply({ error: "Not found" }, 404);
  }

  async join(b) {
    if (b.website) return reply({ error: "Could not join." }, 400);
    const existing = this.player(b.token);
    if (existing) return reply({ token: existing.token, name: existing.name });
    const name = clean(b.name, 24);
    if (name.length < 1) return reply({ error: "Enter your first name." }, 400);
    if (this.sql.exec("SELECT COUNT(*) AS c FROM players").one().c >= MAX_PLAYERS) return reply({ error: "This game is full." }, 409);
    let raffleToken = null;
    if (typeof b.raffleToken === "string" && b.raffleToken.length >= 20) {
      try {
        const r = await this.env.RAFFLE_STATE.get(this.env.RAFFLE_STATE.idFromName("main")).fetch(
          new Request("https://internal/api/raffle/state?token=" + encodeURIComponent(b.raffleToken))
        );
        const j = await r.json();
        if (j && j.me) raffleToken = b.raffleToken;
      } catch {}
    }
    const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "");
    this.sql.exec("INSERT INTO players (token, name, raffle_token, joined_at) VALUES (?, ?, ?, ?)", token, name, raffleToken, Date.now());
    return reply({ token, name });
  }

  answer(b) {
    const p = this.player(b.token);
    if (!p) return reply({ error: "Join the game first." }, 401);
    const g = this.rawGame();
    const q = QUESTIONS[g.qi];
    if (g.phase !== "question" || !q) return reply({ error: "No question is open." }, 409);
    const now = Date.now();
    if (now > g.qStart + secs(q) * 1000 + 1500) return reply({ error: "Time is up." }, 409);
    if (!Number.isInteger(b.choice) || b.choice < 0 || b.choice >= q.options.length) return reply({ error: "Pick one of the answers." }, 400);
    if (this.sql.exec("SELECT 1 FROM answers WHERE token = ? AND qi = ?", p.token, g.qi).toArray().length) return reply({ error: "You already answered." }, 409);
    this.sql.exec("INSERT INTO answers (token, qi, choice, ms) VALUES (?, ?, ?, ?)", p.token, g.qi, b.choice, Math.min(now - g.qStart, secs(q) * 1000));
    this.game();
    return reply({ ok: true });
  }

  cast(b) {
    if (!voterToken(b.token)) return reply({ error: "Could not read your vote. Refresh and try again." }, 400);
    if (this.voteMode() !== "open") return reply({ error: "Voting is not open." }, 409);
    if (!Number.isInteger(b.candidate) || !this.sql.exec("SELECT 1 FROM candidates WHERE id = ?", b.candidate).toArray().length) return reply({ error: "Unknown entry." }, 400);
    this.sql.exec("INSERT INTO votes (token, candidate_id) VALUES (?, ?) ON CONFLICT(token) DO UPDATE SET candidate_id = excluded.candidate_id", b.token, b.candidate);
    return reply({ ok: true });
  }

  photo(url) {
    const id = Number(url.searchParams.get("id"));
    const col = url.searchParams.get("s") === "car" ? "car" : "photo";
    const r = this.sql.exec(`SELECT ${col} AS img FROM candidates WHERE id = ?`, id).toArray()[0];
    if (!r || !r.img) return new Response("Not found", { status: 404 });
    return new Response(r.img, { headers: { "content-type": "image/jpeg", "cache-control": "private, max-age=120", "x-robots-tag": "noindex, nofollow" } });
  }

  // MARK: - Host

  async authed(request) {
    const key = this.env.RAFFLE_ADMIN_KEY;
    if (!key) return reply({ error: "Admin key not configured." }, 503);
    const auth = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!safeEqual(auth, key)) return reply({ error: "Wrong password." }, 401);
    return null;
  }

  async award(token, reason, points) {
    const stub = this.env.RAFFLE_STATE.get(this.env.RAFFLE_STATE.idFromName("main"));
    const r = await stub.fetch(new Request("https://internal/api/raffle/admin/bonus", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer " + this.env.RAFFLE_ADMIN_KEY },
      body: JSON.stringify({ token, points, reason }),
    }));
    const j = await r.json();
    return reply(r.ok ? { ok: true, name: j.name, bonus: j.bonus } : { error: j.error || "Could not award." }, r.ok ? 200 : r.status);
  }

  async host(request, url, path) {
    const bad = await this.authed(request);
    if (bad) return bad;
    const event = url.searchParams.get("e") === "sun" ? "sun" : "fri";

    if (path === "/trivia/state" && request.method === "GET") return reply(this.triviaState(null, true));
    if (path === "/vote/state" && request.method === "GET") return reply(this.voteState(null, true));
    if (request.method !== "POST") return reply({ error: "Not found" }, 404);

    if (path === "/vote/add" || path === "/vote/car" || path === "/vote/replace") {
      const buf = await request.arrayBuffer();
      if (!buf.byteLength || buf.byteLength > MAX_PHOTO) return reply({ error: "Photo is empty or too large." }, 413);
      if (path === "/vote/add") {
        const name = clean(url.searchParams.get("name"), 40);
        if (!name) return reply({ error: "Enter a name." }, 400);
        if (this.sql.exec("SELECT COUNT(*) AS c FROM candidates").one().c >= MAX_CANDIDATES) return reply({ error: "Too many entries." }, 409);
        const link = clean(url.searchParams.get("link"), 120) || null;
        const r = this.sql.exec(
          "INSERT INTO candidates (name, caption, link_token, photo, created_at) VALUES (?, ?, ?, ?, ?) RETURNING id",
          name, clean(url.searchParams.get("caption"), 80), link && this.player(link) ? this.player(link).raffle_token : null, buf, Date.now()
        ).one();
        return reply({ id: r.id });
      }
      const id = Number(url.searchParams.get("id"));
      if (path === "/vote/replace") {
        if (!this.sql.exec("SELECT 1 FROM candidates WHERE id = ?", id).toArray().length) return reply({ error: "Unknown entry." }, 404);
        this.sql.exec("UPDATE candidates SET photo = ? WHERE id = ?", buf, id);
        return reply({ ok: true });
      }
      this.sql.exec("UPDATE candidates SET car = ? WHERE id = ?", buf, id);
      return reply({ ok: true });
    }

    let b = {};
    try { b = await request.json(); } catch { return reply({ error: "Invalid request" }, 400); }

    if (path === "/trivia/start") {
      if (!QUESTIONS.length) return reply({ error: "No questions loaded." }, 409);
      this.kvSet("g", { phase: "question", qi: 0, qStart: Date.now() });
      return reply({ ok: true });
    }
    if (path === "/trivia/reveal") {
      const g = this.rawGame();
      if (g.phase !== "question") return reply({ error: "No question is open." }, 409);
      this.kvSet("g", { ...g, phase: "reveal" });
      return reply({ ok: true });
    }
    if (path === "/trivia/next") {
      const g = this.game();
      if (g.phase !== "reveal") return reply({ error: "Reveal the answer first." }, 409);
      const qi = g.qi + 1;
      this.kvSet("g", qi >= QUESTIONS.length ? { phase: "final", qi: QUESTIONS.length, qStart: 0 } : { phase: "question", qi, qStart: Date.now() });
      return reply({ ok: true });
    }
    if (path === "/trivia/reset") {
      this.sql.exec("DELETE FROM answers");
      this.kvSet("g", { phase: "lobby", qi: -1, qStart: 0 });
      return reply({ ok: true });
    }
    if (path === "/trivia/award") {
      const row = this.sql.exec("SELECT raffle_token FROM players WHERE token = ?", b.player).toArray()[0];
      if (!row) return reply({ error: "Unknown player." }, 404);
      if (!row.raffle_token) return reply({ error: "This guest is not in the raffle yet. Add the bonus in the raffle admin after they enter." }, 409);
      return await this.award(row.raffle_token, "trivia-" + event, TRIVIA_POINTS);
    }
    if (path === "/vote/mode") {
      if (!["closed", "open", "revealed"].includes(b.mode)) return reply({ error: "Unknown mode." }, 400);
      this.kvSet("v", b.mode);
      return reply({ ok: true });
    }
    if (path === "/vote/remove") {
      this.sql.exec("DELETE FROM votes WHERE candidate_id = ?", b.id);
      this.sql.exec("DELETE FROM candidates WHERE id = ?", b.id);
      return reply({ ok: true });
    }
    if (path === "/vote/award") {
      const row = this.sql.exec("SELECT link_token FROM candidates WHERE id = ?", b.id).toArray()[0];
      if (!row) return reply({ error: "Unknown entry." }, 404);
      if (!row.link_token) return reply({ error: "This entry is not linked to a raffle entry. Add the bonus in the raffle admin." }, 409);
      return await this.award(row.link_token, "vote-" + event, VOTE_POINTS);
    }
    return reply({ error: "Not found" }, 404);
  }
}
