"use client";

import React, { useEffect, useState } from "react";
import english from "@/constants/languages/english.json";
import { Language, Content, LanguageContext } from "@/context/language-context";

const languages: Record<Language, () => Promise<Content>> = {
  en: () => import("@/constants/languages/english.json").then((m) => m.default),
  fr: () =>
    import("@/constants/languages/french.json").then(
      (m) => m.default as unknown as Content
    ),
  de: () =>
    import("@/constants/languages/german.json").then(
      (m) => m.default as unknown as Content
    ),
  pt: () =>
    import("@/constants/languages/portuguese.json").then(
      (m) => m.default as unknown as Content
    ),
  es: () =>
    import("@/constants/languages/spanish.json").then(
      (m) => m.default as unknown as Content
    ),
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const [content, setContent] = useState<Content>(english);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const savedLang = localStorage.getItem("language") as Language;
    if (savedLang && Object.keys(languages).includes(savedLang)) {
      setLanguage(savedLang);
    }
  }, []);

  const setLanguage = async (lang: Language) => {
    if (lang === language) return;

    setIsLoading(true);
    try {
      const newContent = await languages[lang]();
      setContent(newContent);
      setLanguageState(lang);
      localStorage.setItem("language", lang);
    } catch (error) {
      console.error(`Failed to load language: ${lang}`, error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LanguageContext.Provider
      value={{ language, content, setLanguage, isLoading }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

