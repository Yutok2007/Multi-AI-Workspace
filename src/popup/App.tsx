import { useEffect, useState } from 'react';
import browser from 'webextension-polyfill';

import { I18nProvider, useI18n } from '../shared/i18n/I18nContext';
import type { MessageKey } from '../shared/i18n/messages';
import { DEFAULT_SETTINGS, SettingsRepository } from '../shared/storage/localStorage';
import type { AppSettings } from '../shared/types/settings';
import { BrandIcon } from '../ui/components/BrandIcon';
import { LanguageToggle } from '../ui/components/LanguageToggle';
import {
  CATEGORY_LABELS,
  SETTING_DEFINITIONS,
  type SettingCategory,
  type SettingDefinition,
  type SettingValue,
} from '../options/settingDefinitions';

const settingsRepository = new SettingsRepository();

type VisualEffectMode = AppSettings['ui']['visualEffect'];

const QUICK_EFFECTS: Array<{
  value: VisualEffectMode;
  label: MessageKey;
  icon: string;
}> = [
  { value: 'off', label: 'visualEffectOff', icon: '⊘' },
  { value: 'snow', label: 'visualEffectSnow', icon: '❄' },
  { value: 'sakura', label: 'visualEffectSakura', icon: '✿' },
  { value: 'rain', label: 'visualEffectRain', icon: '╱╱' },
  { value: 'mushroom', label: 'visualEffectMushroom', icon: '🍄' },
  { value: 'dandelion', label: 'visualEffectDandelion', icon: '✺' },
];

function openOptions(section?: string): Promise<unknown> {
  const suffix = section ? `#${section}` : '';
  return browser.tabs.create({ url: browser.runtime.getURL(`options.html${suffix}`) });
}

function PrivacyOnboarding({ onChange }: { onChange: (settings: AppSettings) => void }) {
  const t = useI18n();
  const [permissionMessage, setPermissionMessage] = useState('');

  const continueOnboarding = async () => {
    onChange(await settingsRepository.update({ privacy: { onboardingComplete: true } }));
  };

  const reviewPermissions = async () => {
    const granted = await browser.permissions.getAll();
    const count = (granted.permissions?.length ?? 0) + (granted.origins?.length ?? 0);
    setPermissionMessage(t('permissionSummary', { count }));
  };

  return (
    <section className="surface-card">
      <p className="eyebrow">{t('productName')}</p>
      <h2>{t('privacyTitle')}</h2>
      <p className="muted">{t('privacyIntro')}</p>
      <ul className="privacy-list">
        <li>{t('privacyVisibleContent')}</li>
        <li>{t('privacyProvider')}</li>
        <li>{t('privacyContext')}</li>
        <li>{t('privacyLocalKeys')}</li>
        <li>{t('privacyNoCredentials')}</li>
      </ul>
      <div className="button-row">
        <button className="button button-primary" type="button" onClick={continueOnboarding}>
          {t('continue')}
        </button>
        <button className="button button-secondary" type="button" onClick={reviewPermissions}>
          {t('reviewPermissions')}
        </button>
        <button
          className="button button-secondary"
          type="button"
          onClick={() => void openOptions('privacy')}
        >
          {t('privacySettings')}
        </button>
      </div>
      {permissionMessage ? (
        <p className="popup-note" role="status">
          {permissionMessage}
        </p>
      ) : null}
    </section>
  );
}

const POPUP_SETTING_CATEGORIES: SettingCategory[] = [
  'layout',
  'font',
  'input',
  'timeline',
  'export',
  'prompt-manager',
  'prompt-rewrite',
  'privacy',
];

