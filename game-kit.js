/* 《交叉點》 shared kit: textures, materials, mesh helpers and people.
   Loaded after three.js and before game-worlds.js and game.js. */
window.DRK = (function () {
  'use strict';
  var THREE = window.THREE;
  if (!THREE) return null;
  var TOUCH = matchMedia('(pointer: coarse)').matches;

  function hash(i, j) { var h = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return h - Math.floor(h); }

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
  function shadeHex(hex, f) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    function c(v) { return Math.max(0, Math.min(255, Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f))); }
    return '#' + [c(r), c(g), c(b)].map(function (v) { return v.toString(16).padStart(2, '0'); }).join('');
  }
  var nightMats = [];
  function glowMat(color, i, night) { var m = new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: i }); if (night) nightMats.push(m); return m; }
  var facadeCache = {};
  function facade(o) {
    var k = JSON.stringify(o);
    if (facadeCache[k]) return facadeCache[k];
    var cols = o.cols, rows = o.rows, W = 128, H = Math.max(128, Math.min(512, rows * 40)), lit = [];
    for (var q = 0; q < rows * cols; q++) lit.push(Math.random() < (o.lit || 0.5));
    function draw(g, glow) {
      g.fillStyle = glow ? '#000' : o.base; g.fillRect(0, 0, W, H);
      if (!glow) { if (o.brick) for (var y = 0; y < H; y += 6) { g.fillStyle = 'rgba(0,0,0,.07)'; g.fillRect(0, y, W, 1); } speckle(g, W, H, 900, 0.05); }
      if (!glow && o.shop) { g.fillStyle = o.shop; g.fillRect(0, H - H / rows, W, H / rows * 0.28); }
      if (!glow && o.bands) for (var r0 = 1; r0 < rows; r0++) { g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(0, r0 * H / rows - 2, W, 3); }
      var mx = W * (o.tight ? 0.1 : 0.24) / cols, my = H * (o.tight ? 0.16 : 0.36) / rows;
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
  // a flat sign with text (shop signs, neon, labels)
  var signCache = {};
  function signMat(text, bg, fg, glow, vertical) {
    var k = text + bg + fg + glow + vertical; if (signCache[k]) return signCache[k];
    var w = vertical ? 64 : 256, h = vertical ? 256 : 64;
    var tex = canvasTex(w, h, function (g) {
      g.fillStyle = bg; g.fillRect(0, 0, w, h);
      g.strokeStyle = fg; g.lineWidth = 3; g.strokeRect(4, 4, w - 8, h - 8);
      g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
      if (vertical) { var chars = Array.from(text), fs = Math.min(46, (h - 20) / chars.length); g.font = 'bold ' + fs + 'px "Noto Sans TC", sans-serif'; chars.forEach(function (ch, n) { g.fillText(ch, w / 2, 14 + fs / 2 + n * fs); }); }
      else { g.font = 'bold ' + Math.min(40, 360 / Math.max(4, text.length)) + 'px "Noto Sans TC", sans-serif'; g.fillText(text, w / 2, h / 2 + 2); }
    });
    var m = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: glow ? tex : null, emissive: glow ? new THREE.Color('#ffffff') : new THREE.Color('#000000'), emissiveIntensity: glow ? 0.3 : 0, roughness: 0.6 });
    if (glow) nightMats.push(m);
    return (signCache[k] = m);
  }
  var TEX = {
    grass: canvasTex(128, 128, function (g, w, h) { g.fillStyle = '#6ea851'; g.fillRect(0, 0, w, h); speckle(g, w, h, 2600, 0.12); for (var k = 0; k < 60; k++) { g.strokeStyle = 'rgba(40,90,30,.35)'; var x = Math.random() * w, y = Math.random() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 1, y - 4); g.stroke(); } }, [3, 3]),
    dirt: canvasTex(128, 128, function (g, w, h) { g.fillStyle = '#9c8a68'; g.fillRect(0, 0, w, h); speckle(g, w, h, 3000, 0.16); }, [2, 2]),
    asphalt: canvasTex(128, 128, function (g, w, h) { g.fillStyle = '#3d4148'; g.fillRect(0, 0, w, h); speckle(g, w, h, 3000, 0.18); }, [30, 30]),
    pave: canvasTex(128, 128, function (g, w, h) { g.fillStyle = '#c9c4ba'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(90,85,75,.35)'; g.lineWidth = 2; for (var k = 0; k <= 4; k++) { g.beginPath(); g.moveTo(0, k * 32); g.lineTo(w, k * 32); g.stroke(); g.beginPath(); g.moveTo(k * 32, 0); g.lineTo(k * 32, h); g.stroke(); } speckle(g, w, h, 900, 0.06); }, [3, 3]),
    sand: canvasTex(64, 64, function (g, w, h) { g.fillStyle = '#e3cf9c'; g.fillRect(0, 0, w, h); speckle(g, w, h, 800, 0.12); }, [20, 20]),
    wood: canvasTex(128, 128, function (g, w, h) { for (var y = 0; y < h; y += 16) { g.fillStyle = y / 16 % 2 ? '#b98a5a' : '#a97a4c'; g.fillRect(0, y, w, 16); g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(0, y, w, 1); } speckle(g, w, h, 600, 0.06); }, [4, 4]),
    tile: canvasTex(128, 128, function (g, w, h) { for (var y = 0; y < 4; y++) for (var x = 0; x < 4; x++) { g.fillStyle = (x + y) % 2 ? '#e9e6df' : '#dcd8cf'; g.fillRect(x * 32, y * 32, 32, 32); } speckle(g, w, h, 400, 0.04); }, [6, 6]),
    carpet: canvasTex(64, 64, function (g, w, h) { g.fillStyle = '#5a6e8a'; g.fillRect(0, 0, w, h); speckle(g, w, h, 900, 0.1); }, [8, 8])
  };

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
  function roofStuff(g, w, d, y) {
    cyl(0.45, 0.45, 0.9, '#c9ccd1', g, w * 0.25, y, -d * 0.2, 12);
    mesh(boxG(0.7, 0.45, 0.5), M('#d9dbde'), -w * 0.2, y + 0.22, d * 0.15, g);
  }
  var TREE_G = { trunk: new THREE.CylinderGeometry(0.12, 0.18, 1.4, 7), leaf: new THREE.IcosahedronGeometry(0.9, 1), pine: new THREE.ConeGeometry(0.9, 2.2, 8), palm: new THREE.ConeGeometry(0.15, 1.2, 4) };
  function tree(parent, x, z, s, kind) {
    var g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s || 1); parent.add(g);
    mesh(TREE_G.trunk, M('#6e4b2e'), 0, 0.7, 0, g);
    var k = kind || (hash(x * 3.1, z * 1.7) < 0.35 ? 'pine' : 'round');
    if (k === 'pine') { mesh(TREE_G.pine, M('#3f7f4f'), 0, 2.0, 0, g); mesh(TREE_G.pine, M('#4a915a'), 0, 2.8, 0, g).scale.setScalar(0.7); }
    else { mesh(TREE_G.leaf, M('#4f8f4a'), 0, 2.1, 0, g); mesh(TREE_G.leaf, M('#5fa257'), 0.35, 2.6, 0.2, g).scale.setScalar(0.7); mesh(TREE_G.leaf, M('#477f42'), -0.4, 2.4, -0.2, g).scale.setScalar(0.65); }
    return g;
  }
  function bench(parent, x, z, ry) {
    var g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry || 0; parent.add(g);
    mesh(boxG(1.2, 0.08, 0.38), M('#8a6038'), 0, 0.45, 0, g); mesh(boxG(1.2, 0.35, 0.06), M('#8a6038'), 0, 0.68, -0.18, g);
    [-0.5, 0.5].forEach(function (lx) { mesh(boxG(0.06, 0.45, 0.36), M('#3a3a3a'), lx, 0.22, 0, g); });
    return g;
  }

  /* ---------- people ---------- */
  var geoCache = {};
  function limbGeo(rt, rb, len) {
    var k = rt + ',' + rb + ',' + len; if (geoCache[k]) return geoCache[k];
    var pts = [], n = 5, a;
    for (a = 0; a <= n; a++) { var t1 = a / n * Math.PI / 2; pts.push(new THREE.Vector2(Math.sin(t1) * rb, -len + rb - Math.cos(t1) * rb)); }
    for (a = n; a >= 0; a--) { var t2 = a / n * Math.PI / 2; pts.push(new THREE.Vector2(Math.sin(t2) * rt, -rt + Math.cos(t2) * rt)); }
    return (geoCache[k] = new THREE.LatheGeometry(pts, 14));
  }
  function latheG(prof, key) { if (geoCache[key]) return geoCache[key]; return (geoCache[key] = new THREE.LatheGeometry(prof.map(function (p) { return new THREE.Vector2(p[0], p[1]); }), 18)); }
  var TORSO = latheG([[0, 0.7], [0.125, 0.705], [0.135, 0.76], [0.13, 0.82], [0.145, 0.88], [0.165, 0.97], [0.17, 1.04], [0.14, 1.09], [0.06, 1.115], [0, 1.12]], 't3');
  var PELVIS = latheG([[0, 0.63], [0.1, 0.64], [0.14, 0.69], [0.135, 0.75], [0, 0.76]], 'p3');
  var faceCache = {};
  function faceMat(skin, hair, fem, eye) {
    var k = skin + hair + fem + eye; if (faceCache[k]) return faceCache[k];
    var tex = canvasTex(512, 256, function (g, W, H) {
      g.fillStyle = skin; g.fillRect(0, 0, W, H);
      var cx = W * 0.25, ey = H * 0.5;
      var sh = g.createRadialGradient(cx, ey + 10, 10, cx, ey + 10, 90); sh.addColorStop(0, 'rgba(255,255,255,.08)'); sh.addColorStop(1, 'rgba(0,0,0,.08)');
      g.fillStyle = sh; g.fillRect(cx - 100, 0, 200, H);
      g.fillStyle = 'rgba(0,0,0,.07)'; g.beginPath(); g.ellipse(cx + 4, ey + 30, 7, 16, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(225,120,110,' + (fem ? 0.25 : 0.12) + ')'; [-34, 34].forEach(function (dx) { g.beginPath(); g.ellipse(cx + dx, ey + 36, 15, 9, 0, 0, Math.PI * 2); g.fill(); });
      [-22, 22].forEach(function (dx) {
        var ex = cx + dx;
        g.fillStyle = 'rgba(0,0,0,.08)'; g.beginPath(); g.ellipse(ex, ey + 1, 14, 9, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#fbf7f2'; g.beginPath(); g.ellipse(ex, ey + 3, 11.5, 6.6, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = eye || '#4a3326'; g.beginPath(); g.arc(ex, ey + 3, 5.8, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#120c09'; g.beginPath(); g.arc(ex, ey + 3, 2.8, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(255,255,255,.95)'; g.beginPath(); g.arc(ex + 1.8, ey + 1, 1.5, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#2a1a12'; g.lineWidth = fem ? 2.6 : 1.8; g.beginPath(); g.ellipse(ex, ey + 3, 11.5, 6.6, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
        if (fem) for (var l = -2; l <= 2; l++) { g.beginPath(); g.moveTo(ex + l * 4 + (dx > 0 ? 2 : -2), ey - 3); g.lineTo(ex + l * 5 + (dx > 0 ? 4 : -4), ey - 7); g.stroke(); }
        g.strokeStyle = hair; g.lineWidth = fem ? 3.2 : 5; g.lineCap = 'round';
        g.beginPath(); g.moveTo(ex - 13, ey - 9 + (dx < 0 ? 1 : 0)); g.quadraticCurveTo(ex - 2, ey - 16, ex + 13, ey - 10); g.stroke();
      });
      g.fillStyle = fem ? '#c4566a' : '#b0705f';
      g.beginPath(); g.moveTo(cx - 12, ey + 54); g.quadraticCurveTo(cx, ey + 49, cx + 12, ey + 54); g.quadraticCurveTo(cx, ey + 62, cx - 12, ey + 54); g.fill();
      g.strokeStyle = 'rgba(80,30,25,.5)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(cx - 12, ey + 54); g.quadraticCurveTo(cx, ey + 56, cx + 12, ey + 54); g.stroke();
    });
    return (faceCache[k] = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55 }));
  }
  var SPHERE = function (r, w, h) { var k = 's' + r + w + h; return geoCache[k] || (geoCache[k] = new THREE.SphereGeometry(r, w || 14, h || 10)); };
  function human(look) {
    var g = new THREE.Group(), rootG = new THREE.Group(), body = new THREE.Group(), p = {};
    g.add(rootG); rootG.add(body);
    var skin = M(look.skin, { roughness: 0.5 }), top = M(look.top, { roughness: 0.82 }), bottom = M(look.bottom, { roughness: 0.88 }), shoeM = M(look.shoes, { roughness: 0.4 });
    function joint(parent, x, y, z) { var j = new THREE.Group(); j.position.set(x, y, z || 0); parent.add(j); return j; }
    [-1, 1].forEach(function (s) {
      var hip = joint(rootG, s * 0.085, 0.7), knee;
      mesh(limbGeo(0.08, 0.06, 0.33), bottom, 0, 0, 0, hip);
      knee = joint(hip, 0, -0.31);
      mesh(limbGeo(0.058, 0.043, 0.32), look.skirt ? skin : bottom, 0, 0, 0, knee);
      var shoe = mesh(SPHERE(0.06), shoeM, 0, -0.32, 0.04, knee); shoe.scale.set(0.95, 0.62, 2.0);
      mesh(boxG(0.1, 0.025, 0.22), M('#222', { roughness: 0.9 }), 0, -0.355, 0.03, knee);
      p[s < 0 ? 'hipL' : 'hipR'] = hip; p[s < 0 ? 'kneeL' : 'kneeR'] = knee;
    });
    mesh(PELVIS, bottom, 0, 0, 0, body).scale.z = 0.72;
    mesh(TORSO, top, 0, 0, 0, body).scale.z = 0.64;
    if (look.jacket) {
      var lap = M(shadeHex(look.top, -0.25));
      [-1, 1].forEach(function (s) { var l = mesh(boxG(0.05, 0.22, 0.012), lap, s * 0.045, 0.97, 0.104, body); l.rotation.z = -s * 0.32; });
      mesh(new THREE.CylinderGeometry(0.15, 0.16, 0.12, 16, 1, true), top, 0, 0.72, 0, body).scale.z = 0.72;
    }
    if (look.shirt) { var col = mesh(new THREE.ConeGeometry(0.06, 0.17, 3), M(look.shirt), 0, 1.0, 0.09, body); col.rotation.x = Math.PI; mesh(boxG(0.032, 0.2, 0.02), M(look.tie || '#a8322e'), 0, 0.9, 0.108, body); }
    if (!look.jacket && !look.coat) mesh(new THREE.TorusGeometry(0.135, 0.016, 6, 22), M('#2b2b2b'), 0, 0.755, 0, body).rotation.x = Math.PI / 2;
    if (look.coat) mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.46, 16, 1, true), M(look.top, { side: THREE.DoubleSide }), 0, 0.5, 0, body).scale.z = 0.76;
    if (look.skirt) mesh(new THREE.CylinderGeometry(0.14, 0.22, 0.32, 16, 1, true), M(look.bottom, { side: THREE.DoubleSide }), 0, 0.55, 0, body).scale.z = 0.8;
    if (look.dress) mesh(new THREE.CylinderGeometry(0.14, 0.3, 0.6, 18, 1, true), M(look.top, { side: THREE.DoubleSide }), 0, 0.42, 0, body).scale.z = 0.85;
    if (look.hood) mesh(new THREE.TorusGeometry(0.1, 0.045, 8, 16), top, 0, 1.08, -0.05, body).rotation.x = Math.PI / 2.3;
    [-1, 1].forEach(function (s) {
      var sh = joint(body, s * 0.19, 1.05), el;
      mesh(SPHERE(0.065), top, 0, 0, 0, sh).scale.set(1, 0.9, 1);
      mesh(limbGeo(0.052, 0.044, 0.28), top, 0, 0, 0, sh);
      el = joint(sh, 0, -0.27);
      mesh(limbGeo(0.044, 0.034, 0.25), look.short ? skin : top, 0, 0, 0, el);
      if (!look.short) mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.03, 10), look.jacket ? M(look.shirt || '#fff') : top, 0, -0.235, 0, el);
      var hand = mesh(SPHERE(0.04), skin, 0, -0.28, 0.005, el); hand.scale.set(0.75, 1.25, 0.55);
      mesh(SPHERE(0.017), skin, s * -0.022, -0.262, 0.02, el).scale.set(1, 1.6, 1);
      p[s < 0 ? 'shL' : 'shR'] = sh; p[s < 0 ? 'elL' : 'elR'] = el;
    });
    mesh(new THREE.CylinderGeometry(0.043, 0.05, 0.09, 12), skin, 0, 1.13, 0, body);
    var head = new THREE.Group(); head.position.y = 1.24; body.add(head); p.head = head;
    var fem = !!(look.longHair || look.bun || look.fem);
    var skull = mesh(SPHERE(0.1, 28, 20), faceMat(look.skin, look.hair, fem, look.eye), 0, 0, 0, head); skull.scale.set(0.92, 1.16, 1.0);
    mesh(SPHERE(0.075, 18, 12), skin, 0, -0.055, 0.018, head).scale.set(0.95, 0.85, 1.0);
    mesh(SPHERE(0.017, 8, 6), skin, 0, -0.012, 0.098, head).scale.set(0.9, 1.3, 1.1);
    [-1, 1].forEach(function (s) { mesh(SPHERE(0.022, 8, 6), skin, s * 0.092, -0.005, -0.005, head).scale.set(0.45, 1.05, 0.8); });
    var hairM = M(look.hair, { roughness: 0.7 });
    if (!look.helmet) {
      if (look.bald) mesh(new THREE.SphereGeometry(0.104, 20, 12, Math.PI * 0.85, Math.PI * 1.3, Math.PI * 0.35, Math.PI * 0.25), hairM, 0, 0.005, -0.004, head).scale.set(0.94, 1.16, 1.03);
      else {
        mesh(new THREE.SphereGeometry(0.106, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.4), hairM, 0, 0.016, -0.004, head).scale.set(0.96, 1.2, 1.05);
        mesh(new THREE.SphereGeometry(0.105, 22, 12, Math.PI * 0.85, Math.PI * 1.3, 0, Math.PI * 0.64), hairM, 0, 0.01, -0.006, head).scale.set(0.95, 1.17, 1.04);
        if (look.side) { var q = mesh(SPHERE(0.05, 12, 8), hairM, 0.03, 0.105, 0.05, head); q.scale.set(1.5, 0.6, 1.1); }
        if (look.longHair) mesh(new THREE.CylinderGeometry(0.09, 0.115, 0.32, 16, 1, true, Math.PI * 0.25, Math.PI * 1.5), M(look.hair, { roughness: 0.7, side: THREE.DoubleSide }), 0, -0.13, -0.008, head);
        if (look.bun) mesh(SPHERE(0.05, 12, 8), hairM, 0, 0.08, -0.1, head);
      }
      if (look.grey) mesh(new THREE.SphereGeometry(0.107, 20, 12, Math.PI * 0.85, Math.PI * 1.3, Math.PI * 0.3, Math.PI * 0.2), M('#c8c8c8'), 0, 0.01, -0.006, head).scale.set(0.95, 1.17, 1.04);
    }
    if (look.cap) { mesh(new THREE.SphereGeometry(0.11, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), M(look.cap), 0, 0.035, 0, head).scale.set(1, 1.1, 1.05); mesh(boxG(0.15, 0.012, 0.11), M(look.cap), 0, 0.04, 0.11, head); }
    if (look.glasses) {
      var gm = M('#151515', { roughness: 0.3 });
      [-0.037, 0.037].forEach(function (x) { mesh(new THREE.TorusGeometry(0.024, 0.0045, 6, 18), gm, x, 0.012, 0.1, head, true); });
      mesh(boxG(0.022, 0.004, 0.004), gm, 0, 0.016, 0.102, head, true);
    }
    if (look.helmet) {
      mesh(SPHERE(0.16, 22, 16), M('#f4f6f8', { roughness: 0.3 }), 0, 0.01, 0, head);
      mesh(new THREE.SphereGeometry(0.135, 20, 12, -Math.PI / 2.4, Math.PI / 1.2, Math.PI / 3, Math.PI / 3), M('#c9a35b', { metalness: 0.85, roughness: 0.12 }), 0, 0.01, 0.05, head);
      mesh(boxG(0.24, 0.3, 0.12), M('#d9dde2'), 0, 0.86, -0.15, body);
    }
    g.userData = { p: p, body: body, root: rootG, phase: Math.random() * 6, breath: Math.random() * 6, pose: null, air: false };
    return g;
  }
  // poses for cutscenes; h.userData.pose = 'cheer' etc. h.userData.air = true while jumping
  function animateHuman(h, speed, dt) {
    var u = h.userData, p = u.p, k = Math.min(1, dt * 12), t = performance.now() / 1000;
    var moving = speed > 0.05 && !u.pose;
    if (moving) u.phase += dt * (4 + speed * 2.2);
    u.breath += dt;
    var ph = u.phase, amp = moving ? Math.min(0.8, 0.35 + speed * 0.1) : 0;
    var tg = { hipL: [0, 0], hipR: [0, 0], kneeL: 0, kneeR: 0, shL: [0, -0.07], shR: [0, 0.07], elL: -0.18, elR: -0.18, head: [0, 0], by: 0, bx: 0, drop: 0 };
    if (moving) {
      tg.hipL[0] = Math.sin(ph) * amp; tg.hipR[0] = -Math.sin(ph) * amp;
      tg.kneeL = Math.max(0, -Math.sin(ph - 0.9)) * amp * 1.4; tg.kneeR = Math.max(0, Math.sin(ph - 0.9)) * amp * 1.4;
      tg.shL[0] = -Math.sin(ph) * amp * 0.8; tg.shR[0] = Math.sin(ph) * amp * 0.8;
      tg.elL = -0.25 - Math.max(0, Math.sin(ph)) * amp * 0.6; tg.elR = -0.25 - Math.max(0, -Math.sin(ph)) * amp * 0.6;
      tg.by = Math.abs(Math.cos(ph)) * 0.035; tg.bx = Math.min(0.12, speed * 0.018);
    }
    var pose = u.air ? 'jump' : u.pose;
    switch (pose) {
      case 'jump': tg.hipL[0] = -0.7; tg.hipR[0] = -0.3; tg.kneeL = 1.2; tg.kneeR = 0.6; tg.shL = [-0.5, -0.7]; tg.shR = [-0.5, 0.7]; tg.elL = tg.elR = -0.7; break;
      case 'cheer': tg.shL = [0, -2.7]; tg.shR = [0, 2.7]; tg.elL = tg.elR = -0.2; tg.by = Math.abs(Math.sin(t * 7)) * 0.08; break;
      case 'clap': tg.shL = [-1.1, 0.35 + Math.sin(t * 14) * 0.18]; tg.shR = [-1.1, -0.35 - Math.sin(t * 14) * 0.18]; tg.elL = tg.elR = -0.9; break;
      case 'wave': tg.shR = [-0.2, 2.5]; tg.elR = -0.6 + Math.sin(t * 9) * 0.45; break;
      case 'talk': tg.shR = [-0.5, 0.15]; tg.elR = -1.0 + Math.sin(t * 4) * 0.25; tg.shL = [-0.2, -0.15]; tg.elL = -0.6; tg.head = [Math.sin(t * 5) * 0.08, Math.sin(t * 2) * 0.1]; break;
      case 'point': tg.shR = [-1.5, 0.1]; tg.elR = 0; break;
      case 'hug': tg.shL = [-1.3, 0.4]; tg.shR = [-1.3, -0.4]; tg.elL = tg.elR = -0.9; break;
      case 'cry': tg.shL = [-1.0, 0.25]; tg.shR = [-1.0, -0.25]; tg.elL = tg.elR = -2.1; tg.head = [0.35, 0]; tg.bx = 0.12 + Math.sin(t * 9) * 0.02; break;
      case 'sad': tg.head = [0.4, 0]; tg.bx = 0.1; tg.shL = [0.1, -0.05]; tg.shR = [0.1, 0.05]; break;
      case 'laugh': tg.shL = [-0.45, 0.2]; tg.shR = [-0.45, -0.2]; tg.elL = tg.elR = -1.5; tg.bx = -0.15 + Math.sin(t * 16) * 0.05; tg.head = [-0.25, 0]; break;
      case 'sit': tg.hipL = [-1.55, 0.05]; tg.hipR = [-1.55, -0.05]; tg.kneeL = tg.kneeR = 1.55; tg.drop = 0.3; tg.shL = [-0.5, -0.05]; tg.shR = [-0.5, 0.05]; tg.elL = tg.elR = -0.6; break;
      case 'type': tg.hipL = [-1.55, 0.05]; tg.hipR = [-1.55, -0.05]; tg.kneeL = tg.kneeR = 1.55; tg.drop = 0.3; tg.shL = [-0.85, 0.1]; tg.shR = [-0.85, -0.1]; tg.elL = -0.9 + Math.sin(t * 20) * 0.05; tg.elR = -0.9 + Math.cos(t * 23) * 0.05; tg.head = [0.2, 0]; break;
      case 'bell': tg.shR = [-2.4 + Math.max(0, Math.sin(t * 6)) * 0.9, 0.2]; tg.elR = -0.3; tg.shL = [0, -0.4]; break;
      case 'bow': tg.bx = 0.55; tg.shL = [0.4, -0.05]; tg.shR = [0.4, 0.05]; break;
      case 'lookup': tg.head = [-0.6, 0]; tg.bx = -0.1; break;
      case 'phone': tg.shR = [-0.6, 0.35]; tg.elR = -2.3; tg.head = [0.1, 0.2]; break;
      case 'think': tg.shR = [-0.7, -0.2]; tg.elR = -2.0; tg.shL = [-0.4, 0.3]; tg.elL = -1.4; tg.head = [0.15, -0.2]; break;
      case 'kneel': tg.hipL = [-1.5, 0]; tg.kneeL = 1.5; tg.hipR = [0.2, 0]; tg.kneeR = 1.6; tg.drop = 0.3; tg.shR = [-1.4, 0]; tg.elR = -0.4; break;
      case 'dance': tg.shL = [0, -1.8 + Math.sin(t * 6) * 0.6]; tg.shR = [0, 1.8 + Math.sin(t * 6) * 0.6]; tg.hipL[0] = Math.sin(t * 6) * 0.3; tg.hipR[0] = -Math.sin(t * 6) * 0.3; tg.by = Math.abs(Math.sin(t * 6)) * 0.05; break;
      case 'salute': tg.shR = [-0.4, 1.4]; tg.elR = -2.2; break;
    }
    if (!moving && !pose) { tg.by = Math.sin(u.breath * 2) * 0.004; }
    function to2(o, v) { o.rotation.x += (v[0] - o.rotation.x) * k; o.rotation.z += (v[1] - o.rotation.z) * k; }
    to2(p.hipL, tg.hipL); to2(p.hipR, tg.hipR);
    p.kneeL.rotation.x += (tg.kneeL - p.kneeL.rotation.x) * k; p.kneeR.rotation.x += (tg.kneeR - p.kneeR.rotation.x) * k;
    to2(p.shL, tg.shL); to2(p.shR, tg.shR);
    p.elL.rotation.x += (tg.elL - p.elL.rotation.x) * k; p.elR.rotation.x += (tg.elR - p.elR.rotation.x) * k;
    p.head.rotation.x += (tg.head[0] - p.head.rotation.x) * k; p.head.rotation.y += (tg.head[1] - p.head.rotation.y) * k;
    u.body.position.y += (tg.by - u.body.position.y) * k; u.body.rotation.x += (tg.bx - u.body.rotation.x) * k;
    u.root.position.y += (-tg.drop - u.root.position.y) * k;
    u.body.rotation.y = moving ? Math.sin(ph) * 0.06 : u.body.rotation.y * (1 - k);
  }

  /* ---------- vehicles ---------- */
  function makeCar(col, o) {
    o = o || {};
    var g = new THREE.Group();
    mesh(boxG(1.7, 0.55, 3.6), M(col, { metalness: 0.5, roughness: 0.35 }), 0, 0.55, 0, g);
    mesh(boxG(1.5, 0.5, 1.9), M('#1e2b38', { metalness: 0.6, roughness: 0.15 }), 0, 1.05, -0.2, g);
    if (o.taxi) mesh(boxG(0.55, 0.16, 0.28), o.taxiSign ? signMat(o.taxiSign, '#fff2c0', '#222', true) : glowMat('#ffe9a8', 0.4, true), 0, 1.38, -0.2, g, true);
    var wg = new THREE.CylinderGeometry(0.33, 0.33, 0.25, 14);
    [[-0.85, 1.15], [0.85, 1.15], [-0.85, -1.15], [0.85, -1.15]].forEach(function (w) { mesh(wg, M('#151515'), w[0], 0.33, w[1], g).rotation.z = Math.PI / 2; });
    var hl = glowMat('#fff2b0', 0.3, true);
    [-0.55, 0.55].forEach(function (x) { mesh(boxG(0.3, 0.15, 0.05), hl, x, 0.62, 1.81, g, true); mesh(boxG(0.3, 0.15, 0.05), glowMat('#ff3030', 0.6), x, 0.62, -1.81, g, true); });
    return g;
  }
  function makeBus(col) { // a double-decker city bus
    var g = new THREE.Group();
    mesh(boxG(2.1, 3.0, 8.0), [M(col), M(col), M('#f2f2f2'), M(col), M(col), M(col)], 0, 1.85, 0, g);
    var win = M('#22303f', { metalness: 0.5, roughness: 0.2 });
    [-1.06, 1.06].forEach(function (x) { mesh(boxG(0.02, 0.6, 7.2), win, x, 1.55, 0, g, true); mesh(boxG(0.02, 0.6, 7.2), win, x, 2.75, 0, g, true); });
    mesh(boxG(1.9, 1.5, 0.02), win, 0, 2.2, 4.01, g, true);
    var wg = new THREE.CylinderGeometry(0.45, 0.45, 0.3, 14);
    [[-0.95, 2.8], [0.95, 2.8], [-0.95, -2.6], [0.95, -2.6]].forEach(function (w) { mesh(wg, M('#151515'), w[0], 0.45, w[1], g).rotation.z = Math.PI / 2; });
    return g;
  }

  return { THREE: THREE, TOUCH: TOUCH, hash: hash, M: M, canvasTex: canvasTex, speckle: speckle, shadeHex: shadeHex, glowMat: glowMat, nightMats: nightMats,
    facade: facade, signMat: signMat, TEX: TEX, mesh: mesh, boxG: boxG, fbox: fbox, gable: gable, pyramid: pyramid, cyl: cyl, roofStuff: roofStuff,
    tree: tree, bench: bench, human: human, animateHuman: animateHuman, makeCar: makeCar, makeBus: makeBus, SPHERE: SPHERE };
})();
