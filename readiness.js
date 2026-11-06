/* Listing-readiness self-check. Runs entirely in the browser; nothing is sent. */
(function () {
  var Q = [
    ["Could your offering attract at least US$25 million of real investor demand?", "你的發行能否吸引不少於 2,500 萬美元的真實投資者需求？"],
    ["Do you have a clear reason to list (what the money is for, brand, shareholder exit)?", "你是否有清楚的上市原因（資金用途、品牌、股東退出）？"],
    ["Can your last two financial years be audited by a PCAOB-registered firm, or has that audit started?", "最近兩個財年的帳目，能否由 PCAOB 註冊會計師審計，或者審計已經開始？"],
    ["Are revenue recognition and related-party transactions clean and easy to explain?", "收入確認和關聯交易是否清楚、容易解釋？"],
    ["Do you have, or can you set up, an offshore holding structure (e.g. Cayman or BVI)?", "你是否已有、或可以搭建離岸控股架構（例如開曼或 BVI）？"],
    ["If you have mainland operations, do you understand the CSRC overseas-listing filing? (No mainland operations: answer Yes.)", "如有內地業務，你是否了解中國證監會境外上市備案？（沒有內地業務請選「是」）"],
    ["Is there someone on the team who can run US-standard financial reporting and disclosure?", "團隊中是否有人能處理美國標準的財務報告和信息披露？"],
    ["Have you budgeted for the yearly cost of being a listed company?", "你是否已預算上市後每年的合規成本？"],
    ["Can you show investors a growth story backed by numbers?", "你能否向投資者展示有數據支持的增長故事？"],
    ["Do you have 12–18 months to prepare, rather than needing to list next quarter?", "你是否有 12 至 18 個月準備，而不是急於下一季上市？"]
  ];
  var GAP = [
    ["Size the raise: work out whether US$25M of demand is realistic, or compare Hong Kong and other venues.", "評估募資規模：US$25M 需求是否實際，或比較港股及其他市場。"],
    ["Write down why you are listing; it decides the venue and the structure.", "先寫清楚上市原因；它決定上市地點和架構。"],
    ["Start the PCAOB audit early; it is usually the longest step.", "盡早開始 PCAOB 審計；這通常是最花時間的一步。"],
    ["Clean up revenue recognition and related-party dealings before the auditors arrive.", "在核數師進場前，整理收入確認和關聯交易。"],
    ["Plan the offshore holding structure with counsel.", "與律師規劃離岸控股架構。"],
    ["Map the CSRC filing into your timetable.", "把中國證監會備案納入時間表。"],
    ["Line up a CFO or adviser with US reporting experience.", "安排有美國財務報告經驗的 CFO 或顧問。"],
    ["Budget the annual audit, legal, disclosure and investor-relations costs.", "預算每年的審計、法律、披露及投資者關係費用。"],
    ["Build the equity story: three numbers that show growth.", "建立股權故事：三個能證明增長的數字。"],
    ["Give the process 12–18 months; rushed listings arrive underprepared.", "預留 12 至 18 個月；趕急的上市往往準備不足。"]
  ];
  var OPT = [["yes", "Yes", "是", 2], ["unsure", "Not sure", "不確定", 1], ["no", "No", "否", 0]];
  function bi(en, zh) { return '<span lang="en">' + en + '</span><span lang="zh-Hant">' + zh + '</span>'; }

  var list = document.getElementById("rc-list");
  var form = document.getElementById("rc-form");
  var out = document.getElementById("rc-result");
  if (!list || !form || !out) return;

  list.innerHTML = Q.map(function (q, i) {
    return '<li class="rc-q"><p class="rc-text">' + bi(q[0], q[1]) + '</p><div class="rc-opts" role="radiogroup">' +
      OPT.map(function (o) {
        return '<label class="rc-opt"><input type="radio" name="q' + i + '" value="' + o[0] + '"> ' + bi(o[1], o[2]) + '</label>';
      }).join("") + '</div></li>';
  }).join("");

  form.addEventListener("reset", function () { out.hidden = true; out.innerHTML = ""; });
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var score = 0, gaps = [], missing = 0;
    Q.forEach(function (_, i) {
      var c = form.querySelector('input[name="q' + i + '"]:checked');
      if (!c) { missing++; gaps.push(i); return; }
      var o = OPT.filter(function (x) { return x[0] === c.value; })[0];
      score += o[3];
      if (o[3] < 2) gaps.push(i);
    });
    var level;
    if (score >= 16) level = bi("Well prepared. It makes sense to start talking to underwriters, counsel and auditors.", "準備度高。可以開始與承銷商、律師和核數師商談。");
    else if (score >= 9) level = bi("A solid base, with gaps to close first.", "有基礎，但要先補上缺口。");
    else level = bi("Build the foundations first, and compare other venues before committing to a US listing.", "建議先打好基礎，並在決定赴美上市前比較其他市場。");
    var wa = "https://wa.me/85298229572?text=" + encodeURIComponent("Hi Tyler, I did the listing readiness check on your website (score " + score + "/20). Could we talk? / 你好，我做了網站的上市準備自我評估（" + score + "/20 分），想約時間傾傾。");
    out.innerHTML =
      '<p class="kicker">' + bi("Your result", "你的結果") + '</p>' +
      '<p class="rc-score">' + score + '<span>/20</span></p>' +
      '<p class="rc-level">' + level + '</p>' +
      (missing ? '<p class="rc-miss">' + bi(missing + " question(s) left blank count as gaps.", "有 " + missing + " 條未作答，已當作缺口。") + '</p>' : "") +
      (gaps.length ? '<h3>' + bi("What to work on", "要處理的地方") + '</h3><ul>' + gaps.map(function (i) { return '<li>' + bi(GAP[i][0], GAP[i][1]) + '</li>'; }).join("") + '</ul>' : "") +
      '<div class="hero-cta"><a class="btn btn-gold" href="' + wa + '" target="_blank" rel="noopener">' + bi("Discuss my result on WhatsApp", "WhatsApp 傾傾我的結果") + '</a>' +
      '<a class="btn rc-reset" href="contact.html#book">' + bi("Book a 30-minute call", "預約 30 分鐘通話") + '</a></div>';
    out.hidden = false;
    out.scrollIntoView({ behavior: "smooth", block: "start" });
  });
})();
