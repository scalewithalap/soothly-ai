"use client";

import { createContext } from "react";
import english from "@/constants/languages/english.json";

export type Language = "en" | "fr" | "de" | "pt" | "es";
export type Content = typeof english;

interface LanguageContextType {
  language: Language;
  content: Content;
  setLanguage: (lang: Language) => void;
  isLoading: boolean;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

