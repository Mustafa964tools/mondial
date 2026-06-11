import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.goto('https://www.api-football.com/news/post/fifa-world-cup-2026-guide-to-using-data-with-api-sports', { waitUntil: 'networkidle2' });
  const content = await page.evaluate(() => document.body.innerText);
  console.log(content.slice(0, 15000));
  await browser.close();
})();
