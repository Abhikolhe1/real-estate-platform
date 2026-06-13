const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: 'videos/public_web_proof' }
  });
  const page = await context.newPage();

  console.log('--- STARTING PUBLIC WEBSITE VIDEO RECORDING ---');
  
  await page.goto('http://localhost:3000/explorer');
  
  console.log('Waiting for Explorer Page...');
  try {
    await page.waitForSelector('text=3D Building Explorer', { timeout: 30000 });
  } catch (e) {
    console.log('Timeout. Taking screenshot...');
    await page.screenshot({ path: 'videos/public_web_proof/error_web.png' });
    throw e;
  }
  
  console.log('Viewing 3D Building Perspective for 8 seconds...');
  await page.waitForTimeout(8000); 

  console.log('Switching to Indoor Walkthrough...');
  await page.click('text=GO INSIDE FLAT TOUR');
  
  console.log('Viewing Indoor Walkthrough for 8 seconds...');
  await page.waitForTimeout(8000); 

  console.log('--- PUBLIC WEB RECORDING COMPLETE ---');
  await browser.close();
})();
