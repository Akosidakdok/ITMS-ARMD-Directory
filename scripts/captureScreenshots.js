import puppeteer from 'puppeteer-core';
import path from 'node:path';
import fs from 'node:fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUTPUT_DIR = path.resolve('brag-output/composition/assets/screenshots');

async function run() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log('Launching Chrome from:', CHROME_PATH);
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    defaultViewport: {
      width: 1920,
      height: 1080,
      deviceScaleFactor: 2
    },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080']
  });

  const page = await browser.newPage();

  console.log('1. Navigating to Login Page...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(OUTPUT_DIR, '01-login.png') });
  console.log('✓ Captured 01-login.png');

  console.log('2. Logging in as admin...');
  // Type username and password
  await page.type('input[type="text"], input[type="email"]', 'admin@gmail.com');
  await page.type('input[type="password"]', '12345678');
  await page.click('button[type="submit"]');

  console.log('Waiting for authentication and Dashboard...');
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
  // Wait for loading screen to disappear
  await page.waitForFunction(() => !document.querySelector('.pais-loading-screen'), { timeout: 30000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 2500));

  await page.screenshot({ path: path.join(OUTPUT_DIR, '02-dashboard.png') });
  console.log('✓ Captured 02-dashboard.png');

  console.log('3. Navigating to Personnel Page...');
  await page.goto('http://localhost:3000/personnel', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2500));
  await page.screenshot({ path: path.join(OUTPUT_DIR, '03-personnel-list.png') });
  console.log('✓ Captured 03-personnel-list.png');

  // Try opening personnel profile
  try {
    const viewButton = await page.$('.personnel-page table tbody tr button');
    if (viewButton) {
      await viewButton.click();
      await new Promise(r => setTimeout(r, 1200));
      await page.screenshot({ path: path.join(OUTPUT_DIR, '04-personnel-profile.png') });
      console.log('✓ Captured 04-personnel-profile.png');
      await page.keyboard.press('Escape');
      await new Promise(r => setTimeout(r, 800));
    }
  } catch (err) {
    console.warn('Profile modal trigger skip:', err.message);
  }

  console.log('4. Navigating to Promotion Page...');
  await page.goto('http://localhost:3000/promotion', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2500));
  await page.screenshot({ path: path.join(OUTPUT_DIR, '05-promotion.png') });
  console.log('✓ Captured 05-promotion.png');

  // Try opening promotional worksheet modal
  try {
    const wsBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.textContent.includes('Promotional Worksheet') || b.textContent.includes('Worksheet'));
    });
    if (wsBtn && wsBtn.asElement()) {
      await wsBtn.asElement().click();
      await new Promise(r => setTimeout(r, 1500));
      await page.screenshot({ path: path.join(OUTPUT_DIR, '06-promotional-modal.png') });
      console.log('✓ Captured 06-promotional-modal.png');

      // Click Preview button inside modal if available
      const previewBtn = await page.evaluateHandle(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        return btns.find(b => b.textContent.includes('Preview') || b.textContent.includes('Select All'));
      });
      if (previewBtn && previewBtn.asElement()) {
        await previewBtn.asElement().click();
        await new Promise(r => setTimeout(r, 1200));
        await page.screenshot({ path: path.join(OUTPUT_DIR, '07-promotional-preview.png') });
        console.log('✓ Captured 07-promotional-preview.png');
      }

      await page.keyboard.press('Escape');
      await new Promise(r => setTimeout(r, 800));
    }
  } catch (err) {
    console.warn('Promotional modal skip:', err.message);
  }

  console.log('5. Navigating to Excel Integration Page...');
  await page.goto('http://localhost:3000/excel-integration', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3500));
  await page.screenshot({ path: path.join(OUTPUT_DIR, '08-worksheet-center.png') });
  console.log('✓ Captured 08-worksheet-center.png');

  console.log('6. Navigating to Orders Page...');
  await page.goto('http://localhost:3000/orders', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2500));
  await page.screenshot({ path: path.join(OUTPUT_DIR, '09-orders.png') });
  console.log('✓ Captured 09-orders.png');

  console.log('7. Navigating to Assignment Page...');
  await page.goto('http://localhost:3000/assignment', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2500));
  await page.screenshot({ path: path.join(OUTPUT_DIR, '10-assignment.png') });
  console.log('✓ Captured 10-assignment.png');

  console.log('8. Navigating to Education Page...');
  await page.goto('http://localhost:3000/education', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2500));
  await page.screenshot({ path: path.join(OUTPUT_DIR, '11-education.png') });
  console.log('✓ Captured 11-education.png');

  console.log('9. Navigating to Reports Page...');
  await page.goto('http://localhost:3000/reports', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2500));
  await page.screenshot({ path: path.join(OUTPUT_DIR, '12-reports.png') });
  console.log('✓ Captured 12-reports.png');

  console.log('10. Navigating to Documents Page...');
  await page.goto('http://localhost:3000/documents', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2500));
  await page.screenshot({ path: path.join(OUTPUT_DIR, '13-documents.png') });
  console.log('✓ Captured 13-documents.png');

  console.log('11. Navigating to Management Page...');
  await page.goto('http://localhost:3000/management', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2500));
  await page.screenshot({ path: path.join(OUTPUT_DIR, '14-management.png') });
  console.log('✓ Captured 14-management.png');

  console.log('12. Navigating to Admin Accounts Page...');
  await page.goto('http://localhost:3000/admin-accounts', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2500));
  await page.screenshot({ path: path.join(OUTPUT_DIR, '15-admin-accounts.png') });
  console.log('✓ Captured 15-admin-accounts.png');

  await browser.close();
  console.log('All real application screenshots captured successfully!');
}

run().catch(err => {
  console.error('Capture script error:', err);
  process.exit(1);
});
