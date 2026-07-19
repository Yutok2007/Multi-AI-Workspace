import { describe, expect, it } from 'vitest';

import {
  buildTimelineNodes,
  createTimelineMetadataId,
  previousTimelineLevel,
  removeCollapsedDescendants,
} from '../../src/content/timelineModel';
import type { PlatformMessage } from '../../src/shared/types/platform';
import type { TimelineMetadataRecord } from '../../src/shared/types/records';

function message(role: PlatformMessage['role'], order: number): PlatformMessage {
  const element = document.createElement('article');
  element.textContent = `${role} ${order}`;
  return {
    platform: 'custom',
    conversationId: 'conversation',
    messageId: null,
    runtimeMessageId: `${role}:${order}`,
    role,
    plainText: element.textContent,
    html: null,
    timestamp: null,
    timestampSource: 'unknown',
    element,
    order,
  };
}

function metadata(
  messageKey: string,
  patch: Partial<TimelineMetadataRecord> = {},
): TimelineMetadataRecord {
  return {
    id: `timeline:${messageKey}`,
    platformId: 'custom',
    accountScopeId: 'anonymous',
    conversationId: 'conversation',
    messageKey,
    messageId: null,
    hierarchyLevel: 0,
    collapsed: false,
    note: null,
    observedAt: 1,
    updatedAt: 1,
    ...patch,
  };
}

describe('timeline model', () => {
  it('builds user turns as parents and hides collapsed assistant children', () => {
    const messages = [
      message('user', 0),
      message('assistant', 1),
      message('user', 2),
      message('assistant', 3),
    ];
    const nodes = buildTimelineNodes(messages, [
      metadata('user:0', { collapsed: true, hierarchyLevel: 0 }),
    ]);

    expect(nodes.map((node) => node.hierarchyLevel)).toEqual([0, 1, 0, 1]);
    expect(nodes[0]).toMatchObject({ hasChildren: true, hiddenChildCount: 1 });
    expect(removeCollapsedDescendants(nodes).map((node) => node.messageKey)).toEqual([
      'user:0',
      'user:2',
      'assistant:3',
    ]);
  });

  it('respects persisted hierarchy and exposes the previous node level', () => {
    const messages = [message('user', 0), message('assistant', 1), message('assistant', 2)];
    const nodes = buildTimelineNodes(messages, [
      metadata('assistant:1', { hierarchyLevel: 0 }),
      metadata('assistant:2', { hierarchyLevel: 1 }),
    ]);

    expect(nodes.map((node) => node.hierarchyLevel)).toEqual([0, 0, 1]);
    expect(previousTimelineLevel(nodes, 'assistant:2')).toBe(0);
  });

  it('creates a deterministic scoped metadata id', () => {
    expect(createTimelineMetadataId('gemini', 'user@example.com', 'chat/1', 'id:message 2')).toBe(
      'timeline:gemini:user%40example.com:chat%2F1:id%3Amessage%202',
    );
  });
});
