/* 《夢想家之路》Dreamer's Road: a third-person city walk-and-build life-sim (three.js r128).
   Story and numbers live in game-data.js. Original design; all models are built from code. */
(function () {
  'use strict';
  var D = window.GAME_DATA, THREE = window.THREE;
  var root = document.documentElement;
  var wrap = document.getElementById('game');
  if (!wrap || !D || !THREE) return;
  var canvas = document.getElementById('game-canvas');
  var panel = document.getElementById('game-panel');
  var hud = document.getElementById('game-hud');
  var tip = document.getElementById('game-tip');
  var talk = document.getElementById('game-talk');
  var fxLayer = document.getElementById('game-fx');
  var mini = document.getElementById('game-mini'), mctx = mini.getContext('2d');
  var joy = document.getElementById('game-joy'), knob = joy.querySelector('i');
  var viewBtn = document.getElementById('game-view');
  var help = document.getElementById('game-help');

  var params = new URLSearchParams(location.search);
  var DEMO = params.has('demo');
  var TOUCH = matchMedia('(pointer: coarse)').matches;

  /* ---------- language ---------- */
  function lang() { return root.getAttribute('data-lang') === 'zh' ? 'zh' : 'en'; }
  function T(o) { return o ? o[lang()] : ''; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------- state ---------- */
  var KEY = 'dreamers-road-v3';
  var S;
  var CH = D.CHAPTERS;
  function fresh() {
    return { ch: 0, free: 0, fe: 0, fa: [], step: 'title', ap: 0, done: 0, used: {}, look: 0,
      stats: { family: 30, dream: 10, impact: 0, energy: 70, money: 0 },
      buildings: [{ i: 0, j: 0, type: 'home' }], reply: null };
  }
  function save() { if (DEMO) return; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  function load() { try { var s = JSON.parse(localStorage.getItem(KEY)); if (s && s.stats && s.buildings) return s; } catch (e) {} return null; }
  function chap() {
    if (S.free) return { age: D.UI.freeTitle, title: D.UI.freeTitle, ap: 3, intro: [], story: D.FREE.events[S.fe], actions: S.fa.concat(['family', 'rest']), milestone: D.FREE.milestone, isFree: true };
    return CH[Math.min(S.ch, CH.length - 1)];
  }

  /* ---------- the city grid ---------- */
  var P = 9, LOT = 6, ROAD = P - LOT;          // lot pitch, lot size, road width (1 unit ≈ 1.6 m)
  var GROW = [[-1, 1, -1, 1], [-1, 2, -1, 2], [-2, 2, -2, 2], [-2, 3, -2, 3], [-3, 3, -3, 3], [-3, 4, -3, 4], [-4, 4, -4, 4], [-4, 5, -4, 4], [-4, 5, -4, 5], [-5, 5, -5, 5]];
  var MAXB = TOUCH ? [-5, 6, -5, 6] : [-6, 6, -6, 6];
  var bounds = GROW[0], prevBounds = GROW[0];
  function inB(bd, i, j) { return i >= bd[0] && i <= bd[1] && j >= bd[2] && j <= bd[3]; }
  function hash(i, j) { var h = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return h - Math.floor(h); }
  function bAt(i, j) { for (var k = 0; k < S.buildings.length; k++) if (S.buildings[k].i === i && S.buildings[k].j === j) return S.buildings[k]; return null; }
  // about 4 in 10 lots are empty plots you can build on; the rest are ordinary city buildings
  function vacant(i, j) { if (i === 0 && j === 0) return true; if (Math.max(Math.abs(i), Math.abs(j)) === 1) return !((i === 1 && j === -1) || (i === -1 && j === 1)); return hash(i * 1.3, j * 0.7) < 0.42; }
  function freeLots() { var o = []; for (var i = bounds[0]; i <= bounds[1]; i++) for (var j = bounds[2]; j <= bounds[3]; j++) if (vacant(i, j) && !bAt(i, j)) o.push([i, j]); return o; }
  function lotOf(x, z) { var i = Math.round(x / P), j = Math.round(z / P); if (Math.abs(x - i * P) > LOT / 2 || Math.abs(z - j * P) > LOT / 2) return null; return inB(bounds, i, j) ? { i: i, j: j } : null; }
  function island(bd) { return { x0: (bd[0] - 0.5) * P - ROAD / 2, x1: (bd[1] + 0.5) * P + ROAD / 2, z0: (bd[2] - 0.5) * P - ROAD / 2, z1: (bd[3] + 0.5) * P + ROAD / 2 }; }

  /* ---------- three.js setup ---------- */
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, TOUCH ? 1.5 : 1.75));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  var scene = new THREE.Scene();
  var DAY_SKY = new THREE.Color('#b9dcf0'), NIGHT_SKY = new THREE.Color('#0d1a33');
  scene.background = DAY_SKY.clone();
  scene.fog = new THREE.Fog(DAY_SKY.clone(), 70, 240);
  var camera = new THREE.PerspectiveCamera(55, 1, 0.1, 900);
  var hemi = new THREE.HemisphereLight(0xcfe8ff, 0x5d7a4a, 0.75); scene.add(hemi);
  var sun = new THREE.DirectionalLight(0xfff0d8, 1.6);
  sun.castShadow = true; sun.shadow.mapSize.set(TOUCH ? 1024 : 2048, TOUCH ? 1024 : 2048);
  var sc = sun.shadow.camera; sc.left = -30; sc.right = 30; sc.top = 30; sc.bottom = -30; sc.near = 1; sc.far = 140;
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02;
  scene.add(sun); scene.add(sun.target);

  // sky dome with a gradient, and hazy mountains on the horizon
  var skyGeo = new THREE.SphereGeometry(600, 32, 16), skyCols = [], top = new THREE.Color('#3f86c9'), hor = new THREE.Color('#d6ecf7');
  for (var sv = 0; sv < skyGeo.attributes.position.count; sv++) { var yy = skyGeo.attributes.position.getY(sv) / 600, c0 = hor.clone().lerp(top, Math.max(0, Math.min(1, yy * 1.8))); skyCols.push(c0.r, c0.g, c0.b); }
  skyGeo.setAttribute('color', new THREE.Float32BufferAttribute(skyCols, 3));
  var skyMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false });
  scene.add(new THREE.Mesh(skyGeo, skyMat));
  (function () {
    var mm = new THREE.MeshStandardMaterial({ color: '#6f8f86', roughness: 1, flatShading: true });
    for (var k = 0; k < 18; k++) {
      var a = k / 18 * Math.PI * 2 + hash(k, 2) * 0.3, d = 200 + hash(k, 5) * 50, h = 30 + hash(k, 9) * 45;
      var m = new THREE.Mesh(new THREE.ConeGeometry(28 + hash(k, 3) * 30, h, 7), mm); m.position.set(Math.cos(a) * d, h / 2 - 2, Math.sin(a) * d); m.rotation.y = hash(k, 7) * 3; scene.add(m);
    }
  })();

  /* ---------- materials and textures ---------- */
  var matCache = {};
  function M(color, o) {
    var k = color + JSON.stringify(o || {});
    if (!matCache[k]) { var p = Object.assign({ color: color, roughness: 0.8, metalness: 0 }, o || {}); matCache[k] = new THREE.MeshStandardMaterial(p); }
    return matCache[k];
  }
  function canvasTex(w, h, draw, repeat) {
    var c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    var t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
    return t;
  }
  function speckle(g, w, h, n, a) { for (var k = 0; k < n; k++) { g.fillStyle = (Math.random() < 0.5 ? 'rgba(0,0,0,' : 'rgba(255,255,255,') + Math.random() * a + ')'; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); } }
  var TEX = {
    grass: canvasTex(128, 128, function (g, w, h) { g.fillStyle = '#6ea851'; g.fillRect(0, 0, w, h); speckle(g, w, h, 2600, 0.12); for (var k = 0; k < 60; k++) { g.strokeStyle = 'rgba(40,90,30,.35)'; var x = Math.random() * w, y = Math.random() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 1, y - 4); g.stroke(); } }, [3, 3]),
    dirt: canvasTex(128, 128, function (g, w, h) { g.fillStyle = '#9c8a68'; g.fillRect(0, 0, w, h); speckle(g, w, h, 3000, 0.16); for (var k = 0; k < 40; k++) { g.fillStyle = 'rgba(90,140,70,.5)'; g.fillRect(Math.random() * w, Math.random() * h, 6, 3); } }, [2, 2]),
    asphalt: canvasTex(128, 128, function (g, w, h) { g.fillStyle = '#3d4148'; g.fillRect(0, 0, w, h); speckle(g, w, h, 3000, 0.18); }, [30, 30]),
    pave: canvasTex(128, 128, function (g, w, h) { g.fillStyle = '#c9c4ba'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(90,85,75,.35)'; g.lineWidth = 2; for (var k = 0; k <= 4; k++) { g.beginPath(); g.moveTo(0, k * 32); g.lineTo(w, k * 32); g.stroke(); g.beginPath(); g.moveTo(k * 32, 0); g.lineTo(k * 32, h); g.stroke(); } speckle(g, w, h, 900, 0.06); }, [3, 3]),
    sand: canvasTex(64, 64, function (g, w, h) { g.fillStyle = '#e3cf9c'; g.fillRect(0, 0, w, h); speckle(g, w, h, 800, 0.12); }, [20, 20])
  };

  var nightMats = [], facadeCache = {};
  function shadeHex(hex, f) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    function c(v) { return Math.max(0, Math.min(255, Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f))); }
    return 'rgb(' + c(r) + ',' + c(g) + ',' + c(b) + ')';
  }
  function facade(o) {
    var k = JSON.stringify(o);
    if (facadeCache[k]) return facadeCache[k];
    var cols = o.cols, rows = o.rows, W = 128, H = Math.max(128, Math.min(512, rows * 40)), lit = [];
    for (var q = 0; q < rows * cols; q++) lit.push(Math.random() < (o.lit || 0.5));
    function draw(g, glow) {
      g.fillStyle = glow ? '#000' : o.base; g.fillRect(0, 0, W, H);
      if (!glow) { if (o.brick) for (var y = 0; y < H; y += 6) { g.fillStyle = 'rgba(0,0,0,.06)'; g.fillRect(0, y, W, 1); } speckle(g, W, H, 900, 0.05); }
      if (!glow && o.shop) { g.fillStyle = o.shop; g.fillRect(0, H - H / rows, W, H / rows * 0.28); }
      var mx = W * 0.24 / cols, my = H * 0.36 / rows;
      for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
        var x = c * W / cols + mx / 2, yy = r * H / rows + my / 2, ww = W / cols - mx, hh = H / rows - my;
        if (o.shop && r === rows - 1) { yy += H / rows * 0.22; hh -= H / rows * 0.15; x -= mx / 3; ww += mx * 0.66; }
        if (o.door && r === rows - 1 && c === Math.floor(cols / 2)) { g.fillStyle = glow ? '#000' : '#5b3a26'; g.fillRect(x, yy, ww, hh + my / 2); continue; }
        if (glow) { g.fillStyle = lit[r * cols + c] || (o.shop && r === rows - 1) ? '#ffcf86' : '#000'; g.fillRect(x, yy, ww, hh); continue; }
        g.fillStyle = o.frame || 'rgba(255,255,255,.85)'; g.fillRect(x - 1.5, yy - 1.5, ww + 3, hh + 3);
        var gr = g.createLinearGradient(x, yy, x + ww, yy + hh); gr.addColorStop(0, o.glass || '#8fb6d6'); gr.addColorStop(1, shadeHex(o.glass || '#8fb6d6', -0.35));
        g.fillStyle = gr; g.fillRect(x, yy, ww, hh); g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(x, yy, ww * 0.35, hh);
        if (o.ac && r < rows - 1 && (r + c) % 3 === 0) { g.fillStyle = '#e6e6e6'; g.fillRect(x + ww * 0.55, yy + hh * 0.7, ww * 0.4, hh * 0.3); }
      }
    }
    var m = new THREE.MeshStandardMaterial({ map: canvasTex(W, H, function (g) { draw(g, false); }), emissiveMap: canvasTex(W, H, function (g) { draw(g, true); }), emissive: new THREE.Color('#ffd28a'), emissiveIntensity: 0, roughness: o.rough != null ? o.rough : 0.75, metalness: o.metal || 0 });
    nightMats.push(m); facadeCache[k] = m;
    return m;
  }

  /* ---------- mesh helpers ---------- */
  function mesh(geo, mat, x, y, z, parent, noShadow) {
    var m = new THREE.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0);
    if (!noShadow) { m.castShadow = true; m.receiveShadow = true; }
    if (parent) parent.add(m); return m;
  }
  function boxG(w, h, d) { return new THREE.BoxGeometry(w, h, d); }
  function fbox(w, h, d, fac, roofColor, parent, y) { var roof = M(roofColor || '#8a8f98'); return mesh(boxG(w, h, d), [fac, fac, roof, roof, fac, fac], 0, (y || 0) + h / 2, 0, parent); }
  function gable(w, d, h, color, parent, y) {
    var s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.lineTo(-w / 2, 0);
    var g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false }); g.translate(0, 0, -d / 2);
    return mesh(g, M(color, { roughness: 0.9 }), 0, y, 0, parent);
  }
  function pyramid(r, h, color, parent, y, o) { var m = mesh(new THREE.ConeGeometry(r, h, 4), M(color, o), 0, y + h / 2, 0, parent); m.rotation.y = Math.PI / 4; return m; }
  function cyl(rt, rb, h, color, parent, x, y, z, seg, o) { return mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 16), M(color, o), x, y + h / 2, z, parent); }
  function glowMat(color, i) { return new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: i }); }
  function roofStuff(g, w, d, y) { // water tanks and AC units on flat roofs
    cyl(0.45, 0.45, 0.9, '#c9ccd1', g, w * 0.25, y, -d * 0.2, 12);
    mesh(boxG(0.7, 0.45, 0.5), M('#d9dbde'), -w * 0.2, y + 0.22, d * 0.15, g);
  }

  /* ---------- the story's buildings (inside a 6 × 6 lot, ground at y = 0) ---------- */
  var anims = [], launchAt = 0;
  var BUILD = {
    home: function (g) {
      fbox(3.6, 2.8, 3.2, facade({ base: '#efe2c6', cols: 3, rows: 2, lit: 0.7, door: true, glass: '#7ea2c4' }), '#b84d3a', g);
      gable(4.0, 3.6, 1.7, '#a8432f', g, 2.8);
      cyl(0.22, 0.22, 1.2, '#7a3a2a', g, 1.1, 3.2, -0.6, 8);
      mesh(boxG(1.2, 0.08, 1.0), M('#9a948a'), 0, 0.04, 2.1, g);
      for (var k = 0; k < 2; k++) mesh(new THREE.SphereGeometry(0.35, 10, 8), M('#4f8f4a'), -1.2 + k * 2.4, 0.3, 1.9, g);
    },
    school: function (g) {
      fbox(5, 3.6, 3.4, facade({ base: '#e8c56a', cols: 5, rows: 2, lit: 0.4, door: true, brick: true }), '#9b8a62', g);
      mesh(boxG(5.2, 0.35, 3.6), M('#c7a352'), 0, 3.75, 0, g);
      cyl(0.05, 0.05, 4.2, '#bbbbbb', g, -2.2, 3.9, -1.2, 8);
      var flag = mesh(boxG(1.1, 0.7, 0.03), M('#d6453d'), -1.65, 7.7, -1.2, g);
      anims.push(function (t) { flag.rotation.y = Math.sin(t * 2.4 + 1) * 0.25; flag.position.x = -2.2 + Math.cos(flag.rotation.y) * 0.55; });
      mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.08, 24), M('#ffffff'), 0, 3.0, 1.75, g).rotation.x = Math.PI / 2;
    },
    library: function (g) {
      fbox(4.4, 3.2, 3.6, facade({ base: '#a9c9c4', cols: 4, rows: 2, lit: 0.5, door: true, frame: '#e9efe9' }), '#3d6f7d', g);
      gable(4.8, 4.0, 1.5, '#365f6b', g, 3.2);
      for (var k = 0; k < 4; k++) cyl(0.16, 0.16, 3.2, '#f3efe6', g, -1.5 + k, 0, 2.0, 12);
      mesh(boxG(4.4, 0.3, 0.8), M('#e7e2d6'), 0, 0.15, 2.1, g);
    },
    rooftop: function (g) {
      fbox(2.6, 6, 2.6, facade({ base: '#d8d2c4', cols: 2, rows: 5, lit: 0.6, ac: true }), '#8d8a80', g);
      mesh(new THREE.SphereGeometry(1.25, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M('#9db3cf', { metalness: 0.4, roughness: 0.35 }), 0, 6, 0, g);
      var tel = cyl(0.14, 0.2, 1.6, '#39465e', g, 0, 6.4, 0, 10); tel.rotation.z = -0.9;
      anims.push(function (t) { tel.rotation.y = Math.sin(t * 0.3) * 0.8; });
    },
    studio: function (g) {
      fbox(3.8, 4.4, 3.4, facade({ base: '#4b78ad', cols: 4, rows: 4, lit: 0.85, glass: '#a7cdf2', frame: '#2c4a70', rough: 0.25, metal: 0.3 }), '#2c4a70', g);
      mesh(boxG(1.8, 1.0, 0.1), M('#1d222c'), 0, 5.0, 0, g);
      mesh(boxG(1.6, 0.85, 0.02), glowMat('#4fb8ff', 0.8), 0, 5.0, 0.06, g);
    },
    harbor: function (g) {
      mesh(boxG(5.6, 0.1, 5.6), M('#2f7ea5', { roughness: 0.2, metalness: 0.2 }), 0, 0.02, 0, g);
      for (var k = 0; k < 6; k++) mesh(boxG(5.6, 0.12, 0.35), M('#8a6038'), 0, 0.35, -2.4 + k * 0.4, g);
      for (var q = 0; q < 4; q++) cyl(0.12, 0.12, 0.6, '#5c3d22', g, -2.6 + q * 1.7, -0.1, -0.2, 8);
      var boat = new THREE.Group(); g.add(boat); boat.position.set(0.5, 0.25, 1.4);
      mesh(boxG(3.4, 0.6, 1.2), M('#1f3d63'), 0, 0.3, 0, boat);
      mesh(boxG(1.4, 0.7, 0.9), M('#f4f4f4'), -0.3, 0.95, 0, boat);
      cyl(0.12, 0.12, 0.6, '#c9a35b', boat, 0.2, 1.3, 0, 8);
      anims.push(function (t) { boat.position.y = 0.25 + Math.sin(t * 1.6) * 0.06; boat.rotation.z = Math.sin(t * 1.3) * 0.03; });
      fbox(1.8, 1.8, 1.6, facade({ base: '#b9b3a6', cols: 1, rows: 1, lit: 0.5 }), '#6c6a66', g, 0).position.set(-1.9, 0.9, -1.8);
    },
    store: function (g) {
      fbox(4.2, 2.8, 3.4, facade({ base: '#f5f2ea', cols: 3, rows: 1, lit: 0.95, glass: '#cfeaf6' }), '#2f9e6a', g);
      mesh(boxG(4.3, 0.45, 3.5), M('#2f9e6a'), 0, 2.6, 0, g);
      var aw = canvasTex(64, 16, function (c) { for (var k = 0; k < 8; k++) { c.fillStyle = k % 2 ? '#ffffff' : '#2f9e6a'; c.fillRect(k * 8, 0, 8, 16); } });
      mesh(boxG(4.2, 0.06, 1.1), new THREE.MeshStandardMaterial({ map: aw, roughness: 0.9 }), 0, 2.15, 2.15, g).rotation.x = 0.35;
      var lamp = glowMat('#fff1b8', 0.4); nightMats.push(lamp);
      mesh(boxG(3.6, 0.12, 0.12), lamp, 0, 2.0, 1.78, g, true);
    },
    factory: function (g) {
      fbox(5.2, 2.8, 3.8, facade({ base: '#cfd5dc', cols: 6, rows: 1, lit: 0.5, glass: '#7d93ab' }), '#9aa6b2', g);
      for (var k = 0; k < 3; k++) gable(1.7, 3.8, 1.0, '#8fb9d8', g, 2.8).position.x = -1.7 + k * 1.7;
      cyl(0.32, 0.4, 5.5, '#a65a42', g, 1.8, 0, -1.2, 14);
      var puffs = [];
      for (var q = 0; q < 4; q++) puffs.push(mesh(new THREE.SphereGeometry(0.45, 10, 8), new THREE.MeshStandardMaterial({ color: '#eef0f3', transparent: true, opacity: 0.7 }), 1.8, 5.5, -1.2, g, true));
      anims.push(function (t) { puffs.forEach(function (p, n) { var u = (t * 0.25 + n / 4) % 1; p.position.set(1.8 + u * 1.5, 5.6 + u * 3, -1.2); p.scale.setScalar(0.6 + u * 1.6); p.material.opacity = 0.7 * (1 - u); }); });
    },
    university: function (g) {
      mesh(boxG(5.4, 0.4, 4.6), M('#cfc6b4'), 0, 0.2, 0, g);
      fbox(5, 3.8, 3.6, facade({ base: '#e8e0cf', cols: 5, rows: 2, lit: 0.5, door: true }), '#b9ad94', g, 0.4);
      for (var k = 0; k < 6; k++) cyl(0.17, 0.17, 3.8, '#fbf8f1', g, -2.1 + k * 0.84, 0.4, 2.1, 12);
      gable(5.2, 0.9, 1.0, '#e2d9c5', g, 4.2).position.z = 2.05;
      mesh(boxG(5.2, 0.35, 4.4), M('#d8cfbb'), 0, 4.35, 0.2, g);
      mesh(new THREE.SphereGeometry(1.2, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M('#3c6fa8', { metalness: 0.35, roughness: 0.4 }), 0, 4.5, -0.3, g);
    },
    nanolab: function (g) {
      fbox(4.4, 3.2, 3.8, facade({ base: '#f2f5f9', cols: 4, rows: 2, lit: 0.6, glass: '#7fc4e8', frame: '#d9e2ec' }), '#c9d4df', g);
      mesh(boxG(3.4, 0.9, 2.8), M('#9fd6f2', { roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.7 }), 0, 3.65, 0, g);
      var atom = new THREE.Group(); atom.position.set(0, 6, 0); g.add(atom);
      var ring = glowMat('#3fb0ff', 0.9);
      for (var k = 0; k < 3; k++) mesh(new THREE.TorusGeometry(1.0, 0.05, 8, 40), ring, 0, 0, 0, atom, true).rotation.set(Math.PI / 2, k * Math.PI / 3, 0);
      mesh(new THREE.SphereGeometry(0.22, 16, 12), glowMat('#c9a35b', 0.6), 0, 0, 0, atom, true);
      anims.push(function (t) { atom.rotation.y = t * 0.8; atom.rotation.x = Math.sin(t * 0.5) * 0.3; });
    },
    patent: function (g) {
      fbox(3.2, 2.8, 3.2, facade({ base: '#f3e6c8', cols: 2, rows: 2, lit: 0.5, door: true }), '#b8944f', g);
      pyramid(2.6, 2.0, '#c9a35b', g, 2.8, { metalness: 0.6, roughness: 0.3 });
      var scroll = new THREE.Group(); g.add(scroll);
      mesh(boxG(1.2, 0.8, 0.05), M('#fffaf0'), 0, 0, 0, scroll, true);
      mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 16), M('#b03a2e'), 0.4, -0.25, 0.04, scroll, true).rotation.x = Math.PI / 2;
      anims.push(function (t) { scroll.position.set(0, 6.3 + Math.sin(t * 1.5) * 0.2, 0); scroll.rotation.y = t * 0.6; });
    },
    exchange: function (g) {
      mesh(boxG(5, 1.4, 5), M('#c9a35b', { metalness: 0.5, roughness: 0.4 }), 0, 0.7, 0, g);
      fbox(3.8, 17, 3.8, facade({ base: '#1b3a63', cols: 4, rows: 14, lit: 0.55, glass: '#4d78a8', frame: '#132a48', rough: 0.25, metal: 0.4 }), '#2b5285', g, 1.4);
      mesh(boxG(2.6, 1.6, 2.6), M('#c9a35b', { metalness: 0.6, roughness: 0.3 }), 0, 19.2, 0, g);
      cyl(0.06, 0.06, 3.5, '#c9a35b', g, 0, 20, 0, 6);
      var bl = mesh(new THREE.SphereGeometry(0.15, 8, 8), glowMat('#ff2020', 1), 0, 23.6, 0, g, true);
      anims.push(function (t) { bl.material.emissiveIntensity = Math.sin(t * 4) > 0 ? 1.4 : 0.1; });
    },
    btrdcc: function (g) {
      fbox(4.2, 9.5, 3.8, facade({ base: '#4fa688', cols: 4, rows: 8, lit: 0.55, glass: '#9fe0c8', frame: '#2f7f68', rough: 0.3, metal: 0.3 }), '#2f7f68', g);
      var helix = new THREE.Group(); helix.position.set(0, 9.6, 0); g.add(helix);
      var ga = glowMat('#c9a35b', 0.4), wa = glowMat('#ffffff', 0.3), sg = new THREE.SphereGeometry(0.12, 8, 6);
      for (var k = 0; k < 14; k++) { var a = k * 0.55, y = k * 0.22; mesh(sg, ga, Math.cos(a) * 0.7, y, Math.sin(a) * 0.7, helix, true); mesh(sg, wa, -Math.cos(a) * 0.7, y, -Math.sin(a) * 0.7, helix, true); }
      anims.push(function (t) { helix.rotation.y = t * 0.7; });
    },
    cat: function (g) {
      fbox(3.6, 2.8, 3.2, facade({ base: '#f3c3cf', cols: 3, rows: 2, lit: 0.85, door: true, glass: '#fff3c4' }), '#e58fa8', g);
      mesh(boxG(3.8, 0.35, 3.4), M('#e58fa8'), 0, 2.95, 0, g);
      [-1.1, 1.1].forEach(function (x) { mesh(new THREE.ConeGeometry(0.6, 1.2, 4), M('#e58fa8'), x, 3.7, 0, g); });
      var tail = mesh(new THREE.TorusGeometry(0.6, 0.12, 8, 20, Math.PI), M('#e58fa8'), 1.9, 1.2, 0.6, g);
      anims.push(function (t) { tail.rotation.z = 1.2 + Math.sin(t * 3) * 0.35; });
    },
    youth: function (g) {
      fbox(4.6, 3.2, 3.8, facade({ base: '#efe0c4', cols: 4, rows: 2, lit: 0.6, door: true }), '#c8604a', g);
      gable(5.0, 4.2, 1.4, '#c8604a', g, 3.2);
      var hs = new THREE.Shape(); hs.moveTo(0, -0.5); hs.bezierCurveTo(-1.1, 0.3, -0.5, 1.0, 0, 0.45); hs.bezierCurveTo(0.5, 1.0, 1.1, 0.3, 0, -0.5);
      var heart = mesh(new THREE.ExtrudeGeometry(hs, { depth: 0.25, bevelEnabled: false }), glowMat('#e2475b', 0.35), 0, 6.2, 0, g);
      anims.push(function (t) { heart.rotation.y = t * 0.9; heart.position.y = 6.2 + Math.sin(t * 2) * 0.2; heart.scale.setScalar(1 + Math.sin(t * 5) * 0.05); });
    },
    rocket: function (g) {
      cyl(2.6, 2.8, 0.5, '#8a94a6', g, 0, 0, 0, 32);
      for (var k = 0; k < 4; k++) mesh(boxG(0.18, 9, 0.18), M('#d0473f'), -1.8 + (k % 2) * 0.9, 4.5, -1.8 + Math.floor(k / 2) * 0.9, g);
      for (var q = 0; q < 6; q++) mesh(boxG(1.1, 0.1, 1.1), M('#b8402f'), -1.35, 1 + q * 1.4, -1.35, g);
      var rk = new THREE.Group(); g.add(rk); rk.position.y = 0.5;
      cyl(0.6, 0.6, 6.5, '#f5f5f5', rk, 0, 0.6, 0, 24, { roughness: 0.4 });
      mesh(new THREE.ConeGeometry(0.6, 1.6, 24), M('#d0473f'), 0, 7.9, 0, rk);
      cyl(0.62, 0.62, 0.35, '#1f3d63', rk, 0, 4.6, 0, 24);
      for (var f = 0; f < 4; f++) { var fin = mesh(boxG(0.08, 1.3, 0.8), M('#d0473f'), 0, 1.2, 0, rk); fin.rotation.y = f * Math.PI / 2; fin.translateZ(0.75); }
      var flame = mesh(new THREE.ConeGeometry(0.45, 2.2, 16), new THREE.MeshBasicMaterial({ color: '#ffb347', transparent: true, opacity: 0.9 }), 0, -0.6, 0, rk, true);
      flame.rotation.x = Math.PI; flame.visible = false;
      anims.push(function () {
        var u = launchAt ? (performance.now() - launchAt) / 1000 : -1;
        if (u < 0 || u > 16) { rk.position.y = 0.5; flame.visible = false; if (u > 16) launchAt = 0; return; }
        rk.position.y = 0.5 + u * u * 3; flame.visible = u < 12; flame.scale.y = 1 + Math.random() * 0.5;
      });
    },
    dome: function (g) {
      cyl(2.9, 3.0, 0.3, '#d5dde6', g, 0, 0, 0, 40);
      for (var k = 0; k < 5; k++) tree(g, Math.cos(k * 1.3) * 1.5, Math.sin(k * 1.3) * 1.5, 0.75).position.y = 0.3;
      fbox(0.9, 2.4, 0.9, facade({ base: '#eef3f8', cols: 1, rows: 3, lit: 0.8 }), '#c9d4df', g, 0.3);
      mesh(new THREE.SphereGeometry(2.8, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#bfe8ff', transparent: true, opacity: 0.28, roughness: 0.05, metalness: 0.3, side: THREE.DoubleSide, depthWrite: false }), 0, 0.3, 0, g, true);
      var wire = new THREE.Mesh(new THREE.SphereGeometry(2.82, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffffff', wireframe: true, transparent: true, opacity: 0.25 }));
      wire.position.y = 0.3; g.add(wire);
    },
    hospital: function (g) {
      fbox(5, 5.2, 4, facade({ base: '#f4f6f8', cols: 5, rows: 4, lit: 0.7, glass: '#9cc8e0', door: true }), '#cfd8e0', g);
      var cross = glowMat('#e2363c', 0.6); mesh(boxG(1.2, 0.35, 0.1), cross, 0, 4.6, 2.06, g, true); mesh(boxG(0.35, 1.2, 0.1), cross, 0, 4.6, 2.06, g, true);
      roofStuff(g, 5, 4, 5.2); mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.06, 24), M('#3a7a52'), -1.2, 5.25, 0.8, g);
    },
    apartments: function (g) {
      fbox(4.2, 11, 4.2, facade({ base: '#e7d8c4', cols: 4, rows: 10, lit: 0.6, ac: true, shop: '#c9a35b' }), '#a99b88', g);
      roofStuff(g, 4.2, 4.2, 11);
    },
    incubator: function (g) {
      fbox(4.6, 4.2, 4.0, facade({ base: '#ffd27a', cols: 4, rows: 3, lit: 0.85, glass: '#d8f0ff', frame: '#2b2b2b' }), '#2b2b2b', g);
      var door = mesh(boxG(1.4, 2.2, 0.12), glowMat('#ffcf6b', 0.5), 0, 1.1, 2.08, g, true);
      anims.push(function (t) { door.material.emissiveIntensity = 0.4 + Math.sin(t * 2) * 0.2; });
    },
    museum: function (g) {
      fbox(5, 3.4, 4, facade({ base: '#e9eef3', cols: 4, rows: 2, lit: 0.6, glass: '#7fb2d9' }), '#c6ced8', g);
      var s = mesh(new THREE.SphereGeometry(1.5, 24, 16), M('#bcd7ec', { metalness: 0.6, roughness: 0.2 }), 0, 5, 0, g);
      var ring = mesh(new THREE.TorusGeometry(2.0, 0.07, 8, 48), glowMat('#c9a35b', 0.5), 0, 5, 0, g, true); ring.rotation.x = 1.2;
      anims.push(function (t) { ring.rotation.z = t * 0.5; });
    },
    station: function (g) {
      fbox(5.2, 3, 3.6, facade({ base: '#d6cfc2', cols: 6, rows: 1, lit: 0.8, glass: '#8fb6d6' }), '#7a3a2a', g);
      var arch = mesh(new THREE.CylinderGeometry(2.4, 2.4, 3.6, 24, 1, false, 0, Math.PI), M('#8fb9d8', { metalness: 0.4, roughness: 0.3 }), 0, 3, 0, g); arch.rotation.z = Math.PI / 2; arch.rotation.y = Math.PI / 2;
      var clk = mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.1, 24), M('#ffffff'), 0, 2.4, 1.86, g); clk.rotation.x = Math.PI / 2;
    },
    stadium: function (g) {
      var bowl = mesh(new THREE.CylinderGeometry(2.9, 2.5, 2.2, 32, 1, true), M('#dfe3e8', { side: THREE.DoubleSide }), 0, 1.1, 0, g);
      mesh(new THREE.CylinderGeometry(2.4, 2.4, 0.1, 32), M('#3f9a4f'), 0, 0.1, 0, g);
      for (var k = 0; k < 4; k++) { var a = k * Math.PI / 2 + 0.78; cyl(0.06, 0.06, 4.5, '#999', g, Math.cos(a) * 2.8, 0, Math.sin(a) * 2.8, 6); mesh(boxG(0.6, 0.4, 0.15), glowMat('#fff6d8', 0.5), Math.cos(a) * 2.8, 4.6, Math.sin(a) * 2.8, g, true); }
    },
    solar: function (g) {
      var pm = M('#1c3550', { metalness: 0.6, roughness: 0.25 });
      for (var r = 0; r < 3; r++) for (var c = 0; c < 2; c++) { var p = mesh(boxG(2.2, 0.06, 1.2), pm, -1.2 + c * 2.4, 0.9, -1.8 + r * 1.8, g); p.rotation.x = -0.5; cyl(0.05, 0.05, 0.8, '#888', g, -1.2 + c * 2.4, 0, -1.8 + r * 1.8, 6); }
    },
    park: function (g) {
      mesh(new THREE.CylinderGeometry(1.0, 1.1, 0.4, 24), M('#cfd6dc'), 0, 0.2, 0, g);
      var water = mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.05, 24), M('#5fb3d9', { roughness: 0.1, metalness: 0.3 }), 0, 0.42, 0, g);
      var jet = mesh(new THREE.CylinderGeometry(0.05, 0.2, 1.2, 8), new THREE.MeshStandardMaterial({ color: '#d8f2ff', transparent: true, opacity: 0.6 }), 0, 1.0, 0, g, true);
      anims.push(function (t) { jet.scale.y = 0.8 + Math.sin(t * 6) * 0.15; });
      for (var k = 0; k < 6; k++) tree(g, Math.cos(k) * 2.3, Math.sin(k) * 2.3, 0.85);
      bench(g, 0, 1.6, 0);
    }
  };
  var HEIGHT = { exchange: 25, btrdcc: 12, rooftop: 8.5, rocket: 10, dome: 3.4, harbor: 0, university: 6, school: 5, nanolab: 7.5, patent: 7, youth: 7, hospital: 6, apartments: 12, incubator: 4.5, museum: 7, station: 5.5, stadium: 3, solar: 1.5, park: 3 };

  /* ---------- ordinary city buildings on the lots you can't build on ---------- */
  var FILL_COLS = ['#d9cfc0', '#c8d3dc', '#e6d7c3', '#b9c4b0', '#d7c0b8', '#cfd8e3', '#ede4d3', '#c4bfb6'], SHOP_COLS = ['#c9a35b', '#2f9e6a', '#d6453d', '#3c6fa8', '#e76f51'];
  function filler(g, i, j) {
    var h = hash(i * 2.1, j * 3.3), floors = 3 + Math.floor(h * 7), base = FILL_COLS[Math.floor(hash(i, j * 5) * FILL_COLS.length)], shop = SHOP_COLS[Math.floor(hash(j, i * 3) * SHOP_COLS.length)];
    var w = 3.8 + hash(i, j + 4) * 0.8, d = 3.6 + hash(i + 4, j) * 0.8, H = floors * 1.15;
    if (h > 0.93) { for (var k = 0; k < 5; k++) tree(g, (hash(i + k, j) - 0.5) * 4, (hash(i, j + k) - 0.5) * 4, 0.9); bench(g, 0, 1.8, 0); return 3; }
    fbox(w, H, d, facade({ base: base, cols: 4, rows: floors, lit: 0.5, ac: floors > 4, shop: shop }), shadeHex(base, -0.25), g);
    mesh(boxG(w + 0.1, 0.12, 0.5), M(shop), 0, 1.15, d / 2 + 0.2, g).rotation.x = 0.2;
    if (floors > 4) roofStuff(g, w, d, H);
    else gable(w + 0.3, d + 0.3, 1.2, shadeHex(base, -0.45).replace(/rgb\((\d+),(\d+),(\d+)\)/, function (m, r, gg, b) { return '#' + [r, gg, b].map(function (v) { return (+v).toString(16).padStart(2, '0'); }).join(''); }), g, H);
    return H + (floors > 4 ? 1 : 1.2);
  }

  /* ---------- trees, benches, roads, lots ---------- */
  var TREE_G = { trunk: new THREE.CylinderGeometry(0.12, 0.18, 1.4, 7), leaf: new THREE.IcosahedronGeometry(0.9, 1), pine: new THREE.ConeGeometry(0.9, 2.2, 8) };
  function tree(parent, x, z, s) {
    var g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s || 1); parent.add(g);
    mesh(TREE_G.trunk, M('#6e4b2e'), 0, 0.7, 0, g);
    if (hash(x * 3.1, z * 1.7) < 0.35) { mesh(TREE_G.pine, M('#3f7f4f'), 0, 2.0, 0, g); mesh(TREE_G.pine, M('#4a915a'), 0, 2.8, 0, g).scale.setScalar(0.7); }
    else { mesh(TREE_G.leaf, M('#4f8f4a'), 0, 2.1, 0, g); mesh(TREE_G.leaf, M('#5fa257'), 0.35, 2.6, 0.2, g).scale.setScalar(0.7); mesh(TREE_G.leaf, M('#477f42'), -0.4, 2.4, -0.2, g).scale.setScalar(0.65); }
    return g;
  }
  function bench(parent, x, z, ry) {
    var g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry || 0; parent.add(g);
    mesh(boxG(1.2, 0.08, 0.38), M('#8a6038'), 0, 0.45, 0, g); mesh(boxG(1.2, 0.35, 0.06), M('#8a6038'), 0, 0.68, -0.18, g);
    [-0.5, 0.5].forEach(function (lx) { mesh(boxG(0.06, 0.45, 0.36), M('#3a3a3a'), lx, 0.22, 0, g); });
    return g;
  }
  var lotGroup = new THREE.Group(), roadGroup = new THREE.Group(), bGroup = new THREE.Group();
  scene.add(roadGroup); scene.add(lotGroup); scene.add(bGroup);
  var sea = mesh(new THREE.PlaneGeometry(900, 900, 60, 60), new THREE.MeshStandardMaterial({ color: '#2b7aa6', roughness: 0.18, metalness: 0.25 }), 0, -0.9, 0, scene, true);
  sea.rotation.x = -Math.PI / 2; sea.receiveShadow = true;
  var seaPos = sea.geometry.attributes.position;
  var lots = {};
  var lampMat = glowMat('#ffd9a0', 0); lampMat.color.set('#fff4d6'); nightMats.push(lampMat);
  var redL = glowMat('#ff3b30', 1), greenL = glowMat('#2bd46a', 0.1), amberL = glowMat('#ffb020', 0.1);
  var asphMat = new THREE.MeshStandardMaterial({ map: TEX.asphalt, roughness: 0.95 }), sandMat = new THREE.MeshStandardMaterial({ map: TEX.sand, roughness: 1 });
  var paveMat = new THREE.MeshStandardMaterial({ map: TEX.pave, roughness: 0.9 }), grassMat = new THREE.MeshStandardMaterial({ map: TEX.grass, roughness: 1 }), dirtMat = new THREE.MeshStandardMaterial({ map: TEX.dirt, roughness: 1 });

  function inst(geo, mat, list, shadow) {
    var m = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length)), o = new THREE.Object3D();
    list.forEach(function (p, n) { o.position.set(p[0], p[1], p[2]); o.rotation.set(0, p[3] || 0, 0); o.updateMatrix(); m.setMatrixAt(n, o.matrix); });
    m.count = list.length; m.castShadow = !!shadow; m.receiveShadow = true; roadGroup.add(m); return m;
  }
  function buildGround() {
    while (roadGroup.children.length) roadGroup.remove(roadGroup.children[0]);
    var I = island(bounds), w = I.x1 - I.x0, d = I.z1 - I.z0, cx = (I.x0 + I.x1) / 2, cz = (I.z0 + I.z1) / 2;
    var sd = M('#c9b483');
    mesh(boxG(w + 8, 1, d + 8), [sd, sd, sandMat, sd, sd, sd], cx, -0.62, cz, roadGroup).castShadow = false;
    TEX.asphalt.repeat.set(w / 4, d / 4);
    var rs = M('#7b7f86');
    mesh(boxG(w, 0.3, d), [rs, rs, asphMat, rs, rs, rs], cx, -0.15, cz, roadGroup).castShadow = false;
    var dashes = [], zebra = [], poles = [], heads = [], tl = [], hyd = [];
    var xs = [], zs = [];
    for (var k = bounds[0] - 1; k <= bounds[1]; k++) xs.push((k + 0.5) * P);
    for (var q = bounds[2] - 1; q <= bounds[3]; q++) zs.push((q + 0.5) * P);
    function nearCross(v, list) { for (var n = 0; n < list.length; n++) if (Math.abs(v - list[n]) < ROAD / 2 + 1.4) return true; return false; }
    xs.forEach(function (x) { for (var z = I.z0 + 1; z < I.z1 - 1; z += 2.2) if (!nearCross(z, zs)) dashes.push([x, 0.011, z, 0]); });
    zs.forEach(function (z) { for (var x = I.x0 + 1; x < I.x1 - 1; x += 2.2) if (!nearCross(x, xs)) dashes.push([x, 0.011, z, Math.PI / 2]); });
    // zebra crossings on each side of every crossroads
    xs.forEach(function (x) { zs.forEach(function (z) {
      [-1, 1].forEach(function (s) {
        for (var n = -2; n <= 2; n++) { zebra.push([x + n * 0.5, 0.012, z + s * (ROAD / 2 + 0.75), 0]); zebra.push([x + s * (ROAD / 2 + 0.75), 0.012, z + n * 0.5, Math.PI / 2]); }
      });
    }); });
    inst(new THREE.BoxGeometry(0.12, 0.02, 1.0), M('#f1efe6', { roughness: 0.6 }), dashes);
    inst(new THREE.BoxGeometry(0.28, 0.02, 1.1), M('#f1efe6', { roughness: 0.6 }), zebra);
    for (var i = bounds[0]; i <= bounds[1]; i++) for (var j = bounds[2]; j <= bounds[3]; j++) {
      var px = i * P + LOT / 2 - 0.3, pz = j * P + LOT / 2 - 0.3;
      if ((i + j) % 2 === 0) { poles.push([px, 1.85, pz]); heads.push([px, 3.55, pz + 0.25]); }
      else { tl.push([px, 1.5, pz]); }
      if (hash(i, j * 2) < 0.4) hyd.push([i * P - LOT / 2 + 0.4, 0.42, j * P + LOT / 2 - 0.4]);
    }
    inst(new THREE.CylinderGeometry(0.06, 0.08, 3.4, 6), M('#4a4f58', { metalness: 0.5, roughness: 0.5 }), poles, true);
    inst(new THREE.BoxGeometry(0.25, 0.15, 0.6), lampMat, heads);
    inst(new THREE.CylinderGeometry(0.05, 0.06, 3.0, 6), M('#2e3238', { metalness: 0.5 }), tl, true);
    inst(new THREE.BoxGeometry(0.28, 0.75, 0.24), M('#1d2024'), tl.map(function (p) { return [p[0], 3.2, p[2]]; }));
    inst(new THREE.SphereGeometry(0.075, 8, 6), redL, tl.map(function (p) { return [p[0], 3.43, p[2] + 0.12]; }));
    inst(new THREE.SphereGeometry(0.075, 8, 6), amberL, tl.map(function (p) { return [p[0], 3.2, p[2] + 0.12]; }));
    inst(new THREE.SphereGeometry(0.075, 8, 6), greenL, tl.map(function (p) { return [p[0], 2.97, p[2] + 0.12]; }));
    inst(new THREE.CylinderGeometry(0.12, 0.14, 0.5, 10), M('#c2332c', { roughness: 0.5 }), hyd, true);
  }
  function buildLot(i, j) {
    var key = i + ',' + j; if (lots[key]) return lots[key];
    var g = new THREE.Group(); g.position.set(i * P, 0, j * P); lotGroup.add(g); lots[key] = g;
    var cs = M('#a9a59c'), gs = M('#5e8f45'), isVac = vacant(i, j);
    mesh(boxG(LOT, 0.3, LOT), [cs, cs, paveMat, cs, cs, cs], 0, 0.0, 0, g);
    mesh(boxG(LOT - 1.4, 0.34, LOT - 1.4), [gs, gs, isVac ? dirtMat : grassMat, gs, gs, gs], 0, 0.02, 0, g);
    g.userData.extra = new THREE.Group(); g.add(g.userData.extra);
    g.userData.h = 0;
    if (isVac) {
      // an empty plot: low fence, a sign and a couple of trees
      var fm = M('#d7d2c6');
      [[0, -2.2, 4.4, 0], [-2.2, 0, 4.4, Math.PI / 2], [2.2, 0, 4.4, Math.PI / 2]].forEach(function (f) { var m = mesh(boxG(f[2], 0.08, 0.06), fm, f[0], 0.6, f[1], g.userData.extra); m.rotation.y = f[3]; });
      for (var p = -2; p <= 2; p++) { mesh(boxG(0.08, 0.7, 0.08), fm, p * 1.1, 0.5, -2.2, g.userData.extra); mesh(boxG(0.08, 0.7, 0.08), fm, -2.2, 0.5, p * 1.1, g.userData.extra); mesh(boxG(0.08, 0.7, 0.08), fm, 2.2, 0.5, p * 1.1, g.userData.extra); }
      var sign = mesh(boxG(0.9, 0.55, 0.05), M('#f4f1e8'), 1.4, 1.1, 2.2, g.userData.extra); cyl(0.03, 0.03, 0.9, '#666', g.userData.extra, 1.4, 0.2, 2.18, 6);
      if (hash(i, j) < 0.6) tree(g.userData.extra, (hash(i + 1, j) - 0.5) * 2.6, (hash(i, j + 1) - 0.5) * 2.6, 0.8).position.y = 0.18;
    } else {
      var inner = new THREE.Group(); inner.position.y = 0.19; g.add(inner); inner.rotation.y = [0, Math.PI / 2, Math.PI, -Math.PI / 2][Math.floor(hash(j, i) * 4)];
      g.userData.h = filler(inner, i, j);
    }
    if (hash(i * 3, j) < 0.35) bench(g, -LOT / 2 + 0.45, (hash(j, i) - 0.5) * 3, Math.PI / 2);
    if (!inB(prevBounds, i, j)) { g.userData.rise = performance.now() + (Math.max(prevBounds[0] - i, i - prevBounds[1], prevBounds[2] - j, j - prevBounds[3]) - 1) * 250 + hash(j, i) * 300; g.position.y = -3; }
    return g;
  }
  var bMeshes = [];
  function placeBuilding(b, animate) {
    var lot = buildLot(b.i, b.j); lot.userData.extra.visible = false;
    var g = new THREE.Group(); g.position.set(b.i * P, 0.19, b.j * P);
    g.rotation.y = b.type === 'harbor' ? 0 : [0, Math.PI / 2, Math.PI, -Math.PI / 2][Math.floor(hash(b.i, b.j) * 4)];
    BUILD[b.type](g, b);
    bGroup.add(g); bMeshes.push({ b: b, g: g });
    if (animate) { g.userData.grow = performance.now(); g.scale.set(1, 0.01, 1); dust(b.i * P, b.j * P); }
  }
  function rebuildWorld() {
    [lotGroup, bGroup].forEach(function (G) { while (G.children.length) G.remove(G.children[0]); });
    lots = {}; bMeshes = []; anims = [];
    buildGround();
    for (var i = bounds[0]; i <= bounds[1]; i++) for (var j = bounds[2]; j <= bounds[3]; j++) buildLot(i, j);
    S.buildings.forEach(function (b) { if (inB(bounds, b.i, b.j)) placeBuilding(b, false); });
  }
  function expandTo(bd) {
    bd = [Math.min(bd[0], bounds[0]), Math.max(bd[1], bounds[1]), Math.min(bd[2], bounds[2]), Math.max(bd[3], bounds[3])];   // the island never shrinks
    if (bd[0] === bounds[0] && bd[1] === bounds[1] && bd[2] === bounds[2] && bd[3] === bounds[3]) return;
    prevBounds = bounds; bounds = bd; buildGround();
    for (var i = bounds[0]; i <= bounds[1]; i++) for (var j = bounds[2]; j <= bounds[3]; j++) buildLot(i, j);
  }
  function solidAt(i, j) { var b = bAt(i, j); if (b) return b.type === 'harbor' ? 0 : (HEIGHT[b.type] != null ? HEIGHT[b.type] : 5.2); var l = lots[i + ',' + j]; return l ? l.userData.h : 0; }

  /* ---------- people: jointed bodies with faces ---------- */
  var geoCache = {};
  function limbGeo(rt, rb, len) { // tapered, rounded limb hanging down from its joint
    var k = rt + ',' + rb + ',' + len; if (geoCache[k]) return geoCache[k];
    var pts = [], n = 5, a;
    for (a = 0; a <= n; a++) { var t1 = a / n * Math.PI / 2; pts.push(new THREE.Vector2(Math.sin(t1) * rb, -len + rb - Math.cos(t1) * rb)); }
    for (a = n; a >= 0; a--) { var t2 = a / n * Math.PI / 2; pts.push(new THREE.Vector2(Math.sin(t2) * rt, -rt + Math.cos(t2) * rt)); }
    return (geoCache[k] = new THREE.LatheGeometry(pts, 12));
  }
  function latheG(prof, key) { if (geoCache[key]) return geoCache[key]; return (geoCache[key] = new THREE.LatheGeometry(prof.map(function (p) { return new THREE.Vector2(p[0], p[1]); }), 16)); }
  var TORSO = latheG([[0, 0.68], [0.13, 0.69], [0.145, 0.76], [0.155, 0.86], [0.17, 0.95], [0.165, 1.01], [0.12, 1.06], [0.055, 1.085], [0, 1.09]], 'torso');
  var PELVIS = latheG([[0, 0.6], [0.11, 0.61], [0.145, 0.66], [0.14, 0.72], [0, 0.73]], 'pelvis');
  var faceCache = {};
  function faceMat(skin, hair, female) {
    var k = skin + hair + female; if (faceCache[k]) return faceCache[k];
    var tex = canvasTex(256, 128, function (g, W, H) {
      g.fillStyle = skin; g.fillRect(0, 0, W, H);
      var cx = W * 0.25, ey = H * 0.5;
      g.fillStyle = 'rgba(0,0,0,.06)'; g.beginPath(); g.ellipse(cx, ey + 16, 5, 9, 0, 0, Math.PI * 2); g.fill();         // nose shade
      g.fillStyle = 'rgba(220,120,110,.18)'; [-17, 17].forEach(function (dx) { g.beginPath(); g.ellipse(cx + dx, ey + 18, 7, 4, 0, 0, Math.PI * 2); g.fill(); });
      [-11, 11].forEach(function (dx) {
        g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(cx + dx, ey + 2, 6.2, 3.6, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#3b2a20'; g.beginPath(); g.arc(cx + dx, ey + 2, 3.1, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#0d0907'; g.beginPath(); g.arc(cx + dx, ey + 2, 1.5, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(cx + dx + 0.6, ey + 0.2, 1.3, 1.3);
        g.strokeStyle = hair; g.lineWidth = female ? 1.8 : 2.8; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx + dx - 6, ey - 5 + (dx < 0 ? 0.5 : 0)); g.quadraticCurveTo(cx + dx, ey - 8.5, cx + dx + 6, ey - 5); g.stroke();
        if (female) { g.strokeStyle = '#2a1b14'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(cx + dx - 6, ey + 0.5); g.quadraticCurveTo(cx + dx, ey - 3, cx + dx + 6.5, ey); g.stroke(); }
      });
      g.strokeStyle = female ? '#c0505a' : '#a9645a'; g.lineWidth = female ? 2.6 : 2; g.lineCap = 'round';
      g.beginPath(); g.moveTo(cx - 6, ey + 27); g.quadraticCurveTo(cx, ey + 31, cx + 6, ey + 27); g.stroke();
    });
    return (faceCache[k] = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.65 }));
  }
  function human(look) {
    var g = new THREE.Group(), body = new THREE.Group(), p = {};
    g.add(body);
    var skin = M(look.skin, { roughness: 0.6 }), top = M(look.top, { roughness: 0.85 }), bottom = M(look.bottom, { roughness: 0.9 }), shoeM = M(look.shoes, { roughness: 0.5 });
    function joint(parent, x, y, z) { var j = new THREE.Group(); j.position.set(x, y, z || 0); parent.add(j); return j; }
    // legs: hip -> knee -> foot
    [-1, 1].forEach(function (s) {
      var hip = joint(g, s * 0.085, 0.66), knee;
      mesh(limbGeo(0.075, 0.06, 0.32), bottom, 0, 0, 0, hip);
      knee = joint(hip, 0, -0.3);
      mesh(limbGeo(0.058, 0.045, 0.31), look.skirt ? skin : bottom, 0, 0, 0, knee);
      var shoe = mesh(new THREE.SphereGeometry(0.06, 12, 8), shoeM, 0, -0.3, 0.035, knee); shoe.scale.set(0.95, 0.65, 1.9);
      p[s < 0 ? 'hipL' : 'hipR'] = hip; p[s < 0 ? 'kneeL' : 'kneeR'] = knee;
    });
    mesh(PELVIS, bottom, 0, 0, 0, body).scale.z = 0.72;
    var torso = mesh(TORSO, top, 0, 0, 0, body); torso.scale.z = 0.66;
    mesh(new THREE.TorusGeometry(0.145, 0.018, 6, 20), M('#2b2b2b'), 0, 0.715, 0, body).rotation.x = Math.PI / 2;     // belt
    if (look.shirt) { var col = mesh(new THREE.ConeGeometry(0.07, 0.16, 3), M(look.shirt), 0, 0.99, 0.085, body); col.rotation.x = Math.PI; mesh(boxG(0.035, 0.2, 0.02), M(look.tie || '#a8322e'), 0, 0.88, 0.108, body); }
    if (look.coat) { var coat = mesh(new THREE.CylinderGeometry(0.17, 0.22, 0.42, 14, 1, true), M(look.top, { side: THREE.DoubleSide }), 0, 0.5, 0, body); coat.scale.z = 0.75; }
    if (look.skirt) { var sk = mesh(new THREE.CylinderGeometry(0.15, 0.23, 0.32, 14, 1, true), M(look.bottom, { side: THREE.DoubleSide }), 0, 0.5, 0, body); sk.scale.z = 0.8; }
    if (look.hood) mesh(new THREE.TorusGeometry(0.1, 0.045, 8, 16), top, 0, 1.06, -0.05, body).rotation.x = Math.PI / 2.3;
    // arms: shoulder -> elbow -> hand
    [-1, 1].forEach(function (s) {
      var sh = joint(body, s * 0.2, 1.02), el;
      sh.rotation.z = s * 0.08;
      mesh(new THREE.SphereGeometry(0.06, 10, 8), top, 0, 0, 0, sh);
      mesh(limbGeo(0.055, 0.045, 0.27), top, 0, 0, 0, sh);
      el = joint(sh, 0, -0.26);
      mesh(limbGeo(0.045, 0.036, 0.24), look.short ? skin : top, 0, 0, 0, el);
      var hand = mesh(new THREE.SphereGeometry(0.042, 10, 8), skin, 0, -0.26, 0, el); hand.scale.set(0.8, 1.15, 0.6);
      p[s < 0 ? 'shL' : 'shR'] = sh; p[s < 0 ? 'elL' : 'elR'] = el;
    });
    // head
    mesh(new THREE.CylinderGeometry(0.045, 0.052, 0.09, 10), skin, 0, 1.1, 0, body);
    var head = new THREE.Group(); head.position.y = 1.23; body.add(head); p.head = head;
    var skull = mesh(new THREE.SphereGeometry(0.11, 24, 18), faceMat(look.skin, look.hair, !!look.longHair || !!look.bun), 0, 0, 0, head); skull.scale.set(0.95, 1.12, 1.02);
    mesh(new THREE.SphereGeometry(0.02, 8, 6), skin, 0, -0.01, 0.112, head).scale.set(1, 1.2, 1.1);                     // nose
    [-1, 1].forEach(function (s) { mesh(new THREE.SphereGeometry(0.022, 8, 6), skin, s * 0.104, 0, -0.005, head).scale.set(0.5, 1, 0.8); }); // ears
    var hairM = M(look.hair, { roughness: 0.75 });
    if (!look.helmet) {
      mesh(new THREE.SphereGeometry(0.118, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.42), hairM, 0, 0.012, -0.004, head).scale.set(0.98, 1.14, 1.05);
      mesh(new THREE.SphereGeometry(0.117, 20, 12, Math.PI * 0.85, Math.PI * 1.3, 0, Math.PI * 0.66), hairM, 0, 0.008, -0.006, head).scale.set(0.98, 1.12, 1.04);
      if (look.longHair) { var lh = mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.3, 14, 1, true, Math.PI * 0.25, Math.PI * 1.5), M(look.hair, { roughness: 0.75, side: THREE.DoubleSide }), 0, -0.12, -0.01, head); }
      if (look.bun) mesh(new THREE.SphereGeometry(0.055, 12, 8), hairM, 0, 0.07, -0.11, head);
      if (look.grey) mesh(new THREE.SphereGeometry(0.119, 20, 12, Math.PI * 0.85, Math.PI * 1.3, Math.PI * 0.3, Math.PI * 0.2), M('#cfcfcf'), 0, 0.008, -0.006, head).scale.set(0.98, 1.12, 1.04);
    }
    if (look.cap) { mesh(new THREE.SphereGeometry(0.122, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), M(look.cap), 0, 0.03, 0, head); mesh(boxG(0.17, 0.015, 0.12), M(look.cap), 0, 0.03, 0.13, head); }
    if (look.glasses) {
      var gm = M('#151515', { roughness: 0.3 });
      [-0.04, 0.04].forEach(function (x) { mesh(new THREE.TorusGeometry(0.026, 0.005, 6, 16), gm, x, 0.008, 0.106, head, true); });
      mesh(boxG(0.025, 0.004, 0.004), gm, 0, 0.012, 0.108, head, true);
    }
    if (look.helmet) {
      mesh(new THREE.SphereGeometry(0.17, 20, 14), M('#f4f6f8', { roughness: 0.3 }), 0, 0.01, 0, head);
      mesh(new THREE.SphereGeometry(0.14, 18, 10, -Math.PI / 2.4, Math.PI / 1.2, Math.PI / 3, Math.PI / 3), M('#c9a35b', { metalness: 0.85, roughness: 0.12 }), 0, 0.01, 0.06, head);
      mesh(boxG(0.24, 0.3, 0.12), M('#d9dde2'), 0, 0.84, -0.15, body);
    }
    g.userData.p = p; g.userData.body = body; g.userData.phase = Math.random() * 6; g.userData.breath = Math.random() * 6;
    return g;
  }
  function animateHuman(h, speed, dt) {
    var p = h.userData.p, moving = speed > 0.05, k = Math.min(1, dt * 14);
    if (moving) h.userData.phase += dt * (4 + speed * 2.2);
    h.userData.breath += dt;
    var ph = h.userData.phase, amp = moving ? Math.min(0.75, 0.35 + speed * 0.1) : 0;
    function to(o, axis, v) { o.rotation[axis] += (v - o.rotation[axis]) * k; }
    to(p.hipL, 'x', Math.sin(ph) * amp); to(p.hipR, 'x', -Math.sin(ph) * amp);
    to(p.kneeL, 'x', moving ? Math.max(0, -Math.sin(ph - 0.9)) * amp * 1.4 : 0); to(p.kneeR, 'x', moving ? Math.max(0, Math.sin(ph - 0.9)) * amp * 1.4 : 0);
    to(p.shL, 'x', -Math.sin(ph) * amp * 0.8); to(p.shR, 'x', Math.sin(ph) * amp * 0.8);
    to(p.elL, 'x', -0.25 - (moving ? Math.max(0, Math.sin(ph)) * amp * 0.6 : 0)); to(p.elR, 'x', -0.25 - (moving ? Math.max(0, -Math.sin(ph)) * amp * 0.6 : 0));
    var b = h.userData.body;
    b.position.y = moving ? Math.abs(Math.cos(ph)) * 0.035 : Math.sin(h.userData.breath * 2) * 0.004;
    b.rotation.x = moving ? Math.min(0.12, speed * 0.018) : 0;
    b.rotation.y = moving ? Math.sin(ph) * 0.06 : 0;
  }

  var player = null, playerVel = 0, npcs = [], cars = [], talkers = [];
  var NPC_LOOKS = [
    { skin: '#f1c7a0', hair: '#222', top: '#3c6fa8', bottom: '#2a2d36', shoes: '#222' },
    { skin: '#e3b088', hair: '#5a3a22', top: '#e9c46a', bottom: '#264653', shoes: '#eee', longHair: true },
    { skin: '#c68e63', hair: '#111', top: '#f4a261', bottom: '#3a3a3a', shoes: '#111', cap: '#264653', short: true },
    { skin: '#f4d0b0', hair: '#9a6a3a', top: '#7a5ad8', bottom: '#333', shoes: '#ddd', skirt: true, longHair: true },
    { skin: '#8d5a3b', hair: '#111', top: '#2a9d8f', bottom: '#1d3557', shoes: '#fff', short: true },
    { skin: '#f1c7a0', hair: '#555', top: '#8d6a28', bottom: '#5b5b5b', shoes: '#333', grey: true },
    { skin: '#e9b98f', hair: '#2b1b14', top: '#e76f51', bottom: '#264653', shoes: '#fff', hood: true },
    { skin: '#f3d2b5', hair: '#1a1a1a', top: '#ffffff', bottom: '#1f2a44', shoes: '#111', shirt: '#ffffff', tie: '#1f3d63' },
    { skin: '#dcae88', hair: '#3a2416', top: '#9b2c3a', bottom: '#2a2a33', shoes: '#2a1a1a', bun: true, skirt: true },
    { skin: '#f0c8a8', hair: '#6b4a2e', top: '#58a4b0', bottom: '#3b3b3b', shoes: '#eee', short: true }
  ];
  var ROLE_LOOKS = {
    mum: { skin: '#f1cba9', hair: '#2a1b14', top: '#c45b6b', bottom: '#3b3f5c', shoes: '#4a2a2a', longHair: true, skirt: true },
    dad: { skin: '#e8bd98', hair: '#2b2b2b', top: '#5b6f86', bottom: '#2e2e2e', shoes: '#222', shirt: '#ffffff', glasses: true, grey: true },
    kid: { skin: '#f3cfae', hair: '#1a1a1a', top: '#ffffff', bottom: '#5a6475', shoes: '#111', short: true, kid: true },
    suitold: { skin: '#e9c09c', hair: '#888', top: '#3a3d44', bottom: '#2a2c31', shoes: '#111', shirt: '#ffffff', grey: true },
    woman: { skin: '#f2cdb0', hair: '#2b1a12', top: '#1f3557', bottom: '#2a2d36', shoes: '#111', bun: true },
    lab: { skin: '#f3cdaa', hair: '#2b211c', top: '#f5f6f8', bottom: '#3d5a80', shoes: '#4a4a4a', coat: true, glasses: true }
  };
  // pedestrians walk the sidewalks: points just off each lot's corners
  function corner(c) { return new THREE.Vector3(c.i * P + c.cx * (LOT / 2 - 0.4), 0.19, c.j * P + c.cz * (LOT / 2 - 0.4)); }
  function randomCorner() { return { i: bounds[0] + Math.floor(Math.random() * (bounds[1] - bounds[0] + 1)), j: bounds[2] + Math.floor(Math.random() * (bounds[3] - bounds[2] + 1)), cx: Math.random() < 0.5 ? -1 : 1, cz: Math.random() < 0.5 ? -1 : 1 }; }
  function nextCorner(c) { var n = { i: c.i, j: c.j, cx: c.cx, cz: c.cz }; if (Math.random() < 0.5) n.cx = -n.cx; else n.cz = -n.cz; return n; }
  function syncNpcs() {
    var lotsN = (bounds[1] - bounds[0] + 1) * (bounds[3] - bounds[2] + 1), want = Math.min(TOUCH ? 22 : 34, 6 + Math.round(lotsN * 0.35));
    while (npcs.length < want) {
      var h = human(NPC_LOOKS[npcs.length % NPC_LOOKS.length]), c = randomCorner();
      h.position.copy(corner(c)); h.scale.setScalar(0.94 + Math.random() * 0.12); scene.add(h);
      npcs.push({ h: h, c: c, to: nextCorner(c), sp: 1.0 + Math.random() * 0.6, wait: 0 });
    }
  }
  var CAR_COLS = ['#d6453d', '#f2f2f2', '#1f3d63', '#e9c46a', '#2a9d8f', '#222831', '#c9a35b', '#8a8f98'];
  function makeCar(col, taxi) {
    var g = new THREE.Group();
    mesh(boxG(1.7, 0.55, 3.6), M(col, { metalness: 0.5, roughness: 0.35 }), 0, 0.55, 0, g);
    var cab = mesh(boxG(1.5, 0.5, 1.9), M('#1e2b38', { metalness: 0.6, roughness: 0.15 }), 0, 1.05, -0.2, g);
    if (taxi) mesh(boxG(0.5, 0.15, 0.25), glowMat('#ffe9a8', 0.4), 0, 1.38, -0.2, g, true);
    var wg = new THREE.CylinderGeometry(0.33, 0.33, 0.25, 14);
    [[-0.85, 1.15], [0.85, 1.15], [-0.85, -1.15], [0.85, -1.15]].forEach(function (w) { mesh(wg, M('#151515'), w[0], 0.33, w[1], g).rotation.z = Math.PI / 2; });
    var hl = glowMat('#fff2b0', 0.3); nightMats.push(hl);
    [-0.55, 0.55].forEach(function (x) { mesh(boxG(0.3, 0.15, 0.05), hl, x, 0.62, 1.81, g, true); mesh(boxG(0.3, 0.15, 0.05), glowMat('#ff3030', 0.6), x, 0.62, -1.81, g, true); });
    return g;
  }
  function resetCar(c, anywhere) {
    var I = island(bounds);
    if (c.axis === 0) { c.line = bounds[0] - 1 + Math.floor(Math.random() * (bounds[1] - bounds[0] + 2)); c.min = I.z0; c.max = I.z1; }
    else { c.line = bounds[2] - 1 + Math.floor(Math.random() * (bounds[3] - bounds[2] + 2)); c.min = I.x0; c.max = I.x1; }
    c.dir = Math.random() < 0.5 ? 1 : -1;
    c.pos = anywhere ? c.min + Math.random() * (c.max - c.min) : (c.dir > 0 ? c.min : c.max);
  }
  function syncCars() {
    var want = Math.min(TOUCH ? 9 : 14, 3 + Math.round((bounds[1] - bounds[0] + 1) * 1.1));
    while (cars.length < want) { var c = { g: makeCar(CAR_COLS[cars.length % CAR_COLS.length], cars.length % 4 === 1 && false || cars.length % 5 === 2), axis: cars.length % 2, sp: 6 + Math.random() * 3 }; if (cars.length % 5 === 2) c.g.children[0].material = M('#d0312d', { metalness: 0.5, roughness: 0.35 }); scene.add(c.g); resetCar(c, true); cars.push(c); }
  }

  // story characters standing in the city for the current chapter
  var bubbleTex = canvasTex(64, 64, function (g) { g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(32, 28, 26, 20, 0, 0, Math.PI * 2); g.fill(); g.beginPath(); g.moveTo(20, 42); g.lineTo(14, 58); g.lineTo(32, 46); g.fill(); g.fillStyle = '#c9a35b'; [20, 32, 44].forEach(function (x) { g.beginPath(); g.arc(x, 28, 4, 0, Math.PI * 2); g.fill(); }); });
  function syncTalkers() {
    talkers.forEach(function (t) { scene.remove(t.h); }); talkers = [];
    var list = S.free ? [D.TALKERS[0][0], D.TALKERS[1][0]] : (D.TALKERS[S.ch] || []);
    list.forEach(function (d, n) {
      var at = null; S.buildings.forEach(function (b) { if (b.type === d.at) at = b; }); if (!at) at = S.buildings[0];
      var look = ROLE_LOOKS[d.look] || NPC_LOOKS[0], h = human(look);
      if (look.kid) h.scale.setScalar(0.78);
      var side = n % 2 ? -1 : 1;
      h.position.set(at.i * P + side * (1.1 + Math.floor(n / 2) * 0.8), 0.19, at.j * P + LOT / 2 + 0.45);
      h.rotation.y = 0; scene.add(h);
      var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: bubbleTex, depthTest: false })); sp.scale.set(0.5, 0.5, 0.5); sp.position.set(0, 1.75, 0); h.add(sp);
      talkers.push({ h: h, d: d, sp: sp });
    });
  }
  function clearPeople() { npcs.forEach(function (o) { scene.remove(o.h); }); cars.forEach(function (c) { scene.remove(c.g); }); talkers.forEach(function (t) { scene.remove(t.h); }); npcs = []; cars = []; talkers = []; }

  /* ---------- particles ---------- */
  var puffs = [], dustGeo = new THREE.SphereGeometry(0.4, 8, 6);
  function dust(x, z) {
    for (var k = 0; k < 16; k++) {
      var m = new THREE.Mesh(dustGeo, new THREE.MeshStandardMaterial({ color: '#e8dcc0', transparent: true, opacity: 0.8 }));
      m.position.set(x + (Math.random() - 0.5) * 5, 0.5, z + (Math.random() - 0.5) * 5); scene.add(m);
      puffs.push({ m: m, v: new THREE.Vector3((Math.random() - 0.5) * 2, 1 + Math.random() * 1.5, (Math.random() - 0.5) * 2), life: 1 });
    }
  }

  /* ---------- glowing plots while choosing where to build ---------- */
  var plotMat = new THREE.MeshBasicMaterial({ color: '#ffd77a', transparent: true, opacity: 0.45, depthWrite: false });
  var beamMat = new THREE.MeshBasicMaterial({ color: '#ffe3a0', transparent: true, opacity: 0.35, depthWrite: false });
  var plotMeshes = [];
  function showPlots(on) {
    plotMeshes.forEach(function (m) { scene.remove(m); }); plotMeshes = [];
    if (!on) return;
    freeLots().forEach(function (t) {
      var m = new THREE.Mesh(new THREE.BoxGeometry(LOT - 1.2, 0.05, LOT - 1.2), plotMat); m.position.set(t[0] * P, 0.23, t[1] * P); scene.add(m);
      var b = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 14, 12, 1, true), beamMat); b.position.set(t[0] * P, 7, t[1] * P); scene.add(b);
      plotMeshes.push(m, b);
    });
  }
  function ensureLots(n) { // always keep a few empty plots: grow the island if needed
    var guard = 0;
    while (freeLots().length < n && guard++ < 6) {
      var b = bounds.slice(), turn = (b[1] - b[0] + b[3] - b[2]) % 4;
      if (turn === 0) b[1]++; else if (turn === 1) b[3]++; else if (turn === 2) b[0]--; else b[2]--;
      expandTo(b);
    }
  }

  /* ---------- camera ---------- */
  var camYaw = 0.6, camDist = 6.5, camPitch = 0.36, mode = 'orbit', overviewUntil = 0, lastLook = 0;
  var camPos = new THREE.Vector3(40, 40, 40), camLook = new THREE.Vector3(), tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();
  function overviewTarget(out, look, t) {
    var I = island(bounds), cx = (I.x0 + I.x1) / 2, cz = (I.z0 + I.z1) / 2, size = Math.max(I.x1 - I.x0, I.z1 - I.z0);
    var a = mode === 'orbit' ? t * 0.05 + 0.6 : camYaw, dist = size * (camera.aspect < 1 ? 1.3 : 0.8) + 12;
    out.set(cx + Math.sin(a) * dist * 0.75, dist * 0.6, cz + Math.cos(a) * dist * 0.75); look.set(cx, 0, cz);
  }
  function insideSolid(v, pad) {
    var i = Math.round(v.x / P), j = Math.round(v.z / P);
    for (var di = -1; di <= 1; di++) for (var dj = -1; dj <= 1; dj++) {
      var ii = i + di, jj = j + dj; if (!inB(bounds, ii, jj)) continue;
      var h = solidAt(ii, jj); if (!h) continue;
      if (v.y < h + pad && Math.abs(v.x - ii * P) < 2.7 + pad && Math.abs(v.z - jj * P) < 2.7 + pad) return true;
    }
    return false;
  }
  function updateCamera(t, dt) {
    var k = 1 - Math.pow(0.002, dt), ov = mode === 'orbit' || mode === 'map' || performance.now() < overviewUntil || !player;
    if (ov) overviewTarget(tmpA, tmpB, t);
    else {
      var pp = player.position, d = camDist; tmpB.set(pp.x, pp.y + 1.25, pp.z);
      for (; d > 1.6; d -= 0.25) {
        tmpA.set(pp.x + Math.sin(camYaw) * Math.cos(camPitch) * d, pp.y + 1.25 + Math.sin(camPitch) * d, pp.z + Math.cos(camYaw) * Math.cos(camPitch) * d);
        if (!insideSolid(tmpA, 0.5)) break;
      }
    }
    camPos.lerp(tmpA, Math.min(1, ov ? k * 0.7 : k * 2.2)); camLook.lerp(tmpB, Math.min(1, ov ? k * 0.7 : k * 3));
    camera.position.copy(camPos); camera.lookAt(camLook);
    sun.position.set(camLook.x + 30, 45, camLook.z + 18); sun.target.position.copy(camLook);
    var span = ov ? 60 : 24; if (sc.right !== span) { sc.left = -span; sc.right = span; sc.top = span; sc.bottom = -span; sc.updateProjectionMatrix(); }
  }

  /* ---------- input ---------- */
  var keys = {}, joyV = { x: 0, y: 0 }, walkTo = null, jd = null, drag = null, pinch = {};
  addEventListener('keydown', function (e) {
    var k = e.key.toLowerCase();
    if (/^(w|a|s|d|arrowup|arrowdown|arrowleft|arrowright|shift)$/.test(k) && canWalk()) { keys[k] = true; walkTo = null; if (k.indexOf('arrow') === 0) e.preventDefault(); }
  });
  addEventListener('keyup', function (e) { keys[e.key.toLowerCase()] = false; });
  addEventListener('blur', function () { keys = {}; });
  joy.addEventListener('pointerdown', function (e) { jd = { id: e.pointerId, r: joy.getBoundingClientRect() }; joy.setPointerCapture(e.pointerId); moveJoy(e); walkTo = null; });
  joy.addEventListener('pointermove', function (e) { if (jd && e.pointerId === jd.id) moveJoy(e); });
  function endJoy() { jd = null; joyV.x = joyV.y = 0; knob.style.transform = ''; }
  joy.addEventListener('pointerup', endJoy); joy.addEventListener('pointercancel', endJoy);
  function moveJoy(e) {
    var r = jd.r, dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2), m = r.width / 2 - 16, l = Math.hypot(dx, dy);
    if (l > m) { dx = dx / l * m; dy = dy / l * m; }
    knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; joyV.x = dx / m; joyV.y = -dy / m;
  }
  canvas.addEventListener('pointerdown', function (e) {
    pinch[e.pointerId] = { x: e.clientX, y: e.clientY };
    if (!drag) drag = { x: e.clientX, y: e.clientY, yaw: camYaw, pitch: camPitch, moved: false, id: e.pointerId, d0: 0, dist: camDist };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', function (e) {
    if (pinch[e.pointerId]) pinch[e.pointerId] = { x: e.clientX, y: e.clientY };
    var ids = Object.keys(pinch);
    if (ids.length === 2 && drag) {
      var a = pinch[ids[0]], b = pinch[ids[1]], d = Math.hypot(a.x - b.x, a.y - b.y);
      if (!drag.d0) { drag.d0 = d; drag.dist = camDist; } camDist = Math.max(3, Math.min(22, drag.dist * drag.d0 / d)); drag.moved = true; return;
    }
    if (!drag || e.pointerId !== drag.id) return;
    var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 8) drag.moved = true;
    if (drag.moved) { camYaw = drag.yaw - dx * 0.009; camPitch = Math.max(0.08, Math.min(1.25, drag.pitch + dy * 0.005)); lastLook = performance.now(); }
  });
  function pUp(e) { delete pinch[e.pointerId]; var d = drag; if (!d || e.pointerId !== d.id) return; drag = null; if (!d.moved) tap(e.clientX, e.clientY); }
  canvas.addEventListener('pointerup', pUp);
  canvas.addEventListener('pointercancel', function (e) { delete pinch[e.pointerId]; drag = null; });
  canvas.addEventListener('wheel', function (e) { e.preventDefault(); camDist = Math.max(3, Math.min(22, camDist * (e.deltaY > 0 ? 1.1 : 0.9))); }, { passive: false });
  var ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.17);
  function tap(cx, cy) {
    if (!player || !canWalk()) return;
    var r = canvas.getBoundingClientRect(); ndc.set((cx - r.left) / r.width * 2 - 1, -(cy - r.top) / r.height * 2 + 1);
    ray.setFromCamera(ndc, camera);
    var hit = new THREE.Vector3(); if (!ray.ray.intersectPlane(ground, hit)) return;
    var lot = lotOf(hit.x, hit.z);
    if (placing && lot && vacant(lot.i, lot.j) && !bAt(lot.i, lot.j)) { build(lot.i, lot.j); return; }
    walkTo = hit; if (mode === 'map') setMode('follow');
  }
  viewBtn.addEventListener('click', function () { setMode(mode === 'map' ? 'follow' : 'map'); });
  function setMode(m) { if (m !== 'orbit' || !player) mode = m; viewBtn.textContent = mode === 'map' ? '🚶 ' + T(D.UI.follow) : '🗺️ ' + T(D.UI.view); }

  /* ---------- player movement ---------- */
  function blocked(x, z) {
    var I = island(bounds);
    if (x < I.x0 + 0.4 || x > I.x1 - 0.4 || z < I.z0 + 0.4 || z > I.z1 - 0.4) return true;
    var i = Math.round(x / P), j = Math.round(z / P);
    if (!inB(bounds, i, j) || !solidAt(i, j)) return false;
    var b = bAt(i, j), half = b && (b.type === 'rocket' || b.type === 'dome' || b.type === 'stadium') ? 2.95 : 2.6;
    return Math.abs(x - i * P) < half && Math.abs(z - j * P) < half;
  }
  function canWalk() { return S.step !== 'title' && S.step !== 'pick'; }
  function movePlayer(dt) {
    if (!player) return;
    var ix = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0) + joyV.x;
    var iy = (keys.w || keys.arrowup ? 1 : 0) - (keys.s || keys.arrowdown ? 1 : 0) + joyV.y;
    var mx = 0, mz = 0, run = keys.shift || Math.hypot(joyV.x, joyV.y) > 0.92;
    if (!canWalk()) ix = iy = 0;
    if (Math.abs(ix) + Math.abs(iy) > 0.05) {
      var fx = -Math.sin(camYaw), fz = -Math.cos(camYaw), rx = Math.cos(camYaw), rz = -Math.sin(camYaw);
      mx = fx * iy + rx * ix; mz = fz * iy + rz * ix;
    } else if (walkTo) {
      var dx = walkTo.x - player.position.x, dz = walkTo.z - player.position.z, dd = Math.hypot(dx, dz);
      if (dd < 0.3) walkTo = null; else { mx = dx; mz = dz; run = dd > 6; }
    }
    var ml = Math.hypot(mx, mz), sp = ml > 0.01 ? Math.min(1, ml) * (run ? 6.0 : 3.0) : 0;
    playerVel += (sp - playerVel) * Math.min(1, dt * 10);
    if (ml > 0.01 && playerVel > 0.02) {
      var nx = player.position.x + mx / ml * playerVel * dt, nz = player.position.z + mz / ml * playerVel * dt;
      if (!blocked(nx, nz)) { player.position.x = nx; player.position.z = nz; }
      else if (!blocked(nx, player.position.z)) player.position.x = nx;
      else if (!blocked(player.position.x, nz)) player.position.z = nz;
      else walkTo = null;
      var want = Math.atan2(mx, mz), cur = player.rotation.y, diff = Math.atan2(Math.sin(want - cur), Math.cos(want - cur));
      player.rotation.y = cur + diff * Math.min(1, dt * 12);
      if (performance.now() - lastLook > 1800) {
        var behind = player.rotation.y + Math.PI, cd = Math.atan2(Math.sin(behind - camYaw), Math.cos(behind - camYaw));
        if (Math.abs(cd) < 2.2) camYaw += cd * Math.min(1, dt * 1.1);
      }
    }
    player.position.y = lotOf(player.position.x, player.position.z) ? 0.19 : 0.01;
    animateHuman(player, playerVel, dt);
  }

  /* ---------- per-frame ---------- */
  var placing = null, last = performance.now(), nearB = null, nearT = null, standLot = null, frameNo = 0;
  function nightness() { if (S.step === 'title' || S.step === 'end' || S.step === 'pick') return 1; var t = performance.now() / 1000; return Math.max(0, Math.min(1, Math.sin(t / 50) * 1.4 - 0.4)); }
  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000); last = now; var t = now / 1000; frameNo++;
    lotGroup.children.forEach(function (g) { if (g.userData.rise) { var u = Math.max(0, Math.min(1, (now - g.userData.rise) / 700)); g.position.y = -3 * (1 - u) * (1 - u); if (u >= 1) delete g.userData.rise; } });
    bMeshes.forEach(function (o) { if (o.g.userData.grow) { var u = Math.min(1, (now - o.g.userData.grow) / 800), e = 1 - Math.pow(1 - u, 3) + Math.sin(u * Math.PI) * 0.12; o.g.scale.set(1, Math.max(0.01, e), 1); if (u >= 1) delete o.g.userData.grow; } });
    anims.forEach(function (f) { f(t); });
    for (var k = 0; k < seaPos.count; k++) { var x = seaPos.getX(k), y = seaPos.getY(k); seaPos.setZ(k, Math.sin(x * 0.15 + t * 1.1) * 0.12 + Math.cos(y * 0.18 + t * 0.9) * 0.12); }
    seaPos.needsUpdate = true; if (frameNo % 4 === 0) sea.geometry.computeVertexNormals();
    var n = nightness();
    scene.background.copy(DAY_SKY).lerp(NIGHT_SKY, n); scene.fog.color.copy(scene.background);
    skyMat.color.setScalar(1 - n * 0.85);
    sun.intensity = 1.6 * (1 - n * 0.75); hemi.intensity = 0.75 - n * 0.4;
    nightMats.forEach(function (m) { m.emissiveIntensity = 0.1 + n * 1.3; });
    var cyc = (t % 12); redL.emissiveIntensity = cyc < 5 ? 1.2 : 0.08; amberL.emissiveIntensity = cyc >= 5 && cyc < 6.5 ? 1.2 : 0.08; greenL.emissiveIntensity = cyc >= 6.5 ? 1.2 : 0.08;
    plotMat.opacity = 0.3 + Math.sin(t * 4) * 0.18; beamMat.opacity = 0.2 + Math.sin(t * 4) * 0.1;
    movePlayer(dt);
    npcs.forEach(function (o) {
      if (o.wait > 0) { o.wait -= dt; animateHuman(o.h, 0, dt); return; }
      if (!inB(bounds, o.to.i, o.to.j)) o.to = randomCorner();
      var target = corner(o.to), dx = target.x - o.h.position.x, dz = target.z - o.h.position.z, d = Math.hypot(dx, dz);
      if (d < 0.2) { o.c = o.to; o.to = Math.random() < 0.12 ? randomCorner() : nextCorner(o.c); if (Math.random() < 0.25) o.wait = 1 + Math.random() * 2.5; return; }
      var step = Math.min(d, o.sp * dt); o.h.position.x += dx / d * step; o.h.position.z += dz / d * step; o.h.position.y = 0.19;
      var want = Math.atan2(dx, dz), diff = Math.atan2(Math.sin(want - o.h.rotation.y), Math.cos(want - o.h.rotation.y)); o.h.rotation.y += diff * Math.min(1, dt * 8);
      animateHuman(o.h, o.sp, dt);
    });
    talkers.forEach(function (tk) {
      animateHuman(tk.h, 0, dt); tk.sp.position.y = 1.75 + Math.sin(t * 3) * 0.05;
      if (player) { var want = Math.atan2(player.position.x - tk.h.position.x, player.position.z - tk.h.position.z), diff = Math.atan2(Math.sin(want - tk.h.rotation.y), Math.cos(want - tk.h.rotation.y)); if (tk.h.position.distanceTo(player.position) < 6) tk.h.rotation.y += diff * Math.min(1, dt * 4); }
    });
    cars.forEach(function (c) {
      var lane = (c.line + 0.5) * P + c.dir * 0.75 * (c.axis === 0 ? -1 : 1), x = c.axis === 0 ? lane : c.pos, z = c.axis === 0 ? c.pos : lane, stop = false;
      if (player) { var ax = c.axis === 0 ? 0 : c.dir, az = c.axis === 0 ? c.dir : 0, px = player.position.x - x, pz = player.position.z - z, ahead = px * ax + pz * az, side = Math.abs(px * az - pz * ax); stop = ahead > 0 && ahead < 5 && side < 1.5; }
      if (!stop) c.pos += c.dir * c.sp * dt;
      if (c.pos > c.max + 2 || c.pos < c.min - 2) resetCar(c, false);
      c.g.position.set(c.axis === 0 ? lane : c.pos, 0, c.axis === 0 ? c.pos : lane);
      c.g.rotation.y = c.axis === 0 ? (c.dir > 0 ? 0 : Math.PI) : (c.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    });
    puffs = puffs.filter(function (p) { p.life -= dt * 0.8; p.m.position.addScaledVector(p.v, dt); p.m.scale.setScalar(1 + (1 - p.life) * 2); p.m.material.opacity = Math.max(0, p.life * 0.8); if (p.life <= 0) { scene.remove(p.m); p.m.material.dispose(); return false; } return true; });
    updateCamera(t, dt);
    renderer.render(scene, camera);
    proximity();
    drawMini(t);
    requestAnimationFrame(frame);
  }

  /* ---------- who and what is nearby ---------- */
  var proj = new THREE.Vector3();
  function place(el, x3, y3, z3, minTop) {
    proj.set(x3, y3, z3).project(camera);
    if (proj.z > 1) { el.hidden = true; return; }
    var r = canvas.getBoundingClientRect(), x = (proj.x + 1) / 2 * r.width, y = (1 - proj.y) / 2 * r.height;
    el.hidden = false;
    el.style.left = Math.max(8, Math.min(r.width - el.offsetWidth - 8, x - el.offsetWidth / 2)) + 'px';
    el.style.top = Math.max(minTop, Math.min(r.height - el.offsetHeight - 120, y - el.offsetHeight)) + 'px';
  }
  function proximity() {
    if (!player || !canWalk() || mode === 'map') { tip.hidden = true; talk.hidden = true; nearB = nearT = null; return; }
    var lot = lotOf(player.position.x, player.position.z), key = lot && vacant(lot.i, lot.j) && !bAt(lot.i, lot.j) ? lot.i + ',' + lot.j : null;
    if (placing && key !== standLot) { standLot = key; render(); }
    // a story character within talking distance
    var bt = null, bdt = 3.4;
    talkers.forEach(function (tk) { var d = tk.h.position.distanceTo(player.position); if (d < bdt) { bdt = d; bt = tk; } });
    if (bt !== nearT) { nearT = bt; if (bt) talk.innerHTML = '<b>' + esc(T(bt.d.who)) + '</b><span>' + esc(T(bt.d.line)) + '</span>'; }
    if (bt) place(talk, bt.h.position.x, 2.0, bt.h.position.z, TOUCH ? 128 : 60); else talk.hidden = true;
    var best = null, bd = 6.5;
    if (!bt) S.buildings.forEach(function (b) { var d = Math.hypot(player.position.x - b.i * P, player.position.z - b.j * P); if (d < bd) { bd = d; best = b; } });
    if (best !== nearB) { nearB = best; if (best) { var info = D.BUILD[best.type]; tip.innerHTML = '<b>' + esc(T(info.name)) + '</b><span>' + esc(T(info.note)) + '</span>'; } }
    if (best) place(tip, best.i * P, 5.5, best.j * P, TOUCH ? 128 : 60); else tip.hidden = true;
  }

  /* ---------- minimap (north up, centred on the player) ---------- */
  function drawMini(t) {
    var w = mini.width, h = mini.height; mctx.clearRect(0, 0, w, h);
    if (!canWalk()) return;
    var s = w / 64, cx = player ? player.position.x : 0, cz = player ? player.position.z : 0;
    function X(x) { return w / 2 + (x - cx) * s; } function Z(z) { return h / 2 + (z - cz) * s; }
    mctx.save(); mctx.beginPath(); mctx.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2); mctx.clip();
    mctx.fillStyle = '#2b6f96'; mctx.fillRect(0, 0, w, h);
    var J = island(bounds); mctx.fillStyle = '#4b4f57'; mctx.fillRect(X(J.x0), Z(J.z0), (J.x1 - J.x0) * s, (J.z1 - J.z0) * s);
    for (var i = bounds[0]; i <= bounds[1]; i++) for (var j = bounds[2]; j <= bounds[3]; j++) {
      var b = bAt(i, j), v = vacant(i, j);
      mctx.fillStyle = b ? '#e2c88f' : v ? (placing ? 'rgba(255,215,120,' + (0.5 + Math.sin(t * 5) * 0.35) + ')' : '#7aa860') : '#a7a39a';
      mctx.fillRect(X(i * P - LOT / 2), Z(j * P - LOT / 2), LOT * s, LOT * s);
    }
    mctx.fillStyle = 'rgba(255,255,255,.85)'; npcs.forEach(function (o) { mctx.fillRect(X(o.h.position.x) - 1, Z(o.h.position.z) - 1, 2, 2); });
    mctx.fillStyle = '#4fc3ff'; talkers.forEach(function (tk) { mctx.beginPath(); mctx.arc(X(tk.h.position.x), Z(tk.h.position.z), 3.5, 0, Math.PI * 2); mctx.fill(); });
    if (player) {
      mctx.translate(w / 2, h / 2); mctx.rotate(-player.rotation.y + Math.PI);
      mctx.fillStyle = '#ff5a4f'; mctx.beginPath(); mctx.moveTo(0, -7); mctx.lineTo(5, 6); mctx.lineTo(0, 3); mctx.lineTo(-5, 6); mctx.closePath(); mctx.fill();
    }
    mctx.restore();
    mctx.strokeStyle = 'rgba(255,255,255,.85)'; mctx.lineWidth = 2; mctx.beginPath(); mctx.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2); mctx.stroke();
  }

  /* ---------- game flow ---------- */
  function apply(fx) {
    if (!fx) return; var out = [];
    Object.keys(fx).forEach(function (k) {
      var v = fx[k]; S.stats[k] += v;
      if (k === 'energy') S.stats.energy = Math.max(0, Math.min(100, S.stats.energy));
      else if (k === 'money') S.stats.money = Math.max(-99, Math.min(100, S.stats.money));
      else S.stats[k] = Math.max(0, Math.min(100, S.stats[k]));
      out.push([k, v]);
    });
    floaters(out);
  }
  function floatEl(text, cls, left, delay) {
    var el = document.createElement('span'); el.className = 'fx ' + cls; el.textContent = text; el.style.left = left; el.style.animationDelay = delay + 'ms';
    fxLayer.appendChild(el); setTimeout(function () { el.remove(); }, 2300 + delay);
  }
  function floaters(list) { list.forEach(function (kv, n) { var st = D.STATS.filter(function (s) { return s.k === kv[0]; })[0]; floatEl(st.icon + ' ' + (kv[1] > 0 ? '+' : '') + kv[1], kv[1] > 0 ? 'up' : 'down', (6 + n * 19) + '%', n * 120); }); }
  function startChapter() {
    var c = chap(); S.ap = c.ap; S.done = 0; S.step = 'intro'; S.used = {}; S.midDone = false;
    if (S.ch > 0 || S.free) apply({ energy: 20 });
    if (c.story.fx && S.ch > 0) apply(c.story.fx);
    // the launch chapter needs a rocket on the pad
    if (!S.free && S.ch === CH.length - 1 && !S.buildings.some(function (b) { return b.type === 'rocket'; })) {
      ensureLots(1); var f = freeLots()[0]; if (f) { var rb = { i: f[0], j: f[1], type: 'rocket' }; S.buildings.push(rb); placeBuilding(rb, true); }
    }
    ensureLots(4);
    syncNpcs(); syncCars(); syncTalkers(); render(); save();
  }
  function choose(o) {
    apply(o.fx); S.reply = o.r; S.step = S.step === 'mid' ? 'midReply' : 'reply';
    if (!S.free && S.ch === CH.length - 1 && S.step === 'reply') { launchAt = performance.now() + 1200; overviewUntil = performance.now() + 9000; }
    render(); save();
  }
  function act(id) {
    var a = D.ACT[id]; if (a.fx.energy < 0 && S.stats.energy + a.fx.energy < 0) return;
    if (a.build) { ensureLots(3); placing = id; S.step = 'place'; standLot = null; showPlots(true); if (mode === 'map') setMode('follow'); render(); return; }
    apply(a.fx); afterAction(id);
  }
  function build(i, j) {
    var id = placing, a = D.ACT[id]; placing = null; showPlots(false);
    var b = { i: i, j: j, type: a.build }; S.buildings.push(b); placeBuilding(b, true);
    if (player && Math.abs(player.position.x - i * P) < 3.2 && Math.abs(player.position.z - j * P) < 3.2) { player.position.set(i * P, 0.01, j * P + LOT / 2 + 0.9); player.rotation.y = Math.PI; camYaw = 0; }
    apply(a.fx); syncNpcs(); afterAction(id);
  }
  function afterAction(id) {
    if (!D.ACT[id].repeat) S.used[id] = 1;
    S.ap--; S.done++;
    var c = chap();
    if (c.mid && S.done === c.mid.after && !S.midDone) { S.midDone = true; S.step = 'mid'; }
    else if (S.ap <= 0) S.step = 'milestone'; else S.step = 'act';
    render(); save();
  }
  function pickFree() {
    S.fe = Math.floor(Math.random() * D.FREE.events.length);
    var pool = D.FREE.actions.filter(function (a) { return a !== 'family' && a !== 'rest'; }).sort(function () { return Math.random() - 0.5; });
    S.fa = pool.slice(0, 3);
  }
  function freeBounds() {
    var b = bounds.slice(), turn = S.free % 4;
    if (turn === 1 && b[1] < MAXB[1]) b[1]++; else if (turn === 2 && b[3] < MAXB[3]) b[3]++; else if (turn === 3 && b[0] > MAXB[0]) b[0]--; else if (b[2] > MAXB[2]) b[2]--;
    return b;
  }
  function nextChapter() {
    if (S.free) { S.free++; pickFree(); expandTo(freeBounds()); overviewUntil = performance.now() + 3000; startChapter(); return; }
    if (S.ch >= CH.length - 1) { finish(); return; }
    S.ch++; expandTo(GROW[Math.min(S.ch, GROW.length - 1)]); overviewUntil = performance.now() + 3400;
    startChapter();
  }
  function finish() { S.step = 'end'; save(); mode = 'orbit'; render(); }

  /* ---------- panel ---------- */
  function statsHTML() {
    return D.STATS.map(function (s) {
      var v = S.stats[s.k], neg = s.k === 'money' && v < 0, pct = s.k === 'money' ? Math.min(100, Math.abs(v)) : Math.min(100, v);
      return '<div class="st' + (neg ? ' neg' : '') + (s.k === 'energy' && v < 20 ? ' low' : '') + '" title="' + esc(T(s.name)) + '"><span class="st-i">' + s.icon + '</span><span class="st-n">' + esc(T(neg ? s.debt : s.name)) + '</span><b>' + (neg ? '−' + Math.abs(v) : v) + '</b><i style="width:' + pct + '%"></i></div>';
    }).join('');
  }
  function head() {
    var c = chap();
    if (c.isFree) return '<p class="g-chap">' + esc(T(D.UI.freeTitle)) + '</p><h2 class="g-title">' + esc(T(D.UI.year)) + ' ' + S.free + ' ' + esc(T(D.UI.yearSuffix)) + '</h2>';
    return '<p class="g-chap">' + esc(T(D.UI.chapter)) + ' ' + (S.ch + 1) + ' ' + esc(T(D.UI.chapterSuffix)) + ' · ' + esc(T(c.age)) + '</p><h2 class="g-title">' + esc(T(c.title)) + '</h2>';
  }
  function btn(label, cls, data) { return '<button type="button" class="g-btn ' + (cls || '') + '" ' + (data || '') + '>' + label + '</button>'; }
  var lookImgs = [];
  function render() {
    hud.innerHTML = canWalk() ? statsHTML() : '';
    wrap.setAttribute('data-step', S.step);
    wrap.classList.toggle('walking', canWalk() && S.step !== 'end');
    help.textContent = canWalk() && S.step !== 'end' ? T(TOUCH ? D.UI.joy : D.UI.keys) : '';
    setMode(mode);
    var c = chap(), h = '';
    if (S.step === 'title') {
      var saved = load(), canResume = saved && /^(intro|mid|reply|midReply|act|place|milestone)$/.test(saved.step);
      h = '<div class="g-cover"><p class="g-chap">🎮 ' + esc(T(D.UI.sub)) + '</p><h2 class="g-big">' + esc(T(D.UI.title)) + '</h2><p class="g-note">' + esc(T(D.UI.note)) + '</p><div class="g-row">' +
        (canResume ? btn(esc(T(D.UI.resume)), 'gold', 'data-go="resume"') + btn(esc(T(D.UI.restart)), '', 'data-go="new"') : btn(esc(T(D.UI.start)) + ' →', 'gold', 'data-go="new"')) + '</div></div>';
    } else if (S.step === 'pick') {
      h = '<p class="g-chap">' + esc(T(D.UI.title)) + '</p><h2 class="g-title">' + esc(T(D.UI.pick)) + '</h2><p class="g-text small">' + esc(T(D.UI.pickNote)) + '</p><div class="g-looks">' +
        D.LOOKS.map(function (l, n) { return '<button type="button" class="g-look" data-look="' + n + '">' + (lookImgs[n] ? '<img src="' + lookImgs[n] + '" alt="">' : '') + '<span>' + esc(T(l.name)) + '</span></button>'; }).join('') + '</div>';
    } else if (S.step === 'intro') {
      h = head() + (c.future && (S.ch === 0 || !CH[S.ch - 1].future) ? '<p class="g-hint">📖 ' + esc(T(D.UI.future)) + '</p>' : '') +
        c.intro.map(function (p) { return '<p class="g-text">' + esc(T(p)) + '</p>'; }).join('') + '<p class="g-text drama">' + esc(T(c.story.text)) + '</p><div class="g-opts">' + c.story.opts.map(function (o, n) { return btn(esc(T(o.t)), 'opt', 'data-opt="' + n + '"'); }).join('') + '</div>';
    } else if (S.step === 'mid') {
      h = head() + '<p class="g-text drama">' + esc(T(c.mid.text)) + '</p><div class="g-opts">' + c.mid.opts.map(function (o, n) { return btn(esc(T(o.t)), 'opt', 'data-mid="' + n + '"'); }).join('') + '</div>';
    } else if (S.step === 'reply' || S.step === 'midReply') {
      h = head() + '<p class="g-text reply">' + esc(T(S.reply)) + '</p>' + btn(esc(T(D.UI.next)) + ' →', 'gold', 'data-go="acts"');
    } else if (S.step === 'act') {
      h = head() + '<p class="g-ap">' + esc(T(D.UI.actionsLeftPre)) + '<b>' + S.ap + '</b> ' + esc(T(D.UI.actionsLeft)) + '</p><div class="g-cards">' +
        c.actions.filter(function (id) { return !S.used[id]; }).map(function (id) {
          var a = D.ACT[id], tired = a.fx.energy < 0 && S.stats.energy + a.fx.energy < 0;
          var chips = Object.keys(a.fx).map(function (k) { var st = D.STATS.filter(function (s) { return s.k === k; })[0], v = a.fx[k]; return '<span class="' + (v > 0 ? 'up' : 'down') + '">' + st.icon + (v > 0 ? '+' : '') + v + '</span>'; }).join('');
          return '<button type="button" class="g-card' + (a.build ? ' build' : '') + '" data-act="' + id + '"' + (tired ? ' disabled' : '') + '><span class="g-ico">' + a.icon + '</span><b>' + esc(T(a.name)) + '</b><small>' + esc(T(tired ? D.UI.tired : a.desc)) + '</small><span class="g-chips">' + chips + '</span></button>';
        }).join('') + '</div>';
    } else if (S.step === 'place') {
      var a = D.ACT[placing];
      h = head() + '<p class="g-text">' + a.icon + ' <b>' + esc(T(a.name)) + '</b></p><p class="g-hint">🚶 ' + esc(T(D.UI.walkTo)) + '</p><div class="g-row">' +
        (standLot ? btn('🏗️ ' + esc(T(D.UI.buildHere)), 'gold', 'data-go="here"') : '') + btn(esc(T(D.UI.auto)), standLot ? '' : 'gold', 'data-go="auto"') + btn(esc(T(D.UI.cancel)), '', 'data-go="cancel"') + '</div>';
    } else if (S.step === 'milestone') {
      var lastCh = !S.free && S.ch >= CH.length - 1;
      h = head() + '<p class="g-chap">🏆 ' + esc(T(D.UI.milestone)) + '</p><p class="g-text reply">' + esc(T(c.milestone)) + '</p>' + btn(lastCh ? esc(T(D.UI.next)) + ' →' : '🏝️ ' + esc(T(D.UI.expand)) + ' →', 'gold', 'data-go="next"');
    } else if (S.step === 'end') {
      var ks = ['dream', 'impact', 'family', 'money'], best = ks.reduce(function (a, b) { return S.stats[b] > S.stats[a] ? b : a; }), en = D.ENDINGS[best];
      h = '<p class="g-chap">' + esc(T(D.UI.yourPath)) + '</p><h2 class="g-big">' + esc(T(en.title)) + '</h2><p class="g-text reply">' + esc(T(en.text)) + '</p><p class="g-ap"><b>' + S.buildings.length + '</b> ' + esc(T(D.UI.built)) + '</p><p class="g-text small">' + esc(T(D.UI.endNote)) + '</p>' +
        '<div class="g-row">' + btn('🌏 ' + esc(T(D.UI.freePlay)) + ' →', 'gold', 'data-go="free"') + '</div>' +
        '<div class="g-row">' + btn(esc(T(D.UI.share)), '', 'data-go="share"') + btn(esc(T(D.UI.playAgain)), '', 'data-go="new"') + '</div><div class="g-row"><a class="g-btn ghost" href="about.html">' + esc(T(D.UI.meet)) + ' →</a><a class="g-btn ghost" href="contact.html">' + esc(T(D.UI.contact)) + ' →</a></div>';
    }
    panel.innerHTML = h; panel.scrollTop = 0;
  }
  panel.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b || b.disabled) return; var c = chap();
    if (b.dataset.opt) choose(c.story.opts[+b.dataset.opt]);
    else if (b.dataset.mid) choose(c.mid.opts[+b.dataset.mid]);
    else if (b.dataset.act) act(b.dataset.act);
    else if (b.dataset.look) pickLook(+b.dataset.look);
    else if (b.dataset.go) go(b.dataset.go);
  });
  function spawnPlayer() {
    if (player) scene.remove(player);
    player = human(D.LOOKS[S.look || 0]); player.position.set(0, 0.01, LOT / 2 + 1.0); player.rotation.y = Math.PI; scene.add(player);
    camYaw = 0; camPos.set(0, 30, 40);
  }
  function pickLook(n) {
    S = fresh(); S.look = n; bounds = prevBounds = GROW[0]; clearPeople(); placing = null; showPlots(false); launchAt = 0;
    rebuildWorld(); spawnPlayer(); mode = 'follow'; startChapter();
  }
  function go(what) {
    if (what === 'new') { S.step = 'pick'; render(); }
    else if (what === 'resume') {
      S = load(); bounds = prevBounds = S.bounds || GROW[Math.min(S.ch, GROW.length - 1)]; clearPeople(); placing = null; rebuildWorld(); spawnPlayer(); syncNpcs(); syncCars(); syncTalkers(); mode = 'follow';
      if (S.step === 'place') S.step = 'act'; render();
    } else if (what === 'acts') { S.step = S.ap <= 0 ? 'milestone' : 'act'; render(); save(); }
    else if (what === 'here') { var l = lotOf(player.position.x, player.position.z); if (l && vacant(l.i, l.j) && !bAt(l.i, l.j)) build(l.i, l.j); }
    else if (what === 'auto') {
      var px = player ? player.position.x : 0, pz = player ? player.position.z : 0;
      var f = freeLots().sort(function (a, b) { return Math.hypot(a[0] * P - px, a[1] * P - pz) - Math.hypot(b[0] * P - px, b[1] * P - pz); });
      if (f[0]) build(f[0][0], f[0][1]);
    } else if (what === 'cancel') { placing = null; showPlots(false); S.step = 'act'; render(); }
    else if (what === 'next') nextChapter();
    else if (what === 'free') { S.free = 1; pickFree(); mode = 'follow'; expandTo(freeBounds()); startChapter(); }
    else if (what === 'share') {
      var url = location.origin + location.pathname, text = T(D.UI.shareText);
      if (navigator.share) navigator.share({ title: T(D.UI.title), text: text, url: url }).catch(function () {});
      else if (navigator.clipboard) navigator.clipboard.writeText(text + ' ' + url).then(function () { floatEl(T(D.UI.copied), 'up', '30%', 0); });
    }
  }
  var _save = save; save = function () { if (S) S.bounds = bounds; _save(); };

  /* ---------- character portraits for the picker ---------- */
  function makePortraits() {
    var r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); r.setSize(150, 190); r.outputEncoding = THREE.sRGBEncoding;
    var s2 = new THREE.Scene(); s2.add(new THREE.HemisphereLight(0xffffff, 0x445566, 0.9)); var dl = new THREE.DirectionalLight(0xffffff, 1.1); dl.position.set(2, 3, 4); s2.add(dl);
    var cam = new THREE.PerspectiveCamera(26, 150 / 190, 0.1, 20); cam.position.set(0.7, 1.05, 3.4); cam.lookAt(0, 0.7, 0);
    D.LOOKS.forEach(function (l, n) { var h = human(l); h.rotation.y = 0.25; animateHuman(h, 0, 1); s2.add(h); r.render(s2, cam); lookImgs[n] = r.domElement.toDataURL(); s2.remove(h); });
    r.dispose();
  }

  /* ---------- balance: gains to family / dream / impact count at 60% ---------- */
  function soften(fx) { if (fx) Object.keys(fx).forEach(function (k) { if (fx[k] > 0 && /^(family|dream|impact)$/.test(k)) fx[k] = Math.max(2, Math.round(fx[k] * 0.6)); }); }
  Object.keys(D.ACT).forEach(function (k) { soften(D.ACT[k].fx); });
  CH.forEach(function (c) { [c.story, c.mid].forEach(function (st) { if (st) st.opts.forEach(function (o) { soften(o.fx); }); }); });
  D.FREE.events.forEach(function (e) { e.opts.forEach(function (o) { soften(o.fx); }); });

  document.addEventListener('langchange', function () { render(); nearB = nearT = null; });
  function resize() {
    var r = canvas.getBoundingClientRect(); renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / Math.max(1, r.height); camera.fov = camera.aspect < 0.8 ? 64 : 52; camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);

  /* ---------- boot: a finished city at night behind the title ---------- */
  S = fresh();
  bounds = prevBounds = GROW[4];
  var spots = freeLots(), showcase = ['school', 'library', 'studio', 'store', 'factory', 'university', 'nanolab', 'patent', 'exchange', 'btrdcc', 'cat', 'youth', 'rocket', 'dome', 'hospital', 'park'];
  showcase.forEach(function (k, n) { var sp = spots[n]; if (sp) S.buildings.push({ i: sp[0], j: sp[1], type: k }); });
  rebuildWorld(); syncNpcs(); syncCars();
  if (DEMO) { S.step = 'end'; S.stats = { family: 85, dream: 96, impact: 90, energy: 60, money: 40 }; }
  try { makePortraits(); } catch (e) {}
  resize(); render();
  requestAnimationFrame(frame);
})();
