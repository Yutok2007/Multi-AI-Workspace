import { useEffect, useMemo, useRef, useState } from 'react';

import type { UserBoundPlatformAdapter } from '../platforms/base/UserBoundPlatformAdapter';
import type { ChatSummaryLanguage, ChatSummaryResult } from '../shared/ai/types';
import { useI18n } from '../shared/i18n/I18nContext';
import type { ApiProfileMetadataRecord } from '../shared/types/records';
import type { PlatformMessage } from '../shared/types/platform';
import { sendContentRequest } from './runtime';

const SUMMARY_LANGUAGES: ChatSummaryLanguage[] = ['preserve', 'en', 'zh-CN', 'zh-TW'];

function summaryLanguageLabel(
  language: ChatSummaryLanguage,
):
  | 'summaryLanguageConversation'
  | 'localeEnglish'
  | 'localeSimplifiedChinese'
  | 'localeTraditionalChinese' {
  if (language === 'en') return 'localeEnglish';
  if (language === 'zh-CN') return 'localeSimplifiedChinese';
  if (language === 'zh-TW') return 'localeTraditionalChinese';
  return 'summaryLanguageConversation';
}

export function visibleSummaryMessages(messages: PlatformMessage[]) {
  return messages
    .filter(
      (message): message is PlatformMessage & { role: 'user' | 'assistant' } =>
        (message.role === 'user' || message.role === 'assistant') &&
        Boolean(message.plainText.trim()),
    )
    .map((message) => ({ role: message.role, content: message.plainText.trim() }));
}

