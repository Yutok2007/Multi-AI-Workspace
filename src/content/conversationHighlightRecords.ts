import type { PlatformId, PlatformMessage } from '../shared/types/platform';
import type { TextHighlightRecord } from '../shared/types/records';
import { deleteRecord, putRecord } from './database';
import { createRangeFromOffsets, createTextHighlightId, hashHighlightText } from './textHighlights';
import type { HighlightInterval } from './textHighlights';

export interface ConversationScope {
  accountScopeId: string;
  conversationId: string;
}

export interface SelectionDescriptor {
  id: string;
  message: PlatformMessage;
  messageKey: string;
  anchorPath: string | null;
  range: Range;
  startOffset: number;
  endOffset: number;
}

export function rangesMatch(left: Range, right: Range): boolean {
  return (
    left.startContainer === right.startContainer &&
    left.startOffset === right.startOffset &&
    left.endContainer === right.endContainer &&
    left.endOffset === right.endOffset
  );
}

function compareBoundaries(
  leftContainer: Node,
  leftOffset: number,
  rightContainer: Node,
  rightOffset: number,
): number {
  const document = leftContainer.ownerDocument;
  if (!document || document !== rightContainer.ownerDocument)
    throw new Error('Range documents differ.');
  const left = document.createRange();
  const right = document.createRange();
  left.setStart(leftContainer, leftOffset);
  left.collapse(true);
  right.setStart(rightContainer, rightOffset);
  right.collapse(true);
  return left.compareBoundaryPoints(Range.START_TO_START, right);
}

export function rangesOverlap(left: Range, right: Range): boolean {
  try {
    return (
      compareBoundaries(
        left.endContainer,
        left.endOffset,
        right.startContainer,
        right.startOffset,
      ) > 0 &&
      compareBoundaries(
        left.startContainer,
        left.startOffset,
        right.endContainer,
        right.endOffset,
      ) < 0
    );
  } catch {
    return false;
  }
}

export function subtractRange(source: Range, removed: Range): Range[] {
  if (!rangesOverlap(source, removed)) return [source];
  const pieces: Range[] = [];
  if (
    compareBoundaries(
      source.startContainer,
      source.startOffset,
      removed.startContainer,
      removed.startOffset,
    ) < 0
  ) {
    const before = source.cloneRange();
    before.setEnd(removed.startContainer, removed.startOffset);
    if (before.toString().trim()) pieces.push(before);
  }
  if (
    compareBoundaries(
      source.endContainer,
      source.endOffset,
      removed.endContainer,
      removed.endOffset,
    ) > 0
  ) {
    const after = source.cloneRange();
    after.setStart(removed.endContainer, removed.endOffset);
    if (after.toString().trim()) pieces.push(after);
  }
  return pieces;
}

export function recordIntervals(records: readonly TextHighlightRecord[]): HighlightInterval[] {
  return records.map((record) => ({
    startOffset: record.startOffset,
    endOffset: record.endOffset,
    color: record.color,
    precedence: record.updatedAt,
  }));
}

function highlightRecordsMatch(left: TextHighlightRecord, right: TextHighlightRecord): boolean {
  return (
    left.id === right.id &&
    left.messageId === right.messageId &&
    left.startOffset === right.startOffset &&
    left.endOffset === right.endOffset &&
    left.textHash === right.textHash &&
    left.color === right.color &&
    left.createdAt === right.createdAt &&
    left.updatedAt === right.updatedAt
  );
}

export async function replaceMessageHighlightRecords(
  allRecords: TextHighlightRecord[],
  descriptor: SelectionDescriptor,
  intervals: readonly HighlightInterval[],
  platformId: PlatformId,
  scope: ConversationScope,
  now: number,
): Promise<{ records: TextHighlightRecord[]; changed: boolean }> {
  const current = allRecords.filter((record) => record.messageKey === descriptor.messageKey);
  const next = (
    await Promise.all(
      intervals.map(async (interval): Promise<TextHighlightRecord | null> => {
        const range = createRangeFromOffsets(
          descriptor.message.element,
          interval.startOffset,
          interval.endOffset,
        );
        if (!range) return null;
        const id = createTextHighlightId(
          platformId,
          scope.accountScopeId,
          scope.conversationId,
          descriptor.messageKey,
          interval.startOffset,
          interval.endOffset,
        );
        const previous = current.find((record) => record.id === id);
        const unchangedColor = previous?.color === interval.color;
        return {
          id,
          platformId,
          accountScopeId: scope.accountScopeId,
          conversationId: scope.conversationId,
          messageKey: descriptor.messageKey,
          messageId: descriptor.message.messageId,
          startOffset: interval.startOffset,
          endOffset: interval.endOffset,
          textHash: await hashHighlightText(range.toString()),
          color: interval.color,
          createdAt: previous?.createdAt ?? now,
          updatedAt: unchangedColor ? previous.updatedAt : now,
        };
      }),
    )
  ).filter((record) => record !== null);
  const nextIds = new Set(next.map((record) => record.id));
  const removed = current.filter((record) => !nextIds.has(record.id));
  const changedRecords = next.filter((record) => {
    const previous = current.find((candidate) => candidate.id === record.id);
    return !previous || !highlightRecordsMatch(previous, record);
  });
  await Promise.all([
    ...removed.map((record) => deleteRecord('textHighlights', record.id)),
    ...changedRecords.map((record) => putRecord('textHighlights', record)),
  ]);
  return {
    records: [
      ...allRecords.filter((record) => record.messageKey !== descriptor.messageKey),
      ...next,
    ],
    changed: removed.length > 0 || changedRecords.length > 0,
  };
}
