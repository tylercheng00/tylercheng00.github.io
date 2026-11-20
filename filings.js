/* Filings & financials academy — password gate + course nav + TradingView case charts. */
(function () {
  "use strict";

  // Separate password from Mark Six quant / Personal chart.
  // Unlock is memory-only: every refresh / reload must re-enter the password.
  var MEMBER_PASS = "TC-Filings-2026";
  var PRICE = "HK$398";
  var WA = "https://wa.me/85298229572";
  var unlocked = false;
  var TV_BASE = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";

  try {
    sessionStorage.removeItem("tc_member_session");
    sessionStorage.removeItem("tc_filings_session");
  } catch (e) {}

  var lang = function () {
    return document.documentElement.getAttribute("lang") === "zh-Hant" ? "zh" : "en";
  };
  var t = function (en, zh) {
    return lang() === "zh" ? zh : en;
  };

  function openNow() {
    return unlocked;
  }
  function setOpen(v) {
    unlocked = !!v;
  }

  function payLinks() {
    var msg = encodeURIComponent(
      t(
        "Hi Tyler — I paid for Member services (Filings & financials academy). Please send the password.",
        "你好 Tyler——我已為會員服務（財報公告學堂）付款，請發送密碼。"
      )
    );
    return (
      '<a class="btn btn-gold" href="' +
      WA +
      "?text=" +
      msg +
      '" target="_blank" rel="noopener">' +
      t("Pay via WhatsApp", "WhatsApp 付款／領密碼") +
      "</a>"
    );
  }

  function renderGate() {
    var price = document.getElementById("fa-price");
    var cta = document.getElementById("fa-pay-cta");
    if (price)
      price.textContent = t(
        "Access · " + PRICE + " · password each visit / refresh",
        "通行 · " + PRICE + " · 每次進入／重新整理需密碼"
      );
    if (cta) cta.innerHTML = payLinks();
  }

  function showDesk(on) {
    var gate = document.getElementById("fa-gate");
    var locked = document.getElementById("fa-locked");
    var desk = document.getElementById("fa-desk");
    if (gate) gate.hidden = !!on;
    if (locked) locked.hidden = !!on;
    if (desk) desk.hidden = !on;
  }

  function showModule(id) {
    var mods = document.querySelectorAll(".fa-mod");
    var btns = document.querySelectorAll(".fa-toc-btn");
    mods.forEach(function (m) {
      m.hidden = m.getAttribute("data-mod") !== id;
    });
    btns.forEach(function (b) {
      b.classList.toggle("is-active", b.getAttribute("data-mod") === id);
    });
    mountVisibleCharts();
    var active = document.getElementById(id);
    if (active) active.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function locale() {
    var root = document.documentElement;
    if (root.getAttribute("data-lang") === "zh") {
      return root.getAttribute("data-script") === "sc" ? "zh_CN" : "zh_TW";
    }
    return "en";
  }

  function mountChart(host) {
    if (!host || host.getAttribute("data-ready") === "1") return;
    var symbol = host.getAttribute("data-tv-symbol") || "NASDAQ:NVDA";
    var loc = locale();
    var key = symbol + "|" + loc;
    if (host.getAttribute("data-key") === key) return;
    host.setAttribute("data-key", key);
    host.setAttribute("data-ready", "1");
    host.textContent = "";
    var wrap = document.createElement("div");
    wrap.className = "tradingview-widget-container";
    wrap.style.height = "480px";
    var inner = document.createElement("div");
    inner.className = "tradingview-widget-container__widget";
    inner.style.height = "100%";
    wrap.appendChild(inner);
    var cr = document.createElement("div");
    cr.className = "tradingview-widget-copyright";
    cr.innerHTML =
      '<a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank">Charts by TradingView</a>';
    wrap.appendChild(cr);
    var s = document.createElement("script");
    s.type = "text/javascript";
    s.src = TV_BASE;
    s.async = true;
    s.text = JSON.stringify({
      autosize: true,
      symbol: symbol,
      interval: "D",
      timezone: "exchange",
      theme: "light",
      style: "1",
      locale: loc,
      allow_symbol_change: true,
      calendar: false,
      support_host: "https://www.tradingview.com",
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      studies: ["STD;SMA"],
    });
    wrap.appendChild(s);
    host.appendChild(wrap);
  }

  function mountVisibleCharts() {
    document.querySelectorAll(".fa-mod:not([hidden]) .fa-tv").forEach(mountChart);
  }

  function wireToc() {
    document.querySelectorAll(".fa-toc-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        showModule(btn.getAttribute("data-mod"));
      });
    });
  }

  function wireGate() {
    renderGate();
    var form = document.getElementById("fa-pass-form");
    var err = document.getElementById("fa-pass-err");
    var logout = document.getElementById("fa-logout");
    var meta = document.getElementById("fa-desk-meta");
    if (form) {
      form.addEventListener("submit", function (ev) {
        ev.preventDefault();
        var input = document.getElementById("fa-pass");
        var val = input ? String(input.value || "").trim() : "";
        if (val.toLowerCase() === MEMBER_PASS.toLowerCase()) {
          setOpen(true);
          if (err) {
            err.hidden = true;
            err.textContent = "";
          }
          showDesk(true);
          showModule("m0");
          if (meta)
            meta.textContent = t(
              "Unlocked this page load only · refresh locks again",
              "僅本頁載入期間解鎖 · 重新整理後會再上鎖"
            );
        } else {
          if (err) {
            err.hidden = false;
            err.textContent = t(
              "Wrong password. Pay via WhatsApp to receive the Filings academy code.",
              "密碼不正確。請經 WhatsApp 付款後領取財報學堂密碼。"
            );
          }
        }
      });
    }
    if (logout) {
      logout.addEventListener("click", function () {
        setOpen(false);
        showDesk(false);
        document.querySelectorAll(".fa-tv").forEach(function (el) {
          el.textContent = "";
          el.removeAttribute("data-ready");
          el.removeAttribute("data-key");
        });
      });
    }
    // Always start locked after load/refresh — never restore from storage.
    showDesk(false);
  }

  function boot() {
    wireGate();
    wireToc();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
