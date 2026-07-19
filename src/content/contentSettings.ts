import browser from 'webextension-polyfill';

import { STORAGE_KEYS } from '../shared/constants/storage';
import { DEFAULT_SETTINGS } from '../shared/storage/defaultSettings';
import type { RuntimeResponse } from '../shared/types/messages';
import type { AppSettings } from '../shared/types/settings';

function isAppSettings(value: unknown): value is AppSettings {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const settings = value as Partial<AppSettings>;
  return (
    settings.schemaVersion === 1 &&
    typeof settings.locale === 'string' &&
    typeof settings.logLevel === 'string' &&
    typeof settings.privacy?.onboardingComplete === 'boolean' &&
    typeof settings.features?.foundationPanel === 'boolean' &&
    (settings.ui?.launcherPosition === 'bottom-right' ||
      settings.ui?.launcherPosition === 'bottom-left')
  );
}

function withContentDefaults(settings: AppSettings): AppSettings {
  return {
    ...settings,
    input: { ...DEFAULT_SETTINGS.input, ...settings.input },
    models: { ...DEFAULT_SETTINGS.models, ...settings.models },
    conversationExport: {
      ...DEFAULT_SETTINGS.conversationExport,
      ...settings.conversationExport,
    },
    markup: { ...DEFAULT_SETTINGS.markup, ...settings.markup },
    ui: { ...DEFAULT_SETTINGS.ui, ...settings.ui },
  };
}

export async function getContentSettings(): Promise<AppSettings> {
  try {
    const response = (await browser.runtime.sendMessage({
      type: 'settings.get',
    })) as RuntimeResponse;
    if (response.ok && response.settings && isAppSettings(response.settings)) {
      return withContentDefaults(response.settings);
    }
  } catch {
    // A short-lived background context may be unavailable during startup.
  }

  try {
    const stored = await browser.storage.local.get(STORAGE_KEYS.settings);
    const settings = stored[STORAGE_KEYS.settings];
    if (isAppSettings(settings)) {
      return withContentDefaults(settings);
    }
  } catch {
    // Fall back to privacy-preserving defaults when extension storage is unavailable.
  }
  return structuredClone(DEFAULT_SETTINGS);
}

export function subscribeToContentSettings(callback: (settings: AppSettings) => void): () => void {
  const listener: Parameters<typeof browser.storage.onChanged.addListener>[0] = (
    changes,
    areaName,
  ) => {
    if (areaName !== 'local' || !(STORAGE_KEYS.settings in changes)) {
      return;
    }
    const next = changes[STORAGE_KEYS.settings]?.newValue;
    if (isAppSettings(next)) {
      callback(withContentDefaults(next));
    }
  };
  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
}
