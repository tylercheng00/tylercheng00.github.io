(function () {
  "use strict";

  var PASS_KEY = "tc_member_session";
  var PASS_OK = "marksix-desk-open";
  var MEMBER_PASS = "TC-MarkSix-2026";
  var PRICE = "HK$198";
  var WA = "https://wa.me/85298229572";
  var DATA = "data/marksix/";
  // Bust CDN/browser cache when JSON is regenerated (GH Pages can serve stale JSON).
  var DATA_VER = "20261117b";

  var lang = function () {
    return document.documentElement.getAttribute("lang") === "zh-Hant" ? "zh" : "en";
  };
  var t = function (en, zh) {
    return lang() === "zh" ? zh : en;
  };
  var pad = function (n) {
    return String(n).padStart(2, "0");
  };
  var ballHtml = function (n, special) {
    n = Number(n);
    var c =
      [1, 2, 7, 8, 12, 13, 18, 19, 23, 24, 29, 30, 34, 35, 40, 45, 46].indexOf(n) >= 0
        ? "red"
        : [3, 4, 9, 10, 14, 15, 20, 25, 26, 31, 36, 37, 41, 42, 47, 48].indexOf(n) >= 0
          ? "blue"
          : "green";
    return (
      '<span class="ms-ball ms-' +
      c +
      (special ? " special" : "") +
      '">' +
      pad(n) +
      "</span>"
    );
  };
  var rowBalls = function (nums, special) {
    var html = (nums || [])
      .map(function (n) {
        return ballHtml(n, false);
      })
      .join("");
    if (special != null) html += "<i>+</i>" + ballHtml(special, true);
    return '<div class="ms-balls">' + html + "</div>";
  };

  function openNow() {
    try {
      return sessionStorage.getItem(PASS_KEY) === PASS_OK;
    } catch (e) {
      return false;
    }
  }
  function setOpen(v) {
    try {
      if (v) sessionStorage.setItem(PASS_KEY, PASS_OK);
      else sessionStorage.removeItem(PASS_KEY);
    } catch (e) {}
  }

  function payLinks() {
    var msg = encodeURIComponent(
      t(
        "Hi Tyler — I paid for Member services (Mark Six quant). Please send the password.",
        "你好 Tyler——我已為會員服務（六合彩量化分析）付款，請發送密碼。"
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
    var price = document.getElementById("ms-price");
    var cta = document.getElementById("ms-pay-cta");
    if (price)
      price.textContent = t(
        "Access · " + PRICE + " · password each visit",
        "通行 · " + PRICE + " · 每次進入需密碼"
      );
    if (cta) cta.innerHTML = payLinks();
  }

  function showDesk(on) {
    var gate = document.getElementById("ms-gate");
    var locked = document.getElementById("ms-locked");
    var desk = document.getElementById("ms-desk");
    if (gate) gate.hidden = !!on;
    if (locked) locked.hidden = !!on;
    if (desk) desk.hidden = !on;
  }

  function fmtDraw(d) {
    if (!d || !d.date) return "";
    var nums = d.main || d.numbers || [];
    return (
      '<div class="ms-draw-row"><div class="ms-draw-meta"><strong>' +
      d.date +
      "</strong> · #" +
      (d.drawNo || "—") +
      "</div>" +
      rowBalls(nums, d.special) +
      "</div>"
    );
  }

  function tableNums(list, key) {
    if (!list || !list.length) return "<p>—</p>";
    return (
      '<table class="ms-table"><thead><tr><th>#</th><th>' +
      t("Count", "次數") +
      "</th></tr></thead><tbody>" +
      list
        .slice(0, 12)
        .map(function (r) {
          return (
            "<tr><td>" +
            pad(r.n) +
            "</td><td>" +
            (r[key] != null ? r[key] : r.count || 0) +
            "</td></tr>"
          );
        })
        .join("") +
      "</tbody></table>"
    );
  }

  function renderPublic(summary) {
    var s = summary || {};
    var latest = s.latest || {};
    var range =
      s.from && s.to
        ? s.from + " → " + s.to
        : latest.date || "—";
    var latestLabel =
      (latest.drawNo ? "#" + latest.drawNo + " " : "") + (latest.date || "—");
    var sub = document.getElementById("ms-pub-sub");
    if (sub)
      sub.textContent = t(
        (s.era || "Mark Six") +
          " · " +
          (s.historyCount || 0) +
          " draws · " +
          range +
          " · latest " +
          latestLabel,
        (s.era || "六合彩") +
          " · 樣本 " +
          (s.historyCount || 0) +
          " 期 · " +
          range +
          " · 最新 " +
          latestLabel
      );
    var grid = document.getElementById("ms-stat-grid");
    if (grid) {
      grid.innerHTML =
        '<div class="ms-stat"><span class="ms-stat-k">' +
        t("Draws", "期數") +
        "</span><strong>" +
        (s.historyCount || 0) +
        '</strong></div><div class="ms-stat"><span class="ms-stat-k">' +
        t("Odd %", "單數%") +
        "</span><strong>" +
        (s.oddPct != null ? s.oddPct : "—") +
        '</strong></div><div class="ms-stat"><span class="ms-stat-k">' +
        t("Even %", "雙數%") +
        "</span><strong>" +
        (s.evenPct != null ? s.evenPct : "—") +
        "</strong></div>";
    }
    var tf = document.getElementById("ms-top-freq");
    var th = document.getElementById("ms-top-hot");
    var tsp = document.getElementById("ms-top-sp");
    if (tf) tf.innerHTML = tableNums(s.topFreq, "count");
    if (th) th.innerHTML = tableNums(s.topHot50 || s.topHot, "count");
    if (tsp) tsp.innerHTML = tableNums(s.topSpecial, "count");
  }

  function renderHistory(draws) {
    var el = document.getElementById("ms-history-body");
    if (!el) return;
    var list = Array.isArray(draws) ? draws : (draws && draws.draws) || [];
    el.innerHTML =
      list.slice(0, 20).map(fmtDraw).join("") || "<p>—</p>";
  }

  function renderLanes(scored, natal) {
    var box = document.getElementById("ms-lanes-body");
    var natalBox = document.getElementById("ms-user-natal");
    var out = document.getElementById("ms-user-out");
    if (!box || !natalBox || !out) return;
    out.hidden = false;
    natalBox.innerHTML =
      '<p class="ms-natal-line"><strong>' +
      natal.nameZh +
      " / " +
      natal.nameEn +
      "</strong> · " +
      natal.birthIso +
      " " +
      natal.birthTime +
      " · " +
      natal.birthPlace +
      '</p><p class="ms-natal-line">' +
      t("Day master", "日主") +
      " <strong>" +
      natal.dayMaster +
      "</strong> · " +
      t("Pillars", "四柱") +
      " " +
      (natal.pillars || []).join(" · ") +
      " · " +
      t("Sun", "太陽") +
      " " +
      natal.sunSign +
      "</p>";

    var lanes = [
      {
        key: "conservative",
        title: t("Conservative", "穩健軌"),
        note: t("Lower churn, chart-aligned cores.", "低換手、命盤對齊核心。"),
      },
      {
        key: "balanced",
        title: t("Balanced", "平衡軌"),
        note: t("Mix of heat and natal symbols.", "熱度與命盤符號各半。"),
      },
      {
        key: "aggressive",
        title: t("Aggressive", "進取軌"),
        note: t("More weight on recent heat + lucky numbers.", "更重近期熱度與幸運號。"),
      },
    ];
    box.innerHTML =
      '<div class="ms-lanes">' +
      lanes
        .map(function (L) {
          var pack = scored[L.key] || {};
          return (
            '<article class="ms-lane"><header><h4>' +
            L.title +
            "</h4><p>" +
            L.note +
            "</p></header>" +
            rowBalls(pack.mains || [], pack.special) +
            '<p class="ms-lane-why">' +
            (pack.why || "") +
            "</p></article>"
          );
        })
        .join("") +
      "</div>";
  }

  function loadDesk() {
    var meta = document.getElementById("ms-desk-meta");
    if (meta)
      meta.textContent = t(
        "Unlocked this visit · enter birth data below",
        "本次已解鎖 · 請在下方輸入出生資料"
      );
    Promise.all([
      fetch(DATA + "summary.json?v=" + DATA_VER, { cache: "no-store" }).then(function (r) {
        return r.ok ? r.json() : {};
      }),
      fetch(DATA + "recent-draws.json?v=" + DATA_VER, { cache: "no-store" }).then(function (r) {
        return r.ok ? r.json() : [];
      }),
    ])
      .then(function (pair) {
        window.__msSummary = pair[0];
        renderPublic(pair[0]);
        renderHistory(pair[1]);
      })
      .catch(function () {
        renderPublic({});
        renderHistory([]);
      });
  }

  function wireForm() {
    var form = document.getElementById("ms-natal-form");
    if (!form) return;
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      if (!window.MemberBazi) {
        alert(t("Engine not loaded. Refresh.", "引擎未載入，請重新整理。"));
        return;
      }
      var fd = new FormData(form);
      var input = {
        nameZh: String(fd.get("nameZh") || "").trim(),
        nameEn: String(fd.get("nameEn") || "").trim(),
        birthIso: String(fd.get("birthIso") || "").trim(),
        birthTime: String(fd.get("birthTime") || "08:00").trim(),
        birthPlace: String(fd.get("birthPlace") || "").trim(),
      };
      try {
        var natal = window.MemberBazi.buildNatal(input);
        var scored = window.MemberBazi.scoreMarkSixForNatal(
          natal,
          window.__msSummary || {}
        );
        renderLanes(scored, natal);
        var out = document.getElementById("ms-user-out");
        if (out) out.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch (err) {
        alert(
          t("Could not analyse: ", "無法分析：") +
            (err && err.message ? err.message : String(err))
        );
      }
    });
  }

  function wireGate() {
    renderGate();
    var form = document.getElementById("ms-pass-form");
    var err = document.getElementById("ms-pass-err");
    var logout = document.getElementById("ms-logout");
    if (form) {
      form.addEventListener("submit", function (ev) {
        ev.preventDefault();
        var input = document.getElementById("ms-pass");
        var val = input ? String(input.value || "").trim() : "";
        if (val.toLowerCase() === MEMBER_PASS.toLowerCase()) {
          setOpen(true);
          if (err) {
            err.hidden = true;
            err.textContent = "";
          }
          showDesk(true);
          loadDesk();
        } else {
          if (err) {
            err.hidden = false;
            err.textContent = t(
              "Wrong password. Pay via WhatsApp to receive the current code.",
              "密碼不正確。請經 WhatsApp 付款後領取目前密碼。"
            );
          }
        }
      });
    }
    if (logout) {
      logout.addEventListener("click", function () {
        setOpen(false);
        showDesk(false);
        var out = document.getElementById("ms-user-out");
        if (out) out.hidden = true;
      });
    }
    if (openNow()) {
      showDesk(true);
      loadDesk();
    } else {
      showDesk(false);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      wireGate();
      wireForm();
    });
  } else {
    wireGate();
    wireForm();
  }
})();
