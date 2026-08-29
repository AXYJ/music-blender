"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import fr from "@/locales/fr.json";
import en from "@/locales/en.json";

type Locale = "fr" | "en";
const translations = { fr, en };

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined,
);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("fr");

  useEffect(() => {
    // Récupérer la langue sauvegardée ou la langue du navigateur
    const saved = localStorage.getItem("game_lang") as Locale;
    if (saved && (saved === "fr" || saved === "en")) {
      setLocaleState(saved);
    } else if (navigator.language.startsWith("en")) {
      setLocaleState("en");
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem("game_lang", newLocale);
  };

  // Fonction helper pour accéder aux clés imbriquées (ex: "common.play")
  const t = (path: string): string => {
    const keys = path.split(".");
    let current: any = translations[locale];
    for (const key of keys) {
      if (!current || current[key] === undefined) return path;
      current = current[key];
    }
    return current;
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context)
    throw new Error("useTranslation must be used within a LanguageProvider");
  return context;
}