function PopupSettingRow({
  definition,
  settings,
  disabled,
  onUpdate,
}: {
  definition: SettingDefinition;
  settings: AppSettings;
  disabled: boolean;
  onUpdate: (value: SettingValue) => void;
}) {
  const t = useI18n();
  const value = definition.read(settings);
  return (
    <div className="popup-setting-row">
      <div className="popup-setting-copy">
        <h3>{t(definition.label)}</h3>
      </div>
      <div className="popup-setting-control">
        {definition.control === 'toggle' ? (
          <button
            className="switch"
            type="button"
            role="switch"
            aria-label={t(definition.label)}
            aria-checked={Boolean(value)}
            disabled={disabled}
            onClick={() => onUpdate(!value)}
          />
        ) : (
          <select
            aria-label={t(definition.label)}
            value={String(value)}
            disabled={disabled}
            onChange={(event) => onUpdate(event.target.value)}
          >
            {definition.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.label)}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}

function QuickVisualEffects({
  value,
  disabled,
  onChange,
}: {
  value: VisualEffectMode;
  disabled: boolean;
  onChange: (effect: VisualEffectMode) => void;
}) {
  const t = useI18n();
  return (
    <section className="popup-effects-card" aria-labelledby="popup-effects-title">
      <div className="popup-effects-heading">
        <div>
          <p className="eyebrow">{t('popupQuickControl')}</p>
          <h2 id="popup-effects-title">{t('popupBackgroundEffects')}</h2>
        </div>
        <span className="popup-effects-live">{t('popupAppliesImmediately')}</span>
      </div>
      <p className="popup-effects-description">{t('popupBackgroundEffectsDescription')}</p>
      <div
        className="popup-effects-options"
        role="radiogroup"
        aria-label={t('popupBackgroundEffects')}
      >
        {QUICK_EFFECTS.map((effect) => (
          <button
            key={effect.value}
            className="popup-effect-option"
            type="button"
            role="radio"
            aria-checked={value === effect.value}
            data-effect={effect.value}
            disabled={disabled}
            onClick={() => onChange(effect.value)}
          >
            <span className="popup-effect-icon" aria-hidden="true">
              {effect.icon}
            </span>
            <span>{t(effect.label)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function PopupSettings({
  settings,
  onChange,
}: {
  settings: AppSettings;
  onChange: (settings: AppSettings) => void;
}) {
  const t = useI18n();
  const [busyId, setBusyId] = useState('');
  const [effectBusy, setEffectBusy] = useState(false);
  const [error, setError] = useState('');

  const update = async (definition: SettingDefinition, value: SettingValue) => {
    setBusyId(definition.id);
    try {
      onChange(await settingsRepository.set(definition.write(settings, value)));
      setError('');
    } catch {
      setError(t('saveError'));
    } finally {
      setBusyId('');
    }
  };

  const updateVisualEffect = async (effect: VisualEffectMode) => {
    if (effect === settings.ui.visualEffect) return;
    setEffectBusy(true);
    try {
      onChange(await settingsRepository.update({ ui: { visualEffect: effect } }));
      setError('');
    } catch {
      setError(t('saveError'));
    } finally {
      setEffectBusy(false);
    }
  };

  return (
    <div className="popup-settings">
      <QuickVisualEffects
        value={settings.ui.visualEffect}
        disabled={effectBusy}
        onChange={(effect) => void updateVisualEffect(effect)}
      />
      <header className="popup-settings-header">
        <p className="eyebrow">{t('optionsTitle')}</p>
        <h2>{t('optionsTitle')}</h2>
        <p className="muted">{t('optionsSubtitle')}</p>
      </header>
      {error ? (
        <div className="notice notice-error" role="alert">
          {error}
        </div>
      ) : null}
      <div className="popup-settings-stack">
        {POPUP_SETTING_CATEGORIES.map((category) => {
          const definitions = SETTING_DEFINITIONS.filter(
            (definition) => definition.category === category,
          );
          if (!definitions.length) return null;
          return (
            <section className="popup-setting-section" key={category}>
              <h2>{t(CATEGORY_LABELS[category])}</h2>
              <div className="popup-setting-card">
                {definitions.map((definition) => (
                  <PopupSettingRow
                    key={definition.id}
                    definition={definition}
                    settings={settings}
                    disabled={busyId === definition.id}
                    onUpdate={(value) => void update(definition, value)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
      <div className="popup-settings-footer">
        <button className="button button-primary" type="button" onClick={() => void openOptions()}>
          {t('openFullSettings')}
        </button>
      </div>
    </div>
  );
}

function PopupContent({
  settings,
  onChange,
}: {
  settings: AppSettings;
  onChange: (settings: AppSettings) => void;
}) {
  const t = useI18n();
  return (
    <main
      className={`popup-shell ${settings.privacy.onboardingComplete ? 'popup-settings-shell' : ''}`}
    >
      <div className="popup-brand">
        <BrandIcon className="brand-mark" />
        <h1>{t('productName')}</h1>
        <LanguageToggle
          locale={settings.locale}
          onChange={async (locale) => onChange(await settingsRepository.update({ locale }))}
        />
      </div>
      {settings.privacy.onboardingComplete ? (
        <PopupSettings settings={settings} onChange={onChange} />
      ) : (
        <PrivacyOnboarding onChange={onChange} />
      )}
    </main>
  );
}

export function App() {
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    void settingsRepository.get().then(setSettings);
  }, []);

  const activeSettings = settings ?? DEFAULT_SETTINGS;
  return (
    <I18nProvider locale={activeSettings.locale}>
      {settings ? (
        <PopupContent settings={settings} onChange={setSettings} />
      ) : (
        <main className="popup-shell" />
      )}
    </I18nProvider>
  );
}
