import { DurableObject } from "cloudflare:workers";
import { RaffleState } from "./raffle.js";
import { PotluckState } from "./potluck.js";
import { AnalyticsState } from "./analytics.js";

export { RaffleState, PotluckState, AnalyticsState };

const KEY_RE = /^\/api\/eacmedia\/([a-z0-9-]{3,50}-\d{4}-\d{2}-\d{2})$/;
const ID_RE = /^([A-Z][0-9]{1,2}|p[0-9]{1,2})$/;
const HEADERS = { "content-type": "application/json", "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" };

const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: HEADERS });

const enc = new TextEncoder();
const SESSION_SECONDS = 60 * 60 * 12;
const REMEMBER_SECONDS = 60 * 60 * 24 * 365;
const NO_STORE = { "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" };

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
async function sign(env, payload) {
  const key = await crypto.subtle.importKey("raw", enc.encode("eac-admin:" + env.ADMIN_PASS), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, enc.encode(payload)));
}
async function safeEqual(a, b) {
  const [x, y] = await Promise.all([crypto.subtle.digest("SHA-256", enc.encode(a)), crypto.subtle.digest("SHA-256", enc.encode(b))]);
  const xa = new Uint8Array(x), ya = new Uint8Array(y);
  let d = 0;
  for (let i = 0; i < xa.length; i++) d |= xa[i] ^ ya[i];
  return d === 0;
}
async function isSignedIn(request, env) {
  const m = /(?:^|;\s*)eac_admin=(\d+)\.([a-f0-9]{64})/.exec(request.headers.get("cookie") || "");
  if (!m || Number(m[1]) < Date.now()) return false;
  return safeEqual(m[2], await sign(env, m[1]));
}
const safeNext = (n) => (typeof n === "string" && /^\/(?!\/|\\)/.test(n) && !n.startsWith("/admin/login") ? n : "/admin");
const loginPage = (error, next = "/admin") => new Response(`<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow"><title>Team sign in | Endless Auto Collection</title>
<style>
*{box-sizing:border-box}body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#0b0d10;color:#f2f2f2;font:16px/1.5 -apple-system,BlinkMacSystemFont,"Inter",sans-serif;padding:24px}
form{width:100%;max-width:340px}h1{font-size:24px;margin:0 0 4px}p{margin:0 0 20px;color:#9aa0a6}
label{display:block;font-size:13px;color:#9aa0a6;margin:14px 0 6px}
input{width:100%;padding:13px 14px;border-radius:10px;border:1px solid #2a2f36;background:#14171b;color:#fff;font-size:16px}
input:focus{outline:2px solid #e11d2e;border-color:transparent}
button{width:100%;margin-top:22px;padding:14px;border:0;border-radius:10px;background:#e11d2e;color:#fff;font-size:16px;font-weight:600}
.rm{display:flex;align-items:center;gap:10px;margin:16px 0 0;font-size:14px;color:#c9ced4}.rm input{width:20px;height:20px;margin:0;accent-color:#e11d2e}
.err{margin-top:14px;color:#ff8a8a;font-size:14px}
</style></head><body>
<form method="post" action="/admin/login">
<input type="hidden" name="next" value="${safeNext(next).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;")}">
<h1>Team sign in</h1><p>Endless Auto Collection</p>
<label for="u">Username</label><input id="u" name="username" autocomplete="username" autocapitalize="none" required autofocus>
<label for="p">Password</label><input id="p" name="password" type="password" autocomplete="current-password" required>
<label class="rm"><input type="checkbox" name="remember" value="1"> Remember this device</label>
<button type="submit">Sign in</button>${error ? `<div class="err">${error}</div>` : ""}
</form></body></html>`, { status: error ? 401 : 200, headers: { "content-type": "text/html; charset=utf-8", ...NO_STORE } });

const csvCell = (v) => {
  let t = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(t)) t = "'" + t;
  return `"${t.replace(/"/g, '""')}"`;
};
const RSVP_EVENTS = [["Friday", "friendsgiving-2026"], ["Sunday", "friendsgiving-sun-2026"]];
const ANSWER = { going: "Going", maybe: "Maybe", cant: "Can't" };

