/* 《交叉點》Crossroads engine: worlds, quests, doors, cutscenes, travel, jumping.
   Story: game-data.js · People and helpers: game-kit.js · Places: game-worlds.js (three.js r128). */
(function () {
  'use strict';
  var D = window.GAME_DATA, K = window.DRK, DW = window.DRW, THREE = window.THREE;
  var root = document.documentElement, wrap = document.getElementById('game');
  if (!wrap || !D || !K || !DW || !THREE) return;
  var $ = function (id) { return document.getElementById(id); };
  var canvas = $('game-canvas'), panel = $('game-panel'), hud = $('game-hud'), tip = $('game-tip'), fxLayer = $('game-fx');
  var mini = $('game-mini'), mctx = mini.getContext('2d'), joy = $('game-joy'), knob = joy.querySelector('i');
  var viewBtn = $('game-view'), help = $('game-help'), goalEl = $('game-goal'), jumpBtn = $('game-jump'), fade = $('game-fade');
  var DEMO = new URLSearchParams(location.search).has('demo'), TOUCH = K.TOUCH;

  function lang() { return root.getAttribute('data-lang') === 'zh' ? 'zh' : 'en'; }
  function T(o) { return o ? o[lang()] : ''; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------- state ---------- */
  var KEY = 'dreamers-road-v4', CH = D.CHAPTERS, S;
  function fresh() { return { ch: 0, step: 0, look: 0, world: 'hk', stats: { family: 30, dream: 10, impact: 0, money: 0 }, buildings: [], done: false }; }
  function save() { if (DEMO || !S || phase === 'title' || phase === 'pick') return; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  function load() { try { var s = JSON.parse(localStorage.getItem(KEY)); if (s && s.stats) return s; } catch (e) {} return null; }
  function chap() { return CH[Math.min(S.ch, CH.length - 1)]; }
  function step() { return S.done ? null : chap().steps[S.step]; }
  var phase = 'title';   // title, pick, play, cut, choice, reply, milestone, travel, end

  /* ---------- renderer, sky, lights ---------- */
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, TOUCH ? 1.5 : 1.75));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  var scene = new THREE.Scene(); scene.background = new THREE.Color('#9fd0ee'); scene.fog = new THREE.Fog('#9fd0ee', 70, 240);
  var camera = new THREE.PerspectiveCamera(55, 1, 0.05, 1500);
  var hemi = new THREE.HemisphereLight(0xcfe8ff, 0x5d7a4a, 0.75); scene.add(hemi);
  var sun = new THREE.DirectionalLight(0xfff0d8, 1.6); sun.castShadow = true; sun.shadow.mapSize.set(TOUCH ? 1024 : 2048, TOUCH ? 1024 : 2048);
  var sc = sun.shadow.camera; sc.near = 1; sc.far = 160; sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02; scene.add(sun); scene.add(sun.target);
  var skyGeo = new THREE.SphereGeometry(800, 32, 16), skyCol = new Float32Array(skyGeo.attributes.position.count * 3);
  skyGeo.setAttribute('color', new THREE.BufferAttribute(skyCol, 3));
  var skyMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false }), sky = new THREE.Mesh(skyGeo, skyMat); scene.add(sky);
  function setSky(topC, horC) {
    var a = new THREE.Color(topC), b = new THREE.Color(horC), c = new THREE.Color();
    for (var v = 0; v < skyGeo.attributes.position.count; v++) { var y = skyGeo.attributes.position.getY(v) / 800; c.copy(b).lerp(a, Math.max(0, Math.min(1, y * 1.8))); skyCol[v * 3] = c.r; skyCol[v * 3 + 1] = c.g; skyCol[v * 3 + 2] = c.b; }
    skyGeo.attributes.color.needsUpdate = true;
  }
  var starPos = []; for (var s0 = 0; s0 < 1500; s0++) { var th = Math.random() * Math.PI * 2, ph = Math.acos(Math.random() * 1.6 - 0.6), r0 = 700; starPos.push(Math.sin(ph) * Math.cos(th) * r0, Math.cos(ph) * r0, Math.sin(ph) * Math.sin(th) * r0); }
  var starGeo = new THREE.BufferGeometry(); starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  var starMat = new THREE.PointsMaterial({ color: '#ffffff', size: 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: 0 }); scene.add(new THREE.Points(starGeo, starMat));
  var sea = K.mesh(new THREE.PlaneGeometry(1200, 1200, 70, 70), new THREE.MeshStandardMaterial({ color: '#2b7aa6', roughness: 0.18, metalness: 0.25 }), 0, -0.9, 0, scene, true);
  sea.rotation.x = -Math.PI / 2; sea.receiveShadow = true; var seaPos = sea.geometry.attributes.position;
  var dustP = null;

  /* ---------- worlds ---------- */
  var HK_FIXED = { home: [0, 0], school: [-1, 1], library: [1, -1], rooftop: [1, 1], restaurant: [-2, 0], tv: [-3, -1], university: [3, 1], airport: [0, 3] };
  var NY_FIXED = { nyoffice: [1, 0], nyexchange: [-1, 0], biolab: [0, 2], nyschool: [2, 2], park: [-2, 2], incubator: [2, -2], spaceport: [0, -3] };
  var ROOM_OF = { home: 'home', school: 'classroom', library: 'library', rooftop: 'rooftop', studio: 'studio', restaurant: 'restaurant', store: 'store', factory: 'factory', tv: 'tvstudio', university: 'lab', nyoffice: 'nyoffice', nyexchange: 'exchange', biolab: 'lab', nyschool: 'talk', incubator: 'incubator', moonbase: 'moonbase', marshab: 'marshab' };
  var worlds = {}, W = null, outside = null, outsidePlace = null;
  function hkGrow() { var g = [-1, 1, -1, 1]; for (var c = 0; c <= Math.min(S.ch, CH.length - 1); c++) if (CH[c].grow) g = CH[c].grow; if (S.done) g = [-3, 3, -3, 3]; return g; }
  function getWorld(id) {
    if (worlds[id]) return worlds[id];
    var w;
    if (id === 'hk') w = DW.city('hk', { bounds: hkGrow(), fixed: HK_FIXED, state: S });
    else if (id === 'ny') w = DW.city('ny', { bounds: [-3, 3, -3, 3], fixed: NY_FIXED, state: S, spawn: { x: 0, z: -DW.P + DW.LOT / 2 + 1.4, ry: Math.PI } });
    else if (id === 'moon') w = DW.moon();
    else if (id === 'mars') w = DW.mars();
    w.syncPeople && w.syncPeople(NPC_LOOKS);
    return (worlds[id] = w);
  }
  function applyEnv(w) {
    var e = w.env, night = e.night || phase === 'title' || phase === 'end' && !w.interior;
    setSky(e.sky[0], e.sky[1]);
    scene.background.set(e.sky[1]); scene.fog.color.set(e.sky[1]); scene.fog.near = e.fog[0]; scene.fog.far = e.fog[1];
    hemi.intensity = e.hemi; sun.intensity = e.sun; sun.visible = e.sun > 0;
    sea.visible = !!w.sea;
    starMat.opacity = e.stars ? 1 : 0;
    wrap.classList.toggle('in-space', !!e.space);
    if (dustP) { scene.remove(dustP); dustP = null; }
    if (e.dust) { var pp = []; for (var k = 0; k < 600; k++) pp.push((Math.random() - 0.5) * 120, Math.random() * 20, (Math.random() - 0.5) * 120); var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pp, 3)); dustP = new THREE.Points(g, new THREE.PointsMaterial({ color: '#e0a07a', size: 0.12, transparent: true, opacity: 0.6 })); scene.add(dustP); }
  }
  function enterWorld(w, at, ry) {
    if (W && W.group.parent) scene.remove(W.group);
    W = w; scene.add(W.group); applyEnv(W);
    swapPlayerForWorld();
    var sp = at || W.spawn;
    player.position.set(sp.x, W.groundY(sp.x, sp.z) + 0.02, sp.z); player.rotation.y = ry != null ? ry : (sp.ry || 0);
    vy = 0; playerVel = 0; walkTo = null;
    camYaw = player.rotation.y + Math.PI; snapCam = true;
    showPlots(phase === 'play' && step() && step().type === 'build' && !W.interior);
  }
  var NPC_LOOKS = [
    { skin: '#f1c7a0', hair: '#222', top: '#3c6fa8', bottom: '#2a2d36', shoes: '#222', side: true },
    { skin: '#e3b088', hair: '#5a3a22', top: '#e9c46a', bottom: '#264653', shoes: '#eee', longHair: true },
    { skin: '#c68e63', hair: '#111', top: '#f4a261', bottom: '#3a3a3a', shoes: '#111', cap: '#264653', short: true },
    { skin: '#f4d0b0', hair: '#9a6a3a', top: '#7a5ad8', bottom: '#333', shoes: '#ddd', skirt: true, longHair: true },
    { skin: '#8d5a3b', hair: '#111', top: '#2a9d8f', bottom: '#1d3557', shoes: '#fff', short: true },
    { skin: '#f1c7a0', hair: '#555', top: '#8d6a28', bottom: '#5b5b5b', shoes: '#333', grey: true, bald: true },
    { skin: '#e9b98f', hair: '#2b1b14', top: '#e76f51', bottom: '#264653', shoes: '#fff', hood: true },
    { skin: '#f3d2b5', hair: '#1a1a1a', top: '#2a2f3a', bottom: '#1f2a44', shoes: '#111', shirt: '#ffffff', tie: '#b03a2e', jacket: true },
    { skin: '#dcae88', hair: '#3a2416', top: '#9b2c3a', bottom: '#2a2a33', shoes: '#2a1a1a', bun: true, skirt: true },
    { skin: '#f0c8a8', hair: '#6b4a2e', top: '#58a4b0', bottom: '#3b3b3b', shoes: '#eee', short: true, side: true }
  ];
  var ROLE = {
    mum: { skin: '#f1cba9', hair: '#2a1b14', top: '#c45b6b', bottom: '#3b3f5c', shoes: '#4a2a2a', longHair: true, skirt: true },
    dad: { skin: '#e8bd98', hair: '#2b2b2b', top: '#5b6f86', bottom: '#2e2e2e', shoes: '#222', shirt: '#ffffff', tie: '#5b6f86', glasses: true, grey: true },
    kid: { skin: '#f3cfae', hair: '#1a1a1a', top: '#ffffff', bottom: '#5a6475', shoes: '#111', short: true, side: true, kid: true },
    kid2: { skin: '#e8b892', hair: '#2b1b14', top: '#ffffff', bottom: '#5a6475', shoes: '#111', short: true, kid: true, cap: '#d6453d' },
    suitold: { skin: '#e9c09c', hair: '#888', top: '#3a3d44', bottom: '#2a2c31', shoes: '#111', shirt: '#ffffff', tie: '#7a2e3b', jacket: true, grey: true, bald: true },
    woman: { skin: '#f2cdb0', hair: '#2b1a12', top: '#1f3557', bottom: '#2a2d36', shoes: '#111', bun: true, jacket: true, shirt: '#ffffff', tie: '#1f3557' },
    lab: { skin: '#f3cdaa', hair: '#2b211c', top: '#f5f6f8', bottom: '#3d5a80', shoes: '#4a4a4a', coat: true, glasses: true },
    partner: { skin: '#f4d6bd', hair: '#3a2416', top: '#ffffff', bottom: '#ffffff', shoes: '#f2f2f2', longHair: true, dress: true, short: true, fem: true },
    astro: { skin: '#f1c7a0', hair: '#1d1a19', top: '#eef1f5', bottom: '#eef1f5', shoes: '#9aa3ad', helmet: true }
  };

  /* ---------- player ---------- */
  var player = new THREE.Group(), playerLooks = {}, vy = 0, playerVel = 0;
  function swapPlayerForWorld() {
    var space = W && (W.id === 'moon' || W.id === 'mars' || W.id === 'moonbase' || W.id === 'marshab');
    var key = space ? 'space' : 'earth';
    if (player.userData.key === key) { scene.add(player); return; }
    var base = D.LOOKS[S.look || 0], look = space ? Object.assign({}, base, { helmet: true, top: '#eef1f5', bottom: '#eef1f5', shoes: '#9aa3ad', jacket: false, coat: false, skirt: false, cap: null, hood: false }) : base;
    var h = K.human(look), pos = player.position.clone(), ry = player.rotation.y;
    scene.remove(player); player = h; player.position.copy(pos); player.rotation.y = ry; player.userData.key = key; scene.add(player);
  }

  /* ---------- camera ---------- */
  var camYaw = 0, camDist = 6.2, camPitch = 0.33, mode = 'follow', snapCam = true, lastLook = 0, overviewUntil = 0;
  var camPos = new THREE.Vector3(40, 40, 40), camLook = new THREE.Vector3(), tA = new THREE.Vector3(), tB = new THREE.Vector3(), cut = null;
  function updateCamera(t, dt) {
    var k = 1 - Math.pow(0.002, dt), fast = 2.2, ov = false;
    if (cut && cut.cam) { tA.copy(cut.cam.p); tB.copy(cut.cam.l); fast = 1.6; }
    else if (phase === 'title' || phase === 'pick' || phase === 'end' && mode !== 'follow' || mode === 'map' || performance.now() < overviewUntil) {
      ov = true;
      var c = W.overviewCenter ? W.overviewCenter() : new THREE.Vector3(0, 0, 0), b = W.bounds(), size = Math.max(b.x1 - b.x0, b.z1 - b.z0), a = phase === 'title' || phase === 'end' || phase === 'pick' ? t * 0.05 + 0.6 : camYaw;
      var d = Math.min(150, size * (camera.aspect < 1 ? 1.25 : 0.8) + 12);
      if (W.interior) { var cw = W.cams.wide; tA.set(cw[0], cw[1], cw[2]); tB.set(cw[3], cw[4], cw[5]); }
      else { tA.set(Math.sin(a) * d * 0.75, d * 0.6, Math.cos(a) * d * 0.75); tB.set(0, 0, 0); }
      fast = 0.7;
    } else {
      var pp = player.position, dd = camDist; tB.set(pp.x, pp.y + 1.25, pp.z);
      for (; dd > 1.4; dd -= 0.2) {
        tA.set(pp.x + Math.sin(camYaw) * Math.cos(camPitch) * dd, pp.y + 1.25 + Math.sin(camPitch) * dd, pp.z + Math.cos(camYaw) * Math.cos(camPitch) * dd);
        if (!(W.camSolid && W.camSolid(tA))) break;
      }
      var gy = W.groundY(tA.x, tA.z) + 0.4; if (tA.y < gy) tA.y = gy;
    }
    if (snapCam) { camPos.copy(tA); camLook.copy(tB); snapCam = false; }
    camPos.lerp(tA, Math.min(1, k * fast)); camLook.lerp(tB, Math.min(1, k * fast * 1.3));
    camera.position.copy(camPos); camera.lookAt(camLook);
    sun.position.set(camLook.x + 30, 45, camLook.z + 18); sun.target.position.copy(camLook);
    var span = ov ? 70 : 26; if (sc.right !== span) { sc.left = -span; sc.right = span; sc.top = span; sc.bottom = -span; sc.updateProjectionMatrix(); }
  }

  /* ---------- input ---------- */
  var keys = {}, joyV = { x: 0, y: 0 }, walkTo = null, jd = null, drag = null, pinch = {};
  function canWalk() { return phase === 'play' || phase === 'end' && mode === 'follow'; }
  addEventListener('keydown', function (e) {
    var k = e.key.toLowerCase();
    if (k === ' ' && canWalk() && !/^(BUTTON|INPUT|A)$/.test(e.target.tagName)) { jump(); e.preventDefault(); return; }
    if (/^(w|a|s|d|arrowup|arrowdown|arrowleft|arrowright|shift)$/.test(k) && canWalk()) { keys[k] = true; walkTo = null; if (k.indexOf('arrow') === 0) e.preventDefault(); }
  });
  addEventListener('keyup', function (e) { keys[e.key.toLowerCase()] = false; });
  addEventListener('blur', function () { keys = {}; });
  jumpBtn.addEventListener('pointerdown', function (e) { e.preventDefault(); jump(); });
  function jump() { if (!canWalk()) return; var gy = W.groundY(player.position.x, player.position.z); if (player.position.y - gy < 0.08) { vy = W.gravity < 5 ? 5.2 : W.gravity < 10 ? 6 : 7.2; player.userData.air = true; } }
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
    if (ids.length === 2 && drag) { var a = pinch[ids[0]], b = pinch[ids[1]], d = Math.hypot(a.x - b.x, a.y - b.y); if (!drag.d0) { drag.d0 = d; drag.dist = camDist; } camDist = Math.max(2.5, Math.min(22, drag.dist * drag.d0 / d)); drag.moved = true; return; }
    if (!drag || e.pointerId !== drag.id) return;
    var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 8) drag.moved = true;
    if (drag.moved) { camYaw = drag.yaw - dx * 0.009; camPitch = Math.max(0.05, Math.min(1.25, drag.pitch + dy * 0.005)); lastLook = performance.now(); }
  });
  function pUp(e) { delete pinch[e.pointerId]; var d = drag; if (!d || e.pointerId !== d.id) return; drag = null; if (!d.moved) tap(e.clientX, e.clientY); }
  canvas.addEventListener('pointerup', pUp);
  canvas.addEventListener('pointercancel', function (e) { delete pinch[e.pointerId]; drag = null; });
  canvas.addEventListener('wheel', function (e) { e.preventDefault(); camDist = Math.max(2.5, Math.min(22, camDist * (e.deltaY > 0 ? 1.1 : 0.9))); }, { passive: false });
  var ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function tap(cx, cy) {
    if (cut) { advanceShot(); return; }
    if (!canWalk()) return;
    var r = canvas.getBoundingClientRect(); ndc.set((cx - r.left) / r.width * 2 - 1, -(cy - r.top) / r.height * 2 + 1);
    ray.setFromCamera(ndc, camera);
    var plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -W.groundY(player.position.x, player.position.z)), hit = new THREE.Vector3();
    if (!ray.ray.intersectPlane(plane, hit)) return;
    var st = step();
    if (st && st.type === 'build' && W.lotOf && W.id === 'hk') { var lot = W.lotOf(hit.x, hit.z); if (lot && W.isVacant(lot.i, lot.j)) { doBuild(lot.i, lot.j); return; } }
    walkTo = hit; if (mode === 'map') setMode('follow');
  }
  viewBtn.addEventListener('click', function () { setMode(mode === 'map' ? 'follow' : 'map'); });
  function setMode(m) { mode = m; viewBtn.textContent = mode === 'map' ? '🚶 ' + T(D.UI.follow) : '🗺️ ' + T(D.UI.view); }

  /* ---------- movement ---------- */
  function movePlayer(dt) {
    var ix = 0, iy = 0;
    if (canWalk()) { ix = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0) + joyV.x; iy = (keys.w || keys.arrowup ? 1 : 0) - (keys.s || keys.arrowdown ? 1 : 0) + joyV.y; }
    var mx = 0, mz = 0, run = keys.shift || Math.hypot(joyV.x, joyV.y) > 0.92;
    if (Math.abs(ix) + Math.abs(iy) > 0.05) { mx = -Math.sin(camYaw) * iy + Math.cos(camYaw) * ix; mz = -Math.cos(camYaw) * iy - Math.sin(camYaw) * ix; }
    else if (walkTo && canWalk()) { var dx = walkTo.x - player.position.x, dz = walkTo.z - player.position.z, dd = Math.hypot(dx, dz); if (dd < 0.3) walkTo = null; else { mx = dx; mz = dz; run = dd > 6; } }
    var ml = Math.hypot(mx, mz), sp = ml > 0.01 ? Math.min(1, ml) * (run ? 6.0 : 3.0) * (W.gravity < 5 ? 0.8 : 1) : 0;
    playerVel += (sp - playerVel) * Math.min(1, dt * 10);
    var b = W.bounds(), p = player.position;
    if (ml > 0.01 && playerVel > 0.02) {
      var nx = p.x + mx / ml * playerVel * dt, nz = p.z + mz / ml * playerVel * dt;
      function free(x, z) { return x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1 && !W.solid(x, z, p.y - 0.1); }
      if (free(nx, nz)) { p.x = nx; p.z = nz; } else if (free(nx, p.z)) p.x = nx; else if (free(p.x, nz)) p.z = nz; else walkTo = null;
      var want = Math.atan2(mx, mz), diff = Math.atan2(Math.sin(want - player.rotation.y), Math.cos(want - player.rotation.y));
      player.rotation.y += diff * Math.min(1, dt * 12);
      if (performance.now() - lastLook > 1800) { var behind = player.rotation.y + Math.PI, cd = Math.atan2(Math.sin(behind - camYaw), Math.cos(behind - camYaw)); if (Math.abs(cd) < 2.2) camYaw += cd * Math.min(1, dt * 1.1); }
    }
    var gy = W.groundY(p.x, p.z);
    vy -= W.gravity * dt; p.y += vy * dt;
    if (p.y <= gy + 0.01) { p.y = gy + 0.01; vy = 0; player.userData.air = false; }
    K.animateHuman(player, playerVel, dt);
  }

  /* ---------- quest: targets, doors, plots ---------- */
  var beam = new THREE.Group(), beamMat = new THREE.MeshBasicMaterial({ color: '#ffd77a', transparent: true, opacity: 0.35, depthWrite: false });
  K.mesh(new THREE.CylinderGeometry(0.6, 0.6, 30, 16, 1, true), beamMat, 0, 15, 0, beam, true);
  var ringM = K.mesh(new THREE.TorusGeometry(1.1, 0.07, 8, 40), new THREE.MeshBasicMaterial({ color: '#ffd77a' }), 0, 0.15, 0, beam, true); ringM.rotation.x = Math.PI / 2;
  var arrowM = K.mesh(new THREE.ConeGeometry(0.35, 0.7, 4), new THREE.MeshBasicMaterial({ color: '#ffd77a' }), 0, 3.4, 0, beam, true); arrowM.rotation.x = Math.PI;
  scene.add(beam);
  function target() {
    var st = step(); if (!st || phase !== 'play') return null;
    if (W.interior) return { exit: true, x: W.exit.x, z: W.exit.z };
    if (st.type === 'build') return null;
    var worldId = st.type === 'travel' ? st.from : chap().world;
    if (W.id !== worldId) return null;
    var pl = W.place(st.place); if (!pl) return null;
    var pt = st.type === 'outdoor' || pl.door == null ? { x: pl.x + (st.me ? st.me[0] : 0), z: pl.z + (st.me ? st.me[1] : 3) } : pl.door;
    if (st.type === 'travel' && st.place === 'lander') pt = pl.door;
    return { x: pt.x, z: pt.z, place: pl, st: st };
  }
  var plotMeshes = [], plotMat = new THREE.MeshBasicMaterial({ color: '#ffd77a', transparent: true, opacity: 0.45, depthWrite: false });
  function showPlots(on) {
    plotMeshes.forEach(function (m) { scene.remove(m); }); plotMeshes = [];
    if (!on || !W.freeLots) return;
    W.freeLots().forEach(function (l) {
      var m = new THREE.Mesh(new THREE.BoxGeometry(DW.LOT - 1.2, 0.05, DW.LOT - 1.2), plotMat); m.position.set(l[0] * DW.P, 0.24, l[1] * DW.P); scene.add(m);
      var b = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 14, 12, 1, true), beamMat); b.position.set(l[0] * DW.P, 7, l[1] * DW.P); scene.add(b); plotMeshes.push(m, b);
    });
  }
  function doBuild(i, j) {
    var st = step(); if (!st || st.type !== 'build') return;
    S.buildings.push({ world: W.id, i: i, j: j, type: st.build }); W.build(st.build, i, j); showPlots(false);
    var p = player.position; if (Math.abs(p.x - i * DW.P) < 3.2 && Math.abs(p.z - j * DW.P) < 3.2) { p.set(i * DW.P, 0.01, j * DW.P + DW.LOT / 2 + 1.4); }
    floatMsg('🏗️ ' + T(D.PLACES[st.build] || {}), 'up');
    nextStep();
  }
  var nearDoor = null, standLot = null;
  function checkPlaces() {
    if (phase !== 'play') { nearDoor = null; return; }
    var tg = target(), p = player.position;
    // the objective
    if (tg) {
      beam.visible = true; beam.position.set(tg.x, W.groundY(tg.x, tg.z), tg.z); arrowM.position.y = 3.4 + Math.sin(performance.now() / 300) * 0.25;
      var d = Math.hypot(p.x - tg.x, p.z - tg.z);
      if (d < (tg.exit ? 1.0 : 1.6)) { if (tg.exit) exitRoom(); else reach(tg); return; }
    } else beam.visible = false;
    // other doors you can visit
    var nd = null;
    if (!W.interior && W.place) Object.keys(ROOM_OF).forEach(function (type) { var pl = W.place(type); if (pl && pl.door && Math.hypot(p.x - pl.door.x, p.z - pl.door.z) < 1.8) nd = pl; });
    if (nd !== nearDoor) { nearDoor = nd; render(); }
    if (W.interior && Math.hypot(p.x - W.exit.x, p.z - W.exit.z) < 1.0 && !(tg && tg.exit)) exitRoom();
    var st = step();
    if (st && st.type === 'build' && W.lotOf) { var lot = W.lotOf(p.x, p.z), key = lot && W.isVacant(lot.i, lot.j) ? lot.i + ',' + lot.j : null; if (key !== standLot) { standLot = key; render(); } }
  }
  function reach(tg) {
    var st = tg.st; walkTo = null; keys = {}; endJoy();
    if (st.type === 'go') {
      var room = enterRoom(st.room || ROOM_OF[st.place], tg.place);
      playScene(st, room, null);
    } else if (st.type === 'outdoor') playScene(st, W, tg.place);
    else if (st.type === 'travel') travel(st);
  }

  /* ---------- rooms ---------- */
  function enterRoom(id, place) {
    outside = W; outsidePlace = place;
    var r = DW.ROOMS[id](); r.outsideId = outside.id;
    fadeOut(function () {});
    enterWorld(r);
    return r;
  }
  function exitRoom() {
    if (!W.interior || !outside) return;
    var o = outside, pl = outsidePlace; outside = null;
    fadeOut(function () {});
    enterWorld(o, pl && pl.door ? { x: pl.door.x, z: pl.door.z + 0.8 } : null, 0);
    camYaw = Math.PI; snapCam = true;
    render();
  }
  function fadeOut(cb) { fade.classList.remove('on'); void fade.offsetWidth; fade.classList.add('on'); setTimeout(cb, 10); }

  /* ---------- cutscenes ---------- */
  var actors = {}, confetti = [];
  function spawnActors(st, w, place) {
    Object.keys(actors).forEach(function (k) { if (k !== 'me') w.group.remove(actors[k]); }); actors = { me: player };
    Object.keys(st.cast || {}).forEach(function (name) {
      var c = st.cast[name], lookKey = Array.isArray(c) ? c[0] : c, look = ROLE[lookKey] || NPC_LOOKS[0], h = K.human(look);
      if (look.kid) h.scale.setScalar(0.78);
      w.group.add(h); actors[name] = h;
      if (Array.isArray(c)) { var x = place.x + c[1][0], z = place.z + c[1][1]; h.position.set(x, w.groundY(x, z) + 0.02, z); h.rotation.y = c[2] || 0; }
      else putAt(h, name, w);
    });
    if (w.interior) putAt(player, 'me', w);
    else if (st.me && place) { var mx = place.x + st.me[0], mz = place.z + st.me[1]; player.position.set(mx, w.groundY(mx, mz) + 0.02, mz); player.rotation.y = st.me[2]; }
    Object.keys(actors).forEach(function (k) { var s0 = w.slots && w.slots[k]; actors[k].userData.pose = s0 && s0[3] || null; });
  }
  function putAt(h, slot, w) { var s0 = w.slots && w.slots[slot]; if (!s0) return; h.position.set(s0[0], (s0[3] === 'talk' || slot === 'me' || /^(host|vip)$/.test(slot)) && w.stageY && s0[1] < -2.5 ? w.stageY : 0, s0[1]); h.rotation.y = s0[2]; if (s0[3]) h.userData.pose = s0[3]; }
  function camFor(spec, w, place) {
    var p = new THREE.Vector3(), l = new THREE.Vector3();
    if (spec === 'wide' || !actors[spec]) {
      if (w.interior && w.cams.wide) { var c = w.cams.wide; p.set(c[0], c[1], c[2]); l.set(c[3], c[4], c[5]); }
      else { var ctr = new THREE.Vector3(), n = 0; Object.keys(actors).forEach(function (k) { ctr.add(actors[k].position); n++; }); ctr.divideScalar(Math.max(1, n)); var ry = player.rotation.y + Math.PI; p.set(ctr.x + Math.sin(ry + 0.6) * 8, ctr.y + 3.6, ctr.z + Math.cos(ry + 0.6) * 8); l.set(ctr.x, ctr.y + 1, ctr.z); }
    } else {
      var a = actors[spec], s = a.scale.x, f = a.rotation.y;
      var hy = a.position.y + 1.22 * s + (a.userData.pose === 'sit' || a.userData.pose === 'type' ? -0.3 : 0);
      p.set(a.position.x + Math.sin(f) * 1.7 + Math.cos(f) * 0.55, hy + 0.12, a.position.z + Math.cos(f) * 1.7 - Math.sin(f) * 0.55);
      l.set(a.position.x, hy - 0.05, a.position.z);
      if (w.camSolid && w.camSolid(p)) { p.set(a.position.x + Math.sin(f) * 1.0, hy + 0.3, a.position.z + Math.cos(f) * 1.0); }
    }
    return { p: p, l: l };
  }
  function playScene(st, w, place) {
    phase = 'cut'; beam.visible = false; goalEl.hidden = true; wrap.classList.remove('walking'); tip.hidden = true;
    spawnActors(st, w, place);
    cut = { st: st, w: w, place: place, i: -1, cam: null, timer: 0 };
    if (st.fx && st.fx.money < 0) { apply({ money: st.fx.money }); cut.paid = true; }
    advanceShot();
  }
  function advanceShot() {
    if (!cut) return;
    if (cut.choosing) return;
    cut.i++;
    var shots = cut.st.shots || [];
    if (cut.i >= shots.length) { finishScene(); return; }
    var sh = shots[cut.i];
    if (sh.put) Object.keys(sh.put).forEach(function (a) { if (actors[a]) putAt(actors[a], sh.put[a], cut.w); });
    Object.keys(actors).forEach(function (a) { if (sh.pose && sh.pose[a]) actors[a].userData.pose = sh.pose[a]; });
    cut.cam = camFor(sh.cam, cut.w, cut.place);
    if (sh.fx === 'confetti') burst(cut.cam.l);
    if (sh.fx === 'flag' && cut.w.plantFlag) cut.w.plantFlag();
    if (sh.fx === 'city' && cut.w.revealCity) { cut.w.revealCity(); cut.cam = { p: new THREE.Vector3(cut.place.x + 14, 12, cut.place.z + 14), l: new THREE.Vector3(cut.place.x, 3, cut.place.z - 14) }; }
    cut.timer = (sh.t || 3) * 1.35 + 0.6 + T(sh.say[1]).length * (lang() === 'zh' ? 0.03 : 0.012);
    renderCut(sh);
  }
  function renderCut(sh) {
    var who = T(sh.say[0]);
    panel.innerHTML = head() + '<div class="g-say">' + (who ? '<b>' + esc(who) + '</b>' : '') + '<p>' + esc(T(sh.say[1])) + '</p></div>' +
      '<div class="g-row">' + btn(esc(T(D.UI.next)) + ' ▶', 'gold', 'data-go="shot"') + btn(esc(T(D.UI.skip)), 'ghost small', 'data-go="skip"') + '</div>';
    wrap.setAttribute('data-step', 'cut'); hud.innerHTML = statsHTML();
  }
  function finishScene() {
    var st = cut.st;
    if (st.choice && !cut.chosen) { cut.choosing = true; phase = 'choice'; render(); return; }
    endScene();
  }
  function endScene() {
    var st = cut.st, w = cut.w;
    Object.keys(actors).forEach(function (k) { if (k !== 'me') w.group.remove(actors[k]); actors[k].userData.pose = null; }); actors = {};
    player.userData.pose = null;
    var fx = Object.assign({}, st.fx || {}); if (cut.paid) delete fx.money; apply(fx);
    cut = null; phase = 'play';
    if (w.interior) { player.position.set(w.spawn.x, 0.02, w.spawn.z); player.rotation.y = 0; camYaw = Math.PI; snapCam = true; }
    nextStep();
  }
  function burst(at) {
    var cols = ['#e2475b', '#ffd23b', '#3bd1ff', '#7dff6b', '#ffffff', '#c9a35b'];
    for (var k = 0; k < 120; k++) {
      var m = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.01), new THREE.MeshBasicMaterial({ color: cols[k % cols.length], side: THREE.DoubleSide }));
      m.position.set(at.x + (Math.random() - 0.5) * 6, at.y + 3 + Math.random() * 2, at.z + (Math.random() - 0.5) * 6); scene.add(m);
      confetti.push({ m: m, vy: -0.6 - Math.random() * 0.8, vx: (Math.random() - 0.5) * 0.5, r: Math.random() * 6, life: 4 + Math.random() * 2 });
    }
  }

  /* ---------- travel ---------- */
  var travelScene = null;
  function travel(st) {
    phase = 'travel'; beam.visible = false; render();
    var go = function () {
      var tw = DW.travel(st.via === 'flight' ? 'flight' : st.via);
      if (W.group.parent) scene.remove(W.group);
      var from = W; W = tw; scene.add(tw.group); applyEnv(tw); scene.remove(player);
      travelScene = { w: tw, t0: performance.now(), shot: 0 };
      setTimeout(function () {
        scene.remove(tw.group); travelScene = null;
        S.world = st.to;
        var dest = getWorld(st.to);
        fadeOut(function () {});
        phase = 'play';
        enterWorld(dest, dest.spawn, dest.spawn.ry);
        nextStep();
      }, 7600);
    };
    if (st.launch && W.rocket) { // lift off from the pad first
      var rk = W.rocket, t0 = performance.now();
      cut = { cam: { p: new THREE.Vector3(rk.parent.parent.position.x + 14, 6, rk.parent.parent.position.z + 18), l: new THREE.Vector3(rk.parent.parent.position.x, 8, rk.parent.parent.position.z) } };
      scene.remove(player);
      rk.userData.flame.visible = true;
      var tick = function () { var u = (performance.now() - t0) / 1000; rk.position.y = 0.5 + u * u * 2.4; cut.cam.l.y = 8 + rk.position.y * 0.8; if (u < 4.2) requestAnimationFrame(tick); else { rk.userData.flame.visible = false; rk.position.y = 0.5; cut = null; go(); } };
      tick();
    } else go();
  }

  /* ---------- flow ---------- */
  function apply(fx) {
    if (!fx) return; var n = 0;
    Object.keys(fx).forEach(function (k) {
      if (!(k in S.stats)) return; var v = fx[k]; S.stats[k] = Math.max(k === 'money' ? -99 : 0, Math.min(100, S.stats[k] + v));
      var st = D.STATS.filter(function (s) { return s.k === k; })[0]; floatMsg(st.icon + ' ' + (v > 0 ? '+' : '') + v, v > 0 ? 'up' : 'down', n++);
    });
  }
  function floatMsg(text, cls, n) { var el = document.createElement('span'); el.className = 'fx ' + cls; el.textContent = text; el.style.left = (6 + (n || 0) * 22) + '%'; el.style.animationDelay = (n || 0) * 120 + 'ms'; fxLayer.appendChild(el); setTimeout(function () { el.remove(); }, 2400); }
  function nextStep() {
    S.step++;
    if (S.step >= chap().steps.length) { phase = 'milestone'; }
    var st = step(); showPlots(phase === 'play' && st && st.type === 'build' && !W.interior);
    save(); render();
  }
  function nextChapter() {
    if (S.ch >= CH.length - 1) { S.done = true; phase = 'end'; mode = 'orbit'; save(); if (W.interior) exitRoom(); render(); return; }
    S.ch++; S.step = 0; phase = 'play';
    var c = chap();
    if (c.grow && worlds.hk && worlds.hk.expand(c.grow)) { if (W === worlds.hk) overviewUntil = performance.now() + 3200; worlds.hk.syncPeople(NPC_LOOKS); }
    var st = step(); showPlots(st && st.type === 'build' && !W.interior);
    save(); render();
  }

  /* ---------- panel ---------- */
  function statsHTML() {
    return D.STATS.map(function (s) {
      var v = S.stats[s.k], neg = s.k === 'money' && v < 0, pct = Math.min(100, Math.abs(v));
      return '<div class="st' + (neg ? ' neg' : '') + '" title="' + esc(T(s.name)) + '"><span class="st-i">' + s.icon + '</span><span class="st-n">' + esc(T(neg ? s.debt : s.name)) + '</span><b>' + (neg ? '−' + Math.abs(v) : v) + '</b><i style="width:' + pct + '%"></i></div>';
    }).join('');
  }
  function head() { var c = chap(); return '<p class="g-chap">' + esc(T(D.UI.chapter)) + ' ' + (S.ch + 1) + ' ' + esc(T(D.UI.chapterSuffix)) + ' · ' + esc(T(c.age)) + '</p><h2 class="g-title">' + esc(T(c.title)) + '</h2>'; }
  function btn(label, cls, data) { return '<button type="button" class="g-btn ' + (cls || '') + '" ' + (data || '') + '>' + label + '</button>'; }
  var lookImgs = [];
  function render() {
    var playing = phase === 'play' || phase === 'end' && mode === 'follow';
    hud.innerHTML = phase === 'title' || phase === 'pick' ? '' : statsHTML();
    wrap.setAttribute('data-step', phase);
    wrap.classList.toggle('walking', playing);
    help.textContent = playing ? T(TOUCH ? D.UI.joy : D.UI.keys) : '';
    setMode(mode);
    var h = '', st = step();
    if (phase === 'title') {
      var sv = load(), can = sv && !sv.done && (sv.ch > 0 || sv.step > 0);
      h = '<div class="g-cover"><p class="g-chap">🎮 ' + esc(T(D.UI.sub)) + '</p><h2 class="g-big">' + esc(T(D.UI.title)) + '</h2><p class="g-note">' + esc(T(D.UI.note)) + '</p><div class="g-row">' +
        (can ? btn(esc(T(D.UI.resume)), 'gold', 'data-go="resume"') + btn(esc(T(D.UI.restart)), '', 'data-go="new"') : btn(esc(T(D.UI.start)) + ' →', 'gold', 'data-go="new"')) + '</div></div>';
    } else if (phase === 'pick') {
      h = '<p class="g-chap">' + esc(T(D.UI.title)) + '</p><h2 class="g-title">' + esc(T(D.UI.pick)) + '</h2><p class="g-text small">' + esc(T(D.UI.pickNote)) + '</p><div class="g-looks">' +
        D.LOOKS.map(function (l, n) { return '<button type="button" class="g-look" data-look="' + n + '">' + (lookImgs[n] ? '<img src="' + lookImgs[n] + '" alt="">' : '') + '<span>' + esc(T(l.name)) + '</span></button>'; }).join('') + '</div>';
    } else if (phase === 'play' && st) {
      h = head() + (S.step === 0 ? '<p class="g-text">' + esc(T(chap().intro)) + '</p>' : '') + '<p class="g-goal">🎯 ' + esc(T(st.label)) + '</p>';
      if (W.interior) h += '<div class="g-row">' + btn('🚪 ' + esc(T(D.UI.leave)), '', 'data-go="leave"') + '</div>';
      else if (st.type === 'build') h += '<p class="g-hint">🚶 ' + esc(T(D.UI.walkTo)) + '</p><div class="g-row">' + (standLot ? btn('🏗️ ' + esc(T(D.UI.buildHere)), 'gold', 'data-go="here"') : '') + btn(esc(T(D.UI.auto)), standLot ? '' : 'gold', 'data-go="auto"') + '</div>';
      else if (nearDoor && ROOM_OF[nearDoor.type]) h += '<div class="g-row">' + btn('🚪 ' + esc(T(D.UI.enter)) + ' ' + esc(T(D.PLACES[nearDoor.type])), '', 'data-go="enter"') + '</div>';
    } else if (phase === 'choice') {
      var sh = cut.st;
      h = head() + '<div class="g-opts">' + sh.choice.map(function (o, n) { return btn(esc(T(o.t)), 'opt', 'data-opt="' + n + '"'); }).join('') + '</div>';
    } else if (phase === 'reply') {
      h = head() + '<p class="g-text reply">' + esc(T(lastReply)) + '</p>' + btn(esc(T(D.UI.next)) + ' →', 'gold', 'data-go="replied"');
    } else if (phase === 'milestone') {
      h = head() + '<p class="g-chap">🏆 ' + esc(T(D.UI.milestone)) + '</p><p class="g-text reply">' + esc(T(chap().milestone)) + '</p>' + btn(esc(T(D.UI.nextChapter)) + ' →', 'gold', 'data-go="next"');
    } else if (phase === 'travel') {
      h = '<p class="g-chap">✈️ ' + esc(T(D.UI.travelling)) + '</p><h2 class="g-title">' + esc(T(D.UI.worlds[step() ? step().to : 'hk'] || {})) + '</h2>';
    } else if (phase === 'end') {
      var ks = ['dream', 'impact', 'family', 'money'], best = ks.reduce(function (a, b) { return S.stats[b] > S.stats[a] ? b : a; }), en = D.ENDINGS[best];
      h = '<p class="g-chap">' + esc(T(D.UI.yourPath)) + '</p><h2 class="g-big">' + esc(T(en.title)) + '</h2><p class="g-text reply">' + esc(T(en.text)) + '</p><p class="g-text small">' + esc(T(D.UI.endNote)) + '</p>' +
        '<p class="g-chap">🌏 ' + esc(T(D.UI.freeRoam)) + '</p><div class="g-row">' + ['hk', 'ny', 'moon', 'mars'].map(function (w) { return btn(esc(T(D.UI.worlds[w])), W.id === w && mode === 'follow' ? 'gold' : '', 'data-world="' + w + '"'); }).join('') + '</div>' +
        '<div class="g-row">' + btn(esc(T(D.UI.share)), '', 'data-go="share"') + btn(esc(T(D.UI.playAgain)), '', 'data-go="new"') + '</div><div class="g-row"><a class="g-btn ghost" href="about.html">' + esc(T(D.UI.meet)) + ' →</a><a class="g-btn ghost" href="contact.html">' + esc(T(D.UI.contact)) + ' →</a></div>';
    }
    panel.innerHTML = h; panel.scrollTop = 0;
  }
  var lastReply = null;
  panel.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b || b.disabled) return;
    if (b.dataset.opt) { var o = cut.st.choice[+b.dataset.opt]; apply(o.fx); lastReply = o.r; cut.chosen = true; phase = 'reply'; render(); save(); }
    else if (b.dataset.look) pickLook(+b.dataset.look);
    else if (b.dataset.world) roam(b.dataset.world);
    else if (b.dataset.go) go(b.dataset.go);
  });
  function go(what) {
    if (what === 'new') { phase = 'pick'; render(); }
    else if (what === 'resume') { S = load(); startGame(); }
    else if (what === 'shot') advanceShot();
    else if (what === 'skip') { if (cut) { cut.i = (cut.st.shots || []).length; finishScene(); } }
    else if (what === 'replied') { cut.choosing = false; endScene(); }
    else if (what === 'next') nextChapter();
    else if (what === 'leave') exitRoom();
    else if (what === 'enter' && nearDoor) { var pl = nearDoor; enterRoom(ROOM_OF[pl.type], pl); render(); }
    else if (what === 'here') { var l = W.lotOf(player.position.x, player.position.z); if (l && W.isVacant(l.i, l.j)) doBuild(l.i, l.j); }
    else if (what === 'auto') { var p = player.position, f = W.freeLots().sort(function (a, b) { return Math.hypot(a[0] * DW.P - p.x, a[1] * DW.P - p.z) - Math.hypot(b[0] * DW.P - p.x, b[1] * DW.P - p.z); }); if (f[0]) doBuild(f[0][0], f[0][1]); }
    else if (what === 'share') { var url = location.origin + location.pathname, text = T(D.UI.shareText); if (navigator.share) navigator.share({ title: T(D.UI.title), text: text, url: url }).catch(function () {}); else if (navigator.clipboard) navigator.clipboard.writeText(text + ' ' + url).then(function () { floatMsg(T(D.UI.copied), 'up'); }); }
  }
  function roam(id) { mode = 'follow'; S.world = id; fadeOut(function () {}); var w = getWorld(id); enterWorld(w, w.spawn, w.spawn.ry); render(); }
  function pickLook(n) { S = fresh(); S.look = n; worlds = {}; startGame(); }
  function startGame() {
    worlds = {}; player.userData.key = null; mode = 'follow';
    phase = S.done ? 'end' : 'play';
    var w = getWorld(S.world || chap().world);
    enterWorld(w, w.spawn, w.spawn.ry);
    render(); save();
  }

  /* ---------- per-frame ---------- */
  var last = performance.now(), frameNo = 0, nearNote = null, proj = new THREE.Vector3();
  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000); last = now; var t = now / 1000; frameNo++;
    if (travelScene) {
      var tw = travelScene.w, el = (now - travelScene.t0) / 1000; tw.update(el);
      var a = tw.actor.position, shots = tw.shots, si = Math.min(shots.length - 1, Math.floor(el / 2.6)), s0 = shots[si];
      camera.position.set(a.x + s0[0][0], a.y + s0[0][1], a.z + s0[0][2]); camera.lookAt(a.x + s0[1][0], a.y + s0[1][1], a.z + s0[1][2]);
      renderer.render(scene, camera); requestAnimationFrame(frame); return;
    }
    if (W.update) W.update(t, dt, player);
    if (sea.visible) { for (var k = 0; k < seaPos.count; k++) { var x = seaPos.getX(k), y = seaPos.getY(k); seaPos.setZ(k, Math.sin(x * 0.15 + t * 1.1) * 0.12 + Math.cos(y * 0.18 + t * 0.9) * 0.12); } seaPos.needsUpdate = true; if (frameNo % 4 === 0) sea.geometry.computeVertexNormals(); }
    // day and night in the cities
    var n = 0;
    if (!W.interior && !W.env.space && !W.env.dust) n = phase === 'title' || phase === 'pick' || phase === 'end' ? 0.9 : Math.max(0, Math.min(1, Math.sin(t / 55) * 1.4 - 0.5));
    if (W.env.night) n = 1;
    if (!W.interior && !W.env.space && !W.env.dust) { var e = W.env; var c1 = new THREE.Color(e.sky[1]).lerp(new THREE.Color('#0d1a33'), n); scene.background.copy(c1); scene.fog.color.copy(c1); skyMat.color.setScalar(1 - n * 0.85); sun.intensity = e.sun * (1 - n * 0.75); hemi.intensity = e.hemi - n * 0.4; starMat.opacity = n > 0.5 ? (n - 0.5) * 2 : 0; }
    else skyMat.color.setScalar(1);
    K.nightMats.forEach(function (m) { m.emissiveIntensity = 0.12 + (W.interior ? 0.3 : n * 1.3); });
    plotMat.opacity = 0.3 + Math.sin(t * 4) * 0.18; beamMat.opacity = 0.25 + Math.sin(t * 4) * 0.1;
    if (phase !== 'title' && phase !== 'pick') movePlayer(dt);
    Object.keys(actors).forEach(function (k) { if (k !== 'me') K.animateHuman(actors[k], 0, dt); });
    if (cut && cut.timer && phase === 'cut') { cut.timer -= dt; if (cut.timer <= 0) advanceShot(); }
    confetti = confetti.filter(function (c) { c.life -= dt; c.m.position.y += c.vy * dt; c.m.position.x += c.vx * dt; c.m.rotation.x += c.r * dt; c.m.rotation.y += c.r * dt; if (c.life <= 0) { scene.remove(c.m); return false; } return true; });
    if (dustP) { dustP.position.x = (t * 2) % 20 - 10; }
    checkPlaces();
    updateCamera(t, dt);
    renderer.render(scene, camera);
    // goal compass and building notes
    var tg = target();
    if (tg && phase === 'play') {
      var dx = tg.x - player.position.x, dz = tg.z - player.position.z, ang = Math.atan2(dx, dz) - (camYaw + Math.PI), dist = Math.round(Math.hypot(dx, dz));
      goalEl.hidden = false; goalEl.innerHTML = '<i style="transform:rotate(' + (-ang) + 'rad)">▲</i><span>' + esc(T(step().label)) + '</span><b>' + dist + 'm</b>';
    } else if (phase === 'play' && step() && step().type === 'build') { goalEl.hidden = false; goalEl.innerHTML = '<i>🏗️</i><span>' + esc(T(step().label)) + '</span>'; }
    else goalEl.hidden = true;
    var note = null;
    if (phase === 'play' && !W.interior && W.place) Object.keys(D.NOTES).forEach(function (k) { var pl = W.place(k); if (pl && Math.hypot(player.position.x - pl.x, player.position.z - pl.z) < 6.5) note = pl; });
    if (note !== nearNote) { nearNote = note; if (note) tip.innerHTML = '<b>' + esc(T(D.PLACES[note.type])) + '</b><span>' + esc(T(D.NOTES[note.type])) + '</span>'; }
    if (note) { proj.set(note.x, 6, note.z).project(camera); var r = canvas.getBoundingClientRect(); if (proj.z < 1) { tip.hidden = false; tip.style.left = Math.max(8, Math.min(r.width - tip.offsetWidth - 8, (proj.x + 1) / 2 * r.width - tip.offsetWidth / 2)) + 'px'; tip.style.top = Math.max(TOUCH ? 150 : 96, Math.min(r.height - tip.offsetHeight - 130, (1 - proj.y) / 2 * r.height - tip.offsetHeight)) + 'px'; } else tip.hidden = true; }
    else tip.hidden = true;
    drawMini(t, tg);
    requestAnimationFrame(frame);
  }
  function drawMini(t, tg) {
    var w = mini.width, h = mini.height; mctx.clearRect(0, 0, w, h);
    if (!(phase === 'play' || phase === 'end' && mode === 'follow')) return;
    var s = W.interior ? w / 18 : w / 70, cx = player.position.x, cz = player.position.z;
    function X(x) { return w / 2 + (x - cx) * s; } function Z(z) { return h / 2 + (z - cz) * s; }
    mctx.save(); mctx.beginPath(); mctx.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2); mctx.clip();
    mctx.fillStyle = W.sea ? '#2b6f96' : W.env.space ? '#111' : '#7a4a30'; mctx.fillRect(0, 0, w, h);
    W.mini && W.mini(mctx, X, Z, s, t, step() && step().type === 'build');
    if (tg) { var gx = Math.max(10, Math.min(w - 10, X(tg.x))), gz = Math.max(10, Math.min(h - 10, Z(tg.z))); mctx.fillStyle = 'rgba(255,215,120,' + (0.7 + Math.sin(t * 6) * 0.3) + ')'; mctx.beginPath(); mctx.arc(gx, gz, 6, 0, Math.PI * 2); mctx.fill(); mctx.strokeStyle = '#000'; mctx.lineWidth = 1.5; mctx.stroke(); }
    mctx.translate(w / 2, h / 2); mctx.rotate(-player.rotation.y + Math.PI);
    mctx.fillStyle = '#ff5a4f'; mctx.beginPath(); mctx.moveTo(0, -7); mctx.lineTo(5, 6); mctx.lineTo(0, 3); mctx.lineTo(-5, 6); mctx.closePath(); mctx.fill();
    mctx.restore();
    mctx.strokeStyle = 'rgba(255,255,255,.85)'; mctx.lineWidth = 2; mctx.beginPath(); mctx.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2); mctx.stroke();
  }

  /* ---------- portraits for the character picker ---------- */
  function makePortraits() {
    var r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); r.setSize(150, 190); r.outputEncoding = THREE.sRGBEncoding;
    var s2 = new THREE.Scene(); s2.add(new THREE.HemisphereLight(0xffffff, 0x445566, 0.95)); var dl = new THREE.DirectionalLight(0xffffff, 1.1); dl.position.set(2, 3, 4); s2.add(dl);
    var cam = new THREE.PerspectiveCamera(26, 150 / 190, 0.1, 20); cam.position.set(0.7, 1.05, 3.4); cam.lookAt(0, 0.72, 0);
    D.LOOKS.forEach(function (l, n) { var h = K.human(l); h.rotation.y = 0.25; K.animateHuman(h, 0, 1); s2.add(h); r.render(s2, cam); lookImgs[n] = r.domElement.toDataURL(); s2.remove(h); });
    r.dispose();
  }

  document.addEventListener('langchange', function () { if (cut && phase === 'cut') renderCut(cut.st.shots[cut.i]); else render(); nearNote = null; });
  function resize() { var r = canvas.getBoundingClientRect(); renderer.setSize(r.width, r.height, false); camera.aspect = r.width / Math.max(1, r.height); camera.fov = camera.aspect < 0.8 ? 64 : 52; camera.updateProjectionMatrix(); }
  addEventListener('resize', resize);

  // a small hook for automated play-testing (?test)
  if (new URLSearchParams(location.search).has('test')) window.__G = {
    info: function () { return { phase: phase, ch: S.ch, step: S.step, world: W.id, interior: !!W.interior }; },
    toTarget: function () { var tg = target(); if (tg) { player.position.set(tg.x + 0.3, W.groundY(tg.x, tg.z) + 0.02, tg.z + 0.3); return true; } return false; },
    jump: jump
  };

  /* ---------- boot: New York at night behind the title ---------- */
  S = fresh(); S.done = true;
  var ny = getWorld('ny'); W = ny; scene.add(ny.group); applyEnv(ny);
  player = K.human(D.LOOKS[0]); player.visible = false; scene.add(player); player.visible = true; scene.remove(player);
  S.done = false; worlds = {};
  if (DEMO) { S.done = true; phase = 'end'; mode = 'orbit'; }
  try { makePortraits(); } catch (e) {}
  resize(); render();
  requestAnimationFrame(frame);
})();
