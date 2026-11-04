/* Markets page: TradingView embed widgets, re-rendered on language / theme change. */
(function () {
  var root = document.documentElement;
  var BASE = 'https://s3.tradingview.com/external-embedding/embed-widget-';
  var dark = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function q(s, d) { return { s: s, d: d }; }
  var benchmarks = [
    ['S&P 500 · SPY', 'AMEX:SPY|1D'], ['Nasdaq-100 · QQQ', 'NASDAQ:QQQ|1D'],
    ['Dow · DIA', 'AMEX:DIA|1D'], ['Russell 2000 · IWM', 'AMEX:IWM|1D']
  ];

  function configs(locale, theme) {
    var common = { colorTheme: theme, isTransparent: true, locale: locale };
    return {
      'ticker-tape': Object.assign({}, common, {
        symbols: [
          { proName: 'FOREXCOM:SPXUSD', title: 'S&P 500' },
          { proName: 'FOREXCOM:NSXUSD', title: 'Nasdaq 100' },
          { proName: 'FOREXCOM:DJI', title: 'Dow 30' },
          { proName: 'AMEX:IWM', title: 'Russell 2000' },
          { proName: 'TVC:US10Y', title: 'US 10Y' },
          { proName: 'TVC:DXY', title: 'USD index' },
          { proName: 'NASDAQ:IBB', title: 'Biotech (IBB)' },
          { proName: 'AMEX:XBI', title: 'Biotech (XBI)' },
          { proName: 'AMEX:KWEB', title: 'China internet' },
          { proName: 'BITSTAMP:BTCUSD', title: 'Bitcoin' }
        ],
        showSymbolLogo: true, displayMode: 'adaptive'
      }),
      'symbol-overview': Object.assign({}, common, {
        symbols: benchmarks, chartOnly: false, width: '100%', height: '100%', autosize: true,
        showVolume: false, hideDateRanges: false, scalePosition: 'right', scaleMode: 'Normal',
        chartType: 'area', lineWidth: 2, dateRanges: ['1d|1', '1m|30', '3m|60', '12m|1D', '60m|1W', 'all|1M']
      }),
      'stock-heatmap': Object.assign({}, common, {
        exchanges: [], dataSource: 'SPX500', grouping: 'sector', blockSize: 'market_cap_basic',
        blockColor: 'change', hasTopBar: true, isDataSetEnabled: false, isZoomEnabled: true,
        hasSymbolTooltip: true, isMonoSize: false, width: '100%', height: '100%'
      }),
      'hotlists': Object.assign({}, common, {
        exchange: 'US', showChart: true, width: '100%', height: '100%', showSymbolLogo: true, showFloatingTooltip: false,
        plotLineColorGrowing: 'rgba(41, 98, 255, 1)', plotLineColorFalling: 'rgba(41, 98, 255, 1)',
        gridLineColor: 'rgba(240, 243, 250, 0)', scaleFontColor: 'rgba(120, 123, 134, 1)',
        belowLineFillColorGrowing: 'rgba(41, 98, 255, 0.12)', belowLineFillColorFalling: 'rgba(41, 98, 255, 0.12)',
        belowLineFillColorGrowingBottom: 'rgba(41, 98, 255, 0)', belowLineFillColorFallingBottom: 'rgba(41, 98, 255, 0)',
        symbolActiveColor: 'rgba(41, 98, 255, 0.12)'
      }),
      'market-quotes': Object.assign({}, common, {
        width: '100%', height: '100%', showSymbolLogo: true,
        symbolsGroups: [
          { name: locale === 'zh_TW' ? '生物科技' : 'Biotech', symbols: [
            q('NASDAQ:IBB', 'iShares Biotechnology ETF'), q('AMEX:XBI', 'SPDR S&P Biotech ETF'),
            q('NASDAQ:AMGN', 'Amgen'), q('NASDAQ:GILD', 'Gilead'), q('NASDAQ:VRTX', 'Vertex'),
            q('NASDAQ:REGN', 'Regeneron'), q('NYSE:LLY', 'Eli Lilly'), q('NASDAQ:MRNA', 'Moderna')
          ] },
          { name: locale === 'zh_TW' ? '中概股' : 'China ADRs', symbols: [
            q('NYSE:BABA', 'Alibaba'), q('NASDAQ:PDD', 'PDD Holdings'), q('NASDAQ:JD', 'JD.com'),
            q('NASDAQ:BIDU', 'Baidu'), q('NYSE:NIO', 'NIO'), q('AMEX:KWEB', 'KraneShares China Internet'),
            q('AMEX:FXI', 'iShares China Large-Cap')
          ] },
          { name: locale === 'zh_TW' ? '大型科技股' : 'Mega-cap tech', symbols: [
            q('NASDAQ:NVDA', 'NVIDIA'), q('NASDAQ:AAPL', 'Apple'), q('NASDAQ:MSFT', 'Microsoft'),
            q('NASDAQ:AMZN', 'Amazon'), q('NASDAQ:GOOGL', 'Alphabet'), q('NASDAQ:META', 'Meta'), q('NASDAQ:TSLA', 'Tesla')
          ] }
        ]
      })
    };
  }

  // Widgets load lazily: the ones on screen first, the rest as they scroll
  // into view, so the heavy heatmap does not slow down the top of the page.
  function settings() {
    return {
      locale: root.getAttribute('data-lang') === 'zh' ? (root.getAttribute('data-script') === 'sc' ? 'zh_CN' : 'zh_TW') : 'en',
      theme: dark && dark.matches ? 'dark' : 'light'
    };
  }

  function mount(host, forceEn) {
    var st = settings();
    if (forceEn) st.locale = 'en';
    var key = st.locale + st.theme;
    if (host.getAttribute('data-key') === key) return;
    host.setAttribute('data-key', key);
    host.classList.remove('ready');
    var kind = host.getAttribute('data-tv');
    var cfg = configs(st.locale, st.theme)[kind];
    host.textContent = '';
    var wrap = document.createElement('div');
    wrap.className = 'tradingview-widget-container';
    var inner = document.createElement('div');
    inner.className = 'tradingview-widget-container__widget';
    wrap.appendChild(inner);
    var cr = document.createElement('div');
    cr.className = 'tradingview-widget-copyright';
    cr.innerHTML = '<a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank">Track all markets on TradingView</a>';
    wrap.appendChild(cr);
    var s = document.createElement('script');
    s.type = 'text/javascript';
    s.src = BASE + kind + '.js';
    s.async = true;
    s.text = JSON.stringify(cfg);
    s.onerror = function () { fail(host); };
    wrap.appendChild(s);
    host.appendChild(wrap);

    // Mark the widget ready once its frame has loaded. If the "could not
    // load" note was shown because the network was slow, remove it again.
    var loaded = false;
    function onFrame(f) {
      f.addEventListener('load', function () {
        loaded = true;
        setTimeout(function () {
          host.classList.add('ready');
          var note = host.querySelector('.mk-fail');
          if (note && f.offsetHeight) note.remove();
        }, 400);
      });
    }
    if ('MutationObserver' in window) {
      var mo = new MutationObserver(function () {
        var f = host.querySelector('iframe');
        if (!f) return;
        mo.disconnect();
        onFrame(f);
      });
      mo.observe(host, { childList: true, subtree: true });
    }
    // Still nothing after a generous wait (slow mobile networks included):
    // show the note, but keep waiting in case the widget arrives later.
    setTimeout(function () {
      if (host.getAttribute('data-key') !== key) return;
      var f = host.querySelector('iframe');
      if (f && f.offsetHeight && loaded) return;
      // Loaded but rendered nothing in Chinese: retry once in English.
      if (loaded && f && !f.offsetHeight && st.locale !== 'en') { host.removeAttribute('data-key'); mount(host, true); return; }
      if (!f || !loaded) fail(host);
    }, 25000);
  }

  var hosts = Array.prototype.slice.call(document.querySelectorAll('[data-tv]'));
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      io.unobserve(en.target);
      en.target.setAttribute('data-seen', '1');
      mount(en.target);
    });
  }, { rootMargin: '400px 0px' }) : null;

  function renderAll() {
    hosts.forEach(function (h) {
      if (!io || h.getAttribute('data-seen')) mount(h);
    });
  }

  function fail(host) {
    if (host.classList.contains('mk-tape')) { host.style.display = 'none'; return; }
    if (host.querySelector('.mk-fail')) return;
    var box = document.createElement('div');
    box.className = 'mk-fail';
    box.innerHTML = '<p><span lang="en">This live chart could not load (TradingView may be blocked on this network). The snapshot at the top of the page still works.</span>' +
      '<span lang="zh-Hant">未能載入即時圖表（此網絡可能阻擋了 TradingView）。頁面頂部的市場快照仍可使用。</span></p>' +
      '<a class="p-link" href="https://www.tradingview.com/markets/stocks-usa/" target="_blank" rel="noopener">' +
      '<span lang="en">Open US markets on TradingView →</span><span lang="zh-Hant">在 TradingView 查看美股 →</span></a>';
    host.appendChild(box);
  }


  /* ---------- Snapshot (data/markets.json, works without TradingView) ---------- */
  var snapGrid = document.getElementById('snapGrid');
  var snapUpdated = document.getElementById('snapUpdated');
  var snap = null;
  var NS = 'http://www.w3.org/2000/svg';

  function bi(en, zh) {
    return '<span lang="en">' + en + '</span><span lang="zh-Hant">' + zh + '</span>';
  }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function num(v) {
    var d = Math.abs(v) >= 1000 ? 0 : 2;
    return v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  function spark(vals, up) {
    if (!vals || vals.length < 2) return '';
    var w = 84, h = 26, min = Math.min.apply(null, vals), max = Math.max.apply(null, vals), r = max - min || 1;
    var pts = vals.map(function (v, i) { return (i / (vals.length - 1) * w).toFixed(1) + ',' + (h - 2 - (v - min) / r * (h - 4)).toFixed(1); }).join(' ');
    return '<svg class="snap-spark ' + (up ? 'up' : 'down') + '" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" aria-hidden="true"><polyline points="' + pts + '" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/></svg>';
  }
  function stamp(iso) {
    var zh = root.getAttribute('data-lang') === 'zh';
    try { return new Date(iso).toLocaleString(zh ? 'zh-HK' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Hong_Kong' }) + ' HKT'; }
    catch (e) { return iso; }
  }
  function renderSnap() {
    if (!snap || !snapGrid) return;
    snapGrid.innerHTML = snap.groups.map(function (g) {
      return '<div class="snap-card"><h3>' + bi(esc(g.name_en), esc(g.name_zh)) + '</h3><table class="snap-table"><tbody>' +
        g.items.map(function (it) {
          var up = it.change >= 0;
          var sign = up ? '+' : '';
          return '<tr' + (it.stale ? ' class="stale"' : '') + '><th scope="row"><b>' + esc(it.symbol) + '</b><small>' + esc(it.name) + '</small></th>' +
            '<td class="snap-chart">' + spark(it.spark, up) + '</td>' +
            '<td class="snap-px">' + num(it.price) + '</td>' +
            '<td><span class="snap-pct ' + (up ? 'up' : 'down') + '">' + sign + it.pct.toFixed(2) + '%</span></td></tr>';
        }).join('') + '</tbody></table></div>';
    }).join('');
    var srcs = {};
    snap.groups.forEach(function (g) { g.items.forEach(function (it) { if (it.src) srcs[it.src] = 1; }); });
    var src = Object.keys(srcs).join(', ');
    snapUpdated.innerHTML = bi('Updated ' + stamp(snap.updated) + ' · Delayed · Source: ' + esc(src),
      '更新時間：' + stamp(snap.updated) + ' · 延遲報價 · 來源：' + esc(src));
  }
  if (snapGrid) {
    fetch('data/markets.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) {
        if (!j.groups || !j.groups.length) throw new Error('empty');
        snap = j; renderSnap();
      })
      .catch(function () {
        snapGrid.innerHTML = '<p class="news-empty">' + bi('The snapshot is not available yet. Please check back later.', '快照暫時未有資料，請稍後再看。') + '</p>';
      });
    document.addEventListener('langchange', renderSnap);
  }

  if (io) hosts.forEach(function (h) { io.observe(h); }); else renderAll();
  document.addEventListener('langchange', renderAll);
  if (dark && dark.addEventListener) dark.addEventListener('change', renderAll);
})();
