import { useState } from 'react';

import { SUPPORTED_PLATFORMS } from '../shared/constants/platforms';
import { useI18n } from '../shared/i18n/I18nContext';
import type { AppSettings } from '../shared/types/settings';

export function DefaultModelSettings({
  settings,
  onChange,
}: {
  settings: AppSettings;
  onChange: (settings: AppSettings) => Promise<void>;
}) {
  const t = useI18n();
  const [error, setError] = useState('');

  const save = async (
    platformId: (typeof SUPPORTED_PLATFORMS)[number]['id'],
    modelInput: string,
  ) => {
    const model = modelInput.trim();
    const defaults = { ...settings.models.defaults };
    if (model) defaults[platformId] = model;
    else delete defaults[platformId];
    try {
      await onChange({ ...settings, models: { defaults } });
      setError('');
    } catch {
      setError(t('saveError'));
    }
  };

  return (
    <article className="setting-card workspace-card">
      <div>
        <h2>{t('defaultModels')}</h2>
        <p className="setting-description">{t('defaultModelsDescription')}</p>
      </div>
      {error ? <div className="notice notice-error">{error}</div> : null}
      <div className="form-grid two-columns">
        {SUPPORTED_PLATFORMS.map((platform) => (
          <label key={platform.id}>
            <span>{t('defaultModelFor', { platform: platform.label })}</span>
            <input
              key={`${platform.id}:${settings.models.defaults[platform.id] ?? ''}`}
              maxLength={120}
              placeholder={t('defaultModelPlaceholder')}
              defaultValue={settings.models.defaults[platform.id] ?? ''}
              onBlur={(event) => void save(platform.id, event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') event.currentTarget.blur();
              }}
            />
          </label>
        ))}
      </div>
    </article>
  );
}
