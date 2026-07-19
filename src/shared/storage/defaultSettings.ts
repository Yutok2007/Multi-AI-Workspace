import type { AppSettings } from '../types/settings';

export const DEFAULT_SETTINGS: AppSettings = {
  schemaVersion: 1,
  locale: 'browser',
  logLevel: 'warn',
  privacy: {
    onboardingComplete: false,
    includeConversationContext: false,
  },
  features: {
    foundationPanel: true,
    promptRewrite: true,
    promptManager: true,
    draft: true,
    timeline: true,
    export: true,
  },
  platformPermissions: {},
  input: {
    sendShortcut: 'platform',
    preventAutoScroll: false,
  },
  models: {
    defaults: {},
  },
  conversationExport: {
    format: 'markdown-standard',
  },
  markup: {
    mermaidEnabled: true,
    mermaidDefaultView: 'diagram',
    formulaCopyEnabled: true,
    formulaCopyFormat: 'latex',
  },
  ui: {
    launcherPosition: 'bottom-right',
    fontScale: 1,
    panelWidth: 'standard',
    visualEffect: 'off',
  },
  notifications: {
    completionEnabled: false,
  },
};
