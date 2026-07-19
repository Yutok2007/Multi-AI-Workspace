import { describe, expect, it } from 'vitest';

import { createPlatformRegistry } from '../../src/platforms';

function locationFor(url: string): Location {
  return new URL(url) as unknown as Location;
}

describe('PlatformRegistry', () => {
  it.each([
    ['chatgpt', 'https://chatgpt.com/'],
    ['claude', 'https://claude.ai/new'],
    ['gemini', 'https://gemini.google.com/app'],
    ['deepseek', 'https://chat.deepseek.com/'],
    ['grok', 'https://grok.com/'],
    ['kimi', 'https://www.kimi.com/'],
  ])('matches %s by exact verified hostname', (id, url) => {
    expect(createPlatformRegistry().match(locationFor(url))?.id).toBe(id);
  });

  it('does not match lookalike hosts and exposes no unverified capabilities', () => {
    const registry = createPlatformRegistry();
    expect(registry.match(locationFor('https://chatgpt.com.example.test/'))).toBeNull();
    expect(
      createPlatformRegistry(locationFor('https://example.com/chat')).match(
        locationFor('https://example.com/chat'),
      ),
    ).toBeNull();
    expect(registry.match(locationFor('https://chatgpt.com/'))?.getCapabilities().size).toBe(0);
  });

  it('keeps the local fixture adapter available only to automated tests', () => {
    const location = locationFor('http://127.0.0.1:4173/chat');
    expect(createPlatformRegistry(location).match(location)?.id).toBe('custom');
  });

  it('fails safely instead of guessing a composer selector', async () => {
    const adapter = createPlatformRegistry().match(locationFor('https://chatgpt.com/'));
    await expect(adapter?.readComposer()).rejects.toMatchObject({ code: 'CAPABILITY_UNAVAILABLE' });
  });
});
