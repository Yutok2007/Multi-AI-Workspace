import { describe, expect, it } from 'vitest';

import { parseOriginPermission } from '../../src/shared/permissions/originPermission';

describe('parseOriginPermission', () => {
  it('keeps only the exact origin and does not broaden to subdomains', () => {
    expect(parseOriginPermission('https://example.com/path?q=1')).toEqual({
      origin: 'https://example.com',
      matchPattern: 'https://example.com/*',
    });
  });

  it('rejects unsupported protocols and embedded credentials', () => {
    expect(() => parseOriginPermission('file:///tmp/example')).toThrow(/http/);
    expect(() => parseOriginPermission('https://user:pass@example.com')).toThrow(/credentials/);
  });
});
