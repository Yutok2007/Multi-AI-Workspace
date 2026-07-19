import { describe, expect, it } from 'vitest';

import {
  DEFAULT_SETTINGS,
  ExtensionLocalStorage,
  SettingsRepository,
  type KeyValueStorage,
} from '../../src/shared/storage/localStorage';
import { STORAGE_KEYS } from '../../src/shared/constants/storage';

export class MemoryStorage implements KeyValueStorage {
  readonly values: Record<string, unknown> = {};

  async get(
    keys?: string | string[] | Record<string, unknown> | null,
  ): Promise<Record<string, unknown>> {
    if (keys === undefined || keys === null) {
      return structuredClone(this.values);
    }
    if (typeof keys === 'string') {
      return keys in this.values ? { [keys]: structuredClone(this.values[keys]) } : {};
    }
    if (Array.isArray(keys)) {
      return Object.fromEntries(
        keys
          .filter((key) => key in this.values)
          .map((key) => [key, structuredClone(this.values[key])]),
      );
    }
    return Object.fromEntries(
      Object.entries(keys).map(([key, fallback]) => [
        key,
        key in this.values ? structuredClone(this.values[key]) : fallback,
      ]),
    );
  }

  async set(items: Record<string, unknown>): Promise<void> {
    Object.assign(this.values, structuredClone(items));
  }

  async remove(keys: string | string[]): Promise<void> {
    for (const key of typeof keys === 'string' ? [keys] : keys) {
      delete this.values[key];
    }
  }
}

describe('SettingsRepository', () => {
  it('returns isolated defaults for an empty profile', async () => {
    const repository = new SettingsRepository(new ExtensionLocalStorage(new MemoryStorage()));
    const first = await repository.get();
    const second = await repository.get();

    expect(first).toEqual(DEFAULT_SETTINGS);
    expect(first).not.toBe(second);
  });

  it('deep-merges a partial update without changing unrelated privacy defaults', async () => {
    const repository = new SettingsRepository(new ExtensionLocalStorage(new MemoryStorage()));
    const updated = await repository.update({ privacy: { onboardingComplete: true } });

    expect(updated.privacy).toEqual({
      onboardingComplete: true,
      includeConversationContext: false,
    });
    expect(updated.markup).toEqual(DEFAULT_SETTINGS.markup);
    expect((await repository.get()).privacy.onboardingComplete).toBe(true);
  });

  it('keeps one canonical per-platform default-model setting source', async () => {
    const repository = new SettingsRepository(new ExtensionLocalStorage(new MemoryStorage()));

    await repository.update({ models: { defaults: { gemini: 'Gemini Pro' } } });
    await repository.update({ models: { defaults: { chatgpt: 'GPT Pro' } } });

    expect((await repository.get()).models.defaults).toEqual({
      gemini: 'Gemini Pro',
      chatgpt: 'GPT Pro',
    });
  });

  it('adds the auto-scroll default when loading settings saved by an older version', async () => {
    const area = new MemoryStorage();
    const legacySettings: Partial<typeof DEFAULT_SETTINGS> = structuredClone(DEFAULT_SETTINGS);
    delete legacySettings.conversationExport;
    area.values[STORAGE_KEYS.settings] = {
      ...legacySettings,
      input: { sendShortcut: 'enter' },
    };
    const repository = new SettingsRepository(new ExtensionLocalStorage(area));

    expect((await repository.get()).input).toEqual({
      sendShortcut: 'enter',
      preventAutoScroll: false,
    });
    expect((await repository.get()).conversationExport).toEqual({
      format: 'markdown-standard',
    });
  });
});
