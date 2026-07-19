import { type CSSProperties, useEffect, useMemo, useState } from 'react';

import type { UserBoundPlatformAdapter } from '../platforms/base/UserBoundPlatformAdapter';
import { useI18n } from '../shared/i18n/I18nContext';
import type { PlatformMessage } from '../shared/types/platform';
import type { TimelineMetadataRecord } from '../shared/types/records';
import type { ConversationExportFormat } from '../shared/types/settings';
import { listRecords, putRecord } from './database';
import { exportConversationMessages } from './conversationExport';
import { getMessageKey } from './textHighlights';
import {
  buildTimelineNodes,
  createTimelineMetadataId,
  MAX_TIMELINE_HIERARCHY_LEVEL,
  previousTimelineLevel,
  removeCollapsedDescendants,
  type TimelineNode,
} from './timelineModel';

type TimelineFilter = 'all' | 'prompts' | 'noted';

interface TimelineScope {
  accountScopeId: string;
  conversationId: string;
}

const currentTimestamp = () => Date.now();

export function ConversationTimeline({
  adapter,
  messages,
  exportFormat,
}: {
  adapter: UserBoundPlatformAdapter;
  messages: PlatformMessage[];
  exportFormat: ConversationExportFormat;
}) {
  const t = useI18n();
  const [scope, setScope] = useState<TimelineScope | null>(null);
  const [metadata, setMetadata] = useState<TimelineMetadataRecord[]>([]);
  const [filter, setFilter] = useState<TimelineFilter>('all');
  const [query, setQuery] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void Promise.all([
      adapter.getCurrentConversation(),
      adapter.getCurrentAccountScope(),
      listRecords('timelineMetadata'),
    ])
      .then(([conversation, accountScopeId, allMetadata]) => {
        if (!active) return;
        const conversationId = conversation.conversationId ?? conversation.url;
        setScope({
          accountScopeId,
          conversationId,
        });
        setMetadata(
          allMetadata.filter(
            (record) =>
              record.platformId === adapter.id &&
              record.accountScopeId === accountScopeId &&
              record.conversationId === conversationId,
          ),
        );
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : t('requestFailed'));
      });
    return () => {
      active = false;
    };
  }, [adapter, t]);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      let nearestKey: string | null = null;
      let nearestDistance = Number.POSITIVE_INFINITY;
      for (const message of messages) {
        if (!message.element.isConnected) continue;
        const rect = message.element.getBoundingClientRect();
        const distance = Math.abs(rect.top + rect.height / 2 - window.innerHeight / 2);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestKey = getMessageKey(message);
        }
      }
      setActiveKey(nearestKey);
    };
    const schedule = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    schedule();
    window.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
    };
  }, [messages]);

  const allNodes = useMemo(() => buildTimelineNodes(messages, metadata), [messages, metadata]);
  const validSelectedKeys = useMemo(() => {
    const validKeys = new Set(messages.map(getMessageKey));
    return selectedKeys.filter((key) => validKeys.has(key));
  }, [messages, selectedKeys]);

  const visibleNodes = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const focused = allNodes.filter((node) => {
      if (filter === 'prompts' && node.message.role !== 'user') return false;
      if (filter === 'noted' && !node.metadata?.note?.trim()) return false;
      if (!normalizedQuery) return true;
      return [node.message.plainText, node.metadata?.note ?? '', node.message.role]
        .join('\n')
        .toLocaleLowerCase()
        .includes(normalizedQuery);
    });
    return filter === 'all' && !normalizedQuery ? removeCollapsedDescendants(focused) : focused;
  }, [allNodes, filter, query]);

  const upsertMetadata = async (
    node: TimelineNode,
    patch: Partial<Pick<TimelineMetadataRecord, 'hierarchyLevel' | 'collapsed' | 'note'>>,
  ): Promise<TimelineMetadataRecord | null> => {
    if (!scope) return null;
    const now = currentTimestamp();
    const current = node.metadata;
    const next: TimelineMetadataRecord = {
      id:
        current?.id ??
        createTimelineMetadataId(
          adapter.id,
          scope.accountScopeId,
          scope.conversationId,
          node.messageKey,
        ),
      platformId: adapter.id,
      accountScopeId: scope.accountScopeId,
      conversationId: scope.conversationId,
      messageKey: node.messageKey,
      messageId: node.message.messageId,
      hierarchyLevel: current?.hierarchyLevel ?? node.hierarchyLevel,
      collapsed: current?.collapsed ?? false,
      note: current?.note ?? null,
      observedAt: current?.observedAt ?? now,
      updatedAt: now,
      ...patch,
    };
    await putRecord('timelineMetadata', next);
    setMetadata((records) => [...records.filter((record) => record.id !== next.id), next]);
    return next;
  };

  const changeHierarchy = async (node: TimelineNode, direction: -1 | 1) => {
    const previousLevel = previousTimelineLevel(allNodes, node.messageKey);
    const maximum = Math.min(MAX_TIMELINE_HIERARCHY_LEVEL, previousLevel + 1);
    const hierarchyLevel = Math.min(maximum, Math.max(0, node.hierarchyLevel + direction));
    if (hierarchyLevel === node.hierarchyLevel) return;
    try {
      setError('');
      await upsertMetadata(node, { hierarchyLevel, collapsed: false });
      setStatus(t('timelineMetadataSaved'));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('requestFailed'));
    }
  };

  const toggleCollapsed = async (node: TimelineNode) => {
    try {
      setError('');
      await upsertMetadata(node, { collapsed: !node.collapsed });
      setStatus(t('timelineMetadataSaved'));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('requestFailed'));
    }
  };

  const saveNote = async (node: TimelineNode) => {
    try {
      setError('');
      await upsertMetadata(node, { note: noteDraft.trim().slice(0, 2_000) || null });
      setEditingKey(null);
      setNoteDraft('');
      setStatus(t('timelineMetadataSaved'));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('requestFailed'));
    }
  };

  const toggleSelected = (messageKey: string) => {
    setSelectedKeys((current) =>
      current.includes(messageKey)
        ? current.filter((key) => key !== messageKey)
        : [...current, messageKey],
    );
  };

  const exportSelected = async () => {
    const selected = new Set(validSelectedKeys);
    const selectedMessages = messages.filter((message) => selected.has(getMessageKey(message)));
    if (!selectedMessages.length) return;
    try {
      await exportConversationMessages(
        adapter,
        exportFormat,
        selectedMessages,
        'timeline-selection',
      );
      setStatus(t('conversationExported'));
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('requestFailed'));
    }
  };

  return (
    <section className="maw-tool-section maw-timeline-section">
      <div className="maw-section-heading">
        <strong>{t('timeline')}</strong>
        <span>{t('messageCount', { count: messages.length })}</span>
      </div>
      <div className="maw-timeline-filters">
        <input
          type="search"
          placeholder={t('timelineSearch')}
          aria-label={t('timelineSearch')}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select
          aria-label={t('timelineFilter')}
          value={filter}
          onChange={(event) => setFilter(event.target.value as TimelineFilter)}
        >
          <option value="all">{t('timelineAll')}</option>
          <option value="prompts">{t('timelinePrompts')}</option>
          <option value="noted">{t('timelineNoted')}</option>
        </select>
      </div>
      <div className="maw-timeline-selection-bar">
        <span>{t('timelineSelectedCount', { count: validSelectedKeys.length })}</span>
        <button
          type="button"
          onClick={() => setSelectedKeys(visibleNodes.map((node) => node.messageKey))}
        >
          {t('timelineSelectVisible')}
        </button>
        <button
          type="button"
          disabled={!validSelectedKeys.length}
          onClick={() => setSelectedKeys([])}
        >
          {t('timelineClearSelection')}
        </button>
      </div>
      {validSelectedKeys.length ? (
        <div className="maw-timeline-export-actions">
          <span>{t('timelineExportSelection')}</span>
          <button type="button" onClick={() => void exportSelected()}>
            {t('exportNow')}
          </button>
        </div>
      ) : null}
      {status ? <div className="maw-notice">{status}</div> : null}
      {error ? <div className="maw-error">{error}</div> : null}
      <div className="maw-timeline">
        {visibleNodes.map((node) => {
          const selected = validSelectedKeys.includes(node.messageKey);
          const editing = editingKey === node.messageKey;
          const active = activeKey === node.messageKey;
          const previousLevel = previousTimelineLevel(allNodes, node.messageKey);
          const canIndent =
            node.hierarchyLevel < Math.min(MAX_TIMELINE_HIERARCHY_LEVEL, previousLevel + 1);
          return (
            <article
              className={active ? 'active' : undefined}
              key={node.messageKey}
              style={{ '--maw-timeline-level': node.hierarchyLevel } as CSSProperties}
            >
              <div className="maw-timeline-node-row">
                <input
                  className="maw-timeline-select"
                  type="checkbox"
                  aria-label={t('timelineSelect', { number: node.message.order + 1 })}
                  checked={selected}
                  onChange={() => toggleSelected(node.messageKey)}
                />
                <button
                  className="maw-timeline-main"
                  type="button"
                  aria-current={active ? 'location' : undefined}
                  onClick={() => void adapter.scrollToMessage(node.message, 'smooth')}
                >
                  <span>{node.message.order + 1}</span>
                  <div>
                    <strong>{node.message.role}</strong>
                    <p>{node.message.plainText.slice(0, 180)}</p>
                    {node.metadata?.note ? <small>{node.metadata.note}</small> : null}
                  </div>
                </button>
                <div className="maw-timeline-node-actions">
                  {node.hasChildren ? (
                    <button
                      type="button"
                      title={node.collapsed ? t('timelineExpand') : t('timelineCollapse')}
                      aria-label={node.collapsed ? t('timelineExpand') : t('timelineCollapse')}
                      onClick={() => void toggleCollapsed(node)}
                    >
                      {node.collapsed ? `▸${node.hiddenChildCount}` : '▾'}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    title={t('timelineOutdent')}
                    aria-label={t('timelineOutdent')}
                    disabled={node.hierarchyLevel === 0}
                    onClick={() => void changeHierarchy(node, -1)}
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    title={t('timelineIndent')}
                    aria-label={t('timelineIndent')}
                    disabled={!canIndent}
                    onClick={() => void changeHierarchy(node, 1)}
                  >
                    →
                  </button>
                  <button
                    type="button"
                    className={node.metadata?.note ? 'noted' : ''}
                    title={t('timelineEditNote')}
                    aria-label={t('timelineEditNote')}
                    onClick={() => {
                      setEditingKey(editing ? null : node.messageKey);
                      setNoteDraft(editing ? '' : (node.metadata?.note ?? ''));
                    }}
                  >
                    ✎
                  </button>
                </div>
              </div>
              {editing ? (
                <div className="maw-timeline-note-editor">
                  <textarea
                    maxLength={2_000}
                    rows={3}
                    aria-label={t('timelineNote')}
                    placeholder={t('timelineNote')}
                    value={noteDraft}
                    onChange={(event) => setNoteDraft(event.target.value)}
                  />
                  <div>
                    <button type="button" onClick={() => void saveNote(node)}>
                      {t('save')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingKey(null);
                        setNoteDraft('');
                      }}
                    >
                      {t('dismiss')}
                    </button>
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
        {!visibleNodes.length ? <div className="maw-empty">{t('timelineNoMatches')}</div> : null}
      </div>
    </section>
  );
}
