import type { ApiProfileMetadataRecord, ApiProviderType } from '../types/records';
import type { PlatformId } from '../types/platform';

export const REWRITE_MODES = [
  'general',
  'concise',
  'detailed',
  'professional',
  'academic',
  'coding',
  'data-analysis',
  'creative-writing',
  'image-generation',
  'translation',
  'custom',
] as const;

export type RewriteMode = (typeof REWRITE_MODES)[number];

export interface PromptRewriteRequest {
  originalPrompt: string;
  mode: RewriteMode;
  customInstruction?: string;
  platformId: PlatformId;
  targetPlatformStyle?: string;
  includeConversationContext: boolean;
  contextMessages: Array<{ role: 'user' | 'assistant'; content: string }>;
  outputLanguage: 'preserve' | 'en' | 'zh-CN';
}

export interface PromptRewriteResult {
  rewrittenPrompt: string;
  summaryOfChanges: string[];
  preservedConstraints: string[];
  missingInformation: string[];
  assumptions: string[];
}

export type ChatSummaryLanguage = 'preserve' | 'en' | 'zh-CN' | 'zh-TW';

export interface ChatSummaryRequest {
  conversationTitle?: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  outputLanguage: ChatSummaryLanguage;
}

export interface ChatSummaryResult {
  summary: string;
  keyPoints: string[];
  decisions: string[];
  actionItems: string[];
  unansweredQuestions: string[];
}

export interface ApiProfileInput {
  id?: string;
  providerType: ApiProviderType;
  name: string;
  endpoint: string;
  model: string;
  secretStorage: 'session' | 'encrypted-local';
  apiKey?: string;
  encryptionPassword?: string;
}

export interface ProviderProfileState {
  profile: ApiProfileMetadataRecord;
  unlocked: boolean;
}

export const PROVIDER_PRESETS: Record<
  Exclude<ApiProviderType, 'openai-compatible'>,
  { endpoint: string; model: string; needsKey: boolean }
> = {
  openai: {
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4.1-mini',
    needsKey: true,
  },
  anthropic: {
    endpoint: 'https://api.anthropic.com/v1/messages',
    model: 'claude-sonnet-4-5',
    needsKey: true,
  },
  google: {
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
    model: 'gemini-2.5-flash',
    needsKey: true,
  },
  deepseek: {
    endpoint: 'https://api.deepseek.com/chat/completions',
    model: 'deepseek-chat',
    needsKey: true,
  },
  xai: {
    endpoint: 'https://api.x.ai/v1/chat/completions',
    model: 'grok-3-mini',
    needsKey: true,
  },
  moonshot: {
    endpoint: 'https://api.moonshot.ai/v1/chat/completions',
    model: 'moonshot-v1-8k',
    needsKey: true,
  },
  ollama: {
    endpoint: 'http://localhost:11434/api/chat',
    model: 'qwen3:8b',
    needsKey: false,
  },
};
