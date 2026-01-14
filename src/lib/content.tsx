"use client";

import { createContext, useContext, ReactNode } from "react";
import english from "@/constants/languages/english.json";

export type Content = typeof english;

// Simple context for content/translations
const ContentContext = createContext<{
  dict: Content;
  locale: string;
}>({
  dict: english,
  locale: "en",
});

export function ContentProvider({
  children,
  locale = "en",
}: {
  children: ReactNode;
  locale?: string;
}) {
  // For now, always use English - i18n system can be extended later
  const dict = english;

  return (
    <ContentContext.Provider value={{ dict, locale }}>
      {children}
    </ContentContext.Provider>
  );
}

export function useContent() {
  const context = useContext(ContentContext);
  if (!context) {
    // Fallback if used outside provider
    return { dict: english, locale: "en" };
  }
  return context;
}

export default english;
