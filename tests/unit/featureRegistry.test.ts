import { describe, expect, it, vi } from 'vitest';

import { FeatureRegistry, type FeatureDefinition } from '../../src/features/FeatureRegistry';
import { Logger } from '../../src/shared/logger/logger';
import { DEFAULT_SETTINGS } from '../../src/shared/storage/localStorage';
import type { PlatformAdapter } from '../../src/shared/types/platform';

function adapter(capabilities: string[]): PlatformAdapter {
  return {
    id: 'chatgpt',
    matches: () => true,
    initialize: async () => undefined,
    dispose: () => undefined,
    getCapabilities: () => new Set(capabilities) as ReturnType<PlatformAdapter['getCapabilities']>,
    getCurrentAccountScope: async () => 'anonymous',
    getCurrentConversation: async () => null,
    findComposer: async () => null,
    readComposer: async () => '',
    writeComposer: async () => undefined,
    observeComposer: () => () => undefined,
    getMessages: async () => [],
    observeMessages: () => () => undefined,
    scrollToMessage: async () => undefined,
    getSidebarRoot: async () => null,
    getConversationListRoot: async () => null,
    getConversationItems: async () => [],
    openConversation: async () => undefined,
  };
}

describe('FeatureRegistry', () => {
  it('gates initialization on runtime capabilities and disposes active features before reevaluation', async () => {
    const initialize = vi.fn(async () => undefined);
    const dispose = vi.fn(async () => undefined);
    const feature: FeatureDefinition = {
      id: 'draft',
      defaultEnabled: true,
      experimental: false,
      requiredCapabilities: ['composer.read'],
      initialize,
      dispose,
    };
    const registry = new FeatureRegistry(() => true);
    registry.register(feature);
    const context = { settings: DEFAULT_SETTINGS, logger: new Logger('error') };

    const unavailable = await registry.evaluate({ ...context, adapter: adapter([]) });
    const active = await registry.evaluate({ ...context, adapter: adapter(['composer.read']) });
    await registry.evaluate({ ...context, adapter: adapter(['composer.read']) });

    expect(unavailable.unavailable.draft).toEqual(['composer.read']);
    expect(active.active).toEqual(['draft']);
    expect(initialize).toHaveBeenCalledTimes(2);
    expect(dispose).toHaveBeenCalledTimes(1);
  });
});
