import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const root = resolve(import.meta.dirname, '..');
const assets = resolve(root, 'src', 'assets');
const source = await readFile(resolve(assets, 'icon.svg'), 'utf8');
const sizes = [16, 32, 48, 128];
const browser = await chromium.launch({ channel: 'chrome', headless: true });

try {
  await mkdir(assets, { recursive: true });
  for (const size of sizes) {
    const context = await browser.newContext({
      viewport: { width: size, height: size },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    await page.setContent(source);
    const icon = page.locator('svg');
    await icon.evaluate((element, nextSize) => {
      const ownerDocument = element.ownerDocument;
      element.setAttribute('width', String(nextSize));
      element.setAttribute('height', String(nextSize));
      ownerDocument.documentElement.style.background = 'transparent';
      ownerDocument.body.style.margin = '0';
    }, size);
    await icon.screenshot({
      path: resolve(assets, `icon-${size}.png`),
      animations: 'disabled',
      omitBackground: true,
    });
    await context.close();
  }
} finally {
  await browser.close();
}

console.log(`Generated extension icons: ${sizes.join(', ')}px`);
