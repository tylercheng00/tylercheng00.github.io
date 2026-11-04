(function () {
  var root = document.documentElement;
  var body = document.body;

  /* ---------- Language toggle: EN / 繁 / 简 ---------- */
  // 简 shows the Traditional text converted by sc.js, which is loaded only when needed.
  var SC_SRC = 'sc.js?v=fd9d4562';
  var mainSrc = (document.currentScript && document.currentScript.src) || location.href;
  var scLoading = false;
  function scWanted(on) {
    window.__scWanted = on;
    if (!on) { if (window.SC) window.SC.disable(); root.classList.remove('sc-pending'); return; }
    if (window.SC) { window.SC.enable(); root.classList.remove('sc-pending'); return; }
    if (scLoading) return;
    scLoading = true;
    var s = document.createElement('script');
    s.src = new URL(SC_SRC, mainSrc).href;
    s.onload = s.onerror = function () { root.classList.remove('sc-pending'); };
    document.head.appendChild(s);
  }
  var langButtons = document.querySelectorAll('[data-set-lang]');
  function setLang(lang, save) {
    var sc = lang === 'sc';
    root.setAttribute('data-lang', sc ? 'zh' : lang);
    if (sc) root.setAttribute('data-script', 'sc'); else root.removeAttribute('data-script');
    root.lang = sc ? 'zh-Hans' : lang === 'zh' ? 'zh-Hant' : 'en';
    langButtons.forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-set-lang') === lang));
    });
    if (save) { try { localStorage.setItem('lang', lang); } catch (e) {} }
    try { document.dispatchEvent(new CustomEvent('langchange', { detail: lang })); } catch (e) {}
    scWanted(sc);
  }
  langButtons.forEach(function (b) {
    b.addEventListener('click', function () { setLang(b.getAttribute('data-set-lang'), true); });
  });
  setLang(root.getAttribute('data-script') === 'sc' ? 'sc' : root.getAttribute('data-lang') === 'zh' ? 'zh' : 'en', false);

  /* ---------- Header state + back-to-top ---------- */
  var topbar = document.getElementById('topbar');
  var toTop = document.getElementById('to-top');
  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    topbar.classList.toggle('scrolled', y > 24);
    toTop.classList.toggle('show', y > 700);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile menu ---------- */
  var menuBtn = document.getElementById('menu-btn');
  var nav = document.getElementById('nav');
  function closeMenu() {
    body.classList.remove('menu-open');
    menuBtn.setAttribute('aria-expanded', 'false');
  }
  menuBtn.addEventListener('click', function () {
    var open = !body.classList.contains('menu-open');
    body.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
  });
  nav.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', closeMenu); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });

  /* ---------- Grouped header menu (dropdowns; accordion inside the mobile menu) ---------- */
  var groups = Array.prototype.slice.call(nav.querySelectorAll('.nav-group'));
  function setOpen(g, open) {
    g.classList.toggle('open', open);
    g.querySelector('.nav-top').setAttribute('aria-expanded', String(open));
  }
  function closeGroups(except) { groups.forEach(function (g) { if (g !== except) setOpen(g, false); }); }
  groups.forEach(function (g) {
    g.querySelector('.nav-top').addEventListener('click', function () {
      var open = !g.classList.contains('open');
      closeGroups(g);
      setOpen(g, open);
    });
    g.addEventListener('focusout', function (e) {
      if (!g.contains(e.relatedTarget) && !body.classList.contains('menu-open')) setOpen(g, false);
    });
  });
  nav.querySelectorAll('.nav-menu a').forEach(function (a) { a.addEventListener('click', function () { closeGroups(); }); });
  document.addEventListener('click', function (e) { if (!nav.contains(e.target)) closeGroups(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeGroups(); });

  /* ---------- Reveal on scroll + active nav ---------- */
  if ('IntersectionObserver' in window) {
    var revealer = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); revealer.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.reveal').forEach(function (el, i) {
      el.style.transitionDelay = (i % 4) * 70 + 'ms';
      revealer.observe(el);
    });

    var links = {};
    nav.querySelectorAll('a[href^="#"]').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        Object.keys(links).forEach(function (id) { links[id].classList.toggle('active', id === en.target.id); });
        nav.querySelectorAll('.nav-group').forEach(function (g) { g.classList.toggle('has-active', !!g.querySelector('a.active')); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('main section[id]').forEach(function (s) { spy.observe(s); });
  } else {
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- Contact helpers (read from the links in the page) ---------- */
  if (document.getElementById('vcard-btn')) (function () {
  var emailLink = document.getElementById('contact-email');
  var linkedinLink = document.getElementById('contact-linkedin');
  var email = emailLink.getAttribute('href').replace(/^mailto:/, '');
  var workLink = document.getElementById('contact-email-work');
  var workEmail = workLink ? workLink.getAttribute('href').replace(/^mailto:/, '') : '';

  document.getElementById('vcard-btn').addEventListener('click', function () {
    var vcf = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      'N:Cheng;Tyler Tik Man;;;',
      'FN:Tyler Tik Man Cheng (鄭迪珉)',
      'TITLE:Co-founder (BTRDCC) / Co-founder & COO (Nanotech Innovation) / US Equities Market Specialist (Fuway Capital)',
      'EMAIL;TYPE=INTERNET,HOME:' + email,
      (workEmail ? 'EMAIL;TYPE=INTERNET,WORK:' + workEmail : ''),
      'URL:' + location.origin + location.pathname,
      'URL;TYPE=LinkedIn:' + linkedinLink.href,
      'END:VCARD'
    ].filter(Boolean).join('\r\n');
    var blob = new Blob([vcf], { type: 'text/vcard;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'Tyler-Cheng.vcf';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  });

  var copyBtn = document.getElementById('copy-btn');
  var copyLabel = copyBtn.querySelector('.copy-label');
  var original = copyLabel.innerHTML;
  copyBtn.addEventListener('click', function () {
    function done() {
      var zh = root.getAttribute('data-lang') === 'zh';
      copyLabel.textContent = copyBtn.getAttribute(zh ? 'data-copied-zh' : 'data-copied-en');
      setTimeout(function () { copyLabel.innerHTML = original; }, 1800);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(email).then(done, function () { window.prompt('Email', email); });
    } else {
      window.prompt('Email', email);
    }
  });

  })();

  /* ---------- Copy an ID (WeChat / Xiaohongshu) ---------- */
  document.querySelectorAll('.copy-id[data-copy]').forEach(function (b) {
    var hint = b.querySelector('.copy-hint');
    var original = hint ? hint.innerHTML : '';
    b.addEventListener('click', function () {
      var id = b.getAttribute('data-copy');
      function done() {
        if (!hint) return;
        hint.textContent = root.getAttribute('data-lang') === 'zh' ? '已複製' : 'copied';
        setTimeout(function () { hint.innerHTML = original; }, 1600);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(id).then(done, function () { window.prompt('ID', id); });
      } else {
        window.prompt('ID', id);
      }
    });
  });

  /* ---------- Project filters (projects page) ---------- */
  var filterBtns = document.querySelectorAll('[data-filter]');
  filterBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      var f = b.getAttribute('data-filter');
      filterBtns.forEach(function (o) { var on = o === b; o.classList.toggle('on', on); o.setAttribute('aria-selected', String(on)); });
      document.querySelectorAll('.p-group').forEach(function (g) {
        var hide = f !== 'all' && g.getAttribute('data-group') !== f;
        g.classList.toggle('hidden', hide);
        if (!hide) g.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
      });
    });
  });

  /* ---------- Insights category filter ---------- */
  var catBtns = document.querySelectorAll('[data-cat-filter]');
  catBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      var f = b.getAttribute('data-cat-filter');
      catBtns.forEach(function (o) { var on = o === b; o.classList.toggle('on', on); o.setAttribute('aria-pressed', String(on)); });
      document.querySelectorAll('.ins-card[data-cats]').forEach(function (c) {
        var hide = f !== 'all' && c.getAttribute('data-cats').split(' ').indexOf(f) < 0;
        c.classList.toggle('hidden', hide);
        if (!hide) c.classList.add('in');
      });
    });
  });

  /* ---------- Patent filter ---------- */
  var ptBtns = document.querySelectorAll('[data-pt]');
  ptBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      var f = b.getAttribute('data-pt');
      ptBtns.forEach(function (o) { o.classList.toggle('on', o === b); });
      document.querySelectorAll('.pt-card').forEach(function (c) {
        var hide = f !== 'all' && c.getAttribute('data-st') !== f;
        c.classList.toggle('hide', hide);
        if (!hide) c.classList.add('in');
      });
    });
  });

  /* ---------- Click-to-load YouTube player (privacy-enhanced embed, loaded on play) ---------- */
  document.querySelectorAll('.yt[data-yt]').forEach(function (b) {
    b.addEventListener('click', function () {
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + b.getAttribute('data-yt') + '?autoplay=1&rel=0';
      f.title = 'Video'; f.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture'; f.allowFullscreen = true;
      var wrap = document.createElement('div'); wrap.className = 'media-cover'; wrap.appendChild(f);
      b.replaceWith(wrap);
    });
  });

  /* ---------- Footer year ---------- */
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();
