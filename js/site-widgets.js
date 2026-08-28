/* Endless consult flow + OneStopBot. Shared by every page. */
(function () {
  const SERVICES = [
    { id: "ppf-full", label: "PPF Full Body", page: "ppf.html?pkg=full" },
    { id: "ppf-front", label: "Front-end PPF", page: "ppf.html?pkg=front" },
    { id: "tint", label: "Tinting", page: "tint.html" },
    { id: "wraps", label: "Wraps", page: "wraps.html" },
    { id: "ceramic", label: "Ceramic coating", page: "ceramic.html" },
    { id: "maintenance", label: "Maintenance", page: "index.html#process" },
    { id: "other", label: "Other", page: "index.html#faq" }
  ];
  const SHOPMONKEY =
    "https://app.shopmonkey.cloud/public/quote-request/a4ae6990-41f1-4247-ae13-fd586c6981a6";
  const MAX_TURNS = 18;

  const state = {
    step: 1,
    selected: [],
    contact: { name: "", phone: "", email: "" },
    messages: [],
    turns: 0
  };

  window.openQuote = openQuote;
  window.closeQuote = closeQuote;

  function $(id) {
    return document.getElementById(id);
  }

  function openQuote() {
    const m = $("quote");
    if (!m) return;
    ensureConsultShell();
    m.classList.remove("hidden");
    m.style.display = "flex";
    document.body.style.overflow = "hidden";
    goStep(1);
  }

  function closeQuote() {
    const m = $("quote");
    if (!m) return;
    m.style.display = "none";
    m.classList.add("hidden");
    document.body.style.overflow = "";
  }

  function ensureConsultShell() {
    const m = $("quote");
    if (!m || m.dataset.wired === "1") return;
    m.dataset.wired = "1";
    m.innerHTML =
      '<div class="bg-[#0a0a0a] border border-white/10 rounded-3xl w-full max-w-4xl overflow-hidden max-h-[92vh] flex flex-col">' +
      '<div class="flex justify-between items-center px-6 py-4 border-b border-white/10">' +
      '<div><h3 class="text-xl font-semibold">Request a consultation</h3>' +
      '<p id="consult-progress" class="text-xs text-white/40 mt-1">Step 1 of 3</p></div>' +
      '<button type="button" onclick="closeQuote()" class="text-3xl leading-none">&times;</button></div>' +
      '<div class="flex justify-center gap-2 py-3 border-b border-white/5" id="consult-dots"></div>' +
      '<div id="consult-body" class="p-6 overflow-y-auto"></div></div>';
  }

  function goStep(n) {
    state.step = n;
    const body = $("consult-body");
    const prog = $("consult-progress");
    if (prog) prog.textContent = "Step " + n + " of 3";
    renderDots();
    if (!body) return;
    if (n === 1) renderServices(body);
    else if (n === 2) renderContact(body);
    else renderSubmit(body);
  }

  function renderDots() {
    const el = $("consult-dots");
    if (!el) return;
    el.innerHTML = [1, 2, 3]
      .map(function (i) {
        const on = i === state.step;
        return (
          '<span style="width:8px;height:8px;border-radius:99px;display:inline-block;background:' +
          (on ? "#00f5ff" : "#333") +
          '"></span>'
        );
      })
      .join("");
  }

  function renderServices(body) {
    body.innerHTML =
      '<p class="text-white/60 mb-5">What are you thinking about? Tap all that apply.</p>' +
      '<div class="grid grid-cols-2 md:grid-cols-3 gap-3" id="service-chips"></div>' +
      '<div class="mt-8 flex justify-end"><button type="button" id="to-contact" class="btn px-6 py-2 rounded-2xl">Continue</button></div>';
    const wrap = $("service-chips");
    SERVICES.forEach(function (s) {
      const b = document.createElement("button");
      b.type = "button";
      b.className =
        "rounded-2xl border px-4 py-4 text-left text-sm " +
        (state.selected.indexOf(s.id) >= 0
          ? "border-[#00f5ff] text-[#00f5ff]"
          : "border-white/15 text-white/80");
      b.textContent = s.label;
      b.onclick = function () {
        const i = state.selected.indexOf(s.id);
        if (i >= 0) state.selected.splice(i, 1);
        else state.selected.push(s.id);
        renderServices(body);
      };
      wrap.appendChild(b);
    });
    $("to-contact").onclick = function () {
      goStep(2);
    };
  }

  function renderContact(body) {
    body.innerHTML =
      '<p class="text-white/60 mb-5">How should the shop reach you?</p>' +
      '<label class="block text-xs tracking-[2px] text-white/40 mb-2">NAME</label>' +
      '<input id="c-name" class="w-full mb-4 rounded-xl bg-black border border-white/15 px-4 py-3" value="' +
      escapeAttr(state.contact.name) +
      '">' +
      '<label class="block text-xs tracking-[2px] text-white/40 mb-2">PHONE</label>' +
      '<input id="c-phone" class="w-full mb-4 rounded-xl bg-black border border-white/15 px-4 py-3" value="' +
      escapeAttr(state.contact.phone) +
      '">' +
      '<label class="block text-xs tracking-[2px] text-white/40 mb-2">EMAIL</label>' +
      '<input id="c-email" type="email" class="w-full mb-6 rounded-xl bg-black border border-white/15 px-4 py-3" value="' +
      escapeAttr(state.contact.email) +
      '">' +
      '<div class="flex justify-between"><button type="button" id="back-1" class="px-6 py-2 rounded-2xl border border-white/20">Back</button>' +
      '<button type="button" id="to-iframe" class="btn px-6 py-2 rounded-2xl">Continue to request</button></div>';
    $("back-1").onclick = function () {
      state.contact.name = $("c-name").value;
      state.contact.phone = $("c-phone").value;
      state.contact.email = $("c-email").value;
      goStep(1);
    };
    $("to-iframe").onclick = function () {
      state.contact.name = $("c-name").value.trim();
      state.contact.phone = $("c-phone").value.trim();
      state.contact.email = $("c-email").value.trim();
      goStep(3);
    };
  }

  function selectedLabels() {
    return SERVICES.filter(function (s) {
      return state.selected.indexOf(s.id) >= 0;
    }).map(function (s) {
      return s.label;
    });
  }

  function renderSubmit(body) {
    const labels = selectedLabels();
    const chips = labels.length
      ? labels
          .map(function (l) {
            return (
              '<span class="inline-block mr-2 mb-2 px-3 py-1 rounded-full border border-[#00f5ff]/50 text-[#00f5ff] text-xs">' +
              l +
              "</span>"
            );
          })
          .join("")
      : '<span class="text-white/40 text-sm">No services selected</span>';
    const note = encodeURIComponent(
      "Endless web consult. Services: " +
        (labels.join(", ") || "unspecified") +
        ". Contact: " +
        state.contact.name +
        " / " +
        state.contact.phone +
        " / " +
        state.contact.email
    );
    const src = SHOPMONKEY + "?notes=" + note;
    body.innerHTML =
      '<p class="text-white/50 text-sm mb-3">Finish the shop form below. Your picks stay visible here even if the form cannot ingest them.</p>' +
      '<div class="mb-3">' +
      chips +
      "</div>" +
      '<iframe src="' +
      src +
      '" width="100%" height="520" style="border:0;border-radius:16px;background:#111"></iframe>' +
      '<div class="mt-5 flex justify-between items-center gap-3 flex-wrap">' +
      '<button type="button" id="back-2" class="px-6 py-2 rounded-2xl border border-white/20">Back</button>' +
      '<button type="button" id="submitted" class="btn px-6 py-2 rounded-2xl">I\'ve submitted my request</button></div>';
    $("back-2").onclick = function () {
      goStep(2);
    };
    $("submitted").onclick = function () {
      closeQuote();
      openBot({
        thanks: true,
        services: labels
      });
    };
  }

  function escapeAttr(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;");
  }

  function ensureBot() {
    if ($("osb-root")) return;
    const root = document.createElement("div");
    root.id = "osb-root";
    root.innerHTML =
      '<button type="button" id="osb-fab" aria-label="Chat with OneStopBot" ' +
      'style="position:fixed;right:20px;bottom:20px;z-index:90;width:56px;height:56px;border-radius:999px;background:#00f5ff;color:#050505;font-weight:700;border:0;box-shadow:0 8px 30px rgba(0,245,255,.25)">OS</button>' +
      '<div id="osb-panel" class="hidden" style="position:fixed;right:20px;bottom:88px;z-index:90;width:min(380px,calc(100vw - 24px));height:520px;background:#0a0a0a;border:1px solid #222;border-radius:20px;display:flex;flex-direction:column;overflow:hidden">' +
      '<div style="padding:14px 16px;border-bottom:1px solid #222;display:flex;justify-content:space-between;align-items:center">' +
      '<div><div style="font-weight:600">OneStopBot</div><div style="font-size:11px;color:#71717a">Endless Auto · Fremont</div></div>' +
      '<button type="button" id="osb-close" style="background:none;border:0;color:#fff;font-size:22px">&times;</button></div>' +
      '<div id="osb-log" style="flex:1;overflow:auto;padding:16px;display:flex;flex-direction:column;gap:12px"></div>' +
      '<div id="osb-replies" style="padding:0 12px 8px;display:flex;flex-wrap:wrap;gap:6px"></div>' +
      '<form id="osb-form" style="display:flex;gap:8px;padding:12px;border-top:1px solid #222">' +
      '<input id="osb-input" maxlength="500" placeholder="Ask about PPF, tint, wraps…" style="flex:1;background:#111;border:1px solid #333;border-radius:12px;padding:10px 12px;color:#fff">' +
      '<button class="btn" style="padding:10px 14px;border-radius:12px;border:0">Send</button></form></div>';
    document.body.appendChild(root);
    $("osb-fab").onclick = function () {
      openBot({ thanks: false });
    };
    $("osb-close").onclick = function () {
      $("osb-panel").classList.add("hidden");
      $("osb-panel").style.display = "none";
    };
    $("osb-form").onsubmit = function (e) {
      e.preventDefault();
      const input = $("osb-input");
      const text = (input.value || "").trim();
      if (!text) return;
      input.value = "";
      sendUser(text);
    };
  }

  function openBot(opts) {
    ensureBot();
    const panel = $("osb-panel");
    panel.classList.remove("hidden");
    panel.style.display = "flex";
    if (opts && opts.thanks) {
      const svc = (opts.services || []).join(", ");
      pushBot(
        "Thank you for your submission — we'll get back to you as soon as possible. Please don't hesitate to give us a call at (510) 709-7097." +
          (svc ? " Noted interest: " + svc + "." : ""),
        starterButtons(opts.services || [])
      );
    } else if (!state.messages.length) {
      pushBot("How can Endless help — PPF, ceramic, tint, or a wrap?", [
        "View services",
        "Get a quote",
        "Ask a question"
      ]);
    }
  }

  function starterButtons(services) {
    const s = (services || []).join(" ").toLowerCase();
    if (s.indexOf("wrap") >= 0) return ["View wrap catalog", "Wrap pricing", "Ask something else"];
    if (s.indexOf("ppf") >= 0) return ["View PPF packages", "PPF vs ceramic", "Ask something else"];
    if (s.indexOf("tint") >= 0) return ["Compare tint shades", "California tint rules", "Ask something else"];
    return ["View services", "Get a quote", "Hours and address"];
  }

  function pushUser(text) {
    state.messages.push({ role: "user", content: text });
    addBubble("you", text);
  }

  function pushBot(text, buttons) {
    state.messages.push({ role: "assistant", content: text });
    addBubble("bot", text);
    renderReplies(buttons || ["View services", "Get a quote", "Call the shop"]);
  }

  function addBubble(who, text) {
    const log = $("osb-log");
    if (!log) return;
    const d = document.createElement("div");
    d.style.maxWidth = "90%";
    d.style.alignSelf = who === "you" ? "flex-end" : "flex-start";
    d.style.background = who === "you" ? "#00f5ff" : "#161616";
    d.style.color = who === "you" ? "#050505" : "#e4e4e7";
    d.style.padding = "10px 12px";
    d.style.borderRadius = "14px";
    d.style.fontSize = "14px";
    d.style.whiteSpace = "pre-wrap";
    d.textContent = text;
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
  }

  function renderReplies(buttons) {
    const row = $("osb-replies");
    if (!row) return;
    row.innerHTML = "";
    (buttons || []).forEach(function (label) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = label;
      b.style.cssText =
        "font-size:12px;border:1px solid #333;background:#111;color:#fff;border-radius:999px;padding:6px 10px";
      b.onclick = function () {
        sendUser(label);
      };
      row.appendChild(b);
    });
  }

  function sendUser(text) {
    if (state.turns >= MAX_TURNS) {
      pushUser(text);
      pushBot("Let’s wrap here so we don’t burn tokens. Call (510) 709-7097 or tap Consult for a written proposal.", [
        "Get a quote",
        "Call the shop"
      ]);
      return;
    }
    state.turns += 1;
    pushUser(text);
    const local = localRoute(text);
    if (local.navigate) navigateTo(local.navigate);
    if (local.action === "quote") openQuote();
    if (local.immediate) {
      pushBot(local.immediate, local.buttons);
      return;
    }
    callApi(text, local);
  }

  function localRoute(text) {
    const t = text.toLowerCase();
    if (/quote|consult|book|get a quote/.test(t)) {
      return {
        immediate: "Consult is open — pick services, leave contact, then finish the shop form.",
        buttons: ["View services", "Hours and address"],
        action: "quote"
      };
    }
    if (/call|phone|510/.test(t)) {
      return {
        immediate: "Shop line is (510) 709-7097. 41907 Albrae St, Fremont. By appointment.",
        buttons: ["Get a quote", "Hours and address"]
      };
    }
    if (/hour|address|where|albrae/.test(t)) {
      return {
        immediate: "41907 Albrae St, Fremont, CA 94538. By appointment only. (510) 709-7097.",
        buttons: ["Get a quote", "View services"]
      };
    }
    if (/wrap/.test(t)) return { navigate: "wraps.html", buttons: ["View wrap catalog", "Get a quote"] };
    if (/tint|shade|vlt/.test(t)) return { navigate: "tint.html", buttons: ["Compare tint shades", "Get a quote"] };
    if (/ceramic|coat/.test(t)) return { navigate: "ceramic.html", buttons: ["Ceramic vs PPF", "Get a quote"] };
    if (/ppf|paint protection|film/.test(t)) return { navigate: "ppf.html", buttons: ["View PPF packages", "Get a quote"] };
    if (/service/.test(t)) return { navigate: "index.html#services", buttons: ["Get a quote", "Ask a question"] };
    return {};
  }

  function navigateTo(page) {
    if (!page) return;
    if (page.indexOf(".html") === -1 && page.charAt(0) === "#") {
      const el = document.querySelector(page);
      if (el) el.scrollIntoView({ behavior: "smooth" });
      return;
    }
    if (page.split("#")[0] === location.pathname.split("/").pop() || page.indexOf(location.pathname.split("/").pop()) === 0) {
      const hash = page.split("#")[1];
      if (hash) {
        const el = document.getElementById(hash);
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }
      return;
    }
    window.location.href = page;
  }

  async function callApi(text, local) {
    const thinking = document.createElement("div");
    thinking.id = "osb-wait";
    thinking.style.cssText = "color:#71717a;font-size:12px";
    thinking.textContent = "OneStopBot is typing…";
    $("osb-log").appendChild(thinking);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: state.messages.slice(-12),
          services: selectedLabels(),
          page: location.pathname
        })
      });
      if (!res.ok) throw new Error("chat " + res.status);
      const data = await res.json().catch(function () {
        return {};
      });
      if (!data.reply && !data.navigate && !data.action) throw new Error("empty chat");
      if ($("osb-wait")) $("osb-wait").remove();
      if (data.navigate) navigateTo(data.navigate);
      if (data.action === "quote") openQuote();
      pushBot(
        data.reply || fallbackReply(text),
        data.buttons || local.buttons || ["View services", "Get a quote"]
      );
    } catch (err) {
      if ($("osb-wait")) $("osb-wait").remove();
      if (local.action === "quote") openQuote();
      pushBot(fallbackReply(text), local.buttons || ["Get a quote", "Call the shop"]);
    }
  }

  function fallbackReply(text) {
    const t = text.toLowerCase();
    if (/price|cost|how much/.test(t))
      return "Jobs are quoted after consult — not an open hourly menu on the site. Tap Consult and we write coverage + investment before work starts.";
    if (/legal|california/.test(t))
      return "California limits how dark front side glass and the windshield can be. Rear glass has more room. We scope a legal layout in the shop.";
    return "Endless is a Fremont film shop: PPF, ceramic, tint, and wraps at 41907 Albrae St. Tell me the car and the goal, or tap Consult.";
  }

  function seedFromPage() {
    const p = (location.pathname || "") + location.search;
    if (/wraps/.test(p)) state.selected.push("wraps");
    else if (/tint/.test(p)) state.selected.push("tint");
    else if (/ceramic/.test(p)) state.selected.push("ceramic");
    else if (/ppf/.test(p)) {
      state.selected.push(/pkg=full/.test(p) ? "ppf-full" : "ppf-front");
    }
  }

  function boot() {
    seedFromPage();
    ensureConsultShell();
    ensureBot();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
