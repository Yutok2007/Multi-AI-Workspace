import { useEffect, useState } from 'react';

import { useI18n } from '../shared/i18n/I18nContext';
import type { CustomSiteBindingRecord } from '../shared/types/records';
import { createBindingId } from '../shared/utils/bindingKey';
import type { UserBoundPlatformAdapter } from '../platforms/base/UserBoundPlatformAdapter';
import { isEditableElement, pickElement } from './elementPicker';
import { sendContentRequest } from './runtime';

type BindingField =
  | 'composerSelector'
  | 'sendButtonSelector'
  | 'messageContainerSelector'
  | 'userMessageSelector'
  | 'assistantMessageSelector'
  | 'modelControlSelector'
  | 'generationIndicatorSelector';

const currentTimestamp = () => Date.now();

export function BindingControls({
  adapter,
  onChange,
  externalStatus,
}: {
  adapter: UserBoundPlatformAdapter;
  onChange?: () => void;
  externalStatus?: { kind: 'notice' | 'error'; message: string } | null;
}) {
  const t = useI18n();
  const [binding, setBinding] = useState<CustomSiteBindingRecord | null>(adapter.getBinding());
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState<BindingField | ''>('');
  const [automaticBusy, setAutomaticBusy] = useState(false);

  useEffect(() => adapter.subscribeBindingChanges(setBinding), [adapter]);

  const baseBinding = (): CustomSiteBindingRecord => {
    const now = currentTimestamp();
    return (
      binding ?? {
        id: createBindingId(adapter.id, location.origin),
        origin: location.origin,
        platformId: adapter.id,
        accountScopeId: 'anonymous',
        composerSelector: '',
        sendButtonSelector: null,
        messageContainerSelector: null,
        userMessageSelector: null,
        assistantMessageSelector: null,
        modelControlSelector: null,
        generationIndicatorSelector: null,
        enabled: true,
        lastValidatedAt: null,
        createdAt: now,
        updatedAt: now,
      }
    );
  };

  const save = async (field: BindingField, selector: string) => {
    const current = baseBinding();
    if (
      (field === 'userMessageSelector' && selector === current.assistantMessageSelector) ||
      (field === 'assistantMessageSelector' && selector === current.userMessageSelector)
    ) {
      throw new Error(t('messageSelectorsMustDiffer'));
    }
    const now = currentTimestamp();
    const next: CustomSiteBindingRecord = {
      ...current,
      [field]: selector,
      enabled: true,
      bindingSource:
        current.bindingSource === 'automatic' || current.bindingSource === 'mixed'
          ? 'mixed'
          : 'manual',
      lastValidatedAt: now,
      updatedAt: now,
    };
    await sendContentRequest({ type: 'binding.save', binding: next });
    adapter.setBinding(next);
    setBinding(next);
    setNotice('');
    onChange?.();
  };

  const detectAutomatically = async () => {
    setAutomaticBusy(true);
    setError('');
    setNotice('');
    try {
      const detected = await adapter.ensureAutomaticBinding();
      setBinding(detected);
      if (detected?.composerSelector) {
        setNotice(t('autoBindingFound'));
        onChange?.();
      } else {
        setError(t('autoBindingNotFound'));
      }
    } catch {
      setError(t('autoBindingNotFound'));
    } finally {
      setAutomaticBusy(false);
    }
  };

  const pick = async (
    field: BindingField,
    instruction: string,
    options: { collection?: boolean; validate?: (element: HTMLElement) => boolean } = {},
  ) => {
    setBusy(field);
    setError('');
    try {
      const { selector } = await pickElement(instruction, options);
      await save(field, selector);
    } catch (reason) {
      if (reason instanceof Error && !reason.message.toLowerCase().includes('cancel')) {
        setError(reason.message);
      }
    } finally {
      setBusy('');
    }
  };

  const reset = async () => {
    const current = baseBinding();
    await sendContentRequest({ type: 'binding.delete', id: current.id });
    adapter.setBinding(null);
    setBinding(null);
    onChange?.();
  };

  const bindings: Array<{
    field: BindingField;
    label: string;
    instruction: string;
    collection?: boolean;
    validate?: (element: HTMLElement) => boolean;
  }> = [
    {
      field: 'composerSelector',
      label: t('bindComposer'),
      instruction: t('pickComposer'),
      validate: isEditableElement,
    },
    {
      field: 'sendButtonSelector',
      label: t('bindSendButton'),
      instruction: t('pickSendButton'),
    },
    {
      field: 'userMessageSelector',
      label: t('bindUserMessage'),
      instruction: t('pickUserMessage'),
      collection: true,
    },
    {
      field: 'assistantMessageSelector',
      label: t('bindAssistantMessage'),
      instruction: t('pickAssistantMessage'),
      collection: true,
    },
    {
      field: 'messageContainerSelector',
      label: t('bindMessageContainer'),
      instruction: t('pickMessageContainer'),
    },
    {
      field: 'modelControlSelector',
      label: t('bindModelControl'),
      instruction: t('pickModelControl'),
    },
    {
      field: 'generationIndicatorSelector',
      label: t('bindGenerationIndicator'),
      instruction: t('pickGenerationIndicator'),
    },
  ];

  return (
    <section className="maw-binding">
      <div className="maw-section-heading">
        <div>
          <strong>{t('optionalPageConnection')}</strong>
          <span>{t('bindingOptionalDescription')}</span>
        </div>
        <div className="maw-binding-actions">
          <button
            className="maw-text"
            type="button"
            disabled={automaticBusy}
            onClick={() => void detectAutomatically()}
          >
            {automaticBusy ? t('autoDetectingBinding') : t('autoDetectBinding')}
          </button>
          {binding ? (
            <button className="maw-text danger" type="button" onClick={() => void reset()}>
              {t('resetBinding')}
            </button>
          ) : null}
        </div>
      </div>
      {notice ? <div className="maw-notice">{notice}</div> : null}
      {error ? <div className="maw-error">{error}</div> : null}
      {externalStatus ? (
        <div className={externalStatus.kind === 'error' ? 'maw-error' : 'maw-notice'}>
          {externalStatus.message}
        </div>
      ) : null}
      {binding?.composerSelector &&
      (!binding.userMessageSelector || !binding.assistantMessageSelector) ? (
        <div className="maw-notice">{t('partialMessageBinding')}</div>
      ) : null}
      <div className="maw-binding-grid">
        {bindings.map((item) => {
          const value = binding?.[item.field];
          return (
            <button
              className={value ? 'bound' : ''}
              key={item.field}
              type="button"
              disabled={Boolean(busy)}
              title={typeof value === 'string' ? value : undefined}
              onClick={() =>
                void pick(item.field, item.instruction, {
                  collection: item.collection,
                  validate: item.validate,
                })
              }
            >
              <span>{value ? '✓' : '+'}</span>
              {busy === item.field ? t('selectingElement') : item.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
