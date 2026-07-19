import type { MessageKey } from '../shared/i18n/messages';
import type { AppSettings } from '../shared/types/settings';

export const CATEGORY_ORDER = [
  'prompt-rewrite',
  'timeline',
  'prompt-manager',
  'input',
  'layout',
  'font',
  'markdown',
  'export',
  'notifications',
  'experimental',
  'privacy',
  'data-management',
  'diagnostics',
  'about',
] as const;

export type SettingCategory = (typeof CATEGORY_ORDER)[number];
export const VISIBLE_CATEGORY_ORDER = CATEGORY_ORDER;
export type SettingValue = boolean | string;

export const CATEGORY_LABELS: Record<SettingCategory, MessageKey> = {
  'prompt-rewrite': 'categoryPromptRewrite',
  timeline: 'categoryTimeline',
  'prompt-manager': 'categoryPromptManager',
  input: 'categoryInput',
  layout: 'categoryLayout',
  font: 'categoryFont',
  markdown: 'categoryMarkdown',
  export: 'categoryExport',
  notifications: 'categoryNotifications',
  experimental: 'categoryExperimental',
  privacy: 'categoryPrivacy',
  'data-management': 'categoryDataManagement',
  diagnostics: 'categoryDiagnostics',
  about: 'categoryAbout',
};

interface SettingOption {
  value: string;
  label: MessageKey;
  description?: MessageKey;
  icon?: string;
}

export interface SettingDefinition {
  id: string;
  category: SettingCategory;
  label: MessageKey;
  description: MessageKey;
  control: 'toggle' | 'select' | 'segmented' | 'radio';
  options?: SettingOption[];
  defaultValue: SettingValue;
  experimental: boolean;
  permission: MessageKey;
  applicability: MessageKey;
  read(settings: AppSettings): SettingValue;
  write(settings: AppSettings, value: SettingValue): AppSettings;
}

