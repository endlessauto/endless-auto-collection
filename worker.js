import { DurableObject } from "cloudflare:workers";

const KEY_RE = /^\/api\/eacmedia\/([a-z0-9-]{3,50}-\d{4}-\d{2}-\d{2})$/;
const ID_RE = /^([A-Z][0-9]{1,2}|p[0-9]{1,2})$/;
const HEADERS = { "content-type": "application/json", "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" };

const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: HEADERS });

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
