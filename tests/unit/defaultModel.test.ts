import { describe, expect, it } from 'vitest';

import { shouldApplyDefaultModel } from '../../src/content/useDefaultModel';

describe('default model eligibility', () => {
  it('applies only on a known empty new-chat route', () => {
    expect(shouldApplyDefaultModel('chatgpt', 'https://chatgpt.com/', 0)).toBe(true);
    expect(shouldApplyDefaultModel('claude', 'https://claude.ai/new', 0)).toBe(true);
    expect(shouldApplyDefaultModel('gemini', 'https://gemini.google.com/app', 0)).toBe(true);
    expect(shouldApplyDefaultModel('deepseek', 'https://chat.deepseek.com/', 0)).toBe(true);
    expect(shouldApplyDefaultModel('grok', 'https://grok.com/', 0)).toBe(true);
    expect(shouldApplyDefaultModel('kimi', 'https://www.kimi.com/', 0)).toBe(true);
    expect(shouldApplyDefaultModel('chatgpt', 'https://chatgpt.com/c/conversation', 0)).toBe(false);
    expect(shouldApplyDefaultModel('chatgpt', 'https://chatgpt.com/', 1)).toBe(false);
  });
});
