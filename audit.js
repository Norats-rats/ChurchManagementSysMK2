import fs from 'fs';
import { lighthouse } from 'lighthouse';
import puppeteer from 'puppeteer';

async function runAudit() {
  const browser = await puppeteer.launch({
    headless: false, 
    defaultViewport: null,
  });

  const page = await browser.newPage();

  await page.goto('https://ecclesync.org', { waitUntil: 'networkidle0' });

  await page.type('input[name="email"]', 'admin@ecclesync.org');
  await page.type('input[name="password"]', 'YourPasswordHere');
  await page.click('button[type="submit"]');

  await page.waitForSelector('#dashboard-container', { timeout: 10000 });

  const port = new URL(browser.wsEndpoint()).port;
  const options = {
    port: parseInt(port, 10),
    output: 'html',
    logLevel: 'info',
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
  };

  const runnerResult = await lighthouse(page.url(), options);

  const reportHtml = runnerResult.report;
  fs.writeFileSync('dashboard-audit-report.html', reportHtml);

  console.log('Audit complete! Report saved to dashboard-audit-report.html');
  console.log(`Performance Score: ${runnerResult.lhr.categories.performance.score * 100}`);

  await browser.close();
}

runAudit();