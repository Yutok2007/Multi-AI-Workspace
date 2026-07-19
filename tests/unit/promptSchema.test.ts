import { describe, expect, it } from 'vitest';

import { promptRecordSchema } from '../../src/shared/schemas/records';

const basePrompt = {
  id: 'prompt-1',
  title: 'Summarize',
  content: 'Summarize this text.',
  description: '',
  tags: [],
  folderId: null,
  usageCount: 0,
  favorite: false,
  createdAt: 1,
  updatedAt: 1,
};

describe('promptRecordSchema', () => {
  it('accepts correctly isolated account prompts', () => {
    expect(
      promptRecordSchema.safeParse({
        ...basePrompt,
        scope: 'account',
        platformId: 'gemini',
        accountScopeId: 'account-hash',
      }).success,
    ).toBe(true);
  });

  it('rejects account prompts missing their account scope', () => {
    expect(
      promptRecordSchema.safeParse({
        ...basePrompt,
        scope: 'account',
        platformId: 'gemini',
        accountScopeId: null,
      }).success,
    ).toBe(false);
  });
});
