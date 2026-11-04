// Render content/profile/profile.html to assets/tyler-cheng-profile.pdf (A4, two pages: EN + 中文).
// Needs Node and Playwright with Chromium:  node tools/build_profile_pdf.js
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const root = path.resolve(__dirname, '..');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file://' + path.join(root, 'content/profile/profile.html'), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: path.join(root, 'assets/tyler-cheng-profile.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true });
  await browser.close();
  console.log('wrote assets/tyler-cheng-profile.pdf');
})();
