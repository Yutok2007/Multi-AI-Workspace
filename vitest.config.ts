import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      'webextension-polyfill': '/tests/mocks/webextension-polyfill.ts',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    restoreMocks: true,
  },
});
