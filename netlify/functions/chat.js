const SYSTEM = `You are OneStopBot for Endless Auto Collection, Fremont CA, 41907 Albrae St, (510) 709-7097. Appointment only.
Lead: PPF full or front-end, ceramic coating, window tint, vinyl wraps (3M / Avery). Quote as a package after consult. Never invent an hourly rate or dollar price.
Do not invent mechanical or tuning as lead offers.
Pages: index.html, ppf.html, ceramic.html, tint.html, wraps.html.
If they want a page, include NAVIGATE:wraps.html (or ppf.html, tint.html, ceramic.html, index.html#services).
If they want to book, include ACTION:quote.
Replies under 80 words.`;

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors(), body: "" };
  if (event.httpMethod !== "POST") return json(405, { error: "POST only" });
  const ip = (event.headers["x-forwarded-for"] || "").split(",")[0].trim() || "local";
  if (!rateOk(ip)) return json(429, { reply: "Give it a minute.", buttons: ["Call the shop"] });
  let body = {};
  try { body = JSON.parse(event.body || "{}"); } catch (e) { return json(400, { error: "bad json" }); }
  const incoming = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
  const last = incoming[incoming.length - 1];
  if (last && typeof last.content === "string" && last.content.length > 500) last.content = last.content.slice(0, 500);
  const key = process.env.XAI_API_KEY;
  if (!key) return json(200, localReply(incoming));
  const messages = [{ role: "system", content: SYSTEM + " Page: " + (body.page || "") + " Services: " + ((body.services || []).join(", ") || "none") }].concat(
    incoming.map(function (m) { return { role: m.role === "assistant" ? "assistant" : "user", content: String(m.content || "").slice(0, 500) }; })
  );
  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
      body: JSON.stringify({ model: process.env.XAI_MODEL || "grok-4-fast-non-reasoning", messages: messages, temperature: 0.4, max_tokens: 220 })
    });
    const data = await res.json();
    const raw = (((data.choices || [])[0] || {}).message || {}).content || "";
    return json(200, parseReply(raw, incoming));
  } catch (err) {
    return json(200, localReply(incoming));
  }
};

const hits = new Map();
function rateOk(ip) {
  const now = Date.now();
  const row = (hits.get(ip) || []).filter(function (t) { return now - t < 60000; });
  if (row.length >= 20) return false;
  row.push(now); hits.set(ip, row); return true;
}
function parseReply(raw, incoming) {
  let text = String(raw || "").trim();
  let navigate = null, action = null;
  text = text.replace(/NAVIGATE:([^\s]+)/g, function (_, p) { navigate = p; return ""; });
  text = text.replace(/ACTION:quote/g, function () { action = "quote"; return ""; });
  return { reply: text.trim() || "Tell me the car and the goal, or tap Consult.", buttons: buttonsFor(incoming), navigate: navigate, action: action };
}
function localReply(incoming) {
  const last = ((incoming[incoming.length - 1] || {}).content || "").toLowerCase();
  if (/wrap/.test(last)) return { reply: "Wraps are 3M / Avery color-change film. Browse the catalog, then we quote the car.", navigate: "wraps.html", buttons: ["View wrap catalog", "Get a quote"] };
  if (/tint/.test(last)) return { reply: "Ceramic tint for heat and UV. California limits front-side darkness.", navigate: "tint.html", buttons: ["Compare tint shades", "Get a quote"] };
  if (/ppf|film/.test(last)) return { reply: "PPF is the chip skin. Full body or front-end. Quoted after we see the car.", navigate: "ppf.html", buttons: ["View PPF packages", "Get a quote"] };
  if (/quote|consult/.test(last)) return { reply: "Use Consult — services, contact, then the shop form.", action: "quote", buttons: ["Get a quote"] };
  return { reply: "Endless handles PPF, ceramic, tint, and wraps in Fremont. Jobs quoted after consult. (510) 709-7097.", buttons: buttonsFor(incoming) };
}
function buttonsFor(incoming) {
  const last = ((incoming[incoming.length - 1] || {}).content || "").toLowerCase();
  if (/wrap/.test(last)) return ["View wrap catalog", "Get a quote", "Ask something else"];
  if (/ppf/.test(last)) return ["View PPF packages", "Get a quote", "Ask something else"];
  if (/tint/.test(last)) return ["Compare tint shades", "Get a quote", "Ask something else"];
  return ["View services", "Get a quote", "Call the shop"];
}
function cors() {
  return { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
}
function json(code, obj) {
  return { statusCode: code, headers: Object.assign({ "Content-Type": "application/json" }, cors()), body: JSON.stringify(obj) };
}
