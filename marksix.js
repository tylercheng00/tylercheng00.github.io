/* Mark Six quant desk — entire analysis behind member unlock.
 *
 * SETUP: create a Stripe Payment Link; After payment → redirect to
 *   https://tylercheng00.github.io/marksix.html?paid={CHECKOUT_SESSION_ID}
 * Paste the link into STRIPE_LINK. Until then the pay button opens WhatsApp.
 * Set MEMBER_PASSWORD to the password you send paying members.
 * Soft client gate only (static GitHub Pages) — check Stripe for real sales.
 * JSON under data/marksix/ is only fetched after unlock.
 * Unlock is in-memory for this page load only: every revisit needs the password again.
 */
(function () {
  var STRIPE_LINK = "";
  var PRICE = ["HK$198", "HK$198"];
  var WA = "85298229572";
  var MEMBER_PASSWORD = "TC-MarkSix-2026";
  var KEY_PAID = "ms-paid"; // legacy key — cleared on load; no longer used to stay unlocked
  var DATA = "data/marksix/";
  var openNow = false;

  function bi(en, zh) {
    return '<span lang="en">' + en + '</span><span lang="zh-Hant">' + zh + '</span>';
  }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function pct(n, d) {
    if (d == null) return (Math.round(n * 1000) / 10).toFixed(1) + "%";
    return (Math.round((1000 * n) / d) / 10).toFixed(1) + "%";
  }
  function num(n, dig) {
    if (n == null || isNaN(n)) return "—";
    return Number(n).toFixed(dig == null ? 2 : dig);
  }
  function ball(n) {
    n = Number(n);
    var c = n <= 0 ? "green" : ([1,2,7,8,12,13,18,19,23,24,29,30,34,35,40,45,46].indexOf(n) >= 0 ? "red"
      : [3,4,9,10,14,15,20,25,26,31,36,37,41,42,47,48].indexOf(n) >= 0 ? "blue" : "green");
    return '<span class="ms-ball ms-' + c + '">' + (n < 10 ? "0" + n : n) + "</span>";
  }
  function balls(arr) {
    return (arr || []).map(ball).join("");
  }
  function table(headers, rows) {
    return '<div class="ms-scroll"><table class="ms-table"><thead><tr>' +
      headers.map(function (h) { return "<th>" + h + "</th>"; }).join("") +
      "</tr></thead><tbody>" + rows.join("") + "</tbody></table></div>";
  }
  function fetchJson(path) {
    return fetch(DATA + path, { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error(path + " " + r.status);
      return r.json();
    });
  }
  function unlocked() {
    return !!openNow;
  }
  function setUnlocked(on) {
    openNow = !!on;
    try { localStorage.removeItem(KEY_PAID); } catch (e) {}
  }

  function renderGate() {
    var price = document.getElementById("ms-price");
    if (price) price.innerHTML = bi("Member access · " + PRICE[0], "會員通行 · " + PRICE[1]);
    var cta = document.getElementById("ms-pay-cta");
    if (!cta) return;
    if (STRIPE_LINK) {
      cta.innerHTML = '<a class="btn btn-gold" href="' + esc(STRIPE_LINK) + '" rel="noopener">' +
        bi("Pay " + PRICE[0] + " on Stripe", "以 Stripe 支付 " + PRICE[1]) + "</a>";
    } else {
      var msg = encodeURIComponent("你好 Tyler，我想付費開通六合彩量化會員並領取密碼。");
      cta.innerHTML = '<a class="btn btn-gold" target="_blank" rel="noopener" href="https://wa.me/' + WA +
        "?text=" + msg + '">' + bi("WhatsApp to pay & get password", "WhatsApp 付費並領密碼") + "</a>";
    }
  }

  function renderBacktest(bt) {
    if (!bt) return;
    var s = bt.sample || {};
    var verdict = document.getElementById("ms-verdict");
    if (verdict) {
      var lo = null, hi = null, models = (bt.backtest && bt.backtest.m) || {};
      Object.keys(models).forEach(function (k) {
        if (k.indexOf("隨機") >= 0) return;
        var m = models[k].mean != null ? models[k].mean : models[k];
        if (typeof m !== "number") return;
        if (lo == null || m < lo) lo = m;
        if (hi == null || m > hi) hi = m;
      });
      var exp = (bt.overallHits && bt.overallHits.expected) || 0.735;
      verdict.innerHTML = '<p class="ms-verdict-k">' + bi("Verdict", "結論") + "</p><p>" + bi(
        "No model stably beat random. Random six mains average <b>" + num(exp, 3) +
          "</b> hits per draw. Walk-forward means sat between <b>" + num(lo, 3) + "</b> and <b>" +
          num(hi, 3) + "</b> — inside sampling noise. Ganzhi and sky-chart tests found no number link that survived multiple-testing correction.",
        "冇任何模型穩定跑贏隨機揀號。隨機揀六個正碼，理論上每期平均中 <b>" + num(exp, 3) +
          "</b> 個。滾動回測均值都喺 <b>" + num(lo, 3) + "</b> 至 <b>" + num(hi, 3) +
          "</b>，屬抽樣誤差範圍。干支與天象盤檢驗校正後都搵唔到同號碼有關嘅規律。"
      ) + "</p>";
    }
    var grid = document.getElementById("ms-bt-stats");
    if (grid) {
      grid.innerHTML = [
        ["Sample", "樣本", (s.n || 0).toLocaleString() + " draws"],
        ["Window", "窗口", (s.first || "") + " → " + (s.last || "")],
        ["χ² p-value", "卡方 p 值", num(s.chi2 && s.chi2.p, 3)],
        ["Random E[hits]", "隨機期望中球", num((bt.overallHits && bt.overallHits.expected) || 0.735, 3)]
      ].map(function (row) {
        return '<div class="ms-stat"><p class="ms-stat-k">' + bi(row[0], row[1]) + "</p><p class=\"ms-stat-v\">" +
          esc(row[2]) + "</p></div>";
      }).join("");
    }
    var models = (bt.backtest && bt.backtest.m) || {};
    var rows = Object.keys(models).map(function (k) {
      var v = models[k];
      var mean = v.mean != null ? v.mean : v;
      var p = v.p != null ? num(v.p, 3) : "—";
      return "<tr><td>" + esc(k) + "</td><td>" + num(mean, 3) + "</td><td>" + p + "</td></tr>";
    });
    var el = document.getElementById("ms-bt-models");
    if (el) el.innerHTML = table([bi("Model", "模型"), bi("Mean hits", "平均中球"), "p"], rows);
    var chi = document.getElementById("ms-bt-chi");
    if (chi && s.chi2) {
      chi.innerHTML = "<p>" + bi(
        "Frequency χ² = " + num(s.chi2.stat, 2) + " (df " + s.chi2.df + "), p = " + num(s.chi2.p, 3) +
          " — consistent with a fair 49-ball draw.",
        "頻率卡方 χ² = " + num(s.chi2.stat, 2) + "（df " + s.chi2.df + "），p = " + num(s.chi2.p, 3) +
          " — 符合公平 49 球攪珠。"
      ) + "</p>";
    }
  }

  function renderPublic(sum) {
    var sub = document.getElementById("ms-pub-sub");
    if (sub && sum) {
      sub.innerHTML = bi(
        sum.historyCount.toLocaleString() + " draws · odd " + sum.oddPct + "% · sum μ " + sum.sumMean + " ± " + sum.sumStd,
        sum.historyCount.toLocaleString() + " 期 · 奇數 " + sum.oddPct + "% · 六合總和 μ " + sum.sumMean + " ± " + sum.sumStd
      );
    }
    var grid = document.getElementById("ms-stat-grid");
    if (grid && sum) {
      var z = sum.zones || {}, w = sum.colorWaves || {};
      grid.innerHTML = [
        ["Odd / even", "奇／偶", sum.oddPct + "% / " + sum.evenPct + "%"],
        ["Zones S/M/L", "區段 小／中／大", (z.small || 0) + "% / " + (z.mid || 0) + "% / " + (z.large || 0) + "%"],
        ["Waves R/B/G", "波色 紅／藍／綠", (w.red || 0) + "% / " + (w.blue || 0) + "% / " + (w.green || 0) + "%"],
        ["Adjacent gaps", "連號空隙率", (sum.adjacentGapRatePct || 0) + "%"]
      ].map(function (row) {
        return '<div class="ms-stat"><p class="ms-stat-k">' + bi(row[0], row[1]) + '</p><p class="ms-stat-v">' +
          esc(row[2]) + "</p></div>";
      }).join("");
    }
    function topTable(id, rows, cols) {
      var el = document.getElementById(id);
      if (!el) return;
      el.innerHTML = table(cols, (rows || []).slice(0, 8).map(function (r) {
        return "<tr><td>" + ball(r.n) + "</td><td>" + esc(r.count) + "</td><td>" +
          esc(r.ratePct != null ? r.ratePct + "%" : (r.pct != null ? r.pct + "%" : (r.missed != null ? r.missed : ""))) +
          "</td></tr>";
      }));
    }
    if (sum) {
      topTable("ms-top-freq", sum.topFreq, [bi("No.", "號碼"), bi("Count", "次數"), bi("Rate", "比率")]);
      topTable("ms-top-hot", sum.topHot50, [bi("No.", "號碼"), bi("In 50", "近50"), bi("Share", "佔比")]);
      topTable("ms-top-sp", sum.topSpecial, [bi("No.", "號碼"), bi("Count", "次數"), bi("Rate", "比率")]);
    }
  }

  function renderMember(bt, report, sum, recent, archives) {
    var meta = document.getElementById("ms-desk-meta");
    if (meta && report) {
      meta.innerHTML = bi(
        "Target " + esc(report.targetDate) + " · history " + (report.historyCount || "").toLocaleString() +
          " · generated " + esc((report.generatedAt || "").slice(0, 19)).replace("T", " ") + " UTC",
        "目標 " + esc(report.targetDate) + " · 樣本 " + (report.historyCount || "").toLocaleString() +
          " · 生成 " + esc((report.generatedAt || "").slice(0, 19)).replace("T", " ") + " UTC"
      );
    }

    var full = document.getElementById("ms-full-bt");
    if (full && bt && bt.backtest && bt.backtest.m) {
      var rows = Object.keys(bt.backtest.m).map(function (k) {
        var v = bt.backtest.m[k];
        var dist = v.dist || [];
        var hit3 = dist[3] || 0, hit4 = dist[4] || 0;
        var hit5 = (dist[5] || 0) + (dist[6] || 0);
        return "<tr><td>" + esc(k) + "</td><td>" + num(v.mean, 3) + "</td><td>" + hit3 +
          "</td><td>" + hit4 + "</td><td>" + hit5 + "</td><td>" + (v.p != null ? num(v.p, 3) : "—") + "</td></tr>";
      });
      full.innerHTML = table([
        bi("Model", "模型"), bi("Mean", "均值"), bi("Hit 3", "中3"), bi("Hit 4", "中4"),
        bi("Hit 5+", "中5+"), "p"
      ], rows);
    }

    var tests = document.getElementById("ms-tests");
    if (tests && bt) {
      var gzRows = Object.keys(bt.ganzhiTests || {}).map(function (k) {
        var v = bt.ganzhiTests[k];
        return "<tr><td>" + esc(k) + "</td><td>" + (v.p != null ? num(v.p, 3) : "—") + "</td><td>" +
          (v.ratio != null ? num(v.ratio, 3) : (v.stat != null ? num(v.stat, 1) : "—")) + "</td></tr>";
      });
      var asRows = Object.keys(bt.astroTests || {}).map(function (k) {
        var v = bt.astroTests[k];
        var q = v.q != null ? v.q : v.q_bh;
        return "<tr><td>" + esc(k) + "</td><td>" + (v.p != null ? num(v.p, 3) : "—") + "</td><td>" +
          (q != null ? num(q, 3) : "—") + "</td></tr>";
      });
      tests.innerHTML =
        "<h4>" + bi("Ganzhi (7)", "干支（7）") + "</h4>" +
        table([bi("Test", "檢驗"), "p", bi("stat/ratio", "統計／比率")], gzRows) +
        "<h4>" + bi("Sky chart", "天象盤") + "</h4>" +
        (asRows.length
          ? table([bi("Test", "檢驗"), "p", "q"], asRows)
          : "<p>" + bi("Twenty-two sky-chart tests in the source desk; none survived BH correction (min q ≫ 0.05).",
            "來源桌面有 22 項天象檢驗；Benjamini–Hochberg 校正後全部不顯著（最低 q ≫ 0.05）。") + "</p>");
    }

    var live = document.getElementById("ms-live");
    if (live && bt && bt.live) {
      live.innerHTML = bt.live.map(function (row) {
        var picks = Object.keys(row.picks || {}).map(function (name) {
          var p = row.picks[name];
          var hit = 0;
          (p.main || []).forEach(function (n) { if ((row.act.main || []).indexOf(n) >= 0) hit++; });
          return "<tr><td>" + esc(name) + "</td><td class=\"ms-balls\">" + balls(p.main) + " + " + ball(p.extra) +
            "</td><td>" + hit + "/6</td></tr>";
        }).join("");
        return '<article class="ms-live-card"><p class="ms-live-h">' + esc(row.date) + " · " + esc(row.gz) +
          "</p><p class=\"ms-balls\">" + bi("Actual", "開獎") + " " + balls(row.act.main) + " + " + ball(row.act.extra) +
          "</p><div class=\"ms-scroll\"><table class=\"ms-table\"><tbody>" + picks + "</tbody></table></div></article>";
      }).join("");
    }

    if (report && report.natal) {
      var n = report.natal;
      var p = n.pillars || {};
      document.getElementById("ms-natal-body").innerHTML =
        "<p>" + esc(n.summaryZh || "") + "</p>" +
        '<div class="ms-pillars">' +
        [["年", p.year], ["月", p.month], ["日", p.day], ["時", p.hour]].map(function (x) {
          return "<div><small>" + x[0] + "</small><b>" + esc(x[1] || "") + "</b></div>";
        }).join("") + "</div>" +
        "<p>" + bi("Day master", "日主") + " <b>" + esc(n.dayMaster || "") + "</b> · " +
        bi("Avoid", "忌") + " " + esc((n.avoidElements || []).concat(n.avoidStems || []).join("／")) + " · " +
        bi("Favour", "喜用") + " " + esc((n.favorElements || []).join("、")) + "</p>";
    }

    if (report && report.dayContext) {
      var d = report.dayContext, g = d.ganzhi || {}, e = d.elements || {};
      document.getElementById("ms-day-body").innerHTML =
        '<div class="ms-pillars">' +
        [["年柱", g.year + "（" + (e.year || "") + "）"], ["月柱", g.month + "（" + (e.month || "") + "）"],
          ["日柱", g.day + "（" + (e.day || "") + "）"]].map(function (x) {
          return "<div><small>" + x[0] + "</small><b>" + esc(x[1]) + "</b></div>";
        }).join("") + "</div>" +
        "<p>" + bi("Zodiac year", "生肖年") + " " + esc(d.zodiacYear || "") +
        " · " + bi("Lunar", "月相") + " " + esc(d.lunarApprox || "") +
        " · " + bi("Weekday planet", "主星") + " " + esc(d.weekdayPlanet || "") + "</p>" +
        "<p>" + bi("Favoured elements", "喜用五行") + " " + esc((d.favoredElements || []).join("、")) +
        " · " + bi("Animals", "生肖焦點") + " " + esc((d.favoredAnimals || []).join("、")) + "</p>";
    }

    document.getElementById("ms-ziwei-body").innerHTML =
      "<p>" + bi(
        "Desk map (symbolic, not a full palace cast): Life / Wealth / Career / Friends bands are folded into five-element and animal weights already used in Lane B/C. Fire and Yi-wood / Rabbit bands are down-weighted per natal avoid rules.",
        "桌面符號對照（非完整排盤）：命／財帛／官祿／交友等宮位意象，併入 B／C 軌已用嘅五行與生肖權重；按本命忌神，火與乙木／卯兔區段降權。"
      ) + "</p>" +
      '<div class="ms-ziwei-grid">' +
      [["命宮帶", "01–08", "水／金偏重"], ["財帛帶", "09–16", "土／金"], ["官祿帶", "17–24", "火降權"],
        ["遷移帶", "25–32", "木慎用"], ["交友帶", "33–40", "生肖合局"], ["福德帶", "41–49", "遺漏回歸"]].map(function (r) {
        return "<div><b>" + r[0] + "</b><span>" + r[1] + "</span><small>" + r[2] + "</small></div>";
      }).join("") + "</div>";

    var lanes = document.getElementById("ms-lanes-body");
    if (lanes && report && report.lanes) {
      lanes.innerHTML = report.lanes.map(function (lane) {
        var scores = (lane.topScores || lane.ranked || []).slice(0, 8).map(function (s) {
          var n = s.n != null ? s.n : s.number;
          var sc = s.score != null ? s.score : s.s;
          var why = s.why || s.reason || s.note ||
            ((s.reasons && s.reasons.join) ? s.reasons.join("；") : "");
          return "<tr><td>" + ball(n) + "</td><td>" + num(sc, 2) + "</td><td>" + esc(why) + "</td></tr>";
        }).join("");
        return '<article class="ms-lane-card"><h4>' + esc(lane.titleZh || lane.id) +
          "</h4><p>" + esc(lane.summaryZh || "") + '</p><p class="ms-balls">' + balls(lane.picks) +
          " + " + (lane.specials || []).map(ball).join("") + "</p>" +
          (scores ? '<div class="ms-scroll"><table class="ms-table"><thead><tr><th>' +
            bi("No.", "號碼") + "</th><th>" + bi("Score", "分數") + "</th><th>" + bi("Signal", "訊號") +
            "</th></tr></thead><tbody>" + scores + "</tbody></table></div>" : "") +
          "</article>";
      }).join("");
    }

    var omit = document.getElementById("ms-omit-body");
    if (omit && sum && sum.topOmission) {
      omit.innerHTML = table(
        [bi("No.", "號碼"), bi("Missed draws", "遺漏期數")],
        sum.topOmission.slice(0, 12).map(function (r) {
          return "<tr><td>" + ball(r.n) + "</td><td>" + r.missed + "</td></tr>";
        })
      );
    }

    var hist = document.getElementById("ms-history-body");
    if (hist && recent) {
      var list = Array.isArray(recent) ? recent.slice().reverse() : [];
      hist.innerHTML = table(
        [bi("Draw", "期數"), bi("Date", "日期"), bi("Mains + special", "正碼＋特別號")],
        list.map(function (d) {
          return "<tr><td>" + esc(d.drawNo) + "</td><td>" + esc(d.date) +
            '</td><td class="ms-balls">' + balls(d.main) + " + " + ball(d.special) + "</td></tr>";
        })
      );
    }

    var arch = document.getElementById("ms-archive-body");
    if (arch) {
      var items = (archives && archives.items) || [];
      arch.innerHTML = items.map(function (it) {
        return '<button type="button" class="ms-arch-btn" data-file="' + esc(it.file) + '">' +
          esc(it.date) + "</button>";
      }).join(" ") || "<p>—</p>";
      arch.onclick = function (ev) {
        var btn = ev.target.closest("[data-file]");
        if (!btn) return;
        fetchJson(btn.getAttribute("data-file")).then(function (rep) {
          document.getElementById("ms-lanes-body").scrollIntoView({ behavior: "smooth", block: "start" });
          renderMember(bt, rep, sum, recent, archives);
        }).catch(function () {});
      };
    }
  }

  function showDesk(on) {
    var gate = document.getElementById("ms-gate");
    var locked = document.getElementById("ms-locked");
    var desk = document.getElementById("ms-desk");
    if (desk) desk.hidden = !on;
    if (locked) locked.hidden = !!on;
    if (gate) gate.hidden = !!on;
  }

  var loading = false;
  function loadDesk() {
    if (loading) return;
    loading = true;
    showDesk(true);
    Promise.all([
      fetchJson("backtest.json").catch(function () { return null; }),
      fetchJson("summary.json").catch(function () { return null; }),
      fetchJson("latest-report.json").catch(function () { return null; }),
      fetchJson("recent-draws.json").catch(function () { return null; }),
      fetchJson("archive-index.json").catch(function () { return null; })
    ]).then(function (all) {
      var bt = all[0], sum = all[1], report = all[2], recent = all[3], archives = all[4];
      renderBacktest(bt);
      renderPublic(sum);
      renderMember(bt, report, sum, recent, archives);
    }).finally(function () { loading = false; });
  }

  function boot() {
    // Drop any older “remember me” unlock from previous versions.
    try { localStorage.removeItem(KEY_PAID); } catch (e) {}
    openNow = false;
    renderGate();
    showDesk(false);

    var params = new URLSearchParams(location.search);
    if (params.get("paid")) {
      var hint = document.getElementById("ms-pass-hint-paid");
      if (hint) hint.hidden = false;
      try { history.replaceState({}, "", "marksix.html"); } catch (e) {}
    }

    var form = document.getElementById("ms-pass-form");
    if (form) {
      form.addEventListener("submit", function (ev) {
        ev.preventDefault();
        var err = document.getElementById("ms-pass-err");
        var val = (document.getElementById("ms-pass").value || "").trim();
        if (val === MEMBER_PASSWORD) {
          setUnlocked(true);
          if (err) err.hidden = true;
          loadDesk();
        } else if (err) {
          err.hidden = false;
          err.innerHTML = bi("Wrong password. Pay first, then ask me on WhatsApp.", "密碼不正確。請先付款，再 WhatsApp 向我索取。");
        }
      });
    }
    var logout = document.getElementById("ms-logout");
    if (logout) logout.addEventListener("click", function () {
      setUnlocked(false);
      showDesk(false);
      var pass = document.getElementById("ms-pass");
      if (pass) pass.value = "";
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