async function rsvpRows(env) {
  const out = [];
  for (const [event, id] of RSVP_EVENTS) {
    const rows = await env.POTLUCK_STATE.get(env.POTLUCK_STATE.idFromName(id)).exportRsvps();
    for (const r of rows) out.push({ event, name: r.name, email: r.email || "", answer: ANSWER[r.status] || r.status, date: new Date(r.created_at).toISOString().slice(0, 10) });
  }
  return out;
}

async function rsvpJson(env) {
  return new Response(JSON.stringify({ rows: await rsvpRows(env) }), { headers: { "content-type": "application/json", ...NO_STORE } });
}

async function rsvpCsv(env) {
  const lines = [["First name", "Email", "Event", "Answer", "RSVP date"].map(csvCell).join(",")];
  for (const r of await rsvpRows(env)) lines.push([r.name, r.email, r.event, r.answer, r.date].map(csvCell).join(","));
  return new Response(lines.join("\r\n") + "\r\n", {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="eac-email-list.csv"', ...NO_STORE },
  });
}

async function handleAdmin(request, env, url) {
  if (!env.ADMIN_USER || !env.ADMIN_PASS) {
    return new Response("Admin is not configured.", { status: 503, headers: NO_STORE });
  }
  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (path === "/admin/login" && request.method === "POST") {
    const form = await request.formData().catch(() => null);
    const u = String((form && form.get("username")) || "").trim().toLowerCase();
    const p = String((form && form.get("password")) || "");
    const okUser = await safeEqual(u, env.ADMIN_USER.toLowerCase());
    const okPass = await safeEqual(p, env.ADMIN_PASS);
    if (!(okUser && okPass)) {
      await new Promise((r) => setTimeout(r, 600));
      return loginPage("That username or password is wrong. Try again.", String((form && form.get("next")) || ""));
    }
    const remember = form.get("remember") === "1";
    const exp = String(Date.now() + (remember ? REMEMBER_SECONDS : SESSION_SECONDS) * 1000);
    const age = remember ? `; Max-Age=${REMEMBER_SECONDS}` : "";
    return new Response(null, {
      status: 303,
      headers: { location: safeNext(String(form.get("next") || "")), "set-cookie": `eac_admin=${exp}.${await sign(env, exp)}; Path=/${age}; HttpOnly; Secure; SameSite=Strict`, ...NO_STORE },
    });
  }
  if (path === "/admin/logout") {
    return new Response(null, { status: 303, headers: { location: "/admin", "set-cookie": "eac_admin=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict", ...NO_STORE } });
  }
  if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method not allowed", { status: 405, headers: NO_STORE });
  if (!(await isSignedIn(request, env))) return loginPage();
  if (path === "/admin/rsvps.csv") return rsvpCsv(env);
  if (path === "/admin/rsvps.json") return rsvpJson(env);
  if (path === "/admin/analytics.json") {
    return env.ANALYTICS_STATE.get(env.ANALYTICS_STATE.idFromName("main")).fetch(request);
  }
  if (path === "/admin/analytics" || path === "/admin/emails") {
    const page = await env.ASSETS.fetch(new Request(url.origin + path, request));
    const res = new Response(page.body, page);
    for (const [k, v] of Object.entries(NO_STORE)) res.headers.set(k, v);
    return res;
  }
  const asset = await env.ASSETS.fetch(new Request(url.origin + "/admin/", request));
  const out = new Response(asset.body, asset);
  for (const [k, v] of Object.entries(NO_STORE)) out.headers.set(k, v);
  return out;
}

const isTeamOnly = (pathname) => /^\/eacmedia(\/|$)/i.test(pathname) || /^\/api\/eacmedia\//i.test(pathname);

async function handleTeamOnly(request, env, url) {
  if (!env.ADMIN_USER || !env.ADMIN_PASS) return new Response("Team area is not configured.", { status: 503, headers: NO_STORE });
  if (await isSignedIn(request, env)) return null;
  if (url.pathname.toLowerCase().startsWith("/api/")) return reply({ error: "Sign in required" }, 401);
  return loginPage(null, url.pathname + url.search);
}

