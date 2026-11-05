// Render each <section class="s"> of a content/social/*.html file to a 1080x1350 JPEG.
//   node tools/build_social.js content/social/ig-launch.html assets/social/ig-launch
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const [src, outPrefix] = process.argv.slice(2);
  const root = path.resolve(__dirname, '..');
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  await p.goto('file://' + path.join(root, src), { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  const slides = await p.$$('section.s');
  for (let i = 0; i < slides.length; i++) {
    const out = path.join(root, `${outPrefix}-${i + 1}.jpg`);
    await slides[i].screenshot({ path: out, type: 'jpeg', quality: 90 });
    console.log('wrote', path.relative(root, out));
  }
  await b.close();
})();
