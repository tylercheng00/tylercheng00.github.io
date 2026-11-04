/* Portfolio page: a private, browser-only record of holdings.
   Holdings live in localStorage under STORE; nothing is sent anywhere.
   US stocks, gold, silver and FX rates are priced from data/markets.json
   (tools/fetch_markets.py); anything else uses the price the user enters. */
(function () {
  var root = document.documentElement;
  var STORE = 'portfolio.v1';
  var OZ_G = 31.1034768;                       // grams per troy ounce
  var UNITS = {                                 // troy ounces per unit
    oz: [1, 'troy oz', '金衡安士'],
    g: [1 / OZ_G, 'gram', '克'],
    kg: [1000 / OZ_G, 'kilogram', '公斤'],
    tael: [37.429 / OZ_G, 'tael (HK)', '兩（港制）']
  };
  var TYPES = {
    stock: ['Stocks', '股票'],
    fund: ['Funds & ETFs', '基金及 ETF'],
    gold: ['Gold', '黃金'],
    silver: ['Silver', '白銀'],
    property: ['Property', '物業'],
    cash: ['Cash & deposits', '現金及存款'],
    other: ['Other', '其他']
  };
  var CCYS = { HKD: ['HK dollar', '港元'], USD: ['US dollar', '美元'], CNY: ['Chinese yuan', '人民幣'] };
  var FX_DEFAULT = { USD: 1, HKD: 7.8, CNY: 7.2 };   // units per US dollar

  var $ = function (id) { return document.getElementById(id); };
  if (!$('pfTable')) return;

  /* ---------- state ---------- */
  var state = load();
  var quotes = {};          // symbol -> price (US$)
  var fx = Object.assign({}, FX_DEFAULT);
  var fxLive = false;
  var updated = null;
  var editing = null;

  function load() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(STORE)); } catch (e) {}
    if (!s || !Array.isArray(s.items)) s = { base: 'HKD', items: [], hist: {} };
    if (!CCYS[s.base]) s.base = 'HKD';
    s.hist = s.hist || {};
    return s;
  }
  function save() {
    try { localStorage.setItem(STORE, JSON.stringify(state)); return true; }
    catch (e) { msg('Could not save in this browser (private mode or storage blocked). Export to keep a copy.', '未能儲存於此瀏覽器（私密模式或儲存被封鎖），請匯出備份。'); return false; }
  }

  /* ---------- helpers ---------- */
  function zh() { return root.getAttribute('data-lang') === 'zh'; }
  function t(en, z) { return zh() ? z : en; }
  function bi(en, z) { return '<span lang="en">' + en + '</span><span lang="zh-Hant">' + z + '</span>'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function n(v) { var x = parseFloat(v); return isFinite(x) ? x : null; }
  function money(v, ccy, dec) {
    if (v == null) return '—';
    var d = dec != null ? dec : (Math.abs(v) >= 1000 ? 0 : 2);
    return (v < 0 ? '−' : '') + ({ HKD: 'HK$', USD: 'US$', CNY: '¥' }[ccy] || '') +
      Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  function qtyFmt(v) { return v.toLocaleString('en-US', { maximumFractionDigits: 4 }); }
  function pct(v) { return (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(2) + '%'; }
  function conv(v, from, to) { return v / fx[from] * fx[to]; }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function msg(en, z) { $('pfMsg').innerHTML = en ? bi(esc(en), esc(z)) : ''; }

  /* Live price per unit in the holding's own currency, or null. */
  function livePrice(it) {
    if (it.type === 'cash') return 1;
    var usd = null;
    if (it.type === 'gold' || it.type === 'silver') {
      var spot = quotes[it.type === 'gold' ? 'GOLD' : 'SILVER'];
      if (spot) usd = spot * (UNITS[it.unit] || UNITS.oz)[0];
    } else if (it.symbol && quotes[it.symbol.toUpperCase()]) {
      usd = quotes[it.symbol.toUpperCase()];
    }
    return usd == null ? null : conv(usd, 'USD', it.ccy);
  }
  /* {price, live, value, cost, loan} in the holding's currency */
  function valueOf(it) {
    var manual = n(it.price);
    var live = manual == null ? livePrice(it) : null;
    var price = manual != null ? manual : live;
    var value = price == null ? null : price * (n(it.qty) || 0);
    var cost = it.type === 'cash' ? value : n(it.cost);
    return { price: price, live: live != null, value: value, cost: cost, loan: it.type === 'property' ? (n(it.loan) || 0) : 0 };
  }

  /* ---------- rendering ---------- */
  function render() {
    var base = state.base;
    var tot = { assets: 0, loans: 0, cost: 0, costValue: 0, missing: 0 };
    var byType = {};
    var rows = state.items.map(function (it) {
      var v = valueOf(it);
      var vb = v.value == null ? null : conv(v.value, it.ccy, base);
      if (vb == null) tot.missing++;
      else {
        tot.assets += vb;
        byType[it.type] = (byType[it.type] || 0) + vb;
        if (v.cost != null && it.type !== 'cash') { tot.cost += conv(v.cost, it.ccy, base); tot.costValue += vb; }
      }
      tot.loans += conv(v.loan, it.ccy, base);
      return { it: it, v: v, vb: vb };
    });
    var net = tot.assets - tot.loans;
    var pl = tot.costValue - tot.cost;

    if (state.items.length && !tot.missing) {
      var day = new Date().toISOString().slice(0, 10);
      state.hist[day] = Math.round(conv(net, base, 'USD') * 100) / 100;
      var days = Object.keys(state.hist).sort();
      days.slice(0, Math.max(0, days.length - 730)).forEach(function (d) { delete state.hist[d]; });
      save();
    }

    renderStats(tot, net, pl, base);
    renderAlloc(byType, tot.assets, base);
    renderHist(base);
    renderTable(rows, base);
    renderPrices();
  }

  function stat(label, value, sub, cls) {
    return '<div class="pf-stat"><p class="pf-stat-label">' + label + '</p><p class="pf-stat-val' + (cls ? ' ' + cls : '') + '">' + value + '</p>' + (sub ? '<p class="pf-stat-sub">' + sub + '</p>' : '') + '</div>';
  }
  function renderStats(tot, net, pl, base) {
    var plPct = tot.cost ? pl / tot.cost * 100 : null;
    var cls = pl > 0 ? 'up' : pl < 0 ? 'down' : '';
    $('pfStats').innerHTML =
      stat(bi('Net worth', '淨資產'), money(net, base), tot.missing ? bi(tot.missing + ' holding(s) without a price', tot.missing + ' 項資產未有價格') : '') +
      stat(bi('Total assets', '總資產'), money(tot.assets, base)) +
      stat(bi('Mortgages', '按揭負債'), money(tot.loans ? -tot.loans : 0, base)) +
      stat(bi('Unrealised gain / loss', '未實現盈虧'), money(pl, base), plPct == null ? bi('Add a cost to track this', '輸入成本即可計算') : pct(plPct) + ' ' + bi('on cost', '（按成本）'), cls);
  }

  function renderAlloc(byType, total, base) {
    var keys = Object.keys(TYPES).filter(function (k) { return byType[k] > 0; })
      .sort(function (a, b) { return byType[b] - byType[a]; });
    if (!keys.length) { $('pfAlloc').innerHTML = '<p class="pf-empty">' + bi('Add holdings to see how they are split.', '新增資產後，這裏會顯示分佈。') + '</p>'; return; }
    $('pfAlloc').innerHTML = '<ul class="pf-alloc">' + keys.map(function (k) {
      var share = byType[k] / total * 100;
      return '<li title="' + esc(t(TYPES[k][0], TYPES[k][1]) + ': ' + money(byType[k], base) + ' (' + share.toFixed(1) + '%)') + '">' +
        '<span class="pf-alloc-name">' + bi(TYPES[k][0], TYPES[k][1]) + '</span>' +
        '<span class="pf-alloc-track"><span class="pf-alloc-fill" style="width:' + Math.max(share, 0.6).toFixed(2) + '%"></span></span>' +
        '<span class="pf-alloc-num"><b>' + share.toFixed(1) + '%</b><small>' + money(byType[k], base) + '</small></span></li>';
    }).join('') + '</ul>';
  }

  function renderHist(base) {
    var days = Object.keys(state.hist).sort();
    var host = $('pfHist');
    if (days.length < 2) {
      host.innerHTML = '<p class="pf-empty">' + bi('Your net worth is recorded once a day when you open this page. The line appears from the second day.', '每天打開此頁時會記錄一次淨資產，由第二天起顯示走勢。') + '</p>';
      return;
    }
    var vals = days.map(function (d) { return conv(state.hist[d], 'USD', base); });
    var W = 520, H = 180, P = { l: 4, r: 4, t: 12, b: 22 };
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals), pad = (max - min) * 0.1 || Math.abs(max) * 0.05 || 1;
    min -= pad; max += pad;
    var x = function (i) { return P.l + i / (vals.length - 1) * (W - P.l - P.r); };
    var y = function (v) { return P.t + (1 - (v - min) / (max - min)) * (H - P.t - P.b); };
    var pts = vals.map(function (v, i) { return x(i).toFixed(1) + ',' + y(v).toFixed(1); }).join(' ');
    var last = vals.length - 1;
    var change = vals[last] - vals[0];
    host.innerHTML =
      '<p class="pf-hist-head"><b>' + money(vals[last], base) + '</b> <span class="' + (change >= 0 ? 'up' : 'down') + '">' +
      (change >= 0 ? '+' : '') + money(change, base) + '</span> ' + bi('since ' + days[0], '（自 ' + days[0] + '）') + '</p>' +
      '<div class="pf-hist-box"><svg viewBox="0 0 ' + W + ' ' + H + '" class="pf-hist" role="img" aria-label="' + esc(t('Net worth by day', '每日淨資產')) + '">' +
      '<line x1="0" x2="' + W + '" y1="' + (H - P.b) + '" y2="' + (H - P.b) + '" class="pf-axis"/>' +
      '<polyline points="' + pts + '" class="pf-line"/>' +
      '<circle cx="' + x(last) + '" cy="' + y(vals[last]) + '" r="4" class="pf-dot"/>' +
      '<line class="pf-cross" y1="' + P.t + '" y2="' + (H - P.b) + '" x1="-10" x2="-10"/>' +
      '<circle class="pf-hover" r="4" cx="-10" cy="-10"/>' +
      '<text x="' + P.l + '" y="' + (H - 6) + '" class="pf-tick">' + days[0] + '</text>' +
      '<text x="' + (W - P.r) + '" y="' + (H - 6) + '" class="pf-tick" text-anchor="end">' + days[last] + '</text>' +
      '<rect class="pf-hit" x="0" y="0" width="' + W + '" height="' + H + '"/></svg>' +
      '<div class="pf-tip" hidden></div></div>';
    var svg = host.querySelector('svg'), tip = host.querySelector('.pf-tip');
    var cross = svg.querySelector('.pf-cross'), dot = svg.querySelector('.pf-hover');
    function move(e) {
      var r = svg.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width * W;
      var i = Math.max(0, Math.min(last, Math.round((px - P.l) / (W - P.l - P.r) * last)));
      svg.classList.add('is-hover');
      cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i));
      dot.setAttribute('cx', x(i)); dot.setAttribute('cy', y(vals[i]));
      tip.hidden = false;
      tip.innerHTML = '<small>' + days[i] + '</small><b>' + money(vals[i], base) + '</b>';
      var left = x(i) / W * r.width;
      tip.style.left = Math.min(Math.max(left, 60), r.width - 60) + 'px';
    }
    function out() { tip.hidden = true; svg.classList.remove('is-hover'); }
    svg.addEventListener('pointermove', move);
    svg.addEventListener('pointerdown', move);
    svg.addEventListener('pointerleave', out);
  }

  function renderTable(rows, base) {
    var tbl = $('pfTable');
    tbl.classList.toggle('is-empty', !rows.length);
    if (!rows.length) {
      tbl.innerHTML = '<tbody><tr><td class="pf-empty">' + bi('No holdings yet. Press <b>Add holding</b>, or <b>Load example</b> to see how it works.', '尚未有資產。請按<b>新增資產</b>，或按<b>載入示例</b>看看效果。') + '</td></tr></tbody>';
      return;
    }
    rows.sort(function (a, b) {
      var ta = Object.keys(TYPES).indexOf(a.it.type), tb = Object.keys(TYPES).indexOf(b.it.type);
      return ta - tb || (b.vb || 0) - (a.vb || 0);
    });
    tbl.innerHTML = '<thead><tr><th>' + bi('Holding', '資產') + '</th><th class="r">' + bi('Quantity', '數量') + '</th><th class="r">' + bi('Price', '價格') +
      '</th><th class="r">' + bi('Value', '市值') + ' (' + base + ')</th><th class="r">' + bi('Gain / loss', '盈虧') + '</th><th><span class="sr-only">' + bi('Actions', '操作') + '</span></th></tr></thead><tbody>' +
      rows.map(function (r) {
        var it = r.it, v = r.v;
        var unit = (it.type === 'gold' || it.type === 'silver') ? ' ' + t(UNITS[it.unit || 'oz'][1], UNITS[it.unit || 'oz'][2]) : '';
        var plCell = '—';
        if (it.type !== 'cash' && v.cost != null && v.value != null) {
          var pl = v.value - v.cost;
          plCell = '<span class="' + (pl > 0 ? 'up' : pl < 0 ? 'down' : '') + '">' + money(conv(pl, it.ccy, base), base) +
            (v.cost ? '<small>' + pct(pl / v.cost * 100) + '</small>' : '') + '</span>';
        }
        var priceCell = it.type === 'cash' ? '—' : v.price == null ? '<span class="pf-warn">' + bi('No price', '未有價格') + '</span>' :
          money(v.price, it.ccy) + (v.live ? '<small>' + bi('Live (delayed)', '自動報價（延遲）') + '</small>' : '<small>' + bi('Entered', '自行輸入') + '</small>');
        var valueCell = money(r.vb, base) + (v.loan ? '<small>' + bi('Mortgage', '按揭') + ' ' + money(-conv(v.loan, it.ccy, base), base) + '</small>' : '');
        return '<tr><th scope="row"><b>' + esc(it.name) + '</b><small>' + bi(TYPES[it.type][0], TYPES[it.type][1]) + (it.symbol ? ' · ' + esc(it.symbol) : '') + ' · ' + esc(it.ccy) + '</small></th>' +
          '<td class="r">' + (it.type === 'cash' ? '—' : qtyFmt(n(it.qty) || 0) + esc(unit)) + '</td>' +
          '<td class="r">' + priceCell + '</td><td class="r"><b>' + valueCell + '</b></td><td class="r">' + plCell + '</td>' +
          '<td class="pf-row-act"><button type="button" class="pf-icon" data-edit="' + esc(it.id) + '" aria-label="' + esc(t('Edit ', '編輯 ') + it.name) + '">' + bi('Edit', '編輯') + '</button>' +
          '<button type="button" class="pf-icon danger" data-del="' + esc(it.id) + '" aria-label="' + esc(t('Delete ', '刪除 ') + it.name) + '">' + bi('Delete', '刪除') + '</button></td></tr>';
      }).join('') + '</tbody>';
  }

  function renderPrices() {
    var el = $('pfPrices');
    if (!updated) { el.innerHTML = bi('Live prices unavailable; using the prices you entered. USD/HKD 7.8 and USD/CNY 7.2 are assumed.', '暫時未能取得報價，改用你輸入的價格；匯率假設為 1 美元兌 7.8 港元及 7.2 人民幣。'); return; }
    var when;
    try { when = new Date(updated).toLocaleString(zh() ? 'zh-HK' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Hong_Kong' }) + ' HKT'; } catch (e) { when = updated; }
    var parts = [];
    if (quotes.GOLD) parts.push(t('Gold ', '金價 ') + money(quotes.GOLD, 'USD', 0) + t('/oz', '/安士'));
    if (quotes.SILVER) parts.push(t('Silver ', '銀價 ') + money(quotes.SILVER, 'USD', 2) + t('/oz', '/安士'));
    parts.push('USD/HKD ' + fx.HKD.toFixed(4) + (fxLive ? '' : t(' (assumed)', '（假設）')));
    el.innerHTML = esc(t('Prices as of ', '報價時間：') + when + t(' · delayed · ', ' · 延遲 · ') + parts.join(' · '));
  }

  /* ---------- form ---------- */
  function options(sel, map, value) {
    sel.innerHTML = Object.keys(map).map(function (k) {
      var lbl = map[k] instanceof Array ? (map[k].length === 3 ? t(map[k][1], map[k][2]) : t(map[k][0], map[k][1])) : map[k];
      return '<option value="' + k + '"' + (k === value ? ' selected' : '') + '>' + esc((map === CCYS ? k + ' · ' : '') + lbl) + '</option>';
    }).join('');
  }
  function syncForm() {
    var type = $('fType').value;
    document.querySelectorAll('#pfForm [data-for]').forEach(function (el) {
      el.hidden = el.getAttribute('data-for').split(' ').indexOf(type) < 0;
    });
    var cash = type === 'cash', prop = type === 'property';
    $('fCost').closest('.field').hidden = cash;
    $('fPrice').closest('.field').hidden = cash;
    $('fQty').previousElementSibling.innerHTML = (cash ? bi('Amount', '金額') : prop ? bi('Number of units', '單位數目') : bi('Quantity', '數量')) + ' <i>*</i>';
    $('fPrice').previousElementSibling.innerHTML = prop ? bi('Current valuation (per unit)', '現時估值（每單位）') : bi('Current price per unit', '現價（每單位）');
    $('fCost').previousElementSibling.innerHTML = prop ? bi('Purchase price', '購入價') : bi('Total cost', '總成本');
    var hint = {
      stock: ['US stocks on the Markets watchlist are priced automatically; leave the price blank to use the live quote. For other shares, enter the latest price.', '美股行情觀察名單內的美股會自動計價，價格留空即用自動報價；其他股票請輸入最新價格。'],
      fund: ['Enter the latest NAV (net asset value) per unit from your fund house or platform.', '請輸入基金公司或平台公布的最新每單位資產淨值。'],
      gold: ['Leave the price blank to use the delayed spot price, converted to the unit you choose. Physical bars and coins usually trade a little above or below spot.', '價格留空即按延遲現貨價自動計算，並換算成所選單位。實金條及金幣的買賣價通常與現貨價有些差距。'],
      silver: ['Leave the price blank to use the delayed spot price, converted to the unit you choose.', '價格留空即按延遲現貨價自動計算，並換算成所選單位。'],
      property: ['Use a recent bank or surveyor valuation. The mortgage is subtracted from your net worth.', '可參考銀行或測量師的最新估價。按揭餘額會從淨資產中扣除。'],
      cash: ['Bank balances and time deposits.', '銀行結餘及定期存款。'],
      other: ['Anything else: enter the quantity and the current price per unit.', '其他資產：請輸入數量及現時每單位價格。']
    }[type];
    $('pfHint').innerHTML = bi(esc(hint[0]), esc(hint[1]));
    $('fPrice').placeholder = (type === 'gold' || type === 'silver' || type === 'stock') ? t('Blank = live price', '留空 = 自動報價') : '';
  }
  function openForm(it) {
    editing = it ? it.id : null;
    var d = it || { type: 'stock', ccy: state.base, unit: 'oz' };
    options($('fType'), TYPES, d.type);
    options($('fCcy'), CCYS, d.ccy);
    options($('fUnit'), UNITS, d.unit || 'oz');
    $('fName').value = d.name || '';
    $('fSymbol').value = d.symbol || '';
    $('fQty').value = d.qty != null ? d.qty : (d.type === 'property' ? 1 : '');
    $('fCost').value = d.cost != null ? d.cost : '';
    $('fPrice').value = d.price != null ? d.price : '';
    $('fLoan').value = d.loan != null ? d.loan : '';
    $('pfFormTitle').innerHTML = it ? bi('Edit holding', '編輯資產') : bi('Add a holding', '新增資產');
    syncForm();
    var dlg = $('pfDialog');
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    $('fName').focus();
  }
  function closeForm() { var dlg = $('pfDialog'); if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); }

  $('fType').addEventListener('change', function () {
    if ($('fType').value === 'property' && !$('fQty').value) $('fQty').value = 1;
    syncForm();
  });
  $('pfCancel').addEventListener('click', closeForm);
  $('pfForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var type = $('fType').value;
    var num = function (id) { var v = n($(id).value); return v == null || v < 0 ? null : v; };
    var it = {
      id: editing || uid(), type: type, name: $('fName').value.trim().slice(0, 80),
      symbol: (type === 'stock' || type === 'fund') ? $('fSymbol').value.trim().toUpperCase().slice(0, 20) : '',
      ccy: $('fCcy').value, qty: num('fQty'),
      unit: (type === 'gold' || type === 'silver') ? $('fUnit').value : undefined,
      cost: type === 'cash' ? null : num('fCost'),
      price: type === 'cash' ? null : num('fPrice'),
      loan: type === 'property' ? num('fLoan') : null
    };
    if (!it.name || it.qty == null) { $('fName').reportValidity(); $('fQty').reportValidity(); return; }
    var i = state.items.findIndex(function (x) { return x.id === it.id; });
    if (i >= 0) state.items[i] = it; else state.items.push(it);
    save(); closeForm(); msg(''); render();
  });

  /* ---------- table + toolbar ---------- */
  $('pfTable').addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    var id = b.getAttribute('data-edit') || b.getAttribute('data-del');
    var it = state.items.find(function (x) { return x.id === id; });
    if (!it) return;
    if (b.hasAttribute('data-edit')) openForm(it);
    else if (confirm(t('Delete "' + it.name + '"?', '刪除「' + it.name + '」？'))) {
      state.items = state.items.filter(function (x) { return x !== it; });
      save(); render();
    }
  });
  $('pfAdd').addEventListener('click', function () { openForm(null); });
  $('pfBase').addEventListener('change', function () { state.base = $('pfBase').value; save(); render(); });
  $('pfExport').addEventListener('click', function () {
    var blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'portfolio-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    msg('Exported. Keep the file somewhere safe: it lists everything you own.', '已匯出。檔案列出你的全部資產，請妥善保管。');
  });
  $('pfImport').addEventListener('change', function () {
    var f = this.files[0];
    this.value = '';
    if (!f) return;
    var rd = new FileReader();
    rd.onload = function () {
      try {
        var s = JSON.parse(rd.result);
        if (!s || !Array.isArray(s.items)) throw new Error('format');
        var items = s.items.filter(function (it) { return it && TYPES[it.type] && CCYS[it.ccy] && typeof it.name === 'string'; })
          .map(function (it) { it.id = it.id ? String(it.id) : uid(); return it; });
        if (state.items.length && !confirm(t('Replace your ' + state.items.length + ' current holding(s) with the ' + items.length + ' in this file?', '以檔案中的 ' + items.length + ' 項資產取代現有的 ' + state.items.length + ' 項？'))) return;
        state = { base: CCYS[s.base] ? s.base : 'HKD', items: items, hist: (s.hist && typeof s.hist === 'object') ? s.hist : {} };
        save(); syncBase(); render();
        msg('Imported ' + items.length + ' holding(s).', '已匯入 ' + items.length + ' 項資產。');
      } catch (e) { msg('That file is not a portfolio export.', '這個檔案不是投資組合的匯出檔。'); }
    };
    rd.readAsText(f);
  });
  $('pfClear').addEventListener('click', function () {
    if (!state.items.length) return;
    if (!confirm(t('Delete all holdings and history from this browser? Export first if you want a copy.', '從此瀏覽器刪除所有資產及走勢紀錄？如需保留，請先匯出。'))) return;
    state = { base: state.base, items: [], hist: {} };
    save(); render();
  });
  $('pfDemo').addEventListener('click', function () {
    if (state.items.length && !confirm(t('Replace your current holdings with the example?', '以示例取代現有資產？'))) return;
    state = { base: 'HKD', hist: {}, items: [
      { id: uid(), type: 'stock', name: 'NVIDIA', symbol: 'NVDA', ccy: 'USD', qty: 40, cost: 4200 },
      { id: uid(), type: 'stock', name: 'Apple', symbol: 'AAPL', ccy: 'USD', qty: 25, cost: 4500 },
      { id: uid(), type: 'stock', name: '騰訊控股 Tencent', symbol: '0700.HK', ccy: 'HKD', qty: 200, cost: 76000, price: 520 },
      { id: uid(), type: 'fund', name: '盈富基金 Tracker Fund', symbol: '2800.HK', ccy: 'HKD', qty: 2000, cost: 40000, price: 25.4 },
      { id: uid(), type: 'gold', name: '金條 Gold bar', ccy: 'HKD', qty: 5, unit: 'tael', cost: 60000 },
      { id: uid(), type: 'silver', name: 'Silver coins', ccy: 'USD', qty: 50, unit: 'oz', cost: 1300 },
      { id: uid(), type: 'property', name: '自住單位 Home flat', ccy: 'HKD', qty: 1, cost: 6800000, price: 7200000, loan: 3900000 },
      { id: uid(), type: 'cash', name: 'HSBC savings', ccy: 'HKD', qty: 180000 }
    ] };
    save(); syncBase(); render();
    msg('Example loaded. Edit or delete any line, or press Delete all to start your own.', '已載入示例。可編輯或刪除任何一項，或按「全部刪除」重新開始。');
  });

  function syncBase() { options($('pfBase'), CCYS, state.base); }

  document.addEventListener('langchange', function () {
    syncBase(); render();
    if ($('pfDialog').open) {
      var keep = { t: $('fType').value, c: $('fCcy').value, u: $('fUnit').value };
      options($('fType'), TYPES, keep.t); options($('fCcy'), CCYS, keep.c); options($('fUnit'), UNITS, keep.u); syncForm();
    }
  });

  syncBase();
  render();

  /* ---------- live prices ---------- */
  fetch('data/markets.json', { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (j) {
      (j.groups || []).forEach(function (g) {
        (g.items || []).forEach(function (it) { if (it.price > 0) quotes[it.symbol.toUpperCase()] = it.price; });
      });
      if (quotes['USD/HKD'] > 7 && quotes['USD/HKD'] < 9) { fx.HKD = quotes['USD/HKD']; fxLive = true; }
      if (quotes['USD/CNY'] > 5 && quotes['USD/CNY'] < 10) fx.CNY = quotes['USD/CNY'];
      updated = j.updated;
      render();
    })
    .catch(function () { renderPrices(); });
})();
