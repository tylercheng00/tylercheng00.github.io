/* AI desk — one-tap chat via Puter.js (no API key / no mode switch). */
(function () {
  "use strict";

  var STORE = "tc_ai_desk_v3";
  var MODEL = "gpt-4o-mini";
  var history = [];
  var busy = false;
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

  function knowledge() {
    return window.TC_AI_KNOWLEDGE || null;
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

  function coreBioBlock() {
    var k = knowledge();
    if (!k) return "";
    var p = k.person || {};
    var lines = [
      "Name: " + (p.name_zh || "") + " / " + (p.name_en || ""),
      "EN: " + (p.summary_en || ""),
      "ZH: " + (p.summary_zh || ""),
      "Education: " + ((k.education || []).join("; ")),
      "Patents: " + ((k.patents && k.patents.summary_en) || "") +
        " Numbers: " + (((k.patents && k.patents.hk_numbers) || []).join(", ")),
      "Recognition: " + ((k.recognition || []).join(" | ")),
      "Public contact: email " + ((k.contact && k.contact.email) || "") +
        "; work " + ((k.contact && k.contact.work_email) || "") +
        "; site " + ((k.contact && k.contact.site) || "") +
        "; LinkedIn " + ((k.contact && k.contact.linkedin) || "") +
        "; WhatsApp " + ((k.contact && k.contact.whatsapp) || "") +
        "; WeChat/X/Xiaohongshu handle " + ((k.contact && k.contact.wechat_x_xhs) || ""),
      "Sites: " +
        ((k.sites || [])
          .map(function (s) {
            return s.name + " (" + s.url + ") — " + s.note;
          })
          .join(" · ")),
      "Page map: " + (k.site_map_hint || ""),
    ];
    (k.experience || []).forEach(function (x) {
      lines.push(
        "Role: " +
          x.role_en +
          " / " +
          x.role_zh +
          " @ " +
          x.org_en +
          " [" +
          (x.when || "") +
          "] — " +
          x.detail_en
      );
    });
    return lines.join("\n");
  }

  function retrieveProjectContext(userText) {
    var k = knowledge();
    if (!k || !k.projects) return "";
    var q = String(userText || "").toLowerCase();
    var scored = [];
    k.projects.forEach(function (proj) {
      var score = 0;
      (proj.keys || []).forEach(function (key) {
        if (q.indexOf(String(key).toLowerCase()) >= 0) score += 2;
      });
      var title = String(proj.title || "").toLowerCase();
      if (title && q.indexOf(title) >= 0) score += 3;
      if (score > 0) scored.push({ score: score, proj: proj });
    });
    var index =
      "PROJECT INDEX: " +
      k.projects
        .map(function (p) {
          return p.title;
        })
        .join("; ");
    if (!scored.length) {
      if (
        /tyler|cheng|鄭|迪珉|你|本人|about|簡介|經歷|project|專案|項目|venture|創業|patent|專利|company|公司|btrdcc|nanotech|nusantara|努山塔拉|印尼|indonesia/.test(
          q
        )
      ) {
        scored = k.projects.slice(0, 5).map(function (proj, i) {
          return { score: 5 - i, proj: proj };
        });
      } else {
        return index;
      }
    }
    scored.sort(function (a, b) {
      return b.score - a.score;
    });
    var picked = scored.slice(0, 4).map(function (s) {
      var p = s.proj;
      return (
        "## " +
        p.title +
        "\n" +
        p.detail_en +
        "\n" +
        p.detail_zh +
        "\nLinks: " +
        (p.links || []).join(" ")
      );
    });
    return index + "\n\nRELEVANT PROJECT DETAILS:\n" + picked.join("\n\n");
  }

  function policyBlock() {
    var k = knowledge();
    var privacy = (k && k.privacy_rules) || [];
    var topics = (k && k.allowed_topics) || [];
    return (
      "ALLOWED TOPICS:\n- " +
      topics.join("\n- ") +
      "\n\nPRIVACY / BOUNDARY RULES (must follow):\n- " +
      privacy.join("\n- ")
    );
  }

  function systemPrompt(userText) {
    return (
      "You are the AI desk on 鄭迪珉 Tyler Tik Man Cheng's personal site (tylercheng00.github.io).\n" +
      "Answer the user's actual question first. Do not digress into unrelated bio dumps.\n" +
      "When the question is about Tyler, his companies, patents, or projects: use ONLY the AUTHORITATIVE FACTS below. If a detail is missing, say you do not have that public fact and point to contact.html or WhatsApp — never invent it.\n" +
      "When the question is general (international news, markets/finance education, Indonesia/Nusantara/ASEAN, startups, listing concepts): answer helpfully from general knowledge, stay high-level, and note uncertainty / that it is not professional advice.\n" +
      "Reply in the user's language (English or Traditional Chinese).\n" +
      "Keep answers focused, concrete, and proportional to the question. Prefer short paragraphs over long essays unless asked for depth.\n" +
      "You are not Cursor Inc., OpenAI, or Tyler himself.\n" +
      "Refuse crime, fraud, money laundering, hacking, or requests for member passwords / paywall bypass.\n\n" +
      policyBlock() +
      "\n\n=== AUTHORITATIVE BIO (public facts only) ===\n" +
      coreBioBlock() +
      "\n\n=== RETRIEVED FOR THIS TURN ===\n" +
      retrieveProjectContext(userText || "")
    );
  }

  function welcome() {
    var el = document.getElementById("ai-welcome");
    if (el) {
      el.innerHTML = formatText(
        t(
          "Ready. Type a question below and press Send. First use may ask you to sign in once with Puter (free allowance) — no API key to paste. Ask about Tyler’s public work, projects, markets, news, or Indonesia topics.",
          "就緒。在下方輸入問題後按送出即可。首次使用或會請你用 Puter 登入一次（有免費額度）——不用貼 API 金鑰。可問 Tyler 公開工作、專案、財經、時事或印尼相關。"
        )
      );
    }
    var foot = document.getElementById("ai-footnote");
    if (foot) {
      foot.textContent = t(
        "Education only — not investment, legal or medical advice. Private / sensitive personal details are not answered here.",
        "僅供教育參考——非投資、法律或醫療意見。私隱或敏感個人細節不會在此回答。"
      );
    }
    var input = document.getElementById("ai-input");
    if (input) {
      input.placeholder = t(
        "Ask about Tyler, projects, markets, news, Indonesia…",
        "可問 Tyler、專案、財經、時事、印尼……"
      );
    }
  }

  function waitForPuter(timeoutMs) {
    return new Promise(function (resolve, reject) {
      if (window.puter && window.puter.ai && typeof window.puter.ai.chat === "function") {
        resolve(window.puter);
        return;
      }
      var start = Date.now();
      var timer = setInterval(function () {
        if (window.puter && window.puter.ai && typeof window.puter.ai.chat === "function") {
          clearInterval(timer);
          resolve(window.puter);
        } else if (Date.now() - start > (timeoutMs || 8000)) {
          clearInterval(timer);
          reject(new Error(t("Chat engine failed to load. Refresh and try again.", "對話引擎載入失敗，請重新整理再試。")));
        }
      }, 120);
    });
  }

  function extractChunkText(part) {
    if (!part) return "";
    if (typeof part === "string") return part;
    if (part.type === "error") {
      throw new Error(part.message || t("Chat error", "對話錯誤"));
    }
    if (part.type === "text" && part.text) return part.text;
    if (part.text) return part.text;
    var delta = part.delta || {};
    if (delta.content) return delta.content;
    if (delta.text) return delta.text;
    var choice = ((part.choices || [])[0] || {}).delta || {};
    if (choice.content) return choice.content;
    return "";
  }

  function localFallback(userText) {
    var k = knowledge();
    if (!k) return null;
    var q = String(userText || "").toLowerCase();
    var zh = lang() === "zh";
    var aboutSelf =
      /tyler|cheng|鄭|迪珉|你是誰|who are you|about you|簡介|經歷|patent|專利|nanotech|納米|btrdcc|fuway|富輝|project|專案|項目|nusantara|努山塔拉|contact|聯絡|email|whatsapp/.test(
        q
      );
    if (!aboutSelf) return null;

    var parts = [];
    if (/patent|專利/.test(q)) {
      parts.push(
        zh
          ? "公開資料：納米科研技術持有香港已授權專利 " +
            ((k.patents && k.patents.hk_numbers) || []).join("、") +
            "。" +
            ((k.patents && k.patents.summary_zh) || "")
          : "Public facts: Nanotech Innovation holds granted HK patents " +
            ((k.patents && k.patents.hk_numbers) || []).join(", ") +
            ". " +
            ((k.patents && k.patents.summary_en) || "")
      );
    } else if (/btrdcc|nusantara|努山塔拉|campus|園區/.test(q)) {
      var btr = (k.projects || []).find(function (p) {
        return p.id === "btrdcc";
      });
      var fut = (k.projects || []).find(function (p) {
        return p.id === "future-city";
      });
      if (btr) parts.push(zh ? btr.detail_zh : btr.detail_en);
      if (fut) parts.push(zh ? fut.detail_zh : fut.detail_en);
    } else if (/contact|聯絡|email|whatsapp|wechat/.test(q)) {
      var c = k.contact || {};
      parts.push(
        zh
          ? "公開聯絡：電郵 " +
            (c.email || "") +
            "；工作郵箱 " +
            (c.work_email || "") +
            "；WhatsApp " +
            (c.whatsapp || "") +
            "；詳見 contact.html。私隱／敏感事項請直接聯絡，不要在此聊天室追問。"
          : "Public contact: " +
            (c.email || "") +
            "; work " +
            (c.work_email || "") +
            "; WhatsApp " +
            (c.whatsapp || "") +
            ". See contact.html. For private matters, reach out directly — this desk will not dig into sensitive details."
      );
    } else {
      var p = k.person || {};
      parts.push(zh ? p.summary_zh || "" : p.summary_en || "");
      var roles = (k.experience || []).slice(0, 3).map(function (x) {
        return zh
          ? "· " + x.role_zh + " @" + x.org_zh + (x.when ? "（" + x.when + "）" : "")
          : "· " + x.role_en + " @" + x.org_en + (x.when ? " (" + x.when + ")" : "");
      });
      if (roles.length) parts.push(roles.join("\n"));
      parts.push(
        zh
          ? "更多公開專案見 projects.html／ventures.html。若要談合作請用 contact.html。"
          : "More public projects: projects.html / ventures.html. For collaboration, use contact.html."
      );
    }
    var out = parts.filter(Boolean).join("\n\n");
    return out || null;
  }

  async function chatPuter(userText) {
    var puter = await waitForPuter(10000);
    var messages = [{ role: "system", content: systemPrompt(userText) }]
      .concat(history)
      .concat([{ role: "user", content: userText }]);

    abortCtrl = new AbortController();
    var streamId = "s" + Date.now();
    appendMsg("assistant", "…", streamId);
    var full = "";

    var resp = await puter.ai.chat(messages, {
      model: MODEL,
      stream: true,
      temperature: 0.35,
      max_tokens: 900,
      signal: abortCtrl.signal,
    });

    if (resp && typeof resp[Symbol.asyncIterator] === "function") {
      for await (var part of resp) {
        var piece = extractChunkText(part);
        if (piece) {
          full += piece;
          updateStream(streamId, full);
        }
      }
    } else if (resp && resp.message) {
      full =
        typeof resp.message.content === "string"
          ? resp.message.content
          : Array.isArray(resp.message.content)
            ? resp.message.content
                .map(function (b) {
                  return b && b.text ? b.text : "";
                })
                .join("")
            : String(resp.message.content || resp);
      updateStream(streamId, full);
    } else if (typeof resp === "string") {
      full = resp;
      updateStream(streamId, full);
    }

    if (!full.trim()) {
      throw new Error(t("Empty reply — try again.", "回覆空白——請再試一次。"));
    }

    history.push({ role: "user", content: userText });
    history.push({ role: "assistant", content: full });
    if (history.length > 16) history = history.slice(-16);
    saveCfg({ lastOk: Date.now() });
  }

  async function onSubmit(ev) {
    if (ev && ev.preventDefault) ev.preventDefault();
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
      await chatPuter(text);
      setStatus(t("Ready", "就緒"));
    } catch (err) {
      var msg = err && err.message ? err.message : String(err);
      var fallback = localFallback(text);
      if (fallback) {
        appendMsg(
          "system",
          t(
            "Live chat unavailable right now — answering from the site’s public fact pack instead.",
            "即時對話暫時不可用——改以本站公開事實庫回答。"
          )
        );
        appendMsg("assistant", fallback);
        history.push({ role: "user", content: text });
        history.push({ role: "assistant", content: fallback });
        setStatus(t("Answered from site facts", "已用本站事實回答"));
      } else {
        appendMsg(
          "system",
          t("Error: ", "錯誤：") +
            msg +
            t(
              " If a Puter sign-in window appeared, complete it and send again.",
              " 若出現 Puter 登入視窗，完成後再送一次即可。"
            )
        );
        setStatus(t("Try again", "請再試"));
      }
    } finally {
      busy = false;
      if (send) send.disabled = false;
      abortCtrl = null;
    }
  }

  function wire() {
    welcome();
    setStatus(t("Ready — just ask", "就緒——直接提問"));
    document.querySelectorAll(".ai-chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        var input = document.getElementById("ai-input");
        if (!input || busy) return;
        input.value = lang() === "zh" ? chip.getAttribute("data-q-zh") : chip.getAttribute("data-q-en");
        onSubmit({ preventDefault: function () {} });
      });
    });
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
        setStatus(t("Ready — just ask", "就緒——直接提問"));
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
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire);
  else wire();
})();
