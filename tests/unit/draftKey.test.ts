import { describe, expect, it } from 'vitest';

import { createDraftKey } from '../../src/shared/utils/draftKey';

describe('createDraftKey', () => {
  it('isolates drafts by platform, account, and conversation', () => {
    const base = createDraftKey('chatgpt', 'account-a', 'conversation-1', 'https://chatgpt.com/');
    expect(
      createDraftKey('chatgpt', 'account-b', 'conversation-1', 'https://chatgpt.com/'),
    ).not.toBe(base);
    expect(createDraftKey('claude', 'account-a', 'conversation-1', 'https://claude.ai/')).not.toBe(
      base,
    );
    expect(
      createDraftKey('chatgpt', 'account-a', 'conversation-2', 'https://chatgpt.com/'),
    ).not.toBe(base);
  });
});
