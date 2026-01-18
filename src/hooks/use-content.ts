"use client";

import { useContext } from "react";
import { LanguageContext } from "@/context/language-context";

export function useContent() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useContent must be used within a LanguageProvider");
  }
  return context;
}

