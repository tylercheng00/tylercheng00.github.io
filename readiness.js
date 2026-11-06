/* Listing-readiness self-check with a paid full report.
 *
 * Everything runs in the browser: answers are kept in localStorage only so the
 * report can be rebuilt after the visitor comes back from Stripe Checkout.
 *
 * SETUP (see README): create a Stripe Payment Link and set its "After payment"
 * redirect to
 *   https://tylercheng00.github.io/listing-readiness.html?paid={CHECKOUT_SESSION_ID}
 * then paste the link below. While STRIPE_LINK is empty the unlock button asks
 * for the report on WhatsApp instead.
 *
 * NOTE: there is no server, so the unlock is not verified against Stripe; a
 * visitor who knows the URL format could open the report without paying.
 * Check Stripe's dashboard for real sales.
 */
(function () {
  var STRIPE_LINK = "";                        // e.g. "https://buy.stripe.com/xxxxxxxx"
  var PRICE = ["HK$980", "HK$980"];             // shown on the button [en, zh]
  var WA = "85298229572";
  var KEY_STATE = "rc-state", KEY_PAID = "rc-paid";
  // Inside the Android app (Google Play) the full report is not sold: Play only allows
  // its own billing for digital content, so the app offers the free check and the call.
  var APP = !!window.RC_APP;
  try { APP = APP || sessionStorage.getItem("rc-app") === "1" || matchMedia("(display-mode: standalone)").matches; } catch (e) {}

  // [en, zh, dimension]
  var Q = [
    ["Could your offering attract at least US$25 million of real investor demand?", "你的發行能否吸引不少於 2,500 萬美元的真實投資者需求？", 0],
    ["Do you have a clear reason to list (what the money is for, brand, shareholder exit)?", "你是否有清楚的上市原因（資金用途、品牌、股東退出）？", 0],
    ["Can your last two financial years be audited by a PCAOB-registered firm, or has that audit started?", "最近兩個財年的帳目，能否由 PCAOB 註冊會計師審計，或者審計已經開始？", 1],
    ["Are revenue recognition and related-party transactions clean and easy to explain?", "收入確認和關聯交易是否清楚、容易解釋？", 1],
    ["Do you have, or can you set up, an offshore holding structure (e.g. Cayman or BVI)?", "你是否已有、或可以搭建離岸控股架構（例如開曼或 BVI）？", 2],
    ["If you have mainland operations, do you understand the CSRC overseas-listing filing? (No mainland operations: answer Yes.)", "如有內地業務，你是否了解中國證監會境外上市備案？（沒有內地業務請選「是」）", 2],
    ["Is there someone on the team who can run US-standard financial reporting and disclosure?", "團隊中是否有人能處理美國標準的財務報告和信息披露？", 3],
    ["Have you budgeted for the yearly cost of being a listed company?", "你是否已預算上市後每年的合規成本？", 3],
    ["Can you show investors a growth story backed by numbers?", "你能否向投資者展示有數據支持的增長故事？", 0],
    ["Do you have 12–18 months to prepare, rather than needing to list next quarter?", "你是否有 12 至 18 個月準備，而不是急於下一季上市？", 4]
  ];
  var DIM = [
    ["Market & equity story", "市場與股權故事"],
    ["Financials & audit", "財務與審計"],
    ["Structure & regulation", "架構與監管"],
    ["Team & running costs", "團隊與營運成本"],
    ["Timing", "時間"]
  ];
  var OPT = [["yes", "Yes", "是", 2], ["unsure", "Not sure", "不確定", 1], ["no", "No", "否", 0]];
  var SECTOR = [["", "Choose…", "請選擇…"], ["biotech", "Biotech / healthcare", "生物科技 / 醫療"], ["tech", "Technology", "科技"],
    ["consumer", "Consumer / retail", "消費 / 零售"], ["industrial", "Industrial / other", "工業 / 其他"]];
  var OPS = [["", "Choose…", "請選擇…"], ["cn", "Mainland China", "中國內地"], ["hk", "Hong Kong / Macau", "香港 / 澳門"], ["other", "Elsewhere", "其他地區"]];

  /* Full-report content for each question (review before selling):
     [title, why it matters, [steps], typical time, phase 0-3]  each as [en, zh] */
  var FIX = [
    { t: ["Size the raise against the US$25M floor", "按 2,500 萬美元門檻評估募資規模"],
      why: ["Nasdaq now expects companies mainly operating in mainland China, Hong Kong or Macau to raise at least US$25M in a firm-commitment IPO. Underwriters will only commit if they can see that demand. Below it, the US route is effectively closed for now.",
            "納斯達克現要求主要業務在中國內地、香港或澳門的公司，以全額包銷方式募資至少 2,500 萬美元。承銷商只會在看得到需求時才承諾包銷；達不到的話，赴美之路目前基本上走不通。"],
      steps: [["Work out a realistic valuation range from listed peers, and what 15–25% of it would raise.", "參考已上市同業估算合理估值區間，並計算 15–25% 股份可募得多少。"],
              ["List the anchor and cornerstone investors who could realistically commit, and ask early.", "列出可能承諾認購的基石及錨定投資者，並及早接觸。"],
              ["If the number falls short, compare HKEX Main Board, GEM or a pre-IPO round first.", "如果數字不夠，先比較港交所主板、GEM 或先做 pre-IPO 融資。"]],
      time: ["1–2 months", "1–2 個月"], phase: 0 },
    { t: ["Write down why you are listing", "寫清楚上市原因"],
      why: ["The reason decides the venue, the size of the raise and the structure. Investors and the regulator will both ask, and a vague answer reads as a company that does not need the money.",
            "上市原因決定上市地點、募資規模及架構。投資者和監管機構都會問；含糊的答案會令人覺得公司其實不需要這筆錢。"],
      steps: [["Write a one-page use-of-proceeds plan with amounts and milestones.", "寫一頁資金用途計劃，列明金額和里程碑。"],
              ["Agree with the main shareholders on lock-ups and whether anyone is selling.", "與主要股東就禁售期及會否出售舊股達成共識。"],
              ["Check that listing beats the alternatives (private round, trade sale, debt).", "確認上市比其他選擇（私募、出售公司、債務融資）更好。"]],
      time: ["2–4 weeks", "2–4 星期"], phase: 0 },
    { t: ["Start the PCAOB audit early", "盡早開始 PCAOB 審計"],
      why: ["A US IPO needs two years of financial statements audited under PCAOB standards (US GAAP or IFRS). It is usually the longest single step, and a first audit often finds issues that take months to fix.",
            "赴美 IPO 需要兩年按 PCAOB 準則審計的財務報表（US GAAP 或 IFRS）。這通常是最花時間的一步，首次審計往往會發現要花幾個月才能修正的問題。"],
      steps: [["Shortlist two or three PCAOB-registered firms with experience in your sector and region.", "挑選兩至三家有你行業及地區經驗的 PCAOB 註冊會計師事務所。"],
              ["Run a pre-audit health check on the latest year before signing the engagement.", "簽約前先就最近一年做審計前健康檢查。"],
              ["Choose US GAAP or IFRS now and keep it consistent across both years.", "現在就決定用 US GAAP 或 IFRS，並在兩年內保持一致。"]],
      time: ["4–9 months", "4–9 個月"], phase: 1 },
    { t: ["Clean up revenue recognition and related-party dealings", "整理收入確認和關聯交易"],
      why: ["These are the two areas auditors and the SEC question most. Unclear revenue timing or money flowing to founders' other companies can delay the filing or cut the valuation.",
            "這兩方面是核數師和美國證交會最常追問的。收入確認時點不清，或資金流向創辦人的其他公司，可能延誤申報或拉低估值。"],
      steps: [["Write down a revenue-recognition policy for each product or contract type.", "為每類產品或合約寫下收入確認政策。"],
              ["List every related-party transaction for the last two years and end or formalise each one.", "列出過去兩年所有關聯交易，逐一終止或以正式合約規範。"],
              ["Separate personal and company bank accounts and expenses completely.", "徹底分開個人與公司的銀行戶口和開支。"]],
      time: ["2–4 months", "2–4 個月"], phase: 1 },
    { t: ["Plan the offshore holding structure", "規劃離岸控股架構"],
      why: ["Most Hong Kong and mainland companies list in the US through a Cayman (often with BVI and Hong Kong layers) holding company. Restructuring touches tax, foreign-exchange registration and shareholder approvals, so it takes time.",
            "大多數香港及內地公司透過開曼控股公司（通常配合 BVI 和香港中間層）赴美上市。重組涉及稅務、外匯登記及股東批准，需要時間。"],
      steps: [["Have counsel draw the target structure and the steps to get there.", "請律師畫出目標架構及重組步驟。"],
              ["Get tax advice on the share transfers before anything moves.", "在任何股權轉移前取得稅務意見。"],
              ["For mainland shareholders, plan the SAFE Circular 37 registrations.", "如有內地股東，規劃外匯局 37 號文登記。"]],
      time: ["3–6 months", "3–6 個月"], phase: 1 },
    { t: ["Map the CSRC filing into your timetable", "把中國證監會備案納入時間表"],
      why: ["Since 2023, companies with mainland operations must file with the CSRC for an overseas listing. Data-security and cybersecurity reviews can also apply. Missing this stalls the deal late in the process.",
            "自 2023 年起，有內地業務的公司境外上市須向中國證監會備案，亦可能涉及數據安全及網絡安全審查。忽略這一步，交易會在後期卡住。"],
      steps: [["Confirm with PRC counsel whether the filing applies and what it needs.", "與中國律師確認是否須備案及所需材料。"],
              ["Check whether your data handling triggers a cybersecurity review.", "檢查你的數據處理是否觸發網絡安全審查。"],
              ["Build the filing window (often 3+ months) into the timetable.", "在時間表中預留備案時間（通常 3 個月以上）。"]],
      time: ["3–6 months, alongside the audit", "3–6 個月，可與審計同步"], phase: 2 },
    { t: ["Line up a CFO with US reporting experience", "安排有美國財務報告經驗的 CFO"],
      why: ["After listing you file quarterly and annual reports and must keep internal controls in place. Investors and underwriters look closely at who signs the numbers.",
            "上市後要定期提交中期及年度報告，並維持內部監控。投資者和承銷商會仔細看由誰簽署財務數字。"],
      steps: [["Hire or retain a CFO or financial controller with SEC filing experience.", "聘請或委任有美國證交會申報經驗的 CFO 或財務總監。"],
              ["Set up a monthly close that finishes within 15 business days.", "建立 15 個工作天內完成的月結流程。"],
              ["Plan the board: independent directors and an audit committee.", "規劃董事會：獨立董事及審計委員會。"]],
      time: ["2–4 months to hire", "招聘需 2–4 個月"], phase: 1 },
    { t: ["Budget the yearly cost of being listed", "預算上市後每年的成本"],
      why: ["Audit, legal, D&O insurance, investor relations and exchange fees continue every year after listing. Companies that did not plan for them often regret listing.",
            "審計、法律、董事責任保險、投資者關係及交易所年費，在上市後每年都要支付。沒有預算的公司往往後悔上市。"],
      steps: [["Get quotes for the yearly audit, counsel and D&O insurance.", "就年度審計、法律顧問及董事責任保險索取報價。"],
              ["Add investor-relations and reporting staff to the plan.", "在預算中加入投資者關係及申報人員。"],
              ["Check that profits or the raise cover at least three years of these costs.", "確認利潤或募資至少能支付三年的這些成本。"]],
      time: ["2–4 weeks", "2–4 星期"], phase: 0 },
    { t: ["Build the equity story", "建立股權故事"],
      why: ["Investors buy a growth story they can check. Three clear numbers (for example revenue growth, margin and customer retention) do more than a long deck.",
            "投資者買的是可以核實的增長故事。三個清楚的數字（例如收入增長、毛利率及客戶留存率）比冗長的簡報更有用。"],
      steps: [["Pick the three numbers that best show growth and track them monthly.", "選出最能證明增長的三個數字，每月追蹤。"],
              ["Write a one-page story: market, why you win, what the money does.", "寫一頁故事：市場、你為何能贏、資金用來做甚麼。"],
              ["Test it on two or three investors before the roadshow.", "在路演前先向兩三位投資者試講。"]],
      time: ["1–2 months", "1–2 個月"], phase: 2 },
    { t: ["Give the process 12–18 months", "預留 12 至 18 個月"],
      why: ["Audit, restructuring, filings and SEC comments run in sequence. Rushed listings arrive underprepared and often price lower or get pulled.",
            "審計、重組、備案及回覆美國證交會意見是一步接一步的。趕急的上市往往準備不足，定價偏低甚至撤回。"],
      steps: [["Work backwards from the target listing window to today.", "由目標上市時間倒推到今天。"],
              ["Agree internal deadlines for each workstream and one owner for each.", "為每項工作訂下內部限期，並指定負責人。"],
              ["Keep a buffer of at least one quarter for SEC comments.", "預留至少一季回覆美國證交會意見。"]],
      time: ["Planning: 2 weeks", "規劃：2 星期"], phase: 0 }
  ];

  var PHASE = [
    [["Months 0–3: decide and plan", "第 0–3 個月：決策與規劃"], [["Appoint lead counsel and an audit firm", "委任主要律師及審計師"], ["Fix the target venue and timetable", "確定上市地點及時間表"]]],
    [["Months 3–9: audit, structure, team", "第 3–9 個月：審計、架構、團隊"], [["Fieldwork on two years of audited accounts", "兩年帳目審計"], ["Board and audit committee in place", "董事會及審計委員會到位"]]],
    [["Months 9–14: filings", "第 9–14 個月：申報"], [["Draft the registration statement (F-1)", "草擬註冊聲明（F-1）"], ["Confidential submission and SEC comments", "保密遞交及回覆美國證交會意見"]]],
    [["Months 14–18: marketing and listing", "第 14–18 個月：推廣與上市"], [["Analyst education and roadshow", "分析員簡介會及路演"], ["Pricing, allocation and first day of trading", "定價、分配及首日交易"]]]
  ];

  var DOCS = [
    ["Two years of audited financial statements (PCAOB)", "兩年經審計財務報表（PCAOB）"],
    ["Latest interim accounts and management accounts", "最新中期帳目及管理帳"],
    ["Group structure chart and all constitutional documents", "集團架構圖及所有公司章程文件"],
    ["Cap table, share history and option plan", "股權表、股份變動記錄及期權計劃"],
    ["Material contracts (top customers, suppliers, loans)", "重大合約（主要客戶、供應商、貸款）"],
    ["Licences, permits and IP registrations", "牌照、許可證及知識產權登記"],
    ["Related-party transaction register", "關聯交易登記冊"],
    ["Litigation and regulatory correspondence", "訴訟及監管往來文件"],
    ["Directors' and officers' CVs and declarations", "董事及高管履歷及聲明"],
    ["Business plan, forecasts and use of proceeds", "業務計劃、預測及資金用途"]
  ];

  function bi(en, zh) { return '<span lang="en">' + en + '</span><span lang="zh-Hant">' + zh + '</span>'; }
  function b(p) { return bi(p[0], p[1]); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return "&#" + c.charCodeAt(0) + ";"; }); }
  function store(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function load(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }

  var list = document.getElementById("rc-list");
  var form = document.getElementById("rc-form");
  var out = document.getElementById("rc-result");
  if (!list || !form || !out) return;

  function opts(a) { return a.map(function (o) { return '<option value="' + o[0] + '">' + o[1] + " / " + o[2] + "</option>"; }).join(""); }
  var sel = document.getElementById("rc-sector"); if (sel) sel.innerHTML = opts(SECTOR);
  sel = document.getElementById("rc-ops"); if (sel) sel.innerHTML = opts(OPS);

  list.innerHTML = Q.map(function (q, i) {
    return '<li class="rc-q"><p class="rc-text">' + bi(q[0], q[1]) + '</p><div class="rc-opts" role="radiogroup">' +
      OPT.map(function (o) {
        return '<label class="rc-opt"><input type="radio" name="q' + i + '" value="' + o[0] + '"> ' + bi(o[1], o[2]) + '</label>';
      }).join("") + '</div></li>';
  }).join("");

  function readForm() {
    var st = { a: [], company: (form.company && form.company.value || "").trim(),
               sector: form.sector ? form.sector.value : "", ops: form.ops ? form.ops.value : "" };
    Q.forEach(function (_, i) { var c = form.querySelector('input[name="q' + i + '"]:checked'); st.a.push(c ? c.value : ""); });
    return st;
  }
  function fillForm(st) {
    if (form.company) form.company.value = st.company || "";
    if (form.sector) form.sector.value = st.sector || "";
    if (form.ops) form.ops.value = st.ops || "";
    (st.a || []).forEach(function (v, i) { var r = form.querySelector('input[name="q' + i + '"][value="' + v + '"]'); if (r) r.checked = true; });
  }
  function analyse(st) {
    var score = 0, gaps = [], missing = 0, dim = DIM.map(function () { return [0, 0]; });
    Q.forEach(function (q, i) {
      var o = OPT.filter(function (x) { return x[0] === st.a[i]; })[0];
      var pts = o ? o[3] : 0;
      if (!o) missing++;
      score += pts; dim[q[2]][0] += pts; dim[q[2]][1] += 2;
      if (pts < 2) gaps.push(i);
    });
    // "No" before "Not sure", then by phase so the first fixes come first
    gaps.sort(function (x, y) { return (st.a[x] === "unsure") - (st.a[y] === "unsure") || FIX[x].phase - FIX[y].phase || x - y; });
    return { score: score, gaps: gaps, missing: missing, dim: dim };
  }
  function levelText(score) {
    if (score >= 16) return bi("Well prepared. It makes sense to start talking to underwriters, counsel and auditors.", "準備度高。可以開始與承銷商、律師和核數師商談。");
    if (score >= 9) return bi("A solid base, with gaps to close first.", "有基礎，但要先補上缺口。");
    return bi("Build the foundations first, and compare other venues before committing to a US listing.", "建議先打好基礎，並在決定赴美上市前比較其他市場。");
  }
  function bars(r) {
    return '<div class="rc-dims">' + DIM.map(function (d, k) {
      var pct = Math.round(100 * r.dim[k][0] / r.dim[k][1]);
      return '<div class="rc-dim"><span class="rc-dim-name">' + b(d) + '</span><span class="rc-bar"><span style="width:' + pct + '%"></span></span><span class="rc-dim-pct">' + pct + '%</span></div>';
    }).join("") + '</div>';
  }
  function waLink(score, full) {
    var t = full ? "Hi Tyler, I'd like the full listing readiness report (my score: " + score + "/20). / 你好，我想購買上市準備度完整報告（" + score + "/20 分）。"
                 : "Hi Tyler, I did the listing readiness check on your website (score " + score + "/20). Could we talk? / 你好，我做了網站的上市準備自我評估（" + score + "/20 分），想約時間傾傾。";
    return "https://wa.me/" + WA + "?text=" + encodeURIComponent(t);
  }

  function renderFree(st) {
    var r = analyse(st);
    var unlock = STRIPE_LINK
      ? '<button type="button" class="btn btn-gold" id="rc-buy">' + bi("Unlock the full report · " + PRICE[0], "解鎖完整報告 · " + PRICE[1]) + '</button>'
      : '<a class="btn btn-gold" href="' + waLink(r.score, true) + '" target="_blank" rel="noopener">' + bi("Request the full report", "索取完整報告") + '</a>';
    if (APP) unlock = "";
    out.innerHTML =
      '<p class="kicker">' + bi("Your result", "你的結果") + '</p>' +
      '<p class="rc-score">' + r.score + '<span>/20</span></p>' +
      '<p class="rc-level">' + levelText(r.score) + '</p>' +
      (r.missing ? '<p class="rc-miss">' + bi(r.missing + " question(s) left blank count as gaps.", "有 " + r.missing + " 條未作答，已當作缺口。") + '</p>' : "") +
      bars(r) +
      (r.gaps.length ? '<h3>' + bi("Your gaps", "你的缺口") + ' (' + r.gaps.length + ')</h3><ul>' + r.gaps.map(function (i) { return '<li>' + b(FIX[i].t) + '</li>'; }).join("") + '</ul>' : "") +
      (APP ? '<div class="rc-pay"><h3>' + bi("Talk it through", "一起討論") + '</h3>' +
        '<p>' + bi("Go through your gaps with Tyler on a 30-minute call: which to fix first, how long it takes and whether the US or Hong Kong suits you better.",
                   "與 Tyler 進行 30 分鐘通話，一起看你的缺口：先處理哪一個、需時多久，以及美國還是香港較適合你。") + '</p>' +
        '<div class="hero-cta"><a class="btn btn-gold" href="contact.html#book">' + bi("Book a 30-minute call", "預約 30 分鐘通話") + '</a>' +
        '<a class="btn rc-reset" href="' + waLink(r.score, false) + '" target="_blank" rel="noopener">WhatsApp</a></div></div>' :
      '<div class="rc-pay">' +
        '<h3>' + bi("Get the full report", "取得完整報告") + '</h3>' +
        '<ul class="rc-incl">' +
          '<li>' + bi("For each gap: why it matters, three concrete steps and how long it usually takes", "每個缺口：為何重要、三個具體步驟及一般所需時間") + '</li>' +
          '<li>' + bi("Your 18-month timetable, with your gaps placed in the right phase", "你的 18 個月時間表，缺口放在對應階段") + '</li>' +
          '<li>' + bi("Nasdaq vs HKEX Main Board vs GEM, compared for your company", "納斯達克、港交所主板、GEM 比較，針對你的公司") + '</li>' +
          '<li>' + bi("A due-diligence document checklist you can tick off", "可逐項剔選的盡職審查文件清單") + '</li>' +
          '<li>' + bi("Save as PDF and share with your board", "可儲存為 PDF，與董事會分享") + '</li>' +
        '</ul>' +
        '<div class="hero-cta">' + unlock +
          '<a class="btn rc-reset" href="contact.html#book">' + bi("Book a 30-minute call", "預約 30 分鐘通話") + '</a></div>' +
        (STRIPE_LINK ? '<p class="rc-miss">' + bi("Secure payment by Stripe. Your answers stay in this browser and the report opens straight after payment.", "由 Stripe 安全付款。答案只留在此瀏覽器，付款後報告即時開啟。") + '</p>' : "") +
      '</div>');
    var buy = document.getElementById("rc-buy");
    if (buy) buy.addEventListener("click", function () {
      store(KEY_STATE, st);
      var lang = document.documentElement.getAttribute("data-lang") === "zh" ? "zh-HK" : "en";
      location.href = STRIPE_LINK + (STRIPE_LINK.indexOf("?") < 0 ? "?" : "&") + "locale=" + lang;
    });
    show(false);
  }

  function venues(st, r) {
    var us = st.a[0] === "yes", bio = st.sector === "biotech";
    var row = function (name, fit, pts) {
      return '<div class="rc-venue"><h4>' + b(name) + ' <span class="rc-fit rc-fit-' + fit[0] + '">' + b(fit[1]) + '</span></h4><ul>' +
        pts.map(function (p) { return '<li>' + b(p) + '</li>'; }).join("") + '</ul></div>';
    };
    var good = ["good", ["Worth a look", "值得考慮"]], maybe = ["maybe", ["Possible", "可以考慮"]], hard = ["hard", ["Hard for now", "目前較難"]];
    var cnhk = st.ops === "cn" || st.ops === "hk";
    return row(["Nasdaq (US)", "納斯達克（美國）"], us && r.score >= 12 ? good : (us ? maybe : hard), [
        [cnhk ? "Your operations fall under the US$25M minimum firm-commitment raise." : "The US$25M minimum applies to companies mainly operating in mainland China, Hong Kong or Macau.",
         cnhk ? "你的業務所在地須符合 2,500 萬美元全額包銷最低募資要求。" : "2,500 萬美元最低要求適用於主要業務在中國內地、香港或澳門的公司。"],
        ["Deepest pool of growth and tech investors; US GAAP/IFRS with PCAOB audit.", "成長股及科技投資者最多；需 US GAAP/IFRS 及 PCAOB 審計。"],
        ["Highest ongoing cost and US litigation exposure.", "持續成本最高，並有美國訴訟風險。"]]) +
      row(["HKEX Main Board", "港交所主板"], r.dim[1][0] >= 3 ? good : maybe, [
        ["Profit test: about HK$80M of profit over three years; or market-cap and revenue tests for larger firms.", "盈利測試：三年累計盈利約 8,000 萬港元；較大公司可用市值及收入測試。"],
        bio ? ["Chapter 18A lets pre-revenue biotech list with a sizeable market cap (around HK$1.5bn) and a core product past early trials.", "第 18A 章容許未有收入的生物科技公司上市，須有相當市值（約 15 億港元）及已通過早期臨床的核心產品。"]
            : ["Chapter 18C covers specialist technology companies with high market caps.", "第 18C 章適用於市值較高的特專科技公司。"],
        ["Close to mainland investors; Stock Connect can bring southbound demand.", "接近內地投資者；港股通可帶來南向資金。"]]) +
      row(["HKEX GEM", "港交所 GEM"], r.score < 9 ? maybe : hard, [
        ["Smaller companies; lower thresholds than the Main Board.", "適合較小公司；門檻低於主板。"],
        ["Liquidity is thin, so it suits a stepping stone rather than a big raise.", "流通量較低，較適合作為跳板而非大額募資。"],
        ["Rules were reformed in 2024; check the current tests.", "規則於 2024 年改革，請查閱最新測試。"]]) +
      '<p class="rc-miss">' + bi("Thresholds are summarised and change over time; confirm the current rules with a sponsor or counsel.", "門檻僅為摘要，並會不時修訂；請向保薦人或律師確認最新規則。") + '</p>';
  }

  function renderFull(st) {
    var r = analyse(st);
    var name = st.company ? esc(st.company) : "";
    var today = new Date().toISOString().slice(0, 10);
    var gapHtml = r.gaps.length ? r.gaps.map(function (i, n) {
      var f = FIX[i];
      return '<article class="rc-gap"><h4><span class="rc-n">' + (n + 1) + '</span>' + b(f.t) +
        ' <span class="rc-tag">' + (st.a[i] === "unsure" ? bi("Check", "待確認") : bi("Gap", "缺口")) + '</span></h4>' +
        '<p>' + b(f.why) + '</p><ol>' + f.steps.map(function (s) { return '<li>' + b(s) + '</li>'; }).join("") + '</ol>' +
        '<p class="rc-time">' + bi("Typical time: ", "一般所需時間：") + b(f.time) + '</p></article>';
    }).join("") : '<p>' + bi("No gaps flagged. Use the timetable below to plan the process.", "沒有缺口。可按下面的時間表規劃流程。") + '</p>';
    var tl = PHASE.map(function (p, k) {
      var mine = r.gaps.filter(function (i) { return FIX[i].phase === k; });
      return '<li><h4>' + b(p[0]) + '</h4><ul>' +
        mine.map(function (i) { return '<li class="rc-mine">' + b(FIX[i].t) + '</li>'; }).join("") +
        p[1].map(function (x) { return '<li>' + b(x) + '</li>'; }).join("") + '</ul></li>';
    }).join("");
    out.innerHTML =
      '<div class="rc-report">' +
      '<header class="rc-rep-head"><p class="kicker">' + bi("Full listing readiness report", "上市準備度完整報告") + '</p>' +
        (name ? '<h2>' + name + '</h2>' : "") + '<p class="rc-miss">' + bi("Prepared ", "編製日期 ") + today + '</p></header>' +
      '<div class="rc-sum"><p class="rc-score">' + r.score + '<span>/20</span></p><p class="rc-level">' + levelText(r.score) + '</p></div>' +
      bars(r) +
      '<h3>' + bi("1. Action plan", "一、行動計劃") + '</h3>' + gapHtml +
      '<h3>' + bi("2. Your 18-month timetable", "二、你的 18 個月時間表") + '</h3><ol class="rc-tl">' + tl + '</ol>' +
      '<p class="rc-miss">' + bi("Your own gaps are highlighted in each phase.", "你的缺口已在各階段標示。") + '</p>' +
      '<h3>' + bi("3. Where to list", "三、上市地點比較") + '</h3>' + venues(st, r) +
      '<h3>' + bi("4. Document checklist", "四、文件清單") + '</h3><ul class="rc-docs">' +
        DOCS.map(function (d, k) { return '<li><label><input type="checkbox" data-doc="' + k + '"> ' + b(d) + '</label></li>'; }).join("") + '</ul>' +
      '<h3>' + bi("5. Next step", "五、下一步") + '</h3>' +
      '<p>' + bi("Bring this report to a 30-minute call and we can go through your top three gaps together.", "帶同這份報告預約 30 分鐘通話，我們可以一起看你最重要的三個缺口。") + '</p>' +
      '<div class="hero-cta rc-noprint"><button type="button" class="btn btn-gold" id="rc-print">' + bi("Save as PDF / print", "儲存為 PDF / 列印") + '</button>' +
        '<a class="btn rc-reset" href="contact.html#book">' + bi("Book a 30-minute call", "預約 30 分鐘通話") + '</a>' +
        '<a class="btn rc-reset" href="' + waLink(r.score, false) + '" target="_blank" rel="noopener">WhatsApp</a>' +
        '<button type="button" class="btn rc-reset" id="rc-edit">' + bi("Change my answers", "修改答案") + '</button></div>' +
      '<p class="rc-note">' + bi("General information only; not investment, legal or accounting advice. Listing rules change: confirm the current rules with your advisers.", "只供一般參考，不構成投資、法律或會計建議。上市規則會修訂，請向你的顧問確認最新規則。") + '</p>' +
      '</div>';
    var done = load("rc-docs") || {};
    Array.prototype.forEach.call(out.querySelectorAll("[data-doc]"), function (c) {
      c.checked = !!done[c.getAttribute("data-doc")];
      c.addEventListener("change", function () { done[c.getAttribute("data-doc")] = c.checked; store("rc-docs", done); });
    });
    document.getElementById("rc-print").addEventListener("click", function () { window.print(); });
    document.getElementById("rc-edit").addEventListener("click", function () {
      document.documentElement.classList.remove("rc-has-report");
      form.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    show(true);
  }

  function show(full) {
    document.documentElement.classList.toggle("rc-has-report", !!full);
    out.hidden = false;
    out.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  form.addEventListener("reset", function () {
    out.hidden = true; out.innerHTML = "";
    document.documentElement.classList.remove("rc-has-report");
    store(KEY_STATE, null);
  });
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var st = readForm();
    store(KEY_STATE, st);
    if (load(KEY_PAID) && !APP) renderFull(st); else renderFree(st);
  });

  // Back from Stripe Checkout: ?paid={CHECKOUT_SESSION_ID}
  var paid = null;
  try { paid = new URLSearchParams(location.search).get("paid"); } catch (e) {}
  if (APP) paid = null;
  if (paid && /^cs_(test|live)_/.test(paid)) {
    store(KEY_PAID, { id: paid, at: Date.now() });
    try { var u = new URL(location.href); u.searchParams.delete("paid"); history.replaceState(null, "", u.pathname + u.search + "#check"); } catch (e) {}
  }
  var saved = load(KEY_STATE);
  if (saved && saved.a) {
    fillForm(saved);
    if (load(KEY_PAID) && !APP) setTimeout(function () { renderFull(saved); }, 0);
  } else if (paid) {
    out.innerHTML = '<p>' + bi("Payment received, thank you. Your answers were not found in this browser: please answer the questions again and press “See my result” to open your full report.",
      "已收到付款，謝謝。此瀏覽器找不到你的答案：請重新作答並按「查看結果」開啟完整報告。") + '</p>';
    out.hidden = false;
  }
})();
