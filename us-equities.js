/* Interactive, illustrative walkthroughs of a US IPO and an M&A process (general information only). */
(function () {
  'use strict';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function L(en, zh) { return '<span lang="en">' + en + '</span><span lang="zh-Hant">' + zh + '</span>'; }

  var STEPS = {
    ipo: [
      { t: ['Readiness', '上市準備評估'], d: ['Assess the business, financial track record, governance and equity story; compare listing routes and venues.', '評估業務、財務往績、公司管治及投資故事；比較上市途徑及交易所。'],
        p: ['Management, advisers', '管理層、顧問'], k: ['Readiness gap list, route options', '差距清單、上市途徑比較'], h: ['Initial assessment and route comparison', '初步評估及途徑比較'] },
      { t: ['Restructuring', '上市前重組'], d: ['Set up the listing vehicle (often an offshore holding company), clean up the shareholding and option plans. Issuers with mainland China operations also plan for the CSRC overseas-listing filing.', '設立上市主體（通常為離岸控股公司），整理股權及期權安排。業務在中國內地的發行人亦須規劃中國證監會境外上市備案。'],
        p: ['Legal counsel, tax advisers', '律師、稅務顧問'], k: ['Group structure chart, shareholder documents', '集團架構圖、股東文件'], h: ['Coordination with counsel on structure and timetable', '與律師協調架構及時間表'] },
      { t: ['Audit', '審計'], d: ['Audited financial statements by a PCAOB-registered firm, under US GAAP or IFRS as issued by the IASB. Emerging growth companies may present two years of audited financials.', '由 PCAOB 註冊的會計師事務所審計，採用美國會計準則或 IASB 頒佈的國際財務報告準則。新興成長公司可提交兩年經審計財務報表。'],
        p: ['Auditor, finance team', '審計師、財務團隊'], k: ['Audited financials, internal controls review', '經審計財務報表、內控檢視'], h: ['Keeping the audit workstream on schedule', '跟進審計進度'] },
      { t: ['Assemble team', '組建團隊'], d: ['Appoint underwriter(s), US and home-market counsel, auditor, financial printer and investor-relations support.', '委任承銷商、美國及本地律師、審計師、財經印刷商及投資者關係支援。'],
        p: ['Underwriters, counsel, auditor', '承銷商、律師、審計師'], k: ['Engagement letters, working-group list', '委聘書、工作小組名單'], h: ['Introductions and coordination with service providers', '引薦及協調各中介機構'] },
      { t: ['Draft F-1', '起草 F-1'], d: ['Draft the registration statement (Form F-1 for foreign private issuers): business, risk factors, MD&A and financials. A draft can be submitted to the SEC confidentially.', '起草註冊聲明（外國私人發行人使用 F-1 表格）：業務、風險因素、管理層討論與分析及財務資料。草稿可保密遞交 SEC。'],
        p: ['Counsel, company, underwriters', '律師、公司、承銷商'], k: ['Draft registration statement (DRS)', '註冊聲明草稿（DRS）'], h: ['Equity story and project management', '投資故事及項目管理'] },
      { t: ['SEC review', 'SEC 審閱'], d: ['The SEC issues comment letters; the company responds and amends, usually over several rounds. After confidential review, the filing is made public at least 15 days before the roadshow.', 'SEC 發出意見函，公司回覆並修訂，通常需數輪。保密審閱後，須於路演最少 15 日前公開提交。'],
        p: ['SEC, counsel, auditor', 'SEC、律師、審計師'], k: ['Comment responses, amendments', '意見回覆、修訂稿'], h: ['Tracking responses across the working group', '跟進工作小組回覆'] },
      { t: ['Exchange approval', '交易所審批'], d: ['Apply to list on Nasdaq or NYSE and confirm the applicable listing standards; complete any home-market regulatory filings.', '向納斯達克或紐交所申請上市，確認適用的上市標準；完成本地監管備案。'],
        p: ['Exchange, counsel', '交易所、律師'], k: ['Listing application, ticker reservation', '上市申請、股票代碼預留'], h: ['Venue liaison and checklist management', '交易所聯絡及清單管理'] },
      { t: ['Roadshow', '路演'], d: ['Management presents to institutional investors; underwriters build the order book within a price range.', '管理層向機構投資者推介；承銷商在價格區間內建立認購簿。'],
        p: ['Management, underwriters, investors', '管理層、承銷商、投資者'], k: ['Roadshow deck, preliminary prospectus', '路演簡報、初步招股書'], h: ['Preparing management and investor materials', '協助準備管理層及投資者材料'] },
      { t: ['Pricing & listing', '定價及上市'], d: ['The registration statement is declared effective, the offering is priced and shares begin trading. Pre-IPO holders are typically subject to a lock-up, commonly 180 days.', 'SEC 宣佈註冊聲明生效，發行定價，股份開始交易。上市前股東一般受禁售期約束，常見為 180 日。'],
        p: ['Underwriters, exchange', '承銷商、交易所'], k: ['Final prospectus, closing', '最終招股書、交割'], h: ['Coordinating listing-day logistics', '協調上市當日安排'] },
      { t: ['Public company', '上市後'], d: ['Ongoing reporting (for foreign private issuers, annual 20-F and current 6-K reports), Sarbanes-Oxley internal controls, governance and investor relations.', '持續披露（外國私人發行人提交年度 20-F 及即時 6-K 報告）、薩班斯法案內控、公司管治及投資者關係。'],
        p: ['Board, finance, IR', '董事會、財務、投資者關係'], k: ['20-F, 6-K, IR calendar', '20-F、6-K、投資者關係日程'], h: ['Ongoing capital-markets support', '持續的資本市場支援'] }
    ],
    ma: [
      { t: ['Strategy', '策略'], d: ['Define why a deal makes sense: growth, capability, market access or a route to the public markets.', '釐清交易目的：增長、能力、市場准入或上市途徑。'],
        p: ['Board, management', '董事會、管理層'], k: ['Deal thesis, criteria', '交易論點、篩選準則'], h: ['Framing objectives and criteria', '梳理目標及準則'] },
      { t: ['Screening', '篩選'], d: ['Identify and approach potential targets or buyers that fit the criteria, under confidentiality.', '在保密前提下，物色並接觸符合準則的目標或買家。'],
        p: ['Advisers, counterparties', '顧問、交易對手'], k: ['Long / short list, NDA', '長短名單、保密協議'], h: ['Market mapping and introductions', '市場梳理及引薦'] },
      { t: ['Valuation & LOI', '估值及意向書'], d: ['Preliminary valuation and key terms, captured in a letter of intent or term sheet.', '初步估值及主要條款，以意向書或條款清單確認。'],
        p: ['Both parties, advisers', '雙方、顧問'], k: ['Valuation range, LOI', '估值區間、意向書'], h: ['Supporting valuation discussions', '協助估值討論'] },
      { t: ['Due diligence', '盡職審查'], d: ['Financial, legal, tax, commercial and technical review to confirm value and surface risks.', '財務、法律、稅務、商業及技術審查，確認價值並識別風險。'],
        p: ['Accountants, counsel, specialists', '會計師、律師、專家'], k: ['Data room, DD reports', '資料室、盡職審查報告'], h: ['Running the diligence workstreams', '統籌盡職審查'] },
      { t: ['Structuring & SPA', '架構及協議'], d: ['Agree deal structure, consideration and financing; negotiate the definitive agreement.', '確定交易架構、對價及融資；談判最終協議。'],
        p: ['Counsel, financiers', '律師、融資方'], k: ['SPA / merger agreement', '買賣協議／合併協議'], h: ['Coordinating negotiation workstreams', '協調談判工作'] },
      { t: ['Approvals & closing', '審批及交割'], d: ['Obtain shareholder and regulatory approvals where required, satisfy conditions and close.', '按需要取得股東及監管批准，滿足交割條件後完成交割。'],
        p: ['Regulators, shareholders', '監管機構、股東'], k: ['Approvals, closing checklist', '批文、交割清單'], h: ['Closing checklist management', '交割清單管理'] },
      { t: ['Integration', '整合'], d: ['Combine people, systems and operations so the expected value is actually realised.', '整合人員、系統及營運，令預期價值得以實現。'],
        p: ['Management teams', '雙方管理層'], k: ['100-day plan', '百日計劃'], h: ['Post-deal follow-through', '交易後跟進'] }
    ]
  };

  document.querySelectorAll('.path-ui').forEach(function (ui) {
    var steps = STEPS[ui.getAttribute('data-steps')];
    var track = ui.querySelector('.path-track'), detail = ui.querySelector('.path-detail');
    var bar = ui.querySelector('.path-progress i'), playBtn = ui.querySelector('.path-play');
    var cur = 0, timer = null;

    steps.forEach(function (s, i) {
      var li = document.createElement('li');
      li.innerHTML = '<button type="button"><span class="n">' + (i + 1) + '</span><span class="l">' + L(s.t[0], s.t[1]) + '</span></button>';
      li.querySelector('button').addEventListener('click', function () { stop(); show(i); });
      track.appendChild(li);
    });

    function show(i) {
      cur = i;
      var s = steps[i];
      track.querySelectorAll('li').forEach(function (li, j) {
        li.classList.toggle('done', j < i);
        li.classList.toggle('cur', j === i);
        li.querySelector('button').setAttribute('aria-current', j === i ? 'step' : 'false');
      });
      bar.style.width = ((i + 1) / steps.length * 100) + '%';
      detail.classList.remove('in');
      void detail.offsetWidth;
      detail.innerHTML =
        '<p class="pd-k">' + L('Stage ' + (i + 1) + ' of ' + steps.length, '第 ' + (i + 1) + ' 步，共 ' + steps.length + ' 步') + '</p>' +
        '<h3>' + L(s.t[0], s.t[1]) + '</h3>' +
        '<p class="pd-d">' + L(s.d[0], s.d[1]) + '</p>' +
        '<dl class="pd-grid">' +
          '<div><dt>' + L('Key parties', '主要參與方') + '</dt><dd>' + L(s.p[0], s.p[1]) + '</dd></div>' +
          '<div><dt>' + L('Key outputs', '主要成果') + '</dt><dd>' + L(s.k[0], s.k[1]) + '</dd></div>' +
          '<div class="help"><dt>' + L('Where I can help', '我可以協助') + '</dt><dd>' + L(s.h[0], s.h[1]) + '</dd></div>' +
        '</dl>';
      detail.classList.add('in');
      var active = track.children[i];
      if (active && track.scrollWidth > track.clientWidth) track.scrollTo({ left: active.offsetLeft - track.clientWidth / 2 + active.clientWidth / 2, behavior: reduce ? 'auto' : 'smooth' });
    }
    function stop() { clearInterval(timer); timer = null; ui.classList.remove('playing'); }
    function play() {
      if (timer) { stop(); return; }
      ui.classList.add('playing');
      if (cur >= steps.length - 1) show(0);
      timer = setInterval(function () {
        if (cur >= steps.length - 1) { stop(); return; }
        show(cur + 1);
      }, reduce ? 800 : 2600);
    }
    playBtn.addEventListener('click', play);
    show(0);

    if ('IntersectionObserver' in window && !reduce) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { io.disconnect(); if (!timer) play(); } });
      }, { threshold: 0.45 });
      io.observe(ui);
    }
  });
})();
