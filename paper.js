/* Paper trading desk — fake cash, live quotes via TradingView scanner. */
(function () {
  "use strict";

  var MEMBER_PASS = "TC-Paper-QMvS2TbtW6";
  var PRICE = "HK$198";
  var WA = "https://wa.me/85298229572";
  var START_CASH = 100000;
  var STORE_KEY = "tc_paper_portfolio_v1";
  var SCAN_US = "https://scanner.tradingview.com/america/scan";
  var SCAN_HK = "https://scanner.tradingview.com/hongkong/scan";
  var SCAN_GLOBAL = "https://scanner.tradingview.com/global/scan";
  var TV_BASE = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
  var COLUMNS = ["close", "change", "change_abs", "volume", "description", "currency", "exchange"];
  var WATCH = [
    { label: "AAPL", tv: "NASDAQ:AAPL" },
    { label: "NVDA", tv: "NASDAQ:NVDA" },
    { label: "MSFT", tv: "NASDAQ:MSFT" },
    { label: "TSLA", tv: "NASDAQ:TSLA" },
    { label: "META", tv: "NASDAQ:META" },
    { label: "BABA", tv: "NYSE:BABA" },
    { label: "0700", tv: "HKEX:700" },
    { label: "9988", tv: "HKEX:9988" },
    { label: "SPY", tv: "AMEX:SPY" },
    { label: "QQQ", tv: "NASDAQ:QQQ" },
  ];

  var unlocked = false;
  var state = null;
  var quotes = {};
  var pollTimer = null;
  var activeTv = "NASDAQ:AAPL";

  try {
    sessionStorage.removeItem("tc_member_session");
    sessionStorage.removeItem("tc_paper_session");
  } catch (e) {}

  var lang = function () {
    return document.documentElement.getAttribute("lang") === "zh-Hant" ? "zh" : "en";
  };
  var t = function (en, zh) {
    return lang() === "zh" ? zh : en;
  };

  function setOpen(v) {
    unlocked = !!v;
  }

  function payLinks() {
    var msg = encodeURIComponent(
      t(
        "Hi Tyler — I paid for Member services (Paper trading desk). Please send the password.",
        "你好 Tyler——我已為會員服務（模擬倉）付款，請發送密碼。"
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
    var price = document.getElementById("pp-price");
    var cta = document.getElementById("pp-pay-cta");
    if (price)
      price.textContent = t(
        "Access · " + PRICE + " · password each visit / refresh",
        "通行 · " + PRICE + " · 每次進入／重新整理需密碼"
      );
    if (cta) cta.innerHTML = payLinks();
  }

  function showDesk(on) {
    var gate = document.getElementById("pp-gate");
    var locked = document.getElementById("pp-locked");
    var desk = document.getElementById("pp-desk");
    if (gate) gate.hidden = !!on;
    if (locked) locked.hidden = !!on;
    if (desk) desk.hidden = !on;
  }

  function defaultState() {
    return { cash: START_CASH, positions: [], trades: [], updated: new Date().toISOString() };
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return defaultState();
      var s = JSON.parse(raw);
      if (!s || typeof s.cash !== "number" || !Array.isArray(s.positions)) return defaultState();
      return s;
    } catch (e) {
      return defaultState();
    }
  }

  function saveState() {
    if (!state) return;
    state.updated = new Date().toISOString();
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch (e) {}
  }

  function money(n, ccy) {
    var x = Number(n) || 0;
    var sign = x < 0 ? "-" : "";
    return sign + (ccy || "US$") + Math.abs(x).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function normInput(raw) {
    var s = String(raw || "").trim().toUpperCase().replace(/\s+/g, "");
    if (!s) return [];
    if (s.indexOf(":") >= 0) return [s];
    var m = s.match(/^(?:HKEX:)?(\d{1,5})(?:\.HK)?$/);
    if (m) return ["HKEX:" + String(Number(m[1]))];
    if (/\.HK$/.test(s)) return ["HKEX:" + String(Number(s.replace(/\.HK$/, "")))];
    var base = s.replace(/^\^/, "");
    return ["NASDAQ:" + base, "NYSE:" + base, "AMEX:" + base, "OTC:" + base];
  }

  function scanUrlFor(tv) {
    if (/^HKEX:/i.test(tv)) return SCAN_HK;
    if (/^(NASDAQ|NYSE|AMEX|OTC):/i.test(tv)) return SCAN_US;
    return SCAN_GLOBAL;
  }

  function fetchQuotes(tvList) {
    var groups = {};
    (tvList || []).forEach(function (tv) {
      if (!tv) return;
      var url = scanUrlFor(tv);
      if (!groups[url]) groups[url] = [];
      if (groups[url].indexOf(tv) < 0) groups[url].push(tv);
    });
    var jobs = Object.keys(groups).map(function (url) {
      var body = JSON.stringify({
        symbols: { tickers: groups[url], query: { types: [] } },
        columns: COLUMNS,
      });
      return fetch(url, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: body,
      })
        .then(function (r) {
          if (!r.ok) throw new Error("quote " + r.status);
          return r.json();
        })
        .then(function (doc) {
          (doc.data || []).forEach(function (row) {
            var d = row.d || [];
            quotes[row.s] = {
              tv: row.s,
              price: Number(d[0]),
              changePct: Number(d[1]),
              changeAbs: Number(d[2]),
              volume: Number(d[3]),
              name: d[4] || row.s,
              currency: d[5] || "USD",
              exchange: d[6] || "",
              asOf: Date.now(),
            };
          });
        })
        .catch(function () {
          return null;
        });
    });
    return Promise.all(jobs);
  }

  function resolveSymbol(input) {
    var candidates = normInput(input);
    return fetchQuotes(candidates).then(function () {
      var i, tv, q;
      for (i = 0; i < candidates.length; i++) {
        tv = candidates[i];
        q = quotes[tv];
        if (q && q.price > 0) return q;
      }
      return null;
    });
  }

  function positionMv() {
    var total = 0;
    (state.positions || []).forEach(function (p) {
      var q = quotes[p.tv];
      var px = q && q.price > 0 ? q.price : p.avgCost;
      total += px * p.shares;
    });
    return total;
  }

  function renderSummary() {
    var el = document.getElementById("pp-summary");
    if (!el || !state) return;
    var mv = positionMv();
    var equity = state.cash + mv;
    var pnl = equity - START_CASH;
    el.innerHTML =
      '<div class="pp-kpi"><span>' +
      t("Fake cash", "假想現金") +
      "</span><strong>" +
      money(state.cash) +
      "</strong></div>" +
      '<div class="pp-kpi"><span>' +
      t("Positions MTM", "持倉市值") +
      "</span><strong>" +
      money(mv) +
      "</strong></div>" +
      '<div class="pp-kpi"><span>' +
      t("Equity", "總資產") +
      "</span><strong>" +
      money(equity) +
      "</strong></div>" +
      '<div class="pp-kpi ' +
      (pnl >= 0 ? "up" : "down") +
      '"><span>' +
      t("P&L vs start", "相對起始盈虧") +
      "</span><strong>" +
      money(pnl) +
      "</strong></div>";
  }

  function renderPositions() {
    var el = document.getElementById("pp-positions");
    if (!el || !state) return;
    if (!state.positions.length) {
      el.innerHTML =
        "<p class='ms-note'>" +
        t("No positions yet — buy a symbol above.", "尚無持倉——請在上方買入。") +
        "</p>";
      return;
    }
    var rows = state.positions
      .map(function (p) {
        var q = quotes[p.tv];
        var px = q && q.price > 0 ? q.price : p.avgCost;
        var mv = px * p.shares;
        var pnl = (px - p.avgCost) * p.shares;
        var cls = pnl >= 0 ? "up" : "down";
        return (
          "<tr><td><strong>" +
          p.tv +
          "</strong><br><small>" +
          (q && q.name ? q.name : "") +
          "</small></td><td>" +
          p.shares +
          "</td><td>" +
          money(p.avgCost) +
          "</td><td>" +
          money(px) +
          "</td><td>" +
          money(mv) +
          '</td><td class="' +
          cls +
          '">' +
          money(pnl) +
          "</td></tr>"
        );
      })
      .join("");
    el.innerHTML =
      '<table class="pp-table"><thead><tr><th>' +
      t("Symbol", "代碼") +
      "</th><th>" +
      t("Shares", "股數") +
      "</th><th>" +
      t("Avg cost", "成本") +
      "</th><th>" +
      t("Last", "現價") +
      "</th><th>" +
      t("Market value", "市值") +
      "</th><th>" +
      t("Unrealised P&L", "浮動盈虧") +
      "</th></tr></thead><tbody>" +
      rows +
      "</tbody></table>";
  }

  function renderBlotter() {
    var el = document.getElementById("pp-blotter");
    if (!el || !state) return;
    var trades = (state.trades || []).slice().reverse().slice(0, 40);
    if (!trades.length) {
      el.innerHTML = "<p class='ms-note'>" + t("No simulated fills yet.", "尚無模擬成交。") + "</p>";
      return;
    }
    el.innerHTML =
      '<table class="pp-table"><thead><tr><th>' +
      t("Time", "時間") +
      "</th><th>" +
      t("Side", "方向") +
      "</th><th>" +
      t("Symbol", "代碼") +
      "</th><th>" +
      t("Shares", "股數") +
      "</th><th>" +
      t("Price", "價格") +
      "</th></tr></thead><tbody>" +
      trades
        .map(function (tr) {
          return (
            "<tr><td>" +
            new Date(tr.ts).toLocaleString() +
            "</td><td>" +
            (tr.side === "buy" ? t("Buy", "買入") : t("Sell", "賣出")) +
            "</td><td>" +
            tr.tv +
            "</td><td>" +
            tr.shares +
            "</td><td>" +
            money(tr.price) +
            "</td></tr>"
          );
        })
        .join("") +
      "</tbody></table>";
  }

  function locale() {
    var root = document.documentElement;
    if (root.getAttribute("data-lang") === "zh") {
      return root.getAttribute("data-script") === "sc" ? "zh_CN" : "zh_TW";
    }
    return "en";
  }

  function mountChart(tv) {
    var host = document.getElementById("pp-tv");
    if (!host) return;
    activeTv = tv || activeTv;
    host.setAttribute("data-tv-symbol", activeTv);
    host.textContent = "";
    var wrap = document.createElement("div");
    wrap.className = "tradingview-widget-container";
    wrap.style.height = "100%";
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
      symbol: activeTv,
      interval: "5",
      timezone: "exchange",
      theme: "light",
      style: "1",
      locale: locale(),
      allow_symbol_change: true,
      calendar: false,
      support_host: "https://www.tradingview.com",
      studies: ["STD;SMA", "Volume@tv-basicstudies"],
      hide_top_toolbar: false,
    });
    wrap.appendChild(s);
    host.appendChild(wrap);
  }

  function setQuoteView(q) {
    var input = document.getElementById("pp-price-view");
    var note = document.getElementById("pp-quote-note");
    if (!input) return;
    if (!q) {
      input.value = "";
      if (note) note.textContent = t("No live quote for that symbol yet.", "暫時未取到該代碼的實時價。");
      return;
    }
    input.value =
      money(q.price, q.currency === "HKD" ? "HK$" : "US$") +
      "  (" +
      (q.changePct >= 0 ? "+" : "") +
      q.changePct.toFixed(2) +
      "%)";
    if (note)
      note.textContent = t(
        "Live quote · " + q.name + " · refreshed " + new Date(q.asOf).toLocaleTimeString(),
        "實時報價 · " + q.name + " · 更新於 " + new Date(q.asOf).toLocaleTimeString()
      );
  }

  function refreshAllQuotes() {
    var tickers = WATCH.map(function (w) {
      return w.tv;
    });
    (state.positions || []).forEach(function (p) {
      if (tickers.indexOf(p.tv) < 0) tickers.push(p.tv);
    });
    var sym = document.getElementById("pp-symbol");
    if (sym && sym.value) tickers = tickers.concat(normInput(sym.value));
    return fetchQuotes(tickers).then(function () {
      renderSummary();
      renderPositions();
      var candidates = sym ? normInput(sym.value) : [];
      var q = null;
      candidates.forEach(function (tv) {
        if (!q && quotes[tv]) q = quotes[tv];
      });
      if (!q && quotes[activeTv]) q = quotes[activeTv];
      setQuoteView(q);
    });
  }

  function findPos(tv) {
    var i;
    for (i = 0; i < state.positions.length; i++) {
      if (state.positions[i].tv === tv) return i;
    }
    return -1;
  }

  function placeOrder(side, shares, q) {
    var cost = q.price * shares;
    var idx = findPos(q.tv);
    if (side === "buy") {
      if (cost > state.cash + 1e-9) throw new Error(t("Not enough fake cash.", "假想現金不足。"));
      state.cash -= cost;
      if (idx < 0) state.positions.push({ tv: q.tv, shares: shares, avgCost: q.price });
      else {
        var p = state.positions[idx];
        var newShares = p.shares + shares;
        p.avgCost = (p.avgCost * p.shares + q.price * shares) / newShares;
        p.shares = newShares;
      }
    } else {
      if (idx < 0 || state.positions[idx].shares < shares)
        throw new Error(t("Not enough shares to sell.", "可賣股數不足。"));
      state.cash += cost;
      state.positions[idx].shares -= shares;
      if (state.positions[idx].shares <= 0) state.positions.splice(idx, 1);
    }
    state.trades.push({
      ts: Date.now(),
      side: side,
      tv: q.tv,
      shares: shares,
      price: q.price,
    });
    if (state.trades.length > 200) state.trades = state.trades.slice(-200);
    saveState();
  }

  function wireChips() {
    var box = document.getElementById("pp-chips");
    if (!box) return;
    box.innerHTML = WATCH.map(function (w) {
      return (
        '<button type="button" class="pp-chip" data-tv="' +
        w.tv +
        '">' +
        w.label +
        "</button>"
      );
    }).join("");
    box.addEventListener("click", function (ev) {
      var btn = ev.target.closest("[data-tv]");
      if (!btn) return;
      var tv = btn.getAttribute("data-tv");
      var sym = document.getElementById("pp-symbol");
      if (sym) sym.value = tv.indexOf("HKEX:") === 0 ? tv.replace("HKEX:", "") : tv.split(":")[1];
      activeTv = tv;
      mountChart(tv);
      fetchQuotes([tv]).then(function () {
        setQuoteView(quotes[tv] || null);
        renderSummary();
        renderPositions();
      });
    });
  }

  function wireTrade() {
    var form = document.getElementById("pp-trade-form");
    var err = document.getElementById("pp-trade-err");
    var refresh = document.getElementById("pp-refresh");
    var reset = document.getElementById("pp-reset");
    var sym = document.getElementById("pp-symbol");
    if (sym) {
      sym.addEventListener("change", function () {
        resolveSymbol(sym.value).then(function (q) {
          if (q) {
            activeTv = q.tv;
            mountChart(q.tv);
            setQuoteView(q);
          } else setQuoteView(null);
        });
      });
    }
    if (form) {
      form.addEventListener("submit", function (ev) {
        ev.preventDefault();
        if (err) {
          err.hidden = true;
          err.textContent = "";
        }
        var side = document.getElementById("pp-side").value;
        var shares = Math.floor(Number(document.getElementById("pp-shares").value) || 0);
        var raw = document.getElementById("pp-symbol").value;
        if (shares < 1) {
          if (err) {
            err.hidden = false;
            err.textContent = t("Enter a valid share count.", "請輸入有效股數。");
          }
          return;
        }
        resolveSymbol(raw).then(function (q) {
          if (!q) {
            if (err) {
              err.hidden = false;
              err.textContent = t(
                "Could not get a live price for that symbol.",
                "未能取得該代碼的實時價。"
              );
            }
            return;
          }
          try {
            placeOrder(side, shares, q);
            activeTv = q.tv;
            mountChart(q.tv);
            setQuoteView(q);
            renderSummary();
            renderPositions();
            renderBlotter();
          } catch (ex) {
            if (err) {
              err.hidden = false;
              err.textContent = ex.message || String(ex);
            }
          }
        });
      });
    }
    if (refresh) {
      refresh.addEventListener("click", function () {
        refreshAllQuotes();
      });
    }
    if (reset) {
      reset.addEventListener("click", function () {
        if (
          !window.confirm(
            t(
              "Reset fake cash to US$100,000 and clear positions?",
              "將假想資金重置為 US$100,000 並清空持倉？"
            )
          )
        )
          return;
        state = defaultState();
        saveState();
        renderSummary();
        renderPositions();
        renderBlotter();
      });
    }
  }

  function startPolling() {
    stopPolling();
    pollTimer = setInterval(function () {
      if (unlocked) refreshAllQuotes();
    }, 30000);
  }
  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function openDesk() {
    state = loadState();
    showDesk(true);
    wireChips();
    wireTrade();
    mountChart(activeTv);
    refreshAllQuotes();
    renderBlotter();
    startPolling();
    var meta = document.getElementById("pp-desk-meta");
    if (meta)
      meta.textContent = t(
        "Unlocked this page load · fake cash US$" +
          START_CASH.toLocaleString() +
          " · quotes live",
        "僅本頁載入期間解鎖 · 假想資金 US$" +
          START_CASH.toLocaleString() +
          " · 報價實時"
      );
  }

  function wireGate() {
    renderGate();
    var form = document.getElementById("pp-pass-form");
    var err = document.getElementById("pp-pass-err");
    var logout = document.getElementById("pp-logout");
    if (form) {
      form.addEventListener("submit", function (ev) {
        ev.preventDefault();
        var input = document.getElementById("pp-pass");
        var val = input ? String(input.value || "").trim() : "";
        if (val.toLowerCase() === MEMBER_PASS.toLowerCase()) {
          setOpen(true);
          if (err) {
            err.hidden = true;
            err.textContent = "";
          }
          openDesk();
        } else {
          if (err) {
            err.hidden = false;
            err.textContent = t(
              "Wrong password. Pay via WhatsApp to receive the paper-desk code.",
              "密碼不正確。請經 WhatsApp 付款後領取模擬倉密碼。"
            );
          }
        }
      });
    }
    if (logout) {
      logout.addEventListener("click", function () {
        setOpen(false);
        stopPolling();
        showDesk(false);
      });
    }
    showDesk(false);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wireGate);
  } else {
    wireGate();
  }
})();
