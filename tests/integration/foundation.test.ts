import { describe, expect, it } from 'vitest';

import { createPlatformRegistry } from '../../src/platforms';
import { createPlatformDiagnostic } from '../../src/platforms/base/PlatformDiagnostics';

describe('foundation integration', () => {
  it('reports a supported origin as unverified with no fabricated capabilities', () => {
    const adapter = createPlatformRegistry().match(
      new URL('https://gemini.google.com/app') as unknown as Location,
    );
    expect(adapter).not.toBeNull();

    const diagnostic = createPlatformDiagnostic(adapter!);
    expect(diagnostic).toMatchObject({
      platform: 'gemini',
      status: 'unverified',
      capabilities: {},
      failures: {},
    });
  });
});
