/* Alchemy Lab X — lab scene, characters, actions */
(() => {
  'use strict';
  const C = window.Chem;
  const NS = 'http://www.w3.org/2000/svg';
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
  };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function tween(ms, fn) {
    return new Promise(res => {
      const t0 = performance.now();
      const step = now => { const t = Math.min(1, (now - t0) / ms); fn(ease(t)); if (t < 1) requestAnimationFrame(step); else res(); };
      requestAnimationFrame(step);
    });
  }
  const hex2rgb = h => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
  const rgb2hex = c => '#' + c.map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => rgb2hex(hex2rgb(a).map((v, i) => v + (hex2rgb(b)[i] - v) * t));

  /* ================= SOUND ================= */
  const Snd = {
    ctx: null, on: store.get('alx-sound', true), master: null, nb: null,
    ensure() {
      if (!this.ctx) {
        try {
          this.ctx = new (window.AudioContext || window.webkitAudioContext)();
          this.master = this.ctx.createGain(); this.master.gain.value = .55; this.master.connect(this.ctx.destination);
        } catch (e) { this.ctx = null; }
      }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },
    noiseBuf() {
      if (!this.nb) {
        const c = this.ctx, b = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = b.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        this.nb = b;
      }
      return this.nb;
    },
    noise(dur, o = {}) {
      if (!this.on || !this.ctx) return;
      const c = this.ctx, t = c.currentTime + (o.delay || 0);
      const s = c.createBufferSource(); s.buffer = this.noiseBuf(); s.loop = true;
      const f = c.createBiquadFilter(); f.type = o.type || 'bandpass'; f.frequency.value = o.freq || 1000; f.Q.value = o.q || 1;
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(o.gain || .3, t + (o.attack || .01));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(g); g.connect(this.master); s.start(t); s.stop(t + dur + .05);
    },
    tone(freq, dur, o = {}) {
      if (!this.on || !this.ctx) return;
      const c = this.ctx, t = c.currentTime + (o.delay || 0);
      const osc = c.createOscillator(); osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(freq, t);
      if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + dur);
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(o.gain || .2, t + (o.attack || .005));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g); g.connect(this.master); osc.start(t); osc.stop(t + dur + .05);
    },
    play(name, d) {
      switch (name) {
        case 'pop': this.tone(900, .13, { to: 160, gain: .45, type: 'triangle' }); this.noise(.12, { type: 'highpass', freq: 1800, gain: .4 }); break;
        case 'fizz': this.noise(d || 2.5, { freq: 4200, q: .6, gain: .07, attack: .25 }); break;
        case 'sizzle': this.noise(d || 2.5, { type: 'highpass', freq: 5000, gain: .12, attack: .05 }); this.tone(220, .3, { gain: .05, type: 'sawtooth', to: 110 }); break;
        case 'boom': this.noise(1.6, { type: 'lowpass', freq: 600, gain: .9, attack: .005 }); this.tone(80, 1.1, { to: 30, gain: .6 }); this.noise(2.5, { type: 'highpass', freq: 5000, gain: .1, delay: .1 }); break;
        case 'whoosh': this.noise(.7, { type: 'lowpass', freq: 900, gain: .35, attack: .08 }); break;
        case 'whistle': this.tone(2700, .22, { gain: .16 }); this.tone(2700, .5, { gain: .16, delay: .3 }); break;
        case 'ding': this.tone(880, .16, { gain: .18, type: 'triangle' }); this.tone(1318, .3, { gain: .18, type: 'triangle', delay: .12 }); this.tone(1760, .45, { gain: .14, type: 'triangle', delay: .24 }); break;
        case 'chime': this.tone(1046, .5, { gain: .08, type: 'triangle' }); this.tone(1568, .6, { gain: .06, type: 'triangle', delay: .08 }); break;
        case 'pour': this.noise(d || .9, { freq: 800, q: 2.5, gain: .12, attack: .12 }); break;
        case 'clink': this.tone(2400, .08, { gain: .1 }); this.tone(3600, .07, { gain: .07, delay: .025 }); break;
        case 'click': this.tone(1400, .03, { gain: .05 }); break;
        case 'water': this.noise(d || 1.4, { freq: 1500, q: .8, gain: .12, attack: .1 }); break;
        case 'tada': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, .35, { gain: .12, type: 'triangle', delay: i * .1 })); break;
      }
    },
  };

  /* ================= SCENE ================= */
  const svg = $('#svg');
  const world = el('g', { id: 'world' }, svg);
  const defs = el('defs', null, svg);
  const L = {};
  ['bg', 'chars', 'bench', 'beaker', 'fx', 'front', 'top'].forEach(k => { L[k] = el('g', { class: 'layer-' + k }, world); });

  const FEET = 625;
  const BK = { x: 640, y: 418 }; // beaker bottom centre (home)
  const POS = { cab: 175, hook: 330, home: 770, rack: 935, sink: 1182, fburner: 1050 };

  function grad(id, stops, x2 = 0, y2 = 1) {
    const g = el('linearGradient', { id, x1: 0, y1: 0, x2, y2 }, defs);
    stops.forEach(([o, c, op]) => el('stop', { offset: o, 'stop-color': c, 'stop-opacity': op == null ? 1 : op }, g));
  }
  grad('gWall', [[0, '#eef3f6'], [1, '#d9e3ea']]);
  grad('gFloor', [[0, '#c9b28f'], [1, '#a88d68']]);
  grad('gWood', [[0, '#c99a69'], [1, '#a77a4d']]);
  grad('gTop', [[0, '#48505e'], [1, '#2f3540']]);
  grad('gGlass', [[0, '#ffffff', .35], [.5, '#dff1ff', .12], [1, '#ffffff', .3]], 1, 0);
  grad('gFlame', [[0, '#bfe4ff', .95], [.45, '#3a7bff', .9], [1, '#1a3cff', .2]]);
  const glow = el('filter', { id: 'fGlow', x: '-50%', y: '-50%', width: '200%', height: '200%' }, defs);
  el('feGaussianBlur', { stdDeviation: 6 }, glow);
  const blur = el('filter', { id: 'fBlur', x: '-50%', y: '-50%', width: '200%', height: '200%' }, defs);
  el('feGaussianBlur', { stdDeviation: 3 }, blur);

  function hot(g, action, label) {
    g.classList.add('hot'); g.dataset.action = action;
    g.setAttribute('tabindex', '0'); g.setAttribute('role', 'button');
    if (label) { g.setAttribute('aria-label', label); el('title', null, g).textContent = label; }
    return g;
  }

  /* --- room --- */
  el('rect', { x: 0, y: 0, width: 1280, height: 545, fill: 'url(#gWall)' }, L.bg);
  for (let y = 60; y < 540; y += 60) el('line', { x1: 0, y1: y, x2: 1280, y2: y, stroke: '#cfdae2', 'stroke-width': 1 }, L.bg);
  el('rect', { x: 0, y: 545, width: 1280, height: 175, fill: 'url(#gFloor)' }, L.bg);
  for (let i = -12; i <= 24; i++) el('line', { x1: 640 + i * 60, y1: 545, x2: 640 + i * 140, y2: 720, stroke: 'rgba(0,0,0,.08)' }, L.bg);
  [575, 615, 665, 720].forEach(y => el('line', { x1: 0, y1: y, x2: 1280, y2: y, stroke: 'rgba(0,0,0,.08)' }, L.bg));
  el('rect', { x: 0, y: 535, width: 1280, height: 12, fill: '#8c9aa6' }, L.bg);

  /* whiteboard */
  el('rect', { x: 382, y: 34, width: 496, height: 252, rx: 6, fill: '#9aa6b2' }, L.bg);
  el('rect', { x: 390, y: 42, width: 480, height: 236, rx: 3, fill: '#fdfefe' }, L.bg);
  el('rect', { x: 430, y: 284, width: 400, height: 8, rx: 3, fill: '#8a96a2' }, L.bg);
  [['#e33', 470], ['#24c', 490], ['#1a1', 510]].forEach(([c, x]) => el('rect', { x, y: 278, width: 16, height: 6, rx: 2, fill: c }, L.bg));
  const boardFO = el('foreignObject', { x: 400, y: 48, width: 460, height: 226 }, L.bg);
  const boardDiv = document.createElement('div'); boardDiv.className = 'board';
  boardFO.appendChild(boardDiv);

  /* clock */
  const clockG = el('g', { transform: 'translate(925,105)' }, L.bg);
  el('circle', { r: 38, fill: '#fff', stroke: '#3a4656', 'stroke-width': 5 }, clockG);
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; el('line', { x1: Math.sin(a) * 28, y1: -Math.cos(a) * 28, x2: Math.sin(a) * 33, y2: -Math.cos(a) * 33, stroke: '#3a4656', 'stroke-width': 2 }, clockG); }
  const hHand = el('line', { x1: 0, y1: 0, x2: 0, y2: -18, stroke: '#222', 'stroke-width': 4, 'stroke-linecap': 'round' }, clockG);
  const mHand = el('line', { x1: 0, y1: 0, x2: 0, y2: -27, stroke: '#222', 'stroke-width': 3, 'stroke-linecap': 'round' }, clockG);
  const sHand = el('line', { x1: 0, y1: 4, x2: 0, y2: -30, stroke: '#d33', 'stroke-width': 1.5 }, clockG);
  el('circle', { r: 3, fill: '#d33' }, clockG);

  /* periodic table poster */
  const pt = el('g', { transform: 'translate(985,40)' }, L.bg);
  el('rect', { x: 0, y: 0, width: 268, height: 168, rx: 4, fill: '#fffdf6', stroke: '#c9c2a8', 'stroke-width': 2 }, pt);
  el('text', { x: 134, y: 20, 'text-anchor': 'middle', class: 'svgt', 'font-size': 13, 'font-weight': 700, fill: '#334' }, pt).textContent = '週期表 Periodic Table';
  const grpCol = c => c <= 1 ? '#ff9f8a' : c === 2 ? '#ffd08a' : c <= 12 ? '#ffe9a6' : c <= 16 ? '#a8e6b8' : c === 17 ? '#9fd6ff' : '#d4b8ff';
  for (let r = 0; r < 7; r++) for (let c = 0; c < 18; c++) {
    if (r === 0 && c > 0 && c < 17) continue;
    if ((r === 1 || r === 2) && c > 1 && c < 12) continue;
    el('rect', { x: 8 + c * 14.2, y: 30 + r * 18, width: 12.5, height: 16, rx: 1.5, fill: grpCol(c + 1) }, pt);
  }
  /* safety sign */
  const sign = el('g', { transform: 'translate(985,228)' }, L.bg);
  el('rect', { width: 268, height: 64, rx: 6, fill: '#ffd23a', stroke: '#333', 'stroke-width': 2 }, sign);
  el('path', { d: 'M30,12 L50,48 L10,48Z', fill: '#ffd23a', stroke: '#222', 'stroke-width': 3, 'stroke-linejoin': 'round' }, sign);
  el('text', { x: 30, y: 44, 'text-anchor': 'middle', 'font-size': 22, 'font-weight': 900, fill: '#222', class: 'svgt' }, sign).textContent = '!';
  el('text', { x: 62, y: 28, 'font-size': 15, 'font-weight': 800, fill: '#222', class: 'svgt' }, sign).textContent = '實驗室安全守則';
  el('text', { x: 62, y: 48, 'font-size': 12, fill: '#222', class: 'svgt' }, sign).textContent = '戴護目鏡 · 著實驗袍 · 唔好食嘢';

  /* reagent cabinet */
  const cab = hot(el('g', null, L.bg), 'cabinet', '試劑櫃');
  el('rect', { x: 26, y: 70, width: 288, height: 480, rx: 6, fill: '#8b5e3c' }, cab);
  el('rect', { x: 20, y: 62, width: 300, height: 18, rx: 4, fill: '#6f4a2e' }, cab);
  el('rect', { x: 40, y: 88, width: 260, height: 352, fill: '#e9f4f8' }, cab);
  el('text', { x: 170, y: 76, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: '#fde9c8', class: 'svgt' }, cab).textContent = '試劑櫃  REAGENTS';
  const shelfY = [170, 255, 340, 425];
  const cabCols = ['#f4f4f4', '#2f86ff', '#d9962e', '#c0663a', '#f2d81e', '#222', '#9fe08a', '#e8e8e8', '#3fb54a', '#2a7bf0'];
  shelfY.forEach((y, si) => {
    el('rect', { x: 40, y, width: 260, height: 6, fill: '#b9c9d2' }, cab);
    for (let i = 0; i < 7; i++) {
      const x = 52 + i * 35 + (si % 2) * 8, h = 34 + ((i * 7 + si * 3) % 4) * 6, col = cabCols[(i * 3 + si) % cabCols.length];
      el('rect', { x, y: y - h, width: 24, height: h, rx: 4, fill: 'rgba(255,255,255,.65)', stroke: '#8fa3b0' }, cab);
      el('rect', { x: x + 2, y: y - h * .62, width: 20, height: h * .62 - 2, rx: 3, fill: col, opacity: .85 }, cab);
      el('rect', { x: x + 4, y: y - h * .5, width: 16, height: 9, fill: '#fff', opacity: .9 }, cab);
      el('rect', { x: x + 6, y: y - h - 6, width: 12, height: 8, rx: 2, fill: si % 2 ? '#333' : '#8a2b2b' }, cab);
    }
  });
  el('line', { x1: 170, y1: 88, x2: 170, y2: 440, stroke: '#6f4a2e', 'stroke-width': 5 }, cab);
  el('path', { d: 'M60,100 L110,100 L60,180Z M190,100 L230,100 L190,160Z', fill: '#fff', opacity: .35 }, cab);
  el('rect', { x: 40, y: 450, width: 126, height: 90, rx: 3, fill: '#a57449' }, cab);
  el('rect', { x: 174, y: 450, width: 126, height: 90, rx: 3, fill: '#a57449' }, cab);
  el('circle', { cx: 156, cy: 495, r: 5, fill: '#e3c38c' }, cab); el('circle', { cx: 184, cy: 495, r: 5, fill: '#e3c38c' }, cab);
  el('circle', { cx: 160, cy: 270, r: 5, fill: '#e3c38c' }, cab); el('circle', { cx: 180, cy: 270, r: 5, fill: '#e3c38c' }, cab);
  const hz = el('g', { transform: 'translate(250,470)' }, cab);
  el('rect', { x: -14, y: -14, width: 28, height: 28, transform: 'rotate(45)', fill: '#fff', stroke: '#d22', 'stroke-width': 3 }, hz);
  el('text', { y: 7, 'text-anchor': 'middle', 'font-size': 18, 'font-weight': 900, fill: '#222', class: 'svgt' }, hz).textContent = '!';

  /* hooks: goggles + coat */
  const hooks = hot(el('g', null, L.bg), 'wear', '護目鏡同實驗袍');
  el('rect', { x: 318, y: 196, width: 54, height: 14, rx: 3, fill: '#6f4a2e' }, hooks);
  el('circle', { cx: 332, cy: 212, r: 3, fill: '#bbb' }, hooks); el('circle', { cx: 358, cy: 212, r: 3, fill: '#bbb' }, hooks);
  const hookCoat = el('g', null, hooks);
  el('path', { d: 'M332,214 L312,236 L314,380 L352,380 L352,236Z', fill: '#f8fafc', stroke: '#c5d0dc', 'stroke-width': 2 }, hookCoat);
  el('path', { d: 'M332,214 L324,260 M332,214 L342,260', stroke: '#c5d0dc', 'stroke-width': 2 }, hookCoat);
  const hookGog = el('g', null, hooks);
  el('path', { d: 'M358,214 Q340,240 352,250 M358,214 Q378,240 366,250', fill: 'none', stroke: '#2b3a4a', 'stroke-width': 3 }, hookGog);
  el('rect', { x: 340, y: 244, width: 38, height: 16, rx: 7, fill: 'rgba(140,210,255,.7)', stroke: '#2b3a4a', 'stroke-width': 2.5 }, hookGog);
  const hookLabel = el('text', { x: 345, y: 186, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: '#2b3a4a', class: 'svgt' }, hooks);
  hookLabel.textContent = '安全裝備';

  /* --- benches (front of characters) --- */
  const bench = el('g', null, L.bench);
  el('path', { d: 'M350,468 L1072,468 L1082,500 L340,500Z', fill: 'url(#gTop)' }, bench);
  el('rect', { x: 340, y: 500, width: 742, height: 200, fill: 'url(#gWood)' }, bench);
  [0, 1, 2, 3].forEach(i => {
    el('rect', { x: 356 + i * 182, y: 516, width: 166, height: 70, rx: 4, fill: 'rgba(0,0,0,.06)', stroke: 'rgba(0,0,0,.18)' }, bench);
    el('rect', { x: 419 + i * 182, y: 545, width: 40, height: 8, rx: 4, fill: '#6e5034' }, bench);
    el('rect', { x: 356 + i * 182, y: 600, width: 166, height: 86, rx: 4, fill: 'rgba(0,0,0,.05)', stroke: 'rgba(0,0,0,.15)' }, bench);
  });
  // sink counter
  const sink = hot(el('g', null, L.bench), 'wash', '洗手盆（洗燒杯）');
  el('path', { d: 'M1096,468 L1280,468 L1280,500 L1090,500Z', fill: 'url(#gTop)' }, sink);
  el('rect', { x: 1090, y: 500, width: 190, height: 200, fill: 'url(#gWood)' }, sink);
  el('ellipse', { cx: 1185, cy: 482, rx: 58, ry: 9, fill: '#1e2229', stroke: '#9aa3ad', 'stroke-width': 3 }, sink);
  el('path', { d: 'M1225,472 L1225,402 Q1225,384 1207,384 L1180,384 Q1170,384 1170,394 L1170,402', fill: 'none', stroke: '#b9c2cc', 'stroke-width': 9, 'stroke-linecap': 'round' }, sink);
  el('rect', { x: 1214, y: 430, width: 22, height: 8, rx: 3, fill: '#d33' }, sink);
  const tapWater = el('rect', { x: 1166, y: 404, width: 8, height: 70, fill: 'rgba(140,200,255,.8)', opacity: 0 }, sink);
  el('text', { x: 1185, y: 530, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, fill: '#5a3d22', class: 'svgt' }, sink).textContent = '洗手盆';

  // safety screen (folded on bench when unused)
  const scrFold = hot(el('g', null, L.bench), 'screen', '安全屏');
  el('rect', { x: 372, y: 410, width: 16, height: 60, rx: 2, fill: 'rgba(190,225,255,.5)', stroke: '#7c93a6', 'stroke-width': 2 }, scrFold);
  el('rect', { x: 386, y: 410, width: 16, height: 60, rx: 2, fill: 'rgba(190,225,255,.5)', stroke: '#7c93a6', 'stroke-width': 2 }, scrFold);
  el('rect', { x: 400, y: 410, width: 16, height: 60, rx: 2, fill: 'rgba(190,225,255,.5)', stroke: '#7c93a6', 'stroke-width': 2 }, scrFold);
  el('text', { x: 394, y: 402, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: '#2b3a4a', class: 'svgt' }, scrFold).textContent = '安全屏';

  // Bunsen burner + tripod (main)
  const burnerG = hot(el('g', null, L.bench), 'burner', '本生燈');
  el('path', { d: `M${BK.x - 26},494 L${BK.x + 26},494 L${BK.x + 20},482 L${BK.x - 20},482Z`, fill: '#4a4f57' }, burnerG);
  el('rect', { x: BK.x - 8, y: 440, width: 16, height: 44, fill: '#9aa3ad' }, burnerG);
  el('rect', { x: BK.x - 10, y: 466, width: 20, height: 7, fill: '#c8a03a' }, burnerG);
  el('path', { d: `M${BK.x + 20},488 Q${BK.x + 60},492 ${BK.x + 70},498`, fill: 'none', stroke: '#e0782a', 'stroke-width': 5 }, burnerG);
  const tripod = el('g', null, L.bench);
  el('path', { d: `M${BK.x - 54},496 L${BK.x - 44},424 M${BK.x + 54},496 L${BK.x + 44},424 M${BK.x},496 L${BK.x},492`, stroke: '#30353d', 'stroke-width': 5, 'stroke-linecap': 'round' }, tripod);
  el('rect', { x: BK.x - 58, y: 418, width: 116, height: 6, rx: 2, fill: '#6b7280' }, tripod);
  for (let i = -52; i <= 52; i += 8) el('line', { x1: BK.x + i, y1: 418, x2: BK.x + i, y2: 424, stroke: '#9aa3ad', 'stroke-width': 1 }, tripod);
  const mainFlame = el('path', { fill: 'url(#gFlame)', opacity: 0 }, L.bench);
  const heatGlow = el('ellipse', { cx: BK.x, cy: 418, rx: 60, ry: 16, fill: '#ff8a2a', opacity: 0, filter: 'url(#fGlow)' }, L.bench);
  el('text', { x: BK.x + 72, y: 492, 'font-size': 11, fill: '#ddd', class: 'svgt' }, burnerG).textContent = '本生燈';

  // tool rack
  const rack = el('g', null, L.bench);
  el('rect', { x: 846, y: 456, width: 52, height: 12, rx: 2, fill: '#8b5e3c' }, rack);
  el('rect', { x: 846, y: 428, width: 52, height: 6, rx: 2, fill: '#8b5e3c' }, rack);
  const limeG = hot(el('g', null, rack), 'test-lime', '石灰水');
  el('rect', { x: 862, y: 388, width: 18, height: 76, rx: 9, fill: 'rgba(230,245,255,.5)', stroke: '#8fa3b0', 'stroke-width': 2 }, limeG);
  const limeLiquid = el('rect', { x: 864, y: 420, width: 14, height: 42, rx: 7, fill: '#eef7ff' }, limeG);
  el('text', { x: 871, y: 382, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, fill: '#2b3a4a', class: 'svgt' }, limeG).textContent = '石灰水';
  const phG = hot(el('g', null, rack), 'test-ph', 'pH 試紙');
  el('rect', { x: 908, y: 440, width: 36, height: 26, rx: 3, fill: '#f3ead2', stroke: '#9a8a5a' }, phG);
  for (let i = 0; i < 4; i++) el('rect', { x: 913 + i * 7, y: 428, width: 5, height: 18, fill: '#f0c64a' }, phG);
  el('text', { x: 926, y: 420, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, fill: '#2b3a4a', class: 'svgt' }, phG).textContent = 'pH試紙';
  const splG = hot(el('g', null, rack), 'test-splint', '木條');
  el('rect', { x: 956, y: 420, width: 30, height: 46, rx: 4, fill: 'rgba(230,245,255,.5)', stroke: '#8fa3b0', 'stroke-width': 2 }, splG);
  for (let i = 0; i < 5; i++) el('line', { x1: 961 + i * 5, y1: 464, x2: 958 + i * 6, y2: 398 + (i % 2) * 6, stroke: '#c79a5b', 'stroke-width': 3 }, splG);
  el('text', { x: 971, y: 390, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, fill: '#2b3a4a', class: 'svgt' }, splG).textContent = '木條';
  // flame-test burner + wire
  const ftG = hot(el('g', null, rack), 'test-flame', '焰色測試');
  el('path', { d: `M${POS.fburner - 18},494 L${POS.fburner + 18},494 L${POS.fburner + 14},484 L${POS.fburner - 14},484Z`, fill: '#4a4f57' }, ftG);
  el('rect', { x: POS.fburner - 6, y: 446, width: 12, height: 40, fill: '#9aa3ad' }, ftG);
  el('line', { x1: 1010, y1: 466, x2: 1022, y2: 404, stroke: '#888', 'stroke-width': 2 }, ftG);
  el('circle', { cx: 1022, cy: 401, r: 4, fill: 'none', stroke: '#888', 'stroke-width': 1.5 }, ftG);
  el('rect', { x: 1004, y: 458, width: 14, height: 10, rx: 2, fill: '#555' }, ftG);
  el('text', { x: 1040, y: 434, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, fill: '#2b3a4a', class: 'svgt' }, ftG).textContent = '焰色測試';
  const ftFlame = el('path', { fill: 'url(#gFlame)', opacity: 0 }, L.bench);

  /* --- beaker --- */
  const beaker = hot(el('g', { transform: `translate(${BK.x},${BK.y})` }, L.beaker), 'beaker', '燒杯');
  const bClip = el('clipPath', { id: 'bClip' }, defs);
  el('path', { d: 'M-53,-104 L-53,-5 Q-53,-1 -49,-1 L49,-1 Q53,-1 53,-5 L53,-104Z' }, bClip);
  el('path', { d: 'M-56,-106 L-56,-6 Q-56,1 -49,1 L49,1 Q56,1 56,-6 L56,-106Z', fill: 'rgba(220,240,255,.18)' }, beaker);
  const bIn = el('g', { 'clip-path': 'url(#bClip)' }, beaker);
  const liquid = el('rect', { x: -56, y: 0, width: 112, height: 0, fill: '#cfe8ff' }, bIn);
  const cloud = el('rect', { x: -56, y: 0, width: 112, height: 0, fill: '#fff', opacity: 0 }, bIn);
  const surface = el('rect', { x: -56, y: 0, width: 112, height: 3, fill: '#fff', opacity: 0 }, bIn);
  const pptG = el('g', null, bIn);
  const chunkG = el('g', null, bIn);
  const bFx = el('g', null, bIn);
  const bGlow = el('ellipse', { cx: 0, cy: -10, rx: 50, ry: 30, fill: '#fff', opacity: 0, filter: 'url(#fGlow)' }, beaker);
  el('path', { d: 'M-58,-110 Q-60,-104 -56,-104 L-56,-6 Q-56,1 -49,1 L49,1 Q56,1 56,-6 L56,-104 Q62,-106 64,-112', fill: 'none', stroke: '#9fb7c9', 'stroke-width': 3, 'stroke-linejoin': 'round' }, beaker);
  el('rect', { x: -48, y: -96, width: 8, height: 86, rx: 4, fill: 'url(#gGlass)' }, beaker);
  for (let i = 1; i <= 4; i++) el('line', { x1: 34, y1: -i * 20, x2: 48, y2: -i * 20, stroke: '#9fb7c9', 'stroke-width': 1.5 }, beaker);
  el('text', { x: 30, y: -84, 'font-size': 8, fill: '#7f98aa', 'text-anchor': 'end', class: 'svgt' }, beaker).textContent = '250ml';

  /* safety screen (deployed) */
  const scr = hot(el('g', { opacity: 0, style: 'pointer-events:none' }, L.front), 'screen', '安全屏');
  el('rect', { x: 540, y: 300, width: 64, height: 172, rx: 3, fill: 'rgba(190,225,255,.28)', stroke: '#7c93a6', 'stroke-width': 3 }, scr);
  el('rect', { x: 604, y: 296, width: 72, height: 176, rx: 3, fill: 'rgba(190,225,255,.28)', stroke: '#7c93a6', 'stroke-width': 3 }, scr);
  el('rect', { x: 676, y: 300, width: 64, height: 172, rx: 3, fill: 'rgba(190,225,255,.28)', stroke: '#7c93a6', 'stroke-width': 3 }, scr);
  el('path', { d: 'M552,316 L580,316 L552,360Z M618,312 L652,312 L618,366Z M688,316 L716,316 L688,360Z', fill: '#fff', opacity: .3 }, scr);

  const flashRect = el('rect', { x: 0, y: 0, width: 1280, height: 720, fill: '#fff', opacity: 0, style: 'pointer-events:none' }, L.top);

  /* ================= CHARACTERS ================= */
  const STUDENTS = [
    { name: '小明', hair: 'short', hairC: '#1d1a1a', skin: '#f3d2b3', shirt: '#3f7fd8', pants: '#2b3445', shoe: '#222' },
    { name: '嘉欣', hair: 'ponytail', hairC: '#3a2416', skin: '#f6d6bd', shirt: '#e0567a', pants: '#33405a', shoe: '#5a3a2a', blush: true },
    { name: 'Arjun', hair: 'curly', hairC: '#141010', skin: '#a86d45', shirt: '#2fa36b', pants: '#3b3b3b', shoe: '#111' },
    { name: '美玲', hair: 'bob', hairC: '#2a1a12', skin: '#efc9a6', shirt: '#f0b23a', pants: '#4a4a6a', shoe: '#333', glasses: true, blush: true },
  ];
  const TEACHER = { name: '陳老師', hair: 'bun', hairC: '#2b1d17', skin: '#efc6a3', shirt: '#7c5cbf', pants: '#2e2e3a', shoe: '#111', glasses: true, scale: 1.05 };
  const SMILE = 'M-10,17 Q0,25 10,17';
  const OPEN = 'M-8,16 Q0,30 8,16 Q0,12 -8,16Z';
  const OH = 'M-5,18 a5,6 0 1,0 10,0 a5,6 0 1,0 -10,0';

  function makePerson(p, parent) {
    const root = el('g', { class: 'person' }, parent);
    const body = el('g', null, root);
    const mkLeg = sx => { const g = el('g', null, body); el('rect', { x: sx - 12, y: -178, width: 24, height: 168, rx: 10, fill: p.pants }, g); el('ellipse', { cx: sx + (sx < 0 ? -3 : 3), cy: -8, rx: 17, ry: 9, fill: p.shoe }, g); return g; };
    const legL = mkLeg(-17), legR = mkLeg(17);
    el('path', { d: 'M-46,-292 C-54,-240 -50,-200 -44,-160 L44,-160 C50,-200 54,-240 46,-292 Q0,-304 -46,-292Z', fill: p.shirt }, body);
    el('rect', { x: -45, y: -180, width: 90, height: 24, rx: 6, fill: p.pants }, body);
    el('path', { d: 'M-16,-298 L0,-280 L16,-298', fill: 'none', stroke: 'rgba(0,0,0,.25)', 'stroke-width': 3 }, body);
    const coat = el('g', { opacity: 0 }, body);
    el('path', { d: 'M-50,-292 C-58,-230 -60,-170 -62,-110 L62,-110 C60,-170 58,-230 50,-292 Q0,-306 -50,-292Z', fill: '#f8fafc', stroke: '#cfd8e3', 'stroke-width': 2 }, coat);
    el('path', { d: 'M-18,-299 L0,-250 L18,-299Z', fill: p.shirt }, coat);
    el('path', { d: 'M-18,-299 L0,-250 L18,-299', fill: 'none', stroke: '#cfd8e3', 'stroke-width': 2 }, coat);
    el('line', { x1: 0, y1: -250, x2: 0, y2: -112, stroke: '#cfd8e3', 'stroke-width': 2 }, coat);
    [-228, -198, -168].forEach(y => el('circle', { cx: 6, cy: y, r: 3, fill: '#b8c4d2' }, coat));
    el('rect', { x: -46, y: -196, width: 26, height: 22, rx: 3, fill: 'none', stroke: '#cfd8e3', 'stroke-width': 2 }, coat);
    el('rect', { x: 20, y: -264, width: 20, height: 16, rx: 2, fill: 'none', stroke: '#cfd8e3', 'stroke-width': 2 }, coat);
    el('line', { x1: 26, y1: -270, x2: 26, y2: -256, stroke: '#3f7fd8', 'stroke-width': 3 }, coat);
    const mkArm = sx => {
      const g = el('g', null, body);
      const sleeve = el('rect', { x: sx - 11, y: -292, width: 22, height: 120, rx: 11, fill: p.shirt }, g);
      el('circle', { cx: sx, cy: -166, r: 12, fill: p.skin }, g);
      const slot = el('g', null, g);
      return { g, sleeve, slot, sx, angle: 0, target: null, itemRot: 0 };
    };
    const armL = mkArm(-56), armR = mkArm(56);
    el('rect', { x: -11, y: -314, width: 22, height: 24, fill: p.skin }, body);
    const head = el('g', { transform: 'translate(0,-352)' }, body);
    if (p.hair === 'ponytail') el('path', { d: 'M28,-26 Q76,-6 58,58 Q50,24 30,6Z', fill: p.hairC }, head);
    if (p.hair === 'bob') el('path', { d: 'M-50,-10 Q-52,-58 0,-58 Q52,-58 50,-10 L50,30 Q50,40 40,40 L-40,40 Q-50,40 -50,30Z', fill: p.hairC }, head);
    el('circle', { cx: -42, cy: 4, r: 8, fill: p.skin }, head); el('circle', { cx: 42, cy: 4, r: 8, fill: p.skin }, head);
    el('circle', { cx: 0, cy: 0, r: 42, fill: p.skin }, head);
    const HAIR = {
      short: 'M-44,-2 Q-48,-56 0,-55 Q48,-56 44,-2 Q40,-26 22,-30 Q4,-20 -14,-32 Q-34,-28 -44,-2Z',
      ponytail: 'M-44,0 Q-48,-57 0,-56 Q48,-57 44,0 Q40,-30 10,-34 Q-30,-30 -44,0Z',
      bob: 'M-46,10 Q-50,-57 0,-57 Q50,-57 46,10 Q40,-24 20,-28 Q0,-34 -20,-28 Q-40,-24 -46,10Z',
      bun: 'M-44,-4 Q-46,-55 0,-55 Q46,-55 44,-4 Q36,-34 0,-36 Q-36,-34 -44,-4Z',
    };
    if (p.hair === 'curly') {
      const hg = el('g', { fill: p.hairC }, head);
      [[-36, -24], [-24, -40], [-6, -48], [14, -46], [32, -36], [42, -18], [-42, -6], [44, -4], [0, -38], [-20, -30], [20, -30]].forEach(([x, y]) => el('circle', { cx: x, cy: y, r: 14 }, hg));
    } else el('path', { d: HAIR[p.hair], fill: p.hairC }, head);
    if (p.hair === 'bun') el('circle', { cx: 0, cy: -58, r: 17, fill: p.hairC }, head);
    if (p.hair === 'ponytail') el('circle', { cx: 34, cy: -26, r: 6, fill: '#ff6f91' }, head);
    el('path', { d: 'M-24,-15 Q-15,-20 -6,-15', stroke: p.hairC, 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round' }, head);
    el('path', { d: 'M6,-15 Q15,-20 24,-15', stroke: p.hairC, 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round' }, head);
    const eL = el('ellipse', { cx: -15, cy: -2, rx: 4.5, ry: 6, fill: '#1d1d22' }, head);
    const eR = el('ellipse', { cx: 15, cy: -2, rx: 4.5, ry: 6, fill: '#1d1d22' }, head);
    if (p.blush) { el('ellipse', { cx: -27, cy: 12, rx: 7, ry: 4, fill: '#ff8fa3', opacity: .45 }, head); el('ellipse', { cx: 27, cy: 12, rx: 7, ry: 4, fill: '#ff8fa3', opacity: .45 }, head); }
    const mouth = el('path', { d: SMILE, fill: 'none', stroke: '#7a2f2f', 'stroke-width': 3, 'stroke-linecap': 'round' }, head);
    if (p.glasses) {
      const gl = el('g', { fill: 'none', stroke: '#333', 'stroke-width': 2.5 }, head);
      el('circle', { cx: -15, cy: -2, r: 11 }, gl); el('circle', { cx: 15, cy: -2, r: 11 }, gl); el('line', { x1: -4, y1: -2, x2: 4, y2: -2 }, gl);
    }
    const gog = el('g', { opacity: 0 }, head);
    el('rect', { x: -46, y: -10, width: 92, height: 8, fill: '#2b3a4a' }, gog);
    el('rect', { x: -35, y: -18, width: 70, height: 28, rx: 12, fill: 'rgba(140,210,255,.45)', stroke: '#2b3a4a', 'stroke-width': 3 }, gog);
    el('line', { x1: 0, y1: -16, x2: 0, y2: 8, stroke: '#2b3a4a', 'stroke-width': 2 }, gog);
    el('path', { d: 'M-28,-12 L-18,-12', stroke: '#fff', 'stroke-width': 2, opacity: .7 }, gog);

    const P = {
      p, root, body, legL, legR, armL, armR, head, mouth, eL, eR, coat, gog,
      x: 0, y: FEET, s: p.scale || 1, walking: false, phase: 0, legA: 0, bob: 0,
      talkUntil: 0, nextBlink: performance.now() + rand(1500, 4000), mood: 'smile', speed: 330,
      setOutfit(o) {
        if ('coat' in o) { coat.setAttribute('opacity', o.coat ? 1 : 0); [armL, armR].forEach(a => a.sleeve.setAttribute('fill', o.coat ? '#f8fafc' : p.shirt)); }
        if ('goggles' in o) gog.setAttribute('opacity', o.goggles ? 1 : 0);
      },
      walkTo(x) {
        return new Promise(res => {
          const dist = Math.abs(x - P.x);
          if (dist < 2) { res(); return; }
          P.walking = true;
          const x0 = P.x, t0 = performance.now(), dur = dist / P.speed * 1000;
          const step = now => {
            const t = Math.min(1, (now - t0) / dur);
            P.x = x0 + (x - x0) * t;
            if (t < 1) requestAnimationFrame(step); else { P.walking = false; res(); }
          };
          requestAnimationFrame(step);
        });
      },
      async arm(which, angle, itemRot, ms = 350) {
        const a = which === 'L' ? armL : armR;
        const a0 = a.angle, r0 = a.itemRot;
        a.target = angle;
        await tween(ms, t => { a.angle = a0 + (angle - a0) * t; if (itemRot != null) a.itemRot = r0 + (itemRot - r0) * t; });
      },
      release(which) { const a = which === 'L' ? armL : armR; a.target = null; },
      hold(node, which = 'L') { const a = which === 'L' ? armL : armR; a.slot.innerHTML = ''; if (node) a.slot.appendChild(node); },
      say(text, ms) { return speak(P, text, ms); },
      update(dt, now) {
        if (P.walking) { P.phase += dt * 11; P.legA = Math.sin(P.phase) * 18; P.bob = -Math.abs(Math.sin(P.phase)) * 5; }
        else { P.legA *= .8; P.bob *= .8; }
        legL.setAttribute('transform', `rotate(${P.legA},-17,-172)`);
        legR.setAttribute('transform', `rotate(${-P.legA},17,-172)`);
        [armL, armR].forEach((a, i) => {
          if (a.target == null) a.angle += (((P.walking ? (i ? P.legA : -P.legA) * .8 : 0) + Math.sin(now / 900 + i) * 1.5 * (i ? -1 : 1)) - a.angle) * Math.min(1, dt * 8);
          a.g.setAttribute('transform', `rotate(${a.angle},${a.sx},-284)`);
          a.slot.setAttribute('transform', `translate(${a.sx},-166) rotate(${-a.angle + a.itemRot})`);
        });
        body.setAttribute('transform', `translate(0,${P.bob + Math.sin(now / 700) * 1.2})`);
        root.setAttribute('transform', `translate(${P.x},${P.y}) scale(${P.s})`);
        if (now > P.nextBlink) { eL.setAttribute('ry', 1); eR.setAttribute('ry', 1); if (now > P.nextBlink + 130) { eL.setAttribute('ry', 6); eR.setAttribute('ry', 6); P.nextBlink = now + rand(2000, 5000); } }
        const talking = now < P.talkUntil;
        let d = P.mood === 'oh' ? OH : SMILE;
        if (talking) d = Math.floor(now / 130) % 2 ? OPEN : (P.mood === 'oh' ? OH : SMILE);
        if (mouth.getAttribute('d') !== d) { mouth.setAttribute('d', d); const filled = d !== SMILE; mouth.setAttribute('fill', filled ? '#7a2f2f' : 'none'); }
      },
    };
    return P;
  }

  /* ================= HELD ITEMS ================= */
  function itemBottle(id) {
    const s = C.sp(id);
    const g = el('g');
    const solid = s.ph === 's';
    const col = s.color || '#dcefff';
    if (solid) {
      el('rect', { x: -18, y: -40, width: 36, height: 40, rx: 6, fill: 'rgba(235,245,255,.75)', stroke: '#7f98aa', 'stroke-width': 2 }, g);
      for (let i = 0; i < 6; i++) el('circle', { cx: -10 + (i % 3) * 10, cy: -8 - Math.floor(i / 3) * 8, r: 5, fill: col, stroke: 'rgba(0,0,0,.2)' }, g);
      el('rect', { x: -16, y: -34, width: 32, height: 12, fill: '#fff', stroke: '#ccc' }, g);
    } else {
      el('rect', { x: -14, y: -46, width: 28, height: 46, rx: 6, fill: 'rgba(235,245,255,.75)', stroke: '#7f98aa', 'stroke-width': 2 }, g);
      el('rect', { x: -12, y: -30, width: 24, height: 28, rx: 4, fill: col, opacity: s.color ? .9 : .5 }, g);
      el('rect', { x: -6, y: -60, width: 12, height: 15, fill: 'rgba(235,245,255,.75)', stroke: '#7f98aa', 'stroke-width': 2 }, g);
      el('rect', { x: -12, y: -40, width: 24, height: 12, fill: '#fff', stroke: '#ccc' }, g);
    }
    const t = el('text', { x: 0, y: solid ? -25 : -31, 'text-anchor': 'middle', 'font-size': 7, 'font-weight': 700, fill: '#222', class: 'svgt' }, g);
    t.textContent = s.f ? C.fmt(s.f) : s.zh;
    const tip = el('g', { transform: `translate(0,${solid ? -40 : -60})` }, g);
    return { g, tip, solid, color: s.color || 'rgba(200,230,255,.95)' };
  }
  function itemStick(kind) {
    const g = el('g');
    let tipY = -80, flame = null, paper = null, liquidRect = null;
    if (kind === 'splint' || kind === 'glow') {
      el('line', { x1: 0, y1: 14, x2: 0, y2: -80, stroke: '#c79a5b', 'stroke-width': 5, 'stroke-linecap': 'round' }, g);
      flame = el('g', { transform: 'translate(0,-82)' }, g);
      if (kind === 'splint') {
        el('path', { d: 'M0,-26 Q12,-8 6,2 Q0,8 -6,2 Q-12,-8 0,-26Z', fill: '#ffb21a', class: 'flicker' }, flame);
        el('path', { d: 'M0,-14 Q6,-4 3,1 Q0,4 -3,1 Q-6,-4 0,-14Z', fill: '#fff3a0' }, flame);
      } else {
        el('circle', { r: 5, fill: '#ff5a1a', class: 'ember' }, flame);
      }
    } else if (kind === 'lime') {
      el('rect', { x: -9, y: -82, width: 18, height: 82, rx: 9, fill: 'rgba(235,245,255,.7)', stroke: '#7f98aa', 'stroke-width': 2 }, g);
      liquidRect = el('rect', { x: -7, y: -50, width: 14, height: 48, rx: 7, fill: '#eef7ff' }, g);
      tipY = -82;
    } else if (kind === 'ph') {
      el('rect', { x: -3, y: 0, width: 6, height: 12, fill: '#888' }, g);
      paper = el('rect', { x: -5, y: -80, width: 10, height: 80, rx: 1, fill: '#f0c64a' }, g);
    } else if (kind === 'wire') {
      el('rect', { x: -5, y: -6, width: 10, height: 26, rx: 3, fill: '#444' }, g);
      el('line', { x1: 0, y1: -6, x2: 0, y2: -84, stroke: '#9a9a9a', 'stroke-width': 2 }, g);
      el('circle', { cy: -88, r: 4, fill: 'none', stroke: '#bbb', 'stroke-width': 2 }, g);
      tipY = -88;
    }
    const tip = el('g', { transform: `translate(0,${tipY})` }, g);
    return { g, tip, flame, paper, liquidRect };
  }

  /* ================= GAME STATE ================= */
  const save = store.get('alx-save', null);
  const G = {
    name: '', charIdx: 0, wear: { coat: false, goggles: false }, burner: false, screen: false, sup: false,
    contents: [], poured: new Set(), gas: [], busy: false,
    found: new Set(save && save.found ? save.found : []), mission: save ? save.mission || 0 : 0, warnings: 0,
    bpos: { x: BK.x, y: BK.y }, shakeUntil: 0, flameColor: null, ftColor: null, heatT: 0,
    vis: { level: 0, levelT: 0, col: '#cfe8ff', colT: '#cfe8ff', op: .35, opT: .35, cloud: 0, cloudCol: '#ffffff', glow: 0 },
    ppt: [], // [{color}]
  };
  let player = null, partner = null;
  const teacher = makePerson(TEACHER, L.chars);
  teacher.x = 1005; teacher.setOutfit({ coat: true, goggles: true });
  const people = [teacher];

  /* ================= SPEECH BUBBLES & UI ================= */
  const stage = $('#stage');
  const bubbleLayer = $('#bubbles');
  const bubbles = [];
  function speak(P, text, ms) {
    ms = ms || clamp(text.length * 110, 1800, 6500);
    const old = bubbles.find(b => b.P === P);
    if (old) { old.div.remove(); bubbles.splice(bubbles.indexOf(old), 1); }
    const div = document.createElement('div');
    div.className = 'bubble' + (P === teacher ? ' teacher' : '');
    div.innerHTML = text;
    bubbleLayer.appendChild(div);
    const b = { P, div, until: performance.now() + ms };
    bubbles.push(b);
    P.talkUntil = performance.now() + Math.min(ms, text.length * 90 + 400);
    positionBubble(b);
    return sleep(Math.min(ms, 2600));
  }
  function toScreen(x, y) {
    const m = world.getScreenCTM(); const r = stage.getBoundingClientRect();
    if (!m) return { x: 0, y: 0 };
    return { x: m.a * x + m.c * y + m.e - r.left, y: m.b * x + m.d * y + m.f - r.top };
  }
  function positionBubble(b) {
    const P = b.P; const pt = toScreen(P.x, P.y - 420 * P.s);
    const w = b.div.offsetWidth, sw = stage.clientWidth;
    let left = pt.x - w / 2; left = clamp(left, 6, sw - w - 6);
    b.div.style.left = left + 'px';
    b.div.style.top = Math.max(4, pt.y - b.div.offsetHeight) + 'px';
    b.div.style.setProperty('--tail', clamp(pt.x - left, 14, w - 14) + 'px');
  }
  function worldPt(node) {
    const a = world.getScreenCTM(), b = node.getScreenCTM();
    if (!a || !b) return { x: 0, y: 0 };
    const m = a.inverse().multiply(b);
    return { x: m.e, y: m.f };
  }

  function board(html) { boardDiv.innerHTML = html; }
  function boardWelcome() {
    const m = MISSIONS[G.mission];
    board(`<div class="b-h">今日任務 <span>Today's task</span></div>` +
      (m ? `<div class="b-eq">${m.title}</div><div class="b-obs">${m.task}</div>` : `<div class="b-eq">自由實驗時間！</div><div class="b-obs">你已完成所有任務 🎉 繼續探索更多反應，填滿圖鑑！</div>`) +
      `<div class="b-foot">已發現 ${G.found.size} / ${TOTAL} 個反應</div>`);
  }
  function boardReaction(r) {
    board(`<div class="b-h">${C.CATS[r.cat] || ''} <span>${esc(r.title.replace(/<[^>]+>/g, ''))}</span></div><div class="b-eq">${r.eqHtml}</div><div class="b-obs"><b>觀察：</b>${r.obs}</div>`);
  }

  /* toast */
  let toastTimer = 0;
  function toast(html, ms = 3200) {
    const t = $('#toast'); t.innerHTML = html; t.hidden = false; t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.classList.remove('show'); setTimeout(() => { t.hidden = true; }, 300); }, ms);
  }

  /* dialog */
  function dialog(who, html, btn = '明白！') {
    return new Promise(res => {
      const d = $('#dialog');
      d.querySelector('.d-who').textContent = who;
      d.querySelector('.d-text').innerHTML = html;
      const b = d.querySelector('button'); b.textContent = btn;
      d.hidden = false;
      teacher.talkUntil = performance.now() + Math.min(5000, html.length * 60);
      const done = () => { d.hidden = true; b.removeEventListener('click', done); Snd.play('click'); res(); };
      b.addEventListener('click', done);
      setTimeout(() => b.focus(), 50);
    });
  }

  /* ================= PARTICLES ================= */
  const parts = [];
  function spawn(layer, o) {
    const shape = o.shape || 'circle';
    const n = shape === 'line' ? el('line', { stroke: o.fill, 'stroke-width': o.w || 2, 'stroke-linecap': 'round' }, layer)
      : shape === 'text' ? el('text', { 'text-anchor': 'middle', 'font-size': o.size || 22, 'font-weight': 800, fill: o.fill, stroke: o.stroke || 'none', 'stroke-width': o.stroke ? 4 : 0, 'paint-order': 'stroke', class: 'svgt' }, layer)
        : el('circle', { fill: o.fill, stroke: o.strokeC || 'none', 'stroke-width': o.strokeC ? 1 : 0 }, layer);
    if (shape === 'text') n.textContent = o.text;
    if (o.filter) n.setAttribute('filter', o.filter);
    const pp = Object.assign({ vx: 0, vy: 0, ax: 0, ay: 0, r: 3, op: 1, age: 0, life: 1 }, o, { n, shape });
    parts.push(pp);
    if (parts.length > 650) { const old = parts.shift(); old.n.remove(); }
    return pp;
  }
  function updateParts(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.age += dt;
      if (p.age >= p.life || (p.minY != null && p.y < p.minY())) { p.n.remove(); parts.splice(i, 1); continue; }
      p.vx += p.ax * dt; p.vy += p.ay * dt;
      if (p.wob) p.vx = Math.sin(p.age * 9 + p.r) * p.wob;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.floor != null && p.y > p.floor) { p.y = p.floor; p.vy = 0; p.vx *= .9; }
      const k = p.age / p.life;
      let op = p.op;
      if (p.fade) op *= 1 - Math.pow(k, p.fadePow || 1);
      if (p.fadeIn) op *= Math.min(1, p.age / p.fadeIn);
      if (p.twinkle) op *= .4 + .6 * Math.abs(Math.sin(p.age * 8 + p.r * 3));
      const r = Math.max(.1, p.r * (1 + (p.grow || 0) * k));
      if (p.shape === 'circle') { p.n.setAttribute('cx', p.x.toFixed(1)); p.n.setAttribute('cy', p.y.toFixed(1)); p.n.setAttribute('r', r.toFixed(1)); }
      else if (p.shape === 'line') { p.n.setAttribute('x1', p.x.toFixed(1)); p.n.setAttribute('y1', p.y.toFixed(1)); p.n.setAttribute('x2', (p.x - p.vx * .035).toFixed(1)); p.n.setAttribute('y2', (p.y - p.vy * .035).toFixed(1)); }
      else { p.n.setAttribute('x', p.x.toFixed(1)); p.n.setAttribute('y', p.y.toFixed(1)); }
      p.n.setAttribute('opacity', op.toFixed(2));
    }
  }
  const emitters = [];
  function emitter(dur, rate, fn) { const e = { until: performance.now() + dur * 1000, rate, acc: 0, fn }; emitters.push(e); return e; }

  const liquidTopLocal = () => -G.vis.level;
  const beakerTopWorld = () => ({ x: G.bpos.x, y: G.bpos.y - 104 });
  const surfaceWorld = () => ({ x: G.bpos.x, y: G.bpos.y - Math.max(G.vis.level, 6) });

  function bubble(intensity = 2, col = 'rgba(255,255,255,.75)') {
    const lvl = Math.max(G.vis.level, 10);
    spawn(bFx, { x: rand(-46, 46), y: -2, r: rand(1.5, 2.5 + intensity), vy: -rand(50, 90 + intensity * 30), wob: rand(8, 20), fill: col, op: .85, life: 3, minY: () => -lvl + 2 });
  }
  function gasPuff(col, op = .5) {
    const t = beakerTopWorld();
    spawn(L.fx, { x: t.x + rand(-30, 30), y: t.y + 4, r: rand(8, 14), vx: rand(-12, 12), vy: -rand(25, 50), grow: 2.2, fill: col, op, fade: 1, fadeIn: .3, life: rand(2.5, 3.5), filter: 'url(#fBlur)' });
  }

  /* ================= VESSEL RENDER ================= */
  const INDICATORS = new Set(['UI', 'phth']);
  function computeVessel() {
    const cs = G.contents;
    const liquids = cs.filter(id => { const s = C.sp(id); return s.ph === 'aq' || s.ph === 'l'; });
    const level = liquids.length ? clamp(18 + liquids.length * 14, 0, 86) : 0;
    let col = '#d6ecff', op = .32;
    const colored = cs.filter(id => !INDICATORS.has(id) && (C.sp(id).ph === 'aq' || C.sp(id).ph === 'l') && C.sp(id).color);
    if (colored.length) {
      const rgb = colored.map(id => hex2rgb(C.sp(id).color)).reduce((a, c) => a.map((v, i) => v + c[i] / colored.length), [0, 0, 0]);
      col = rgb2hex(rgb); op = .72;
    }
    const ph = C.pH(cs);
    if (cs.includes('UI')) { col = C.uiColor(ph); op = .8; }
    else if (cs.includes('phth') && ph >= 9) { col = '#ff3fa4'; op = .8; }
    return { level, col, op };
  }
  function renderVessel() {
    const v = computeVessel();
    G.vis.levelT = v.level; G.vis.colT = v.col; G.vis.opT = v.op;
    // chunks
    chunkG.innerHTML = '';
    const wet = C.isWet(G.contents);
    G.contents.forEach((id, k) => {
      const s = C.sp(id);
      if (!(s.chunk && G.poured.has(id))) return;
      if (wet && (id === 'NaHCO3' || id === 'NH4Cl' || id === 'CuSO4·5H2O')) return;
      const n = id === 'Mg' ? 0 : id === 'Fe' || id === 'S' || id === 'MnO2' || id === 'NaHCO3' || id === 'NH4Cl' ? 14 : 5;
      if (id === 'Mg') {
        el('path', { d: `M${-36 + k * 3},-6 q20,-16 40,-4 q20,10 34,-8`, stroke: s.color, 'stroke-width': 5, fill: 'none', 'stroke-linecap': 'round' }, chunkG);
        return;
      }
      let seed = id.charCodeAt(0) * 13 + k * 7;
      const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
      for (let i = 0; i < n; i++) {
        const small = n > 6;
        const x = -42 + rnd() * 84, r = small ? 2 + rnd() * 2.5 : 5 + rnd() * 4;
        el('path', { d: `M${x - r},-2 L${x - r * .6},${-2 - r * 1.3} L${x + r * .5},${-2 - r * 1.5} L${x + r},-2Z`, fill: s.color, stroke: 'rgba(0,0,0,.25)', 'stroke-width': 1 }, chunkG);
      }
    });
    // precipitate / deposit layers
    pptG.innerHTML = '';
    let y = 0;
    G.ppt.slice(-4).forEach(p => {
      const h = 7;
      el('rect', { x: -56, y: y - h, width: 112, height: h + 1, fill: p.color }, pptG);
      for (let i = 0; i < 10; i++) el('circle', { cx: -50 + i * 11 + (i % 2) * 3, cy: y - h + 1, r: 3, fill: p.color }, pptG);
      y -= h;
    });
    updateHud();
  }

  /* ================= MISSIONS ================= */
  const MISSIONS = [
    { title: '① 安全第一', task: '去牆邊嘅掛鈎，穿上實驗袍同戴上護目鏡。',
      intro: n => `${n}，歡迎嚟到化學實驗室！我係陳老師。<br>做實驗之前第一件事係乜？冇錯——<b>著好實驗袍、戴好護目鏡</b>！去試劑櫃隔離嘅掛鈎攞啦。`,
      check: e => e.type === 'wear' },
    { title: '② 製造氫氣', task: '將<b>鋅粒 Zn</b> 加入<b>稀鹽酸 HCl</b>，再用<b>燃著的木條</b>測試氣體。',
      intro: () => `第一個實驗：<b>金屬 + 酸</b>。去試劑櫃攞<b>稀鹽酸</b>同<b>鋅粒</b>，倒入燒杯。<br>然後用<b>燃著嘅木條</b>放喺燒杯口，聽下有冇「噗」一聲！`,
      check: e => e.type === 'test' && e.id === 't_pop' },
    { title: '③ 金屬置換', task: '將<b>鐵粉 Fe</b> 加入<b>硫酸銅溶液 CuSO₄</b>，觀察顏色變化。',
      intro: () => `好叻！下一個：<b>置換反應</b>。鐵比銅活潑，所以鐵可以「搶走」硫酸銅入面嘅硫酸根。<br>記得先去<b>洗手盆洗燒杯</b>，再試下鐵粉 + 硫酸銅溶液。`,
      check: e => e.type === 'reaction' && e.rule.id === 'disp_Fe_CuSO4' },
    { title: '④ 二氧化碳', task: '將<b>大理石碎</b>加入<b>稀鹽酸</b>，再用<b>石灰水</b>測試氣體。',
      intro: () => `大理石嘅主要成分係碳酸鈣。碳酸鹽遇酸會放出<b>二氧化碳</b>。<br>做完之後用<b>石灰水</b>測試，睇下會唔會變奶白色！`,
      check: e => e.type === 'test' && e.id === 't_milky' },
    { title: '⑤ 中和反應', task: '<b>通用指示劑</b> + <b>氫氧化鈉</b>，再加<b>稀鹽酸</b>中和到綠色（pH 7）。',
      intro: () => `酸同鹼會互相中和。先加<b>通用指示劑</b>同<b>氫氧化鈉溶液</b>——留意佢係乜嘢顏色？<br>然後加<b>稀鹽酸</b>，睇下會唔會變返<b>綠色（中性）</b>。`,
      check: e => e.type === 'reaction' && e.rule.cat === 'neut' && G.contents.includes('UI') && C.pH(G.contents) === 7 },
    { title: '⑥ 黃金雨', task: '將<b>硝酸鉛溶液</b>同<b>碘化鉀溶液</b>混合。',
      intro: () => `而家嚟個最靚嘅沉澱反應——<b>「黃金雨」</b>！<br>將<b>硝酸鉛(II)溶液</b>同<b>碘化鉀溶液</b>混合，睇下有乜事發生。（鉛化合物有毒，做完要洗手！）`,
      check: e => e.type === 'reaction' && e.rule.p.includes('PbI2') },
    { title: '⑦ 焰色測試', task: '燒杯入面放含金屬離子嘅溶液（例如<b>氯化鈉</b>），再用<b>焰色測試</b>。',
      intro: () => `唔同金屬離子喺火焰入面會發出唔同顏色——煙花就係咁嚟！<br>放啲<b>氯化鈉溶液</b>或者<b>硫酸銅溶液</b>入燒杯，再用<b>焰色測試</b>工具試下。`,
      check: e => e.type === 'flame' },
    { title: '⑧ 製造氧氣', task: '<b>過氧化氫</b> + <b>二氧化錳</b>，再用<b>餘燼木條</b>測試。',
      intro: () => `<b>二氧化錳</b>係催化劑，可以令過氧化氫快速分解出<b>氧氣</b>。<br>之後用<b>餘燼木條</b>測試——如果有氧氣，木條會<b>重新燃起</b>！`,
      check: e => e.type === 'test' && e.id === 't_relight' },
    { title: '⑨ 危險示範：鉀 + 硫酸', task: '擺好<b>安全屏</b>、<b>叫老師監督</b>，然後將<b>鉀</b>加入<b>稀硫酸</b>。',
      intro: () => `你哋表現好好，所以我准許你做一個<b>高危實驗</b>：<b>2K + H₂SO₄ → K₂SO₄ + H₂</b>。<br>鉀非常活潑！要先<b>擺好安全屏</b>，再<b>撳我（陳老師）嚟監督</b>，先可以加鉀入稀硫酸。`,
      check: e => e.type === 'reaction' && e.rule.id === 'ma_K_H2SO4' },
    { title: '⑩ 大象牙膏', task: '<b>過氧化氫</b> + <b>洗潔精</b> + <b>碘化鉀溶液</b>。',
      intro: () => `最後一個任務係全班最鍾意嘅——<b>大象牙膏</b>！<br>將<b>過氧化氫</b>、<b>洗潔精</b>同<b>碘化鉀溶液</b>加入燒杯。準備好未？`,
      check: e => e.type === 'reaction' && e.rule.id === 'elephant' },
    { title: '⑪ 化學大師', task: '發現 <b>40</b> 個反應（可以睇圖鑑嘅提示）。',
      intro: () => `嘩，你已經係一位出色嘅小化學家！<br>最後挑戰：<b>總共發現 40 個反應</b>。試下唔同組合、加熱、測試氣體同焰色。圖鑑有提示㗎！`,
      check: () => G.found.size >= 40 },
  ];

  async function emitEvent(e) {
    const m = MISSIONS[G.mission];
    if (!m || !m.check(e)) return;
    G.mission++;
    persist();
    await sleep(900);
    Snd.play('tada');
    toast(`<div class="t-big">✅ 任務完成！</div><div>${m.title}</div>`, 2600);
    teacher.say(pick(['做得好！', '非常好！', '完全正確！', '叻仔/叻女！']), 2000);
    await sleep(1600);
    const next = MISSIONS[G.mission];
    boardWelcome(); updateHud();
    if (next) await dialog('陳老師', next.intro(esc(G.name)), '開始！');
    else await dialog('陳老師', `恭喜你完成全部任務！🎓<br>你而家係正式嘅 <b>Alchemy Lab X 化學大師</b>。實驗室任你探索——試下填滿成本圖鑑！`, '多謝老師！');
  }

  /* ================= DISCOVERY ================= */
  const TOTAL = C.RULES.filter(r => !r.silent).length + C.TESTS.length + C.FLAMES.length;
  function discover(id, title, eqHtml) {
    if (G.found.has(id)) return false;
    G.found.add(id); persist();
    Snd.play('ding');
    toast(`<div class="t-new">✨ 新發現！ ${G.found.size}/${TOTAL}</div><div class="t-title">${title}</div><div class="t-eq">${eqHtml || ''}</div>`);
    updateHud();
    return true;
  }
  function persist() { store.set('alx-save', { name: G.name, charIdx: G.charIdx, found: [...G.found], mission: G.mission }); }

  /* ================= REACTIONS ================= */
  const lastTitle = r => r.title.replace(/<[^>]+>/g, '');
  async function doReaction(r) {
    const fx = r.fx || {};
    // apply contents
    const keep = new Set(['H2O', ...r.c]);
    G.contents = G.contents.filter(id => !(r.r.includes(id) && !keep.has(id)));
    r.r.forEach(id => { if (!keep.has(id)) G.poured.delete(id); });
    r.p.forEach(id => {
      if (!G.contents.includes(id)) G.contents.push(id);
      const s = C.sp(id);
      if (s.ph === 's' && C.sp(id).color && !s.shelf) G.ppt.push({ color: s.color });
      else if (s.ph === 's' && s.shelf && (r.cat === 'ppt' || r.cat === 'disp')) G.ppt.push({ color: C.sp(id).color || '#fff' });
    });
    const now = performance.now();
    r.g.forEach(g => G.gas.push({ id: g, t: now + (fx.dur || 3) * 1000 }));
    if (r.silent) { renderVessel(); return; }

    const dur = fx.dur || 3;
    boardReaction(r);
    if (fx.sound) Snd.play(fx.sound, dur);
    if (fx.bub) { const e = emitter(dur + 1.5, fx.bub * 14, () => bubble(fx.bub)); e.kind = 'bub'; }
    if (fx.flame) emitter(dur, 40, () => { const s = surfaceWorld(); spawn(L.fx, { x: s.x + rand(-34, 34), y: s.y, r: rand(6, 12), vy: -rand(70, 140), grow: -.7, fill: fx.flame, op: .9, fade: 1, life: rand(.4, .8), filter: 'url(#fBlur)' }); });
    if (fx.sparks) emitter(dur * .8, 30, () => { const s = surfaceWorld(); spawn(L.fx, { shape: 'line', x: s.x + rand(-20, 20), y: s.y, vx: rand(-220, 220), vy: -rand(180, 420), ay: 700, fill: fx.sparks, w: 2.5, life: rand(.5, .9), fade: 1 }); });
    if (fx.skitter) {
      const ball = spawn(bFx, { x: 0, y: -G.vis.level - 3, r: 6, fill: '#e9e9e2', strokeC: '#999', life: dur, op: 1 });
      ball.update = true;
      emitter(dur, 20, () => { ball.x = Math.sin(performance.now() / 160) * 34 + Math.sin(performance.now() / 70) * 6; ball.y = -G.vis.level - 3; spawn(bFx, { x: ball.x + rand(-4, 4), y: ball.y + 2, r: 1.5, vy: -10, fill: '#fff', op: .8, fade: 1, life: .5 }); });
    }
    if (fx.boom) {
      setTimeout(() => {
        flash(.85, 500); G.shakeUntil = performance.now() + 900;
        const t = beakerTopWorld();
        for (let i = 0; i < 40; i++) spawn(L.fx, { shape: 'line', x: t.x, y: t.y + 20, vx: rand(-420, 420), vy: -rand(200, 600), ay: 800, fill: pick(['#ead6ff', '#c38cff', '#fff']), w: 3, life: rand(.6, 1.1), fade: 1 });
        for (let i = 0; i < 14; i++) gasPuff('#bbb', .45);
      }, 900);
    }
    if (fx.shake) G.shakeUntil = performance.now() + dur * 700;
    if (fx.pop) setTimeout(() => Snd.play('pop'), 1600);
    if (fx.gasColor) emitter(dur + 1, 10, () => gasPuff(fx.gasColor, .55));
    if (fx.steam) emitter(dur, 8, () => gasPuff('#ffffff', .55));
    if (fx.smoke) emitter(dur, 7, () => gasPuff('#d8d8d8', .45));
    if (fx.flash) {
      const reps = fx.flash === 2 ? 7 : 2;
      for (let i = 0; i < reps; i++) setTimeout(() => flash(fx.flash === 2 ? .75 : .5, 220), 400 + i * 330);
    }
    if (fx.glow) { bGlow.setAttribute('fill', fx.glow); G.vis.glow = 1; setTimeout(() => { G.vis.glow = 0; }, dur * 1000 + 600); }
    if (fx.warm) { bGlow.setAttribute('fill', '#ffb36b'); G.vis.glow = .45; setTimeout(() => { G.vis.glow = 0; }, dur * 1000); }
    if (fx.foam) foam(fx.foam, dur);
    const solids = r.p.filter(id => C.sp(id).ph === 's' && (r.cat === 'ppt' || r.cat === 'disp' || C.sp(id).ppt));
    if (solids.length || fx.cloud) {
      const col = fx.cloud || C.sp(solids[0]).color || '#fff';
      G.vis.cloud = r.cat === 'disp' ? .15 : .85; G.vis.cloudCol = col;
      emitter(dur, 26, () => spawn(bFx, { x: rand(-48, 48), y: -rand(4, Math.max(8, G.vis.level - 4)), r: rand(1.2, 2.8), vy: rand(8, 22), fill: col, op: .9, fadeIn: .3, fade: 1, life: rand(1.5, 3), twinkle: fx.glitter ? 1 : 0 }));
    }
    // floating labels for gases
    r.g.forEach((g, i) => {
      const info = C.GAS_INFO[g]; if (!info) return;
      setTimeout(() => { const t = beakerTopWorld(); spawn(L.fx, { shape: 'text', text: info.label + ' ↑', x: t.x + 70, y: t.y - 6, vy: -28, fill: '#fff', stroke: '#1f3550', size: 24, life: 2.6, fade: 1, fadePow: 3 }); }, 600 + i * 400);
    });
    renderVessel();
    if (r.danger >= 2) setTimeout(() => partner.say(pick(['嘩！好彩有安全屏…', '嚇死我！', '好勁呀！']), 2200), 1400);
    else if (r.p.includes('PbI2')) setTimeout(() => partner.say('好似黃金雨咁！好靚呀！', 2400), 1200);
    else if (r.cat === 'ppt' && Math.random() < .6) setTimeout(() => partner.say(pick(['有沉澱呀！', '變混濁咗！', '快啲記低沉澱嘅顏色！']), 2000), 1200);
    else if (Math.random() < .35) setTimeout(() => partner.say(pick(['原來係咁㗎！', '快啲記低觀察結果！', '我哋又學到嘢喇！', '好有趣！']), 2000), 1400);
    discover(r.id, lastTitle(r), r.eqHtml);
    await sleep(dur * 1000 + 300);
    await emitEvent({ type: 'reaction', rule: r });
    if (r.danger >= 3 && G.sup) setTimeout(() => teacherReturn('好，做得好安全！我返去先喇。'), 1500);
  }

  function flash(op, ms) {
    flashRect.setAttribute('opacity', op);
    tween(ms, t => flashRect.setAttribute('opacity', (op * (1 - t)).toFixed(2)));
  }
  function foam(level, dur) {
    const col = level === 3 ? '#fff5d6' : '#ffffff';
    const rate = level === 3 ? 70 : level === 2 ? 30 : 12;
    const len = level === 3 ? 3.2 : 2;
    emitter(len, rate, () => {
      const t = beakerTopWorld();
      const up = level === 3 ? rand(200, 420) : level === 2 ? rand(40, 110) : rand(10, 40);
      spawn(L.fx, { x: t.x + rand(-44, 44), y: t.y + 8, r: rand(10, level === 3 ? 26 : 16), vx: rand(-60, 60) * (level === 3 ? 1.6 : .7), vy: -up, ay: level === 3 ? 160 : 50,
        floor: 466, fill: col, strokeC: '#e4dcc4', op: 1, life: level === 3 ? rand(7, 10) : rand(3, 5), fade: 1, fadePow: 4 });
    });
  }

  async function processReactions(trigger) {
    let any = false;
    for (let i = 0; i < 6; i++) {
      const r = C.findRule(G.contents, { heat: G.burner });
      if (!r) break;
      if (!r.silent) any = true;
      await doReaction(r);
    }
    renderVessel();
    if (!any && trigger === 'add') noReactionHint();
    return any;
  }

  function noReactionHint() {
    const cs = G.contents.filter(id => !INDICATORS.has(id) && id !== 'H2O');
    const h = C.findRule(G.contents, { heat: true });
    if (h && !G.burner) { partner.say('好似冇反應喎…試下用<b>本生燈加熱</b>？', 3000); return; }
    if (cs.length < 2 && !(cs.length === 1 && G.contents.length >= 2)) return;
    if (cs.includes('Cu') && cs.some(x => ['HCl', 'H2SO4', 'CH3COOH'].includes(x))) { partner.say('銅冇反應…係因為銅喺<b>活性序</b>入面低過氫！', 3600); return; }
    if (cs.includes('Mg') && cs.length === 1) { partner.say('鎂同冷水反應極之慢，幾乎睇唔到。', 3000); return; }
    if (cs.includes('Ag') || cs.includes('Cu')) { partner.say('呢個組合好似冇反應——活性較低嘅金屬唔可以置換活性較高嘅金屬。', 3800); return; }
    partner.say(pick(['好似冇反應喎…', '咩都冇發生？', '冇變化…試下第二樣？']), 2200);
  }

  /* ================= ACTIONS ================= */
  async function run(fn) {
    if (G.busy) { player.say('等等，我仲做緊嘢…', 1200); return; }
    G.busy = true; updateHud();
    try { await fn(); } catch (e) { console.error(e); }
    G.busy = false; updateHud();
  }
  async function stopUnsafe(msg) {
    Snd.play('whistle'); teacher.mood = 'oh';
    await teacher.say('🛑 ' + msg, 4200);
    teacher.mood = 'smile'; G.warnings++;
  }
  function needsGear() { return !(G.wear.coat && G.wear.goggles); }

  function cabinetChoose() {
    return new Promise(res => {
      const ov = $('#cabOv'); ov.hidden = false;
      const done = id => { ov.hidden = true; ov.onclick = null; res(id); };
      ov.onclick = e => {
        const b = e.target.closest('[data-sp]');
        if (b) { Snd.play('clink'); done(b.dataset.sp); }
        else if (e.target === ov || e.target.closest('.close')) done(null);
      };
    });
  }

  async function aimAt(item, armAngle, itemRot, targetX) {
    await player.arm('L', armAngle, itemRot, 450);
    const tip = worldPt(item.tip);
    const dx = clamp(targetX - tip.x, -140, 140);
    const x0 = player.x;
    await tween(260, t => { player.x = x0 + dx * t; });
  }
  async function lowerArm() { await player.arm('L', 12, 0, 350); player.release('L'); }

  async function actFetch() {
    await player.walkTo(POS.cab);
    const id = await cabinetChoose();
    if (!id) { await player.walkTo(POS.home); return; }
    const s = C.sp(id);
    const item = itemBottle(id);
    player.hold(item.g, 'L');
    await player.arm('L', 20, -20, 250);
    player.say(`攞咗${s.zh}！`, 1400);
    await player.walkTo(POS.home);
    if (needsGear()) { await stopUnsafe(`${esc(G.name)}，未著實驗袍同戴護目鏡唔可以做實驗！先去掛鈎攞。`); player.hold(null); await lowerArm(); return; }
    if (G.contents.length >= 6) { partner.say('燒杯太滿喇！先去<b>洗手盆洗燒杯</b>啦。', 2800); player.hold(null); await lowerArm(); return; }
    const pred = C.findRule([...G.contents, id], { heat: G.burner });
    if (pred && pred.danger >= 2 && !G.screen) { await stopUnsafe('停！呢個反應好危險，要先擺好<b>安全屏</b>！'); player.hold(null); await lowerArm(); return; }
    if (pred && pred.danger >= 3 && !G.sup) { await stopUnsafe('停！呢個係<b>高危反應</b>，一定要<b>叫老師嚟監督</b>先可以做！（撳我）'); player.hold(null); await lowerArm(); return; }
    // pour
    await aimAt(item, 128, item.solid ? 150 : 118, G.bpos.x + 4);
    const tip = worldPt(item.tip);
    if (item.solid) {
      Snd.play('clink');
      for (let i = 0; i < 6; i++) setTimeout(() => spawn(L.fx, { x: tip.x + rand(-4, 4), y: tip.y, r: rand(3, 5), vy: 40, ay: 900, fill: item.color, strokeC: 'rgba(0,0,0,.3)', life: .45, op: 1 }), i * 90);
      await sleep(700);
    } else {
      Snd.play('pour', 1);
      const stream = el('path', { fill: 'none', stroke: item.color, 'stroke-width': 5, 'stroke-linecap': 'round', opacity: .85 }, L.fx);
      const sy = G.bpos.y - Math.max(G.vis.level, 2);
      await tween(900, t => {
        const k = Math.min(1, t * 3), y2 = tip.y + (sy - tip.y) * k;
        const w = Math.sin(performance.now() / 50) * 2;
        stream.setAttribute('d', `M${tip.x},${tip.y} Q${tip.x + 6 + w},${(tip.y + y2) / 2} ${tip.x + 3},${y2}`);
        stream.setAttribute('stroke-width', t > .8 ? 5 * (1 - (t - .8) * 5) + .5 : 5);
      });
      stream.remove();
    }
    if (!G.contents.includes(id)) G.contents.push(id);
    G.poured.add(id);
    renderVessel();
    await player.arm('L', 20, -10, 300);
    player.hold(null);
    await lowerArm();
    await player.walkTo(POS.home);
    await processReactions('add');
  }

  async function actWear() {
    if (G.wear.coat && G.wear.goggles) { player.say('我已經著好晒喇！', 1400); return; }
    await player.walkTo(POS.hook);
    await player.arm('R', 150, 0, 350);
    Snd.play('click');
    hookCoat.setAttribute('opacity', 0); hookGog.setAttribute('opacity', 0);
    await player.arm('R', 0, 0, 300); player.release('R');
    G.wear = { coat: true, goggles: true };
    player.setOutfit({ coat: true, goggles: true });
    Snd.play('chime');
    player.say('著好實驗袍、戴好護目鏡！準備就緒 💪', 2200);
    await player.walkTo(POS.home);
    await emitEvent({ type: 'wear' });
  }

  async function actBurner() {
    if (needsGear()) { await stopUnsafe('用本生燈之前，先著好實驗袍同戴好護目鏡！'); return; }
    await player.walkTo(POS.home - 20);
    await player.arm('L', 40, 0, 300);
    G.burner = !G.burner;
    Snd.play(G.burner ? 'whoosh' : 'click');
    await player.arm('L', 0, 0, 300); player.release('L');
    updateHud();
    if (G.burner) {
      player.say('點著本生燈！🔥', 1300);
      await sleep(1500);
      await processReactions('heat');
    } else player.say('熄咗本生燈。', 1200);
  }

  function actScreen() {
    G.screen = !G.screen;
    Snd.play('clink');
    scr.style.pointerEvents = G.screen ? 'auto' : 'none';
    tween(350, t => { scr.setAttribute('opacity', G.screen ? t : 1 - t); scrFold.setAttribute('opacity', G.screen ? 1 - t : t); });
    partner.say(G.screen ? '安全屏擺好喇！' : '收起安全屏。', 1400);
    updateHud();
  }

  async function actWash() {
    if (G.burner) { G.burner = false; Snd.play('click'); teacher.say('拎燒杯之前要<b>熄咗本生燈</b>！我幫你熄咗先。', 2600); await sleep(800); }
    if (!G.contents.length && !G.ppt.length) { player.say('燒杯已經係乾淨嘅。', 1400); return; }
    await player.walkTo(G.bpos.x + 70);
    await player.arm('L', 40, 0, 300);
    const ox = G.bpos.x;
    await tween(250, t => { G.bpos.y = BK.y - 30 * t; });
    // carry: follow player
    const follow = () => { G.bpos.x = player.x - 70; };
    const fid = setInterval(follow, 16);
    await player.walkTo(POS.sink + 30);
    clearInterval(fid);
    await tween(300, t => { G.bpos.x = POS.sink - 30 + t * 0; G.bpos.y = BK.y - 30 - 20 * t; });
    // tip & rinse
    Snd.play('water', 1.8);
    tapWater.setAttribute('opacity', 1);
    G.tilt = 0;
    await tween(500, t => { G.tilt = 70 * t; });
    G.contents = []; G.poured.clear(); G.gas = []; G.ppt = []; G.vis.cloud = 0;
    parts.filter(p => p.n.parentNode === bFx).forEach(p => { p.life = 0; });
    renderVessel();
    await sleep(800);
    await tween(500, t => { G.tilt = 70 * (1 - t); });
    tapWater.setAttribute('opacity', 0);
    const fid2 = setInterval(follow, 16);
    await player.walkTo(ox + 70);
    clearInterval(fid2);
    await tween(300, t => { G.bpos.x = G.bpos.x + (ox - G.bpos.x) * t; G.bpos.y = BK.y - 50 + 50 * t; });
    G.bpos.x = ox; G.bpos.y = BK.y;
    Snd.play('clink');
    await player.arm('L', 0, 0, 300); player.release('L');
    await player.walkTo(POS.home);
    player.say('洗乾淨喇！✨', 1200);
  }

  function gasPresent() {
    const now = performance.now();
    G.gas = G.gas.filter(g => now - g.t < 25000);
    return new Set(G.gas.map(g => g.id));
  }

  async function actTest(kind) {
    if (needsGear()) { await stopUnsafe('做測試之前，先著好實驗袍同戴好護目鏡！'); return; }
    if (kind === 'splint') {
      const choice = await menu('用邊種木條？', [['splint', '🔥 燃著的木條（測氫氣）'], ['glow', '✨ 餘燼木條（測氧氣）']]);
      if (!choice) return;
      kind = choice;
    }
    if (kind === 'flame') return actFlame();
    await player.walkTo(POS.rack);
    const item = itemStick(kind);
    player.hold(item.g, 'L');
    Snd.play('click');
    await player.arm('L', 20, 0, 250);
    await player.walkTo(POS.home);
    const gases = gasPresent();
    const rot = kind === 'lime' ? 20 : 165;
    await aimAt(item, 125, rot, G.bpos.x + (kind === 'lime' ? 30 : 0));
    await sleep(500);
    const tip = worldPt(item.tip);
    let res = null;
    if (kind === 'splint') {
      if (gases.has('H2')) {
        Snd.play('pop'); flash(.25, 200);
        for (let i = 0; i < 10; i++) spawn(L.fx, { x: tip.x, y: tip.y, r: rand(6, 14), vx: rand(-90, 90), vy: rand(-90, 30), grow: 1, fill: '#ffd36a', op: .9, fade: 1, life: .4, filter: 'url(#fBlur)' });
        G.gas = G.gas.filter(g => g.id !== 'H2');
        res = 't_pop';
      } else if (gases.has('CO2') || gases.has('NH3g')) {
        item.flame.setAttribute('opacity', 0); Snd.play('click');
        for (let i = 0; i < 6; i++) spawn(L.fx, { x: tip.x, y: tip.y - 10, r: 4, vy: -30, vx: rand(-10, 10), grow: 2, fill: '#999', op: .5, fade: 1, life: 1.5, filter: 'url(#fBlur)' });
        res = gases.has('CO2') ? 't_out' : null;
        if (!res) player.say('木條熄咗！', 1400);
      } else if (gases.has('O2')) {
        item.flame.setAttribute('transform', `translate(0,-82) scale(1.8)`); Snd.play('whoosh');
        player.say('木條燒得更猛烈！有氧氣！', 2000);
      } else player.say('木條繼續燒，冇特別反應…（燒杯口冇氫氣）', 2400);
    } else if (kind === 'glow') {
      if (gases.has('O2')) {
        item.flame.innerHTML = '';
        el('path', { d: 'M0,-26 Q12,-8 6,2 Q0,8 -6,2 Q-12,-8 0,-26Z', fill: '#ffb21a', class: 'flicker' }, item.flame);
        Snd.play('whoosh'); res = 't_relight';
      } else { player.say('餘燼木條冇重新燃起…（冇氧氣）', 2200); }
    } else if (kind === 'lime') {
      if (gases.has('CO2')) {
        emitter(1.2, 20, () => { const t = beakerTopWorld(); spawn(L.fx, { x: t.x + rand(-10, 10), y: t.y + 4, r: 3, vx: (tip.x - t.x) * 1.2, vy: (tip.y + 40 - t.y) * 1.2, fill: '#fff', op: .6, life: .8, fade: 1 }); });
        await sleep(900);
        await tween(900, t => item.liquidRect.setAttribute('fill', mix('#eef7ff', '#f4f2ea', t)));
        item.liquidRect.setAttribute('fill', '#f6f4ec'); item.liquidRect.setAttribute('stroke', '#ddd');
        limeLiquid.setAttribute('fill', '#f2f0e6');
        setTimeout(() => limeLiquid.setAttribute('fill', '#eef7ff'), 15000);
        res = 't_milky';
      } else { await sleep(600); player.say('石灰水仍然清澈…（冇二氧化碳）', 2200); }
    } else if (kind === 'ph') {
      let col = null;
      if (gases.has('NH3g')) { col = '#2a4fd0'; res = 't_nh3'; }
      else if (gases.has('SO2') || gases.has('NO') || gases.has('CO2')) { col = gases.has('CO2') && !gases.has('SO2') && !gases.has('NO') ? '#f2a81a' : '#e3262b'; res = 't_acid'; }
      if (col) await tween(800, t => item.paper.setAttribute('fill', mix('#f0c64a', col, t)));
      else {
        // dip check: liquid pH
        if (G.vis.level > 0) {
          const p = C.pH(G.contents);
          await tween(800, t => item.paper.setAttribute('fill', mix('#f0c64a', C.uiColor(p), t)));
          player.say(`燒杯口冇特別氣體。溶液大約係 <b>pH ${p}</b>（${p < 7 ? '酸性' : p > 7 ? '鹼性' : '中性'}）。`, 2800);
        } else player.say('試紙冇變色，燒杯口冇特別氣體。', 2000);
      }
    }
    if (res) {
      const t = C.TESTS.find(x => x.id === res);
      board(`<div class="b-h">${C.CATS.test} <span>${t.title}</span></div><div class="b-eq">${t.eqHtml}</div><div class="b-obs"><b>觀察：</b>${t.obs}</div>`);
      player.say(t.obs.split('——')[0], 2600);
      discover(t.id, t.title, t.eqHtml);
    }
    await sleep(1600);
    player.hold(null);
    await lowerArm();
    if (res) await emitEvent({ type: 'test', id: res });
  }

  async function actFlame() {
    await player.walkTo(POS.rack + 40);
    const item = itemStick('wire');
    player.hold(item.g, 'L');
    Snd.play('click');
    await player.arm('L', 20, 0, 250);
    await player.walkTo(POS.home);
    const f = C.flameFor(G.contents);
    // dip into beaker
    await aimAt(item, 118, 172, G.bpos.x);
    await sleep(500);
    await player.arm('L', 20, 0, 300);
    await player.walkTo(POS.fburner + 95);
    G.ftOn = true; Snd.play('whoosh');
    await aimAt(item, 112, 150, POS.fburner);
    await sleep(500);
    G.ftColor = f ? f.color : null;
    await sleep(2400);
    G.ftColor = null;
    await sleep(300);
    G.ftOn = false;
    player.hold(null);
    await lowerArm();
    if (f) {
      board(`<div class="b-h">${C.CATS.flame} <span>${f.title}</span></div><div class="b-eq" style="color:${f.color};text-shadow:0 0 8px ${f.color}">● ${f.zh}火焰</div><div class="b-obs"><b>觀察：</b>火焰呈${f.zh} → 樣本含有 ${f.title}。</div>`);
      player.say(`火焰變成<b>${f.zh}</b>！即係有${f.title}。`, 2600);
      discover(f.id, `焰色測試：${f.title}`, `<span style="color:${f.color}">● ${f.zh}</span>`);
      await player.walkTo(POS.home);
      await emitEvent({ type: 'flame', id: f.id });
    } else {
      player.say('火焰冇變色…燒杯入面冇可以測到嘅金屬離子。', 2600);
      await player.walkTo(POS.home);
    }
  }

  let teacherBusy = false;
  async function teacherReturn(msg) {
    if (!G.sup) return;
    if (msg) await teacher.say(msg, 2200);
    G.sup = false; updateHud();
    await teacher.walkTo(1005);
  }
  async function actTeacher() {
    if (teacherBusy) return;
    teacherBusy = true;
    if (!G.sup) {
      teacher.say('好，我過嚟監督你。記住保持安全距離！', 2400);
      await teacher.walkTo(895);
      G.sup = true; updateHud();
    } else {
      await teacherReturn('冇問題，有需要再叫我。');
    }
    teacherBusy = false;
  }

  function menu(title, opts) {
    return new Promise(res => {
      const m = $('#menu');
      m.innerHTML = `<div class="m-title">${title}</div>` + opts.map(([v, l]) => `<button data-v="${v}">${l}</button>`).join('') + `<button class="ghost" data-v="">取消</button>`;
      m.hidden = false;
      m.onclick = e => { const b = e.target.closest('button'); if (!b) return; m.hidden = true; res(b.dataset.v || null); };
    });
  }

  function hint(P) {
    const tips = [
      '小貼士：金屬活潑次序 K > Na > Ca > Mg > Zn > Fe > Pb > (H) > Cu > Ag',
      '小貼士：反應有氣體放出，可以用木條、石灰水或者 pH 試紙測試。',
      '小貼士：有啲反應要用本生燈加熱先會發生，例如鐵 + 硫。',
      '小貼士：加通用指示劑可以睇到溶液係酸定鹼。',
      '小貼士：好危險嘅反應要擺安全屏，仲要叫老師監督！',
      '小貼士：沉澱反應——兩種溶液混合後生成不溶於水嘅固體。',
    ];
    P.say(pick(tips), 4200);
  }

  const ACTIONS = {
    cabinet: () => run(actFetch),
    wear: () => run(actWear),
    burner: () => run(actBurner),
    screen: () => actScreen(),
    wash: () => run(actWash),
    'test-splint': () => run(() => actTest('splint')),
    'test-lime': () => run(() => actTest('lime')),
    'test-ph': () => run(() => actTest('ph')),
    'test-flame': () => run(() => actTest('flame')),
    teacher: () => actTeacher(),
    partner: () => hint(partner),
    beaker: () => {
      const cs = G.contents;
      if (!cs.length) { partner.say('燒杯而家係空嘅。', 1600); return; }
      partner.say('燒杯入面有：' + cs.map(id => C.sp(id).f ? C.fmt(C.sp(id).f, true) : C.sp(id).zh).join('、'), 2800);
    },
    journal: () => openJournal(),
  };
  function doAction(a) { Snd.ensure(); if (ACTIONS[a]) ACTIONS[a](); }
  svg.addEventListener('click', e => { const h = e.target.closest('.hot'); if (h && player) doAction(h.dataset.action); });
  svg.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('hot')) { e.preventDefault(); doAction(e.target.dataset.action); } });
  $('#tools').addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (b && player) doAction(b.dataset.act); });

  /* ================= HUD ================= */
  function updateHud() {
    $('#discCount').textContent = `${G.found.size}/${TOTAL}`;
    const m = MISSIONS[G.mission];
    $('#mNum').textContent = m ? `${G.mission + 1}/${MISSIONS.length}` : '完成';
    $('#mTitle').innerHTML = m ? m.title : '🎓 自由實驗';
    $('#mTask').innerHTML = m ? m.task : '繼續探索，填滿圖鑑！';
    const chips = $('#chips');
    const gases = [...gasPresent()];
    chips.innerHTML = (G.contents.length ? G.contents.map(id => { const s = C.sp(id); return `<span class="chip" title="${esc(s.zh || '')}">${s.f ? C.fmt(s.f, true) : esc(s.zh)}</span>`; }).join('') : '<span class="muted">（空）</span>') +
      gases.filter(g => C.GAS_INFO[g]).map(g => `<span class="chip gas">${C.GAS_INFO[g].label}↑</span>`).join('');
    $$('#tools [data-act]').forEach(b => b.classList.toggle('busy', G.busy && !['screen', 'teacher', 'journal'].includes(b.dataset.act)));
    const on = (a, v) => { const b = $(`#tools [data-act="${a}"]`); if (b) b.classList.toggle('on', !!v); };
    on('burner', G.burner); on('screen', G.screen); on('teacher', G.sup); on('wear', G.wear.coat);
  }

  /* ================= JOURNAL ================= */
  function journalEntries() {
    const list = C.RULES.filter(r => !r.silent).map(r => ({ id: r.id, cat: r.cat, title: lastTitle(r), eq: r.eqHtml, obs: r.obs, hintIds: r.r.concat(r.c), heat: r.heat }));
    C.TESTS.forEach(t => list.push({ id: t.id, cat: 'test', title: t.title, eq: t.eqHtml, obs: t.obs }));
    C.FLAMES.forEach(f => list.push({ id: f.id, cat: 'flame', title: '焰色測試：' + f.title, eq: `<span style="color:${f.color}">● ${f.zh}</span>`, obs: `火焰呈${f.zh}。` }));
    return list;
  }
  let jourCat = 'all';
  function openJournal() {
    const ov = $('#jourOv'); ov.hidden = false;
    renderJournal();
  }
  function renderJournal() {
    const all = journalEntries();
    const cats = Object.keys(C.CATS).filter(c => all.some(e => e.cat === c));
    $('#jourTabs').innerHTML = `<button data-c="all" class="${jourCat === 'all' ? 'on' : ''}">全部 ${G.found.size}/${all.length}</button>` +
      cats.map(c => { const n = all.filter(e => e.cat === c); const f = n.filter(e => G.found.has(e.id)).length; return `<button data-c="${c}" class="${jourCat === c ? 'on' : ''}">${C.CATS[c]} ${f}/${n.length}</button>`; }).join('');
    const list = all.filter(e => jourCat === 'all' || e.cat === jourCat).sort((a, b) => (G.found.has(b.id) - G.found.has(a.id)));
    $('#jourList').innerHTML = list.map(e => G.found.has(e.id)
      ? `<div class="card"><div class="c-cat">${C.CATS[e.cat]}</div><div class="c-title">${e.title}</div><div class="c-eq">${e.eq}</div><div class="c-obs">${e.obs}</div></div>`
      : `<div class="card locked"><div class="c-cat">${C.CATS[e.cat]}</div><div class="c-title">？？？</div><div class="c-eq">？ + ？ → ？</div></div>`).join('');
    $('#jourBar').style.width = (G.found.size / all.length * 100) + '%';
  }
  $('#jourTabs').addEventListener('click', e => { const b = e.target.closest('[data-c]'); if (b) { jourCat = b.dataset.c; renderJournal(); } });
  $('#jourHint').addEventListener('click', () => {
    const all = journalEntries().filter(e => !G.found.has(e.id) && e.hintIds && e.hintIds.every(id => C.sp(id).shelf));
    const box = $('#hintBox');
    if (!all.length) { box.textContent = '已經冇更多提示喇！'; return; }
    const e = pick(all);
    const known = e.hintIds[0];
    box.innerHTML = `💡 試下將 <b>${C.sp(known).zh}</b> 同另一種試劑混合` + (e.heat ? '，然後<b>加熱</b>' : '') + `（${C.CATS[e.cat]}）。`;
  });

  /* ================= CABINET ================= */
  function buildCabinet() {
    const cats = [['acid', '酸 Acids'], ['base', '鹼 Alkalis'], ['metal', '金屬 Metals'], ['salt', '鹽溶液 Salt solutions'], ['solid', '固體 Solids'], ['other', '其他 Others']];
    const HZ = { corrosive: ['腐', '#d22'], flammable: ['燃', '#e67a00'], toxic: ['毒', '#7a1fa2'], oxidiser: ['氧', '#d2a000'], irritant: ['刺', '#555'], harmful: ['害', '#555'] };
    $('#cabShelves').innerHTML = cats.map(([c, label]) => `<div class="shelf"><div class="s-label">${label}</div><div class="s-row">` +
      C.SHELF.filter(s => s[3] === c).map(([id, zh, en, , ph, color, haz]) => {
        const col = color || 'rgba(205,230,255,.55)';
        return `<button class="bottle ${ph === 's' ? 'jar' : ''}" data-sp="${esc(id)}" title="${esc(en)}">
          <span class="b-neck"></span><span class="b-body"><span class="b-liq" style="background:${col}"></span><span class="b-label"><b>${C.sp(id).f ? C.fmt(C.sp(id).f, true) : '—'}</b></span></span>
          <span class="b-name">${zh}</span>${haz.length ? `<span class="b-haz">${haz.map(h => `<i style="border-color:${HZ[h][1]};color:${HZ[h][1]}">${HZ[h][0]}</i>`).join('')}</span>` : ''}
        </button>`;
      }).join('') + `</div></div>`).join('');
  }

  /* ================= MAIN LOOP ================= */
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    people.forEach(P => P.update(dt, now));
    for (let i = emitters.length - 1; i >= 0; i--) {
      const e = emitters[i];
      if (now > e.until) { emitters.splice(i, 1); continue; }
      e.acc += e.rate * dt;
      while (e.acc >= 1) { e.acc--; e.fn(); }
    }
    // boiling when heated
    if (G.burner) {
      G.heatT += dt;
      if (G.vis.level > 0 && G.heatT > 3 && Math.random() < dt * 18) bubble(2);
      if (G.vis.level > 0 && G.heatT > 4 && Math.random() < dt * 2) gasPuff('#ffffff', .3);
    } else G.heatT = 0;
    updateParts(dt);
    // vessel lerp
    const v = G.vis, k = Math.min(1, dt * 2.5);
    v.level += (v.levelT - v.level) * k;
    v.col = mix(v.col, v.colT, k); v.op += (v.opT - v.op) * k;
    v.cloud = Math.max(0, v.cloud - dt * .12);
    const lv = v.level;
    liquid.setAttribute('y', -lv); liquid.setAttribute('height', lv + 2);
    liquid.setAttribute('fill', v.col); liquid.setAttribute('opacity', lv > .5 ? v.op.toFixed(2) : 0);
    cloud.setAttribute('y', -lv); cloud.setAttribute('height', lv + 2); cloud.setAttribute('fill', v.cloudCol); cloud.setAttribute('opacity', (lv > .5 ? v.cloud * .75 : 0).toFixed(2));
    surface.setAttribute('y', -lv - 1); surface.setAttribute('opacity', lv > .5 ? .55 : 0);
    const gk = +bGlow.getAttribute('opacity') || 0;
    bGlow.setAttribute('opacity', (gk + ((v.glow ? v.glow * (.75 + .25 * Math.sin(now / 90)) : 0) - gk) * Math.min(1, dt * 5)).toFixed(2));
    // beaker transform
    let bx = G.bpos.x, by = G.bpos.y;
    if (now < G.shakeUntil) { bx += rand(-3, 3); by += rand(-1.5, 1.5); }
    beaker.setAttribute('transform', `translate(${bx.toFixed(1)},${by.toFixed(1)}) rotate(${G.tilt || 0},56,-104)`);
    // main flame
    if (G.burner) {
      const h = 34 + Math.sin(now / 60) * 3 + Math.sin(now / 23) * 1.5;
      mainFlame.setAttribute('d', `M${BK.x - 7},441 Q${BK.x - 9},${441 - h * .5} ${BK.x},${441 - h} Q${BK.x + 9},${441 - h * .5} ${BK.x + 7},441Z`);
      mainFlame.setAttribute('opacity', .95);
      heatGlow.setAttribute('opacity', (.35 + Math.sin(now / 100) * .08).toFixed(2));
    } else { mainFlame.setAttribute('opacity', 0); heatGlow.setAttribute('opacity', 0); }
    if (G.ftOn) {
      const h = (G.ftColor ? 62 : 40) + Math.sin(now / 50) * 4;
      ftFlame.setAttribute('d', `M${POS.fburner - 6},447 Q${POS.fburner - (G.ftColor ? 14 : 8)},${447 - h * .5} ${POS.fburner},${447 - h} Q${POS.fburner + (G.ftColor ? 14 : 8)},${447 - h * .5} ${POS.fburner + 6},447Z`);
      ftFlame.setAttribute('fill', G.ftColor || 'url(#gFlame)');
      ftFlame.setAttribute('opacity', G.ftColor ? .9 : .9);
      ftFlame.setAttribute('filter', G.ftColor ? 'url(#fBlur)' : '');
    } else ftFlame.setAttribute('opacity', 0);
    // bubbles
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i];
      if (now > b.until) { b.div.classList.add('out'); setTimeout(() => b.div.remove(), 250); bubbles.splice(i, 1); continue; }
      positionBubble(b);
    }
    requestAnimationFrame(frame);
  }
  function tickClock() {
    const d = new Date();
    const s = d.getSeconds(), m = d.getMinutes() + s / 60, h = (d.getHours() % 12) + m / 60;
    hHand.setAttribute('transform', `rotate(${h * 30})`); mHand.setAttribute('transform', `rotate(${m * 6})`); sHand.setAttribute('transform', `rotate(${s * 6})`);
  }
  setInterval(tickClock, 1000); tickClock();

  /* ================= START ================= */
  function buildStart() {
    const wrap = $('#chars');
    wrap.innerHTML = '';
    STUDENTS.forEach((st, i) => {
      const b = document.createElement('button');
      b.className = 'char' + (i === G.charIdx ? ' on' : '');
      b.dataset.i = i;
      const s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', '-75 -420 150 300');
      const P = makePerson(st, s); P.update(0, 0);
      b.appendChild(s);
      const n = document.createElement('span'); n.textContent = st.name; b.appendChild(n);
      wrap.appendChild(b);
    });
    wrap.onclick = e => {
      const b = e.target.closest('.char'); if (!b) return;
      G.charIdx = +b.dataset.i; $$('.char').forEach(x => x.classList.toggle('on', x === b));
      const nm = $('#nameIn'); if (!nm.dataset.touched) nm.value = STUDENTS[G.charIdx].name;
      Snd.ensure(); Snd.play('click');
    };
    const nm = $('#nameIn');
    nm.addEventListener('input', () => { nm.dataset.touched = 1; });
    if (save && save.name) { G.charIdx = save.charIdx || 0; nm.value = save.name; nm.dataset.touched = 1; $$('.char').forEach((x, i) => x.classList.toggle('on', i === G.charIdx)); }
    else nm.value = STUDENTS[0].name;
    $('#resetBtn').hidden = !save;
    $('#resetBtn').onclick = () => { if (confirm('確定要清除進度（圖鑑同任務）？')) { store.set('alx-save', null); location.reload(); } };
  }
  async function start() {
    Snd.ensure();
    G.name = ($('#nameIn').value || '').trim().slice(0, 12) || STUDENTS[G.charIdx].name;
    $('#startOv').hidden = true;
    const st = STUDENTS[G.charIdx];
    const others = STUDENTS.filter((_, i) => i !== G.charIdx);
    const pal = others[Math.floor(Math.random() * others.length)];
    partner = makePerson(pal, L.chars);
    partner.x = 455; partner.setOutfit({ coat: true, goggles: true });
    hot(partner.root, 'partner', '實驗拍檔 ' + pal.name);
    hot(teacher.root, 'teacher', '陳老師（撳一下叫老師監督）');
    player = makePerson(st, L.chars);
    player.x = -80;
    people.push(partner, player);
    persist();
    boardWelcome(); updateHud(); renderVessel();
    await player.walkTo(POS.home);
    partner.say(`Hi ${esc(G.name)}！我係${pal.name}，今日我哋一齊做實驗！`, 3000);
    await sleep(1800);
    const m = MISSIONS[G.mission];
    if (m) await dialog('陳老師', m.intro(esc(G.name)), '開始！');
    if (G.mission > 0) { G.wear = { coat: true, goggles: true }; player.setOutfit(G.wear); hookCoat.setAttribute('opacity', 0); hookGog.setAttribute('opacity', 0); }
  }
  $('#startBtn').addEventListener('click', start);
  $('#nameIn').addEventListener('keydown', e => { if (e.key === 'Enter') start(); });

  /* top bar */
  const sndBtn = $('#btnSound');
  const syncSnd = () => { sndBtn.textContent = Snd.on ? '🔊' : '🔇'; sndBtn.setAttribute('aria-label', Snd.on ? '關閉聲音' : '開啟聲音'); };
  sndBtn.addEventListener('click', () => { Snd.on = !Snd.on; store.set('alx-sound', Snd.on); syncSnd(); Snd.ensure(); Snd.play('click'); });
  syncSnd();
  $('#btnJournal').addEventListener('click', openJournal);
  $('#btnHelp').addEventListener('click', () => { $('#helpOv').hidden = false; });
  $$('.overlay .close').forEach(b => b.addEventListener('click', () => { b.closest('.overlay').hidden = true; }));
  $$('.overlay').forEach(o => o.addEventListener('click', e => { if (e.target === o && o.id !== 'startOv' && o.id !== 'cabOv') o.hidden = true; }));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') ['jourOv', 'helpOv'].forEach(id => { $('#' + id).hidden = true; }); });

  buildCabinet();
  buildStart();
  board(`<div class="b-h">Alchemy Lab X</div><div class="b-eq">2K + H<sub>2</sub>SO<sub>4</sub> → K<sub>2</sub>SO<sub>4</sub> + H<sub>2</sub>↑</div><div class="b-obs">歡迎嚟到化學實驗室！</div>`);
  updateHud();
  requestAnimationFrame(frame);

  // debug hook for automated checks
  window.__alx = { G, C, doAction, MISSIONS, run };
})();
