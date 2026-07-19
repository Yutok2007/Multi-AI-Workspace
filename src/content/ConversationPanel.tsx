import { useEffect, useState } from 'react';

import type { UserBoundPlatformAdapter } from '../platforms/base/UserBoundPlatformAdapter';
import { useI18n } from '../shared/i18n/I18nContext';
import type { PlatformMessage } from '../shared/types/platform';
import type { ConversationExportFormat } from '../shared/types/settings';
import { ChatSummaryPanel } from './ChatSummaryPanel';
import { exportConversation } from './conversationExport';
import { ConversationTimeline } from './ConversationTimeline';

interface ConversationPanelProps {
  adapter: UserBoundPlatformAdapter;
  enableTimeline: boolean;
  enableExport: boolean;
  exportFormat: ConversationExportFormat;
}

export function ConversationPanel({
  adapter,
  enableTimeline,
  enableExport,
  exportFormat,
}: ConversationPanelProps) {
  const t = useI18n();
  const [messages, setMessages] = useState<PlatformMessage[]>([]);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const canReadMessages = adapter.getCapabilities().has('messages.read');

  useEffect(() => {
    let active = true;
    if (canReadMessages) {
      void adapter.getMessages().then((nextMessages) => {
        if (active) setMessages(nextMessages);
      });
    }
    const unsubscribe = canReadMessages
      ? adapter.observeMessages((nextMessages) => {
          if (active) setMessages(nextMessages);
        })
      : () => undefined;
    return () => {
      active = false;
      unsubscribe();
    };
  }, [adapter, canReadMessages]);

  const exportNow = async () => {
    try {
      await exportConversation(adapter, exportFormat);
      setNotice(t('conversationExported'));
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('requestFailed'));
    }
  };

  return (
    <div className="maw-feature-stack">
      {notice ? <div className="maw-notice">{notice}</div> : null}
      {error ? <div className="maw-error">{error}</div> : null}
      {!canReadMessages ? (
        <div className="maw-empty">{t('bindMessagesForTimelineExport')}</div>
      ) : null}
      {canReadMessages ? <ChatSummaryPanel adapter={adapter} messages={messages} /> : null}
      {canReadMessages && enableTimeline ? (
        <ConversationTimeline adapter={adapter} messages={messages} exportFormat={exportFormat} />
      ) : null}
      {canReadMessages && enableExport ? (
        <section className="maw-tool-section">
          <strong>{t('exportConversation')}</strong>
          <div className="maw-actions">
            <button type="button" onClick={() => void exportNow()}>
              {t('exportNow')}
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
