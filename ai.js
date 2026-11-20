/* AI desk — online (OpenAI-compatible) or offline (WebLLM in browser). */
(function () {
  "use strict";

  var STORE = "tc_ai_desk_v1";
  var WEBLLM = "https://esm.sh/@mlc-ai/web-llm@0.2.79";
  var PROVIDERS = {
    openai: { base: "https://api.openai.com/v1", model: "gpt-4o-mini" },
    openrouter: { base: "https://openrouter.ai/api/v1", model: "openai/gpt-4o-mini" },
    groq: { base: "https://api.groq.com/openai/v1", model: "llama-3.1-8b-instant" },
    custom: { base: "", model: "gpt-4o-mini" },
  };

  var mode = "online";
  var history = [];
  var busy = false;
  var offlineEngine = null;
  var offlineModelId = "";
  var abortCtrl = null;

  function lang() {
    return document.documentElement.getAttribute("lang") === "zh-Hant" ||
      document.documentElement.getAttribute("data-lang") === "zh"
      ? "zh"
      : "en";
  }
  function t(en, zh) {
    return lang() === "zh" ? zh : en;
  }

  function systemPrompt() {
    return (
      "You are the AI desk on Tyler Tik Man Cheng's personal site (tylercheng00.github.io). " +
      "Answer clearly in the user's language (English or Traditional Chinese). " +
      "You can discuss markets, listing readiness, startups, and general knowledge. " +
      "You are not a licensed advisor; remind users when decisions need professionals. " +
      "Refuse requests that seek help with crime, fraud, money laundering, theft of client funds, " +
      "or converting other people's / institutional money into personal assets. " +
      "Do not claim to be Cursor, OpenAI, or Tyler himself."
    );
  }

  function loadCfg() {
    try {
      return JSON.parse(localStorage.getItem(STORE) || "{}") || {};
    } catch (e) {
      return {};
    }
  }
  function saveCfg(patch) {
    var c = Object.assign(loadCfg(), patch || {});
    try {
      localStorage.setItem(STORE, JSON.stringify(c));
    } catch (e) {}
    return c;
  }

  function setStatus(msg) {
    var el = document.getElementById("ai-status");
    if (el) el.textContent = msg || "";
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function formatText(s) {
    return esc(s).replace(/\n/g, "<br>");
  }

  function appendMsg(role, text, streamId) {
    var board = document.getElementById("ai-board");
    if (!board) return null;
    var wrap = document.createElement("div");
    wrap.className = "ai-msg ai-msg-" + role;
    if (streamId) wrap.setAttribute("data-stream", streamId);
    wrap.innerHTML =
      '<span class="ai-role">' +
      esc(role) +
      '</span><div class="ai-bubble">' +
      formatText(text) +
      "</div>";
    board.appendChild(wrap);
    board.scrollTop = board.scrollHeight;
    return wrap;
  }

  function updateStream(streamId, text) {
    var el = document.querySelector('[data-stream="' + streamId + '"] .ai-bubble');
    if (el) {
      el.innerHTML = formatText(text);
      var board = document.getElementById("ai-board");
      if (board) board.scrollTop = board.scrollHeight;
    }
  }

  function welcome() {
    var el = document.getElementById("ai-welcome");
    if (el) {
      el.innerHTML = formatText(
        t(
          "Ready. Pick Online (your API key) or Offline (browser model), then ask.",
          "就緒。選擇「線上」（你的 API 金鑰）或「離線」（瀏覽器模型），然後提問。"
        )
      );
    }
    var foot = document.getElementById("ai-footnote");
    if (foot) {
      foot.textContent = t(
        "Keys never leave this device to Tyler’s servers. Replies can be wrong. Education only.",
        "金鑰不會送到 Tyler 的伺服器。回覆可能出錯。僅供教育參考。"
      );
    }
    var input = document.getElementById("ai-input");
    if (input) {
      input.placeholder = t(
        "Ask about markets, listings, this site…",
        "可問行情、上市、本站……"
      );
    }
  }

  function applyProviderDefaults() {
    var sel = document.getElementById("ai-provider");
    var p = PROVIDERS[sel && sel.value] || PROVIDERS.openai;
    var baseWrap = document.getElementById("ai-base-wrap");
    var base = document.getElementById("ai-base");
    var model = document.getElementById("ai-model");
    if (baseWrap) baseWrap.hidden = sel.value !== "custom";
    if (base && sel.value !== "custom") base.value = p.base;
    if (model && (!model.value || Object.values(PROVIDERS).some(function (x) { return x.model === model.dataset.lastDefault; }))) {
      model.value = p.model;
      model.dataset.lastDefault = p.model;
    } else if (model && !model.value) {
      model.value = p.model;
    }
  }

  function setMode(next) {
    mode = next === "offline" ? "offline" : "online";
    document.querySelectorAll(".ai-mode-btn").forEach(function (b) {
      b.classList.toggle("is-on", b.getAttribute("data-mode") === mode);
    });
    var on = document.getElementById("ai-settings-online");
    var off = document.getElementById("ai-settings-offline");
    if (on) on.hidden = mode !== "online";
    if (off) off.hidden = mode !== "offline";
    saveCfg({ mode: mode });
    setStatus(
      mode === "online"
        ? t("Online mode — needs your API key", "線上模式——需要你的 API 金鑰")
        : offlineEngine
          ? t("Offline model ready", "離線模型已就緒")
          : t("Offline mode — load a model first", "離線模式——請先載入模型")
    );
  }

  function restore() {
    var c = loadCfg();
    if (c.mode) setMode(c.mode);
    var sel = document.getElementById("ai-provider");
    if (sel && c.provider) sel.value = c.provider;
    applyProviderDefaults();
    var base = document.getElementById("ai-base");
    var model = document.getElementById("ai-model");
    var key = document.getElementById("ai-key");
    var offM = document.getElementById("ai-offline-model");
    if (base && c.base) base.value = c.base;
    if (model && c.model) model.value = c.model;
    if (key && c.key) key.value = c.key;
    if (offM && c.offlineModel) offM.value = c.offlineModel;
  }

  function persistFields() {
    saveCfg({
      mode: mode,
      provider: (document.getElementById("ai-provider") || {}).value,
      base: (document.getElementById("ai-base") || {}).value,
      model: (document.getElementById("ai-model") || {}).value,
      key: (document.getElementById("ai-key") || {}).value,
      offlineModel: (document.getElementById("ai-offline-model") || {}).value,
    });
  }

  function messagesForApi() {
    return [{ role: "system", content: systemPrompt() }].concat(history);
  }

  async function chatOnline(userText) {
    persistFields();
    var provider = (document.getElementById("ai-provider") || {}).value || "openai";
    var preset = PROVIDERS[provider] || PROVIDERS.openai;
    var base = ((document.getElementById("ai-base") || {}).value || preset.base || "").replace(/\/$/, "");
    var model = (document.getElementById("ai-model") || {}).value || preset.model;
    var key = ((document.getElementById("ai-key") || {}).value || "").trim();
    if (!base) throw new Error(t("Set a base URL.", "請設定 Base URL。"));
    if (!key) throw new Error(t("Paste your API key first.", "請先貼上 API 金鑰。"));

    abortCtrl = new AbortController();
    var res = await fetch(base + "/chat/completions", {
      method: "POST",
      signal: abortCtrl.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + key,
      },
      body: JSON.stringify({
        model: model,
        stream: true,
        messages: messagesForApi().concat([{ role: "user", content: userText }]),
      }),
    });
    if (!res.ok) {
      var errText = await res.text().catch(function () {
        return "";
      });
      throw new Error(
        t("API error ", "API 錯誤 ") + res.status + (errText ? ": " + errText.slice(0, 180) : "")
      );
    }

    var streamId = "s" + Date.now();
    appendMsg("assistant", "…", streamId);
    var full = "";
    var reader = res.body.getReader();
    var decoder = new TextDecoder();
    var buf = "";
    while (true) {
      var chunk = await reader.read();
      if (chunk.done) break;
      buf += decoder.decode(chunk.value, { stream: true });
      var parts = buf.split("\n");
      buf = parts.pop() || "";
      for (var i = 0; i < parts.length; i++) {
        var line = parts[i].trim();
        if (!line || line.indexOf("data:") !== 0) continue;
        var data = line.slice(5).trim();
        if (data === "[DONE]") continue;
        try {
          var json = JSON.parse(data);
          var delta = (((json.choices || [])[0] || {}).delta || {}).content || "";
          if (delta) {
            full += delta;
            updateStream(streamId, full);
          }
        } catch (e) {}
      }
    }
    if (!full) {
      full = t("(empty reply)", "（空回覆）");
      updateStream(streamId, full);
    }
    history.push({ role: "user", content: userText });
    history.push({ role: "assistant", content: full });
    if (history.length > 24) history = history.slice(-24);
  }

  async function ensureOffline() {
    var id = (document.getElementById("ai-offline-model") || {}).value;
    if (offlineEngine && offlineModelId === id) return offlineEngine;
    var progress = document.getElementById("ai-progress");
    var bar = document.getElementById("ai-progress-bar");
    var ptext = document.getElementById("ai-progress-text");
    if (progress) progress.hidden = false;
    setStatus(t("Loading WebLLM…", "正在載入 WebLLM…"));
    var mod = await import(/* webpackIgnore: true */ WEBLLM);
    offlineEngine = await mod.CreateMLCEngine(id, {
      initProgressCallback: function (r) {
        var pct = Math.round((r.progress || 0) * 100);
        if (bar) bar.style.width = pct + "%";
        if (ptext) ptext.textContent = (r.text || "") + " " + pct + "%";
        setStatus(t("Downloading model… ", "下載模型中… ") + pct + "%");
      },
    });
    offlineModelId = id;
    if (progress) progress.hidden = true;
    setStatus(t("Offline model ready", "離線模型已就緒"));
    persistFields();
    return offlineEngine;
  }

  async function chatOffline(userText) {
    var engine = await ensureOffline();
    var streamId = "s" + Date.now();
    appendMsg("assistant", "…", streamId);
    var full = "";
    var chunks = await engine.chat.completions.create({
      messages: messagesForApi().concat([{ role: "user", content: userText }]),
      stream: true,
      temperature: 0.7,
    });
    for await (var chunk of chunks) {
      var delta = (((chunk.choices || [])[0] || {}).delta || {}).content || "";
      if (delta) {
        full += delta;
        updateStream(streamId, full);
      }
    }
    if (!full) {
      full = t("(empty reply)", "（空回覆）");
      updateStream(streamId, full);
    }
    history.push({ role: "user", content: userText });
    history.push({ role: "assistant", content: full });
    if (history.length > 24) history = history.slice(-24);
  }

  async function onSubmit(ev) {
    ev.preventDefault();
    if (busy) return;
    var input = document.getElementById("ai-input");
    var text = input ? String(input.value || "").trim() : "";
    if (!text) return;
    input.value = "";
    appendMsg("user", text);
    busy = true;
    var send = document.getElementById("ai-send");
    if (send) send.disabled = true;
    setStatus(t("Thinking…", "思考中…"));
    try {
      if (mode === "offline") await chatOffline(text);
      else await chatOnline(text);
      setStatus(
        mode === "offline"
          ? t("Offline · ready", "離線 · 就緒")
          : t("Online · ready", "線上 · 就緒")
      );
    } catch (err) {
      appendMsg(
        "system",
        t("Error: ", "錯誤：") + (err && err.message ? err.message : String(err))
      );
      setStatus(t("Error — try again", "出錯——請再試"));
    } finally {
      busy = false;
      if (send) send.disabled = false;
      abortCtrl = null;
    }
  }

  function wire() {
    welcome();
    restore();
    document.querySelectorAll(".ai-mode-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        setMode(btn.getAttribute("data-mode"));
      });
    });
    var provider = document.getElementById("ai-provider");
    if (provider) {
      provider.addEventListener("change", function () {
        applyProviderDefaults();
        persistFields();
      });
    }
    ["ai-base", "ai-model", "ai-key", "ai-offline-model"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener("change", persistFields);
    });
    var loadBtn = document.getElementById("ai-load-offline");
    if (loadBtn) {
      loadBtn.addEventListener("click", function () {
        if (busy) return;
        busy = true;
        ensureOffline()
          .catch(function (err) {
            appendMsg(
              "system",
              t("Could not load offline model: ", "無法載入離線模型：") +
                (err && err.message ? err.message : String(err))
            );
            setStatus(t("Offline load failed", "離線載入失敗"));
          })
          .finally(function () {
            busy = false;
          });
      });
    }
    var form = document.getElementById("ai-form");
    if (form) form.addEventListener("submit", onSubmit);
    var clear = document.getElementById("ai-clear");
    if (clear) {
      clear.addEventListener("click", function () {
        history = [];
        var board = document.getElementById("ai-board");
        if (board) {
          board.innerHTML =
            '<div class="ai-msg ai-msg-sys"><span class="ai-role">system</span><div class="ai-bubble" id="ai-welcome"></div></div>';
          welcome();
        }
      });
    }
    var input = document.getElementById("ai-input");
    if (input) {
      input.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter" && !ev.shiftKey) {
          ev.preventDefault();
          if (form) form.requestSubmit();
        }
      });
    }
    setMode(mode);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire);
  else wire();
})();
