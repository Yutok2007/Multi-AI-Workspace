import { describe, expect, it } from 'vitest';

import { redact } from '../../src/shared/logger/redaction';

describe('redact', () => {
  it('removes sensitive fields, masks conversation identifiers, and redacts emails', () => {
    expect(
      redact({
        apiKey: 'sk-secret',
        prompt: 'private question',
        conversationId: 'conversation-123456789',
        nested: { note: 'contact me@example.com', Authorization: 'Bearer secret' },
      }),
    ).toEqual({
      apiKey: '[REDACTED]',
      prompt: '[REDACTED]',
      conversationId: 'con…789',
      nested: { note: 'contact [REDACTED_EMAIL]', Authorization: '[REDACTED]' },
    });
  });

  it('handles circular structures without throwing', () => {
    const value: Record<string, unknown> = {};
    value.self = value;
    expect(redact(value)).toEqual({ self: '[CIRCULAR]' });
  });
});
