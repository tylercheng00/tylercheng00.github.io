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
      locale: root.getAttribute('data-lang') === 'zh' ? 'zh_TW' : 'en',
      theme: dark && dark.matches ? 'dark' : 'light'
    };
  }

  function mount(host) {
    var st = settings();
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

    // Hide the loading shimmer once the widget's frame has loaded.
    if ('MutationObserver' in window) {
      var mo = new MutationObserver(function () {
        var f = host.querySelector('iframe');
        if (!f) return;
        mo.disconnect();
        f.addEventListener('load', function () { setTimeout(function () { host.classList.add('ready'); }, 400); });
      });
      mo.observe(host, { childList: true, subtree: true });
    }
    // Blocked script, ad blocker or network filter: say so, not an empty box.
    setTimeout(function () {
      if (host.getAttribute('data-key') !== key) return;
      var f = host.querySelector('iframe');
      if (!f || !f.offsetHeight) fail(host);
    }, 15000);
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
    if (host.querySelector('.mk-fail')) return;
    var box = document.createElement('div');
    box.className = 'mk-fail';
    box.innerHTML = '<p><span lang="en">Live data could not load here. An ad or tracker blocker, or a network filter, may be blocking TradingView.</span>' +
      '<span lang="zh-Hant">未能載入即時數據，可能是廣告／追蹤攔截器或網絡過濾阻擋了 TradingView。</span></p>' +
      '<a class="p-link" href="https://www.tradingview.com/markets/stocks-usa/" target="_blank" rel="noopener">' +
      '<span lang="en">Open US markets on TradingView →</span><span lang="zh-Hant">在 TradingView 查看美股 →</span></a>';
    host.appendChild(box);
  }

  if (io) hosts.forEach(function (h) { io.observe(h); }); else renderAll();
  document.addEventListener('langchange', renderAll);
  if (dark && dark.addEventListener) dark.addEventListener('change', renderAll);
})();
