/* News page: renders data/news.json (written by tools/fetch_news.py). */
(function () {
  var list = document.getElementById('newsList');
  var updated = document.getElementById('newsUpdated');
  var btns = document.querySelectorAll('[data-news-filter]');
  var root = document.documentElement;
  var data = null;
  var filter = 'all';
  var CAT = {
    finance: ['Finance', '金融'],
    us: ['US politics', '美國政治'],
    china: ['China', '中國'],
    biotech: ['Biotech & health', '生物科技及醫療']
  };

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function bi(en, zh) {
    var f = document.createDocumentFragment();
    var a = el('span', null, en); a.lang = 'en';
    var b = el('span', null, zh); b.lang = 'zh-Hant';
    f.appendChild(a); f.appendChild(b);
    return f;
  }
  function ago(iso) {
    var mins = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
    if (mins < 60) return [mins + ' min ago', mins + ' 分鐘前'];
    var h = Math.round(mins / 60);
    if (h < 48) return [h + ' h ago', h + ' 小時前'];
    var d = Math.round(h / 24);
    return [d + ' days ago', d + ' 日前'];
  }
  function stamp(iso) {
    var d = new Date(iso);
    var zh = root.getAttribute('data-lang') === 'zh';
    try {
      return d.toLocaleString(zh ? 'zh-HK' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Hong_Kong' }) + ' HKT';
    } catch (e) { return d.toISOString(); }
  }

  function render() {
    if (!data) return;
    var items = data.items || [];
    ['all', 'finance', 'us', 'china', 'biotech'].forEach(function (k) {
      var n = k === 'all' ? items.length : items.filter(function (i) { return i.cats.indexOf(k) >= 0; }).length;
      var b = document.querySelector('[data-count="' + k + '"]');
      if (b) b.textContent = n;
    });
    var shown = items.filter(function (i) { return filter === 'all' || i.cats.indexOf(filter) >= 0; });
    list.textContent = '';
    if (!shown.length) {
      var p = el('p', 'news-empty');
      p.appendChild(bi('No headlines in this category right now — check back later.', '此類別暫時沒有新聞，請稍後再看。'));
      list.appendChild(p);
    }
    shown.forEach(function (i) {
      var a = el('a', 'news-item');
      a.href = i.link; a.target = '_blank'; a.rel = 'noopener';
      var meta = el('p', 'news-meta');
      i.cats.forEach(function (c) {
        if (!CAT[c]) return;
        var t = el('span', 'ins-tag'); t.appendChild(bi(CAT[c][0], CAT[c][1])); meta.appendChild(t);
      });
      meta.appendChild(el('span', 'news-src', i.source));
      var when = el('span'); var w = ago(i.date); when.appendChild(bi(w[0], w[1])); meta.appendChild(when);
      a.appendChild(meta);
      a.appendChild(el('h3', null, i.title));
      if (i.summary) a.appendChild(el('p', null, i.summary));
      list.appendChild(a);
    });
    if (data.updated) {
      updated.textContent = '';
      updated.appendChild(bi('Last updated ' + stamp(data.updated) + ' · Sources: ' + data.sources.join(', '),
        '最後更新：' + stamp(data.updated) + ' · 來源：' + data.sources.join('、')));
    }
  }

  btns.forEach(function (b) {
    b.addEventListener('click', function () {
      filter = b.getAttribute('data-news-filter');
      btns.forEach(function (o) { var on = o === b; o.classList.toggle('on', on); o.setAttribute('aria-pressed', String(on)); });
      render();
    });
  });
  document.addEventListener('langchange', render);

  fetch('data/news.json', { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (j) {
      data = j;
      if (!(j.items || []).length) {
        list.textContent = '';
        var p = el('p', 'news-empty');
        p.appendChild(bi('Headlines are being collected for the first time. Please check back shortly.', '正在首次收集新聞，請稍後再看。'));
        list.appendChild(p);
        return;
      }
      render();
    })
    .catch(function () {
      list.textContent = '';
      var p = el('p', 'news-empty');
      p.appendChild(bi('Headlines could not be loaded right now.', '暫時未能載入新聞。'));
      list.appendChild(p);
    });
})();
