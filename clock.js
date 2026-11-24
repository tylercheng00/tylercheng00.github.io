/* Live clocks: the contact page's time-zone strip and the markets page's
 * session badge (follows the selected region). Updates every 20 seconds. */
(function () {
  var root = document.documentElement;
  function zh() { return root.getAttribute('data-lang') === 'zh'; }

  function parts(date, tz) {
    var o = {};
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23', weekday: 'short', year: 'numeric', month: '2-digit',
      day: '2-digit', hour: '2-digit', minute: '2-digit'
    }).formatToParts(date).forEach(function (p) { o[p.type] = p.value; });
    return { wd: o.weekday, ymd: o.year + '-' + o.month + '-' + o.day, h: +o.hour, m: +o.minute };
  }
  function fmtTime(date, tz) {
    return new Intl.DateTimeFormat(zh() ? 'zh-Hant-HK' : 'en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' }).format(date);
  }
  function fmtDay(date, tz) {
    return new Intl.DateTimeFormat(zh() ? 'zh-Hant-HK' : 'en-US', { timeZone: tz, weekday: 'short', month: 'short', day: 'numeric' }).format(date);
  }
  function offsetLabel(date, tz) {
    try {
      var n = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(date)
        .filter(function (p) { return p.type === 'timeZoneName'; })[0];
      return n ? n.value.replace('GMT', 'UTC') : '';
    } catch (e) { return ''; }
  }
  var visitorTz = (function () { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { return ''; } })();

  /* ---------- contact page: time-zone strip ---------- */
  var strip = document.querySelector('[data-tz-strip]');
  function renderStrip(now) {
    strip.querySelectorAll('[data-tz]').forEach(function (card) {
      var tz = card.getAttribute('data-tz') || visitorTz;
      if (!tz) { card.hidden = true; return; }
      card.querySelector('.tz-time').textContent = fmtTime(now, tz);
      card.querySelector('.tz-day').textContent = fmtDay(now, tz) + ' · ' + offsetLabel(now, tz);
      var place = card.querySelector('[data-auto]');
      if (place) place.textContent = tz.split('/').pop().replace(/_/g, ' ');
    });
    var mine = strip.querySelector('[data-tz=""]');
    if (mine) {
      var same = ['America/New_York', 'Asia/Hong_Kong', 'Asia/Shanghai'].some(function (z) {
        return offsetLabel(now, z) === offsetLabel(now, visitorTz) && fmtTime(now, z) === fmtTime(now, visitorTz);
      });
      mine.hidden = !visitorTz || same;
    }
    var tip = strip.querySelector('.tz-tip-times');
    if (tip) {
      var base = new Date(now.getTime());
      function nyTo(h, m, from) {
        var start = Math.ceil(from.getTime() / 900000) * 900000;
        for (var i = 0; i < 192; i++) {
          var d = new Date(start + i * 900000);
          var p = parts(d, 'America/New_York');
          if (p.h === h && p.m === m) return d;
        }
        return null;
      }
      var slots = [[20, 0, 22, 0], [8, 0, 9, 30]].map(function (s) {
        var a = nyTo(s[0], s[1], base), b = a && nyTo(s[2], s[3], a);
        if (!a || !b) return '';
        return (zh() ? '紐約 ' : 'New York ') + fmtTime(a, 'America/New_York') + '–' + fmtTime(b, 'America/New_York') +
          (zh() ? ' ＝ 香港／北京 ' : ' = Hong Kong / Beijing ') + fmtTime(a, 'Asia/Hong_Kong') + '–' + fmtTime(b, 'Asia/Hong_Kong');
      }).filter(Boolean);
      tip.textContent = slots.join(zh() ? '；' : '; ');
    }
  }

  /* ---------- markets page: session badge by region ---------- */
  var HOLIDAYS = {
    '2026-01-01': 1, '2026-01-19': 1, '2026-02-16': 1, '2026-04-03': 1, '2026-05-25': 1, '2026-06-19': 1,
    '2026-07-03': 1, '2026-09-07': 1, '2026-11-26': 1, '2026-12-25': 1,
    '2027-01-01': 1, '2027-01-18': 1, '2027-02-15': 1, '2027-03-26': 1, '2027-05-31': 1, '2027-06-18': 1,
    '2027-07-05': 1, '2027-09-06': 1, '2027-11-25': 1, '2027-12-24': 1
  };
  var EARLY = { '2026-11-27': 1, '2026-12-24': 1, '2027-11-26': 1 };

  // Regular cash session only (local TZ). Holidays other than US are treated as weekday hours.
  var SESSIONS = {
    us: { tz: 'America/New_York', open: [9, 30], close: [16, 0], pre: [4, 0], post: [20, 0],
      en: 'US', zh: '美股', place_en: 'New York', place_zh: '紐約' },
    hk: { tz: 'Asia/Hong_Kong', open: [9, 30], close: [16, 0], lunch: [12, 0, 13, 0],
      en: 'HK', zh: '港股', place_en: 'Hong Kong', place_zh: '香港' },
    cn: { tz: 'Asia/Shanghai', open: [9, 30], close: [15, 0], lunch: [11, 30, 13, 0],
      en: 'A-shares', zh: 'A股', place_en: 'Shanghai', place_zh: '上海' },
    tw: { tz: 'Asia/Taipei', open: [9, 0], close: [13, 30],
      en: 'Taiwan', zh: '台股', place_en: 'Taipei', place_zh: '台北' },
    jp: { tz: 'Asia/Tokyo', open: [9, 0], close: [15, 0], lunch: [11, 30, 12, 30],
      en: 'Japan', zh: '日股', place_en: 'Tokyo', place_zh: '東京' },
    kr: { tz: 'Asia/Seoul', open: [9, 0], close: [15, 30],
      en: 'Korea', zh: '韓股', place_en: 'Seoul', place_zh: '首爾' },
    au: { tz: 'Australia/Sydney', open: [10, 0], close: [16, 0],
      en: 'Australia', zh: '澳洲股', place_en: 'Sydney', place_zh: '悉尼' }
  };

  var region = 'us';
  try {
    var m = /[?&]r=([a-z]+)/.exec(location.search);
    if (m && SESSIONS[m[1]]) region = m[1];
  } catch (e) {}

  var badge = document.querySelector('[data-market-status]');

  function minsOf(h, m) { return h * 60 + m; }

  function marketState(now) {
    var s = SESSIONS[region] || SESSIONS.us;
    var p = parts(now, s.tz);
    var mins = minsOf(p.h, p.m);
    var weekend = p.wd === 'Sat' || p.wd === 'Sun';
    if (weekend) return { k: 'closed', holiday: false, sess: s };
    if (region === 'us' && HOLIDAYS[p.ymd]) return { k: 'closed', holiday: true, sess: s };
    var open = minsOf(s.open[0], s.open[1]);
    var close = region === 'us' && EARLY[p.ymd] ? 13 * 60 : minsOf(s.close[0], s.close[1]);
    if (s.lunch) {
      var ls = minsOf(s.lunch[0], s.lunch[1]), le = minsOf(s.lunch[2], s.lunch[3]);
      if (mins >= ls && mins < le) return { k: 'lunch', sess: s };
    }
    if (mins >= open && mins < close) return { k: 'open', early: !!(region === 'us' && EARLY[p.ymd]), sess: s };
    if (region === 'us') {
      if (mins >= minsOf(s.pre[0], s.pre[1]) && mins < open) return { k: 'pre', sess: s };
      if (mins >= close && mins < minsOf(s.post[0], s.post[1])) return { k: 'post', sess: s };
    }
    return { k: 'closed', holiday: false, sess: s };
  }

  function renderBadge(now) {
    var st = marketState(now);
    var s = st.sess;
    var name = zh() ? s.zh : s.en;
    var label = {
      open: zh() ? (name + '交易中') : (name + ' open'),
      lunch: zh() ? (name + '午休') : (name + ' lunch break'),
      pre: zh() ? '盤前交易' : 'Pre-market',
      post: zh() ? '盤後交易' : 'After hours',
      closed: zh()
        ? (st.holiday ? (name + '假期休市') : (name + '休市'))
        : (st.holiday ? (name + ' closed for a holiday') : (name + ' closed'))
    }[st.k];
    if (st.early) label += zh() ? '（今日提早收市）' : ' (early close today)';
    badge.className = 'mk-status is-' + st.k;
    badge.querySelector('.mk-status-label').textContent = label;
    var place = zh() ? s.place_zh : s.place_en;
    var line = place + ' ' + fmtTime(now, s.tz) + ' · ' +
      (zh() ? '香港／北京 ' : 'Hong Kong / Beijing ') + fmtTime(now, 'Asia/Hong_Kong');
    if (visitorTz && offsetLabel(now, visitorTz) !== offsetLabel(now, s.tz) &&
        offsetLabel(now, visitorTz) !== offsetLabel(now, 'Asia/Hong_Kong')) {
      line += ' · ' + (zh() ? '你的時間 ' : 'Your time ') + fmtTime(now, visitorTz);
    }
    badge.querySelector('.mk-status-times').textContent = line;
  }

  function tick() {
    var now = new Date();
    if (strip) renderStrip(now);
    if (badge) renderBadge(now);
  }
  if (!strip && !badge) return;
  tick();
  setInterval(tick, 20000);
  document.addEventListener('langchange', tick);
  document.addEventListener('marketregion', function (ev) {
    if (ev && ev.detail && SESSIONS[ev.detail]) region = ev.detail;
    tick();
  });
})();
