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
  var KEY = 'dreamers-road-v2';
  var S;
  var CH = D.CHAPTERS;
  function fresh() {
    return { ch: 0, step: 'title', ap: 0, done: 0, used: {}, look: 0,
      stats: { family: 30, dream: 10, impact: 0, energy: 70, money: 0 },
      buildings: [{ i: 0, j: 0, type: 'home' }], reply: null };
  }
  function save() { if (DEMO) return; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  function load() { try { var s = JSON.parse(localStorage.getItem(KEY)); if (s && s.stats && s.buildings) return s; } catch (e) {} return null; }
  function chap() { return CH[Math.min(S.ch, CH.length - 1)]; }

  /* ---------- the city grid ---------- */
  var P = 9, LOT = 6, ROAD = P - LOT;          // lot pitch, lot size, road width (1 unit ≈ 1.75 m)
  var GROW = [[-1, 1, -1, 1], [-1, 2, -1, 2], [-2, 2, -2, 2], [-2, 3, -2, 3], [-3, 3, -3, 3], [-3, 4, -3, 4], [-4, 4, -4, 4]];
  var bounds = GROW[0], prevBounds = GROW[0];
  function inB(bd, i, j) { return i >= bd[0] && i <= bd[1] && j >= bd[2] && j <= bd[3]; }
  function hash(i, j) { var h = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return h - Math.floor(h); }
  function bAt(i, j) { for (var k = 0; k < S.buildings.length; k++) if (S.buildings[k].i === i && S.buildings[k].j === j) return S.buildings[k]; return null; }
  function freeLots() { var o = []; for (var i = bounds[0]; i <= bounds[1]; i++) for (var j = bounds[2]; j <= bounds[3]; j++) if (!bAt(i, j)) o.push([i, j]); return o; }
  function lotOf(x, z) { var i = Math.round(x / P), j = Math.round(z / P); if (Math.abs(x - i * P) > LOT / 2 || Math.abs(z - j * P) > LOT / 2) return null; return inB(bounds, i, j) ? { i: i, j: j } : null; }
  function island(bd) { return { x0: (bd[0] - 0.5) * P - ROAD / 2, x1: (bd[1] + 0.5) * P + ROAD / 2, z0: (bd[2] - 0.5) * P - ROAD / 2, z1: (bd[3] + 0.5) * P + ROAD / 2 }; }

  /* ---------- three.js setup ---------- */
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, TOUCH ? 1.5 : 1.75));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  var scene = new THREE.Scene();
  var DAY_SKY = new THREE.Color('#9fd0ee'), NIGHT_SKY = new THREE.Color('#0d1a33');
  scene.background = DAY_SKY.clone();
  scene.fog = new THREE.Fog(DAY_SKY.clone(), 60, 170);
  var camera = new THREE.PerspectiveCamera(55, 1, 0.1, 500);
  var hemi = new THREE.HemisphereLight(0xcfe8ff, 0x5d7a4a, 0.75); scene.add(hemi);
  var sun = new THREE.DirectionalLight(0xfff0d8, 1.6);
  sun.castShadow = true; sun.shadow.mapSize.set(TOUCH ? 1024 : 2048, TOUCH ? 1024 : 2048);
  var sc = sun.shadow.camera; sc.left = -30; sc.right = 30; sc.top = 30; sc.bottom = -30; sc.near = 1; sc.far = 120;
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02;
  scene.add(sun); scene.add(sun.target);

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
    asphalt: canvasTex(128, 128, function (g, w, h) { g.fillStyle = '#3d4148'; g.fillRect(0, 0, w, h); speckle(g, w, h, 3000, 0.18); }, [30, 30]),
    pave: canvasTex(128, 128, function (g, w, h) { g.fillStyle = '#c9c4ba'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(90,85,75,.35)'; g.lineWidth = 2; for (var k = 0; k <= 4; k++) { g.beginPath(); g.moveTo(0, k * 32); g.lineTo(w, k * 32); g.stroke(); g.beginPath(); g.moveTo(k * 32, 0); g.lineTo(k * 32, h); g.stroke(); } speckle(g, w, h, 900, 0.06); }, [3, 3]),
    sand: canvasTex(64, 64, function (g, w, h) { g.fillStyle = '#e3cf9c'; g.fillRect(0, 0, w, h); speckle(g, w, h, 800, 0.12); }, [20, 20])
  };

  var nightMats = [];   // materials that glow at night
  var facadeCache = {};
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
      var mx = W * 0.24 / cols, my = H * 0.36 / rows;
      for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
        var x = c * W / cols + mx / 2, yy = r * H / rows + my / 2, ww = W / cols - mx, hh = H / rows - my;
        if (o.door && r === rows - 1 && c === Math.floor(cols / 2)) { g.fillStyle = glow ? '#000' : '#5b3a26'; g.fillRect(x, yy, ww, hh + my / 2); continue; }
        if (glow) { g.fillStyle = lit[r * cols + c] ? '#ffcf86' : '#000'; g.fillRect(x, yy, ww, hh); continue; }
        g.fillStyle = o.frame || 'rgba(255,255,255,.85)'; g.fillRect(x - 1.5, yy - 1.5, ww + 3, hh + 3);
        var gr = g.createLinearGradient(x, yy, x + ww, yy + hh); gr.addColorStop(0, o.glass || '#8fb6d6'); gr.addColorStop(1, shadeHex(o.glass || '#8fb6d6', -0.35));
        g.fillStyle = gr; g.fillRect(x, yy, ww, hh); g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(x, yy, ww * 0.35, hh);
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

  /* ---------- buildings (inside a 6 × 6 lot, ground at y = 0) ---------- */
  var anims = [], launchAt = 0;
  var BUILD = {
    home: function (g) {
      fbox(3.6, 2.8, 3.2, facade({ base: '#efe2c6', cols: 3, rows: 2, lit: 0.7, door: true, glass: '#7ea2c4' }), '#b84d3a', g);
      gable(4.0, 3.6, 1.7, '#a8432f', g, 2.8);
      cyl(0.22, 0.22, 1.2, '#7a3a2a', g, 1.1, 3.2, -0.6, 8);
      mesh(boxG(1.2, 0.08, 1.0), M('#9a948a'), 0, 0.04, 2.1, g);
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
      fbox(2.6, 6, 2.6, facade({ base: '#d8d2c4', cols: 2, rows: 5, lit: 0.6 }), '#8d8a80', g);
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
      var shed = fbox(1.8, 1.8, 1.6, facade({ base: '#b9b3a6', cols: 1, rows: 1, lit: 0.5 }), '#6c6a66', g, 0); shed.position.set(-1.9, 0.9, -1.8);
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
        if (!launchAt || performance.now() < launchAt) { rk.position.y = 0.5; flame.visible = false; return; }
        var u = (performance.now() - launchAt) / 1000; rk.position.y = 0.5 + u * u * 3; flame.visible = u < 12; flame.scale.y = 1 + Math.random() * 0.5;
      });
    },
    dome: function (g) {
      cyl(2.9, 3.0, 0.3, '#d5dde6', g, 0, 0, 0, 40);
      for (var k = 0; k < 5; k++) tree(g, Math.cos(k * 1.3) * 1.5, Math.sin(k * 1.3) * 1.5, 0.75).position.y = 0.3;
      fbox(0.9, 2.4, 0.9, facade({ base: '#eef3f8', cols: 1, rows: 3, lit: 0.8 }), '#c9d4df', g, 0.3);
      mesh(new THREE.SphereGeometry(2.8, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#bfe8ff', transparent: true, opacity: 0.28, roughness: 0.05, metalness: 0.3, side: THREE.DoubleSide, depthWrite: false }), 0, 0.3, 0, g, true);
      var wire = new THREE.Mesh(new THREE.SphereGeometry(2.82, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffffff', wireframe: true, transparent: true, opacity: 0.25 }));
      wire.position.y = 0.3; g.add(wire);
    }
  };

  /* ---------- trees, roads, lots ---------- */
  var TREE_G = { trunk: new THREE.CylinderGeometry(0.12, 0.18, 1.4, 7), leaf: new THREE.IcosahedronGeometry(0.9, 1), pine: new THREE.ConeGeometry(0.9, 2.2, 8) };
  function tree(parent, x, z, s) {
    var g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s || 1); parent.add(g);
    mesh(TREE_G.trunk, M('#6e4b2e'), 0, 0.7, 0, g);
    if (hash(x * 3.1, z * 1.7) < 0.35) { mesh(TREE_G.pine, M('#3f7f4f'), 0, 2.0, 0, g); mesh(TREE_G.pine, M('#4a915a'), 0, 2.8, 0, g).scale.setScalar(0.7); }
    else { mesh(TREE_G.leaf, M('#4f8f4a'), 0, 2.1, 0, g); mesh(TREE_G.leaf, M('#5fa257'), 0.35, 2.6, 0.2, g).scale.setScalar(0.7); mesh(TREE_G.leaf, M('#477f42'), -0.4, 2.4, -0.2, g).scale.setScalar(0.65); }
    return g;
  }
  var lotGroup = new THREE.Group(), roadGroup = new THREE.Group(), bGroup = new THREE.Group();
  scene.add(roadGroup); scene.add(lotGroup); scene.add(bGroup);
  var sea = mesh(new THREE.PlaneGeometry(600, 600, 60, 60), new THREE.MeshStandardMaterial({ color: '#2b7aa6', roughness: 0.18, metalness: 0.25 }), 0, -0.9, 0, scene, true);
  sea.rotation.x = -Math.PI / 2; sea.receiveShadow = true;
  var seaPos = sea.geometry.attributes.position;
  var lots = {};
  var lampMat = glowMat('#ffd9a0', 0); lampMat.color.set('#fff4d6'); nightMats.push(lampMat);
  var asphMat = new THREE.MeshStandardMaterial({ map: TEX.asphalt, roughness: 0.95 }), sandMat = new THREE.MeshStandardMaterial({ map: TEX.sand, roughness: 1 });
  var paveMat = new THREE.MeshStandardMaterial({ map: TEX.pave, roughness: 0.9 }), grassMat = new THREE.MeshStandardMaterial({ map: TEX.grass, roughness: 1 });

  function buildGround() {
    while (roadGroup.children.length) roadGroup.remove(roadGroup.children[0]);
    var I = island(bounds), w = I.x1 - I.x0, d = I.z1 - I.z0, cx = (I.x0 + I.x1) / 2, cz = (I.z0 + I.z1) / 2;
    var sd = M('#c9b483');
    mesh(boxG(w + 8, 1, d + 8), [sd, sd, sandMat, sd, sd, sd], cx, -0.62, cz, roadGroup).castShadow = false;
    TEX.asphalt.repeat.set(w / 4, d / 4);
    var rs = M('#7b7f86');
    mesh(boxG(w, 0.3, d), [rs, rs, asphMat, rs, rs, rs], cx, -0.15, cz, roadGroup).castShadow = false;
    var dashes = [];
    for (var k = bounds[0] - 1; k <= bounds[1]; k++) for (var z = I.z0 + 1; z < I.z1 - 1; z += 2.2) dashes.push([(k + 0.5) * P, z, 0]);
    for (var q = bounds[2] - 1; q <= bounds[3]; q++) for (var x = I.x0 + 1; x < I.x1 - 1; x += 2.2) dashes.push([x, (q + 0.5) * P, 1]);
    var inst = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 0.02, 1.0), M('#f1efe6', { roughness: 0.6 }), dashes.length), o = new THREE.Object3D();
    dashes.forEach(function (p, n) { o.position.set(p[0], 0.011, p[1]); o.rotation.y = p[2] ? Math.PI / 2 : 0; o.updateMatrix(); inst.setMatrixAt(n, o.matrix); });
    inst.receiveShadow = true; roadGroup.add(inst);
    var poles = [];
    for (var i = bounds[0]; i <= bounds[1]; i++) for (var j = bounds[2]; j <= bounds[3]; j++) poles.push([i * P + LOT / 2 - 0.3, j * P + LOT / 2 - 0.3]);
    var pole = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.06, 0.08, 3.4, 6), M('#4a4f58', { metalness: 0.5, roughness: 0.5 }), poles.length);
    var head = new THREE.InstancedMesh(new THREE.BoxGeometry(0.25, 0.15, 0.6), lampMat, poles.length);
    poles.forEach(function (p, n) { o.rotation.set(0, 0, 0); o.position.set(p[0], 1.85, p[1]); o.updateMatrix(); pole.setMatrixAt(n, o.matrix); o.position.set(p[0], 3.55, p[1] + 0.25); o.updateMatrix(); head.setMatrixAt(n, o.matrix); });
    pole.castShadow = true; roadGroup.add(pole); roadGroup.add(head);
  }
  function buildLot(i, j) {
    var key = i + ',' + j; if (lots[key]) return lots[key];
    var g = new THREE.Group(); g.position.set(i * P, 0, j * P); lotGroup.add(g); lots[key] = g;
    var cs = M('#a9a59c'), gs = M('#5e8f45');
    mesh(boxG(LOT, 0.3, LOT), [cs, cs, paveMat, cs, cs, cs], 0, 0.0, 0, g);
    mesh(boxG(LOT - 1.4, 0.34, LOT - 1.4), [gs, gs, grassMat, gs, gs, gs], 0, 0.02, 0, g);
    g.userData.trees = new THREE.Group(); g.add(g.userData.trees);
    var n = hash(i, j) < 0.5 ? 2 : 3;
    for (var k = 0; k < n; k++) tree(g.userData.trees, (hash(i + k, j) - 0.5) * 3.2, (hash(i, j + k) - 0.5) * 3.2, 0.8 + hash(k, i) * 0.4).position.y = 0.18;
    if (!inB(prevBounds, i, j)) { g.userData.rise = performance.now() + (Math.max(prevBounds[0] - i, i - prevBounds[1], prevBounds[2] - j, j - prevBounds[3]) - 1) * 250 + hash(j, i) * 300; g.position.y = -3; }
    return g;
  }
  var bMeshes = [];
  function placeBuilding(b, animate) {
    var lot = buildLot(b.i, b.j); lot.userData.trees.visible = false;
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
    prevBounds = bounds; bounds = bd; buildGround();
    for (var i = bounds[0]; i <= bounds[1]; i++) for (var j = bounds[2]; j <= bounds[3]; j++) buildLot(i, j);
  }

  /* ---------- people ---------- */
  var HG = { leg: new THREE.CylinderGeometry(0.075, 0.065, 0.48, 8), arm: new THREE.CylinderGeometry(0.055, 0.048, 0.42, 8), torso: new THREE.CylinderGeometry(0.2, 0.17, 0.5, 10), head: new THREE.SphereGeometry(0.13, 16, 12), shoe: new THREE.BoxGeometry(0.13, 0.08, 0.24), hand: new THREE.SphereGeometry(0.05, 8, 6) };
  function human(look) {
    var g = new THREE.Group(), body = new THREE.Group(), p = {};
    g.add(body);
    function limb(geo, col, x, y, len, parent) { var pv = new THREE.Group(); pv.position.set(x, y, 0); parent.add(pv); mesh(geo, M(col), 0, -len / 2, 0, pv); return pv; }
    p.legL = limb(HG.leg, look.bottom, -0.1, 0.52, 0.48, g); p.legR = limb(HG.leg, look.bottom, 0.1, 0.52, 0.48, g);
    mesh(HG.shoe, M(look.shoes), 0, -0.5, 0.04, p.legL); mesh(HG.shoe, M(look.shoes), 0, -0.5, 0.04, p.legR);
    mesh(HG.torso, M(look.top), 0, 0.78, 0, body).scale.z = 0.62;
    if (look.shirt) { mesh(new THREE.BoxGeometry(0.1, 0.3, 0.02), M(look.shirt), 0, 0.85, 0.11, body); mesh(new THREE.BoxGeometry(0.03, 0.22, 0.025), M('#b03a2e'), 0, 0.83, 0.12, body); }
    if (look.coat) mesh(new THREE.CylinderGeometry(0.21, 0.24, 0.4, 10), M(look.top), 0, 0.45, 0, body).scale.z = 0.66;
    if (look.skirt) mesh(new THREE.CylinderGeometry(0.17, 0.24, 0.3, 10), M(look.bottom), 0, 0.42, 0, body).scale.z = 0.7;
    p.armL = limb(HG.arm, look.top, -0.25, 0.98, 0.42, body); p.armR = limb(HG.arm, look.top, 0.25, 0.98, 0.42, body);
    mesh(HG.hand, M(look.skin), 0, -0.45, 0, p.armL); mesh(HG.hand, M(look.skin), 0, -0.45, 0, p.armR);
    mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.08, 8), M(look.skin), 0, 1.06, 0, body);
    mesh(HG.head, M(look.skin), 0, 1.2, 0, body);
    mesh(new THREE.SphereGeometry(0.138, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), M(look.hair), 0, 1.215, -0.01, body);
    if (look.longHair) mesh(new THREE.BoxGeometry(0.26, 0.32, 0.08), M(look.hair), 0, 1.07, -0.1, body);
    if (look.cap) { mesh(new THREE.SphereGeometry(0.142, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), M(look.cap), 0, 1.24, 0, body); mesh(new THREE.BoxGeometry(0.2, 0.02, 0.14), M(look.cap), 0, 1.25, 0.15, body); }
    if (look.hood) mesh(new THREE.TorusGeometry(0.12, 0.05, 8, 16), M(look.top), 0, 1.06, -0.04, body).rotation.x = Math.PI / 2.4;
    if (look.glasses) [-0.05, 0.05].forEach(function (x) { mesh(new THREE.TorusGeometry(0.035, 0.008, 6, 14), M('#111111'), x, 1.22, 0.125, body, true); });
    if (look.helmet) {
      mesh(new THREE.SphereGeometry(0.19, 18, 14), M('#f4f6f8', { roughness: 0.3 }), 0, 1.21, 0, body);
      mesh(new THREE.SphereGeometry(0.152, 16, 10, -Math.PI / 2.4, Math.PI / 1.2, Math.PI / 3, Math.PI / 3), M('#c9a35b', { metalness: 0.8, roughness: 0.15 }), 0, 1.21, 0.06, body);
      mesh(new THREE.BoxGeometry(0.26, 0.3, 0.14), M('#d9dde2'), 0, 0.82, -0.18, body);
    } else [-0.045, 0.045].forEach(function (x) { mesh(new THREE.SphereGeometry(0.016, 6, 6), M('#1a1a1a'), x, 1.22, 0.118, body, true); });
    g.userData.p = p; g.userData.body = body; g.userData.phase = Math.random() * 6;
    return g;
  }
  function animateHuman(h, speed, dt) {
    var p = h.userData.p, moving = speed > 0.05;
    if (moving) h.userData.phase += dt * (3 + speed * 2.2);
    var a = moving ? Math.sin(h.userData.phase) * Math.min(0.9, 0.3 + speed * 0.12) : 0, k = Math.min(1, dt * 14);
    p.legL.rotation.x += (a - p.legL.rotation.x) * k; p.legR.rotation.x += (-a - p.legR.rotation.x) * k;
    p.armL.rotation.x += (-a * 0.8 - p.armL.rotation.x) * k; p.armR.rotation.x += (a * 0.8 - p.armR.rotation.x) * k;
    h.userData.body.position.y = moving ? Math.abs(Math.cos(h.userData.phase)) * 0.04 : 0;
    h.userData.body.rotation.x = moving ? Math.min(0.15, speed * 0.02) : 0;
  }

  var player = null, playerVel = 0, npcs = [], cars = [];
  var NPC_LOOKS = [
    { skin: '#f1c7a0', hair: '#222', top: '#3c6fa8', bottom: '#2a2d36', shoes: '#222' },
    { skin: '#e3b088', hair: '#5a3a22', top: '#e9c46a', bottom: '#264653', shoes: '#eee', longHair: true },
    { skin: '#c68e63', hair: '#111', top: '#f4a261', bottom: '#3a3a3a', shoes: '#111', cap: '#264653' },
    { skin: '#f4d0b0', hair: '#9a6a3a', top: '#7a5ad8', bottom: '#333', shoes: '#ddd', skirt: true, longHair: true },
    { skin: '#8d5a3b', hair: '#111', top: '#2a9d8f', bottom: '#1d3557', shoes: '#fff' },
    { skin: '#f1c7a0', hair: '#cfcfcf', top: '#8d6a28', bottom: '#5b5b5b', shoes: '#333' },
    { skin: '#e9b98f', hair: '#2b1b14', top: '#e76f51', bottom: '#264653', shoes: '#fff', hood: true }
  ];
  // pedestrians walk the sidewalks: points just off each lot's corners
  function corner(c) { return new THREE.Vector3(c.i * P + c.cx * (LOT / 2 - 0.4), 0.17, c.j * P + c.cz * (LOT / 2 - 0.4)); }
  function randomCorner() { return { i: bounds[0] + Math.floor(Math.random() * (bounds[1] - bounds[0] + 1)), j: bounds[2] + Math.floor(Math.random() * (bounds[3] - bounds[2] + 1)), cx: Math.random() < 0.5 ? -1 : 1, cz: Math.random() < 0.5 ? -1 : 1 }; }
  function nextCorner(c) { var n = { i: c.i, j: c.j, cx: c.cx, cz: c.cz }; if (Math.random() < 0.5) n.cx = -n.cx; else n.cz = -n.cz; return n; }
  function syncNpcs() {
    var want = Math.min(16, 3 + S.buildings.length);
    while (npcs.length < want) {
      var h = human(NPC_LOOKS[npcs.length % NPC_LOOKS.length]), c = randomCorner();
      h.position.copy(corner(c)); h.scale.setScalar(0.92 + Math.random() * 0.14); scene.add(h);
      npcs.push({ h: h, c: c, to: nextCorner(c), sp: 1.1 + Math.random() * 0.5, wait: 0 });
    }
  }
  var CAR_COLS = ['#d6453d', '#f2f2f2', '#1f3d63', '#e9c46a', '#2a9d8f', '#222831', '#c9a35b'];
  function makeCar(col) {
    var g = new THREE.Group();
    mesh(boxG(1.7, 0.55, 3.6), M(col, { metalness: 0.5, roughness: 0.35 }), 0, 0.55, 0, g);
    mesh(boxG(1.5, 0.5, 1.9), M('#1e2b38', { metalness: 0.6, roughness: 0.15 }), 0, 1.05, -0.2, g);
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
    var want = Math.min(8, 2 + S.ch);
    while (cars.length < want) { var c = { g: makeCar(CAR_COLS[cars.length % CAR_COLS.length]), axis: cars.length % 2, sp: 6 + Math.random() * 3 }; scene.add(c.g); resetCar(c, true); cars.push(c); }
  }
  function clearPeople() { npcs.forEach(function (o) { scene.remove(o.h); }); cars.forEach(function (c) { scene.remove(c.g); }); npcs = []; cars = []; }

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

  /* ---------- camera ---------- */
  var camYaw = 0.6, camDist = 6.5, camPitch = 0.38, mode = 'orbit', overviewUntil = 0, lastLook = 0;
  var camPos = new THREE.Vector3(40, 40, 40), camLook = new THREE.Vector3(), tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();
  function overviewTarget(out, look, t) {
    var I = island(bounds), cx = (I.x0 + I.x1) / 2, cz = (I.z0 + I.z1) / 2, size = Math.max(I.x1 - I.x0, I.z1 - I.z0);
    var a = mode === 'orbit' ? t * 0.05 + 0.6 : camYaw, dist = size * (camera.aspect < 1 ? 1.3 : 0.8) + 12;
    out.set(cx + Math.sin(a) * dist * 0.75, dist * 0.6, cz + Math.cos(a) * dist * 0.75); look.set(cx, 0, cz);
  }
  function updateCamera(t, dt) {
    var k = 1 - Math.pow(0.002, dt), ov = mode === 'orbit' || mode === 'map' || performance.now() < overviewUntil || !player;
    if (ov) overviewTarget(tmpA, tmpB, t);
    else {
      var pp = player.position, d = camDist; tmpB.set(pp.x, pp.y + 1.25, pp.z);
      // pull the camera in front of any building that would block the view
      for (; d > 1.6; d -= 0.25) {
        tmpA.set(pp.x + Math.sin(camYaw) * Math.cos(camPitch) * d, pp.y + 1.25 + Math.sin(camPitch) * d, pp.z + Math.cos(camYaw) * Math.cos(camPitch) * d);
        if (!insideBuilding(tmpA, 0.6)) break;
      }
    }
    camPos.lerp(tmpA, Math.min(1, ov ? k * 0.7 : k * 2.2)); camLook.lerp(tmpB, Math.min(1, ov ? k * 0.7 : k * 3));
    camera.position.copy(camPos); camera.lookAt(camLook);
    sun.position.set(camLook.x + 30, 45, camLook.z + 18); sun.target.position.copy(camLook);
    var span = ov ? 55 : 24; if (sc.right !== span) { sc.left = -span; sc.right = span; sc.top = span; sc.bottom = -span; sc.updateProjectionMatrix(); }
  }

  /* ---------- input: keys, joystick, drag to look around, pinch/wheel to zoom, tap to walk ---------- */
  var keys = {}, joyV = { x: 0, y: 0 }, walkTo = null, jd = null, drag = null, pinch = {};
  addEventListener('keydown', function (e) {
    if (/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(e.target.tagName) && e.key === ' ') return;
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
      if (!drag.d0) { drag.d0 = d; drag.dist = camDist; } camDist = Math.max(3.5, Math.min(22, drag.dist * drag.d0 / d)); drag.moved = true; return;
    }
    if (!drag || e.pointerId !== drag.id) return;
    var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 8) drag.moved = true;
    if (drag.moved) { camYaw = drag.yaw - dx * 0.009; camPitch = Math.max(0.1, Math.min(1.25, drag.pitch + dy * 0.005)); lastLook = performance.now(); }
  });
  function pUp(e) { delete pinch[e.pointerId]; var d = drag; if (!d || e.pointerId !== d.id) return; drag = null; if (!d.moved) tap(e.clientX, e.clientY); }
  canvas.addEventListener('pointerup', pUp);
  canvas.addEventListener('pointercancel', function (e) { delete pinch[e.pointerId]; drag = null; });
  canvas.addEventListener('wheel', function (e) { e.preventDefault(); camDist = Math.max(3.5, Math.min(22, camDist * (e.deltaY > 0 ? 1.1 : 0.9))); }, { passive: false });
  var ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.17);
  function tap(cx, cy) {
    if (!player || !canWalk()) return;
    var r = canvas.getBoundingClientRect(); ndc.set((cx - r.left) / r.width * 2 - 1, -(cy - r.top) / r.height * 2 + 1);
    ray.setFromCamera(ndc, camera);
    var hit = new THREE.Vector3(); if (!ray.ray.intersectPlane(ground, hit)) return;
    var lot = lotOf(hit.x, hit.z);
    if (placing && lot && !bAt(lot.i, lot.j)) { build(lot.i, lot.j); return; }
    walkTo = hit; if (mode === 'map') setMode('follow');
  }
  viewBtn.addEventListener('click', function () { setMode(mode === 'map' ? 'follow' : 'map'); });
  function setMode(m) { if (m !== 'orbit' || !player) mode = m; viewBtn.textContent = mode === 'map' ? '🚶 ' + T(D.UI.follow) : '🗺️ ' + T(D.UI.view); }

  /* ---------- player movement ---------- */
  function blocked(x, z) {
    var I = island(bounds);
    if (x < I.x0 + 0.4 || x > I.x1 - 0.4 || z < I.z0 + 0.4 || z > I.z1 - 0.4) return true;
    for (var k = 0; k < S.buildings.length; k++) {
      var b = S.buildings[k]; if (b.type === 'harbor') continue;
      var half = b.type === 'rocket' || b.type === 'dome' ? 2.95 : 2.6;
      if (Math.abs(x - b.i * P) < half && Math.abs(z - b.j * P) < half) return true;
    }
    return false;
  }
  var HEIGHT = { exchange: 25, btrdcc: 12, rooftop: 8.5, rocket: 10, dome: 3.4, harbor: 0, university: 6, school: 5, nanolab: 7.5, patent: 7, youth: 7 };
  function insideBuilding(v, pad) {
    for (var k = 0; k < S.buildings.length; k++) {
      var b = S.buildings[k], h = HEIGHT[b.type] != null ? HEIGHT[b.type] : 5.2, half = (b.type === 'rocket' || b.type === 'dome' ? 3 : 2.7) + pad;
      if (v.y < h + pad && Math.abs(v.x - b.i * P) < half && Math.abs(v.z - b.j * P) < half) return true;
    }
    return false;
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
    var ml = Math.hypot(mx, mz), sp = ml > 0.01 ? Math.min(1, ml) * (run ? 6.2 : 3.2) : 0;
    playerVel += (sp - playerVel) * Math.min(1, dt * 10);
    if (ml > 0.01 && playerVel > 0.02) {
      var nx = player.position.x + mx / ml * playerVel * dt, nz = player.position.z + mz / ml * playerVel * dt;
      if (!blocked(nx, nz)) { player.position.x = nx; player.position.z = nz; }
      else if (!blocked(nx, player.position.z)) player.position.x = nx;
      else if (!blocked(player.position.x, nz)) player.position.z = nz;
      else walkTo = null;
      var want = Math.atan2(mx, mz), cur = player.rotation.y, diff = Math.atan2(Math.sin(want - cur), Math.cos(want - cur));
      player.rotation.y = cur + diff * Math.min(1, dt * 12);
      // the camera swings behind the player when walking forward, unless the player just looked around
      if (performance.now() - lastLook > 1800) {
        var behind = player.rotation.y + Math.PI, cd = Math.atan2(Math.sin(behind - camYaw), Math.cos(behind - camYaw));
        if (Math.abs(cd) < 2.2) camYaw += cd * Math.min(1, dt * 1.1);
      }
    }
    player.position.y = lotOf(player.position.x, player.position.z) ? 0.19 : 0.01;
    animateHuman(player, playerVel, dt);
  }

  /* ---------- per-frame ---------- */
  var placing = null, last = performance.now(), nearB = null, standLot = null, frameNo = 0;
  function nightness() { if (S.step === 'title' || S.step === 'end' || S.step === 'pick') return 1; var t = performance.now() / 1000; return Math.max(0, Math.min(1, Math.sin(t / 45) * 1.4 - 0.4)); }
  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000); last = now; var t = now / 1000; frameNo++;
    lotGroup.children.forEach(function (g) { if (g.userData.rise) { var u = Math.max(0, Math.min(1, (now - g.userData.rise) / 700)); g.position.y = -3 * (1 - u) * (1 - u); if (u >= 1) delete g.userData.rise; } });
    bMeshes.forEach(function (o) { if (o.g.userData.grow) { var u = Math.min(1, (now - o.g.userData.grow) / 800), e = 1 - Math.pow(1 - u, 3) + Math.sin(u * Math.PI) * 0.12; o.g.scale.set(1, Math.max(0.01, e), 1); if (u >= 1) delete o.g.userData.grow; } });
    anims.forEach(function (f) { f(t); });
    for (var k = 0; k < seaPos.count; k++) { var x = seaPos.getX(k), y = seaPos.getY(k); seaPos.setZ(k, Math.sin(x * 0.15 + t * 1.1) * 0.12 + Math.cos(y * 0.18 + t * 0.9) * 0.12); }
    seaPos.needsUpdate = true; if (frameNo % 4 === 0) sea.geometry.computeVertexNormals();
    var n = nightness();
    scene.background.copy(DAY_SKY).lerp(NIGHT_SKY, n); scene.fog.color.copy(scene.background);
    sun.intensity = 1.6 * (1 - n * 0.75); hemi.intensity = 0.75 - n * 0.4;
    nightMats.forEach(function (m) { m.emissiveIntensity = 0.1 + n * 1.3; });
    plotMat.opacity = 0.3 + Math.sin(t * 4) * 0.18; beamMat.opacity = 0.2 + Math.sin(t * 4) * 0.1;
    movePlayer(dt);
    npcs.forEach(function (o) {
      if (o.wait > 0) { o.wait -= dt; animateHuman(o.h, 0, dt); return; }
      if (!inB(bounds, o.to.i, o.to.j)) o.to = randomCorner();
      var target = corner(o.to), dx = target.x - o.h.position.x, dz = target.z - o.h.position.z, d = Math.hypot(dx, dz);
      if (d < 0.2) { o.c = o.to; o.to = Math.random() < 0.12 ? randomCorner() : nextCorner(o.c); if (Math.random() < 0.25) o.wait = 1 + Math.random() * 2; return; }
      var step = Math.min(d, o.sp * dt); o.h.position.x += dx / d * step; o.h.position.z += dz / d * step; o.h.position.y = 0.19;
      var want = Math.atan2(dx, dz), diff = Math.atan2(Math.sin(want - o.h.rotation.y), Math.cos(want - o.h.rotation.y)); o.h.rotation.y += diff * Math.min(1, dt * 8);
      animateHuman(o.h, o.sp, dt);
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

  /* ---------- the building you are next to: its true story ---------- */
  var proj = new THREE.Vector3();
  function proximity() {
    if (!player || !canWalk() || mode === 'map') { tip.hidden = true; nearB = null; return; }
    var lot = lotOf(player.position.x, player.position.z), key = lot && !bAt(lot.i, lot.j) ? lot.i + ',' + lot.j : null;
    if (placing && key !== standLot) { standLot = key; render(); }
    var best = null, bd = 6.5;
    S.buildings.forEach(function (b) { var d = Math.hypot(player.position.x - b.i * P, player.position.z - b.j * P); if (d < bd) { bd = d; best = b; } });
    if (best !== nearB) { nearB = best; if (best) { var info = D.BUILD[best.type]; tip.innerHTML = '<b>' + esc(T(info.name)) + '</b><span>' + esc(T(info.note)) + '</span>'; } }
    if (!best) { tip.hidden = true; return; }
    proj.set(best.i * P, 5.5, best.j * P).project(camera);
    if (proj.z > 1) { tip.hidden = true; return; }
    var r = canvas.getBoundingClientRect(), x = (proj.x + 1) / 2 * r.width, y = (1 - proj.y) / 2 * r.height;
    tip.hidden = false;
    tip.style.left = Math.max(8, Math.min(r.width - tip.offsetWidth - 8, x - tip.offsetWidth / 2)) + 'px';
    tip.style.top = Math.max(TOUCH ? 128 : 60, Math.min(r.height - tip.offsetHeight - 120, y - tip.offsetHeight)) + 'px';
  }

  /* ---------- minimap (north up, centred on the player) ---------- */
  function drawMini(t) {
    var w = mini.width, h = mini.height; mctx.clearRect(0, 0, w, h);
    if (!canWalk()) return;
    var s = w / 60, cx = player ? player.position.x : 0, cz = player ? player.position.z : 0;
    function X(x) { return w / 2 + (x - cx) * s; } function Z(z) { return h / 2 + (z - cz) * s; }
    mctx.save(); mctx.beginPath(); mctx.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2); mctx.clip();
    mctx.fillStyle = '#2b6f96'; mctx.fillRect(0, 0, w, h);
    var J = island(bounds); mctx.fillStyle = '#4b4f57'; mctx.fillRect(X(J.x0), Z(J.z0), (J.x1 - J.x0) * s, (J.z1 - J.z0) * s);
    for (var i = bounds[0]; i <= bounds[1]; i++) for (var j = bounds[2]; j <= bounds[3]; j++) {
      var b = bAt(i, j);
      mctx.fillStyle = b ? '#e2c88f' : (placing ? 'rgba(255,215,120,' + (0.5 + Math.sin(t * 5) * 0.35) + ')' : '#6e9d58');
      mctx.fillRect(X(i * P - LOT / 2), Z(j * P - LOT / 2), LOT * s, LOT * s);
    }
    mctx.fillStyle = 'rgba(255,255,255,.8)'; npcs.forEach(function (o) { mctx.fillRect(X(o.h.position.x) - 1, Z(o.h.position.z) - 1, 2, 2); });
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
    if (S.ch > 0) apply({ energy: 20 });
    if (c.story.fx && S.ch > 0) apply(c.story.fx);
    syncNpcs(); syncCars(); render(); save();
  }
  function choose(o) { apply(o.fx); S.reply = o.r; S.step = S.step === 'mid' ? 'midReply' : 'reply'; render(); save(); }
  function act(id) {
    var a = D.ACT[id]; if (a.fx.energy < 0 && S.stats.energy + a.fx.energy < 0) return;
    if (a.build) { placing = id; S.step = 'place'; standLot = null; showPlots(true); if (mode === 'map') setMode('follow'); render(); return; }
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
  function nextChapter() {
    if (S.ch >= CH.length - 1) { finish(); return; }
    S.ch++; expandTo(GROW[S.ch]); overviewUntil = performance.now() + 3400;
    startChapter();
  }
  function finish() {
    S.step = 'end'; save(); mode = 'orbit'; render();
    if (S.buildings.some(function (b) { return b.type === 'rocket'; })) launchAt = performance.now() + 2500;
  }

  /* ---------- panel ---------- */
  function statsHTML() {
    return D.STATS.map(function (s) {
      var v = S.stats[s.k], neg = s.k === 'money' && v < 0, pct = s.k === 'money' ? Math.min(100, Math.abs(v)) : Math.min(100, v);
      return '<div class="st' + (neg ? ' neg' : '') + (s.k === 'energy' && v < 20 ? ' low' : '') + '" title="' + esc(T(s.name)) + '"><span class="st-i">' + s.icon + '</span><span class="st-n">' + esc(T(neg ? s.debt : s.name)) + '</span><b>' + (neg ? '−' + Math.abs(v) : v) + '</b><i style="width:' + pct + '%"></i></div>';
    }).join('');
  }
  function head() { var c = chap(); return '<p class="g-chap">' + esc(T(D.UI.chapter)) + ' ' + (S.ch + 1) + ' ' + esc(T(D.UI.chapterSuffix)) + ' · ' + esc(T(c.age)) + '</p><h2 class="g-title">' + esc(T(c.title)) + '</h2>'; }
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
      h = head() + c.intro.map(function (p) { return '<p class="g-text">' + esc(T(p)) + '</p>'; }).join('') + '<p class="g-text drama">' + esc(T(c.story.text)) + '</p><div class="g-opts">' + c.story.opts.map(function (o, n) { return btn(esc(T(o.t)), 'opt', 'data-opt="' + n + '"'); }).join('') + '</div>';
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
      h = head() + '<p class="g-chap">🏆 ' + esc(T(D.UI.milestone)) + '</p><p class="g-text reply">' + esc(T(c.milestone)) + '</p>' + btn(S.ch >= CH.length - 1 ? esc(T(D.UI.next)) + ' →' : '🏝️ ' + esc(T(D.UI.expand)) + ' →', 'gold', 'data-go="next"');
    } else if (S.step === 'end') {
      var ks = ['dream', 'impact', 'family', 'money'], best = ks.reduce(function (a, b) { return S.stats[b] > S.stats[a] ? b : a; }), en = D.ENDINGS[best];
      h = '<p class="g-chap">' + esc(T(D.UI.yourPath)) + '</p><h2 class="g-big">' + esc(T(en.title)) + '</h2><p class="g-text reply">' + esc(T(en.text)) + '</p><p class="g-ap"><b>' + S.buildings.length + '</b> ' + esc(T(D.UI.built)) + '</p><p class="g-text small">' + esc(T(D.UI.endNote)) + '</p>' +
        '<div class="g-row">' + btn(esc(T(D.UI.share)), 'gold', 'data-go="share"') + btn(esc(T(D.UI.playAgain)), '', 'data-go="new"') + '</div><div class="g-row"><a class="g-btn ghost" href="about.html">' + esc(T(D.UI.meet)) + ' →</a><a class="g-btn ghost" href="contact.html">' + esc(T(D.UI.contact)) + ' →</a></div>';
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
      S = load(); bounds = prevBounds = GROW[S.ch]; clearPeople(); placing = null; rebuildWorld(); spawnPlayer(); syncNpcs(); syncCars(); mode = 'follow';
      if (S.step === 'place') S.step = 'act'; render();
    } else if (what === 'acts') { S.step = S.ap <= 0 ? 'milestone' : 'act'; render(); save(); }
    else if (what === 'here') { var l = lotOf(player.position.x, player.position.z); if (l && !bAt(l.i, l.j)) build(l.i, l.j); }
    else if (what === 'auto') {
      var px = player ? player.position.x : 0, pz = player ? player.position.z : 0;
      var f = freeLots().sort(function (a, b) { return Math.hypot(a[0] * P - px, a[1] * P - pz) - Math.hypot(b[0] * P - px, b[1] * P - pz); });
      if (f[0]) build(f[0][0], f[0][1]);
    } else if (what === 'cancel') { placing = null; showPlots(false); S.step = 'act'; render(); }
    else if (what === 'next') nextChapter();
    else if (what === 'share') {
      var url = location.origin + location.pathname, text = T(D.UI.shareText);
      if (navigator.share) navigator.share({ title: T(D.UI.title), text: text, url: url }).catch(function () {});
      else if (navigator.clipboard) navigator.clipboard.writeText(text + ' ' + url).then(function () { floatEl(T(D.UI.copied), 'up', '30%', 0); });
    }
  }

  /* ---------- character portraits for the picker ---------- */
  function makePortraits() {
    var r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); r.setSize(150, 190); r.outputEncoding = THREE.sRGBEncoding;
    var s2 = new THREE.Scene(); s2.add(new THREE.HemisphereLight(0xffffff, 0x445566, 0.9)); var dl = new THREE.DirectionalLight(0xffffff, 1.1); dl.position.set(2, 3, 4); s2.add(dl);
    var cam = new THREE.PerspectiveCamera(28, 150 / 190, 0.1, 20); cam.position.set(0.8, 1.05, 3.4); cam.lookAt(0, 0.72, 0);
    D.LOOKS.forEach(function (l, n) { var h = human(l); h.rotation.y = 0.3; s2.add(h); r.render(s2, cam); lookImgs[n] = r.domElement.toDataURL(); s2.remove(h); });
    r.dispose();
  }

  /* ---------- balance: gains to family / dream / impact count at 60% ---------- */
  function soften(fx) { if (fx) Object.keys(fx).forEach(function (k) { if (fx[k] > 0 && /^(family|dream|impact)$/.test(k)) fx[k] = Math.max(2, Math.round(fx[k] * 0.6)); }); }
  Object.keys(D.ACT).forEach(function (k) { soften(D.ACT[k].fx); });
  CH.forEach(function (c) { [c.story, c.mid].forEach(function (st) { if (st) st.opts.forEach(function (o) { soften(o.fx); }); }); });

  document.addEventListener('langchange', function () { render(); nearB = null; });
  function resize() {
    var r = canvas.getBoundingClientRect(); renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / Math.max(1, r.height); camera.fov = camera.aspect < 0.8 ? 64 : 52; camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);

  /* ---------- boot: a finished city at night behind the title ---------- */
  S = fresh();
  var showcase = { school: [-1, 1], library: [1, -1], rooftop: [-2, -1], studio: [2, 1], harbor: [3, 2], store: [-3, 2], factory: [3, -2], university: [-1, -3], nanolab: [1, -3], patent: [0, 3], exchange: [-3, -3], btrdcc: [2, 3], cat: [-2, 3], youth: [2, -1], rocket: [-3, 0], dome: [0, -2] };
  Object.keys(showcase).forEach(function (k) { S.buildings.push({ i: showcase[k][0], j: showcase[k][1], type: k }); });
  bounds = prevBounds = GROW[4];
  rebuildWorld(); syncNpcs(); syncCars();
  if (DEMO) { S.step = 'end'; S.stats = { family: 85, dream: 96, impact: 90, energy: 60, money: 40 }; }
  try { makePortraits(); } catch (e) {}
  resize(); render();
  requestAnimationFrame(frame);
})();
