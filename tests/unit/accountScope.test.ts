import { describe, expect, it } from 'vitest';

import { hashAccountScope, normalizeEmail } from '../../src/shared/utils/accountScope';

describe('account scope hashing', () => {
  it('normalizes email without persisting it and produces a stable SHA-256 hash', async () => {
    expect(normalizeEmail('  Example.User@Example.COM ')).toBe('example.user@example.com');
    const first = await hashAccountScope('chatgpt', 'Example.User@Example.COM');
    const second = await hashAccountScope('chatgpt', ' example.user@example.com ');

    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(await hashAccountScope('claude', 'example.user@example.com')).not.toBe(first);
  });
});
