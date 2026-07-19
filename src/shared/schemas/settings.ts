import { z } from 'zod';

export const appSettingsSchema = z.object({
  schemaVersion: z.literal(1),
  locale: z.enum(['browser', 'en', 'zh-TW', 'zh-CN']),
  logLevel: z.enum(['error', 'warn', 'info', 'debug']),
  privacy: z.object({
    onboardingComplete: z.boolean(),
    includeConversationContext: z.boolean(),
  }),
  features: z.object({
    foundationPanel: z.boolean(),
    promptRewrite: z.boolean(),
    promptManager: z.boolean(),
    draft: z.boolean(),
    timeline: z.boolean(),
    export: z.boolean(),
  }),
  platformPermissions: z
    .object({
      chatgpt: z.boolean().optional(),
      claude: z.boolean().optional(),
      gemini: z.boolean().optional(),
      deepseek: z.boolean().optional(),
      grok: z.boolean().optional(),
      kimi: z.boolean().optional(),
      custom: z.boolean().optional(),
    })
    .partial(),
  input: z.object({
    sendShortcut: z.enum(['platform', 'enter', 'ctrl-enter', 'shift-enter']),
    preventAutoScroll: z.boolean(),
  }),
  models: z.object({
    defaults: z
      .object({
        chatgpt: z.string().max(120).optional(),
        claude: z.string().max(120).optional(),
        gemini: z.string().max(120).optional(),
        deepseek: z.string().max(120).optional(),
        grok: z.string().max(120).optional(),
        kimi: z.string().max(120).optional(),
      })
      .partial(),
  }),
  conversationExport: z.object({
    format: z.enum([
      'markdown-standard',
      'markdown-simple',
      'json-standard',
      'json-simple',
      'html-simple',
    ]),
  }),
  markup: z.object({
    mermaidEnabled: z.boolean(),
    mermaidDefaultView: z.enum(['diagram', 'source']),
    formulaCopyEnabled: z.boolean(),
    formulaCopyFormat: z.enum(['latex', 'mathml', 'word', 'notion']),
  }),
  ui: z.object({
    launcherPosition: z.enum(['bottom-right', 'bottom-left']),
    fontScale: z.union([z.literal(0.9), z.literal(1), z.literal(1.1), z.literal(1.2)]),
    panelWidth: z.enum(['compact', 'standard', 'wide']),
    visualEffect: z.enum(['off', 'snow', 'sakura', 'rain', 'mushroom', 'dandelion']),
  }),
  notifications: z.object({
    completionEnabled: z.boolean(),
  }),
});
