/* Stock markets desk: multi-region TradingView embeds + delayed snapshot.
 * Every region exposes the same five panels. US keeps TradingView heatmap /
 * hotlists; other desks use a local breadth board and movers built from
 * data/markets.json so info density stays comparable. */
(function () {
  var root = document.documentElement;
  var BASE = 'https://s3.tradingview.com/external-embedding/embed-widget-';
  var dark = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  var region = 'us';
  var themeFilter = 'all';

  function q(s, d) { return { s: s, d: d }; }

  var REGIONS = {
    us: {
      en: 'United States', zh: '美國', short_en: 'US', short_zh: '美股',
      /* US heatmap: original TradingView S&P widget; movers stay local so every desk name lists. */
      heatMode: 'tv', moversMode: 'local', heatSource: 'SPX500', exchange: 'US',
      live: 'AMEX:SPY',
      tape: [
        { proName: 'FOREXCOM:SPXUSD', title: 'S&P 500' },
        { proName: 'FOREXCOM:NSXUSD', title: 'Nasdaq 100' },
        { proName: 'FOREXCOM:DJI', title: 'Dow 30' },
        { proName: 'AMEX:IWM', title: 'Russell 2000' },
        { proName: 'TVC:US10Y', title: 'US 10Y' },
        { proName: 'NASDAQ:NVDA', title: 'NVIDIA' },
        { proName: 'NASDAQ:TSM', title: 'TSMC ADR' },
        { proName: 'NYSE:BA', title: 'Boeing' }
      ],
      benchmarks: [
        ['S&P 500 · SPY', 'AMEX:SPY|1D'], ['Nasdaq-100 · QQQ', 'NASDAQ:QQQ|1D'],
        ['Dow · DIA', 'AMEX:DIA|1D'], ['Russell 2000 · IWM', 'AMEX:IWM|1D']
      ],
      quotes: function (zh) {
        return [
          { name: zh ? '人工智能' : 'Artificial intelligence', theme: 'ai', symbols: [
            q('NASDAQ:NVDA', 'NVIDIA'), q('NASDAQ:MSFT', 'Microsoft'), q('NASDAQ:GOOGL', 'Alphabet'),
            q('NASDAQ:META', 'Meta'), q('NASDAQ:AMD', 'AMD'), q('NASDAQ:PLTR', 'Palantir'), q('NYSE:AI', 'C3.ai')
          ] },
          { name: zh ? '晶片' : 'Semiconductors', theme: 'chip', symbols: [
            q('NASDAQ:NVDA', 'NVIDIA'), q('NASDAQ:TSM', 'TSMC ADR'), q('NASDAQ:AVGO', 'Broadcom'),
            q('NASDAQ:ASML', 'ASML'), q('NASDAQ:AMAT', 'Applied Materials'), q('NASDAQ:LRCX', 'Lam Research'), q('NASDAQ:INTC', 'Intel')
          ] },
          { name: zh ? '航天' : 'Aerospace', theme: 'aero', symbols: [
            q('NYSE:BA', 'Boeing'), q('NYSE:LMT', 'Lockheed Martin'), q('NYSE:RTX', 'RTX'),
            q('NYSE:NOC', 'Northrop Grumman'), q('NYSE:GD', 'General Dynamics'), q('NYSE:GE', 'GE Aerospace')
          ] },
          { name: zh ? '生物科技' : 'Biotech', theme: 'bio', symbols: [
            q('NASDAQ:IBB', 'iShares Biotech'), q('AMEX:XBI', 'SPDR Biotech'),
            q('NASDAQ:AMGN', 'Amgen'), q('NASDAQ:GILD', 'Gilead'), q('NYSE:LLY', 'Eli Lilly')
          ] }
        ];
      }
    },
    hk: {
      en: 'Hong Kong', zh: '香港', short_en: 'HK', short_zh: '港股',
      heatMode: 'local', moversMode: 'local', exchange: 'HKEX',
      live: 'HSI:HSI',
      tape: [
        { proName: 'HSI:HSI', title: 'Hang Seng' },
        { proName: 'HKEX:0700', title: 'Tencent' },
        { proName: 'HKEX:9988', title: 'Alibaba-SW' },
        { proName: 'HKEX:3690', title: 'Meituan' },
        { proName: 'HKEX:1810', title: 'Xiaomi' },
        { proName: 'HKEX:0005', title: 'HSBC' },
        { proName: 'HKEX:0388', title: 'HKEX' },
        { proName: 'HKEX:1299', title: 'AIA' }
      ],
      benchmarks: [
        ['Hang Seng', 'HSI:HSI|1D'], ['HS Tech', 'HSI:HSTECH|1D'],
        ['Tencent', 'HKEX:0700|1D'], ['Alibaba-SW', 'HKEX:9988|1D']
      ],
      quotes: function (zh) {
        return [
          { name: zh ? '市場龍頭' : 'Market leaders', theme: 'all', symbols: [
            q('HKEX:0005', 'HSBC'), q('HKEX:0700', 'Tencent'), q('HKEX:0941', 'China Mobile'),
            q('HKEX:1299', 'AIA'), q('HKEX:0388', 'HKEX'), q('HKEX:2318', 'Ping An')
          ] },
          { name: zh ? '人工智能' : 'Artificial intelligence', theme: 'ai', symbols: [
            q('HKEX:0700', 'Tencent'), q('HKEX:9988', 'Alibaba-SW'), q('HKEX:3690', 'Meituan'),
            q('HKEX:1810', 'Xiaomi'), q('HKEX:1024', 'Kuaishou'), q('HKEX:9618', 'JD-SW')
          ] },
          { name: zh ? '晶片' : 'Semiconductors', theme: 'chip', symbols: [
            q('HKEX:0981', 'SMIC'), q('HKEX:1347', 'Hua Hong'), q('HKEX:2577', 'Innoscience'),
            q('HKEX:2382', 'Sunny Optical'), q('HKEX:6869', 'Yangtze Optical')
          ] },
          { name: zh ? '航天及運輸' : 'Aerospace & transport', theme: 'aero', symbols: [
            q('HKEX:0753', 'Air China'), q('HKEX:0670', 'China Eastern'),
            q('HKEX:0293', 'Cathay Pacific'), q('HKEX:0317', 'COSCO Shipping')
          ] }
        ];
      }
    },
    cn: {
      en: 'A-shares', zh: 'A股', short_en: 'A-shares', short_zh: 'A股',
      heatMode: 'local', moversMode: 'local', exchange: 'SSE',
      live: 'SSE:000001',
      tape: [
        { proName: 'SSE:000001', title: 'SSE Composite' },
        { proName: 'SZSE:399001', title: 'SZSE Component' },
        { proName: 'SSE:600519', title: 'Kweichow Moutai' },
        { proName: 'SZSE:300750', title: 'CATL' },
        { proName: 'SSE:601318', title: 'Ping An' },
        { proName: 'SZSE:000858', title: 'Wuliangye' }
      ],
      benchmarks: [
        ['SSE Composite', 'SSE:000001|1D'], ['SZSE Component', 'SZSE:399001|1D'],
        ['CSI 300', 'SSE:000300|1D'], ['STAR 50', 'SSE:000688|1D']
      ],
      quotes: function (zh) {
        return [
          { name: zh ? '市場龍頭' : 'Market leaders', theme: 'all', symbols: [
            q('SSE:600519', 'Kweichow Moutai'), q('SZSE:300750', 'CATL'), q('SSE:601318', 'Ping An'),
            q('SZSE:000858', 'Wuliangye'), q('SSE:601012', 'LONGi')
          ] },
          { name: zh ? '人工智能' : 'Artificial intelligence', theme: 'ai', symbols: [
            q('SSE:688111', 'Kingsoft Office'), q('SZSE:002230', 'iFlytek'),
            q('SZSE:300418', 'Kunlun Tech'), q('SSE:603019', 'Dawning'), q('SZSE:002415', 'Hikvision')
          ] },
          { name: zh ? '晶片' : 'Semiconductors', theme: 'chip', symbols: [
            q('SSE:688981', 'SMIC-SH'), q('SZSE:002371', 'NAURA'), q('SSE:603501', 'Will Semi'),
            q('SZSE:300782', 'Maxscend'), q('SSE:688012', 'AMEC')
          ] },
          { name: zh ? '航天' : 'Aerospace', theme: 'aero', symbols: [
            q('SSE:600893', 'AECC Aviation'), q('SZSE:000768', 'AVIC Aircraft'),
            q('SSE:600760', 'AVIC Shenfei'), q('SZSE:002179', 'AVIC Jonhon')
          ] }
        ];
      }
    },
    tw: {
      en: 'Taiwan', zh: '台灣', short_en: 'Taiwan', short_zh: '台股',
      heatMode: 'local', moversMode: 'local', exchange: 'TWSE',
      live: 'TWSE:2330',
      tape: [
        { proName: 'TWSE:2330', title: 'TSMC' },
        { proName: 'TWSE:2317', title: 'Hon Hai' },
        { proName: 'TWSE:2454', title: 'MediaTek' },
        { proName: 'TWSE:2303', title: 'UMC' },
        { proName: 'TWSE:2382', title: 'Quanta' },
        { proName: 'TWSE:2308', title: 'Delta' }
      ],
      benchmarks: [
        ['TSMC', 'TWSE:2330|1D'], ['Hon Hai', 'TWSE:2317|1D'],
        ['MediaTek', 'TWSE:2454|1D'], ['UMC', 'TWSE:2303|1D']
      ],
      quotes: function (zh) {
        return [
          { name: zh ? '市場龍頭' : 'Market leaders', theme: 'all', symbols: [
            q('TWSE:2330', 'TSMC'), q('TWSE:2317', 'Hon Hai'), q('TWSE:2308', 'Delta'),
            q('TWSE:2881', 'Fubon'), q('TWSE:2412', 'Chunghwa Telecom')
          ] },
          { name: zh ? '人工智能' : 'Artificial intelligence', theme: 'ai', symbols: [
            q('TWSE:2330', 'TSMC'), q('TWSE:2454', 'MediaTek'), q('TWSE:2382', 'Quanta'),
            q('TWSE:3231', 'Wistron'), q('TWSE:2356', 'Inventec')
          ] },
          { name: zh ? '晶片' : 'Semiconductors', theme: 'chip', symbols: [
            q('TWSE:2330', 'TSMC'), q('TWSE:2303', 'UMC'), q('TWSE:3711', 'ASE'),
            q('TWSE:3034', 'Novatek'), q('TWSE:2379', 'Realtek'), q('TWSE:2454', 'MediaTek')
          ] },
          { name: zh ? '航天及航運' : 'Aerospace & shipping', theme: 'aero', symbols: [
            q('TWSE:2634', 'AIDC'), q('TWSE:2637', 'Wisdom Marine'), q('TWSE:2603', 'Evergreen')
          ] }
        ];
      }
    },
    jp: {
      en: 'Japan', zh: '日本', short_en: 'Japan', short_zh: '日股',
      heatMode: 'local', moversMode: 'local', exchange: 'TSE',
      /* TVC:NI225 / TOPX are blocked in embed widgets (“only available on TradingView”). Use listed ETFs + blue-chips. */
      live: 'TSE:1321',
      tape: [
        { proName: 'TSE:1321', title: 'Nikkei ETF' },
        { proName: 'TSE:7203', title: 'Toyota' },
        { proName: 'TSE:6758', title: 'Sony' },
        { proName: 'TSE:9984', title: 'SoftBank' },
        { proName: 'TSE:6861', title: 'Keyence' },
        { proName: 'TSE:8035', title: 'Tokyo Electron' }
      ],
      benchmarks: [
        ['Nikkei ETF · 1321', 'TSE:1321|1D'], ['TOPIX ETF · 1306', 'TSE:1306|1D'],
        ['SoftBank', 'TSE:9984|1D'], ['Tokyo Electron', 'TSE:8035|1D']
      ],
      quotes: function (zh) {
        return [
          { name: zh ? '市場龍頭' : 'Market leaders', theme: 'all', symbols: [
            q('TSE:7203', 'Toyota'), q('TSE:6758', 'Sony'), q('TSE:6861', 'Keyence'),
            q('TSE:8306', 'MUFG'), q('TSE:4063', 'Shin-Etsu')
          ] },
          { name: zh ? '人工智能' : 'Artificial intelligence', theme: 'ai', symbols: [
            q('TSE:9984', 'SoftBank'), q('TSE:6758', 'Sony'), q('TSE:6861', 'Keyence'),
            q('TSE:4063', 'Shin-Etsu'), q('TSE:6501', 'Hitachi')
          ] },
          { name: zh ? '晶片' : 'Semiconductors', theme: 'chip', symbols: [
            q('TSE:8035', 'Tokyo Electron'), q('TSE:6857', 'Advantest'), q('TSE:6920', 'Lasertec'),
            q('TSE:7735', 'SCREEN'), q('TSE:4063', 'Shin-Etsu')
          ] },
          { name: zh ? '航天及航空' : 'Aerospace & airlines', theme: 'aero', symbols: [
            q('TSE:7011', 'Mitsubishi Heavy'), q('TSE:9202', 'ANA'),
            q('TSE:9201', 'JAL'), q('TSE:7013', 'IHI')
          ] }
        ];
      }
    },
    kr: {
      en: 'Korea', zh: '韓國', short_en: 'Korea', short_zh: '韓股',
      heatMode: 'local', moversMode: 'local', exchange: 'KRX',
      live: 'KRX:005930',
      tape: [
        { proName: 'KRX:KOSPI', title: 'KOSPI' },
        { proName: 'KRX:005930', title: 'Samsung Elec' },
        { proName: 'KRX:000660', title: 'SK Hynix' },
        { proName: 'KRX:035420', title: 'Naver' },
        { proName: 'KRX:035720', title: 'Kakao' },
        { proName: 'KRX:005380', title: 'Hyundai Motor' }
      ],
      benchmarks: [
        ['KOSPI', 'KRX:KOSPI|1D'], ['Samsung Elec', 'KRX:005930|1D'],
        ['SK Hynix', 'KRX:000660|1D'], ['Naver', 'KRX:035420|1D']
      ],
      quotes: function (zh) {
        return [
          { name: zh ? '市場龍頭' : 'Market leaders', theme: 'all', symbols: [
            q('KRX:005930', 'Samsung Elec'), q('KRX:000660', 'SK Hynix'), q('KRX:005380', 'Hyundai'),
            q('KRX:051910', 'LG Chem'), q('KRX:006400', 'Samsung SDI')
          ] },
          { name: zh ? '人工智能' : 'Artificial intelligence', theme: 'ai', symbols: [
            q('KRX:005930', 'Samsung Elec'), q('KRX:035420', 'Naver'), q('KRX:035720', 'Kakao'),
            q('KRX:035900', 'JYP Ent'), q('KRX:259960', 'Krafton')
          ] },
          { name: zh ? '晶片' : 'Semiconductors', theme: 'chip', symbols: [
            q('KRX:005930', 'Samsung Elec'), q('KRX:000660', 'SK Hynix'),
            q('KRX:042700', 'Hanmi Semicon'), q('KRX:058470', 'LEENO'), q('KRX:039030', 'EO Technics')
          ] },
          { name: zh ? '航天' : 'Aerospace', theme: 'aero', symbols: [
            q('KRX:047810', 'Korea Aerospace'), q('KRX:012450', 'Hanwha Aerospace'),
            q('KRX:003490', 'Korean Air'), q('KRX:272210', 'Hanwha Systems')
          ] }
        ];
      }
    },
    au: {
      en: 'Australia', zh: '澳洲', short_en: 'Australia', short_zh: '澳洲股',
      heatMode: 'local', moversMode: 'local', exchange: 'ASX',
      live: 'ASX:XJO',
      tape: [
        { proName: 'ASX:XJO', title: 'ASX 200' },
        { proName: 'ASX:BHP', title: 'BHP' },
        { proName: 'ASX:CBA', title: 'CBA' },
        { proName: 'ASX:CSL', title: 'CSL' },
        { proName: 'ASX:WBC', title: 'Westpac' },
        { proName: 'ASX:NAB', title: 'NAB' }
      ],
      benchmarks: [
        ['ASX 200', 'ASX:XJO|1D'], ['BHP', 'ASX:BHP|1D'],
        ['CBA', 'ASX:CBA|1D'], ['CSL', 'ASX:CSL|1D']
      ],
      quotes: function (zh) {
        return [
          { name: zh ? '市場龍頭' : 'Market leaders', theme: 'all', symbols: [
            q('ASX:BHP', 'BHP'), q('ASX:CBA', 'CBA'), q('ASX:CSL', 'CSL'),
            q('ASX:WBC', 'Westpac'), q('ASX:RIO', 'Rio Tinto')
          ] },
          { name: zh ? '人工智能' : 'Artificial intelligence', theme: 'ai', symbols: [
            q('ASX:XRO', 'Xero'), q('ASX:WTC', 'WiseTech'), q('ASX:APX', 'Appen'),
            q('ASX:CPU', 'Computershare'), q('ASX:TNE', 'Technology One')
          ] },
          { name: zh ? '科技硬件' : 'Tech hardware', theme: 'chip', symbols: [
            q('ASX:DDR', 'Dicker Data'), q('ASX:ALU', 'Altium'), q('ASX:NVX', 'Novonix'),
            q('ASX:4DS', '4DS Memory')
          ] },
          { name: zh ? '航天及航空' : 'Aerospace & airlines', theme: 'aero', symbols: [
            q('ASX:DRO', 'DroneShield'), q('ASX:EOS', 'Electro Optic'), q('ASX:QAN', 'Qantas')
          ] }
        ];
      }
    }
  };

  var ORDER = ['us', 'hk', 'cn', 'tw', 'jp', 'kr', 'au'];
  var THEMES = [
    { id: 'all', en: 'All', zh: '全部' },
    { id: 'ai', en: 'AI', zh: '人工智能' },
    { id: 'chip', en: 'Chips', zh: '晶片' },
    { id: 'aero', en: 'Aerospace', zh: '航天' }
  ];

  function settings() {
    return {
      locale: root.getAttribute('data-lang') === 'zh' ? (root.getAttribute('data-script') === 'sc' ? 'zh_CN' : 'zh_TW') : 'en',
      theme: dark && dark.matches ? 'dark' : 'light',
      zh: root.getAttribute('data-lang') === 'zh'
    };
  }

  function configs(locale, theme) {
    var r = REGIONS[region];
    var zh = locale.indexOf('zh') === 0;
    var common = { colorTheme: theme, isTransparent: true, locale: locale };
    var live = r.live || (r.benchmarks && r.benchmarks[0] ? String(r.benchmarks[0][1]).split('|')[0] : 'AMEX:SPY');
    var groups = r.quotes(zh);
    if (themeFilter !== 'all') {
      groups = groups.filter(function (g) { return g.theme === themeFilter; });
    }
    if (!groups.length) groups = r.quotes(zh);
    return {
      'ticker-tape': Object.assign({}, common, { symbols: r.tape, showSymbolLogo: true, displayMode: 'adaptive' }),
      'symbol-overview': Object.assign({}, common, {
        symbols: r.benchmarks, chartOnly: false, width: '100%', height: '100%', autosize: true,
        showVolume: false, hideDateRanges: false, scalePosition: 'right', scaleMode: 'Normal',
        chartType: 'area', lineWidth: 2, dateRanges: ['1d|1', '1m|30', '3m|60', '12m|1D', '60m|1W', 'all|1M']
      }),
      'advanced-chart': {
        autosize: true, symbol: live, interval: '60', timezone: 'exchange',
        theme: theme, style: '1', locale: locale, backgroundColor: theme === 'dark' ? 'rgba(19, 23, 34, 1)' : 'rgba(255, 255, 255, 1)',
        allow_symbol_change: true, calendar: false, hide_top_toolbar: false, hide_legend: false,
        save_image: false, withdateranges: true, hide_side_toolbar: false,
        studies: ['STD;SMA', 'Volume@tv-basicstudies'],
        support_host: 'https://www.tradingview.com'
      },
      'technical-analysis': Object.assign({}, common, {
        interval: '1h', width: '100%', height: '100%', symbol: live,
        showIntervalTabs: true, displayMode: 'single'
      }),
      'symbol-info': Object.assign({}, common, {
        symbol: live, width: '100%'
      }),
      'mini-symbol-overview': Object.assign({}, common, {
        symbol: live, width: '100%', height: '100%', dateRange: '1D',
        trendLineColor: 'rgba(41, 98, 255, 1)', underLineColor: 'rgba(41, 98, 255, 0.18)',
        underLineBottomColor: 'rgba(41, 98, 255, 0)', chartOnly: false
      }),
      'stock-heatmap': Object.assign({}, common, {
        exchanges: [], dataSource: r.heatSource || 'SPX500', grouping: 'sector', blockSize: 'market_cap_basic',
        blockColor: 'change', hasTopBar: true, isDataSetEnabled: false, isZoomEnabled: true,
        hasSymbolTooltip: true, isMonoSize: false, width: '100%', height: '100%'
      }),
      'hotlists': Object.assign({}, common, {
        exchange: r.exchange, showChart: true, width: '100%', height: '100%', showSymbolLogo: true, showFloatingTooltip: false,
        plotLineColorGrowing: 'rgba(41, 98, 255, 1)', plotLineColorFalling: 'rgba(41, 98, 255, 1)',
        gridLineColor: 'rgba(240, 243, 250, 0)', scaleFontColor: 'rgba(120, 123, 134, 1)',
        belowLineFillColorGrowing: 'rgba(41, 98, 255, 0.12)', belowLineFillColorFalling: 'rgba(41, 98, 255, 0.12)',
        belowLineFillColorGrowingBottom: 'rgba(41, 98, 255, 0)', belowLineFillColorFallingBottom: 'rgba(41, 98, 255, 0)',
        symbolActiveColor: 'rgba(41, 98, 255, 0.12)'
      }),
      'market-quotes': Object.assign({}, common, {
        width: '100%', height: '100%', showSymbolLogo: true, symbolsGroups: groups
      })
    };
  }

  function bi(en, zh) {
    return '<span lang="en">' + en + '</span><span lang="zh-Hant">' + zh + '</span>';
  }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function num(v) {
    var d = Math.abs(v) >= 1000 ? 0 : 2;
    return v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  }

  function flatItems(pack) {
    if (!pack || !pack.groups) return [];
    var seen = {}, out = [];
    pack.groups.forEach(function (g) {
      if (themeFilter !== 'all' && g.id !== 'indices' && g.theme !== themeFilter && g.id !== themeFilter) return;
      (g.items || []).forEach(function (it) {
        if (seen[it.symbol]) return;
        seen[it.symbol] = 1;
        out.push(it);
      });
    });
    return out;
  }

  function heatColor(pct) {
    var a = Math.min(Math.abs(pct) / 4, 1);
    if (pct >= 0) return 'rgba(46, 160, 98, ' + (0.22 + a * 0.7).toFixed(2) + ')';
    return 'rgba(200, 70, 70, ' + (0.22 + a * 0.7).toFixed(2) + ')';
  }

  function itemRow(it) {
    var up = (typeof it.pct === 'number' ? it.pct : it.change) >= 0;
    var pct = typeof it.pct === 'number' ? it.pct : 0;
    var sign = up ? '+' : '';
    var px = typeof it.price === 'number' ? num(it.price) : '—';
    var pctHtml = typeof it.pct === 'number'
      ? '<span class="snap-pct ' + (up ? 'up' : 'down') + '">' + sign + pct.toFixed(2) + '%</span>'
      : '<span class="snap-pct">—</span>';
    return '<tr' + (it.stale ? ' class="stale"' : '') + '><th scope="row"><b>' + esc(it.symbol) + '</b><small>' + esc(it.name) + '</small></th>' +
      '<td class="snap-chart">' + spark(it.spark, up) + '</td>' +
      '<td class="snap-px">' + px + '</td>' +
      '<td>' + pctHtml + '</td></tr>';
  }

  function snapTable(rowsHtml) {
    return '<table class="snap-table"><colgroup>' +
      '<col class="snap-col-name"><col class="snap-col-chart"><col class="snap-col-px"><col class="snap-col-pct">' +
      '</colgroup><tbody>' + rowsHtml + '</tbody></table>';
  }

  function renderLocalTape(host) {
    var pack = regionPayload();
    var items = flatItems(pack).filter(function (it) { return typeof it.pct === 'number'; });
    host.classList.add('ready', 'mk-local');
    host.style.display = '';
    if (!items.length) {
      host.innerHTML = '';
      host.style.display = 'none';
      return;
    }
    // Prefer indices first, then largest absolute moves — keeps the strip readable.
    var idx = [];
    var rest = [];
    (pack.groups || []).forEach(function (g) {
      (g.items || []).forEach(function (it) {
        if (typeof it.pct !== 'number') return;
        if (g.id === 'indices') idx.push(it);
        else rest.push(it);
      });
    });
    rest.sort(function (a, b) { return Math.abs(b.pct) - Math.abs(a.pct); });
    var seen = {};
    var strip = [];
    idx.concat(rest).forEach(function (it) {
      var k = String(it.symbol);
      if (seen[k]) return;
      seen[k] = 1;
      strip.push(it);
    });
    strip = strip.slice(0, 14);
    function itemHtml(it) {
      var up = it.pct >= 0;
      var sign = up ? '+' : '';
      var px = typeof it.price === 'number' ? num(it.price) : '—';
      return '<div class="mk-tape-item" role="listitem">' +
        '<span class="mk-tape-sym">' + esc(it.symbol) + '</span>' +
        '<span class="mk-tape-px">' + px + '</span>' +
        '<span class="mk-tape-pct ' + (up ? 'up' : 'down') + '">' + sign + it.pct.toFixed(2) + '%</span>' +
        '</div>';
    }
    // Duplicate the row so CSS can loop a continuous marquee (移動報價帶).
    var row = strip.map(itemHtml).join('');
    host.innerHTML =
      '<div class="mk-tape-marquee" aria-hidden="false">' +
        '<div class="mk-tape-track">' + row + row + '</div>' +
      '</div>';
  }

  function renderLocalBreadth(host) {
    var pack = regionPayload();
    var items = flatItems(pack).filter(function (it) { return typeof it.pct === 'number'; });
    host.classList.add('ready', 'mk-local');
    if (!items.length) {
      host.innerHTML = '<div class="mk-heat-note"><p>' + bi('Breadth board will fill once this market’s snapshot is ready.', '此市場快照就緒後會顯示廣度板。') + '</p></div>';
      return;
    }
    items.sort(function (a, b) { return Math.abs(b.pct) - Math.abs(a.pct); });
    // Show every watchlist name — no slice — so tiles are never clipped out of the desk.
    var cells = items.map(function (it) {
      var sign = it.pct >= 0 ? '+' : '';
      return '<button type="button" class="mk-heat-cell" style="background:' + heatColor(it.pct) + '" title="' + esc(it.name) + ' · ' + esc(it.symbol) + '">' +
        '<b>' + esc(it.symbol) + '</b><span class="mk-heat-name">' + esc(it.name) + '</span><span>' + sign + it.pct.toFixed(2) + '%</span></button>';
    }).join('');
    host.innerHTML = '<div class="mk-heatboard" role="list">' + cells + '</div>' +
      '<p class="mk-local-note">' + bi('All ' + items.length + ' names from this desk’s delayed snapshot (TradingView sector heatmap is US-only).', '此桌面延遲快照全部 ' + items.length + ' 個名稱（TradingView 板塊熱力圖僅支援美股）。') + '</p>';
  }

  function renderLocalMovers(host) {
    var pack = regionPayload();
    var items = flatItems(pack).filter(function (it) { return typeof it.pct === 'number' && !it.stale; });
    host.classList.add('ready', 'mk-local');
    if (!items.length) {
      host.innerHTML = '<div class="mk-heat-note"><p>' + bi('Movers will appear once quotes load.', '報價載入後會顯示升跌榜。') + '</p></div>';
      return;
    }
    var sorted = items.slice().sort(function (a, b) { return b.pct - a.pct; });
    // Split the full desk: top half gainers, bottom half losers (every name listed once).
    var mid = Math.ceil(sorted.length / 2);
    var gainers = sorted.slice(0, mid);
    var losers = sorted.slice(mid).reverse();
    host.innerHTML =
      '<div class="mk-movers-local">' +
        '<div><h3>' + bi('Gainers', '升幅') + ' · ' + gainers.length + '</h3>' + snapTable(gainers.map(itemRow).join('')) + '</div>' +
        '<div><h3>' + bi('Losers', '跌幅') + ' · ' + losers.length + '</h3>' + snapTable(losers.map(itemRow).join('')) + '</div>' +
      '</div>' +
      '<p class="mk-local-note">' + bi('Every name on this desk’s delayed snapshot — works without TradingView.', '此桌面延遲快照全部名稱，不倚賴 TradingView。') + '</p>';
  }

  function renderLocalThemes(host) {
    var pack = regionPayload();
    var st = settings();
    host.classList.add('ready', 'mk-local');
    var groups = [];
    if (pack && pack.groups && pack.groups.length) {
      groups = pack.groups.filter(function (g) {
        if (g.id === 'indices') return false;
        if (themeFilter === 'all') return true;
        return (g.theme || g.id) === themeFilter;
      });
    }
    if (!groups.length) {
      // Fall back to configured quote lists without prices.
      var cfgGroups = REGIONS[region].quotes(st.zh).filter(function (g) {
        return themeFilter === 'all' || g.theme === themeFilter || g.theme === 'all';
      });
      groups = cfgGroups.map(function (g) {
        return {
          name_en: g.name, name_zh: g.name,
          items: (g.symbols || []).map(function (s) {
            return { symbol: s.s, name: s.d, price: null, pct: null, stale: true };
          })
        };
      });
    }
    if (!groups.length) {
      host.innerHTML = '<div class="mk-heat-note"><p>' + bi('Theme lists will appear once this market’s snapshot is ready.', '此市場快照就緒後會顯示主題名單。') + '</p></div>';
      return;
    }
    host.innerHTML =
      '<div class="mk-themes-local">' + groups.map(function (g) {
        var title = g.name_en && g.name_zh && g.name_en !== g.name_zh
          ? bi(esc(g.name_en), esc(g.name_zh))
          : esc(g.name_en || g.name_zh || g.id || '');
        return '<div class="mk-theme-block"><h3>' + title + ' · ' + (g.items || []).length + '</h3>' +
          snapTable((g.items || []).map(itemRow).join('')) + '</div>';
      }).join('') + '</div>' +
      '<p class="mk-local-note">' + bi('Full theme lists from the delayed snapshot — every row stays on the page.', '主題名單取自延遲快照，每一列都留在頁面上。') + '</p>';
  }

  function renderLocalBenchmarks(host) {
    var pack = regionPayload();
    host.classList.add('ready', 'mk-local');
    var g = pack && pack.groups ? pack.groups.filter(function (x) { return x.id === 'indices'; })[0] : null;
    if (!g || !g.items || !g.items.length) {
      host.innerHTML = '<div class="mk-heat-note"><p>' + bi('Benchmark snapshot will fill once quotes load.', '指數快照載入後會顯示。') + '</p></div>';
      return;
    }
    host.innerHTML =
      '<div class="mk-bench-local"><h3>' + bi(esc(g.name_en || 'Indices'), esc(g.name_zh || '指數')) + ' · ' + g.items.length + '</h3>' +
        snapTable(g.items.map(itemRow).join('')) + '</div>' +
      '<p class="mk-local-note">' + bi('Local index table while TradingView chart is blocked or still loading.', 'TradingView 圖表被擋或仍在載入時，改顯示本地指數表。') + '</p>';
  }

  function renderDeskPulse() {
    var host = document.getElementById('mkPulse');
    if (!host) return;
    var pack = regionPayload();
    var items = flatItems(pack).filter(function (it) { return typeof it.pct === 'number' && !it.stale; });
    host.classList.add('ready', 'mk-local');
    if (!items.length) {
      host.innerHTML = '<div class="mk-heat-note"><p>' + bi('Desk pulse will fill once quotes load.', '報價載入後會顯示桌面脈搏。') + '</p></div>';
      return;
    }
    var up = 0, down = 0, flat = 0, sum = 0;
    items.forEach(function (it) {
      sum += it.pct;
      if (it.pct > 0.05) up += 1;
      else if (it.pct < -0.05) down += 1;
      else flat += 1;
    });
    var n = items.length;
    var avg = sum / n;
    var buckets = [
      { k: '≤-3%', lo: -Infinity, hi: -3, c: 0 },
      { k: '-3~-1', lo: -3, hi: -1, c: 0 },
      { k: '-1~0', lo: -1, hi: 0, c: 0 },
      { k: '0~1', lo: 0, hi: 1, c: 0 },
      { k: '1~3', lo: 1, hi: 3, c: 0 },
      { k: '≥3%', lo: 3, hi: Infinity, c: 0 }
    ];
    items.forEach(function (it) {
      for (var i = 0; i < buckets.length; i++) {
        if (it.pct >= buckets[i].lo && it.pct < buckets[i].hi) { buckets[i].c += 1; break; }
        if (i === buckets.length - 1 && it.pct >= buckets[i].lo) buckets[i].c += 1;
      }
    });
    var maxB = Math.max.apply(null, buckets.map(function (b) { return b.c; })) || 1;
    var ranked = items.slice().sort(function (a, b) { return Math.abs(b.pct) - Math.abs(a.pct); }).slice(0, 8);
    var maxAbs = Math.max.apply(null, ranked.map(function (it) { return Math.abs(it.pct); })) || 1;
    var adPct = Math.round((up / n) * 100);
    host.innerHTML =
      '<div class="mk-pulse">' +
        '<div class="mk-pulse-stats">' +
          '<div class="mk-pulse-stat"><span class="mk-pulse-k">' + bi('Advancers', '上升') + '</span><b class="up">' + up + '</b></div>' +
          '<div class="mk-pulse-stat"><span class="mk-pulse-k">' + bi('Decliners', '下跌') + '</span><b class="down">' + down + '</b></div>' +
          '<div class="mk-pulse-stat"><span class="mk-pulse-k">' + bi('Unchanged', '平市') + '</span><b>' + flat + '</b></div>' +
          '<div class="mk-pulse-stat"><span class="mk-pulse-k">' + bi('Avg move', '平均升跌') + '</span><b class="' + (avg >= 0 ? 'up' : 'down') + '">' + (avg >= 0 ? '+' : '') + avg.toFixed(2) + '%</b></div>' +
        '</div>' +
        '<div class="mk-pulse-ad" role="img" aria-label="advance decline">' +
          '<div class="mk-pulse-ad-fill up" style="width:' + adPct + '%"></div>' +
          '<div class="mk-pulse-ad-fill down" style="width:' + (100 - adPct) + '%"></div>' +
        '</div>' +
        '<p class="mk-pulse-ad-label">' + bi(up + ' up · ' + down + ' down · ' + n + ' names', up + ' 升 · ' + down + ' 跌 · 共 ' + n + ' 個') + '</p>' +
        '<div class="mk-pulse-split">' +
          '<div><h3>' + bi('Move distribution', '升跌分布') + '</h3><div class="mk-pulse-hist">' +
            buckets.map(function (b) {
              var h = Math.max(8, Math.round((b.c / maxB) * 100));
              var cls = b.hi <= 0 ? 'down' : (b.lo >= 0 ? 'up' : '');
              return '<div class="mk-pulse-bar-wrap"><div class="mk-pulse-bar ' + cls + '" style="--h:' + h + '%" title="' + b.k + ': ' + b.c + '"></div><span>' + b.k + '</span><small>' + b.c + '</small></div>';
            }).join('') +
          '</div></div>' +
          '<div><h3>' + bi('Largest |%| moves', '最大絕對波幅') + '</h3><div class="mk-pulse-ranks">' +
            ranked.map(function (it) {
              var w = Math.round((Math.abs(it.pct) / maxAbs) * 100);
              var upn = it.pct >= 0;
              return '<div class="mk-pulse-rank"><span class="mk-pulse-rank-sym">' + esc(it.symbol) + '</span>' +
                '<div class="mk-pulse-rank-track"><span class="mk-pulse-rank-fill ' + (upn ? 'up' : 'down') + '" style="--w:' + w + '%"></span></div>' +
                '<span class="mk-pulse-rank-pct ' + (upn ? 'up' : 'down') + '">' + (upn ? '+' : '') + it.pct.toFixed(2) + '%</span></div>';
            }).join('') +
          '</div></div>' +
        '</div>' +
        '<p class="mk-local-note">' + bi('Delayed desk snapshot — research view only, not investment advice.', '延遲桌面快照，僅供研究，不構成投資建議。') + '</p>' +
      '</div>';
  }

  function mount(host, forceEn) {
    var st = settings();
    if (forceEn) st.locale = 'en';
    var r = REGIONS[region];
    var kind = host.getAttribute('data-tv');
    var slot = host.getAttribute('data-slot') || '';
    var key = region + '|' + themeFilter + '|' + st.locale + st.theme + '|' + kind + '|' + slot;
    if (host.getAttribute('data-key') === key) return;
    host.setAttribute('data-key', key);
    host.classList.remove('ready', 'mk-local');

    // ticker-tape: prefer TradingView scrolling tape; fail() falls back to a local marquee.
    if (kind === 'stock-heatmap' && r.heatMode !== 'tv') {
      renderLocalBreadth(host);
      return;
    }
    if (kind === 'hotlists' && r.moversMode !== 'tv') {
      renderLocalMovers(host);
      return;
    }
    // Theme lists always use the delayed snapshot so every row is on-page
    // (TradingView market-quotes clips groups inside a fixed iframe).
    if (kind === 'market-quotes') {
      renderLocalThemes(host);
      return;
    }

    var cfg = configs(st.locale, st.theme)[kind];
    if (!cfg) { fail(host, kind); return; }
    if (kind === 'mini-symbol-overview') {
      var tape = r.tape || [];
      var ix = parseInt(slot, 10);
      if (isNaN(ix)) ix = 0;
      var pick = tape[ix] || tape[0];
      cfg = Object.assign({}, cfg, { symbol: pick ? pick.proName : (r.live || 'AMEX:SPY') });
    }
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
    s.onerror = function () { fail(host, kind); };
    wrap.appendChild(s);
    host.appendChild(wrap);

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
    setTimeout(function () {
      if (host.getAttribute('data-key') !== key) return;
      var f = host.querySelector('iframe');
      if (f && f.offsetHeight && loaded) return;
      if (loaded && f && !f.offsetHeight && st.locale !== 'en') { host.removeAttribute('data-key'); mount(host, true); return; }
      if (!f || !loaded) fail(host, kind);
    }, 12000);
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
      h.removeAttribute('data-key');
      if (!io || h.getAttribute('data-seen')) mount(h);
      else if (io) io.observe(h);
    });
  }

  function fail(host, kind) {
    if (kind === 'ticker-tape' || host.classList.contains('mk-tape')) { renderLocalTape(host); return; }
    if (kind === 'stock-heatmap') { renderLocalBreadth(host); return; }
    if (kind === 'hotlists') { renderLocalMovers(host); return; }
    if (kind === 'market-quotes') { renderLocalThemes(host); return; }
    if (kind === 'symbol-overview' || kind === 'advanced-chart' || kind === 'mini-symbol-overview') {
      renderLocalBenchmarks(host);
      return;
    }
    if (host.querySelector('.mk-fail')) return;
    var box = document.createElement('div');
    box.className = 'mk-fail';
    box.innerHTML = '<p><span lang="en">This live chart could not load (TradingView may be blocked on this network). The snapshot at the top of the page still works.</span>' +
      '<span lang="zh-Hant">未能載入即時圖表（此網絡可能阻擋了 TradingView）。頁面頂部的市場快照仍可使用。</span></p>';
    host.appendChild(box);
  }

  function paintChrome() {
    var r = REGIONS[region];
    var regBox = document.getElementById('mkRegions');
    if (regBox) {
      regBox.innerHTML = ORDER.map(function (id) {
        var x = REGIONS[id];
        return '<button type="button" class="mk-chip' + (id === region ? ' on' : '') + '" data-region="' + id + '" aria-pressed="' + (id === region) + '">' +
          '<span lang="en">' + x.short_en + '</span><span lang="zh-Hant">' + x.short_zh + '</span></button>';
      }).join('');
      Array.prototype.forEach.call(regBox.querySelectorAll('[data-region]'), function (b) {
        b.addEventListener('click', function () {
          region = b.getAttribute('data-region');
          try { history.replaceState(null, '', '?r=' + region); } catch (e) {}
          document.dispatchEvent(new CustomEvent('marketregion', { detail: region }));
          paintChrome(); renderSnap(); renderDeskPulse(); renderAll();
        });
      });
    }
    var thBox = document.getElementById('mkThemes');
    if (thBox) {
      thBox.innerHTML = THEMES.map(function (t) {
        return '<button type="button" class="mk-chip soft' + (t.id === themeFilter ? ' on' : '') + '" data-theme="' + t.id + '" aria-pressed="' + (t.id === themeFilter) + '">' +
          '<span lang="en">' + t.en + '</span><span lang="zh-Hant">' + t.zh + '</span></button>';
      }).join('');
      Array.prototype.forEach.call(thBox.querySelectorAll('[data-theme]'), function (b) {
        b.addEventListener('click', function () {
          themeFilter = b.getAttribute('data-theme');
          paintChrome(); renderSnap(); renderDeskPulse(); renderAll();
        });
      });
    }
    var st = document.getElementById('mkSnapTitle');
    if (st) st.innerHTML = '<span lang="en">' + r.en + ' snapshot</span><span lang="zh-Hant">' + r.zh + '快照</span>';
    var heatTitle = document.getElementById('mkHeatTitle');
    if (heatTitle) {
      heatTitle.innerHTML = '<span lang="en">' + r.en + ' breadth board</span><span lang="zh-Hant">' + r.zh + '廣度板</span>';
    }
    var heatLede = document.getElementById('mkHeatLede');
    if (heatLede) {
      heatLede.innerHTML = bi('Every name on this desk’s delayed watchlist, coloured by today’s % move.', '此桌面延遲觀察名單全部名稱，按當日升跌%上色。');
    }
    var moversLede = document.getElementById('mkMoversLede');
    if (moversLede) {
      moversLede.innerHTML = bi('Full gainers and losers from this desk’s delayed snapshot — every name listed, every % visible.', '此桌面延遲快照完整升跌名單，每個名稱與升跌%都顯示。');
    }
    var heatWrap = document.getElementById('mkHeatWrap');
    if (heatWrap) heatWrap.hidden = false;
  }

  /* ---------- Snapshot ---------- */
  var snapGrid = document.getElementById('snapGrid');
  var snapUpdated = document.getElementById('snapUpdated');
  var snapAll = null;

  function spark(vals, up) {
    if (!vals || vals.length < 2) return '';
    var w = 72, h = 24, min = Math.min.apply(null, vals), max = Math.max.apply(null, vals), r = max - min || 1;
    var pts = vals.map(function (v, i) { return (i / (vals.length - 1) * w).toFixed(1) + ',' + (h - 2 - (v - min) / r * (h - 4)).toFixed(1); }).join(' ');
    return '<svg class="snap-spark ' + (up ? 'up' : 'down') + '" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" aria-hidden="true"><polyline points="' + pts + '" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/></svg>';
  }
  function stamp(iso) {
    var zh = root.getAttribute('data-lang') === 'zh';
    try { return new Date(iso).toLocaleString(zh ? 'zh-HK' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Hong_Kong' }) + ' HKT'; }
    catch (e) { return iso; }
  }
  function regionPayload() {
    if (!snapAll) return null;
    if (snapAll.regions && snapAll.regions[region]) return snapAll.regions[region];
    if (region === 'us' && snapAll.groups) return { groups: snapAll.groups, updated: snapAll.updated };
    return null;
  }
  function renderSnap() {
    if (!snapGrid) return;
    var pack = regionPayload();
    if (!pack || !pack.groups || !pack.groups.length) {
      snapGrid.innerHTML = '<p class="news-empty">' + bi('Snapshot for this market is not available yet.', '此市場快照暫時未有資料。') + '</p>';
      return;
    }
    var groups = pack.groups.filter(function (g) {
      if (themeFilter === 'all') return true;
      return (g.theme || g.id) === themeFilter || g.id === 'indices' || g.id === 'leaders' || g.id === 'finance';
    });
    if (!groups.length) groups = pack.groups;
    snapGrid.innerHTML = groups.map(function (g) {
      return '<div class="snap-card"><h3>' + bi(esc(g.name_en), esc(g.name_zh)) + '</h3>' +
        snapTable(g.items.map(function (it) {
          return itemRow(it);
        }).join('')) + '</div>';
    }).join('');
    var srcs = {};
    groups.forEach(function (g) { g.items.forEach(function (it) { if (it.src) srcs[it.src] = 1; }); });
    var src = Object.keys(srcs).join(', ') || '—';
    var updated = pack.updated || snapAll.updated;
    snapUpdated.innerHTML = bi('Updated ' + stamp(updated) + ' · Delayed · Source: ' + esc(src),
      '更新時間：' + stamp(updated) + ' · 延遲報價 · 來源：' + esc(src));
  }

  try {
    var m = /[?&]r=([a-z]+)/.exec(location.search);
    if (m && REGIONS[m[1]]) region = m[1];
  } catch (e) {}

  paintChrome();
  if (snapGrid) {
    fetch('data/markets.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) {
        snapAll = j;
        renderSnap();
        renderDeskPulse();
        renderAll();
      })
      .catch(function () {
        snapGrid.innerHTML = '<p class="news-empty">' + bi('The snapshot is not available yet. Please check back later.', '快照暫時未有資料，請稍後再看。') + '</p>';
      });
    document.addEventListener('langchange', function () { renderSnap(); renderDeskPulse(); renderAll(); });
  }

  if (io) hosts.forEach(function (h) { io.observe(h); }); else renderAll();
  document.addEventListener('langchange', function () { renderDeskPulse(); renderAll(); });
  if (dark && dark.addEventListener) dark.addEventListener('change', renderAll);
})();