export function ChatSummaryPanel({
  adapter,
  messages,
}: {
  adapter: UserBoundPlatformAdapter;
  messages: PlatformMessage[];
}) {
  const t = useI18n();
  const [profiles, setProfiles] = useState<ApiProfileMetadataRecord[]>([]);
  const [profileId, setProfileId] = useState('');
  const [outputLanguage, setOutputLanguage] = useState<ChatSummaryLanguage>('preserve');
  const [summary, setSummary] = useState<ChatSummaryResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const requestInFlight = useRef(false);
  const summaryMessages = useMemo(() => visibleSummaryMessages(messages), [messages]);
  const characterCount = useMemo(
    () => summaryMessages.reduce((total, message) => total + message.content.length, 0),
    [summaryMessages],
  );

  useEffect(() => {
    let active = true;
    void sendContentRequest({ type: 'provider.list' })
      .then((response) => {
        if (!active) return;
        const next = (response.profiles ?? []).map(({ profile }) => profile);
        setProfiles(next);
        setProfileId((current) =>
          next.some((profile) => profile.id === current) ? current : (next[0]?.id ?? ''),
        );
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : t('requestFailed'));
      });
    return () => {
      active = false;
    };
  }, [t]);

  const openProviderSettings = async () => {
    try {
      await sendContentRequest({ type: 'options.open', section: 'ai-provider' });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('requestFailed'));
    }
  };

  const summarize = async () => {
    if (requestInFlight.current) return;
    if (!profileId) {
      setError(t('selectProviderFirst'));
      return;
    }
    if (!summaryMessages.length) {
      setError(t('summaryEmptyConversation'));
      return;
    }
    if (
      !confirm(
        t('summarySendConfirm', {
          count: summaryMessages.length,
          characters: characterCount,
        }),
      )
    ) {
      return;
    }

    requestInFlight.current = true;
    setBusy(true);
    setNotice('');
    setError('');
    try {
      const conversation = await adapter.getCurrentConversation();
      const response = await sendContentRequest({
        type: 'chat.summarize',
        profileId,
        request: {
          conversationTitle: conversation?.title ?? undefined,
          messages: summaryMessages,
          outputLanguage,
        },
      });
      if (!response.summary) throw new Error(t('requestFailed'));
      setSummary(response.summary);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('requestFailed'));
    } finally {
      requestInFlight.current = false;
      setBusy(false);
    }
  };

  const copySummary = async () => {
    if (!summary) return;
    const sections = [
      `${t('summaryResult')}\n${summary.summary}`,
      summary.keyPoints.length
        ? `${t('summaryKeyPoints')}\n${summary.keyPoints.map((item) => `- ${item}`).join('\n')}`
        : '',
      summary.decisions.length
        ? `${t('summaryDecisions')}\n${summary.decisions.map((item) => `- ${item}`).join('\n')}`
        : '',
      summary.actionItems.length
        ? `${t('summaryActionItems')}\n${summary.actionItems.map((item) => `- ${item}`).join('\n')}`
        : '',
      summary.unansweredQuestions.length
        ? `${t('summaryUnansweredQuestions')}\n${summary.unansweredQuestions.map((item) => `- ${item}`).join('\n')}`
        : '',
    ].filter(Boolean);
    try {
      await navigator.clipboard.writeText(sections.join('\n\n'));
      setNotice(t('copiedToClipboard'));
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('requestFailed'));
    }
  };

  return (
    <section className="maw-tool-section maw-summary-section">
      <strong>{t('summarizeChat')}</strong>
      <p className="maw-tool-hint">{t('summarizeChatDescription')}</p>
      {notice ? <div className="maw-notice">{notice}</div> : null}
      {error ? <div className="maw-error">{error}</div> : null}
      {profiles.length ? (
        <div className="maw-summary-controls">
          <label className="maw-field">
            <span>{t('providerProfile')}</span>
            <select value={profileId} onChange={(event) => setProfileId(event.target.value)}>
              <option value="">{t('chooseProvider')}</option>
              {profiles.map((profile) => (
                <option value={profile.id} key={profile.id}>
                  {profile.name} · {profile.model}
                </option>
              ))}
            </select>
          </label>
          <label className="maw-field">
            <span>{t('summaryOutputLanguage')}</span>
            <select
              value={outputLanguage}
              onChange={(event) => setOutputLanguage(event.target.value as ChatSummaryLanguage)}
            >
              {SUMMARY_LANGUAGES.map((language) => (
                <option value={language} key={language}>
                  {t(summaryLanguageLabel(language))}
                </option>
              ))}
            </select>
          </label>
          {!summaryMessages.length ? (
            <div className="maw-empty">{t('summaryEmptyConversation')}</div>
          ) : null}
          <button
            className="maw-button primary"
            type="button"
            disabled={busy || !profileId || !summaryMessages.length}
            onClick={() => void summarize()}
          >
            {busy ? t('summarizingChat') : t('summarizeNow')}
          </button>
        </div>
      ) : (
        <div className="maw-provider-empty">
          <strong>{t('noProviderConfiguredTitle')}</strong>
          <p>{t('summaryProviderRequired')}</p>
          <button type="button" onClick={() => void openProviderSettings()}>
            {t('configureProvider')}
          </button>
        </div>
      )}
      {summary ? (
        <article className="maw-summary-result" aria-live="polite">
          <h3>{t('summaryResult')}</h3>
          <p>{summary.summary}</p>
          {summary.keyPoints.length ? (
            <section>
              <h4>{t('summaryKeyPoints')}</h4>
              <ul>
                {summary.keyPoints.map((item, index) => (
                  <li key={`${index}-${item}`}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}
          {summary.decisions.length ? (
            <section>
              <h4>{t('summaryDecisions')}</h4>
              <ul>
                {summary.decisions.map((item, index) => (
                  <li key={`${index}-${item}`}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}
          {summary.actionItems.length ? (
            <section>
              <h4>{t('summaryActionItems')}</h4>
              <ul>
                {summary.actionItems.map((item, index) => (
                  <li key={`${index}-${item}`}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}
          {summary.unansweredQuestions.length ? (
            <section>
              <h4>{t('summaryUnansweredQuestions')}</h4>
              <ul>
                {summary.unansweredQuestions.map((item, index) => (
                  <li key={`${index}-${item}`}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}
          <div className="maw-actions">
            <button type="button" onClick={() => void copySummary()}>
              {t('copy')}
            </button>
          </div>
        </article>
      ) : null}
    </section>
  );
}
