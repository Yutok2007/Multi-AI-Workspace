import type { PlatformId } from '../types/platform';

export interface SupportedPlatformDefinition {
  id: Exclude<PlatformId, 'custom'>;
  label: string;
  hostname: string;
  matchPattern: string;
}

export const SUPPORTED_PLATFORMS: readonly SupportedPlatformDefinition[] = [
  {
    id: 'chatgpt',
    label: 'ChatGPT',
    hostname: 'chatgpt.com',
    matchPattern: 'https://chatgpt.com/*',
  },
  { id: 'claude', label: 'Claude', hostname: 'claude.ai', matchPattern: 'https://claude.ai/*' },
  {
    id: 'gemini',
    label: 'Gemini',
    hostname: 'gemini.google.com',
    matchPattern: 'https://gemini.google.com/*',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    hostname: 'chat.deepseek.com',
    matchPattern: 'https://chat.deepseek.com/*',
  },
  { id: 'grok', label: 'Grok', hostname: 'grok.com', matchPattern: 'https://grok.com/*' },
  { id: 'kimi', label: 'Kimi', hostname: 'www.kimi.com', matchPattern: 'https://www.kimi.com/*' },
] as const;
