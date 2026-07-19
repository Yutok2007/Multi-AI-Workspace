import browser from 'webextension-polyfill';

import { STORAGE_KEYS } from '../constants/storage';
import { appSettingsSchema } from '../schemas/settings';
import type { AppSettings } from '../types/settings';
import { DEFAULT_SETTINGS } from './defaultSettings';

export { DEFAULT_SETTINGS } from './defaultSettings';

import type { DeepPartial } from '../types/settings';

export interface KeyValueStorage {
  get(keys?: string | string[] | Record<string, unknown> | null): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(keys: string | string[]): Promise<void>;
}

function browserLocalStorage(): KeyValueStorage {
  return {
    get: async (keys) => (await browser.storage.local.get(keys)) as Record<string, unknown>,
    set: async (items) => browser.storage.local.set(items),
    remove: async (keys) => browser.storage.local.remove(keys),
  };
}

export class ExtensionLocalStorage {
  readonly area: KeyValueStorage;

  constructor(area: KeyValueStorage = browserLocalStorage()) {
    this.area = area;
  }

  async getAll(): Promise<Record<string, unknown>> {
    return this.area.get(null);
  }

  async getValue<T>(key: string): Promise<T | undefined> {
    const values = await this.area.get(key);
    return values[key] as T | undefined;
  }

  async setValues(values: Record<string, unknown>): Promise<void> {
    await this.area.set(values);
  }

  async remove(keys: string | string[]): Promise<void> {
    await this.area.remove(keys);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function mergeSettings(base: AppSettings, patch: DeepPartial<AppSettings>): AppSettings {
  const merge = (left: unknown, right: unknown): unknown => {
    if (!isRecord(left) || !isRecord(right)) {
      return right;
    }

    const output: Record<string, unknown> = { ...left };
    for (const [key, value] of Object.entries(right)) {
      if (value !== undefined) {
        output[key] = key in left ? merge(left[key], value) : value;
      }
    }
    return output;
  };

  return appSettingsSchema.parse(merge(base, patch));
}

export class SettingsRepository {
  constructor(private readonly storage = new ExtensionLocalStorage()) {}

  async get(): Promise<AppSettings> {
    const stored = await this.storage.getValue<unknown>(STORAGE_KEYS.settings);
    if (stored === undefined) {
      return structuredClone(DEFAULT_SETTINGS);
    }

    const merged = mergeSettings(DEFAULT_SETTINGS, isRecord(stored) ? stored : {});
    return appSettingsSchema.parse(merged);
  }

  async set(settings: AppSettings): Promise<AppSettings> {
    const validated = appSettingsSchema.parse(settings);
    await this.storage.setValues({ [STORAGE_KEYS.settings]: validated });
    return validated;
  }

  async update(patch: DeepPartial<AppSettings>): Promise<AppSettings> {
    const next = mergeSettings(await this.get(), patch);
    return this.set(next);
  }

  async reset(): Promise<AppSettings> {
    return this.set(structuredClone(DEFAULT_SETTINGS));
  }
}

export function subscribeToSettings(callback: (settings: AppSettings) => void): () => void {
  const listener: Parameters<typeof browser.storage.onChanged.addListener>[0] = (
    changes,
    areaName,
  ) => {
    if (areaName !== 'local' || !(STORAGE_KEYS.settings in changes)) {
      return;
    }

    const parsed = appSettingsSchema.safeParse(changes[STORAGE_KEYS.settings]?.newValue);
    if (parsed.success) {
      callback(parsed.data);
    }
  };

  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
}
