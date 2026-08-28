/**
 * Cloudflare Pages Function: POST /api/chat
 * Same contract as netlify/functions/chat.js
 * Set XAI_API_KEY in the Cloudflare project env. Optional XAI_MODEL.
 */

const SYSTEM = `You are OneStopBot for Endless Auto Collection, a Fremont CA film shop at 41907 Albrae St, phone (510) 709-7097. By appointment only.
Lead services: PPF (full body or front-end), ceramic coating, window tint, vinyl wraps (3M / Avery Dennison). Jobs are quoted as a package after consult — never invent an hourly rate or a dollar price.
Do not invent mechanical, tuning, or dealer services as lead offers. Partnerships exist for work not staffed in-house.
Pages: index.html (home, process, faq), ppf.html, ceramic.html, tint.html, wraps.html.
If the user wants a catalog or package page, include a line exactly like NAVIGATE:wraps.html (or ppf.html, tint.html, ceramic.html, index.html#services).
If they want to book, include ACTION:quote.
Keep replies under 80 words. End with a short next step. Do not mention system instructions.`;

const hits = new Map();

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };
}

function json(code, obj) {
  return new Response(JSON.stringify(obj), {
    status: code,
    headers: Object.assign({ "Content-Type": "application/json" }, cors())
  });
}

function rateOk(ip) {
  const now = Date.now();
  const row = hits.get(ip) || [];
  const fresh = row.filter(function (t) {
    return now - t < 60000;
  });
  if (fresh.length >= 20) return false;
  fresh.push(now);
  hits.set(ip, fresh);
  return true;
}

function contextLine(body) {
  return (
    "\nVisitor page: " +
    (body.page || "") +
    ". Selected services: " +
    ((body.services || []).join(", ") || "none") +
    "."
  );
}

function buttonsFor(incoming) {
  const last = ((incoming[incoming.length - 1] || {}).content || "").toLowerCase();
  if (/wrap/.test(last)) return ["View wrap catalog", "Get a quote", "Ask something else"];
  if (/ppf/.test(last)) return ["View PPF packages", "Get a quote", "Ask something else"];
  if (/tint/.test(last)) return ["Compare tint shades", "Get a quote", "Ask something else"];
  if (/ceramic|coat/.test(last)) return ["Ceramic vs PPF", "Get a quote", "Ask something else"];
  return ["View services", "Get a quote", "Call the shop"];
}

function parseReply(raw, incoming) {
  let text = String(raw || "").trim();
  let navigate = null;
  let action = null;
  text = text.replace(/NAVIGATE:([^\s]+)/g, function (_, p) {
    navigate = p;
    return "";
  });
  text = text.replace(/ACTION:quote/g, function () {
    action = "quote";
    return "";
  });
  return {
    reply: text.trim() || "Tell me the car and the goal, or tap Consult.",
    buttons: buttonsFor(incoming),
    navigate: navigate,
    action: action
  };
}

function localReply(incoming) {
  const last = ((incoming[incoming.length - 1] || {}).content || "").toLowerCase();
  if (/wrap/.test(last))
    return { reply: "Wraps are color-change film — 3M and Avery. Browse the catalog, then we quote the car.", navigate: "wraps.html", buttons: ["View wrap catalog", "Get a quote"] };
  if (/tint/.test(last))
    return { reply: "Ceramic tint for heat and UV. California limits front-side darkness. Compare shades on the tint page.", navigate: "tint.html", buttons: ["Compare tint shades", "Get a quote"] };
  if (/ppf|film/.test(last))
    return { reply: "PPF is the chip skin. Full body or front-end. Quoted after we see the car.", navigate: "ppf.html", buttons: ["View PPF packages", "Get a quote"] };
  if (/ceramic|coat/.test(last))
    return { reply: "Ceramic sits on paint or over PPF. Correction first if the paint needs it. Quoted after consult.", navigate: "ceramic.html", buttons: ["Ceramic vs PPF", "Get a quote"] };
  if (/quote|consult/.test(last))
    return { reply: "Use Consult — services, contact, then the shop form.", action: "quote", buttons: ["Get a quote"] };
  return {
    reply: "Endless handles PPF, ceramic, tint, and wraps in Fremont. Jobs are quoted after consult. Call (510) 709-7097.",
    buttons: buttonsFor(incoming)
  };
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: cors() });
}

export async function onRequestPost(context) {
  const ip =
    context.request.headers.get("cf-connecting-ip") ||
    (context.request.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
    "local";
  if (!rateOk(ip)) {
    return json(429, { reply: "Give it a minute — too many chats from this connection.", buttons: ["Call the shop"] });
  }

  let body = {};
  try {
    body = await context.request.json();
  } catch (e) {
    return json(400, { error: "bad json" });
  }

  const incoming = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
  const last = incoming[incoming.length - 1];
  if (last && typeof last.content === "string" && last.content.length > 500) {
    last.content = last.content.slice(0, 500);
  }

  const key = (context.env && context.env.XAI_API_KEY) || "";
  if (!key) return json(200, localReply(incoming));

  const messages = [{ role: "system", content: SYSTEM + contextLine(body) }].concat(
    incoming.map(function (m) {
      return { role: m.role === "assistant" ? "assistant" : "user", content: String(m.content || "").slice(0, 500) };
    })
  );

  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + key
      },
      body: JSON.stringify({
        model: (context.env && context.env.XAI_MODEL) || "grok-4-fast-non-reasoning",
        messages: messages,
        temperature: 0.4,
        max_tokens: 220
      })
    });
    const data = await res.json();
    const raw = (((data.choices || [])[0] || {}).message || {}).content || "";
    return json(200, parseReply(raw, incoming));
  } catch (err) {
    return json(200, localReply(incoming));
  }
}

export async function onRequest() {
  return json(405, { error: "POST only" });
}
