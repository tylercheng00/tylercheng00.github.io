(function () {
  "use strict";

  // Separate password from Mark Six quant / Filings academy.
  // Unlock is memory-only: every refresh / reload must re-enter the password.
  var MEMBER_PASS = "TC-Chart-2026";
  var PRICE = "HK$198";
  var WA = "https://wa.me/85298229572";
  var unlocked = false;
  try {
    sessionStorage.removeItem("tc_member_session");
    sessionStorage.removeItem("tc_chart_session");
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
        "Access · " + PRICE + " · password each visit",
        "通行 · " + PRICE + " · 每次進入需密碼"
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

  function renderReading(natal, analysis) {
    var pillars = document.getElementById("ch-pillars");
    var astro = document.getElementById("ch-astro");
    var reading = document.getElementById("ch-reading");
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
      '</p><div class="ch-pillar-grid">' +
      ["年", "月", "日", "時"]
        .map(function (lab, i) {
          var hid = (hiddenList[i] || []).join("");
          return (
            '<div class="ch-pillar"><span class="ch-pillar-lab">' +
            t(
              ["Year", "Month", "Day", "Hour"][i],
              lab + "柱"
            ) +
            "</span><strong>" +
            natal.pillars[i] +
            "</strong>" +
            (hid
              ? '<span class="ch-pillar-hid">' +
                t("Hidden ", "藏干 ") +
                hid +
                "</span>"
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
      (lang() === "zh"
        ? natal.methodNoteZh || ""
        : natal.methodNoteEn || "") +
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
      { k: "outlook", en: "Near-term outlook", zh: "未來走勢" },
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
  }

  function wireForm() {
    var form = document.getElementById("ch-natal-form");
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
        var analysis = window.MemberBazi.chartAnalysis(natal);
        renderReading(natal, analysis);
        var out = document.getElementById("ch-out");
        if (out) out.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch (err) {
        alert(
          t("Could not cast chart: ", "無法排盤：") +
            (err && err.message ? err.message : String(err))
        );
      }
    });
  }

  function wireGate() {
    renderGate();
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
              "Unlocked this visit · enter birth data below",
              "本次已解鎖 · 請在下方輸入出生資料"
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
        var out = document.getElementById("ch-out");
        if (out) out.hidden = true;
      });
    }
    if (openNow()) {
      showDesk(true);
      if (meta)
        meta.textContent = t(
          "Unlocked this visit · enter birth data below",
          "本次已解鎖 · 請在下方輸入出生資料"
        );
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
