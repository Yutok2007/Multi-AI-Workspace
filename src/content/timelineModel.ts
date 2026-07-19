import type { PlatformId, PlatformMessage } from '../shared/types/platform';
import type { TimelineMetadataRecord } from '../shared/types/records';
import { getMessageKey } from './textHighlights';

export const MAX_TIMELINE_HIERARCHY_LEVEL = 4;

export interface TimelineNode {
  message: PlatformMessage;
  messageKey: string;
  metadata: TimelineMetadataRecord | null;
  hierarchyLevel: number;
  collapsed: boolean;
  hasChildren: boolean;
  hiddenChildCount: number;
}

export function createTimelineMetadataId(
  platformId: PlatformId,
  accountScopeId: string,
  conversationId: string,
  messageKey: string,
): string {
  return ['timeline', platformId, accountScopeId, conversationId, messageKey]
    .map((part) => encodeURIComponent(part))
    .join(':');
}

export function defaultTimelineHierarchyLevel(message: PlatformMessage): number {
  return message.role === 'user' ? 0 : 1;
}

function normalizedHierarchyLevel(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(MAX_TIMELINE_HIERARCHY_LEVEL, Math.max(0, Math.trunc(value)));
}

export function buildTimelineNodes(
  messages: PlatformMessage[],
  metadata: TimelineMetadataRecord[],
): TimelineNode[] {
  const metadataByKey = new Map(metadata.map((record) => [record.messageKey, record]));
  const nodes = messages.map((message): TimelineNode => {
    const messageKey = getMessageKey(message);
    const record = metadataByKey.get(messageKey) ?? null;
    return {
      message,
      messageKey,
      metadata: record,
      hierarchyLevel: normalizedHierarchyLevel(
        record?.hierarchyLevel ?? defaultTimelineHierarchyLevel(message),
      ),
      collapsed: record?.collapsed ?? false,
      hasChildren: false,
      hiddenChildCount: 0,
    };
  });

  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    for (let cursor = index + 1; cursor < nodes.length; cursor += 1) {
      if (nodes[cursor].hierarchyLevel <= node.hierarchyLevel) break;
      node.hiddenChildCount += 1;
    }
    node.hasChildren = node.hiddenChildCount > 0;
  }
  return nodes;
}

export function removeCollapsedDescendants(nodes: TimelineNode[]): TimelineNode[] {
  const visible: TimelineNode[] = [];
  let collapsedParentLevel: number | null = null;
  for (const node of nodes) {
    if (collapsedParentLevel !== null) {
      if (node.hierarchyLevel > collapsedParentLevel) continue;
      collapsedParentLevel = null;
    }
    visible.push(node);
    if (node.collapsed && node.hasChildren) collapsedParentLevel = node.hierarchyLevel;
  }
  return visible;
}

export function previousTimelineLevel(nodes: TimelineNode[], messageKey: string): number {
  const index = nodes.findIndex((node) => node.messageKey === messageKey);
  return index > 0 ? nodes[index - 1].hierarchyLevel : 0;
}
