(function () {
  var root = document.documentElement;
  var buttons = document.querySelectorAll('[data-set-lang]');

  function setLang(lang, save) {
    root.setAttribute('data-lang', lang);
    root.lang = lang === 'zh' ? 'zh-Hant' : 'en';
    buttons.forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-set-lang') === lang));
    });
    if (save) {
      try { localStorage.setItem('lang', lang); } catch (e) {}
    }
  }

  buttons.forEach(function (b) {
    b.addEventListener('click', function () { setLang(b.getAttribute('data-set-lang'), true); });
  });

  setLang(root.getAttribute('data-lang') === 'zh' ? 'zh' : 'en', false);

  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();
