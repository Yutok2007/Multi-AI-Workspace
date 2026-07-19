/* global document, location */

import { chromium } from '@playwright/test';

const targets = [
  ['chatgpt', 'https://chatgpt.com/'],
  ['claude', 'https://claude.ai/new'],
  ['gemini', 'https://gemini.google.com/app'],
  ['deepseek', 'https://chat.deepseek.com/'],
  ['grok', 'https://grok.com/'],
  ['kimi', 'https://www.kimi.com/'],
];

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];

for (const [platform, url] of targets) {
  const context = await browser.newContext({ locale: 'en-US' });
  const page = await context.newPage();
  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(2_500);
    results.push(
      await page.evaluate(
        ({ requestedPlatform, requestedUrl, status }) => {
          const candidates = [
            ...document.querySelectorAll(
              'bard-sidenav, side-navigation-v2, aside, nav[aria-label], [role="navigation"], [data-testid*="sidebar" i], [data-test-id*="sidebar" i]',
            ),
          ];
          const labels = [...document.querySelectorAll('a, button, [role="button"], h1, h2, h3')]
            .map((element) => {
              const ariaLabel = element.getAttribute('aria-label');
              if (!ariaLabel && element.querySelector('style')) return '';
              return (ariaLabel || element.textContent || '').replace(/\s+/g, ' ').trim();
            })
            .filter((label) => label.length > 0 && label.length <= 120)
            .slice(0, 30);
          return {
            platform: requestedPlatform,
            requestedUrl,
            finalUrl: location.href,
            status,
            title: document.title,
            semanticSidebarCandidates: candidates.length,
            visibleLabels: labels,
          };
        },
        { requestedPlatform: platform, requestedUrl: url, status: response?.status() ?? null },
      ),
    );
  } catch (error) {
    results.push({
      platform,
      requestedUrl: url,
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    await context.close();
  }
}

await browser.close();
console.log(JSON.stringify(results, null, 2));
