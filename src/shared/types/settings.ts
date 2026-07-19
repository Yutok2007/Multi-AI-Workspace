import type { PlatformId } from './platform';

export type LocalePreference = 'browser' | 'en' | 'zh-TW' | 'zh-CN';
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';
export type ConversationExportFormat =
  'markdown-standard' | 'markdown-simple' | 'json-standard' | 'json-simple' | 'html-simple';

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

export interface AppSettings {
  schemaVersion: 1;
  locale: LocalePreference;
  logLevel: LogLevel;
  privacy: {
    onboardingComplete: boolean;
    includeConversationContext: boolean;
  };
  features: {
    foundationPanel: boolean;
    promptRewrite: boolean;
    promptManager: boolean;
    draft: boolean;
    timeline: boolean;
    export: boolean;
  };
  platformPermissions: Partial<Record<PlatformId, boolean>>;
  input: {
    sendShortcut: 'platform' | 'enter' | 'ctrl-enter' | 'shift-enter';
    preventAutoScroll: boolean;
  };
  models: {
    defaults: Partial<Record<Exclude<PlatformId, 'custom'>, string>>;
  };
  conversationExport: {
    format: ConversationExportFormat;
  };
  markup: {
    mermaidEnabled: boolean;
    mermaidDefaultView: 'diagram' | 'source';
    formulaCopyEnabled: boolean;
    formulaCopyFormat: 'latex' | 'mathml' | 'word' | 'notion';
  };
  ui: {
    launcherPosition: 'bottom-right' | 'bottom-left';
    fontScale: 0.9 | 1 | 1.1 | 1.2;
    panelWidth: 'compact' | 'standard' | 'wide';
    visualEffect: 'off' | 'snow' | 'sakura' | 'rain' | 'mushroom' | 'dandelion';
  };
  notifications: {
    completionEnabled: boolean;
  };
}
