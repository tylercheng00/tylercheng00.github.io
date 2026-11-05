// Render content/og/og-image.html to assets/og-image-2026.jpg (1200x630 social preview).
// Needs Node and Playwright with Chromium:  node tools/build_og_image.js
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const root = path.resolve(__dirname, '..');
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await p.goto('file://' + path.join(root, 'content/og/og-image.html'), { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: path.join(root, 'assets/og-image-2026.jpg'), type: 'jpeg', quality: 88 });
  await b.close();
  console.log('wrote assets/og-image-2026.jpg');
})();
