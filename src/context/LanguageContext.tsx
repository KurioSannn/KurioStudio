import React, { createContext, useContext } from "react";
import { en, id, type TranslationKeys } from "../lib/i18n";

// ─── Supported locales ────────────────────────────────────────────────────────
export type Lang = "en" | "id";

const translations: Record<Lang, TranslationKeys> = { en, id };

// ─── Auto-detect from browser ─────────────────────────────────────────────────
function detectLang(): Lang {
  const raw = (
    navigator.languages?.[0] || navigator.language || "en"
  ).toLowerCase();
  if (raw.startsWith("id")) return "id";
  return "en";
}

// ─── Context ──────────────────────────────────────────────────────────────────
interface LanguageContextType {
  lang: Lang;
  t: TranslationKeys;
}

const detected = detectLang();

const LanguageContext = createContext<LanguageContextType>({
  lang: detected,
  t: translations[detected],
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const lang = detectLang();
  const t = translations[lang];

  return (
    <LanguageContext.Provider value={{ lang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

/**
 * Hook to access the current language and translation dictionary.
 *
 * @example
 * const { t, lang } = useLanguage();
 * return <h1>{t.heroHeadline}</h1>;
 */
export const useLanguage = () => useContext(LanguageContext);
