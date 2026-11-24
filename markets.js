/* Stock markets desk: multi-region TradingView embeds + delayed snapshot. */
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
      heat: true, heatSource: 'SPX500', exchange: 'US',
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
      heat: false, exchange: 'HKEX',
      tape: [
        { proName: 'HSI:HSI', title: 'Hang Seng' },
        { proName: 'HKEX:0700', title: 'Tencent' },
        { proName: 'HKEX:9988', title: 'Alibaba-SW' },
        { proName: 'HKEX:3690', title: 'Meituan' },
        { proName: 'HKEX:1810', title: 'Xiaomi' },
        { proName: 'HKEX:9618', title: 'JD-SW' },
        { proName: 'HKEX:0388', title: 'HKEX' },
        { proName: 'HKEX:1299', title: 'AIA' }
      ],
      benchmarks: [
        ['Hang Seng', 'HSI:HSI|1D'], ['HS Tech', 'HSI:HSTECH|1D'],
        ['Tencent', 'HKEX:0700|1D'], ['Alibaba-SW', 'HKEX:9988|1D']
      ],
      quotes: function (zh) {
        return [
          { name: zh ? '人工智能' : 'Artificial intelligence', theme: 'ai', symbols: [
            q('HKEX:0700', 'Tencent'), q('HKEX:9988', 'Alibaba-SW'), q('HKEX:3690', 'Meituan'),
            q('HKEX:1810', 'Xiaomi'), q('HKEX:1024', 'Kuaishou'), q('HKEX:9618', 'JD-SW')
          ] },
          { name: zh ? '晶片' : 'Semiconductors', theme: 'chip', symbols: [
            q('HKEX:0981', 'SMIC'), q('HKEX:1347', 'Hua Hong'), q('HKEX:2577', 'Innoscience'),
            q('HKEX:2382', 'Sunny Optical'), q('HKEX:6869', 'Yangtze Optical')
          ] },
          { name: zh ? '航天' : 'Aerospace', theme: 'aero', symbols: [
            q('HKEX:2357', 'AVIC'), q('HKEX:2329', 'Guizhou Aviation'),
            q('HKEX:0317', 'COSCO Shipping'), q('HKEX:0753', 'Air China')
          ] }
        ];
      }
    },
    cn: {
      en: 'A-shares', zh: 'A股', short_en: 'A-shares', short_zh: 'A股',
      heat: false, exchange: 'SSE',
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
      heat: false, exchange: 'TWSE',
      tape: [
        { proName: 'TVC:TAIEX', title: 'TAIEX' },
        { proName: 'TWSE:2330', title: 'TSMC' },
        { proName: 'TWSE:2317', title: 'Hon Hai' },
        { proName: 'TWSE:2454', title: 'MediaTek' },
        { proName: 'TWSE:2303', title: 'UMC' },
        { proName: 'TWSE:2382', title: 'Quanta' }
      ],
      benchmarks: [
        ['TAIEX', 'TVC:TAIEX|1D'], ['TSMC', 'TWSE:2330|1D'],
        ['Hon Hai', 'TWSE:2317|1D'], ['MediaTek', 'TWSE:2454|1D']
      ],
      quotes: function (zh) {
        return [
          { name: zh ? '人工智能' : 'Artificial intelligence', theme: 'ai', symbols: [
            q('TWSE:2330', 'TSMC'), q('TWSE:2454', 'MediaTek'), q('TWSE:2382', 'Quanta'),
            q('TWSE:3231', 'Wistron'), q('TWSE:2356', 'Inventec')
          ] },
          { name: zh ? '晶片' : 'Semiconductors', theme: 'chip', symbols: [
            q('TWSE:2330', 'TSMC'), q('TWSE:2303', 'UMC'), q('TWSE:3711', 'ASE'),
            q('TWSE:3034', 'Novatek'), q('TWSE:2379', 'Realtek'), q('TWSE:2454', 'MediaTek')
          ] },
          { name: zh ? '航天' : 'Aerospace', theme: 'aero', symbols: [
            q('TWSE:2634', 'Aerospace Industrial'), q('TWSE:2630', 'AIDC'),
            q('TWSE:2545', 'Huang Hsiang'), q('TWSE:2637', 'Wisdom Marine')
          ] }
        ];
      }
    },
    jp: {
      en: 'Japan', zh: '日本', short_en: 'Japan', short_zh: '日股',
      heat: false, exchange: 'TSE',
      tape: [
        { proName: 'TVC:NI225', title: 'Nikkei 225' },
        { proName: 'TSE:7203', title: 'Toyota' },
        { proName: 'TSE:6758', title: 'Sony' },
        { proName: 'TSE:9984', title: 'SoftBank' },
        { proName: 'TSE:6861', title: 'Keyence' },
        { proName: 'TSE:8035', title: 'Tokyo Electron' }
      ],
      benchmarks: [
        ['Nikkei 225', 'TVC:NI225|1D'], ['TOPIX', 'TVC:TOPX|1D'],
        ['SoftBank', 'TSE:9984|1D'], ['Tokyo Electron', 'TSE:8035|1D']
      ],
      quotes: function (zh) {
        return [
          { name: zh ? '人工智能' : 'Artificial intelligence', theme: 'ai', symbols: [
            q('TSE:9984', 'SoftBank'), q('TSE:6758', 'Sony'), q('TSE:6861', 'Keyence'),
            q('TSE:4063', 'Shin-Etsu'), q('TSE:6501', 'Hitachi')
          ] },
          { name: zh ? '晶片' : 'Semiconductors', theme: 'chip', symbols: [
            q('TSE:8035', 'Tokyo Electron'), q('TSE:6857', 'Advantest'), q('TSE:6920', 'Lasertec'),
            q('TSE:7735', 'SCREEN'), q('TSE:4063', 'Shin-Etsu')
          ] },
          { name: zh ? '航天' : 'Aerospace', theme: 'aero', symbols: [
            q('TSE:7011', 'Mitsubishi Heavy'), q('TSE:9202', 'ANA'),
            q('TSE:9201', 'JAL'), q('TSE:7013', 'IHI')
          ] }
        ];
      }
    },
    kr: {
      en: 'Korea', zh: '韓國', short_en: 'Korea', short_zh: '韓股',
      heat: false, exchange: 'KRX',
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
      heat: false, exchange: 'ASX',
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
          { name: zh ? '人工智能' : 'Artificial intelligence', theme: 'ai', symbols: [
            q('ASX:XRO', 'Xero'), q('ASX:WTC', 'WiseTech'), q('ASX:APX', 'Appen'),
            q('ASX:CPU', 'Computershare'), q('ASX:TNE', 'Technology One')
          ] },
          { name: zh ? '晶片' : 'Semiconductors', theme: 'chip', symbols: [
            q('ASX:DDR', 'Dicker Data'), q('ASX:ALU', 'Altium'), q('ASX:NVX', 'Novonix'),
            q('ASX:4DS', '4DS Memory'), q('ASX:BRE', 'Brazilian Rare Earths')
          ] },
          { name: zh ? '航天' : 'Aerospace', theme: 'aero', symbols: [
            q('ASX:DRO', 'DroneShield'), q('ASX:EOS', 'Electro Optic'),
            q('ASX:QAN', 'Qantas'), q('ASX:AIA', 'Auckland Airport')
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
    var groups = r.quotes(zh).filter(function (g) {
      return themeFilter === 'all' || g.theme === themeFilter || g.theme === 'bio';
    });
    if (themeFilter !== 'all') {
      groups = r.quotes(zh).filter(function (g) { return g.theme === themeFilter; });
    }
    if (!groups.length) groups = r.quotes(zh);
    return {
      'ticker-tape': Object.assign({}, common, { symbols: r.tape, showSymbolLogo: true, displayMode: 'adaptive' }),
      'symbol-overview': Object.assign({}, common, {
        symbols: r.benchmarks, chartOnly: false, width: '100%', height: '100%', autosize: true,
        showVolume: false, hideDateRanges: false, scalePosition: 'right', scaleMode: 'Normal',
        chartType: 'area', lineWidth: 2, dateRanges: ['1d|1', '1m|30', '3m|60', '12m|1D', '60m|1W', 'all|1M']
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

  function mount(host, forceEn) {
    var st = settings();
    if (forceEn) st.locale = 'en';
    var key = region + '|' + themeFilter + '|' + st.locale + st.theme;
    if (host.getAttribute('data-key') === key) return;
    host.setAttribute('data-key', key);
    host.classList.remove('ready');
    var kind = host.getAttribute('data-tv');
    if (kind === 'stock-heatmap' && !REGIONS[region].heat) {
      host.innerHTML = '<div class="mk-heat-note"><p><span lang="en">Heatmap is shown for the US desk. This market uses the thematic lists and movers panels instead — cleaner on mobile.</span><span lang="zh-Hant">熱力圖主要用於美股桌面。此市場改以主題名單與升跌榜呈現，手機上更整齊。</span></p></div>';
      host.classList.add('ready');
      return;
    }
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
      h.removeAttribute('data-key');
      if (!io || h.getAttribute('data-seen')) mount(h);
      else if (io) io.observe(h);
    });
  }

  function fail(host) {
    if (host.classList.contains('mk-tape')) { host.style.display = 'none'; return; }
    if (host.querySelector('.mk-fail')) return;
    var box = document.createElement('div');
    box.className = 'mk-fail';
    box.innerHTML = '<p><span lang="en">This live chart could not load (TradingView may be blocked on this network). The snapshot at the top of the page still works.</span>' +
      '<span lang="zh-Hant">未能載入即時圖表（此網絡可能阻擋了 TradingView）。頁面頂部的市場快照仍可使用。</span></p>';
    host.appendChild(box);
  }

  /* ---------- Region + theme chrome ---------- */
  function paintChrome() {
    var zh = settings().zh;
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
          paintChrome(); renderSnap(); renderAll();
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
          paintChrome(); renderSnap(); renderAll();
        });
      });
    }
    var st = document.getElementById('mkSnapTitle');
    if (st) st.innerHTML = '<span lang="en">' + r.en + ' snapshot</span><span lang="zh-Hant">' + r.zh + '快照</span>';
    var heatWrap = document.getElementById('mkHeatWrap');
    if (heatWrap) heatWrap.hidden = !r.heat;
  }

  /* ---------- Snapshot ---------- */
  var snapGrid = document.getElementById('snapGrid');
  var snapUpdated = document.getElementById('snapUpdated');
  var snapAll = null;

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
      return (g.theme || g.id) === themeFilter || (themeFilter === 'ai' && (g.id === 'ai' || g.theme === 'ai')) ||
        (themeFilter === 'chip' && (g.id === 'chip' || g.theme === 'chip')) ||
        (themeFilter === 'aero' && (g.id === 'aero' || g.theme === 'aero')) ||
        g.id === 'indices';
    });
    if (!groups.length) groups = pack.groups;
    snapGrid.innerHTML = groups.map(function (g) {
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
    groups.forEach(function (g) { g.items.forEach(function (it) { if (it.src) srcs[it.src] = 1; }); });
    var src = Object.keys(srcs).join(', ') || '—';
    var updated = pack.updated || snapAll.updated;
    snapUpdated.innerHTML = bi('Updated ' + stamp(updated) + ' · Delayed · Source: ' + esc(src),
      '更新時間：' + stamp(updated) + ' · 延遲報價 · 來源：' + esc(src));
  }

  // URL ?r=
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
