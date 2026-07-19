import { afterEach, describe, expect, it } from 'vitest';

import { createElementSelector } from '../../src/platforms/base/elementSelector';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('createElementSelector', () => {
  it('uses a repeated semantic role for message collections instead of a turn-specific id', () => {
    document.body.innerHTML = `
      <article data-id="turn-1" data-message-role="user">First prompt</article>
      <article data-id="turn-2" data-message-role="user">Second prompt</article>
    `;
    const first = document.querySelector<HTMLElement>('[data-id="turn-1"]')!;

    const selector = createElementSelector(first, true);

    expect(selector).toBe('article[data-message-role="user"]');
    expect(document.querySelectorAll(selector)).toHaveLength(2);
  });

  it('does not bind a message collection to a unique data-id', () => {
    document.body.innerHTML = '<article data-id="turn-1">Only prompt</article>';
    const element = document.querySelector<HTMLElement>('article')!;

    expect(() => createElementSelector(element, true)).toThrow(
      'A unique selector could not be created.',
    );
  });
});
