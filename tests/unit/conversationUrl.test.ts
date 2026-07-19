import { describe, expect, it } from 'vitest';

import {
  conversationIdFromUrl,
  sanitizeConversationUrl,
} from '../../src/shared/utils/conversationUrl';

describe('conversation URL safety', () => {
  it('removes credential-like query and fragment values while preserving routing data', () => {
    const safe = sanitizeConversationUrl(
      'https://example.test/chat/1?model=fast&access_token=secret#session=private',
    );

    expect(safe).toBe('https://example.test/chat/1?model=fast');
    expect(conversationIdFromUrl(safe)).toBe('/chat/1?model=fast');
  });

  it('keeps non-sensitive hash routes used by some SPA conversations', () => {
    const safe = sanitizeConversationUrl('https://example.test/#/chat/conversation-1');
    expect(conversationIdFromUrl(safe)).toBe('/#/chat/conversation-1');
  });
});
