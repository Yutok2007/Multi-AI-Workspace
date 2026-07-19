import { describe, expect, it } from 'vitest';

import { availableContentTabs } from '../../src/content/contentFeatureGates';
import {
  CATEGORY_ORDER,
  SETTING_DEFINITIONS,
  VISIBLE_CATEGORY_ORDER,
} from '../../src/options/settingDefinitions';
import { DEFAULT_SETTINGS } from '../../src/shared/storage/defaultSettings';

describe('availableContentTabs', () => {
  it('does not expose the removed conversation-folder setting', () => {
    expect(CATEGORY_ORDER).not.toContain('folder');
    expect(SETTING_DEFINITIONS.map((definition) => definition.id)).not.toContain('folders-enabled');
  });

  it('keeps chat summarization while removing independently disabled feature surfaces', () => {
    const settings = structuredClone(DEFAULT_SETTINGS);
    settings.features.promptRewrite = false;
    settings.features.promptManager = false;
    settings.features.timeline = false;
    settings.features.export = false;

    expect(availableContentTabs(settings)).toEqual(['status', 'conversation']);
  });

  it('keeps Prompt templates out of the full workspace tabs', () => {
    const settings = structuredClone(DEFAULT_SETTINGS);

    expect(availableContentTabs(settings)).not.toContain('prompts');
  });

  it('exposes Prompt Manager authoring in the full settings navigation', () => {
    expect(CATEGORY_ORDER).toContain('prompt-manager');
    expect(VISIBLE_CATEGORY_ORDER).toContain('prompt-manager');
    expect(
      SETTING_DEFINITIONS.find((definition) => definition.id === 'prompt-manager-enabled')
        ?.category,
    ).toBe('input');
  });

  it('keeps the conversation surface when any one conversation tool is enabled', () => {
    const settings = structuredClone(DEFAULT_SETTINGS);
    settings.features.timeline = false;
    settings.features.export = true;

    expect(availableContentTabs(settings)).toContain('conversation');
  });
});
