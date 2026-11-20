(function () {
  "use strict";

  // Separate password from Mark Six quant / Filings academy.
  // Unlock is memory-only: every refresh / reload must re-enter the password.
  var MEMBER_PASS = "TC-Chart-2026";
  var PRICE = "HK$198";
  var WA = "https://wa.me/85298229572";
  var unlocked = false;
  var analyseTimer = null;
  try {
    sessionStorage.removeItem("tc_member_session");
    sessionStorage.removeItem("tc_chart_session");
  } catch (e) {}

  var CELEBS = [
    {
      id: "trump",
      nameZh: "唐納·特朗普",
      nameEn: "Donald Trump",
      birthIso: "1946-06-14",
      birthTime: "10:54",
      birthPlace: "Queens, New York",
      noteZh: "公開時辰較完整；上升應近獅子。",
      noteEn: "Public birth time; Asc near Leo.",
    },
    {
      id: "musk",
      nameZh: "埃隆·馬斯克",
      nameEn: "Elon Musk",
      birthIso: "1971-06-28",
      birthTime: "07:30",
      birthPlace: "Pretoria",
      noteZh: "時辰有爭議，採常見估計 07:30。",
      noteEn: "Birth time disputed; common estimate 07:30.",
    },
    {
      id: "jensen",
      nameZh: "黃仁勳",
      nameEn: "Jensen Huang",
      birthIso: "1963-02-17",
      birthTime: "12:00",
      birthPlace: "Tainan",
      noteZh: "公開時辰未詳，用正午作研究近似。",
      noteEn: "Birth time not public; noon used as research approx.",
    },
    {
      id: "leijun",
      nameZh: "雷軍",
      nameEn: "Lei Jun",
      birthIso: "1969-12-16",
      birthTime: "12:00",
      birthPlace: "Xiantao",
      noteZh: "公開時辰未詳，用正午作研究近似。",
      noteEn: "Birth time not public; noon used as research approx.",
    },
    {
      id: "buffett",
      nameZh: "沃倫·巴菲特",
      nameEn: "Warren Buffett",
      birthIso: "1930-08-30",
      birthTime: "13:00",
      birthPlace: "Omaha",
      noteZh: "時辰估計；太陽處女、商業耐性個案。",
      noteEn: "Time estimated; Virgo-sun patience case.",
    },
    {
      id: "jackma",
      nameZh: "馬雲",
      nameEn: "Jack Ma",
      birthIso: "1964-09-10",
      birthTime: "12:00",
      birthPlace: "Hangzhou",
      noteZh: "時辰未詳；中概創辦人對照樣本。",
      noteEn: "Time unknown; China-founder comparison sample.",
    },
  ];

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
        "Hi Tyler — I paid for Member services (Personal chart). Please send the password.",
        "你好 Tyler——我已為會員服務（個人排盤）付款，請發送密碼。"
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
    var price = document.getElementById("ch-price");
    var cta = document.getElementById("ch-pay-cta");
    if (price)
      price.textContent = t(
        "Access · " + PRICE + " · password each visit / refresh",
        "通行 · " + PRICE + " · 每次進入／重新整理需密碼"
      );
    if (cta) cta.innerHTML = payLinks();
  }

  function showDesk(on) {
    var gate = document.getElementById("ch-gate");
    var locked = document.getElementById("ch-locked");
    var desk = document.getElementById("ch-desk");
    if (gate) gate.hidden = !!on;
    if (locked) locked.hidden = !!on;
    if (desk) desk.hidden = !on;
  }

  function setLoading(on, stepIdx) {
    var box = document.getElementById("ch-loading");
    var title = document.getElementById("ch-loading-title");
    var steps = document.getElementById("ch-loading-steps");
    var btn = document.getElementById("ch-submit");
    if (!box) return;
    box.hidden = !on;
    if (btn) btn.disabled = !!on;
    if (!on) return;
    var labels = [
      t("1 · Align solar terms & day pillar", "1 · 對齊節氣與日柱"),
      t("2 · Compute tropical Sun / Moon / Asc", "2 · 推算黃道太陽／月亮／上升"),
      t("3 · Weigh five elements & hidden stems", "3 · 權衡五行與藏干"),
      t("4 · Score luck years & draft reading", "4 · 評分流年並起草解讀"),
      t("5 · Finalise professional report", "5 · 完成專業報告"),
    ];
    if (title)
      title.textContent = t(
        "Casting chart — professional analysis in progress",
        "排盤進行中——專業分析演算中"
      );
    if (steps) {
      steps.innerHTML = labels
        .map(function (lab, i) {
          return '<li class="' + (i <= stepIdx ? "is-on" : "") + '">' + lab + "</li>";
        })
        .join("");
    }
  }

  function renderReading(natal, analysis) {
    var pillars = document.getElementById("ch-pillars");
    var astro = document.getElementById("ch-astro");
    var reading = document.getElementById("ch-reading");
    var yearsEl = document.getElementById("ch-years");
    var out = document.getElementById("ch-out");
    if (!pillars || !astro || !reading || !out) return;
    out.hidden = false;

    var hidden = natal.hiddenStems || {};
    var hiddenList = [hidden.year, hidden.month, hidden.day, hidden.hour];
    pillars.innerHTML =
      '<p class="ms-natal-line"><strong>' +
      natal.nameZh +
      " / " +
      natal.nameEn +
      '</strong></p><p class="ms-natal-line">' +
      natal.birthIso +
      " " +
      natal.birthTime +
      " · " +
      natal.birthPlace +
      (natal.geo && natal.geo.matched === false
        ? t(" (coords default to Hong Kong)", "（經緯預設香港）")
        : "") +
      (natal.geo && natal.geo.tzHoursUsed != null
        ? t(
            " · TZ UTC" + (natal.geo.tzHoursUsed >= 0 ? "+" : "") + natal.geo.tzHoursUsed,
            " · 時區 UTC" + (natal.geo.tzHoursUsed >= 0 ? "+" : "") + natal.geo.tzHoursUsed
          )
        : "") +
      '</p><div class="ch-pillar-grid">' +
      ["年", "月", "日", "時"]
        .map(function (lab, i) {
          var hid = (hiddenList[i] || []).join("");
          return (
            '<div class="ch-pillar"><span class="ch-pillar-lab">' +
            t(["Year", "Month", "Day", "Hour"][i], lab + "柱") +
            "</span><strong>" +
            natal.pillars[i] +
            "</strong>" +
            (hid
              ? '<span class="ch-pillar-hid">' + t("Hidden ", "藏干 ") + hid + "</span>"
              : "") +
            "</div>"
          );
        })
        .join("") +
      '</div><p class="ms-natal-line">' +
      t("Day master", "日主") +
      " <strong>" +
      natal.dayMaster +
      " · " +
      natal.dayMasterEn +
      "</strong> · " +
      t("Element", "五行") +
      " " +
      natal.dayElement +
      " · " +
      t("Animal", "生肖") +
      " " +
      natal.animal +
      '</p><p class="ms-natal-line ms-method-note">' +
      (lang() === "zh" ? natal.methodNoteZh || "" : natal.methodNoteEn || "") +
      "</p>";

    astro.innerHTML =
      '<ul class="ch-astro-list"><li>' +
      t("Sun", "太陽") +
      ": <strong>" +
      natal.sunSign +
      "</strong></li><li>" +
      t("Moon", "月亮") +
      ": <strong>" +
      natal.moonSign +
      "</strong></li><li>" +
      t("Ascendant", "上升") +
      ": <strong>" +
      natal.ascSign +
      "</strong></li><li>" +
      t("Lunar phase", "月相") +
      ": <strong>" +
      (natal.lunar && natal.lunar.label ? natal.lunar.label : "—") +
      "</strong></li><li>" +
      t("Lucky numbers", "幸運號碼") +
      ": <strong>" +
      (natal.luckyNumbers || []).join(", ") +
      "</strong></li></ul>";

    var sections = [
      { k: "personality", en: "Personality", zh: "性格" },
      { k: "career", en: "Career & path", zh: "事業與適合方向" },
      { k: "wealth", en: "Wealth", zh: "財產／財運" },
      { k: "health", en: "Health", zh: "健康" },
      { k: "family", en: "Family & relationships", zh: "家庭與感情" },
      { k: "outlook", en: "Outlook & luck windows", zh: "走勢與流年窗口" },
    ];
    reading.innerHTML = sections
      .map(function (s) {
        var block = (analysis && analysis[s.k]) || {};
        return (
          '<article class="ch-read-card"><h4>' +
          t(s.en, s.zh) +
          "</h4><p>" +
          (lang() === "zh" ? block.zh || block.en : block.en || block.zh) +
          "</p></article>"
        );
      })
      .join("");

    if (yearsEl) {
      var rows = (analysis && analysis.luckYears) || [];
      yearsEl.innerHTML = rows
        .map(function (r) {
          var label =
            r.tier === "good"
              ? t("Favourable", "偏利")
              : r.tier === "hard"
                ? t("Caution", "需小心")
                : t("Mixed", "平穩");
          return (
            '<div class="ch-year-row ' +
            r.tier +
            '"><strong>' +
            r.year +
            "<br><small>" +
            r.pillar +
            " · " +
            label +
            "</small></strong><div>" +
            (lang() === "zh" ? r.zh : r.en) +
            "</div></div>"
          );
        })
        .join("");
    }
  }

  function runAnalysis(input) {
    if (!window.MemberBazi) {
      alert(t("Engine not loaded. Refresh.", "引擎未載入，請重新整理。"));
      return;
    }
    if (analyseTimer) {
      clearTimeout(analyseTimer);
      analyseTimer = null;
    }
    var out = document.getElementById("ch-out");
    if (out) out.hidden = true;
    var step = 0;
    setLoading(true, step);
    function tick() {
      step += 1;
      setLoading(true, step);
      if (step < 4) {
        analyseTimer = setTimeout(tick, 550 + Math.floor(Math.random() * 280));
        return;
      }
      analyseTimer = setTimeout(function () {
        try {
          var natal = window.MemberBazi.buildNatal(input);
          var analysis = window.MemberBazi.chartAnalysis(natal);
          setLoading(false, 0);
          renderReading(natal, analysis);
          var box = document.getElementById("ch-out");
          if (box) box.scrollIntoView({ behavior: "smooth", block: "start" });
        } catch (err) {
          setLoading(false, 0);
          alert(
            t("Could not cast chart: ", "無法排盤：") +
              (err && err.message ? err.message : String(err))
          );
        }
      }, 700);
    }
    analyseTimer = setTimeout(tick, 480);
  }

  function wireCelebs() {
    var grid = document.getElementById("ch-celeb-grid");
    if (!grid) return;
    grid.innerHTML = CELEBS.map(function (c) {
      return (
        '<button type="button" class="ch-celeb-btn" data-celeb="' +
        c.id +
        '"><strong>' +
        t(c.nameEn, c.nameZh) +
        "</strong><small>" +
        c.birthIso +
        " · " +
        c.birthPlace +
        "<br>" +
        t(c.noteEn, c.noteZh) +
        "</small></button>"
      );
    }).join("");
    grid.addEventListener("click", function (ev) {
      var btn = ev.target.closest("[data-celeb]");
      if (!btn) return;
      var id = btn.getAttribute("data-celeb");
      var c = CELEBS.filter(function (x) {
        return x.id === id;
      })[0];
      if (!c) return;
      var form = document.getElementById("ch-natal-form");
      if (form) {
        form.nameZh.value = c.nameZh;
        form.nameEn.value = c.nameEn;
        form.birthIso.value = c.birthIso;
        form.birthTime.value = c.birthTime;
        form.birthPlace.value = c.birthPlace;
      }
      runAnalysis({
        nameZh: c.nameZh,
        nameEn: c.nameEn,
        birthIso: c.birthIso,
        birthTime: c.birthTime,
        birthPlace: c.birthPlace,
      });
    });
  }

  function wireForm() {
    var form = document.getElementById("ch-natal-form");
    if (!form) return;
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var fd = new FormData(form);
      runAnalysis({
        nameZh: String(fd.get("nameZh") || "").trim(),
        nameEn: String(fd.get("nameEn") || "").trim(),
        birthIso: String(fd.get("birthIso") || "").trim(),
        birthTime: String(fd.get("birthTime") || "08:00").trim(),
        birthPlace: String(fd.get("birthPlace") || "").trim(),
      });
    });
  }

  function wireGate() {
    renderGate();
    wireCelebs();
    var form = document.getElementById("ch-pass-form");
    var err = document.getElementById("ch-pass-err");
    var logout = document.getElementById("ch-logout");
    var meta = document.getElementById("ch-desk-meta");
    if (form) {
      form.addEventListener("submit", function (ev) {
        ev.preventDefault();
        var input = document.getElementById("ch-pass");
        var val = input ? String(input.value || "").trim() : "";
        if (val.toLowerCase() === MEMBER_PASS.toLowerCase()) {
          setOpen(true);
          if (err) {
            err.hidden = true;
            err.textContent = "";
          }
          showDesk(true);
          if (meta)
            meta.textContent = t(
              "Unlocked this page load only · refresh locks again",
              "僅本頁載入期間解鎖 · 重新整理後會再上鎖"
            );
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
        setLoading(false, 0);
        var out = document.getElementById("ch-out");
        if (out) out.hidden = true;
      });
    }
    showDesk(false);
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
