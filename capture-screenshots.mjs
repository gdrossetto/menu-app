import { chromium, devices } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function capture() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  console.log('Navigating to login...');
  await page.goto('http://localhost:5173/login');
  
  console.log('Logging in...');
  await page.fill('input[type="email"]', 'gabriel.dadamosrossetto@gmail.com');
  await page.fill('input[type="password"]', 'torradaazul123');
  await page.click('button[type="submit"]');

  // Wait for dashboard to load
  await page.waitForURL('**/dashboard');
  await page.waitForSelector('.app-page-title'); // Wait for title
  await page.waitForTimeout(2000); // Wait for chart and items to settle
  
  // Create images dir if it doesn't exist
  const imagesDir = path.join(__dirname, 'public', 'images');
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  console.log('Capturing dashboard...');
  await page.screenshot({ path: path.join(imagesDir, 'dashboard-preview.png'), type: 'png' });

  console.log('Navigating to menu editor...');
  await page.click('text=Edit Menu Items');
  await page.waitForURL('**/dashboard/menu');
  await page.waitForSelector('text=Add New Item');
  await page.waitForTimeout(2000);

  console.log('Capturing editor...');
  await page.screenshot({ path: path.join(imagesDir, 'editor-preview.png'), type: 'png' });

  // Get restaurant ID
  const restaurantId = await page.evaluate(() => localStorage.getItem('menuqr_restaurant_id'));
  
  if (restaurantId) {
    console.log(`Found restaurant ID: ${restaurantId}`);
    
    // Mobile context for public menu
    const mobileContext = await browser.newContext({
      ...devices['iPhone 13']
    });
    const mobilePage = await mobileContext.newPage();
    
    console.log('Navigating to mobile public menu...');
    await mobilePage.goto(`http://localhost:5173/m/${restaurantId}?previewTheme=visual`);
    await mobilePage.waitForSelector('text=Menu'); // Wait for categories to load
    await mobilePage.waitForTimeout(2000); // Wait for images

    console.log('Capturing mobile menu...');
    await mobilePage.screenshot({ path: path.join(imagesDir, 'mobile-menu-preview.png'), type: 'png' });
    
    await mobileContext.close();
  }

  await browser.close();
  console.log('Done capturing screenshots!');
}

capture().catch(console.error);