export const SETTING_DEFINITIONS: readonly SettingDefinition[] = [
  {
    id: 'prompt-rewrite-enabled',
    category: 'prompt-rewrite',
    label: 'settingPromptRewrite',
    description: 'settingPromptRewriteDescription',
    control: 'toggle',
    defaultValue: true,
    experimental: false,
    permission: 'providerOriginPermission',
    applicability: 'allPlatforms',
    read: (settings) => settings.features.promptRewrite,
    write: (settings, value) => ({
      ...settings,
      features: { ...settings.features, promptRewrite: Boolean(value) },
    }),
  },
  {
    id: 'prompt-manager-enabled',
    category: 'input',
    label: 'settingPromptManager',
    description: 'settingPromptManagerDescription',
    control: 'toggle',
    defaultValue: true,
    experimental: false,
    permission: 'noPermission',
    applicability: 'allPlatforms',
    read: (settings) => settings.features.promptManager,
    write: (settings, value) => ({
      ...settings,
      features: { ...settings.features, promptManager: Boolean(value) },
    }),
  },
  {
    id: 'draft-enabled',
    category: 'input',
    label: 'settingDraft',
    description: 'settingDraftDescription',
    control: 'toggle',
    defaultValue: true,
    experimental: false,
    permission: 'noPermission',
    applicability: 'allPlatforms',
    read: (settings) => settings.features.draft,
    write: (settings, value) => ({
      ...settings,
      features: { ...settings.features, draft: Boolean(value) },
    }),
  },
  {
    id: 'send-shortcut',
    category: 'input',
    label: 'settingSendShortcut',
    description: 'settingSendShortcutDescription',
    control: 'select',
    options: [
      { value: 'platform', label: 'shortcutPlatform' },
      { value: 'enter', label: 'shortcutEnter' },
      { value: 'ctrl-enter', label: 'shortcutCtrlEnter' },
      { value: 'shift-enter', label: 'shortcutShiftEnter' },
    ],
    defaultValue: 'platform',
    experimental: false,
    permission: 'noPermission',
    applicability: 'allPlatforms',
    read: (settings) => settings.input.sendShortcut,
    write: (settings, value) => ({
      ...settings,
      input: {
        ...settings.input,
        sendShortcut:
          value === 'enter' || value === 'ctrl-enter' || value === 'shift-enter'
            ? value
            : 'platform',
      },
    }),
  },
  {
    id: 'prevent-auto-scroll',
    category: 'input',
    label: 'settingPreventAutoScroll',
    description: 'settingPreventAutoScrollDescription',
    control: 'toggle',
    defaultValue: false,
    experimental: false,
    permission: 'noPermission',
    applicability: 'messageReadPlatforms',
    read: (settings) => settings.input.preventAutoScroll,
    write: (settings, value) => ({
      ...settings,
      input: { ...settings.input, preventAutoScroll: Boolean(value) },
    }),
  },
  {
    id: 'timeline-enabled',
    category: 'timeline',
    label: 'settingTimeline',
    description: 'settingTimelineDescription',
    control: 'toggle',
    defaultValue: true,
    experimental: false,
    permission: 'noPermission',
    applicability: 'allPlatforms',
    read: (settings) => settings.features.timeline,
    write: (settings, value) => ({
      ...settings,
      features: { ...settings.features, timeline: Boolean(value) },
    }),
  },
  {
    id: 'export-enabled',
    category: 'export',
    label: 'settingConversationExport',
    description: 'settingConversationExportDescription',
    control: 'toggle',
    defaultValue: true,
    experimental: false,
    permission: 'noPermission',
    applicability: 'allPlatforms',
    read: (settings) => settings.features.export,
    write: (settings, value) => ({
      ...settings,
      features: { ...settings.features, export: Boolean(value) },
    }),
  },
  {
    id: 'conversation-export-format',
    category: 'export',
    label: 'exportFormat',
    description: 'exportFormatDescription',
    control: 'radio',
    options: [
      {
        value: 'markdown-standard',
        label: 'exportMarkdownStandard',
        description: 'exportMarkdownStandardDescription',
      },
      {
        value: 'markdown-simple',
        label: 'exportMarkdownSimple',
        description: 'exportSimpleDescription',
      },
      {
        value: 'json-standard',
        label: 'exportJsonStandard',
        description: 'exportJsonStandardDescription',
      },
      {
        value: 'json-simple',
        label: 'exportJsonSimple',
        description: 'exportSimpleDescription',
      },
      {
        value: 'html-simple',
        label: 'exportHtmlSimple',
        description: 'exportSimpleDescription',
      },
    ],
    defaultValue: 'markdown-standard',
    experimental: false,
    permission: 'noPermission',
    applicability: 'messageReadPlatforms',
    read: (settings) => settings.conversationExport.format,
    write: (settings, value) => ({
      ...settings,
      conversationExport: {
        format:
          value === 'markdown-simple' ||
          value === 'json-standard' ||
          value === 'json-simple' ||
          value === 'html-simple'
            ? value
            : 'markdown-standard',
      },
    }),
  },
  {
    id: 'mermaid-enabled',
    category: 'markdown',
    label: 'settingMermaidEnabled',
    description: 'settingMermaidEnabledDescription',
    control: 'toggle',
    defaultValue: true,
    experimental: false,
    permission: 'noPermission',
    applicability: 'messageReadPlatforms',
    read: (settings) => settings.markup.mermaidEnabled,
    write: (settings, value) => ({
      ...settings,
      markup: { ...settings.markup, mermaidEnabled: Boolean(value) },
    }),
  },
  {
    id: 'mermaid-default-view',
    category: 'markdown',
    label: 'settingMermaidDefaultView',
    description: 'settingMermaidDefaultViewDescription',
    control: 'select',
    options: [
      { value: 'diagram', label: 'mermaidViewDiagram' },
      { value: 'source', label: 'mermaidViewSource' },
    ],
    defaultValue: 'diagram',
    experimental: false,
    permission: 'noPermission',
    applicability: 'messageReadPlatforms',
    read: (settings) => settings.markup.mermaidDefaultView,
    write: (settings, value) => ({
      ...settings,
      markup: {
        ...settings.markup,
        mermaidDefaultView: value === 'source' ? 'source' : 'diagram',
      },
    }),
  },
  {
    id: 'formula-copy-enabled',
    category: 'markdown',
    label: 'settingFormulaCopyEnabled',
    description: 'settingFormulaCopyEnabledDescription',
    control: 'toggle',
    defaultValue: true,
    experimental: false,
    permission: 'noPermission',
    applicability: 'messageReadPlatforms',
    read: (settings) => settings.markup.formulaCopyEnabled,
    write: (settings, value) => ({
      ...settings,
      markup: { ...settings.markup, formulaCopyEnabled: Boolean(value) },
    }),
  },
  {
    id: 'formula-copy-format',
    category: 'markdown',
    label: 'settingFormulaCopyFormat',
    description: 'settingFormulaCopyFormatDescription',
    control: 'select',
    options: [
      { value: 'latex', label: 'formulaFormatLatex' },
      { value: 'mathml', label: 'formulaFormatMathml' },
      { value: 'word', label: 'formulaFormatWord' },
      { value: 'notion', label: 'formulaFormatNotion' },
    ],
    defaultValue: 'latex',
    experimental: false,
    permission: 'noPermission',
    applicability: 'messageReadPlatforms',
    read: (settings) => settings.markup.formulaCopyFormat,
    write: (settings, value) => ({
      ...settings,
      markup: {
        ...settings.markup,
        formulaCopyFormat:
          value === 'mathml' || value === 'word' || value === 'notion' ? value : 'latex',
      },
    }),
  },
  {
    id: 'foundation-panel',
    category: 'layout',
    label: 'settingFoundationPanel',
    description: 'settingFoundationPanelDescription',
    control: 'toggle',
    defaultValue: true,
    experimental: false,
    permission: 'noPermission',
    applicability: 'allPlatforms',
    read: (settings) => settings.features.foundationPanel,
    write: (settings, value) => ({
      ...settings,
      features: { ...settings.features, foundationPanel: Boolean(value) },
    }),
  },
  {
    id: 'panel-width',
    category: 'layout',
    label: 'settingPanelWidth',
    description: 'settingPanelWidthDescription',
    control: 'select',
    options: [
      { value: 'compact', label: 'panelCompact' },
      { value: 'standard', label: 'panelStandard' },
      { value: 'wide', label: 'panelWide' },
    ],
    defaultValue: 'standard',
    experimental: false,
    permission: 'noPermission',
    applicability: 'allPlatforms',
    read: (settings) => settings.ui.panelWidth,
    write: (settings, value) => ({
      ...settings,
      ui: {
        ...settings.ui,
        panelWidth: value === 'compact' || value === 'wide' ? value : 'standard',
      },
    }),
  },
  {
    id: 'font-scale',
    category: 'font',
    label: 'settingFontScale',
    description: 'settingFontScaleDescription',
    control: 'select',
    options: [
      { value: '0.9', label: 'fontScale90' },
      { value: '1', label: 'fontScale100' },
      { value: '1.1', label: 'fontScale110' },
      { value: '1.2', label: 'fontScale120' },
    ],
    defaultValue: '1',
    experimental: false,
    permission: 'noPermission',
    applicability: 'allPlatforms',
    read: (settings) => String(settings.ui.fontScale),
    write: (settings, value) => ({
      ...settings,
      ui: {
        ...settings.ui,
        fontScale: value === '0.9' ? 0.9 : value === '1.1' ? 1.1 : value === '1.2' ? 1.2 : 1,
      },
    }),
  },
  {
    id: 'visual-effect',
    category: 'experimental',
    label: 'settingVisualEffects',
    description: 'settingVisualEffectsDescription',
    control: 'segmented',
    options: [
      { value: 'off', label: 'visualEffectOff', icon: '⊘' },
      { value: 'snow', label: 'visualEffectSnow', icon: '❄' },
      { value: 'sakura', label: 'visualEffectSakura', icon: '✿' },
      { value: 'rain', label: 'visualEffectRain', icon: '╱╱' },
      { value: 'mushroom', label: 'visualEffectMushroom', icon: '🍄' },
      { value: 'dandelion', label: 'visualEffectDandelion', icon: '✺' },
    ],
    defaultValue: 'off',
    experimental: true,
    permission: 'noPermission',
    applicability: 'allPlatforms',
    read: (settings) => settings.ui.visualEffect,
    write: (settings, value) => ({
      ...settings,
      ui: {
        ...settings.ui,
        visualEffect:
          value === 'snow' ||
          value === 'sakura' ||
          value === 'rain' ||
          value === 'mushroom' ||
          value === 'dandelion'
            ? value
            : 'off',
      },
    }),
  },
  {
    id: 'launcher-position',
    category: 'layout',
    label: 'settingLauncherPosition',
    description: 'settingLauncherPositionDescription',
    control: 'select',
    options: [
      { value: 'bottom-right', label: 'bottomRight' },
      { value: 'bottom-left', label: 'bottomLeft' },
    ],
    defaultValue: 'bottom-right',
    experimental: false,
    permission: 'noPermission',
    applicability: 'allPlatforms',
    read: (settings) => settings.ui.launcherPosition,
    write: (settings, value) => ({
      ...settings,
      ui: {
        ...settings.ui,
        launcherPosition: value === 'bottom-left' ? 'bottom-left' : 'bottom-right',
      },
    }),
  },
  {
    id: 'locale',
    category: 'about',
    label: 'settingLocale',
    description: 'settingLocaleDescription',
    control: 'select',
    options: [
      { value: 'browser', label: 'localeBrowser' },
      { value: 'en', label: 'localeEnglish' },
      { value: 'zh-TW', label: 'localeTraditionalChinese' },
      { value: 'zh-CN', label: 'localeSimplifiedChinese' },
    ],
    defaultValue: 'browser',
    experimental: false,
    permission: 'noPermission',
    applicability: 'allPlatforms',
    read: (settings) => settings.locale,
    write: (settings, value) => ({
      ...settings,
      locale: value === 'en' || value === 'zh-TW' || value === 'zh-CN' ? value : 'browser',
    }),
  },
  {
    id: 'log-level',
    category: 'diagnostics',
    label: 'settingLogLevel',
    description: 'settingLogLevelDescription',
    control: 'select',
    options: [
      { value: 'error', label: 'logError' },
      { value: 'warn', label: 'logWarn' },
      { value: 'info', label: 'logInfo' },
      { value: 'debug', label: 'logDebug' },
    ],
    defaultValue: 'warn',
    experimental: false,
    permission: 'noPermission',
    applicability: 'allPlatforms',
    read: (settings) => settings.logLevel,
    write: (settings, value) => ({
      ...settings,
      logLevel: value === 'error' || value === 'info' || value === 'debug' ? value : 'warn',
    }),
  },
  {
    id: 'conversation-context',
    category: 'privacy',
    label: 'settingContext',
    description: 'settingContextDescription',
    control: 'toggle',
    defaultValue: false,
    experimental: false,
    permission: 'noPermission',
    applicability: 'allPlatforms',
    read: (settings) => settings.privacy.includeConversationContext,
    write: (settings, value) => ({
      ...settings,
      privacy: { ...settings.privacy, includeConversationContext: Boolean(value) },
    }),
  },
] as const;
