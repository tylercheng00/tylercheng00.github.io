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

  var last = '';
  function renderAll() {
    var locale = root.getAttribute('data-lang') === 'zh' ? 'zh_TW' : 'en';
    var theme = dark && dark.matches ? 'dark' : 'light';
    if (locale + theme === last) return;
    last = locale + theme;
    var cfg = configs(locale, theme);
    document.querySelectorAll('[data-tv]').forEach(function (host) {
      var kind = host.getAttribute('data-tv');
      host.textContent = '';
      var wrap = document.createElement('div');
      wrap.className = 'tradingview-widget-container';
      var inner = document.createElement('div');
      inner.className = 'tradingview-widget-container__widget';
      wrap.appendChild(inner);
      var s = document.createElement('script');
      s.src = BASE + kind + '.js';
      s.async = true;
      s.type = 'text/javascript';
      s.innerHTML = JSON.stringify(cfg[kind]);
      wrap.appendChild(s);
      host.appendChild(wrap);
    });
  }

  renderAll();
  document.addEventListener('langchange', renderAll);
  if (dark && dark.addEventListener) dark.addEventListener('change', renderAll);
})();
