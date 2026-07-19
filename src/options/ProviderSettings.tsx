import { useEffect, useRef, useState } from 'react';
import browser from 'webextension-polyfill';

import { PROVIDER_PRESETS, type ApiProfileInput } from '../shared/ai/types';
import { useI18n } from '../shared/i18n/I18nContext';
import type { ApiProfileMetadataRecord, ApiProviderType } from '../shared/types/records';
import { sendRuntimeRequest } from './runtime';

const PROVIDERS: ApiProviderType[] = [
  'openai',
  'anthropic',
  'google',
  'deepseek',
  'xai',
  'moonshot',
  'openai-compatible',
  'ollama',
];

const QUICK_PROVIDER_TEMPLATES: ApiProviderType[] = [
  'openai',
  'anthropic',
  'google',
  'deepseek',
  'xai',
  'moonshot',
  'ollama',
];

function defaultInput(providerType: ApiProviderType = 'openai'): ApiProfileInput {
  const preset = providerType === 'openai-compatible' ? null : PROVIDER_PRESETS[providerType];
  return {
    providerType,
    name: providerType === 'openai-compatible' ? 'Custom API' : providerType,
    endpoint: preset?.endpoint ?? '',
    model: preset?.model ?? '',
    secretStorage: 'session',
  };
}

function originPattern(endpoint: string, credentialsError: string, insecureError: string): string {
  const url = new URL(endpoint.replace('{model}', 'model'));
  if (url.username || url.password) throw new Error(credentialsError);
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) {
    throw new Error(insecureError);
  }
  return `${url.origin}/*`;
}

