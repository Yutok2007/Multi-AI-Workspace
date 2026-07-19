import { createContext, type ReactNode, useContext, useMemo } from 'react';

import type { LocalePreference } from '../types/settings';
import { createTranslator, resolveLocale, type MessageKey } from './messages';

type Translator = (key: MessageKey, values?: Record<string, string | number>) => string;

const I18nContext = createContext<Translator>(createTranslator('en'));

export function I18nProvider({
  locale,
  children,
}: {
  locale: LocalePreference;
  children: ReactNode;
}) {
  const translator = useMemo(() => createTranslator(resolveLocale(locale)), [locale]);
  return <I18nContext.Provider value={translator}>{children}</I18nContext.Provider>;
}

export function useI18n(): Translator {
  return useContext(I18nContext);
}
