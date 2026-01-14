"use client";

import { useContent } from "@/hooks/use-content";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Language } from "@/context/language-context";

const languages: { code: Language; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "pt", label: "Português", flag: "🇵🇹" },
  { code: "es", label: "Español", flag: "🇪🇸" },
];

export function LanguageSwitcher() {
  const { language, setLanguage, isLoading } = useContent();

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        {languages.map((lang) => (
          <Button
            key={lang.code}
            variant={language === lang.code ? "primary" : "ghost"}
            size="sm"
            onClick={() => setLanguage(lang.code)}
            disabled={isLoading && language === lang.code}
            className="w-10 h-8 p-0"
            title={lang.label}
          >
            {isLoading && language === lang.code ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <span className="text-lg">{lang.flag}</span>
            )}
          </Button>
        ))}
      </div>
    </div>
  );
}
