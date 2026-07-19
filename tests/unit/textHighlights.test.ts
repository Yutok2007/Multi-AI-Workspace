import { describe, expect, it } from 'vitest';

import {
  applyHighlightInterval,
  createRangeFromOffsets,
  createTextHighlightId,
  getRangeOffsets,
  getTextOnlyClientRects,
  hashHighlightText,
  normalizeHighlightIntervals,
  removeHighlightInterval,
  splitRangeAcrossMessages,
} from '../../src/content/textHighlights';
import type { PlatformMessage } from '../../src/shared/types/platform';

function createMessage(element: HTMLElement, role: PlatformMessage['role'], order: number) {
  return {
    platform: 'custom',
    conversationId: 'conversation',
    messageId: `message-${order}`,
    runtimeMessageId: `${role}:${order}`,
    role,
    plainText: element.textContent ?? '',
    html: element.innerHTML,
    timestamp: null,
    timestampSource: 'unknown',
    element,
    order,
  } satisfies PlatformMessage;
}

describe('text highlight anchors', () => {
  it('keeps one color layer and lets the newest color replace only its overlap', () => {
    const yellow = applyHighlightInterval([], 0, 10, 'yellow');
    expect(applyHighlightInterval(yellow, 0, 10, 'yellow')).toEqual(yellow);
    expect(applyHighlightInterval(yellow, 4, 8, 'blue')).toEqual([
      expect.objectContaining({ startOffset: 0, endOffset: 4, color: 'yellow' }),
      expect.objectContaining({ startOffset: 4, endOffset: 8, color: 'blue' }),
      expect.objectContaining({ startOffset: 8, endOffset: 10, color: 'yellow' }),
    ]);
  });

  it('collapses legacy overlaps by recency and removal never reveals an older layer', () => {
    const legacy = normalizeHighlightIntervals([
      { startOffset: 0, endOffset: 10, color: 'yellow', precedence: 1 },
      { startOffset: 3, endOffset: 7, color: 'blue', precedence: 2 },
    ]);
    expect(
      legacy.map(({ startOffset, endOffset, color }) => ({ startOffset, endOffset, color })),
    ).toEqual([
      { startOffset: 0, endOffset: 3, color: 'yellow' },
      { startOffset: 3, endOffset: 7, color: 'blue' },
      { startOffset: 7, endOffset: 10, color: 'yellow' },
    ]);
    expect(removeHighlightInterval(legacy, 3, 7)).toEqual([
      expect.objectContaining({ startOffset: 0, endOffset: 3, color: 'yellow' }),
      expect.objectContaining({ startOffset: 7, endOffset: 10, color: 'yellow' }),
    ]);
  });

  it('round-trips a range across nested text nodes without storing message text', () => {
    const root = document.createElement('article');
    root.innerHTML = '<p>Alpha <strong>bravo</strong> charlie</p>';
    document.body.append(root);
    const strongText = root.querySelector('strong')?.firstChild;
    const tailText = root.querySelector('p')?.lastChild;
    if (!strongText || !tailText) throw new Error('Fixture text is missing.');
    const range = document.createRange();
    range.setStart(strongText, 1);
    range.setEnd(tailText, 5);

    const offsets = getRangeOffsets(root, range);
    expect(offsets).toEqual({ startOffset: 7, endOffset: 16 });
    const restored = createRangeFromOffsets(root, offsets!.startOffset, offsets!.endOffset);
    expect(restored?.toString()).toBe('ravo char');
  });

  it('creates a deterministic scoped id and hashes only the selected value', async () => {
    expect(createTextHighlightId('chatgpt', 'anon', '/c/1', 'assistant:0', 3, 8)).toBe(
      'highlight:chatgpt:anon:%2Fc%2F1:assistant%3A0:3:8',
    );
    await expect(hashHighlightText('selected')).resolves.toMatch(/^[a-f0-9]{64}$/);
  });

  it('rejects offsets outside the rendered message text', () => {
    const root = document.createElement('article');
    root.textContent = 'short';
    expect(createRangeFromOffsets(root, 2, 20)).toBeNull();
  });

  it('measures text-node ranges and skips whitespace-only layout nodes', () => {
    const root = document.createElement('article');
    root.innerHTML = '<p>Short title</p>\n  <p>Another line</p>';
    document.body.append(root);
    const range = document.createRange();
    range.selectNodeContents(root);
    const measured: string[] = [];
    const descriptor = Object.getOwnPropertyDescriptor(Range.prototype, 'getClientRects');
    Object.defineProperty(Range.prototype, 'getClientRects', {
      configurable: true,
      value(this: Range) {
        measured.push(this.toString());
        return [{ width: this.toString().length, height: 10 }] as DOMRect[];
      },
    });
    try {
      expect(getTextOnlyClientRects(range)).toHaveLength(2);
      expect(measured).toEqual(['Short title', 'Another line']);
    } finally {
      if (descriptor) Object.defineProperty(Range.prototype, 'getClientRects', descriptor);
      else delete (Range.prototype as Partial<Range>).getClientRects;
    }
  });

  it('splits one selection into clipped ranges for every intersected message layer', () => {
    const first = document.createElement('article');
    first.innerHTML = '<p>Alpha <strong>bravo</strong></p><p>First tail</p>';
    const second = document.createElement('article');
    second.innerHTML = '<p>Second head</p><p>Charlie <em>delta</em></p>';
    document.body.append(first, second);
    const start = first.querySelector('strong')?.firstChild;
    const end = second.querySelector('em')?.firstChild;
    if (!start || !end) throw new Error('Fixture text is missing.');
    const range = document.createRange();
    range.setStart(start, 1);
    range.setEnd(end, 3);

    const parts = splitRangeAcrossMessages(range, [
      createMessage(first, 'assistant', 0),
      createMessage(second, 'assistant', 1),
    ]);

    expect(parts).toHaveLength(2);
    expect(parts.map((part) => part.range.toString())).toEqual([
      'ravoFirst tail',
      'Second headCharlie del',
    ]);
    expect(getRangeOffsets(first, parts[0].range)).toEqual({ startOffset: 7, endOffset: 21 });
    expect(getRangeOffsets(second, parts[1].range)).toEqual({ startOffset: 0, endOffset: 22 });
  });
});
