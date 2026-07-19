import { useState } from 'react';
import browser from 'webextension-polyfill';

import { useI18n } from '../shared/i18n/I18nContext';
import type { AppSettings } from '../shared/types/settings';

export function NotificationSettings({
  settings,
  onChange,
}: {
  settings: AppSettings;
  onChange: (settings: AppSettings) => Promise<void>;
}) {
  const t = useI18n();
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const toggle = async () => {
    setError('');
    const enable = !settings.notifications.completionEnabled;
    try {
      if (enable) {
        const granted = await browser.permissions.request({ permissions: ['notifications'] });
        if (!granted) throw new Error(t('notificationPermissionDenied'));
      } else {
        await browser.permissions.remove({ permissions: ['notifications'] });
      }
      await onChange({
        ...settings,
        notifications: { ...settings.notifications, completionEnabled: enable },
      });
      setNotice(enable ? t('notificationsEnabled') : t('notificationsDisabled'));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('requestFailed'));
    }
  };

  return (
    <div className="settings-stack">
      {notice ? <div className="notice">{notice}</div> : null}
      {error ? <div className="notice notice-error">{error}</div> : null}
      <article className="setting-card">
        <div className="setting-topline">
          <div>
            <h2>{t('completionNotifications')}</h2>
            <p className="setting-description">{t('completionNotificationsDescription')}</p>
          </div>
          <button
            className="switch"
            type="button"
            role="switch"
            aria-checked={settings.notifications.completionEnabled}
            aria-label={t('completionNotifications')}
            onClick={() => void toggle()}
          />
        </div>
      </article>
    </div>
  );
}