export function ProviderSettings({ onProfilesChange }: { onProfilesChange?: () => void }) {
  const t = useI18n();
  const [profiles, setProfiles] = useState<
    Array<{ profile: ApiProfileMetadataRecord; unlocked: boolean }>
  >([]);
  const [input, setInput] = useState<ApiProfileInput>(defaultInput());
  const [unlockPasswords, setUnlockPasswords] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const editorRef = useRef<HTMLElement>(null);
  const isKeyless = input.providerType === 'ollama';

  const load = async () => {
    const response = await sendRuntimeRequest({ type: 'provider.list' });
    setProfiles(response.profiles ?? []);
    onProfilesChange?.();
  };

  useEffect(() => {
    let active = true;
    void sendRuntimeRequest({ type: 'provider.list' })
      .then((response) => {
        if (active) setProfiles(response.profiles ?? []);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : t('requestFailed'));
      });
    return () => {
      active = false;
    };
  }, [t]);

  const updateProvider = (providerType: ApiProviderType) => {
    const next = defaultInput(providerType);
    setInput({ ...next, id: input.id });
  };

  const save = async () => {
    setError('');
    setNotice('');
    try {
      const pattern = originPattern(
        input.endpoint,
        t('providerEndpointCredentialsForbidden'),
        t('providerEndpointHttpsRequired'),
      );
      const granted = await browser.permissions.request({ origins: [pattern] });
      if (!granted) {
        throw new Error(t('providerPermissionDenied'));
      }
      await sendRuntimeRequest({ type: 'provider.save', input });
      setInput(defaultInput());
      await load();
      setNotice(t('providerSaved'));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('requestFailed'));
    }
  };

  const edit = (profile: ApiProfileMetadataRecord) => {
    setInput({
      id: profile.id,
      providerType: profile.providerType,
      name: profile.name,
      endpoint: profile.endpoint,
      model: profile.model,
      secretStorage: profile.secretStorage,
    });
    setNotice(t('providerEditHint'));
    editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const unlock = async (profileId: string) => {
    try {
      await sendRuntimeRequest({
        type: 'provider.unlock',
        profileId,
        encryptionPassword: unlockPasswords[profileId] ?? '',
      });
      await load();
      setError('');
      setNotice(t('providerUnlocked'));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('requestFailed'));
    }
  };

  const remove = async (profileId: string) => {
    if (!confirm(t('providerDeleteConfirm'))) return;
    await sendRuntimeRequest({ type: 'provider.delete', profileId });
    await load();
  };

  return (
    <div className="settings-stack">
      {notice ? <div className="notice">{notice}</div> : null}
      {error ? <div className="notice notice-error">{error}</div> : null}
      <article className="setting-card action-card">
        <div>
          <h2>{t('providerQuickSetup')}</h2>
          <p className="setting-description">{t('providerQuickSetupDescription')}</p>
        </div>
        <div className="button-row">
          {QUICK_PROVIDER_TEMPLATES.map((provider) => (
            <button
              className="button button-secondary"
              type="button"
              key={provider}
              onClick={() => updateProvider(provider)}
            >
              {provider}
            </button>
          ))}
        </div>
      </article>
      <article className="setting-card workspace-card provider-editor" ref={editorRef}>
        <div>
          <h2>{input.id ? t('editProvider') : t('addProvider')}</h2>
          <p className="setting-description">{t('providerPrivacyDescription')}</p>
        </div>
        <div className="form-grid two-columns">
          <label>
            <span>{t('providerType')}</span>
            <select
              value={input.providerType}
              onChange={(event) => updateProvider(event.target.value as ApiProviderType)}
            >
              {PROVIDERS.map((provider) => (
                <option key={provider} value={provider}>
                  {provider}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t('profileName')}</span>
            <input
              value={input.name}
              onChange={(event) => setInput({ ...input, name: event.target.value })}
            />
          </label>
          <label className="wide-field">
            <span>{t('providerEndpoint')}</span>
            <input
              value={input.endpoint}
              onChange={(event) => setInput({ ...input, endpoint: event.target.value })}
            />
          </label>
          <label>
            <span>{t('providerModel')}</span>
            <input
              value={input.model}
              onChange={(event) => setInput({ ...input, model: event.target.value })}
            />
          </label>
          {!isKeyless ? (
            <label>
              <span>{input.id ? t('providerKeyOptional') : t('providerKey')}</span>
              <input
                type="password"
                autoComplete="off"
                value={input.apiKey ?? ''}
                onChange={(event) => setInput({ ...input, apiKey: event.target.value })}
              />
            </label>
          ) : null}
          {!isKeyless ? (
            <label>
              <span>{t('keyStorage')}</span>
              <select
                value={input.secretStorage}
                onChange={(event) =>
                  setInput({
                    ...input,
                    secretStorage: event.target.value as ApiProfileInput['secretStorage'],
                  })
                }
              >
                <option value="session">{t('sessionOnly')}</option>
                <option value="encrypted-local">{t('encryptedLocal')}</option>
              </select>
            </label>
          ) : null}
          {!isKeyless && input.secretStorage === 'encrypted-local' && input.apiKey ? (
            <label>
              <span>{t('encryptionPassword')}</span>
              <input
                type="password"
                minLength={12}
                autoComplete="new-password"
                value={input.encryptionPassword ?? ''}
                onChange={(event) => setInput({ ...input, encryptionPassword: event.target.value })}
              />
            </label>
          ) : null}
        </div>
        <div className="button-row">
          <button className="button button-primary" type="button" onClick={() => void save()}>
            {t('saveProvider')}
          </button>
          {input.id ? (
            <button
              className="button button-secondary"
              type="button"
              onClick={() => setInput(defaultInput())}
            >
              {t('cancel')}
            </button>
          ) : null}
        </div>
      </article>
      <div className="card-grid">
        {profiles.map(({ profile, unlocked }) => (
          <article className="setting-card compact-card" key={profile.id}>
            <div className="profile-heading">
              <div>
                <h2>{profile.name}</h2>
                <p className="muted">
                  {profile.providerType} · {profile.model}
                </p>
              </div>
              <span className={`status-pill ${unlocked ? 'status-good' : ''}`}>
                {unlocked ? t('providerReady') : t('providerLocked')}
              </span>
            </div>
            <p className="endpoint-text">{profile.endpoint}</p>
            {!unlocked && profile.secretStorage === 'encrypted-local' ? (
              <div className="inline-form">
                <input
                  type="password"
                  placeholder={t('encryptionPassword')}
                  value={unlockPasswords[profile.id] ?? ''}
                  onChange={(event) =>
                    setUnlockPasswords({
                      ...unlockPasswords,
                      [profile.id]: event.target.value,
                    })
                  }
                />
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => void unlock(profile.id)}
                >
                  {t('unlock')}
                </button>
              </div>
            ) : null}
            <div className="button-row">
              <button className="text-button" type="button" onClick={() => edit(profile)}>
                {t('edit')}
              </button>
              <button
                className="text-button danger-text"
                type="button"
                onClick={() => void remove(profile.id)}
              >
                {t('delete')}
              </button>
            </div>
          </article>
        ))}
      </div>
      {profiles.length === 0 ? <div className="empty-state">{t('noProviders')}</div> : null}
    </div>
  );
}
