const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
  
  try {
    const clicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const runBtn = buttons.find(b => b.textContent.includes('Run Analysis'));
      if (runBtn) {
        runBtn.click();
        return true;
      }
      return false;
    });
    
    if (clicked) {
      console.log('Clicking run analysis...');
      await new Promise(r => setTimeout(r, 2000)); // wait a bit
    } else {
      console.log('Could not find Run Analysis button');
    }
  } catch (err) {
    console.log('Script Error:', err);
  }
  
  await browser.close();
})();