export class MediaState extends DurableObject {
  async fetch(request) {
    if (request.method === "POST") {
      let b;
      try { b = await request.json(); } catch { return reply({ error: "Invalid JSON" }, 400); }
      const id = b && b.id;
      const s = b && b.s;
      if (typeof id !== "string" || !ID_RE.test(id)) return reply({ error: "Invalid shot id" }, 400);
      if (s !== null && s !== "got" && s !== "redo") return reply({ error: "Invalid status" }, 400);
      if (s === null) {
        await this.ctx.storage.delete(id);
      } else {
        const by = typeof b.by === "string" ? b.by.trim().slice(0, 30) : "";
        await this.ctx.storage.put(id, { s, by, at: Date.now() });
      }
    }
    const all = await this.ctx.storage.list();
    return reply({ state: Object.fromEntries(all) });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if ((request.method === "GET" || request.method === "HEAD") && url.hostname.endsWith("endlessautocollection.com")) {
      const isInsecure = url.protocol === "http:" || url.hostname === "endlessautocollection.com";
      const htmlPage = /^\/([^/]+)\.html$/.exec(url.pathname);
      if (isInsecure || htmlPage) {
        url.protocol = "https:";
        url.hostname = "www.endlessautocollection.com";
        if (htmlPage) url.pathname = htmlPage[1] === "index" ? "/" : "/" + htmlPage[1];
        return Response.redirect(url.toString(), 301);
      }
    }
    if (isTeamOnly(url.pathname)) {
      const blocked = await handleTeamOnly(request, env, url);
      if (blocked) return blocked;
    }
    if (url.pathname === "/admin" || url.pathname.startsWith("/admin/")) return handleAdmin(request, env, url);
    if (url.pathname === "/api/analytics/e") {
      if (request.method !== "POST") return new Response(null, { status: 405, headers: { allow: "POST" } });
      if (Number(request.headers.get("content-length") || 0) > 600) return new Response(null, { status: 413 });
      return env.ANALYTICS_STATE.get(env.ANALYTICS_STATE.idFromName("main")).fetch(request);
    }
    if (url.pathname.startsWith("/api/raffle/")) {
      if (request.method !== "GET" && request.method !== "POST") return reply({ error: "Method not allowed" }, 405);
      if (Number(request.headers.get("content-length") || 0) > 2000) return reply({ error: "Too large" }, 413);
      return env.RAFFLE_STATE.get(env.RAFFLE_STATE.idFromName("main")).fetch(request);
    }
    if (url.pathname.startsWith("/api/potluck/")) {
      if (request.method !== "GET" && request.method !== "POST") return reply({ error: "Method not allowed" }, 405);
      if (Number(request.headers.get("content-length") || 0) > 1000) return reply({ error: "Too large" }, 413);
      return env.POTLUCK_STATE.get(env.POTLUCK_STATE.idFromName(url.searchParams.get("e") === "sun" ? "friendsgiving-sun-2026" : "friendsgiving-2026")).fetch(request);
    }
    const m = KEY_RE.exec(url.pathname);
    if (!m) {
      if (url.pathname.startsWith("/api/")) return reply({ error: "Not found" }, 404);
      const wrongCase = /^\/eacmedia(\/.*)?$/i.exec(url.pathname);
      if (wrongCase && !url.pathname.startsWith("/EACMedia")) {
        return Response.redirect(url.origin + "/EACMedia" + (wrongCase[1] || "/"), 301);
      }
      return env.ASSETS.fetch(request);
    }
    if (request.method !== "GET" && request.method !== "POST") return reply({ error: "Method not allowed" }, 405);
    if (Number(request.headers.get("content-length") || 0) > 1000) return reply({ error: "Too large" }, 413);
    const stub = env.MEDIA_STATE.get(env.MEDIA_STATE.idFromName(m[1]));
    return stub.fetch(request);
  },
};
