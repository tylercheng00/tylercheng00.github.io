/* Contact page: booking calendar (Cal.com) and message form (Web3Forms).
 *
 * Fill in the two settings below. Until they are set, or if a service cannot
 * be reached (e.g. from mainland China), the page falls back to e-mail:
 * the form opens the visitor's mail app with everything already filled in.
 */
(function () {
  var CONFIG = {
    // Web3Forms access key (https://web3forms.com). It is meant to be public.
    web3formsKey: '9a2c8e9a-6319-44d2-8fe8-fcd2d9c07a55',
    // Cal.com booking link without the domain, e.g. 'username/30min'.
    // Leave empty until a working Cal.com event exists — the broken slug
    // tik-man-cheng-4xumee/30min returns 404 and leaves the book section blank.
    calLink: '',
    // Where messages go when the form falls back to e-mail.
    email: 'info@tylerfuture.com',
    whatsapp: 'https://wa.me/85298229572'
  };

  var root = document.documentElement;
  function zh() { return root.getAttribute('data-lang') === 'zh'; }
  function t(en, zhText) { return zh() ? zhText : en; }

  /* ---------- placeholders follow the language toggle ---------- */
  function placeholders() {
    document.querySelectorAll('[data-ph-en]').forEach(function (el) {
      el.setAttribute('placeholder', el.getAttribute(zh() ? 'data-ph-zh' : 'data-ph-en'));
    });
  }
  function optionLabels() {
    document.querySelectorAll('option[data-zh]').forEach(function (o) {
      o.textContent = o.getAttribute(zh() ? 'data-zh' : 'data-en');
    });
  }
  placeholders(); optionLabels();
  document.addEventListener('langchange', function () { placeholders(); optionLabels(); });

  /* ---------- booking ---------- */
  var calBox = document.getElementById('cal-inline');
  var calSoon = document.getElementById('cal-soon');
  var calFail = document.getElementById('cal-fail');
  function show(el) { if (el) el.hidden = false; }

  function loadCal() {
    /* Cal.com's standard embed loader */
    (function (C, A, L) {
      var p = function (a, ar) { a.q.push(ar); };
      var d = C.document;
      C.Cal = C.Cal || function () {
        var cal = C.Cal; var ar = arguments;
        if (!cal.loaded) {
          cal.ns = {}; cal.q = cal.q || [];
          var s = d.createElement('script'); s.src = A; s.async = true;
          s.onerror = function () { calFailed(); };
          d.head.appendChild(s);
          cal.loaded = true;
        }
        if (ar[0] === L) {
          var api = function () { p(api, arguments); };
          var namespace = ar[1]; api.q = api.q || [];
          if (typeof namespace === 'string') {
            cal.ns[namespace] = cal.ns[namespace] || api;
            p(cal.ns[namespace], ar); p(cal, ['initNamespace', namespace]);
          } else p(cal, ar);
          return;
        }
        p(cal, ar);
      };
    })(window, 'https://app.cal.com/embed/embed.js', 'init');

    window.Cal('init', 'book', { origin: 'https://cal.com' });
    window.Cal.ns.book('inline', {
      elementOrSelector: '#cal-inline',
      calLink: CONFIG.calLink,
      config: { layout: 'month_view', theme: 'auto' }
    });
    window.Cal.ns.book('ui', {
      layout: 'month_view',
      cssVarsPerTheme: { light: { 'cal-brand': '#8d6a28' }, dark: { 'cal-brand': '#c9a35b' } }
    });
    // if nothing has appeared after a while, the service is probably unreachable
    setTimeout(function () { if (!calBox.querySelector('iframe')) calFailed(); }, 12000);
  }
  function calFailed() {
    if (calBox.querySelector('iframe')) return;
    calBox.hidden = true;
    show(calFail);
  }

  if (calBox) {
    if (!CONFIG.calLink) {
      calBox.hidden = true;
      show(calSoon);
    } else if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { io.disconnect(); loadCal(); }
      }, { rootMargin: '400px 0px' });
      io.observe(calBox);
    } else {
      loadCal();
    }
  }

  /* ---------- message form ---------- */
  var form = document.getElementById('msg-form');
  if (!form) return;
  var status = document.getElementById('msg-status');
  var submit = form.querySelector('button[type="submit"]');

  // ?topic=listing preselects the topic (used by the "How I can help" links)
  try {
    var topic = new URLSearchParams(location.search).get('topic');
    var sel = form.querySelector('select[name="topic"]');
    if (topic && sel && sel.querySelector('option[value="' + topic + '"]')) sel.value = topic;
  } catch (e) {}

  function topicLabel() {
    var o = form.topic.options[form.topic.selectedIndex];
    return o ? o.getAttribute('data-en') : '';
  }
  function fields() {
    return {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      company: form.company.value.trim(),
      phone: form.phone.value.trim(),
      topic: topicLabel(),
      time: form.time.value.trim(),
      message: form.message.value.trim()
    };
  }
  function mailtoUrl(f) {
    var lines = ['Name: ' + f.name, 'Email: ' + f.email];
    if (f.company) lines.push('Company: ' + f.company);
    if (f.phone) lines.push('Phone / WeChat / WhatsApp: ' + f.phone);
    lines.push('Topic: ' + f.topic);
    if (f.time) lines.push('Preferred time: ' + f.time);
    lines.push('', f.message);
    var body = lines.join('\n');
    return 'mailto:' + CONFIG.email + '?subject=' + encodeURIComponent('Website enquiry: ' + f.topic + ' — ' + f.name) +
      '&body=' + encodeURIComponent(body);
  }
  function say(kind, html) {
    status.className = 'msg-status ' + kind;
    status.innerHTML = html;
    status.hidden = false;
  }
  function fallback(f, reason) {
    var url = mailtoUrl(f);
    say(reason ? 'warn' : 'info',
      (reason ? '<p>' + t('The form could not be sent from this network.', '表單暫時無法從這個網絡發送。') + '</p>' : '') +
      '<p>' + t('Your e-mail app should open with your message ready to send. If it does not, ',
                '你的電郵程式應已開啟，留言已預先填好，按發送即可。如果沒有開啟，') +
      '<a href="' + url + '">' + t('click here', '請按這裏') + '</a>' +
      t(' or write to ', '，或直接電郵至 ') + '<a href="mailto:' + CONFIG.email + '">' + CONFIG.email + '</a>' + t('.', '。') + '</p>');
    window.location.href = url;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.reportValidity()) return;
    if (form.botcheck.checked) return; // spam bot
    var f = fields();
    if (!CONFIG.web3formsKey) { fallback(f, false); return; }

    submit.disabled = true;
    say('info', '<p>' + t('Sending…', '正在發送…') + '</p>');
    fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        access_key: CONFIG.web3formsKey,
        subject: 'Website enquiry: ' + f.topic + ' — ' + f.name,
        from_name: 'tylerfuture website',
        replyto: f.email,
        name: f.name, email: f.email, company: f.company, phone: f.phone,
        topic: f.topic, preferred_time: f.time, message: f.message,
        page_language: zh() ? 'zh-Hant' : 'en'
      })
    }).then(function (r) { return r.json(); }).then(function (res) {
      if (!res.success) throw new Error(res.message || 'failed');
      form.reset();
      say('ok', '<p><b>' + t('Thank you — your message has been sent.', '謝謝，你的留言已經送出。') + '</b> ' +
        t('I will reply by e-mail, usually within two working days.', '我會以電郵回覆，一般在兩個工作天內。') + '</p>');
    }).catch(function () {
      fallback(f, true);
    }).then(function () { submit.disabled = false; });
  });
})();
