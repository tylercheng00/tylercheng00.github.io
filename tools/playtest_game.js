// Automated playthrough of the game (title → end). Needs a local server on :8765.
//   python3 -m http.server 8765 &
//   node tools/playtest_game.js <screenshot-dir> [desktop|mobile] [zh|en] [max-shots]
const { chromium } = require('playwright');
const S = process.argv[2], mode = process.argv[3] || 'mobile', lang = process.argv[4] || 'zh', maxShots = +(process.argv[5] || 60);
(async () => {
  const b = await chromium.launch();
  const opts = mode === 'mobile' ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 800 } };
  const p = await b.newPage(opts); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !/ERR_NAME|goatcounter/.test(m.text())) errs.push(m.text()); });
  await p.goto(`http://localhost:8765/game.html?test&lang=${lang}`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);
  let n = 0, lastKey = '';
  const clk = (sel, idx) => p.evaluate(([s1, i1]) => { const e = document.querySelectorAll(s1)[i1 || 0]; if (e) { e.click(); return true; } return false; }, [sel, idx || 0]);
  const shot = async (tag) => { if (n < maxShots) await p.screenshot({ path: `${S}/${mode}-${String(n++).padStart(2, '0')}-${tag}.png` }); };
  await shot('title');
  await clk('[data-go="new"]'); await p.waitForTimeout(400); await shot('pick');
  await clk('.g-look'); await p.waitForTimeout(1500); await shot('start');
  await p.keyboard.down('w'); await p.waitForTimeout(900); await p.keyboard.up('w');
  await p.evaluate(() => window.__G.jump()); await p.waitForTimeout(250); await shot('jump');
  for (let i = 0; i < 500; i++) {
    const st = await p.getAttribute('#game', 'data-step');
    const info = await p.evaluate(() => window.__G.info());
    const key = info.ch + '-' + info.step + '-' + st + '-' + info.world;
    if (st === 'end') { await p.waitForTimeout(1500); await shot('end'); break; }
    if (st === 'play') {
      if (await clk('[data-go="auto"]')) { await p.waitForTimeout(1000); continue; }
      if (key !== lastKey && !info.interior) { await p.waitForTimeout(600); await shot('play-' + info.world + '-c' + info.ch); }
      await p.evaluate(() => window.__G.toTarget()); await p.waitForTimeout(700);
    } else if (st === 'cut') {
      if (key !== lastKey) { await p.waitForTimeout(1300); await shot('cut-c' + info.ch + 's' + info.step); }
      await p.waitForTimeout(500); await clk('[data-go="shot"]'); await p.waitForTimeout(500);
    } else if (st === 'choice') { await clk('.g-opts button', 0); await p.waitForTimeout(300); }
    else if (st === 'reply') { await clk('[data-go="replied"]'); await p.waitForTimeout(500); }
    else if (st === 'milestone') { await clk('[data-go="next"]'); await p.waitForTimeout(800); }
    else if (st === 'travel') { if (key !== lastKey) { await p.waitForTimeout(2500); await shot('travel-' + info.ch); } await p.waitForTimeout(1500); }
    lastKey = key;
  }
  const info = await p.evaluate(() => window.__G.info());
  console.log(mode, lang, 'final', JSON.stringify(info), 'errors:', JSON.stringify(errs.slice(0, 6)));
  await b.close();
})();
