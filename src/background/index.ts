import browser from 'webextension-polyfill';

import { logger } from '../shared/logger/logger';
import { MigrationManager } from '../shared/migrations/migrations';
import type { RuntimeRequest } from '../shared/types/messages';
import { routeMessage } from './messageRouter';

async function initializeStorage(): Promise<void> {
  try {
    await new MigrationManager().run();
  } catch (error) {
    logger.error(
      'BACKGROUND_MIGRATION_FAILED',
      'Storage initialization failed without deleting old data.',
      {
        error,
      },
    );
  }
}

browser.runtime.onInstalled.addListener(() => {
  void initializeStorage();
});

browser.runtime.onMessage.addListener((message: unknown, sender: { tab?: { id?: number } }) =>
  routeMessage(message as RuntimeRequest, { tabId: sender.tab?.id }),
);

void initializeStorage();
