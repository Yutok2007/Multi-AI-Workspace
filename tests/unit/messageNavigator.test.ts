import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  measureMessageRailPosition,
  spreadRailPercentages,
} from '../../src/content/messageNavigator';
import { scrollElementToCenter } from '../../src/shared/utils/messageScroll';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('message navigator positioning', () => {
  it('measures messages inside the page scroll container instead of the window', () => {
    document.body.innerHTML = `
      <main id="scroller" style="overflow-y: auto">
        <article id="message">Prompt</article>
      </main>
    `;
    const scroller = document.querySelector<HTMLElement>('#scroller')!;
    const message = document.querySelector<HTMLElement>('#message')!;
    Object.defineProperties(scroller, {
      clientHeight: { value: 500 },
      scrollHeight: { value: 2_000 },
      scrollTop: { value: 1_000, writable: true },
      getBoundingClientRect: {
        value: () => ({ top: 100, height: 500 }),
      },
    });
    Object.defineProperty(message, 'getBoundingClientRect', {
      value: () => ({ top: 200, height: 80 }),
    });

    const measurement = measureMessageRailPosition(message, 900);
    expect(measurement.topPercent).toBeCloseTo(55);
    expect(measurement.viewportCenter).toBe(350);
  });

  it('spreads overlapping positions so every Prompt keeps a visible dot', () => {
    const positions = spreadRailPercentages([99, 99, 99, 99, 99]);

    expect(positions).toHaveLength(5);
    expect(new Set(positions).size).toBe(5);
    expect(positions).toEqual([75, 81, 87, 93, 99]);
  });

  it('centers a message by directly scrolling its internal container', () => {
    document.body.innerHTML = `
      <main id="scroller" style="overflow-y: auto">
        <article id="message">Prompt</article>
      </main>`;
    const scroller = document.querySelector<HTMLElement>('#scroller')!;
    const message = document.querySelector<HTMLElement>('#message')!;
    const scrollTo = vi.fn();
    Object.defineProperties(scroller, {
      clientHeight: { value: 500 },
      scrollHeight: { value: 2_000 },
      scrollTop: { value: 400, writable: true },
      scrollTo: { value: scrollTo },
      getBoundingClientRect: {
        value: () => ({ top: 100, height: 500 }),
      },
    });
    Object.defineProperty(message, 'getBoundingClientRect', {
      value: () => ({ top: 900, height: 80 }),
    });

    expect(scrollElementToCenter(message, 'smooth')).toBe(true);
    expect(scrollTo).toHaveBeenCalledWith({ top: 990, behavior: 'smooth' });
  });
});
