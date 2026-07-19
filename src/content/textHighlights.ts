import type { PlatformId, PlatformMessage } from '../shared/types/platform';
import type { TextHighlightColor } from '../shared/types/records';

export const TEXT_HIGHLIGHT_COLORS: readonly TextHighlightColor[] = [
  'yellow',
  'green',
  'blue',
  'pink',
];

export const TEXT_HIGHLIGHT_BACKGROUNDS: Record<TextHighlightColor, string> = {
  yellow: 'rgba(255, 210, 58, 0.48)',
  green: 'rgba(115, 202, 113, 0.42)',
  blue: 'rgba(91, 137, 242, 0.38)',
  pink: 'rgba(236, 104, 164, 0.38)',
};

export interface HighlightInterval {
  startOffset: number;
  endOffset: number;
  color: TextHighlightColor;
  precedence?: number;
}

function mergeAdjacentHighlightIntervals(intervals: HighlightInterval[]): HighlightInterval[] {
  const merged: HighlightInterval[] = [];
  for (const interval of intervals) {
    const previous = merged.at(-1);
    if (
      previous &&
      previous.color === interval.color &&
      previous.endOffset === interval.startOffset
    ) {
      previous.endOffset = interval.endOffset;
      previous.precedence = Math.max(previous.precedence ?? 0, interval.precedence ?? 0);
    } else {
      merged.push({ ...interval });
    }
  }
  return merged;
}

function visibleHighlightIntervalsMatch(
  left: readonly HighlightInterval[],
  right: readonly HighlightInterval[],
): boolean {
  return (
    left.length === right.length &&
    left.every(
      (interval, index) =>
        interval.startOffset === right[index]?.startOffset &&
        interval.endOffset === right[index]?.endOffset &&
        interval.color === right[index]?.color,
    )
  );
}

/**
 * Converts legacy or concurrently-created overlapping highlights into one visible color layer.
 * The most recently updated interval wins each overlapping segment.
 */
export function normalizeHighlightIntervals(
  intervals: readonly HighlightInterval[],
): HighlightInterval[] {
  const valid = intervals.filter(
    (interval) =>
      Number.isInteger(interval.startOffset) &&
      Number.isInteger(interval.endOffset) &&
      interval.startOffset >= 0 &&
      interval.endOffset > interval.startOffset,
  );
  const boundaries = [
    ...new Set(valid.flatMap(({ startOffset, endOffset }) => [startOffset, endOffset])),
  ].sort((left, right) => left - right);
  const normalized: HighlightInterval[] = [];
  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const startOffset = boundaries[index];
    const endOffset = boundaries[index + 1];
    let winner: HighlightInterval | undefined;
    let winnerIndex = -1;
    valid.forEach((interval, intervalIndex) => {
      if (interval.startOffset >= endOffset || interval.endOffset <= startOffset) return;
      if (
        !winner ||
        (interval.precedence ?? 0) > (winner.precedence ?? 0) ||
        ((interval.precedence ?? 0) === (winner.precedence ?? 0) && intervalIndex > winnerIndex)
      ) {
        winner = interval;
        winnerIndex = intervalIndex;
      }
    });
    if (winner) {
      normalized.push({
        startOffset,
        endOffset,
        color: winner.color,
        precedence: winner.precedence,
      });
    }
  }
  return mergeAdjacentHighlightIntervals(normalized);
}

export function applyHighlightInterval(
  intervals: readonly HighlightInterval[],
  startOffset: number,
  endOffset: number,
  color: TextHighlightColor,
): HighlightInterval[] {
  if (startOffset < 0 || endOffset <= startOffset) return normalizeHighlightIntervals(intervals);
  const canonical = normalizeHighlightIntervals(intervals);
  const remaining = canonical.flatMap((interval): HighlightInterval[] => {
    if (interval.endOffset <= startOffset || interval.startOffset >= endOffset) return [interval];
    const pieces: HighlightInterval[] = [];
    if (interval.startOffset < startOffset) {
      pieces.push({ ...interval, endOffset: startOffset });
    }
    if (interval.endOffset > endOffset) {
      pieces.push({ ...interval, startOffset: endOffset });
    }
    return pieces;
  });
  const highestPrecedence = canonical.reduce(
    (highest, interval) => Math.max(highest, interval.precedence ?? 0),
    0,
  );
  const applied = normalizeHighlightIntervals([
    ...remaining,
    { startOffset, endOffset, color, precedence: highestPrecedence + 1 },
  ]);
  return visibleHighlightIntervalsMatch(canonical, applied) ? canonical : applied;
}

export function removeHighlightInterval(
  intervals: readonly HighlightInterval[],
  startOffset: number,
  endOffset: number,
): HighlightInterval[] {
  const canonical = normalizeHighlightIntervals(intervals);
  if (startOffset < 0 || endOffset <= startOffset) return canonical;
  return mergeAdjacentHighlightIntervals(
    canonical.flatMap((interval): HighlightInterval[] => {
      if (interval.endOffset <= startOffset || interval.startOffset >= endOffset) return [interval];
      const pieces: HighlightInterval[] = [];
      if (interval.startOffset < startOffset) {
        pieces.push({ ...interval, endOffset: startOffset });
      }
      if (interval.endOffset > endOffset) {
        pieces.push({ ...interval, startOffset: endOffset });
      }
      return pieces;
    }),
  );
}

