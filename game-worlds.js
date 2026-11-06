/* 《交叉點》 worlds: Hong Kong, New York, building interiors, the Moon, Mars and travel scenes.
   Each builder returns a world object the engine (game.js) can load. */
window.DRW = (function () {
  'use strict';
  var K = window.DRK; if (!K) return null;
  var THREE = K.THREE, M = K.M, mesh = K.mesh, boxG = K.boxG, fbox = K.fbox, gable = K.gable, cyl = K.cyl, facade = K.facade, glowMat = K.glowMat, hash = K.hash, tree = K.tree, bench = K.bench, signMat = K.signMat, TEX = K.TEX, TOUCH = K.TOUCH;

  /* ======================================================================
     Story buildings (inside a 6 × 6 lot, front door facing +z)
     ====================================================================== */
  function door(g, w, z, col) { mesh(boxG(1.1, 2.1, 0.12), M(col || '#5b3a26'), 0, 1.05, z, g); mesh(boxG(1.5, 0.12, 0.6), M('#9a948a'), 0, 0.06, z + 0.3, g); }
  function label(g, text, y, z, w, bg, fg, glow) { var m = mesh(boxG(w || 2.4, 0.6, 0.06), signMat(text, bg || '#1f3557', fg || '#f4e3b5', glow !== false), 0, y, z, g, true); return m; }
  var B = {
    home: function (g) {
      fbox(3.6, 2.8, 3.2, facade({ base: '#efe2c6', cols: 3, rows: 2, lit: 0.7, glass: '#7ea2c4' }), '#b84d3a', g);
      gable(4.0, 3.6, 1.7, '#a8432f', g, 2.8); door(g, 3.6, 1.6);
      cyl(0.22, 0.22, 1.2, '#7a3a2a', g, 1.1, 3.2, -0.6, 8);
      for (var k = 0; k < 2; k++) mesh(K.SPHERE(0.35, 10, 8), M('#4f8f4a'), -1.3 + k * 2.6, 0.3, 2.0, g);
    },
    school: function (g, A) {
      fbox(5, 3.6, 3.4, facade({ base: '#e8c56a', cols: 5, rows: 2, lit: 0.4, brick: true }), '#9b8a62', g);
      mesh(boxG(5.2, 0.35, 3.6), M('#c7a352'), 0, 3.75, 0, g); door(g, 5, 1.7, '#3d6f7d'); label(g, '學校 SCHOOL', 2.9, 1.75, 2.4, '#ffffff', '#1f3557', false);
      cyl(0.05, 0.05, 4.2, '#bbbbbb', g, -2.2, 3.9, -1.2, 8);
      var flag = mesh(boxG(1.1, 0.7, 0.03), M('#d6453d'), -1.65, 7.7, -1.2, g);
      A.push(function (t) { flag.rotation.y = Math.sin(t * 2.4 + 1) * 0.25; flag.position.x = -2.2 + Math.cos(flag.rotation.y) * 0.55; });
    },
    library: function (g) {
      fbox(4.4, 3.2, 3.6, facade({ base: '#a9c9c4', cols: 4, rows: 2, lit: 0.5, frame: '#e9efe9' }), '#3d6f7d', g);
      gable(4.8, 4.0, 1.5, '#365f6b', g, 3.2); door(g, 4.4, 1.8); label(g, '圖書館 LIBRARY', 2.75, 1.85, 2.6, '#f3efe6', '#365f6b', false);
      for (var k = 0; k < 4; k++) cyl(0.16, 0.16, 3.2, '#f3efe6', g, -1.5 + k, 0, 2.2, 12);
    },
    rooftop: function (g, A) {
      fbox(2.8, 6, 2.8, facade({ base: '#d8d2c4', cols: 2, rows: 5, lit: 0.6, ac: true }), '#8d8a80', g); door(g, 2.8, 1.4);
      mesh(new THREE.SphereGeometry(1.25, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M('#9db3cf', { metalness: 0.4, roughness: 0.35 }), 0, 6, 0, g);
      var tel = cyl(0.14, 0.2, 1.6, '#39465e', g, 0, 6.4, 0, 10); tel.rotation.z = -0.9;
      A.push(function (t) { tel.rotation.y = Math.sin(t * 0.3) * 0.8; });
    },
    studio: function (g) {
      fbox(3.8, 4.4, 3.4, facade({ base: '#4b78ad', cols: 4, rows: 4, lit: 0.85, glass: '#a7cdf2', frame: '#2c4a70', rough: 0.25, metal: 0.3 }), '#2c4a70', g);
      door(g, 3.8, 1.7, '#2c4a70'); mesh(boxG(1.8, 1.0, 0.1), M('#1d222c'), 0, 5.0, 0, g); mesh(boxG(1.6, 0.85, 0.02), glowMat('#4fb8ff', 0.8), 0, 5.0, 0.06, g);
    },
    restaurant: function (g) {
      fbox(4.4, 3.4, 3.6, facade({ base: '#f1e4c8', cols: 3, rows: 2, lit: 0.9, glass: '#ffe0a0', shop: '#b8302b' }), '#7a3a2a', g);
      door(g, 4.4, 1.8, '#7a2a22');
      var s = mesh(boxG(0.5, 2.2, 0.15), signMat('酒家', '#b8302b', '#ffe9a8', true, true), 1.9, 3.3, 1.9, g, true);
      label(g, '海景酒家', 2.85, 1.85, 2.6, '#b8302b', '#ffe9a8', true);
    },
    harbor: function (g, A) {
      mesh(boxG(5.6, 0.1, 5.6), M('#2f7ea5', { roughness: 0.2, metalness: 0.2 }), 0, 0.02, 0, g);
      for (var k = 0; k < 6; k++) mesh(boxG(5.6, 0.12, 0.35), M('#8a6038'), 0, 0.35, -2.4 + k * 0.4, g);
      var boat = new THREE.Group(); g.add(boat); boat.position.set(0.5, 0.25, 1.4);
      mesh(boxG(3.4, 0.6, 1.2), M('#1f3d63'), 0, 0.3, 0, boat); mesh(boxG(1.4, 0.7, 0.9), M('#f4f4f4'), -0.3, 0.95, 0, boat);
      for (var c = 0; c < 3; c++) mesh(boxG(0.6, 0.5, 0.8), M(['#d6453d', '#2a9d8f', '#e9c46a'][c]), 0.8 + c * 0.0, 0.85 + c * 0.0, 0, boat).position.x = 0.4 + c * 0.55;
      A.push(function (t) { boat.position.y = 0.25 + Math.sin(t * 1.6) * 0.06; boat.rotation.z = Math.sin(t * 1.3) * 0.03; });
      var crane = new THREE.Group(); crane.position.set(-2, 0, -1.6); g.add(crane);
      mesh(boxG(0.25, 4, 0.25), M('#e9a13b'), 0, 2, 0, crane); mesh(boxG(3, 0.2, 0.2), M('#e9a13b'), 1.2, 4, 0, crane);
    },
    store: function (g) {
      fbox(4.2, 2.8, 3.4, facade({ base: '#f5f2ea', cols: 3, rows: 1, lit: 0.95, glass: '#cfeaf6' }), '#2f9e6a', g);
      mesh(boxG(4.3, 0.45, 3.5), M('#2f9e6a'), 0, 2.6, 0, g); door(g, 4.2, 1.72, '#cfeaf6');
      label(g, '24小時便利店', 2.6, 1.78, 2.8, '#2f9e6a', '#ffffff', true);
    },
    factory: function (g, A) {
      fbox(5.2, 2.8, 3.8, facade({ base: '#cfd5dc', cols: 6, rows: 1, lit: 0.5, glass: '#7d93ab' }), '#9aa6b2', g);
      for (var k = 0; k < 3; k++) gable(1.7, 3.8, 1.0, '#8fb9d8', g, 2.8).position.x = -1.7 + k * 1.7;
      cyl(0.32, 0.4, 5.5, '#a65a42', g, 1.8, 0, -1.2, 14); door(g, 5.2, 1.92, '#4a5a6a');
      label(g, '防護用品廠', 2.35, 1.95, 2.4, '#ffffff', '#1f3d63', false);
      var puffs = [];
      for (var q = 0; q < 4; q++) puffs.push(mesh(K.SPHERE(0.45, 10, 8), new THREE.MeshStandardMaterial({ color: '#eef0f3', transparent: true, opacity: 0.7 }), 1.8, 5.5, -1.2, g, true));
      A.push(function (t) { puffs.forEach(function (p, n) { var u = (t * 0.25 + n / 4) % 1; p.position.set(1.8 + u * 1.5, 5.6 + u * 3, -1.2); p.scale.setScalar(0.6 + u * 1.6); p.material.opacity = 0.7 * (1 - u); }); });
    },
    tv: function (g, A) {
      fbox(4.4, 4.2, 3.6, facade({ base: '#e6e9ee', cols: 4, rows: 3, lit: 0.7, glass: '#7fa6c9' }), '#9aa6b2', g); door(g, 4.4, 1.82, '#2c4a70');
      label(g, '電視台 TV', 3.6, 1.85, 2.2, '#d6453d', '#ffffff', true);
      cyl(0.08, 0.12, 5, '#b9bec6', g, 1.3, 4.2, -0.8, 8);
      var dish = mesh(new THREE.SphereGeometry(0.9, 18, 10, 0, Math.PI * 2, 0, Math.PI / 3), M('#f2f2f2', { side: THREE.DoubleSide }), -1.2, 5, -0.6, g); dish.rotation.x = -1.0;
      var bl = mesh(K.SPHERE(0.12, 8, 8), glowMat('#ff2020', 1), 1.3, 9.3, -0.8, g, true);
      A.push(function (t) { bl.material.emissiveIntensity = Math.sin(t * 4) > 0 ? 1.4 : 0.1; });
    },
    university: function (g) {
      mesh(boxG(5.4, 0.4, 4.6), M('#cfc6b4'), 0, 0.2, 0, g);
      fbox(5, 3.8, 3.6, facade({ base: '#e8e0cf', cols: 5, rows: 2, lit: 0.5 }), '#b9ad94', g, 0.4); door(g, 5, 2.2);
      for (var k = 0; k < 6; k++) if (k !== 2 && k !== 3) cyl(0.17, 0.17, 3.8, '#fbf8f1', g, -2.1 + k * 0.84, 0.4, 2.3, 12);
      gable(5.2, 0.9, 1.0, '#e2d9c5', g, 4.2).position.z = 2.05;
      mesh(new THREE.SphereGeometry(1.2, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M('#3c6fa8', { metalness: 0.35, roughness: 0.4 }), 0, 4.5, -0.3, g);
      label(g, '大學 UNIVERSITY', 3.6, 2.3, 2.8, '#e2d9c5', '#3c6fa8', false);
    },
    airport: function (g, A) {
      fbox(5.4, 3.2, 3.8, facade({ base: '#dfe8ef', cols: 6, rows: 2, lit: 0.8, glass: '#9fd0ee', frame: '#9fb3c4', tight: true, rough: 0.25, metal: 0.3 }), '#c9d4df', g);
      var roof = mesh(new THREE.CylinderGeometry(3.2, 3.2, 4, 24, 1, true, -Math.PI / 2, Math.PI), M('#e9eef3', { side: THREE.DoubleSide, metalness: 0.4 }), 0, 2.2, 0, g); roof.rotation.z = Math.PI / 2; roof.scale.set(0.35, 1, 1);
      door(g, 5.4, 1.92, '#9fd0ee'); label(g, '機場 AIRPORT ✈', 2.7, 1.95, 2.8, '#1f3557', '#ffffff', true);
      var plane = makePlane(); plane.scale.setScalar(0.55); plane.position.set(0, 6.5, -0.5); g.add(plane);
      A.push(function (t) { plane.position.y = 6.5 + Math.sin(t) * 0.15; plane.rotation.z = Math.sin(t * 0.7) * 0.05; });
    },
    // ----- New York -----
    nyoffice: function (g, A) {
      mesh(boxG(5, 1.2, 5), M('#3a3d44'), 0, 0.6, 0, g);
      fbox(4.2, 24, 4.2, facade({ base: '#26405f', cols: 5, rows: 18, lit: 0.6, glass: '#5d88b4', frame: '#1a2c44', rough: 0.2, metal: 0.45, tight: true }), '#2b5285', g, 1.2);
      mesh(boxG(3.2, 2, 3.2), M('#c9a35b', { metalness: 0.6, roughness: 0.3 }), 0, 26.2, 0, g); cyl(0.06, 0.06, 4, '#c9a35b', g, 0, 27, 0, 6);
      door(g, 4.2, 2.15, '#9fd0ee'); label(g, 'DREAM TOWER', 1.6, 2.2, 2.6, '#1a2c44', '#e2c88f', true);
    },
    nyexchange: function (g, A) {
      mesh(boxG(5.6, 0.5, 5), M('#d8d2c4'), 0, 0.25, 0, g);
      fbox(5.2, 6, 4.2, facade({ base: '#e8e1d2', cols: 3, rows: 2, lit: 0.6, glass: '#8fb6d6' }), '#cfc6b4', g, 0.5);
      for (var k = 0; k < 6; k++) cyl(0.22, 0.25, 4.6, '#f4efe4', g, -2.2 + k * 0.88, 0.5, 2.45, 14);
      var ped = gable(5.6, 1.0, 1.3, '#efe8da', g, 5.6); ped.position.z = 2.35;
      mesh(boxG(5.6, 0.5, 1.1), M('#e8e1d2'), 0, 5.35, 2.35, g);
      door(g, 5.2, 2.15, '#3a2a1a');
      label(g, '證券交易所', 4.8, 2.95, 3.2, '#efe8da', '#3a3d44', false);
      var banner = mesh(boxG(2.8, 1.4, 0.04), glowMat('#1f3d63', 0.3, true), 0, 3.3, 2.75, g, true); banner.material = signMat('上市成功', '#1f3d63', '#e2c88f', true);
    },
    biolab: function (g, A) {
      fbox(4.4, 9.5, 3.8, facade({ base: '#4fa688', cols: 4, rows: 8, lit: 0.55, glass: '#9fe0c8', frame: '#2f7f68', rough: 0.3, metal: 0.3 }), '#2f7f68', g);
      door(g, 4.4, 1.92, '#9fe0c8'); label(g, 'AI 生物科技', 2.7, 1.95, 2.4, '#2f7f68', '#ffffff', true);
      var helix = new THREE.Group(); helix.position.set(0, 9.6, 0); g.add(helix);
      var ga = glowMat('#c9a35b', 0.4), wa = glowMat('#ffffff', 0.3), sg = K.SPHERE(0.12, 8, 6);
      for (var k = 0; k < 14; k++) { var a = k * 0.55, y = k * 0.22; mesh(sg, ga, Math.cos(a) * 0.7, y, Math.sin(a) * 0.7, helix, true); mesh(sg, wa, -Math.cos(a) * 0.7, y, -Math.sin(a) * 0.7, helix, true); }
      A.push(function (t) { helix.rotation.y = t * 0.7; });
    },
    nyschool: function (g, A) {
      fbox(5, 4.4, 3.8, facade({ base: '#b5654a', cols: 5, rows: 3, lit: 0.5, brick: true, frame: '#f2efe8' }), '#6a3a2a', g);
      door(g, 5, 1.92, '#2c3e50'); label(g, 'PUBLIC SCHOOL', 3.7, 1.95, 2.8, '#2c3e50', '#ffffff', false);
      var hs = new THREE.Shape(); hs.moveTo(0, -0.5); hs.bezierCurveTo(-1.1, 0.3, -0.5, 1.0, 0, 0.45); hs.bezierCurveTo(0.5, 1.0, 1.1, 0.3, 0, -0.5);
      var heart = mesh(new THREE.ExtrudeGeometry(hs, { depth: 0.25, bevelEnabled: false }), glowMat('#e2475b', 0.35), 0, 5.6, 0, g);
      A.push(function (t) { heart.rotation.y = t * 0.9; });
    },
    park: function (g, A) {
      mesh(new THREE.CylinderGeometry(1.0, 1.1, 0.4, 24), M('#cfd6dc'), 0, 0.2, -0.8, g);
      mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.05, 24), M('#5fb3d9', { roughness: 0.1, metalness: 0.3 }), 0, 0.42, -0.8, g);
      var jet = mesh(new THREE.CylinderGeometry(0.05, 0.2, 1.2, 8), new THREE.MeshStandardMaterial({ color: '#d8f2ff', transparent: true, opacity: 0.6 }), 0, 1.0, -0.8, g, true);
      A.push(function (t) { jet.scale.y = 0.8 + Math.sin(t * 6) * 0.15; });
      for (var k = 0; k < 7; k++) tree(g, Math.cos(k * 0.9) * 2.4, Math.sin(k * 0.9) * 2.3 - 0.4, 0.85, 'round');
      // a white arch for the wedding
      var arch = mesh(new THREE.TorusGeometry(1.2, 0.08, 8, 28, Math.PI), M('#ffffff'), 0, 0.2, 1.6, g); arch.position.y = 0.3;
      for (var f = 0; f < 10; f++) { var a = f / 9 * Math.PI; mesh(K.SPHERE(0.12, 8, 6), M(f % 2 ? '#f7a6b8' : '#ffffff'), Math.cos(a) * 1.2, 0.3 + Math.sin(a) * 1.2, 1.6, g); }
      [-1, 1].forEach(function (s) { bench(g, s * 1.8, 2.3, Math.PI); });
    },
    incubator: function (g, A) {
      fbox(4.6, 4.2, 4.0, facade({ base: '#ffd27a', cols: 4, rows: 3, lit: 0.85, glass: '#d8f0ff', frame: '#2b2b2b' }), '#2b2b2b', g);
      var d = mesh(boxG(1.4, 2.2, 0.12), glowMat('#ffcf6b', 0.5), 0, 1.1, 2.06, g, true);
      label(g, '創業中心 START HERE', 3.0, 2.06, 3.0, '#2b2b2b', '#ffd27a', true);
      A.push(function (t) { d.material.emissiveIntensity = 0.4 + Math.sin(t * 2) * 0.2; });
    },
    spaceport: function (g, A, W) {
      cyl(2.6, 2.8, 0.5, '#8a94a6', g, 0, 0, -0.4, 32);
      for (var k = 0; k < 4; k++) mesh(boxG(0.18, 10, 0.18), M('#d0473f'), -1.8 + (k % 2) * 0.9, 5, -2.2 + Math.floor(k / 2) * 0.9, g);
      for (var q = 0; q < 7; q++) mesh(boxG(1.1, 0.1, 1.1), M('#b8402f'), -1.35, 1 + q * 1.4, -1.75, g);
      var rk = makeRocket(); rk.position.set(0, 0.5, -0.4); g.add(rk); W.rocket = rk;
      label(g, 'SPACEPORT 太空港', 0.9, 2.3, 3.0, '#1f3557', '#ffffff', true);
    }
  };
  var DOORS = { home: 1.6, school: 1.7, library: 1.8, rooftop: 1.4, studio: 1.7, restaurant: 1.8, store: 1.72, factory: 1.92, tv: 1.82, university: 2.2, airport: 1.92, nyoffice: 2.15, nyexchange: 2.15, biolab: 1.92, nyschool: 1.92, incubator: 2.06, park: 2.4, spaceport: 2.4, harbor: 2.6 };
  var HEIGHT = { home: 4.6, school: 5, library: 5, rooftop: 8, studio: 5.4, restaurant: 4, harbor: 0, store: 3.4, factory: 6, tv: 9.5, university: 6, airport: 7.5, nyoffice: 30, nyexchange: 7.2, biolab: 12, nyschool: 6.5, incubator: 4.5, park: 0, spaceport: 12 };

  function makePlane() {
    var g = new THREE.Group(), w = M('#f4f6f8', { metalness: 0.3, roughness: 0.4 });
    var body = mesh(new THREE.CylinderGeometry(0.5, 0.5, 6, 18), w, 0, 0, 0, g); body.rotation.x = Math.PI / 2;
    mesh(K.SPHERE(0.5, 16, 10), w, 0, 0, 3, g).scale.set(1, 1, 1.4);
    var tail = mesh(new THREE.ConeGeometry(0.5, 1.4, 18), w, 0, 0.1, -3.6, g); tail.rotation.x = -Math.PI / 2;
    mesh(boxG(7, 0.1, 1.3), w, 0, -0.15, 0.2, g); mesh(boxG(2.4, 0.08, 0.7), w, 0, 0.1, -3.4, g);
    mesh(boxG(0.08, 1.2, 0.9), M('#1f3d63'), 0, 0.7, -3.5, g);
    [-1.8, 1.8].forEach(function (x) { var e = mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.9, 14), M('#9aa3ad'), x, -0.45, 0.6, g); e.rotation.x = Math.PI / 2; });
    mesh(boxG(0.04, 0.2, 5), M('#1f3d63'), 0.51, 0.1, 0, g, true);
    return g;
  }
  function makeRocket() {
    var rk = new THREE.Group();
    cyl(0.6, 0.6, 6.5, '#f5f5f5', rk, 0, 0.6, 0, 24, { roughness: 0.4 });
    mesh(new THREE.ConeGeometry(0.6, 1.6, 24), M('#d0473f'), 0, 7.9, 0, rk);
    cyl(0.62, 0.62, 0.35, '#1f3d63', rk, 0, 4.6, 0, 24);
    mesh(K.SPHERE(0.14, 10, 8), glowMat('#7fd0ff', 0.4), 0, 5.6, 0.58, rk, true);
    for (var f = 0; f < 4; f++) { var fin = mesh(boxG(0.08, 1.3, 0.8), M('#d0473f'), 0, 1.2, 0, rk); fin.rotation.y = f * Math.PI / 2; fin.translateZ(0.75); }
    var flame = mesh(new THREE.ConeGeometry(0.45, 2.4, 16), new THREE.MeshBasicMaterial({ color: '#ffb347', transparent: true, opacity: 0.9 }), 0, -0.6, 0, rk, true);
    flame.rotation.x = Math.PI; flame.visible = false; rk.userData.flame = flame;
    return rk;
  }

  /* ======================================================================
     City (Hong Kong or New York)
     ====================================================================== */
  var P = 9, LOT = 6, ROAD = P - LOT;
  var HK_SIGNS = ['茶餐廳', '藥房', '金行', '涼茶', '冰室', '士多', '書局', '麵家', '糖水', '海味', '眼鏡', '電器'];
  var HK_COLS = ['#d9cfc0', '#c8d3dc', '#e6d7c3', '#b9c4b0', '#d7c0b8', '#cfd8e3', '#ede4d3', '#c4bfb6', '#e3c9b0'];
  var NY_COLS = ['#8a5a44', '#9c6b4f', '#7b8794', '#c9c2b2', '#a3a8ad', '#5f6b78', '#b8a48a'];
  function city(style, opts) {
    var W = { id: style, style: style, group: new THREE.Group(), anims: [], gravity: 22, sea: true, P: P, LOT: LOT };
    var G = W.group, lots = {}, bMeshes = [], roadGroup = new THREE.Group(), lotGroup = new THREE.Group(), bGroup = new THREE.Group(), deco = new THREE.Group();
    G.add(roadGroup); G.add(lotGroup); G.add(bGroup); G.add(deco);
    var bounds = opts.bounds.slice(), prevBounds = bounds.slice(), fixed = opts.fixed, S = opts.state; // S.buildings: [{i,j,type}] for built-by-player
    W.env = style === 'hk' ? { sky: ['#3f86c9', '#d6ecf7'], fog: [70, 260], hemi: 0.75, sun: 1.6 } : { sky: ['#4f7fae', '#e4e9ee'], fog: [60, 230], hemi: 0.7, sun: 1.5 };
    function inB(bd, i, j) { return i >= bd[0] && i <= bd[1] && j >= bd[2] && j <= bd[3]; }
    function fixedAt(i, j) { for (var k in fixed) if (fixed[k][0] === i && fixed[k][1] === j) return k; return null; }
    function builtAt(i, j) { for (var k = 0; k < S.buildings.length; k++) { var b = S.buildings[k]; if (b.world === style && b.i === i && b.j === j) return b.type; } return null; }
    function storyAt(i, j) { return fixedAt(i, j) || builtAt(i, j); }
    function vacant(i, j) { if (storyAt(i, j)) return false; if (style === 'ny') return hash(i * 1.7, j * 0.9) < 0.18; if (Math.max(Math.abs(i), Math.abs(j)) <= 1) return true; return hash(i * 1.3, j * 0.7) < 0.36; }
    W.island = function (bd) { bd = bd || bounds; return { x0: (bd[0] - 0.5) * P - ROAD / 2, x1: (bd[1] + 0.5) * P + ROAD / 2, z0: (bd[2] - 0.5) * P - ROAD / 2, z1: (bd[3] + 0.5) * P + ROAD / 2 }; };
    W.bounds = function () { var I = W.island(); return { x0: I.x0 + 0.4, x1: I.x1 - 0.4, z0: I.z0 + 0.4, z1: I.z1 - 0.4 }; };
    W.freeLots = function () { var o = []; for (var i = bounds[0]; i <= bounds[1]; i++) for (var j = bounds[2]; j <= bounds[3]; j++) if (vacant(i, j)) o.push([i, j]); return o; };
    W.lotOf = function (x, z) { var i = Math.round(x / P), j = Math.round(z / P); if (Math.abs(x - i * P) > LOT / 2 || Math.abs(z - j * P) > LOT / 2) return null; return inB(bounds, i, j) ? { i: i, j: j } : null; };
    W.isVacant = function (i, j) { return inB(bounds, i, j) && vacant(i, j); };
    W.groundY = function (x, z) { return W.lotOf(x, z) ? 0.19 : 0.01; };

    var asphMat = new THREE.MeshStandardMaterial({ map: TEX.asphalt.clone(), bumpMap: TEX.asphaltBump.clone(), bumpScale: 0.04, roughness: 0.9 }); asphMat.map.needsUpdate = true; asphMat.bumpMap.needsUpdate = true;
    var sandMat = new THREE.MeshStandardMaterial({ map: TEX.sand, roughness: 1 }), paveMat = new THREE.MeshStandardMaterial({ map: TEX.pave, bumpMap: TEX.paveBump, bumpScale: 0.03, roughness: 0.85 });
    var grassMat = new THREE.MeshStandardMaterial({ map: TEX.grass, roughness: 1 }), dirtMat = new THREE.MeshStandardMaterial({ map: TEX.dirt, roughness: 1 });
    var lampMat = glowMat('#ffd9a0', 0, true); lampMat.color.set('#fff4d6');
    W.lights = { red: glowMat('#ff3b30', 1), amber: glowMat('#ffb020', 0.1), green: glowMat('#2bd46a', 0.1) };
    function inst(geo, mat, list, shadow) {
      var m = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length)), o = new THREE.Object3D();
      list.forEach(function (p, n) { o.position.set(p[0], p[1], p[2]); o.rotation.set(0, p[3] || 0, 0); o.updateMatrix(); m.setMatrixAt(n, o.matrix); });
      m.count = list.length; m.castShadow = !!shadow; m.receiveShadow = true; roadGroup.add(m); return m;
    }
    function buildGround() {
      while (roadGroup.children.length) roadGroup.remove(roadGroup.children[0]);
      var I = W.island(), w = I.x1 - I.x0, d = I.z1 - I.z0, cx = (I.x0 + I.x1) / 2, cz = (I.z0 + I.z1) / 2;
      var sd = M('#b8a07a');
      if (style === 'hk') mesh(boxG(w + 8, 1, d + 8), [sd, sd, sandMat, sd, sd, sd], cx, -0.62, cz, roadGroup).castShadow = false;
      else { mesh(boxG(w + 8, 1.4, d + 8), M('#7d7a73'), cx, -0.8, cz, roadGroup).castShadow = false; }
      asphMat.map.repeat.set(w / 6, d / 6); asphMat.bumpMap.repeat.set(w / 6, d / 6);
      var rs = M('#7b7f86');
      mesh(boxG(w, 0.3, d), [rs, rs, asphMat, rs, rs, rs], cx, -0.15, cz, roadGroup).castShadow = false;
      var dashes = [], zebra = [], poles = [], heads = [], tl = [], hyd = [], xs = [], zs = [];
      for (var k = bounds[0] - 1; k <= bounds[1]; k++) xs.push((k + 0.5) * P);
      for (var q = bounds[2] - 1; q <= bounds[3]; q++) zs.push((q + 0.5) * P);
      function near(v, list) { for (var n = 0; n < list.length; n++) if (Math.abs(v - list[n]) < ROAD / 2 + 1.4) return true; return false; }
      xs.forEach(function (x) { for (var z = I.z0 + 1; z < I.z1 - 1; z += 2.2) if (!near(z, zs)) dashes.push([x, 0.011, z, 0]); });
      zs.forEach(function (z) { for (var x = I.x0 + 1; x < I.x1 - 1; x += 2.2) if (!near(x, xs)) dashes.push([x, 0.011, z, Math.PI / 2]); });
      xs.forEach(function (x) { zs.forEach(function (z) { [-1, 1].forEach(function (s) { for (var n = -2; n <= 2; n++) { zebra.push([x + n * 0.5, 0.012, z + s * (ROAD / 2 + 0.75), 0]); zebra.push([x + s * (ROAD / 2 + 0.75), 0.012, z + n * 0.5, Math.PI / 2]); } }); }); });
      inst(new THREE.BoxGeometry(0.12, 0.02, 1.0), M(style === 'ny' ? '#e8c34a' : '#f1efe6', { roughness: 0.6 }), dashes);
      inst(new THREE.BoxGeometry(0.28, 0.02, 1.1), M('#f1efe6', { roughness: 0.6 }), zebra);
      for (var i = bounds[0]; i <= bounds[1]; i++) for (var j = bounds[2]; j <= bounds[3]; j++) {
        var px = i * P + LOT / 2 - 0.3, pz = j * P + LOT / 2 - 0.3;
        if ((i + j) % 2 === 0) { poles.push([px, 1.85, pz]); heads.push([px, 3.55, pz + 0.25]); } else tl.push([px, 1.5, pz]);
        if (hash(i, j * 2) < 0.4) hyd.push([i * P - LOT / 2 + 0.4, 0.42, j * P + LOT / 2 - 0.4]);
      }
      inst(new THREE.CylinderGeometry(0.06, 0.08, 3.4, 6), M('#4a4f58', { metalness: 0.5, roughness: 0.5 }), poles, true);
      inst(new THREE.BoxGeometry(0.25, 0.15, 0.6), lampMat, heads);
      inst(new THREE.CylinderGeometry(0.05, 0.06, 3.0, 6), M('#2e3238', { metalness: 0.5 }), tl, true);
      inst(new THREE.BoxGeometry(0.28, 0.75, 0.24), M('#1d2024'), tl.map(function (p) { return [p[0], 3.2, p[2]]; }));
      inst(K.SPHERE(0.075, 8, 6), W.lights.red, tl.map(function (p) { return [p[0], 3.43, p[2] + 0.12]; }));
      inst(K.SPHERE(0.075, 8, 6), W.lights.amber, tl.map(function (p) { return [p[0], 3.2, p[2] + 0.12]; }));
      inst(K.SPHERE(0.075, 8, 6), W.lights.green, tl.map(function (p) { return [p[0], 2.97, p[2] + 0.12]; }));
      inst(new THREE.CylinderGeometry(0.12, 0.14, 0.5, 10), M(style === 'ny' ? '#c9a020' : '#c2332c', { roughness: 0.5 }), hyd, true);
      if (style === 'ny') { // steam from the street
        var vents = []; for (var v = 0; v < 6; v++) vents.push([xs[Math.floor(hash(v, 3) * xs.length)], 0.02, I.z0 + hash(v, 7) * (I.z1 - I.z0)]);
        W.vents = vents;
      }
    }
    function filler(g, i, j) {
      var h = hash(i * 2.1, j * 3.3), ny = style === 'ny';
      var floors = ny ? 6 + Math.floor(h * 18) : 4 + Math.floor(h * 9);
      if (!ny && h > 0.94 || ny && h > 0.96) { for (var k = 0; k < 6; k++) tree(g, (hash(i + k, j) - 0.5) * 4, (hash(i, j + k) - 0.5) * 4, 0.9); bench(g, 0, 1.8, 0); return 3; }
      var cols = ny ? NY_COLS : HK_COLS, base = cols[Math.floor(hash(i, j * 5) * cols.length)];
      var shop = ['#c9a35b', '#2f9e6a', '#d6453d', '#3c6fa8', '#e76f51'][Math.floor(hash(j, i * 3) * 5)];
      var w = (ny ? 4.6 : 3.9) + hash(i, j + 4) * 0.8, d = (ny ? 4.4 : 3.6) + hash(i + 4, j) * 0.8, Hh = floors * 1.15;
      var glass = ny && hash(i * 7, j) < 0.45;
      fbox(w, Hh, d, facade(glass ? { base: '#2d4a6a', cols: 5, rows: floors, lit: 0.55, glass: '#6f9cc9', frame: '#1e3550', tight: true, rough: 0.2, metal: 0.4 } : { base: base, cols: 4, rows: floors, lit: 0.5, ac: !ny, shop: shop, brick: ny }), K.shadeHex(base, -0.3), g);
      if (!glass) mesh(boxG(w + 0.1, 0.12, 0.6), M(shop), 0, 1.15, d / 2 + 0.25, g).rotation.x = 0.2;
      if (!ny) { // vertical neon sign and a horizontal shop sign
        var word = HK_SIGNS[Math.floor(hash(i * 3, j * 2) * HK_SIGNS.length)], ncol = ['#ff3b6b', '#ffd23b', '#3bd1ff', '#7dff6b'][Math.floor(hash(i, j * 9) * 4)];
        var sgn = mesh(boxG(0.12, 2.6, 0.7), signMat(word, '#1a1a1a', ncol, true, true), w / 2 + 0.1, 2.6 + hash(i, j) * 2, d / 2 - 0.5, g, true); sgn.rotation.y = Math.PI / 2;
        mesh(boxG(w * 0.7, 0.5, 0.06), signMat(word, '#ffffff', '#b8302b', false), 0, 1.6, d / 2 + 0.04, g, true);
        K.roofStuff(g, w, d, Hh);
        if (floors > 7) for (var b = 0; b < 3; b++) mesh(boxG(0.5, 0.06, 0.04), M('#ffffff'), -w / 3 + b * 0.6, 2.5 + b * 2, d / 2 + 0.25, g, true); // laundry poles
      } else {
        if (!glass) { cyl(0.6, 0.6, 1.4, '#7a5a3a', g, w * 0.2, Hh + 0.6, -d * 0.2, 12); mesh(new THREE.ConeGeometry(0.65, 0.6, 12), M('#5a4030'), w * 0.2, Hh + 2.3, -d * 0.2, g); for (var l = 0; l < 3; l++) cyl(0.04, 0.04, 0.6, '#444', g, w * 0.2 + (l - 1) * 0.4, Hh, -d * 0.2 + 0.4, 4); }
        else mesh(boxG(w * 0.6, 1.2, d * 0.6), M('#203a58', { metalness: 0.5 }), 0, Hh + 0.6, 0, g);
        if (!glass) for (var f = 2; f < Math.min(floors, 6); f++) mesh(boxG(0.9, 0.05, 0.4), M('#2a2a2a'), w / 3, f * 1.15, d / 2 + 0.2, g, true); // fire escapes
      }
      return Hh + 1.2;
    }
    function buildLot(i, j) {
      var key = i + ',' + j; if (lots[key]) return lots[key];
      var g = new THREE.Group(); g.position.set(i * P, 0, j * P); lotGroup.add(g); lots[key] = g;
      var cs = M('#a9a59c'), gs = M('#5e8f45'), isVac = vacant(i, j), st = storyAt(i, j);
      mesh(boxG(LOT, 0.3, LOT), [cs, cs, paveMat, cs, cs, cs], 0, 0, 0, g);
      if (st !== 'harbor') mesh(boxG(LOT - 1.4, 0.34, LOT - 1.4), [gs, gs, isVac ? dirtMat : grassMat, gs, gs, gs], 0, 0.02, 0, g);
      g.userData.h = 0; g.userData.extra = new THREE.Group(); g.add(g.userData.extra);
      if (st) { placeStory(st, i, j, g); }
      else if (isVac) {
        var fm = M('#d7d2c6'), ex = g.userData.extra;
        [[0, -2.2, 4.4, 0], [-2.2, 0, 4.4, Math.PI / 2], [2.2, 0, 4.4, Math.PI / 2]].forEach(function (f) { mesh(boxG(f[2], 0.08, 0.06), fm, f[0], 0.6, f[1], ex).rotation.y = f[3]; });
        for (var pp = -2; pp <= 2; pp++) { mesh(boxG(0.08, 0.7, 0.08), fm, pp * 1.1, 0.5, -2.2, ex); mesh(boxG(0.08, 0.7, 0.08), fm, -2.2, 0.5, pp * 1.1, ex); mesh(boxG(0.08, 0.7, 0.08), fm, 2.2, 0.5, pp * 1.1, ex); }
        mesh(boxG(0.9, 0.55, 0.05), signMat('空地', '#f4f1e8', '#8d6a28', false), 1.4, 1.1, 2.2, ex);
        if (hash(i, j) < 0.6) tree(ex, (hash(i + 1, j) - 0.5) * 2.6, (hash(i, j + 1) - 0.5) * 2.6, 0.8).position.y = 0.18;
      } else {
        var inner = new THREE.Group(); inner.position.y = 0.19; g.add(inner); inner.rotation.y = [0, Math.PI / 2, Math.PI, -Math.PI / 2][Math.floor(hash(j, i) * 4)];
        g.userData.h = filler(inner, i, j);
      }
      if (!st && hash(i * 3, j) < 0.35) bench(g, -LOT / 2 + 0.45, (hash(j, i) - 0.5) * 3, Math.PI / 2);
      // street trees on the pavement, and a bus stop here and there
      if (!st && !isVac) { [[-1.9, 1], [1.9, 1]].forEach(function (q, n) { if (hash(i + n * 3, j * 1.9) < 0.55) { var tt = tree(g, q[0], LOT / 2 - 0.35, 0.55, 'round'); tt.position.y = 0.15; mesh(boxG(0.7, 0.04, 0.7), M('#5a4a3a'), q[0], 0.16, LOT / 2 - 0.35, g, true); } }); }
      if (!st && hash(i * 5.3, j * 2.1) < 0.14) {
        var bs = new THREE.Group(); bs.position.set(0, 0.15, LOT / 2 - 0.45); g.add(bs);
        mesh(boxG(2.2, 0.06, 0.9), M('#3a3f48', { metalness: 0.5 }), 0, 2.2, 0, bs); mesh(boxG(2.2, 1.8, 0.04), new THREE.MeshStandardMaterial({ color: '#cfe8ff', transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0.3 }), 0, 1.25, -0.42, bs, true);
        [-1.05, 1.05].forEach(function (x) { mesh(boxG(0.06, 2.2, 0.06), M('#3a3f48', { metalness: 0.5 }), x, 1.1, -0.4, bs); });
        mesh(boxG(1.6, 0.06, 0.35), M('#8a8f98'), 0, 0.5, -0.2, bs);
        mesh(boxG(0.5, 0.5, 0.05), signMat(style === 'ny' ? 'BUS' : '巴士站', '#1f3d63', '#ffffff', true), 1.4, 2.4, 0.3, bs, true); mesh(boxG(0.05, 2.4, 0.05), M('#666'), 1.4, 1.2, 0.3, bs);
      }
      if (!inB(prevBounds, i, j)) { g.userData.rise = performance.now() + (Math.max(prevBounds[0] - i, i - prevBounds[1], prevBounds[2] - j, j - prevBounds[3]) - 1) * 250 + hash(j, i) * 300; g.position.y = -3; }
      return g;
    }
    function placeStory(type, i, j, lotG, animate) {
      var g = new THREE.Group(); g.position.set(0, 0.19, 0); lotG.add(g);
      B[type](g, W.anims, W);
      lotG.userData.h = HEIGHT[type] || 5; lotG.userData.type = type;
      if (animate) { g.userData.grow = performance.now(); g.scale.set(1, 0.01, 1); bMeshes.push(g); }
    }
    W.build = function (type, i, j) {
      var lot = buildLot(i, j); lot.userData.extra.visible = false;
      placeStory(type, i, j, lot, true);
      W.dust = [i * P, j * P];
    };
    W.place = function (type) { // where a story building is, with its door
      var at = fixed[type]; if (!at) S.buildings.forEach(function (b) { if (b.world === style && b.type === type) at = [b.i, b.j]; });
      if (!at || !inB(bounds, at[0], at[1])) return null;
      return { type: type, x: at[0] * P, z: at[1] * P, door: { x: at[0] * P, z: at[1] * P + (DOORS[type] || 1.8) + 0.9 } };
    };
    W.solid = function (x, z, y) {
      var i = Math.round(x / P), j = Math.round(z / P), l = lots[i + ',' + j];
      if (!l || !inB(bounds, i, j) || !l.userData.h) return false;
      if (y != null && y > l.userData.h) return false;
      var half = l.userData.type === 'spaceport' ? 2.9 : 2.6;
      return Math.abs(x - i * P) < half && Math.abs(z - j * P) < (l.userData.type === 'park' ? 0 : half);
    };
    W.expand = function (bd) {
      bd = [Math.min(bd[0], bounds[0]), Math.max(bd[1], bounds[1]), Math.min(bd[2], bounds[2]), Math.max(bd[3], bounds[3])];
      if (bd.join() === bounds.join()) return false;
      prevBounds = bounds; bounds = bd; buildGround();
      for (var i = bounds[0]; i <= bounds[1]; i++) for (var j = bounds[2]; j <= bounds[3]; j++) buildLot(i, j);
      return true;
    };
    W.getBounds = function () { return bounds.slice(); };
    buildGround();
    for (var i = bounds[0]; i <= bounds[1]; i++) for (var j = bounds[2]; j <= bounds[3]; j++) buildLot(i, j);

    // the far shore: hills and a skyline across the water
    (function () {
      var far = new THREE.Group(); G.add(far);
      var hillM = new THREE.MeshStandardMaterial({ color: style === 'hk' ? '#4f7a55' : '#6b7a6e', roughness: 1, flatShading: true });
      for (var k = 0; k < 16; k++) {
        var a = k / 16 * Math.PI * 2, dd = (style === 'hk' ? 150 : 190) + hash(k, 4) * 40, hh = style === 'hk' ? 35 + hash(k, 9) * 45 : 12 + hash(k, 9) * 15;
        if (style === 'hk' && Math.sin(a) > 0.3) hh *= 0.4;
        var m = new THREE.Mesh(new THREE.ConeGeometry(30 + hash(k, 3) * 30, hh, 8), hillM); m.position.set(Math.cos(a) * dd, hh / 2 - 2, Math.sin(a) * dd); far.add(m);
      }
      var fm = [facade({ base: '#8fa3b5', cols: 4, rows: 12, lit: 0.5, glass: '#c3d6e6', tight: true }), facade({ base: '#6d7f92', cols: 4, rows: 16, lit: 0.6, glass: '#a6bfd6', tight: true })];
      for (var s = 0; s < 46; s++) {
        var ang = -Math.PI * 0.85 + s / 46 * Math.PI * 0.7 + (style === 'ny' ? Math.PI : 0), dist = 105 + hash(s, 2) * 25, hgt = 8 + hash(s, 5) * (style === 'ny' ? 50 : 38);
        var b = mesh(boxG(5 + hash(s, 1) * 4, hgt, 5 + hash(s, 8) * 3), fm[s % 2], Math.cos(ang) * dist, hgt / 2 - 1, Math.sin(ang) * dist, far, true); b.rotation.y = -ang;
      }
      if (style === 'ny') { // a suspension bridge across the river
        var br = new THREE.Group(); br.position.set(70, 0, 0); far.add(br);
        mesh(boxG(4, 0.6, 140), M('#6b7078'), 0, 6, 0, br, true);
        [-35, 35].forEach(function (z) { mesh(boxG(1.2, 26, 4), M('#8a7f70'), 0, 13, z, br); });
        for (var c = -70; c <= 70; c += 3.5) { var hz = Math.abs(c) < 35 ? 26 - Math.cos(c / 35 * Math.PI / 2) * 18 : 26 - (Math.abs(c) - 35) / 35 * 20; mesh(boxG(0.1, Math.max(0.5, hz - 6), 0.1), M('#555'), 0, 6 + (hz - 6) / 2, c, br, true); }
      }
      // boats on the water
      W.boats = [];
      for (var bb = 0; bb < 5; bb++) {
        var boat = new THREE.Group(); far.add(boat);
        mesh(boxG(2.2, 0.8, 7), M(['#f4f4f4', '#2a6f4a', '#1f3d63'][bb % 3]), 0, 0, 0, boat); mesh(boxG(1.8, 1.2, 3), M('#ffffff'), 0, 1, -0.5, boat);
        if (style === 'hk' && bb % 2) { mesh(boxG(0.1, 5, 0.1), M('#5a3a22'), 0, 3, 0.8, boat); var sail = mesh(boxG(0.05, 3.6, 3), M('#b8402f', { side: THREE.DoubleSide }), 0, 3.4, 1.8, boat); }
        W.boats.push({ g: boat, r: 70 + bb * 12, a: bb * 1.3, sp: 0.01 + hash(bb, 1) * 0.02 });
      }
    })();

    /* ---------- traffic and pedestrians ---------- */
    var npcs = [], cars = [];
    W.npcLooks = null; // set by the engine
    function corner(c) { return new THREE.Vector3(c.i * P + c.cx * (LOT / 2 - 0.4), 0.19, c.j * P + c.cz * (LOT / 2 - 0.4)); }
    function randomCorner() { return { i: bounds[0] + Math.floor(Math.random() * (bounds[1] - bounds[0] + 1)), j: bounds[2] + Math.floor(Math.random() * (bounds[3] - bounds[2] + 1)), cx: Math.random() < 0.5 ? -1 : 1, cz: Math.random() < 0.5 ? -1 : 1 }; }
    function nextCorner(c) { var n = { i: c.i, j: c.j, cx: c.cx, cz: c.cz }; if (Math.random() < 0.5) n.cx = -n.cx; else n.cz = -n.cz; return n; }
    W.syncPeople = function (looks) {
      var lotsN = (bounds[1] - bounds[0] + 1) * (bounds[3] - bounds[2] + 1), want = Math.min(TOUCH ? 24 : 38, 8 + Math.round(lotsN * (style === 'ny' ? 0.6 : 0.45)));
      while (npcs.length < want) {
        var h = K.human(looks[npcs.length % looks.length]), c = randomCorner();
        h.position.copy(corner(c)); h.scale.setScalar(0.94 + Math.random() * 0.12); G.add(h);
        npcs.push({ h: h, c: c, to: nextCorner(c), sp: 1.0 + Math.random() * 0.7, wait: 0 });
      }
      var carWant = Math.min(TOUCH ? 10 : 16, 3 + Math.round((bounds[1] - bounds[0] + 1) * 1.4));
      while (cars.length < carWant) {
        var n = cars.length, car;
        if (style === 'hk' && n % 5 === 3) car = K.makeBus(n % 2 ? '#c8202a' : '#e9e2c8');
        else if (style === 'hk' && n % 3 === 0) car = K.makeCar('#c8202a', { taxi: true, taxiSign: '的士' });
        else if (style === 'ny' && n % 3 !== 2) car = K.makeCar('#f2c21b', { taxi: true, taxiSign: 'TAXI' });
        else car = K.makeCar(['#f2f2f2', '#1f3d63', '#222831', '#8a8f98', '#2a9d8f'][n % 5]);
        var cc = { g: car, axis: n % 2, sp: 6 + Math.random() * 3, bus: style === 'hk' && n % 5 === 3 }; G.add(car); resetCar(cc, true); cars.push(cc);
      }
    };
    function resetCar(c, anywhere) {
      var I = W.island();
      if (c.axis === 0) { c.line = bounds[0] - 1 + Math.floor(Math.random() * (bounds[1] - bounds[0] + 2)); c.min = I.z0; c.max = I.z1; }
      else { c.line = bounds[2] - 1 + Math.floor(Math.random() * (bounds[3] - bounds[2] + 2)); c.min = I.x0; c.max = I.x1; }
      c.dir = Math.random() < 0.5 ? 1 : -1; c.pos = anywhere ? c.min + Math.random() * (c.max - c.min) : (c.dir > 0 ? c.min : c.max);
    }
    var steam = [];
    W.update = function (t, dt, player) {
      lotGroup.children.forEach(function (g) { if (g.userData.rise) { var u = Math.max(0, Math.min(1, (performance.now() - g.userData.rise) / 700)); g.position.y = -3 * (1 - u) * (1 - u); if (u >= 1) delete g.userData.rise; } });
      bMeshes = bMeshes.filter(function (g) { var u = Math.min(1, (performance.now() - g.userData.grow) / 900), e = 1 - Math.pow(1 - u, 3) + Math.sin(u * Math.PI) * 0.12; g.scale.set(1, Math.max(0.01, e), 1); return u < 1; });
      W.anims.forEach(function (f) { f(t); });
      var cyc = t % 12; W.lights.red.emissiveIntensity = cyc < 5 ? 1.2 : 0.08; W.lights.amber.emissiveIntensity = cyc >= 5 && cyc < 6.5 ? 1.2 : 0.08; W.lights.green.emissiveIntensity = cyc >= 6.5 ? 1.2 : 0.08;
      W.boats.forEach(function (b) { b.a += b.sp * dt * 6; b.g.position.set(Math.cos(b.a) * b.r, -0.5 + Math.sin(t + b.r) * 0.1, Math.sin(b.a) * b.r); b.g.rotation.y = -b.a; });
      npcs.forEach(function (o) {
        if (o.wait > 0) { o.wait -= dt; K.animateHuman(o.h, 0, dt); return; }
        if (!inB(bounds, o.to.i, o.to.j)) o.to = randomCorner();
        var target = corner(o.to), dx = target.x - o.h.position.x, dz = target.z - o.h.position.z, d = Math.hypot(dx, dz);
        if (d < 0.2) { o.c = o.to; o.to = Math.random() < 0.12 ? randomCorner() : nextCorner(o.c); if (Math.random() < 0.25) o.wait = 1 + Math.random() * 2.5; return; }
        var step = Math.min(d, o.sp * dt); o.h.position.x += dx / d * step; o.h.position.z += dz / d * step; o.h.position.y = 0.19;
        var want = Math.atan2(dx, dz), diff = Math.atan2(Math.sin(want - o.h.rotation.y), Math.cos(want - o.h.rotation.y)); o.h.rotation.y += diff * Math.min(1, dt * 8);
        K.animateHuman(o.h, o.sp, dt);
      });
      cars.forEach(function (c) {
        var lane = (c.line + 0.5) * P + c.dir * 0.75 * (c.axis === 0 ? -1 : 1), x = c.axis === 0 ? lane : c.pos, z = c.axis === 0 ? c.pos : lane, stop = false;
        if (player) { var ax = c.axis === 0 ? 0 : c.dir, az = c.axis === 0 ? c.dir : 0, px = player.position.x - x, pz = player.position.z - z, ahead = px * ax + pz * az, side = Math.abs(px * az - pz * ax); stop = ahead > 0 && ahead < (c.bus ? 7 : 5) && side < 1.6; }
        if (!stop) c.pos += c.dir * c.sp * dt;
        if (c.pos > c.max + 2 || c.pos < c.min - 2) resetCar(c, false);
        c.g.position.set(c.axis === 0 ? lane : c.pos, 0, c.axis === 0 ? c.pos : lane);
        c.g.rotation.y = c.axis === 0 ? (c.dir > 0 ? 0 : Math.PI) : (c.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
      });
      if (W.vents && steam.length < 18 && Math.random() < 0.3) { var v = W.vents[Math.floor(Math.random() * W.vents.length)]; var m = mesh(K.SPHERE(0.5, 8, 6), new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.4 }), v[0], 0.3, v[2], G, true); steam.push({ m: m, life: 1 }); }
      steam = steam.filter(function (s) { s.life -= dt * 0.5; s.m.position.y += dt * 1.5; s.m.scale.setScalar(1 + (1 - s.life) * 2.5); s.m.material.opacity = s.life * 0.35; if (s.life <= 0) { G.remove(s.m); return false; } return true; });
    };
    W.mini = function (ctx, X, Z, s, t, glow) {
      var J = W.island(); ctx.fillStyle = '#4b4f57'; ctx.fillRect(X(J.x0), Z(J.z0), (J.x1 - J.x0) * s, (J.z1 - J.z0) * s);
      for (var i = bounds[0]; i <= bounds[1]; i++) for (var j = bounds[2]; j <= bounds[3]; j++) {
        var st = storyAt(i, j), v = vacant(i, j);
        ctx.fillStyle = st ? '#e2c88f' : v ? (glow ? 'rgba(255,215,120,' + (0.5 + Math.sin(t * 5) * 0.35) + ')' : '#7aa860') : '#a7a39a';
        ctx.fillRect(X(i * P - LOT / 2), Z(j * P - LOT / 2), LOT * s, LOT * s);
      }
      ctx.fillStyle = 'rgba(255,255,255,.85)'; npcs.forEach(function (o) { ctx.fillRect(X(o.h.position.x) - 1, Z(o.h.position.z) - 1, 2, 2); });
    };
    W.camSolid = function (v) { return W.solid(v.x, v.z, v.y - 0.5); };
    W.spawn = opts.spawn || { x: 0, z: LOT / 2 + 1.2, ry: Math.PI };
    return W;
  }

  /* ======================================================================
     Interiors: a room with furniture, story slots and camera angles
     ====================================================================== */
  function room(id, w, d, h, floorMat, wallCol, opts) {
    opts = opts || {};
    var W = { id: id, interior: true, group: new THREE.Group(), anims: [], gravity: 22, sea: false, slots: {}, cams: {} };
    var G = W.group;
    W.env = { sky: ['#20262e', '#20262e'], fog: [40, 90], hemi: 0.55, sun: 0.0, indoor: true };
    var wall = M(wallCol, { roughness: 0.9, side: THREE.DoubleSide });
    var floor = mesh(boxG(w, 0.2, d), [M('#777'), M('#777'), floorMat, M('#777'), M('#777'), M('#777')], 0, -0.1, 0, G); floor.castShadow = false;
    if (!opts.open) {
    mesh(boxG(w, 0.1, d), M(opts.ceil || '#f4f2ee', { side: THREE.DoubleSide }), 0, h + 0.05, 0, G, true);
    mesh(boxG(w, h, 0.1), wall, 0, h / 2, -d / 2, G, true);
    mesh(boxG(0.1, h, d), wall, -w / 2, h / 2, 0, G, true); mesh(boxG(0.1, h, d), wall, w / 2, h / 2, 0, G, true);
    [-1, 1].forEach(function (s) { mesh(boxG(w / 2 - 0.8, h, 0.1), wall, s * (w / 4 + 0.4), h / 2, d / 2, G, true); });
    mesh(boxG(1.6, h - 2.4, 0.1), wall, 0, h - (h - 2.4) / 2, d / 2, G, true);
    mesh(boxG(1.5, 2.3, 0.05), M('#3a2a1a'), 0, 1.15, d / 2 - 0.02, G, true);
    mesh(boxG(0.9, 0.3, 0.04), glowMat('#38d07a', 0.8), 0, 2.6, d / 2 - 0.08, G, true);
    // skirting boards, a cornice and a few framed pictures make the walls feel lived-in
    var trim = M(K.shadeHex(wallCol, -0.35), { roughness: 0.6 });
    mesh(boxG(w - 0.1, 0.14, 0.05), trim, 0, 0.07, -d / 2 + 0.07, G, true); mesh(boxG(w - 0.1, 0.1, 0.06), trim, 0, h - 0.05, -d / 2 + 0.08, G, true);
    [-1, 1].forEach(function (s) { mesh(boxG(0.05, 0.14, d - 0.1), trim, s * (w / 2 - 0.07), 0.07, 0, G, true); mesh(boxG(0.06, 0.1, d - 0.1), trim, s * (w / 2 - 0.08), h - 0.05, 0, G, true); });
    [[-w / 2 + 0.07, -d / 5, Math.PI / 2], [w / 2 - 0.07, d / 6, -Math.PI / 2]].forEach(function (f, n) {
      var fr = new THREE.Group(); fr.position.set(f[0], 1.75, f[1]); fr.rotation.y = f[2]; G.add(fr);
      mesh(boxG(1.1, 0.8, 0.04), M('#3a2a1a'), 0, 0, 0, fr, true);
      mesh(boxG(0.96, 0.66, 0.02), new THREE.MeshStandardMaterial({ roughness: 0.7, map: K.canvasTex(96, 64, function (g) { var sk = g.createLinearGradient(0, 0, 0, 64); sk.addColorStop(0, n ? '#f2b27a' : '#8fc3e6'); sk.addColorStop(1, '#f4ead8'); g.fillStyle = sk; g.fillRect(0, 0, 96, 64); g.fillStyle = n ? '#7a5a8a' : '#4f7a55'; g.beginPath(); g.moveTo(0, 64); g.lineTo(30, 30); g.lineTo(55, 46); g.lineTo(80, 24); g.lineTo(96, 40); g.lineTo(96, 64); g.fill(); }) }), 0, 0, 0.025, fr, true);
    });
    // ceiling lights
    var lm = glowMat('#fff6e0', 1.0);
    for (var x = -w / 2 + 2; x <= w / 2 - 2; x += 3.5) for (var z = -d / 2 + 2; z <= d / 2 - 2; z += 3.5) mesh(boxG(1.2, 0.05, 0.4), lm, x, h - 0.03, z, G, true);
    [[-w / 4, -d / 4], [w / 4, d / 4]].forEach(function (p) { var l = new THREE.PointLight(0xfff0d8, 0.6, 14); l.position.set(p[0], h - 0.4, p[1]); G.add(l); });
    }
    W.bounds = function () { return { x0: -w / 2 + 0.4, x1: w / 2 - 0.4, z0: -d / 2 + 0.4, z1: d / 2 - 0.4 }; };
    W.groundY = function () { return 0; };
    W.solids = [];
    W.solid = function (x, z) { for (var k = 0; k < W.solids.length; k++) { var s = W.solids[k]; if (x > s[0] && x < s[1] && z > s[2] && z < s[3]) return true; } return false; };
    W.camSolid = function (v) { return v.x < -w / 2 + 0.2 || v.x > w / 2 - 0.2 || v.z < -d / 2 + 0.2 || v.z > d / 2 - 0.2 || v.y > h - 0.2; };
    W.exit = { x: 0, z: d / 2 - 0.5 };
    W.spawn = { x: 0, z: d / 2 - 2.4, ry: Math.PI };
    W.place = function () { return null; };
    W.update = function (t) { W.anims.forEach(function (f) { f(t); }); };
    W.mini = function (ctx, X, Z, s) { ctx.fillStyle = '#d8d2c4'; ctx.fillRect(X(-w / 2), Z(-d / 2), w * s, d * s); ctx.fillStyle = '#38d07a'; ctx.fillRect(X(-0.75), Z(d / 2 - 0.2), 1.5 * s, 0.4 * s); };
    W.cams.wide = [0, h - 0.5, d / 2 - 0.6, 0, 1, -d / 4];
    W.block = function (x0, x1, z0, z1) { W.solids.push([x0 - 0.25, x1 + 0.25, z0 - 0.25, z1 + 0.25]); };
    W.size = [w, d, h];
    return W;
  }
  function table(G, x, z, w, d, col, W) { var t = new THREE.Group(); t.position.set(x, 0, z); G.add(t); mesh(boxG(w, 0.06, d), M(col || '#8a6038'), 0, 0.75, 0, t); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q) { mesh(boxG(0.06, 0.75, 0.06), M('#3a3a3a'), q[0] * (w / 2 - 0.1), 0.37, q[1] * (d / 2 - 0.1), t); }); if (W) W.block(x - w / 2, x + w / 2, z - d / 2, z + d / 2); return t; }
  function chair(G, x, z, ry) { var c = new THREE.Group(); c.position.set(x, 0, z); c.rotation.y = ry || 0; G.add(c); mesh(boxG(0.45, 0.06, 0.45), M('#5a4636'), 0, 0.45, 0, c); mesh(boxG(0.45, 0.5, 0.06), M('#5a4636'), 0, 0.72, -0.2, c); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q) { mesh(boxG(0.04, 0.45, 0.04), M('#333'), q[0] * 0.19, 0.22, q[1] * 0.19, c); }); return c; }
  function laptop(G, x, y, z, ry) { var l = new THREE.Group(); l.position.set(x, y, z); l.rotation.y = ry || 0; G.add(l); mesh(boxG(0.36, 0.02, 0.25), M('#c0c4ca', { metalness: 0.6 }), 0, 0, 0, l); var s = mesh(boxG(0.36, 0.24, 0.015), M('#c0c4ca', { metalness: 0.6 }), 0, 0.12, -0.12, l); s.rotation.x = -0.25; mesh(boxG(0.32, 0.2, 0.005), glowMat('#7fc8ff', 0.8), 0, 0.12, -0.11, l, true).rotation.x = -0.25; return l; }
  function shelf(G, x, z, ry, cols) { var s = new THREE.Group(); s.position.set(x, 0, z); s.rotation.y = ry || 0; G.add(s); mesh(boxG(2.4, 2.2, 0.5), M('#7a5532'), 0, 1.1, 0, s); for (var r = 0; r < 4; r++) for (var b = 0; b < 10; b++) mesh(boxG(0.18, 0.38 + hash(b, r) * 0.08, 0.36), M((cols || ['#b8302b', '#1f3d63', '#2a9d8f', '#e9c46a', '#5a3a6a', '#f4a261'])[(b + r) % 6]), -1.05 + b * 0.235, 0.3 + r * 0.52, 0.06, s, true); return s; }
  function plant(G, x, z) { var p = new THREE.Group(); p.position.set(x, 0, z); G.add(p); cyl(0.2, 0.16, 0.4, '#c9a35b', p, 0, 0, 0, 12); mesh(new THREE.IcosahedronGeometry(0.35, 1), M('#4f8f4a'), 0, 0.7, 0, p); return p; }
  function screen(G, x, y, z, w, h, text, ry) { var m = mesh(boxG(w, h, 0.06), signMat(text, '#13294a', '#e2c88f', true), x, y, z, G, true); m.rotation.y = ry || 0; return m; }

  var ROOMS = {
    home: function () {
      var W = room('home', 9, 8, 3.2, new THREE.MeshStandardMaterial({ map: TEX.wood, roughness: 0.8 }), '#efe2c6'), G = W.group;
      table(G, 0, -1, 1.8, 1.1, '#9a6a3a', W); chair(G, -0.7, -0.2, Math.PI); chair(G, 0.7, -0.2, Math.PI); chair(G, -0.7, -1.8, 0); chair(G, 0.7, -1.8, 0);
      [[-0.4, 0], [0.4, 0], [0, -0.2]].forEach(function (b) { cyl(0.16, 0.12, 0.08, '#ffffff', G, b[0], 0.78, -1 + b[1], 14); });
      cyl(0.22, 0.2, 0.14, '#d6453d', G, 0, 0.78, -1.2, 18);
      var sofa = new THREE.Group(); sofa.position.set(-3, 0, 2); G.add(sofa); mesh(boxG(2.2, 0.45, 0.8), M('#7a5ad8'), 0, 0.3, 0, sofa); mesh(boxG(2.2, 0.6, 0.2), M('#6a4ac8'), 0, 0.7, -0.35, sofa); W.block(-4.1, -1.9, 1.6, 2.4);
      mesh(boxG(1.6, 0.9, 0.06), M('#111'), -3, 1.5, -3.9, G); mesh(boxG(1.8, 0.5, 0.4), M('#6e4b2e'), -3, 0.25, -3.75, G); W.block(-3.9, -2.1, -3.95, -3.5);
      mesh(boxG(2.2, 1.4, 0.05), glowMat('#9fd0ee', 0.5), 2.5, 1.8, -3.95, G, true);
      plant(G, 3.8, 3.2); shelf(G, 3.9, 0, -Math.PI / 2);
      W.slots = { me: [0.7, -0.2, Math.PI, 'sit'], mum: [-0.7, -0.2, Math.PI, 'sit'], dad: [0, -1.9, 0, 'sit'], door: [0, 2.9, Math.PI], stand1: [-1.2, 1.2, Math.PI * 0.8], stand2: [1.2, 1.2, -Math.PI * 0.8] };
      W.cams.wide = [2.6, 2.4, 2.8, 0, 0.9, -1];
      return W;
    },
    classroom: function () {
      var W = room('classroom', 12, 10, 3.4, new THREE.MeshStandardMaterial({ map: TEX.tile, roughness: 0.7 }), '#e8e4d8'), G = W.group;
      mesh(boxG(5, 1.6, 0.06), M('#2f4f3f'), 0, 1.8, -4.9, G); mesh(boxG(5.2, 0.1, 0.15), M('#8a6038'), 0, 0.95, -4.85, G);
      mesh(boxG(3.4, 0.3, 0.02), signMat('今日功課：夢想', '#2f4f3f', '#ffffff', false), 0, 2.2, -4.86, G, true);
      table(G, 0, -3.6, 1.6, 0.7, '#8a6038', W);
      for (var r = 0; r < 3; r++) for (var c = 0; c < 4; c++) { var x = -3.6 + c * 2.4, z = -1.4 + r * 1.8; table(G, x, z, 1.0, 0.6, '#c9a35b', W); chair(G, x, z + 0.55, Math.PI); }
      var bin = cyl(0.25, 0.2, 0.6, '#5a6475', G, 5.2, 0, -3.8, 12); W.block(4.95, 5.45, -4.05, -3.55);
      for (var w0 = -1; w0 <= 1; w0++) mesh(boxG(2, 1.4, 0.05), glowMat('#cfe8ff', 0.5), -5.95, 1.9, w0 * 3, G, true).rotation.y = Math.PI / 2;
      W.slots = { me: [-1.2, 0.95, Math.PI, 'sit'], bully1: [3.6, -2.8, -0.6], bully2: [4.4, -2.0, -0.9], bully3: [2.8, -2.0, -0.3], kid1: [-3.6, -0.85, Math.PI, 'sit'], kid2: [1.2, -0.85, Math.PI, 'sit'], kid3: [-3.6, 2.75, Math.PI, 'sit'], teacher: [0, -4.2, 0], bin: [5.2, -3.4, 0], door: [0, 3.9, Math.PI] };
      W.cams.wide = [-4.5, 2.6, 3.8, 1, 0.8, -2];
      return W;
    },
    library: function () {
      var W = room('library', 12, 10, 3.6, new THREE.MeshStandardMaterial({ map: TEX.wood, roughness: 0.8 }), '#e7dcc6'), G = W.group;
      for (var k = 0; k < 4; k++) { shelf(G, -4.2 + k * 2.8, -4.4, 0); W.block(-5.4 + k * 2.8, -3 + k * 2.8, -4.7, -4.1); }
      [-1, 1].forEach(function (s) { shelf(G, s * 5.6, -1, s * -Math.PI / 2); W.block(s * 5.6 - 0.3, s * 5.6 + 0.3, -2.2, 0.2); });
      table(G, 0, 0, 2.6, 1.2, '#7a5532', W); for (var c = -1; c <= 1; c += 2) { chair(G, c * 0.8, 0.8, Math.PI); chair(G, c * 0.8, -0.8, 0); }
      var lamp = mesh(new THREE.ConeGeometry(0.2, 0.25, 12, 1, true), glowMat('#ffe0a0', 0.8), 0.6, 1.1, 0, G, true);
      mesh(boxG(0.5, 0.02, 0.35), M('#fffaf0'), -0.4, 0.79, 0.3, G, true); mesh(boxG(0.4, 0.02, 0.3), signMat('🚀', '#fffaf0', '#d0473f', false), 0.3, 0.79, 0.3, G, true);
      W.slots = { me: [-0.8, 0.8, Math.PI, 'type'], librarian: [3, 2, -2.4], kid1: [0.8, -0.8, 0, 'sit'], door: [0, 3.9, Math.PI] };
      W.cams.wide = [3.2, 2.2, 3.4, -0.3, 0.9, 0];
      return W;
    },
    rooftop: function () { // an open roof at night
      var W = room('rooftop', 12, 10, 3.4, new THREE.MeshStandardMaterial({ map: TEX.pave, roughness: 0.9 }), '#b8b2a6', { open: true }), G = W.group;
      W.env = { sky: ['#0b1530', '#2a3f66'], fog: [60, 200], hemi: 0.35, sun: 0.2, night: true, stars: true };
      mesh(boxG(1.6, 2.4, 1.2), M('#b8b2a6'), 0, 1.2, 4.6, G); mesh(boxG(1.1, 2.1, 0.05), M('#3a2a1a'), 0, 1.05, 3.98, G, true);
      [[0, -5, 12, 0], [-6, 0, 10, 1], [6, 0, 10, 1]].forEach(function (p) { var m = mesh(boxG(p[2], 1.0, 0.15), M('#b8b2a6'), p[0], 0.5, p[1], G); m.rotation.y = p[3] ? Math.PI / 2 : 0; });
      K.cyl(0.6, 0.6, 1.6, '#c9ccd1', G, -4, 0, -3.5, 12); W.block(-4.6, -3.4, -4.1, -2.9);
      var tel = new THREE.Group(); tel.position.set(1.5, 0, -1.5); G.add(tel); mesh(boxG(0.05, 1.1, 0.05), M('#333'), 0, 0.55, 0, tel); var tb = cyl(0.08, 0.12, 0.9, '#39465e', tel, 0, 1.0, 0, 10); tb.rotation.z = -1.0;
      var city = new THREE.Group(); G.add(city);
      var fm = facade({ base: '#3a4a60', cols: 4, rows: 10, lit: 0.6, glass: '#5a6a80', tight: true });
      for (var s = 0; s < 30; s++) { var a = s / 30 * Math.PI * 2, r = 30 + hash(s, 1) * 25, hh = 10 + hash(s, 2) * 30; mesh(boxG(5, hh, 5), fm, Math.cos(a) * r, hh / 2 - 12, Math.sin(a) * r, city, true); }
      W.camSolid = function (v) { return v.y < 0.2; };
      W.slots = { me: [1, -0.6, Math.PI * 0.9, 'lookup'], friend: [-0.5, -1.2, Math.PI], door: [0, 3.9, Math.PI] };
      W.cams.wide = [3, 2, 3, 0, 2.5, -4];
      return W;
    },
    office: function (variant) {
      var W = room(variant || 'office', 12, 10, 3.4, new THREE.MeshStandardMaterial({ map: TEX.carpet, roughness: 0.9 }), variant === 'incubator' ? '#fff3d6' : '#e9eef3'), G = W.group;
      for (var r = 0; r < 2; r++) for (var c = 0; c < 3; c++) { var x = -3.4 + c * 3.4, z = -2.2 + r * 2.6; table(G, x, z, 1.8, 0.9, '#f4f4f4', W); laptop(G, x - 0.3, 0.79, z, 0); laptop(G, x + 0.5, 0.79, z, 0); chair(G, x - 0.3, z + 0.7, Math.PI); }
      mesh(boxG(3, 1.6, 0.05), M('#ffffff'), 0, 1.7, -4.93, G); mesh(boxG(2.6, 0.4, 0.02), signMat(variant === 'incubator' ? '你的第一步' : 'Day 1 · 第一天', '#ffffff', '#1f3d63', false), 0, 2.0, -4.9, G, true);
      plant(G, 5.2, -4.2); plant(G, -5.2, 4); screen(G, 5.9, 1.9, 0, 2.4, 1.3, variant === 'nymeeting' ? 'IPO 路線圖' : '我們的計劃', -Math.PI / 2);
      if (variant === 'nymeeting') { mesh(boxG(14, 3.4, 0.05), glowMat('#9fd0ee', 0.45), 0, 1.7, -4.96, G, true); }
      W.slots = { me: [-3.7, -1.5, Math.PI, 'type'], boss: [3.4, 1.4, -Math.PI * 0.7], p1: [0, -1.5, Math.PI, 'type'], p2: [3.1, -1.5, Math.PI, 'type'], p3: [-3.7, 1.1, Math.PI, 'type'], stand1: [-1.5, 3, Math.PI], stand2: [1.5, 3, Math.PI], door: [0, 3.9, Math.PI] };
      W.cams.wide = [-5, 2.6, 4, 0, 0.9, -1.5];
      return W;
    },
    meeting: function () {
      var W = room('meeting', 11, 9, 3.4, new THREE.MeshStandardMaterial({ map: TEX.carpet, roughness: 0.9 }), '#dfe5ea'), G = W.group;
      mesh(boxG(11, 3.4, 0.05), glowMat('#9fd0ee', 0.45), 0, 1.7, -4.45, G, true);
      var sky = new THREE.Group(); G.add(sky); var fm = facade({ base: '#3a4a60', cols: 4, rows: 12, lit: 0.5, glass: '#7a8aa0', tight: true });
      table(G, 0, -0.5, 4.2, 1.5, '#2b2b2b', W);
      for (var c = -1; c <= 1; c++) { chair(G, c * 1.3, 0.55, Math.PI); chair(G, c * 1.3, -1.55, 0); }
      screen(G, 5.4, 1.9, -0.5, 2.6, 1.4, '上市計劃 · 第1頁', -Math.PI / 2);
      W.slots = { me: [3.3, -0.5, -Math.PI / 2, 'talk'], inv1: [-1.3, 0.55, Math.PI, 'sit'], inv2: [0, 0.55, Math.PI, 'sit'], inv3: [1.3, -1.55, 0, 'sit'], team: [0, -1.55, 0, 'sit'], door: [0, 3.4, Math.PI] };
      W.cams.wide = [-4, 2.4, 3.2, 0.8, 0.9, -0.6];
      return W;
    },
    restaurant: function () {
      var W = room('restaurant', 12, 10, 3.4, new THREE.MeshStandardMaterial({ map: TEX.tile, roughness: 0.6 }), '#b8302b'), G = W.group;
      [[-3, -1.5], [3, -1.5], [0, 2]].forEach(function (p, n) {
        var t = cyl(0.9, 0.9, 0.06, '#f4efe4', G, p[0], 0.75, p[1], 24); W.block(p[0] - 0.9, p[0] + 0.9, p[1] - 0.9, p[1] + 0.9); cyl(0.12, 0.2, 0.75, '#3a3a3a', G, p[0], 0, p[1], 10);
        for (var c = 0; c < 6; c++) { var a = c / 6 * Math.PI * 2; chair(G, p[0] + Math.cos(a) * 1.3, p[1] + Math.sin(a) * 1.3, -a - Math.PI / 2); }
        for (var d2 = 0; d2 < 4; d2++) cyl(0.14, 0.1, 0.06, '#ffffff', G, p[0] + Math.cos(d2 * 1.6) * 0.5, 0.81, p[1] + Math.sin(d2 * 1.6) * 0.5, 12);
      });
      for (var l = 0; l < 4; l++) { var lan = mesh(K.SPHERE(0.3, 14, 10), glowMat('#ff5040', 0.7), -4.5 + l * 3, 2.8, -4, G, true); lan.scale.y = 1.3; }
      mesh(boxG(4, 0.9, 0.06), signMat('龍鳳呈祥', '#b8302b', '#ffd27a', true), 0, 2.4, -4.93, G, true);
      W.slots = { me: [-3 + 1.3 * Math.cos(Math.PI / 2), -1.5 + 1.3, Math.PI, 'sit'], laugher: [-3 + 1.3 * Math.cos(Math.PI * 1.5) * -1, -1.5 - 1.3, 0, 'sit'], g1: [-3 - 1.3 * Math.cos(Math.PI / 6), -1.5 + 0.65, -Math.PI * 0.7, 'sit'], g2: [-3 + 1.13, -1.5 - 0.65, Math.PI * 0.4, 'sit'], g3: [-3 - 1.13, -1.5 - 0.65, -Math.PI * 0.35, 'sit'], door: [0, 3.9, Math.PI] };
      W.cams.wide = [0.5, 2.4, 1.8, -3, 0.9, -1.5];
      return W;
    },
    store: function () {
      var W = room('store', 10, 9, 3.2, new THREE.MeshStandardMaterial({ map: TEX.tile, roughness: 0.6 }), '#f5f2ea'), G = W.group;
      for (var r = 0; r < 3; r++) { var s = new THREE.Group(); s.position.set(-2.5 + r * 2.5, 0, -1); G.add(s); mesh(boxG(0.6, 1.8, 3), M('#e8e8e8'), 0, 0.9, 0, s); W.block(-2.8 + r * 2.5, -2.2 + r * 2.5, -2.5, 0.5);
        for (var y = 0; y < 3; y++) for (var it = 0; it < (W.emptyShelves ? 2 : 7); it++) mesh(boxG(0.65, 0.3, 0.25), M(['#d6453d', '#e9c46a', '#2a9d8f', '#3c6fa8'][(it + y + r) % 4]), 0, 0.35 + y * 0.55, -1.2 + it * 0.4, s, true); }
      var counter = mesh(boxG(2.4, 1.0, 0.8), M('#2f9e6a'), 3, 0.5, 2.6, G); W.block(1.8, 4.2, 2.2, 3.0);
      mesh(boxG(0.4, 0.3, 0.3), M('#333'), 3.3, 1.15, 2.6, G);
      W.bills = []; for (var b = 0; b < 8; b++) { var p = mesh(boxG(0.3, 0.005, 0.4), M('#fffaf0'), 2.4 + hash(b, 1) * 1.2, 1.01 + b * 0.006, 2.4 + hash(b, 2) * 0.4, G, true); p.rotation.y = hash(b, 3); }
      mesh(boxG(1.4, 0.4, 0.04), signMat('欠款通知', '#ffffff', '#d0473f', false), 3, 2.4, -4.43, G, true);
      W.slots = { me: [3, 3.4, Math.PI, 'think'], landlord: [0.5, 2.6, Math.PI * 0.8], friend: [-3.5, 3, Math.PI * 0.6], door: [0, 3.4, Math.PI] };
      W.cams.wide = [-3.5, 2.4, 3.6, 2.4, 1, 2.2];
      return W;
    },
    factory: function () {
      var W = room('factory', 14, 11, 4.2, new THREE.MeshStandardMaterial({ color: '#8f969c', roughness: 0.9 }), '#cfd5dc'), G = W.group;
      for (var l = 0; l < 2; l++) {
        var belt = mesh(boxG(9, 0.2, 1.0), M('#2b2b2b'), 0, 0.9, -2.2 + l * 3, G); W.block(-4.5, 4.5, -2.7 + l * 3, -1.7 + l * 3);
        for (var b = 0; b < 8; b++) { var box = mesh(boxG(0.4, 0.3, 0.5), M('#e9e2c8'), -4 + b * 1.1, 1.15, -2.2 + l * 3, G); (function (bx, off) { W.anims.push(function (t) { bx.position.x = -4.4 + ((t * 0.8 + off) % 8.8); }); })(box, b * 1.1); }
      }
      for (var m = 0; m < 3; m++) { mesh(boxG(1.2, 1.8, 1.2), M('#9aa6b2', { metalness: 0.5 }), -3 + m * 3, 1.1, -4.6, G); W.block(-3.6 + m * 3, -2.4 + m * 3, -5.2, -4); }
      mesh(boxG(4, 0.8, 0.06), signMat('一起守護大家', '#1f3d63', '#ffffff', true), 0, 3.1, -5.43, G, true);
      W.slots = { me: [-1, 2.6, Math.PI], w1: [-2.5, -1.4, Math.PI], w2: [1.5, -1.4, Math.PI], w3: [3, 1.6, Math.PI], team: [1, 2.6, Math.PI], door: [0, 4.4, Math.PI] };
      W.cams.wide = [-5.5, 3, 4.5, 0, 1, -1];
      return W;
    },
    tvstudio: function () {
      var W = room('tvstudio', 12, 10, 4.2, new THREE.MeshStandardMaterial({ map: TEX.carpet, roughness: 0.9 }), '#13294a'), G = W.group;
      mesh(boxG(6, 3, 0.06), glowMat('#2f6fb8', 0.6), 0, 2, -4.93, G, true); mesh(boxG(3.6, 0.6, 0.05), signMat('創業者故事', '#2f6fb8', '#ffffff', true), 0, 2.6, -4.88, G, true);
      var sofa = new THREE.Group(); sofa.position.set(-0.9, 0, -2.6); G.add(sofa); mesh(boxG(1.6, 0.45, 0.8), M('#e9c46a'), 0, 0.3, 0, sofa); W.block(-1.7, -0.1, -3, -2.2);
      var chairR = new THREE.Group(); chairR.position.set(1.4, 0, -2.6); G.add(chairR); mesh(boxG(0.8, 0.45, 0.8), M('#e9c46a'), 0, 0.3, 0, chairR); W.block(1, 1.8, -3, -2.2);
      for (var c = 0; c < 2; c++) { var cam = new THREE.Group(); cam.position.set(-2 + c * 4, 0, 1.6); cam.rotation.y = c ? 0.4 : -0.4; G.add(cam); mesh(boxG(0.06, 1.4, 0.06), M('#222'), 0, 0.7, 0, cam); mesh(boxG(0.4, 0.35, 0.7), M('#2b2b2b'), 0, 1.5, 0, cam); mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.2, 10), M('#111'), 0, 1.5, -0.42, cam).rotation.x = Math.PI / 2; mesh(K.SPHERE(0.04), glowMat('#ff2020', 1), 0.15, 1.75, -0.2, cam, true); }
      for (var l = 0; l < 3; l++) mesh(boxG(0.5, 0.4, 0.4), glowMat('#fff2c0', 1.2), -3 + l * 3, 3.9, 0, G, true);
      W.slots = { me: [-1.2, -2.5, 0, 'talk'], host: [1.4, -2.5, -0.3, 'sit'], crew: [3.2, 2.2, Math.PI * 0.9], door: [0, 3.9, Math.PI] };
      W.cams.wide = [0, 1.6, 0.6, 0, 1.1, -2.6];
      return W;
    },
    lab: function () {
      var W = room('lab', 12, 10, 3.6, new THREE.MeshStandardMaterial({ map: TEX.tile, roughness: 0.6 }), '#eef3f8'), G = W.group;
      for (var r = 0; r < 2; r++) { table(G, -2.5 + r * 5, -1.5, 3, 1.1, '#f4f6f8', W);
        for (var g2 = 0; g2 < 5; g2++) { var fl = mesh(new THREE.CylinderGeometry(0.05, 0.12, 0.25, 12), new THREE.MeshStandardMaterial({ color: ['#7fd0ff', '#9fe0c8', '#ffd27a'][g2 % 3], transparent: true, opacity: 0.7 }), -3.6 + r * 5 + g2 * 0.5, 0.92, -1.5, G, true); }
        var mic = new THREE.Group(); mic.position.set(-1.6 + r * 5, 0.78, -1.3); G.add(mic); mesh(boxG(0.3, 0.06, 0.3), M('#333'), 0, 0.03, 0, mic); mesh(boxG(0.06, 0.45, 0.06), M('#333'), 0, 0.25, -0.1, mic); cyl(0.05, 0.05, 0.25, '#222', mic, 0, 0.35, 0, 10);
      }
      mesh(boxG(2, 2.4, 0.8), M('#c9d4df', { metalness: 0.3 }), 4.6, 1.2, -4.2, G); W.block(3.6, 5.6, -4.6, -3.8);
      var atom = new THREE.Group(); atom.position.set(0, 2.5, -3); G.add(atom);
      var ring = glowMat('#3fb0ff', 0.9); for (var k = 0; k < 3; k++) mesh(new THREE.TorusGeometry(0.5, 0.025, 8, 40), ring, 0, 0, 0, atom, true).rotation.set(Math.PI / 2, k * Math.PI / 3, 0);
      mesh(K.SPHERE(0.1), glowMat('#c9a35b', 0.6), 0, 0, 0, atom, true);
      W.anims.push(function (t) { atom.rotation.y = t * 0.8; atom.rotation.x = Math.sin(t * 0.5) * 0.3; });
      screen(G, 0, 2.6, -4.93, 3.6, 1, '研發 · 專利 · 改變', 0);
      W.slots = { me: [-2.5, -0.6, Math.PI], sci1: [2.5, -0.6, Math.PI * 1.1], sci2: [-0.5, 1.8, Math.PI], prof: [3.6, 1.2, -Math.PI * 0.6], door: [0, 3.9, Math.PI] };
      W.cams.wide = [-4.5, 2.4, 3.4, 0, 1, -1.5];
      return W;
    },
    hall: function (variant) { // stage with an audience: talks, award night, the exchange floor
      var exch = variant === 'exchange';
      var W = room(variant || 'hall', 16, 13, 5, new THREE.MeshStandardMaterial({ map: exch ? TEX.wood : TEX.carpet, roughness: 0.85 }), exch ? '#e8e1d2' : '#2b2f45'), G = W.group;
      var stage = mesh(boxG(10, 0.6, 3.6), M(exch ? '#6b4a2e' : '#3a3f5a'), 0, 0.3, -4.5, G); W.block(-5, 5, -6.3, -2.7);
      W.stageY = 0.6;
      if (exch) {
        mesh(boxG(14, 3.4, 0.06), glowMat('#0e1b33', 0.3), 0, 3, -6.43, G, true);
        var big = mesh(boxG(8, 2.4, 0.06), signMat('IPO · 上市成功', '#0e1b33', '#2bd46a', true), 0, 3.2, -6.38, G, true);
        var tick = mesh(boxG(14, 0.4, 0.06), signMat('▲ +12.5%   ▲ +8.1%   ▲ +3.4%   ▲ +21.0%', '#000000', '#2bd46a', true), 0, 1.4, -6.36, G, true);
        var pod = mesh(boxG(1.2, 1.1, 0.6), M('#3a2a1a'), 1.5, 1.15, -4.2, G);
        var bell = new THREE.Group(); bell.position.set(1.5, 1.95, -4.2); G.add(bell); mesh(new THREE.SphereGeometry(0.22, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), M('#c9a35b', { metalness: 0.8, roughness: 0.2 }), 0, 0, 0, bell);
        for (var tr = 0; tr < 6; tr++) { var desk = mesh(boxG(1.4, 1.0, 0.7), M('#2b2b2b'), -5 + tr * 2, 0.5, 1.5, G); mesh(boxG(1.0, 0.6, 0.05), glowMat('#2bd46a', 0.5), -5 + tr * 2, 1.4, 1.3, G, true); W.block(-5.7 + tr * 2, -4.3 + tr * 2, 1.15, 1.85); }
      } else {
        var curtain = mesh(boxG(12, 4.4, 0.1), M(variant === 'award' ? '#7a1f2b' : '#1f3557'), 0, 2.5, -6.4, G);
        mesh(boxG(6, 0.8, 0.06), signMat(variant === 'award' ? '年度創新大獎' : '夢想，可以的', '#7a1f2b', '#ffd27a', true), 0, 4, -6.3, G, true);
        var podium = mesh(boxG(0.8, 1.1, 0.5), M('#c9a35b'), 2.5, 1.15, -4, G);
        for (var r = 0; r < 4; r++) for (var c = 0; c < 8; c++) chair(G, -5.6 + c * 1.6, 0.4 + r * 1.5, Math.PI);
        for (var sp = 0; sp < 2; sp++) mesh(new THREE.ConeGeometry(1.2, 4, 16, 1, true), new THREE.MeshBasicMaterial({ color: '#fff4c8', transparent: true, opacity: 0.08, depthWrite: false }), -2 + sp * 4, 2.6, -4.3, G, true);
      }
      W.slots = { me: [0, -4.3, 0, 'talk'], host: [-2.5, -4.3, 0.4], vip: [1.5, -4.0, 0], a1: [-4, 0.4, Math.PI, 'sit'], a2: [-0.8, 0.4, Math.PI, 'sit'], a3: [2.4, 1.9, Math.PI, 'sit'], a4: [-2.4, 3.4, Math.PI, 'sit'], kid: [4, 4.9, Math.PI, 'sad'], c1: [-3, 2.6, Math.PI], c2: [0, 3, Math.PI], c3: [3, 2.6, Math.PI], c4: [-1.5, 4.2, Math.PI], c5: [1.5, 4.2, Math.PI], door: [0, 5.9, Math.PI] };
      W.cams.wide = [0, 3.2, 5.5, 0, 1.5, -4];
      return W;
    },
    moonbase: function () {
      var W = room('moonbase', 11, 9, 3.2, new THREE.MeshStandardMaterial({ color: '#c9ccd1', roughness: 0.7, metalness: 0.3 }), '#e6eaee'), G = W.group;
      mesh(boxG(4, 2, 0.06), glowMat('#05070d', 0.2), 0, 1.7, -4.43, G, true);
      var earth = mesh(K.SPHERE(0.6, 24, 16), new THREE.MeshStandardMaterial({ map: earthTex(), emissive: '#16304f', emissiveIntensity: 0.4 }), 0.8, 1.9, -4.6, G, true);
      W.anims.push(function (t) { earth.rotation.y = t * 0.1; });
      table(G, 0, -1, 2.4, 1.0, '#9aa6b2', W); laptop(G, 0, 0.79, -1, 0);
      for (var p = 0; p < 4; p++) { mesh(boxG(0.8, 0.8, 0.8), M('#4f8f4a'), -4 + p * 0.0, 0.4, -3 + p * 1.6, G); mesh(new THREE.IcosahedronGeometry(0.45, 1), M('#6bb874'), -4, 1.1, -3 + p * 1.6, G); }
      W.block(-4.5, -3.5, -3.5, 2.3);
      W.slots = { me: [0, -0.2, Math.PI, 'talk'], crew: [2.5, 0.6, -Math.PI * 0.7], door: [0, 3.9, Math.PI] };
      W.cams.wide = [3.2, 2.2, 3, 0, 1.2, -2];
      return W;
    },
    marshab: function () {
      var W = room('marshab', 12, 10, 3.6, new THREE.MeshStandardMaterial({ color: '#c9b8a6', roughness: 0.8 }), '#f1e6da'), G = W.group;
      mesh(boxG(6, 2.2, 0.06), glowMat('#d98a5a', 0.5), 0, 1.8, -4.93, G, true);
      for (var r = 0; r < 3; r++) { mesh(boxG(1.2, 0.5, 4), M('#7a5532'), -4 + r * 1.8, 0.25, -1, G); for (var p = 0; p < 6; p++) mesh(new THREE.IcosahedronGeometry(0.22, 0), M('#5fae5a'), -4 + r * 1.8, 0.65, -2.6 + p * 0.65, G); W.block(-4.6 + r * 1.8, -3.4 + r * 1.8, -3, 1); }
      table(G, 3, 1, 2, 1, '#e9eef3', W); laptop(G, 3, 0.79, 1, 0);
      W.slots = { me: [1, 2.2, Math.PI], crew: [3.5, 2.4, Math.PI * 1.2], kid: [-1, 2.6, Math.PI], door: [0, 3.9, Math.PI] };
      W.cams.wide = [-5, 2.4, 3.8, 1, 1, -1];
      return W;
    }
  };
  ROOMS.nyoffice = function () { return ROOMS.office('nyoffice'); };
  ROOMS.incubator = function () { return ROOMS.office('incubator'); };
  ROOMS.studio = function () { return ROOMS.office('studio'); };
  ROOMS.award = function () { return ROOMS.hall('award'); };
  ROOMS.exchange = function () { return ROOMS.hall('exchange'); };
  ROOMS.talk = function () { return ROOMS.hall('talk'); };

  /* ======================================================================
     Space: the Moon and Mars, and the travel scenes
     ====================================================================== */
  function earthTex() {
    return K.canvasTex(256, 128, function (g, w, h) {
      g.fillStyle = '#1f5fa8'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#4f9a5c'; for (var k = 0; k < 14; k++) { g.beginPath(); g.ellipse(hash(k, 1) * w, 20 + hash(k, 2) * (h - 40), 10 + hash(k, 3) * 28, 6 + hash(k, 4) * 16, hash(k, 5) * 3, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = 'rgba(255,255,255,.75)'; for (var c = 0; c < 26; c++) { g.beginPath(); g.ellipse(hash(c, 7) * w, hash(c, 8) * h, 8 + hash(c, 9) * 20, 2 + hash(c, 6) * 4, 0, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, 6); g.fillRect(0, h - 6, w, 6);
    });
  }
  function planetSurface(id, o) {
    var W = { id: id, group: new THREE.Group(), anims: [], gravity: o.gravity, sea: false, env: o.env };
    var G = W.group, N = 120, SIZE = 240;
    function H(x, z) {
      var y = 0;
      if (o.craters) o.craters.forEach(function (c) { var d = Math.hypot(x - c[0], z - c[1]) / c[2]; if (d < 1.4) y += d < 1 ? (d * d - 1) * c[3] : Math.sin((d - 1) / 0.4 * Math.PI) * c[3] * 0.35; });
      y += Math.sin(x * 0.05) * Math.cos(z * 0.04) * o.hill + Math.sin(x * 0.13 + 1) * Math.sin(z * 0.11) * o.hill * 0.3;
      var r = Math.hypot(x, z); if (r < 14) y *= r / 14;   // flat landing area
      if (o.mountains) y += Math.max(0, r - 70) * 0.35;
      return y;
    }
    W.groundY = H;
    var geo = new THREE.PlaneGeometry(SIZE, SIZE, N, N); geo.rotateX(-Math.PI / 2);
    var pos = geo.attributes.position; for (var k = 0; k < pos.count; k++) pos.setY(k, H(pos.getX(k), pos.getZ(k)));
    geo.computeVertexNormals();
    var tex = K.canvasTex(256, 256, function (g, w, h) { g.fillStyle = o.ground; g.fillRect(0, 0, w, h); K.speckle(g, w, h, 6000, 0.18); }, [24, 24]);
    var gm = mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 1, color: '#ffffff' }), 0, 0, 0, G); gm.castShadow = false;
    var rockM = M(o.rock, { roughness: 1, flatShading: true });
    for (var r2 = 0; r2 < 90; r2++) { var x = (hash(r2, 1) - 0.5) * 200, z = (hash(r2, 2) - 0.5) * 200; if (Math.hypot(x, z) < 12) continue; var s = 0.3 + hash(r2, 3) * 1.6; var rk = mesh(new THREE.DodecahedronGeometry(s, 0), rockM, x, H(x, z) + s * 0.4, z, G); rk.rotation.set(hash(r2, 4) * 3, hash(r2, 5) * 3, 0); }
    W.bounds = function () { return { x0: -95, x1: 95, z0: -95, z1: 95 }; };
    W.solids = [];
    W.solid = function (x, z) { for (var k = 0; k < W.solids.length; k++) { var s = W.solids[k]; if (Math.hypot(x - s[0], z - s[1]) < s[2]) return true; } return false; };
    W.camSolid = function (v) { if (v.y < H(v.x, v.z) + 0.3) return true; for (var k = 0; k < W.solids.length; k++) { var s = W.solids[k]; if (Math.hypot(v.x - s[0], v.z - s[1]) < s[2] + 0.6 && v.y < H(s[0], s[1]) + s[2] + 1.5) return true; } return false; };
    W.places = {};
    W.place = function (type) { return W.places[type] || null; };
    W.update = function (t) { W.anims.forEach(function (f) { f(t); }); };
    W.mini = function (ctx, X, Z, s) { ctx.fillStyle = o.ground; ctx.fillRect(X(-100), Z(-100), 200 * s, 200 * s); ctx.fillStyle = '#e2c88f'; Object.keys(W.places).forEach(function (k) { var p = W.places[k]; ctx.fillRect(X(p.x) - 3, Z(p.z) - 3, 6, 6); }); };
    W.spawn = { x: 0, z: 6, ry: Math.PI };
    W.addPlace = function (type, x, z, r, door) { W.places[type] = { type: type, x: x, z: z, door: door || { x: x, z: z + r + 1 } }; if (r) W.solids.push([x, z, r]); };
    return W;
  }
  function lander(G, x, z, y) {
    var l = new THREE.Group(); l.position.set(x, y, z); G.add(l);
    var rk = makeRocket(); l.add(rk); rk.position.y = 1.2;
    for (var k = 0; k < 4; k++) { var a = k * Math.PI / 2 + 0.78, leg = mesh(boxG(0.12, 2, 0.12), M('#9aa3ad'), Math.cos(a) * 1.1, 0.9, Math.sin(a) * 1.1, l); leg.rotation.z = Math.cos(a) * 0.4; leg.rotation.x = -Math.sin(a) * 0.4; }
    return l;
  }
  function moon() {
    var crat = []; for (var c = 0; c < 22; c++) { var x = (hash(c, 11) - 0.5) * 200, z = (hash(c, 12) - 0.5) * 200; if (Math.hypot(x, z) < 20) continue; crat.push([x, z, 4 + hash(c, 13) * 12, 1 + hash(c, 14) * 2.5]); }
    var W = planetSurface('moon', { gravity: 3.6, ground: '#a7a7a3', rock: '#8a8a86', hill: 1.2, craters: crat, env: { sky: ['#000000', '#05070d'], fog: [150, 400], hemi: 0.25, sun: 2.2, stars: true, space: true } });
    var G = W.group, H = W.groundY;
    var earth = mesh(K.SPHERE(30, 48, 32), new THREE.MeshStandardMaterial({ map: earthTex(), emissive: '#16304f', emissiveIntensity: 0.6 }), -140, 120, -260, G, true);
    W.anims.push(function (t) { earth.rotation.y = t * 0.02; });
    lander(G, 0, -6, H(0, -6)); W.addPlace('lander', 0, -6, 2.2, { x: 0, z: -2.8 });
    // a lunar base: modules joined by a tunnel
    var base = new THREE.Group(); base.position.set(26, H(26, -22), -22); G.add(base);
    [[-4, 0], [4, 0]].forEach(function (p) { var m = mesh(new THREE.CylinderGeometry(2.2, 2.2, 5, 24), M('#e9eef3', { metalness: 0.3 }), p[0], 1.6, p[1], base); m.rotation.z = Math.PI / 2; m.rotation.y = Math.PI / 2; });
    mesh(new THREE.SphereGeometry(3, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), M('#f4f6f8', { metalness: 0.3 }), 0, 0, 0, base);
    mesh(boxG(1.2, 2.2, 0.2), glowMat('#38d07a', 0.6), 0, 1.1, 3.0, base, true);
    for (var s = 0; s < 6; s++) mesh(boxG(2.4, 0.06, 1.2), M('#1c3550', { metalness: 0.6, roughness: 0.25 }), -8 + s * 3.2, 0.9, 6, base).rotation.x = -0.5;
    W.addPlace('moonbase', 26, -22, 4.2, { x: 26, z: -18.4 });
    // the spot to plant the flag
    var ring = mesh(new THREE.TorusGeometry(1.6, 0.08, 8, 40), glowMat('#e2c88f', 0.8), -18, H(-18, -30) + 0.1, -30, G, true); ring.rotation.x = Math.PI / 2;
    W.flagSpot = [-18, -30]; W.addPlace('flag', -18, -30, 0, { x: -18, z: -30 });
    W.plantFlag = function () { var f = new THREE.Group(); f.position.set(-18, H(-18, -30), -30); G.add(f); mesh(boxG(0.06, 2.6, 0.06), M('#dddddd'), 0, 1.3, 0, f); mesh(boxG(1.4, 0.8, 0.02), signMat('交叉點', '#1f3557', '#e2c88f', false), 0.72, 2.2, 0, f); };
    // a rover going around
    var rover = new THREE.Group(); G.add(rover); mesh(boxG(1.6, 0.5, 2.4), M('#e9eef3'), 0, 0.7, 0, rover); [[-0.8, 0.8], [0.8, 0.8], [-0.8, -0.8], [0.8, -0.8]].forEach(function (w) { mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.25, 12), M('#333'), w[0], 0.35, w[1], rover).rotation.z = Math.PI / 2; });
    mesh(boxG(1.2, 0.05, 0.8), M('#1c3550'), 0, 1.0, -0.4, rover);
    W.anims.push(function (t) { var a = t * 0.08, x = Math.cos(a) * 30, z = Math.sin(a) * 30 + 10; rover.position.set(x, H(x, z), z); rover.rotation.y = -a; });
    W.spawn = { x: 0, z: -2.5, ry: Math.PI };
    return W;
  }
  function mars() {
    var crat = []; for (var c = 0; c < 10; c++) { var x = (hash(c, 21) - 0.5) * 200, z = (hash(c, 22) - 0.5) * 200; if (Math.hypot(x, z) < 25) continue; crat.push([x, z, 5 + hash(c, 23) * 12, 1 + hash(c, 24) * 2]); }
    var W = planetSurface('mars', { gravity: 8.5, ground: '#b86a43', rock: '#8a4a30', hill: 3, craters: crat, mountains: true, env: { sky: ['#c27f5a', '#e8b58e'], fog: [40, 180], hemi: 0.55, sun: 1.5, dust: true } });
    var G = W.group, H = W.groundY;
    lander(G, 0, -6, H(0, -6)); W.addPlace('lander', 0, -6, 2.2, { x: 0, z: -2.8 });
    var hab = new THREE.Group(); hab.position.set(-24, H(-24, -20), -20); G.add(hab);
    mesh(new THREE.SphereGeometry(4, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2), M('#f1e6da', { roughness: 0.5 }), 0, 0, 0, hab);
    mesh(new THREE.SphereGeometry(2.6, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#bfe8ff', transparent: true, opacity: 0.4, roughness: 0.1 }), 6, 0, 1, hab, true);
    mesh(boxG(1.2, 2.2, 0.3), glowMat('#38d07a', 0.6), 0, 1.1, 3.9, hab, true);
    W.addPlace('marshab', -24, -20, 5, { x: -24, z: -15.2 });
    // the future city: grows when the story reaches it
    var fc = new THREE.Group(); fc.position.set(22, H(22, -34), -34); G.add(fc); fc.visible = false; W.futureCity = fc;
    var dome = mesh(new THREE.SphereGeometry(14, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#bfe8ff', transparent: true, opacity: 0.22, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false }), 0, 0, 0, fc, true);
    var fm = facade({ base: '#eef3f8', cols: 3, rows: 8, lit: 0.8, glass: '#9fd0ee', tight: true });
    for (var b = 0; b < 16; b++) { var a = b / 16 * Math.PI * 2, r = 3 + hash(b, 3) * 7, hh = 3 + hash(b, 4) * 9; mesh(boxG(1.8, hh, 1.8), fm, Math.cos(a) * r, hh / 2, Math.sin(a) * r, fc); }
    for (var tr = 0; tr < 10; tr++) tree(fc, (hash(tr, 1) - 0.5) * 18, (hash(tr, 2) - 0.5) * 18, 0.9);
    var ring = mesh(new THREE.TorusGeometry(2, 0.1, 8, 40), glowMat('#e2c88f', 0.8), 22, H(22, -20) + 0.1, -20, G, true); ring.rotation.x = Math.PI / 2;
    W.addPlace('city', 22, -20, 0, { x: 22, z: -20 });
    W.addPlace('citydome', 22, -34, 14);
    W.places.citydome.door = null;
    W.revealCity = function () { fc.visible = true; fc.scale.set(1, 0.01, 1); var t0 = performance.now(); W.anims.push(function () { var u = Math.min(1, (performance.now() - t0) / 3000); fc.scale.set(1, Math.max(0.01, 1 - Math.pow(1 - u, 3)), 1); }); };
    W.spawn = { x: 0, z: -2.5, ry: Math.PI };
    return W;
  }
  // a non-walkable scene for travelling: by plane or by rocket
  function travel(kind) {
    var W = { id: 'travel-' + kind, group: new THREE.Group(), anims: [], gravity: 0, sea: kind === 'flight', travel: true };
    var G = W.group;
    W.env = kind === 'flight' ? { sky: ['#3f86c9', '#d6ecf7'], fog: [80, 400], hemi: 0.8, sun: 1.6 } : { sky: ['#000000', '#000000'], fog: [500, 900], hemi: 0.3, sun: 2, stars: true, space: true };
    W.bounds = function () { return { x0: -1, x1: 1, z0: -1, z1: 1 }; }; W.groundY = function () { return -100; }; W.solid = function () { return false; }; W.place = function () { return null; };
    W.mini = function () {}; W.spawn = { x: 0, z: 0, ry: 0 };
    if (kind === 'flight') {
      var plane = makePlane(); G.add(plane); W.actor = plane;
      for (var c = 0; c < 40; c++) { var cl = new THREE.Group(); cl.position.set((hash(c, 1) - 0.5) * 300, -8 - hash(c, 2) * 20, -c * 25); G.add(cl); for (var p = 0; p < 4; p++) mesh(K.SPHERE(6 + hash(c, p) * 5, 10, 8), M('#ffffff', { roughness: 1 }), p * 6 - 9, 0, 0, cl, true); }
      W.shots = [[[18, 6, 18], [0, 0, 0]], [[-10, 2, -14], [0, 0, 3]], [[0, 30, 10], [0, 0, -20]]];
      W.update = function (t) { plane.position.z = -t * 40 % 900; plane.rotation.z = Math.sin(t) * 0.08; G.children.forEach(function (o) { if (o !== plane && o.position.z > plane.position.z + 80) o.position.z -= 1000; }); };
    } else {
      var rk = makeRocket(); rk.rotation.x = -Math.PI / 2; G.add(rk); rk.userData.flame.visible = true; W.actor = rk;
      var from = mesh(K.SPHERE(kind === 'moon' ? 40 : 20, 48, 32), new THREE.MeshStandardMaterial(kind === 'moon' ? { map: earthTex(), emissive: '#16304f', emissiveIntensity: 0.4 } : { color: '#a7a7a3', roughness: 1 }), 0, -60, 60, G, true);
      var to = mesh(K.SPHERE(kind === 'moon' ? 20 : 34, 48, 32), new THREE.MeshStandardMaterial({ color: kind === 'moon' ? '#a7a7a3' : '#c1653c', roughness: 1 }), 0, 10, -260, G, true);
      W.shots = [[[8, 3, 10], [0, 0, 0]], [[-6, 4, -12], [0, 0, 0]], [[0, 2, 14], [0, 0, -60]]];
      W.update = function (t) { from.position.z = 60 + t * 18; to.position.z = -260 + t * 22; rk.userData.flame.scale.y = 1 + Math.random() * 0.4; };
    }
    return W;
  }

  return { city: city, ROOMS: ROOMS, moon: moon, mars: mars, travel: travel, makeRocket: makeRocket, B: B, P: P, LOT: LOT };
})();
