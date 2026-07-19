import { useI18n } from '../../shared/i18n/I18nContext';
import { resolveLocale } from '../../shared/i18n/messages';
import type { LocalePreference } from '../../shared/types/settings';

export function LanguageToggle({
  locale,
  onChange,
}: {
  locale: LocalePreference;
  onChange: (locale: 'en' | 'zh-CN') => void | Promise<void>;
}) {
  const t = useI18n();
  const resolved = resolveLocale(locale);
  const chinese = resolved === 'zh-CN' || resolved === 'zh-TW';

  return (
    <div className="language-toggle" role="group" aria-label={t('language')}>
      <button
        type="button"
        className={chinese ? 'active' : undefined}
        aria-pressed={chinese}
        onClick={() => void onChange('zh-CN')}
      >
        中文
      </button>
      <button
        type="button"
        className={!chinese ? 'active' : undefined}
        aria-pressed={!chinese}
        onClick={() => void onChange('en')}
      >
        EN
      </button>
    </div>
  );
}
