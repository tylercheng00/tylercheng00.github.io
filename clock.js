/* Live clocks: the contact page's time-zone strip and the markets page's
 * "US market open / closed" badge. Updates every 20 seconds, follows EN/中. */
(function () {
  var root = document.documentElement;
  function zh() { return root.getAttribute('data-lang') === 'zh'; }

  // Wall-clock parts of `date` in time zone `tz`
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
    // hide "your time" if the visitor is already in one of the listed zones
    var mine = strip.querySelector('[data-tz=""]');
    if (mine) {
      var same = ['America/New_York', 'Asia/Hong_Kong', 'Asia/Shanghai'].some(function (z) {
        return offsetLabel(now, z) === offsetLabel(now, visitorTz) && fmtTime(now, z) === fmtTime(now, visitorTz);
      });
      mine.hidden = !visitorTz || same;
    }
    // good meeting windows: New York 08:00–09:30 and 20:00–22:00, shown in Hong Kong time
    var tip = strip.querySelector('.tz-tip-times');
    if (tip) {
      var base = new Date(now.getTime());
      function nyTo(h, m, from) {
        // the next instant (in 15-min steps, within 48 h of `from`) when New York reads h:m
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

  /* ---------- markets page: US market status ---------- */
  // NYSE full-day holidays and 1 p.m. early closes (New York dates)
  var HOLIDAYS = {
    '2026-01-01': 1, '2026-01-19': 1, '2026-02-16': 1, '2026-04-03': 1, '2026-05-25': 1, '2026-06-19': 1,
    '2026-07-03': 1, '2026-09-07': 1, '2026-11-26': 1, '2026-12-25': 1,
    '2027-01-01': 1, '2027-01-18': 1, '2027-02-15': 1, '2027-03-26': 1, '2027-05-31': 1, '2027-06-18': 1,
    '2027-07-05': 1, '2027-09-06': 1, '2027-11-25': 1, '2027-12-24': 1
  };
  var EARLY = { '2026-11-27': 1, '2026-12-24': 1, '2027-11-26': 1 };
  var badge = document.querySelector('[data-market-status]');
  function marketState(now) {
    var p = parts(now, 'America/New_York');
    var mins = p.h * 60 + p.m;
    var weekend = p.wd === 'Sat' || p.wd === 'Sun';
    var close = EARLY[p.ymd] ? 13 * 60 : 16 * 60;
    if (weekend || HOLIDAYS[p.ymd]) return { k: 'closed', holiday: !weekend };
    if (mins >= 9 * 60 + 30 && mins < close) return { k: 'open', early: !!EARLY[p.ymd] };
    if (mins >= 4 * 60 && mins < 9 * 60 + 30) return { k: 'pre' };
    if (mins >= close && mins < 20 * 60) return { k: 'post' };
    return { k: 'closed' };
  }
  function renderBadge(now) {
    var s = marketState(now);
    var label = {
      open: zh() ? '美股交易中' : 'US market open',
      pre: zh() ? '盤前交易' : 'Pre-market',
      post: zh() ? '盤後交易' : 'After hours',
      closed: zh() ? (s.holiday ? '美股假期休市' : '美股休市') : (s.holiday ? 'Closed for a holiday' : 'US market closed')
    }[s.k];
    if (s.early) label += zh() ? '（今日提早收市）' : ' (early close today)';
    badge.className = 'mk-status is-' + s.k;
    badge.querySelector('.mk-status-label').textContent = label;
    badge.querySelector('.mk-status-times').textContent =
      (zh() ? '紐約 ' : 'New York ') + fmtTime(now, 'America/New_York') + ' · ' +
      (zh() ? '香港／北京 ' : 'Hong Kong / Beijing ') + fmtTime(now, 'Asia/Hong_Kong') +
      (visitorTz && offsetLabel(now, visitorTz) !== offsetLabel(now, 'America/New_York') && offsetLabel(now, visitorTz) !== offsetLabel(now, 'Asia/Hong_Kong')
        ? ' · ' + (zh() ? '你的時間 ' : 'Your time ') + fmtTime(now, visitorTz) : '');
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
})();
