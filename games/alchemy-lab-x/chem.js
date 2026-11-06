/* Alchemy Lab X — chemistry engine
   Species, reaction rules (auto-balanced), pH, flame tests, gas tests. */
(function (global) {
  'use strict';

  /* ---------- formula parsing ---------- */
  function parseGroup(s) {
    const stack = [{}];
    let i = 0;
    const num = () => { let n = ''; while (i < s.length && /\d/.test(s[i])) n += s[i++]; return n ? +n : 1; };
    while (i < s.length) {
      const ch = s[i];
      if (ch === '(') { stack.push({}); i++; }
      else if (ch === ')') {
        i++; const m = num(); const g = stack.pop(); const top = stack[stack.length - 1];
        for (const k in g) top[k] = (top[k] || 0) + g[k] * m;
      } else if (/[A-Z]/.test(ch)) {
        let e = ch; i++;
        while (i < s.length && /[a-z]/.test(s[i])) e += s[i++];
        const m = num(); const top = stack[stack.length - 1];
        top[e] = (top[e] || 0) + m;
      } else i++;
    }
    return stack[0];
  }
  function parse(f) {
    const out = {};
    f.split('·').forEach((part, idx) => {
      let mult = 1, s = part;
      if (idx > 0) { const m = s.match(/^(\d+)/); if (m) { mult = +m[1]; s = s.slice(m[1].length); } }
      const c = parseGroup(s);
      for (const k in c) out[k] = (out[k] || 0) + c[k] * mult;
    });
    return out;
  }

  /* ---------- balancing (rational null-space) ---------- */
  const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a; };
  const lcm = (a, b) => a / gcd(a, b) * b;
  function F(n, d = 1) { if (d < 0) { n = -n; d = -d; } const g = gcd(n, d) || 1; return { n: n / g, d: d / g }; }
  const fsub = (a, b) => F(a.n * b.d - b.n * a.d, a.d * b.d);
  const fmul = (a, b) => F(a.n * b.n, a.d * b.d);
  const fdiv = (a, b) => F(a.n * b.d, a.d * b.n);

  function balance(reac, prod) {
    const all = reac.concat(prod);
    const comps = all.map(parse);
    const els = [...new Set(comps.flatMap(c => Object.keys(c)))];
    const M = els.map(e => comps.map((c, j) => F((c[e] || 0) * (j < reac.length ? 1 : -1))));
    const m = M.length, n = all.length, piv = [];
    let r = 0;
    for (let c = 0; c < n && r < m; c++) {
      let p = r; while (p < m && M[p][c].n === 0) p++;
      if (p === m) continue;
      [M[r], M[p]] = [M[p], M[r]];
      const pv = M[r][c]; M[r] = M[r].map(x => fdiv(x, pv));
      for (let i = 0; i < m; i++) {
        if (i !== r && M[i][c].n !== 0) { const f = M[i][c]; M[i] = M[i].map((x, j) => fsub(x, fmul(f, M[r][j]))); }
      }
      piv.push(c); r++;
    }
    const free = []; for (let c = 0; c < n; c++) if (!piv.includes(c)) free.push(c);
    if (free.length !== 1) return null;
    const fc = free[0]; const x = new Array(n); x[fc] = F(1);
    piv.forEach((c, i) => { x[c] = F(-M[i][fc].n, M[i][fc].d); });
    const L = x.reduce((a, f) => lcm(a, f.d), 1);
    let ints = x.map(f => f.n * (L / f.d));
    if (ints.every(v => v < 0)) ints = ints.map(v => -v);
    if (ints.some(v => v <= 0)) return null;
    const g = ints.reduce((a, b) => gcd(a, b));
    return ints.map(v => v / g);
  }

  /* ---------- pretty formulas ---------- */
  const SUB = '₀₁₂₃₄₅₆₇₈₉';
  function fmt(f, html) {
    let out = '', lastNonDigit = '';
    for (let i = 0; i < f.length; i++) {
      const ch = f[i];
      if (/\d/.test(ch) && /[A-Za-z)]/.test(lastNonDigit)) out += html ? '<sub>' + ch + '</sub>' : SUB[+ch];
      else if ((ch === '+' || ch === '-') && i === f.length - 1 && i > 0) out += html ? '<sup>' + ch + '</sup>' : (ch === '+' ? '⁺' : '⁻');
      else { out += ch; if (!/\d/.test(ch)) lastNonDigit = ch; }
    }
    return out;
  }
  function fmtEq(eq, html) {
    return eq.split(' ').map(tok => {
      if (/^[+→⇌↑↓]$/.test(tok)) return tok;
      const m = tok.match(/^(\d*)(.*)$/);
      return m[1] + fmt(m[2], html);
    }).join(' ');
  }

  /* ---------- species ---------- */
  const SP = {};
  function sp(id) { if (!SP[id]) SP[id] = { id, f: id, ph: 'aq' }; return SP[id]; }
  function def(id, o) { return Object.assign(sp(id), o); }

  // id, zh, en, cat, phase, colour, hazards
  const SHELF = [
    ['HCl', '稀鹽酸', 'Dilute hydrochloric acid', 'acid', 'aq', null, ['corrosive']],
    ['H2SO4', '稀硫酸', 'Dilute sulfuric acid', 'acid', 'aq', null, ['corrosive']],
    ['HNO3', '稀硝酸', 'Dilute nitric acid', 'acid', 'aq', null, ['corrosive', 'oxidiser']],
    ['CH3COOH', '乙酸（醋酸）', 'Ethanoic acid', 'acid', 'aq', null, ['irritant']],
    ['NaOH', '氫氧化鈉溶液', 'Sodium hydroxide', 'base', 'aq', null, ['corrosive']],
    ['KOH', '氫氧化鉀溶液', 'Potassium hydroxide', 'base', 'aq', null, ['corrosive']],
    ['Ca(OH)2', '石灰水', 'Limewater', 'base', 'aq', null, ['irritant']],
    ['NH3', '氨水', 'Aqueous ammonia', 'base', 'aq', null, ['irritant']],
    ['Na', '鈉', 'Sodium (under oil)', 'metal', 's', '#d9d9cf', ['flammable', 'corrosive']],
    ['K', '鉀', 'Potassium (under oil)', 'metal', 's', '#d4d2dc', ['flammable', 'corrosive']],
    ['Ca', '鈣粒', 'Calcium', 'metal', 's', '#e6e1d3', ['flammable']],
    ['Mg', '鎂帶', 'Magnesium ribbon', 'metal', 's', '#cfd4da', ['flammable']],
    ['Zn', '鋅粒', 'Zinc granules', 'metal', 's', '#a7aeb6', []],
    ['Fe', '鐵粉', 'Iron filings', 'metal', 's', '#4f545b', []],
    ['Cu', '銅屑', 'Copper turnings', 'metal', 's', '#c0663a', []],
    ['CuSO4', '硫酸銅溶液', 'Copper(II) sulfate', 'salt', 'aq', '#2f86ff', ['harmful']],
    ['AgNO3', '硝酸銀溶液', 'Silver nitrate', 'salt', 'aq', null, ['corrosive']],
    ['NaCl', '氯化鈉溶液', 'Sodium chloride', 'salt', 'aq', null, []],
    ['BaCl2', '氯化鋇溶液', 'Barium chloride', 'salt', 'aq', null, ['toxic']],
    ['Pb(NO3)2', '硝酸鉛溶液', 'Lead(II) nitrate', 'salt', 'aq', null, ['toxic']],
    ['KI', '碘化鉀溶液', 'Potassium iodide', 'salt', 'aq', null, []],
    ['FeCl3', '氯化鐵(III)溶液', 'Iron(III) chloride', 'salt', 'aq', '#d9962e', ['corrosive']],
    ['Na2CO3', '碳酸鈉溶液', 'Sodium carbonate', 'salt', 'aq', null, ['irritant']],
    ['CaCl2', '氯化鈣溶液', 'Calcium chloride', 'salt', 'aq', null, []],
    ['CaCO3', '大理石碎', 'Marble chips', 'solid', 's', '#f2efe8', []],
    ['NaHCO3', '梳打粉', 'Sodium hydrogencarbonate', 'solid', 's', '#ffffff', []],
    ['NH4Cl', '氯化銨', 'Ammonium chloride', 'solid', 's', '#ffffff', ['harmful']],
    ['CuSO4·5H2O', '硫酸銅晶體', 'Copper(II) sulfate crystals', 'solid', 's', '#2a7bf0', ['harmful']],
    ['MnO2', '二氧化錳', 'Manganese(IV) oxide', 'solid', 's', '#222222', ['harmful']],
    ['S', '硫粉', 'Sulfur powder', 'solid', 's', '#f2d81e', ['flammable']],
    ['H2O', '蒸餾水', 'Distilled water', 'other', 'l', null, []],
    ['H2O2', '過氧化氫', 'Hydrogen peroxide', 'other', 'aq', null, ['oxidiser']],
    ['soap', '洗潔精', 'Washing-up liquid', 'other', 'l', '#9fe08a', []],
    ['UI', '通用指示劑', 'Universal indicator', 'other', 'l', '#3fb54a', []],
    ['phth', '酚酞', 'Phenolphthalein', 'other', 'l', null, ['flammable']],
  ];
  SHELF.forEach(([id, zh, en, cat, ph, color, haz]) => def(id, { zh, en, cat, ph, color, haz, shelf: true, chunk: ph === 's' }));
  def('soap', { f: '' }); def('UI', { f: '' }); def('phth', { f: '' });
  ['H2', 'O2', 'CO2', 'NO', 'NH3g', 'SO2', 'steam'].forEach(g => def(g, { ph: 'g' }));
  def('NH3g', { f: 'NH3' }); def('steam', { f: 'H2O' });
  def('H2O', { ph: 'l' });
  def('CuSO4anh', { f: 'CuSO4', ph: 's', zh: '無水硫酸銅' });
  def('I2', { ph: 'aq' });

  const GAS_INFO = {
    H2: { zh: '氫氣', label: 'H₂' }, O2: { zh: '氧氣', label: 'O₂' }, CO2: { zh: '二氧化碳', label: 'CO₂' },
    NO: { zh: '一氧化氮 → 二氧化氮', label: 'NO₂', acid: true }, NH3g: { zh: '氨氣', label: 'NH₃', alkali: true },
    SO2: { zh: '二氧化硫', label: 'SO₂', acid: true }, steam: { zh: '水蒸氣', label: 'H₂O' },
  };

  /* solids & colours */
  const SOLIDS = {
    AgCl: ['#f4f4f2', '白色'], AgI: ['#efe08c', '淡黃色'], BaSO4: ['#f7f7f7', '白色'], BaCO3: ['#f7f7f7', '白色'],
    PbI2: ['#ffc81a', '亮黃色'], PbCl2: ['#f5f5f5', '白色'], PbSO4: ['#f5f5f5', '白色'], CaCO3: ['#f5f5f2', '白色'],
    CaSO4: ['#f5f5f5', '白色'], CuCO3: ['#46b195', '藍綠色'], MgCO3: ['#f5f5f5', '白色'], ZnCO3: ['#f5f5f5', '白色'],
    FeCO3: ['#a2b07f', '灰綠色'], 'Cu(OH)2': ['#3a8cff', '淺藍色'], 'Fe(OH)2': ['#5b8a49', '暗綠色'],
    'Fe(OH)3': ['#a3461d', '紅褐色'], 'Mg(OH)2': ['#f5f5f5', '白色'], 'Zn(OH)2': ['#f5f5f5', '白色'], 'Pb(OH)2': ['#f5f5f5', '白色'],
    Cu: ['#b8562d', '紅褐色'], Ag: ['#c9ccd4', '銀灰色'], Pb: ['#6d717a', '灰黑色'], Zn: ['#a7aeb6', '灰色'], Fe: ['#4f545b', '灰黑色'],
    MgO: ['#fbfbfb', '白色'], CaO: ['#f2f0ea', '白色'], CuO: ['#1d1d1d', '黑色'], FeS: ['#2a2a2a', '黑色'], ZnS: ['#f2f2f2', '白色'],
    CuSO4anh: ['#f2f2f2', '白色'],
  };
  const AQ_COLORS = {
    CuSO4: '#2f86ff', 'Cu(NO3)2': '#2f86ff', CuCl2: '#2fa8b8', 'Cu(CH3COO)2': '#2f86ff',
    FeCl2: '#a9d98a', FeSO4: '#a9d98a', 'Fe(NO3)2': '#a9d98a', 'Fe(CH3COO)2': '#a9d98a', FeCl3: '#d9962e', I2: '#9a4a1c',
  };
  const METAL_ZH = { Na: '鈉', K: '鉀', Ca: '鈣', Mg: '鎂', Zn: '鋅', Fe: '鐵', Cu: '銅', Ag: '銀', Pb: '鉛', Ba: '鋇', H: '氫', NH4: '銨' };

  /* salts registry */
  const SALTS = {};
  const POLY = new Set(['SO4', 'NO3', 'CO3', 'OH', 'CH3COO', 'NH4']);
  const INSOL = new Set(['Ag|Cl', 'Ag|I', 'Ba|SO4', 'Ba|CO3', 'Pb|I', 'Pb|Cl', 'Pb|SO4', 'Ca|CO3', 'Cu|CO3',
    'Mg|CO3', 'Zn|CO3', 'Fe|CO3', 'Cu|OH', 'Fe|OH', 'Mg|OH', 'Zn|OH', 'Pb|OH']);
  const insoluble = (N, v, A) => INSOL.has(N + '|' + A) && !(N === 'Fe' && v === 3 && A === 'CO3');
  function saltF(N, v, A, a) {
    const L = lcm(v, a), p = L / v, q = L / a;
    if (A === 'CH3COO' && N === 'H') return 'CH3COOH';
    if (A === 'CH3COO' && p === 1 && q === 1) return 'CH3COO' + N;
    const m = p > 1 ? (POLY.has(N) ? '(' + N + ')' + p : N + p) : N;
    const an = q > 1 ? (POLY.has(A) ? '(' + A + ')' + q : A + q) : A;
    return m + an;
  }
  function salt(N, v, A, a) {
    const f = saltF(N, v, A, a);
    if (!SALTS[f]) SALTS[f] = { N, v, A, a };
    const s = sp(f);
    if (insoluble(N, v, A)) { s.ph = 's'; s.ppt = true; }
    return f;
  }
  // shelf salts, acids, bases
  [['Cu', 2, 'SO4', 2], ['Ag', 1, 'NO3', 1], ['Na', 1, 'Cl', 1], ['Ba', 2, 'Cl', 1], ['Pb', 2, 'NO3', 1], ['K', 1, 'I', 1],
    ['Fe', 3, 'Cl', 1], ['Na', 1, 'CO3', 2], ['Ca', 2, 'Cl', 1],
    ['H', 1, 'Cl', 1], ['H', 1, 'SO4', 2], ['H', 1, 'NO3', 1], ['H', 1, 'CH3COO', 1],
    ['Na', 1, 'OH', 1], ['K', 1, 'OH', 1], ['Ca', 2, 'OH', 1]].forEach(a => salt(...a));

  /* ---------- rules ---------- */
  const RULES = [];
  const CATS = {
    ma: '金屬 + 酸', mw: '金屬 + 水', neut: '中和反應', oxa: '金屬氧化物 + 酸', carb: '碳酸鹽 + 酸',
    ppt: '沉澱反應', disp: '金屬置換', cat: '催化分解', heat: '加熱反應', redox: '其他氧化還原', other: '其他反應',
    test: '氣體測試', flame: '焰色測試',
  };
  const nameOf = id => { const s = sp(id); return s.zh && s.shelf ? s.zh : fmt(s.f, true); };

  function addRule(o) {
    const r = {
      id: o.id, cat: o.cat, r: o.r, p: o.p || [], g: o.g || [], c: o.c || [], heat: !!o.heat, dry: !!o.dry,
      danger: o.danger || 0, fx: o.fx || {}, obs: o.obs || '', silent: !!o.silent,
    };
    r.title = o.title || [...o.r.filter(x => x !== 'H2O' || o.cat === 'mw' || o.cat === 'other'), ...r.c].map(nameOf).join(' + ') + (r.heat ? '（加熱）' : '');
    const R = (o.eqR || o.r).map(x => sp(x).f);
    const Pids = o.eqP || [...r.p, ...r.g];
    const P = Pids.map(x => sp(x).f);
    const co = balance(R, P);
    if (!co) console.warn('Could not balance', r.id, R, P);
    const mark = id => {
      if (r.g.includes(id)) return '↑';
      if ((r.cat === 'ppt' && sp(id).ppt) || (r.cat === 'disp' && SOLIDS[id])) return '↓';
      return '';
    };
    const side = (fs, ids, off, html) => fs.map((f, i) => {
      const c = co ? co[i + off] : 1;
      return (c > 1 ? c : '') + fmt(f, html) + (ids ? mark(ids[i]) : '');
    }).join(' + ');
    const cat = r.c.length ? (r.c.map(x => sp(x).f ? fmt(sp(x).f, true) : nameOf(x)).join(', ')) : '';
    const arrow = (html) => (cat ? (html ? '<span class="arr">→<small>' + cat + '</small></span>' : '→') : (r.heat ? (html ? '<span class="arr">→<small>加熱</small></span>' : '→') : '→'));
    r.eqHtml = side(R, null, 0, true) + ' ' + arrow(true) + ' ' + side(P, Pids, R.length, true);
    r.eqText = side(R, null, 0, false) + ' → ' + side(P, Pids, R.length, false);
    RULES.push(r);
    return r;
  }

  /* --- special catalysts --- */
  addRule({ id: 'elephant', cat: 'cat', r: ['H2O2'], c: ['KI', 'soap'], p: ['H2O'], g: ['O2'], eqR: ['H2O2'], eqP: ['H2O', 'O2'], danger: 1,
    title: '大象牙膏（H₂O₂ + KI + 洗潔精）',
    obs: '嘩！大量泡沫好似牙膏咁由燒杯噴湧而出——呢個就係「大象牙膏」實驗！KI 催化過氧化氫快速分解出氧氣，洗潔精把氧氣困成泡沫，反應放熱。',
    fx: { foam: 3, bub: 3, warm: 1, dur: 5, sound: 'whoosh' } });
  addRule({ id: 'h2o2_ki', cat: 'cat', r: ['H2O2'], c: ['KI'], p: ['H2O'], g: ['O2'], eqR: ['H2O2'], eqP: ['H2O', 'O2'],
    obs: '溶液產生大量細小氣泡並變暖，溶液略帶黃色。碘化鉀是催化劑。', fx: { bub: 3, foam: 1, warm: 1, dur: 3, sound: 'fizz' } });
  addRule({ id: 'h2o2_mno2', cat: 'cat', r: ['H2O2'], c: ['MnO2'], p: ['H2O'], g: ['O2'], eqR: ['H2O2'], eqP: ['H2O', 'O2'],
    obs: '黑色粉末表面立即產生大量氣泡（氧氣），燒杯變暖。二氧化錳是催化劑，反應後本身沒有被消耗。', fx: { bub: 3, warm: 1, dur: 3.5, sound: 'fizz' } });

  /* --- nitric acid specials --- */
  addRule({ id: 'cu_hno3', cat: 'redox', r: ['Cu', 'HNO3'], p: [salt('Cu', 2, 'NO3', 1), 'H2O'], g: ['NO'], danger: 2,
    obs: '銅慢慢溶解，溶液變成藍色；液面上方出現紅棕色的有毒氣體（無色的 NO 遇空氣即變成紅棕色的 NO₂）。⚠ 應在通風櫃進行。',
    fx: { bub: 2, gasColor: '#b5541c', dur: 4, sound: 'fizz' } });
  addRule({ id: 'mg_hno3', cat: 'ma', r: ['Mg', 'HNO3'], p: [salt('Mg', 2, 'NO3', 1)], g: ['H2'],
    obs: '鎂帶溶解並產生氣泡。（只有鎂與很稀的硝酸反應才會放出氫氣，其他金屬一般唔會。）', fx: { bub: 3, warm: 1, dur: 3, sound: 'fizz' } });

  /* --- metal + acid --- */
  const METALS = { K: 1, Na: 1, Ca: 2, Mg: 2, Zn: 2, Fe: 2 };
  const MA_FX = {
    K: { bub: 3, flame: '#c38cff', sparks: '#ead6ff', boom: 1, shake: 1, dur: 3.5, sound: 'boom' },
    Na: { bub: 3, flame: '#ffc21a', sparks: '#fff0b0', skitter: 1, shake: 1, dur: 3.5, sound: 'sizzle' },
    Ca: { bub: 3, warm: 1, dur: 3, sound: 'fizz' },
    Mg: { bub: 3, warm: 1, dur: 3, sound: 'fizz' },
    Zn: { bub: 2, dur: 3, sound: 'fizz' },
    Fe: { bub: 1, dur: 3, sound: 'fizz' },
  };
  const MA_OBS = {
    K: '極度劇烈！鉀一接觸酸就著火，發出淡紫色火焰同火花，伴隨爆裂聲，放出大量氣體。⚠ 只可由老師在安全屏後示範！',
    Na: '非常劇烈！鈉熔成銀白色小球喺液面急速游動，發出嘶嘶聲並著火（黃色火焰），放出大量氣體。',
    Ca: '鈣粒迅速溶解，產生大量氣泡，燒杯變暖。',
    Mg: '鎂帶迅速溶解，產生大量氣泡，燒杯明顯變熱。',
    Zn: '鋅粒表面穩定地產生氣泡，鋅粒慢慢變細。',
    Fe: '鐵粉表面慢慢產生氣泡，溶液逐漸變成淺綠色。',
  };
  const ACIDS = [['HCl', 'Cl', 1], ['H2SO4', 'SO4', 2], ['CH3COOH', 'CH3COO', 1], ['HNO3', 'NO3', 1]];
  for (const M in METALS) {
    for (const [acid, A, a] of ACIDS) {
      if (acid === 'HNO3') continue;
      const fx = Object.assign({}, MA_FX[M]);
      let obs = MA_OBS[M];
      if (acid === 'CH3COOH') { fx.bub = Math.max(1, fx.bub - 1); obs += '（乙酸是弱酸，反應比強酸慢。）'; }
      if (M === 'Ca' && acid === 'H2SO4') obs = '起初產生氣泡，但反應很快減慢——生成的硫酸鈣微溶，覆蓋住鈣粒表面。';
      addRule({ id: 'ma_' + M + '_' + acid, cat: 'ma', r: [M, acid], p: [salt(M, METALS[M], A, a)], g: ['H2'],
        danger: (M === 'K' || M === 'Na') ? 3 : 0, obs, fx });
    }
  }
  /* --- metal + water --- */
  addRule({ id: 'mw_K', cat: 'mw', r: ['K', 'H2O'], p: ['KOH'], g: ['H2'], danger: 3,
    obs: '鉀浮喺水面並立即著火，發出淡紫色火焰，喺水面四處急速游動，最後可能有輕微爆裂。溶液呈鹼性。',
    fx: { flame: '#c38cff', sparks: '#ead6ff', skitter: 1, bub: 2, pop: 1, dur: 3.5, sound: 'sizzle' } });
  addRule({ id: 'mw_Na', cat: 'mw', r: ['Na', 'H2O'], p: ['NaOH'], g: ['H2'], danger: 2,
    obs: '鈉浮喺水面，熔成銀白色小球，四處游動並發出嘶嘶聲，最後消失。溶液呈鹼性。',
    fx: { skitter: 1, bub: 2, dur: 3.5, sound: 'sizzle' } });
  addRule({ id: 'mw_Ca', cat: 'mw', r: ['Ca', 'H2O'], p: ['Ca(OH)2'], g: ['H2'],
    obs: '鈣粒沉喺水底，穩定地產生氣泡，溶液變得有啲混濁（氫氧化鈣微溶於水）。', fx: { bub: 2, cloud: '#f5f5f5', dur: 3, sound: 'fizz' } });

  /* --- neutralisation --- */
  const BASES = [['NaOH', 'Na', 1], ['KOH', 'K', 1], ['Ca(OH)2', 'Ca', 2]];
  for (const [base, N, v] of BASES) {
    for (const [acid, A, a] of ACIDS) {
      const s = salt(N, v, A, a);
      addRule({ id: 'neut_' + base + '_' + acid, cat: 'neut', r: [base, acid], p: [s, 'H2O'],
        obs: sp(s).ppt ? '燒杯變暖，並生成少量白色沉澱（硫酸鈣微溶）。' : '燒杯變暖（中和反應是放熱反應），但溶液無明顯變化。加入指示劑就可以睇到顏色轉變！',
        fx: { warm: 1, dur: 2, sound: 'chime' } });
    }
  }
  for (const [acid, A, a] of ACIDS) {
    const s = salt('NH4', 1, A, a);
    addRule({ id: 'neut_NH3_' + acid, cat: 'neut', r: ['NH3', acid], p: [s],
      obs: '溶液變暖，刺鼻的氨味消失。生成銨鹽。', fx: { warm: 1, dur: 2, sound: 'chime' } });
  }
  /* --- metal oxide + acid --- */
  const OXIDES = [['CuO', 'Cu', 2], ['MgO', 'Mg', 2], ['CaO', 'Ca', 2]];
  for (const [ox, N, v] of OXIDES) {
    for (const [acid, A, a] of ACIDS) {
      if (acid === 'CH3COOH') continue;
      const s = salt(N, v, A, a);
      addRule({ id: 'oxa_' + ox + '_' + acid, cat: 'oxa', r: [ox, acid], p: [s, 'H2O'], heat: ox === 'CuO',
        obs: ox === 'CuO' ? '加熱後，黑色的氧化銅逐漸溶解，溶液變成' + (A === 'Cl' ? '藍綠色' : '藍色') + '。' : '白色粉末溶解，溶液變暖。',
        fx: { warm: 1, dur: 2.5, sound: 'chime' } });
    }
  }
  /* --- carbonates + acid --- */
  const CARBS = [['CaCO3', 'Ca', 2], ['Na2CO3', 'Na', 1], ['NaHCO3', 'Na', 1]];
  for (const [carb, N, v] of CARBS) {
    for (const [acid, A, a] of ACIDS) {
      const s = salt(N, v, A, a);
      let obs, fx = { bub: 3, dur: 3.2, sound: 'fizz' };
      if (carb === 'CaCO3') obs = acid === 'H2SO4' ? '起初產生氣泡，但反應好快停止——生成的硫酸鈣微溶，覆蓋住大理石表面。' : '大理石表面產生大量氣泡（二氧化碳），大理石慢慢溶解。';
      else if (carb === 'Na2CO3') { obs = '立即產生大量氣泡（泡騰），放出二氧化碳。'; fx.foam = 1; }
      else { obs = '劇烈冒泡，泡沫湧上燒杯口！' + (acid === 'CH3COOH' ? '（就係「火山爆發」實驗！）' : ''); fx.foam = 2; }
      addRule({ id: 'carb_' + carb + '_' + acid, cat: 'carb', r: [carb, acid], p: [s, 'H2O'], g: ['CO2'], obs, fx });
    }
  }
  /* --- water + oxides / anhydrous salts --- */
  addRule({ id: 'cao_h2o', cat: 'other', r: ['CaO', 'H2O'], p: ['Ca(OH)2'], title: '氧化鈣 + 水',
    obs: '氧化鈣同水劇烈反應，發出嘶嘶聲並放出大量熱，冒出水蒸氣。（生石灰變熟石灰）', fx: { steam: 1, warm: 1, dur: 3, sound: 'sizzle' } });
  addRule({ id: 'cuso4_water', cat: 'other', r: ['CuSO4anh', 'H2O'], p: ['CuSO4'], eqR: ['CuSO4anh', 'H2O'], eqP: ['CuSO4·5H2O'], title: '無水硫酸銅 + 水',
    obs: '白色粉末遇水立即變返藍色，並放熱。（呢個就係檢驗水嘅方法！）', fx: { warm: 1, dur: 2.5, sound: 'chime' } });
  addRule({ id: 'dissolve_cuso4', cat: 'other', r: ['CuSO4·5H2O', 'H2O'], p: ['CuSO4'], eqR: ['CuSO4·5H2O'], eqP: ['CuSO4', 'H2O'], silent: true });

  /* --- ammonium salts + alkali (heat) --- */
  const NH4S = Object.keys(SALTS).filter(f => SALTS[f].N === 'NH4').concat(['NH4Cl']);
  salt('NH4', 1, 'Cl', 1);
  [...new Set(NH4S)].forEach(f => {
    const { A, a } = SALTS[f];
    for (const [base, N, v] of BASES) {
      addRule({ id: 'nh4_' + f + '_' + base, cat: 'other', r: [f, base], p: [salt(N, v, A, a), 'H2O'], g: ['NH3g'], heat: true,
        obs: '加熱後放出有強烈刺激性氣味的氣體（氨氣）。可用濕潤的 pH 試紙測試。', fx: { gasColor: 'rgba(230,240,255,.55)', bub: 1, dur: 3, sound: 'fizz' } });
    }
  });

  /* --- iron(III) specials --- */
  addRule({ id: 'cu_fecl3', cat: 'redox', r: ['Cu', 'FeCl3'], p: ['CuCl2', 'FeCl2'],
    obs: '銅慢慢被溶解（電路板蝕刻就係用呢個反應！），溶液由黃褐色變成藍綠色。', fx: { dur: 3, sound: 'chime' } });
  salt('Cu', 2, 'Cl', 1); salt('Fe', 2, 'Cl', 1);
  addRule({ id: 'fecl3_ki', cat: 'redox', r: ['FeCl3', 'KI'], p: ['FeCl2', 'KCl', 'I2'],
    obs: '溶液由黃色變成深褐色（生成碘）。', fx: { dur: 2.5, sound: 'chime' } });
  salt('K', 1, 'Cl', 1);

  /* --- double displacement (precipitation) --- */
  const shelfSet = new Set(SHELF.map(s => s[0]));
  const saltList = () => Object.keys(SALTS).filter(f => !sp(f).ppt);
  // make sure displacement products exist in registry first
  const REACT = ['K', 'Na', 'Ca', 'Mg', 'Zn', 'Fe', 'Pb', 'H', 'Cu', 'Ag'];
  const DISP_METALS = { Mg: 2, Zn: 2, Fe: 2, Cu: 2 };
  const dispPlan = [];
  for (const M in DISP_METALS) {
    for (const f of saltList()) {
      const S = SALTS[f];
      if (S.N === 'H' || S.A === 'OH' || S.A === 'CO3' || S.N === M) continue;
      if (!['Zn', 'Fe', 'Pb', 'Cu', 'Ag'].includes(S.N)) continue;
      if (S.N === 'Fe' && S.v === 3) continue;
      if (REACT.indexOf(M) >= REACT.indexOf(S.N)) continue;
      dispPlan.push([M, f, salt(M, DISP_METALS[M], S.A, S.a), S.N]);
    }
  }
  const COMMON = new Set(['Na2SO4', 'K2SO4', 'MgSO4', 'ZnSO4', 'FeSO4', 'MgCl2', 'ZnCl2', 'FeCl2', 'CuCl2', 'Cu(NO3)2', 'KCl', 'Mg(NO3)2', 'Zn(NO3)2']);
  const pairsDone = new Set();
  const ppts = [];
  for (const f1 of saltList()) {
    for (const f2 of saltList()) {
      if (f1 === f2) continue;
      const key = [f1, f2].sort().join('|');
      if (pairsDone.has(key)) continue;
      pairsDone.add(key);
      if (!shelfSet.has(f1) && !shelfSet.has(f2)) continue;
      if (!(shelfSet.has(f1) || COMMON.has(f1)) || !(shelfSet.has(f2) || COMMON.has(f2))) continue;
      const A1 = SALTS[f1], A2 = SALTS[f2];
      if (A1.N === A2.N || A1.A === A2.A) continue;
      if (A1.N === 'H' && A2.N === 'H') continue;
      if ((A1.N === 'H' && (A2.A === 'OH' || A2.A === 'CO3')) || (A2.N === 'H' && (A1.A === 'OH' || A1.A === 'CO3'))) continue;
      if (A1.A === 'OH' && A2.A === 'OH') continue;
      if ((A1.N === 'NH4' && A2.A === 'OH') || (A2.N === 'NH4' && A1.A === 'OH')) continue;
      const i1 = insoluble(A1.N, A1.v, A2.A), i2 = insoluble(A2.N, A2.v, A1.A);
      if (!i1 && !i2) continue;
      const pA = salt(A1.N, A1.v, A2.A, A2.a), pB = salt(A2.N, A2.v, A1.A, A1.a);
      ppts.push([f1, f2, pA, pB]);
    }
  }
  for (const [f1, f2, pA, pB] of ppts) {
    const solids = [pA, pB].filter(x => sp(x).ppt);
    const col = solids.map(x => (SOLIDS[x] || ['#fff', '白色'])[1]).join('同');
    let obs = '立即生成' + col + '沉澱（' + solids.map(x => fmt(x, true)).join('、') + '）。';
    const fx = { ppt: 1, dur: 2.5, sound: 'chime' };
    if (solids.includes('PbI2')) { obs = '立即生成亮黃色沉澱，閃閃發光——好似一場「黃金雨」！'; fx.glitter = 1; }
    if (solids.includes('Fe(OH)2')) obs += '沉澱放置一陣後會慢慢變成紅褐色（被空氣氧化）。';
    addRule({ id: 'ppt_' + f1 + '_' + f2, cat: 'ppt', r: [f1, f2], p: [pA, pB], obs, fx });
  }
  /* --- metal displacement --- */
  for (const [M, f, ns, N] of dispPlan) {
    const before = AQ_COLORS[f], after = AQ_COLORS[ns];
    let change = '';
    if (before && !after) change = '，溶液顏色逐漸褪去';
    else if (!before && after) change = '，溶液逐漸變成' + (ns.startsWith('Cu') ? '藍色' : '淺綠色');
    else if (before && after && before !== after) change = '，溶液顏色由藍色變成淺綠色';
    let obs = sp(M).zh.replace(/[粒帶屑粉]/g, '') + '表面有' + SOLIDS[N][1] + '的' + METAL_ZH[N] + '析出' + change + '。';
    if (M === 'Cu' && N === 'Ag') obs = '銅表面慢慢長出銀白色、閃亮的針狀晶體（「銀樹」），溶液逐漸變成藍色。';
    if (N === 'Pb') obs = sp(M).zh.replace(/[粒帶屑粉]/g, '') + '表面長出灰黑色、像樹枝一樣的鉛晶體（「鉛樹」）。';
    addRule({ id: 'disp_' + M + '_' + f, cat: 'disp', r: [M, f], p: [ns, N], obs, fx: { deposit: 1, dur: 3, sound: 'chime', glitter: N === 'Ag' ? 1 : 0 } });
  }

  /* --- heat reactions --- */
  addRule({ id: 'heat_fe_s', cat: 'heat', r: ['Fe', 'S'], p: ['FeS'], heat: true, dry: true,
    obs: '混合物發出橙紅色嘅光，移開火焰後仍繼續發光（放熱反應），生成黑色固體硫化亞鐵。', fx: { glow: '#ff7a1a', smoke: 1, dur: 3.5, sound: 'sizzle' } });
  addRule({ id: 'heat_zn_s', cat: 'heat', r: ['Zn', 'S'], p: ['ZnS'], heat: true, dry: true, danger: 1,
    obs: '劇烈反應，發出亮光同大量白煙，生成白色固體硫化鋅。', fx: { flash: 1, smoke: 1, glow: '#fff1a0', dur: 3, sound: 'whoosh' } });
  addRule({ id: 'heat_mg', cat: 'heat', r: ['Mg'], p: ['MgO'], eqR: ['Mg', 'O2'], eqP: ['MgO'], heat: true, dry: true, title: '鎂帶（加熱）',
    obs: '鎂帶燃燒，發出極耀眼嘅白光！生成白色粉末（氧化鎂）。⚠ 唔好直視強光。', fx: { flash: 2, smoke: 1, glow: '#ffffff', dur: 3.5, sound: 'whoosh' } });
  addRule({ id: 'heat_cu', cat: 'heat', r: ['Cu'], p: ['CuO'], eqR: ['Cu', 'O2'], eqP: ['CuO'], heat: true, dry: true, title: '銅屑（加熱）',
    obs: '紅褐色的銅表面逐漸變黑（生成氧化銅）。', fx: { glow: '#ff9a3a', dur: 3, sound: 'sizzle' } });
  addRule({ id: 'heat_s', cat: 'heat', r: ['S'], g: ['SO2'], eqR: ['S', 'O2'], eqP: ['SO2'], heat: true, dry: true, title: '硫粉（加熱）',
    obs: '硫粉熔化成紅褐色液體，然後燃燒發出藍色火焰，產生有刺激性氣味的氣體。', fx: { flame: '#4f7bff', smoke: 1, dur: 3.5, sound: 'whoosh' } });
  addRule({ id: 'heat_caco3', cat: 'heat', r: ['CaCO3'], p: ['CaO'], g: ['CO2'], heat: true, dry: true, title: '大理石（強熱）',
    obs: '大理石受強熱後發出白光（「石灰光」），慢慢變成白色粉末（生石灰）。', fx: { glow: '#fff4cf', dur: 3.5, sound: 'sizzle' } });
  addRule({ id: 'heat_nahco3', cat: 'heat', r: ['NaHCO3'], p: ['Na2CO3', 'H2O'], g: ['CO2'], heat: true, dry: true, title: '梳打粉（加熱）',
    obs: '白色粉末分解，燒杯壁有水珠凝結，並放出氣體。（所以梳打粉可以令蛋糕發脹！）', fx: { steam: 1, dur: 3, sound: 'sizzle' } });
  addRule({ id: 'heat_cuso4', cat: 'heat', r: ['CuSO4·5H2O'], p: ['CuSO4anh'], g: ['steam'], eqP: ['CuSO4anh', 'H2O'], heat: true, dry: true, title: '硫酸銅晶體（加熱）',
    obs: '藍色晶體逐漸變成白色粉末，同時放出水蒸氣（失去結晶水）。', fx: { steam: 1, dur: 3.5, sound: 'sizzle' } });

  /* apply colours to every known species */
  Object.values(SP).forEach(s => {
    if (SOLIDS[s.id] && !s.shelf) { s.ph = 's'; s.color = SOLIDS[s.id][0]; s.czh = SOLIDS[s.id][1]; }
    if (AQ_COLORS[s.id] && !s.color) s.color = AQ_COLORS[s.id];
  });
  ['Cu', 'Zn', 'Fe'].forEach(m => { sp(m).deposit = SOLIDS[m][0]; });
  sp('Ag').color = SOLIDS.Ag[0]; sp('Pb').color = SOLIDS.Pb[0];

  /* ---------- queries ---------- */
  const isWet = cs => cs.some(id => { const s = sp(id); return s.ph === 'aq' || s.ph === 'l'; });
  function findRule(cs, env) {
    const set = new Set(cs), wet = isWet(cs);
    for (const r of RULES) {
      if (r.heat && !env.heat) continue;
      if (r.dry && wet) continue;
      let ok = true;
      for (const x of r.r) { if (x === 'H2O' ? !wet : !set.has(x)) { ok = false; break; } }
      if (!ok) continue;
      for (const x of r.c) if (!set.has(x)) { ok = false; break; }
      if (ok) return r;
    }
    return null;
  }

  const PH = { HCl: 1, H2SO4: 1, HNO3: 1, CH3COOH: 3, FeCl3: 2, FeCl2: 4, CuSO4: 4, 'Cu(NO3)2': 4, CuCl2: 4, NH4Cl: 5, '(NH4)2SO4': 5, NH4NO3: 5,
    NaOH: 13, KOH: 13, 'Ca(OH)2': 12, NH3: 11, Na2CO3: 11, NaHCO3: 8, CH3COONa: 8, CH3COOK: 8 };
  function pH(cs) {
    let lo = 7, hi = 7;
    cs.forEach(id => { const v = PH[id]; if (v == null) return; if (v < 7) lo = Math.min(lo, v); else hi = Math.max(hi, v); });
    if (lo < 7 && hi > 7) return 7;
    return lo < 7 ? lo : hi;
  }
  const UI_COL = { 1: '#e3262b', 2: '#ee4a22', 3: '#f2731a', 4: '#f6a81b', 5: '#f2d21a', 6: '#b9d42a', 7: '#3fb54a', 8: '#1fa58a', 9: '#1f8fb0', 10: '#2a6fd0', 11: '#2a4fd0', 12: '#4a35b8', 13: '#5a2ca0', 14: '#4a1f80' };
  const uiColor = p => UI_COL[Math.round(p)];

  const FLAMES = [
    { id: 'f_Na', el: 'Na', color: '#ffc21a', zh: '黃色', title: '鈉離子 Na⁺' },
    { id: 'f_K', el: 'K', color: '#c08cff', zh: '淡紫色', title: '鉀離子 K⁺' },
    { id: 'f_Ca', el: 'Ca', color: '#ff5530', zh: '磚紅色', title: '鈣離子 Ca²⁺' },
    { id: 'f_Cu', el: 'Cu', color: '#1fe0a8', zh: '藍綠色', title: '銅離子 Cu²⁺' },
    { id: 'f_Ba', el: 'Ba', color: '#a6e05a', zh: '黃綠色', title: '鋇離子 Ba²⁺' },
  ];
  function flameFor(cs) {
    const els = new Set();
    cs.forEach(id => {
      const s = sp(id); if (!s.f) return;
      const c = parse(s.f); const keys = Object.keys(c);
      if (keys.length < 2) return; // pure elements (metal pieces) don't give a flame colour here
      keys.forEach(k => els.add(k));
    });
    return FLAMES.find(f => els.has(f.el)) || null;
  }

  const TESTS = [
    { id: 't_pop', cat: 'test', title: '氫氣測試（燃著的木條）', eqHtml: fmtEq('2H2 + O2 → 2H2O', true), obs: '燃著的木條放近燒杯口，發出「噗」一聲（爆鳴聲）——證明有氫氣！' },
    { id: 't_relight', cat: 'test', title: '氧氣測試（餘燼木條）', eqHtml: fmtEq('C + O2 → CO2', true), obs: '餘燼木條喺燒杯口重新燃起火焰——證明有氧氣！' },
    { id: 't_milky', cat: 'test', title: '二氧化碳測試（石灰水）', eqHtml: fmtEq('Ca(OH)2 + CO2 → CaCO3↓ + H2O', true), obs: '石灰水變成乳白色（混濁）——證明有二氧化碳！' },
    { id: 't_out', cat: 'test', title: '二氧化碳不助燃', eqHtml: '—', obs: '燃著的木條熄滅咗——CO₂ 唔支持燃燒，所以可以用嚟滅火。' },
    { id: 't_nh3', cat: 'test', title: '氨氣測試（濕潤 pH 試紙）', eqHtml: fmtEq('NH3 + H2O ⇌ NH4+ + OH-', true), obs: '濕潤的 pH 試紙變成藍色——氨是常見氣體中唯一的鹼性氣體。' },
    { id: 't_acid', cat: 'test', title: '酸性氣體（濕潤 pH 試紙）', eqHtml: '—', obs: '濕潤的 pH 試紙變成紅色——氣體溶於水後呈酸性。' },
  ];

  global.Chem = { SP, sp, RULES, CATS, SHELF, SALTS, GAS_INFO, FLAMES, TESTS, METAL_ZH, findRule, isWet, pH, uiColor, flameFor, fmt, fmtEq, parse, balance };
})(window);
