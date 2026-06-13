import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: 'videos/audit_proof' }
  });
  const page = await context.newPage();

  console.log('Navigating to Builder AI Generator...');
  await page.goto('http://localhost:3003/ai-generator');

  // Wait for projects to load
  await page.waitForSelector('text=Aethelgard Sky Penthouses', { timeout: 30000 });
  console.log('Project list loaded.');

  // Select project
  await page.click('text=Aethelgard Sky Penthouses');
  console.log('Selected Aethelgard project.');

  // Find the Tower Audit Plan floorplan
  await page.waitForSelector('text=Tower Audit Plan', { timeout: 10000 });
  console.log('Found Tower Audit Plan.');

  // Click "Continue Analysis" or "Manage" - based on status it should be 'Continue'
  // In the UI it might be a button or card
  await page.click('text=Tower Audit Plan');
  console.log('Clicked on Tower Audit Plan.');

  // Now we should be at some step. Based on logic, if rooms > 3, it goes to step 2.
  // We need to get to step 6 for 3D.
  // I will look for "Continue to" or "Next" buttons.
  
  const steps = [
    'Split Units', 
    'Validation Studio', 
    'Style Intelligence', 
    'Generate Digital Twin', 
    'Walkthrough View'
  ];

  for (const stepName of steps) {
    try {
      console.log(`Looking for button to proceed to: ${stepName}`);
      // Wait for the specific step to be active or button to appear
      const nextBtn = await page.waitForSelector('button:has-text("Continue"), button:has-text("Next"), button:has-text("Generate")', { timeout: 15000 });
      await nextBtn.click();
      console.log(`Advanced through ${stepName}`);
      await page.waitForTimeout(2000); // Wait for animations
    } catch (e) {
      console.log(`Could not find button for ${stepName}, maybe already there or step skipped.`);
    }
  }

  // Wait for 3D canvas
  console.log('Waiting for 3D Rendering to initialize...');
  await page.waitForTimeout(10000); // Give Three.js time to load and render

  await page.screenshot({ path: 'audit_3d_render_proof.png', fullPage: true });
  console.log('Screenshot saved as audit_3d_render_proof.png');

  await browser.close();
})();
