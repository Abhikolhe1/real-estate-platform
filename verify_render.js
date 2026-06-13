const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: 'videos/audit_proof' }
  });
  const page = await context.newPage();

  console.log('--- STARTING ABSOLUTE ONE-TAKE VIDEO RECORDING ---');
  
  await page.goto('http://localhost:3003/ai-generator');
  
  // 1. Catalog
  console.log('Step 1: Catalog...');
  await page.waitForSelector('text=Tower Audit Plan', { timeout: 30000 });
  await page.click('text=Tower Audit Plan');
  await page.waitForTimeout(2000);

  // 2. Split Units -> Validation
  console.log('Step 2: Split Units...');
  await page.click('text=CONFIRM SPLIT & PROCEED');
  await page.waitForTimeout(2000);

  // 3. Validation -> Theme
  console.log('Step 3: Validation Studio...');
  await page.click('text=Save layout & Continue');
  await page.waitForTimeout(2000);

  // 4. Theme -> Generate
  console.log('Step 4: Style Intelligence...');
  await page.click('text=Generate Digital Twin Model');
  await page.waitForTimeout(2000);

  // 5. Progress
  console.log('Step 5: AI Generation Progress...');
  await page.waitForSelector('text=3D Building Perspective', { timeout: 30000 });
  await page.waitForTimeout(3000);

  // 6. Walkthrough
  console.log('Step 6: Digital Twin Walkthrough...');
  await page.waitForTimeout(5000); // View 3D first
  
  console.log('Switching to Indoor Walkthrough...');
  await page.click('text=Indoor Walkthrough Preview');
  await page.waitForTimeout(5000); // View Walk

  console.log('Proceeding to Step 7...');
  await page.click('text=Get Copyable Embed Codes');
  await page.waitForTimeout(3000);

  // 7. Embed
  console.log('Step 7: Embed Code.');
  await page.waitForTimeout(3000);
  
  console.log('Finishing setup...');
  await page.click('text=Complete Setup & Finish');
  await page.waitForTimeout(2000);

  console.log('--- ONE-TAKE COMPLETE ---');
  await browser.close();
})();
