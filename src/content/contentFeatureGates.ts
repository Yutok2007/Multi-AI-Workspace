import type { AppSettings } from '../shared/types/settings';

export type ContentTab = 'status' | 'rewrite' | 'conversation';

export function availableContentTabs(settings: AppSettings): ContentTab[] {
  const tabs: ContentTab[] = ['status'];
  if (settings.features.promptRewrite) tabs.push('rewrite');
  tabs.push('conversation');
  return tabs;
}
