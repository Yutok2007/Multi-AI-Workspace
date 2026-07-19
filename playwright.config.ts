import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  reporter: 'list',
  use: {
    channel: 'chrome',
    headless: true,
    viewport: { width: 1280, height: 800 },
  },
});
