import { describe, expect, it } from 'vitest';

import { validateProviderEndpoint } from '../../src/background/providerProfiles';

describe('validateProviderEndpoint', () => {
  it('allows HTTPS and local HTTP endpoints', () => {
    expect(validateProviderEndpoint('https://api.example.test/v1/chat').origin).toBe(
      'https://api.example.test',
    );
    expect(validateProviderEndpoint('http://localhost:11434/api/chat').origin).toBe(
      'http://localhost:11434',
    );
  });

  it('rejects embedded credentials and insecure remote endpoints', () => {
    expect(() => validateProviderEndpoint('https://user:password@api.example.test/v1')).toThrow();
    expect(() => validateProviderEndpoint('http://api.example.test/v1')).toThrow();
  });
});