export function createTextHighlightId(
  platformId: PlatformId,
  accountScopeId: string,
  conversationId: string,
  messageKey: string,
  startOffset: number,
  endOffset: number,
): string {
  return [
    'highlight',
    platformId,
    accountScopeId,
    conversationId,
    messageKey,
    startOffset,
    endOffset,
  ]
    .map((part) => encodeURIComponent(String(part)))
    .join(':');
}

export function getMessageKey(message: PlatformMessage): string {
  return message.messageId ? `id:${message.messageId}` : message.runtimeMessageId;
}

function containsBoundary(root: HTMLElement, node: Node): boolean {
  return node === root || root.contains(node);
}

export interface MessageRangePart {
  message: PlatformMessage;
  range: Range;
}

/**
 * Clips one document selection to every message element it intersects. Persisting each clipped
 * range separately keeps cross-message highlights restorable without storing conversation text.
 */
export function splitRangeAcrossMessages(
  range: Range,
  messages: PlatformMessage[],
): MessageRangePart[] {
  const parts: MessageRangePart[] = [];
  for (const message of messages) {
    try {
      if (!range.intersectsNode(message.element)) continue;
      const part = message.element.ownerDocument.createRange();
      part.selectNodeContents(message.element);
      if (containsBoundary(message.element, range.startContainer)) {
        part.setStart(range.startContainer, range.startOffset);
      }
      if (containsBoundary(message.element, range.endContainer)) {
        part.setEnd(range.endContainer, range.endOffset);
      }
      if (part.toString().trim()) parts.push({ message, range: part });
    } catch {
      // Detached or concurrently replaced message nodes are ignored until the next refresh.
    }
  }
  return parts;
}

export function getRangeOffsets(
  root: HTMLElement,
  range: Range,
): { startOffset: number; endOffset: number } | null {
  if (
    !containsBoundary(root, range.startContainer) ||
    !containsBoundary(root, range.endContainer)
  ) {
    return null;
  }

  try {
    const start = root.ownerDocument.createRange();
    start.selectNodeContents(root);
    start.setEnd(range.startContainer, range.startOffset);
    const end = root.ownerDocument.createRange();
    end.selectNodeContents(root);
    end.setEnd(range.endContainer, range.endOffset);
    const startOffset = start.toString().length;
    const endOffset = end.toString().length;
    return endOffset > startOffset ? { startOffset, endOffset } : null;
  } catch {
    return null;
  }
}

function findTextBoundary(
  root: HTMLElement,
  offset: number,
): { node: Text; offset: number } | null {
  if (!Number.isInteger(offset) || offset < 0) return null;
  const walker = root.ownerDocument.createTreeWalker(root, 4);
  let traversed = 0;
  let lastText: Text | null = null;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node as Text;
    lastText = text;
    const next = traversed + text.data.length;
    if (offset <= next) return { node: text, offset: offset - traversed };
    traversed = next;
  }
  if (lastText && offset === traversed) return { node: lastText, offset: lastText.data.length };
  return null;
}

export function createRangeFromOffsets(
  root: HTMLElement,
  startOffset: number,
  endOffset: number,
): Range | null {
  if (endOffset <= startOffset) return null;
  const start = findTextBoundary(root, startOffset);
  const end = findTextBoundary(root, endOffset);
  if (!start || !end) return null;
  try {
    const range = root.ownerDocument.createRange();
    range.setStart(start.node, start.offset);
    range.setEnd(end.node, end.offset);
    return range;
  } catch {
    return null;
  }
}

function textNodesWithin(range: Range): Text[] {
  const common = range.commonAncestorContainer;
  if (common.nodeType === Node.TEXT_NODE) return [common as Text];
  const walker = common.ownerDocument?.createTreeWalker(common, 4);
  if (!walker) return [];
  const nodes: Text[] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    nodes.push(node as Text);
  }
  return nodes;
}

export function getTextOnlyClientRects(range: Range): DOMRect[] {
  const rectangles: DOMRect[] = [];
  for (const text of textNodesWithin(range)) {
    if (!text.data.trim()) continue;
    try {
      if (!range.intersectsNode(text)) continue;
      const startOffset = range.startContainer === text ? range.startOffset : 0;
      const endOffset = range.endContainer === text ? range.endOffset : text.data.length;
      if (endOffset <= startOffset || !text.data.slice(startOffset, endOffset).trim()) continue;
      const textRange = text.ownerDocument.createRange();
      textRange.setStart(text, startOffset);
      textRange.setEnd(text, endOffset);
      rectangles.push(...Array.from(textRange.getClientRects()));
    } catch {
      // Detached or concurrently replaced text nodes are skipped until the next message refresh.
    }
  }
  return rectangles;
}

export async function hashHighlightText(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
