import { describe, expect, it } from 'vitest';

import { decryptText, encryptText } from '../../src/shared/encryption/encryption';

describe('encrypted local payloads', () => {
  it('round-trips with AES-GCM and does not expose plaintext', async () => {
    const plaintext = 'local provider secret';
    const encrypted = await encryptText(plaintext, 'correct horse battery staple');

    expect(encrypted.ciphertext).not.toContain(plaintext);
    await expect(decryptText(encrypted, 'correct horse battery staple')).resolves.toBe(plaintext);
    await expect(decryptText(encrypted, 'incorrect password')).rejects.toBeDefined();
  });
});
