"use client";

import React, { createContext, useContext, useSyncExternalStore } from "react";
import fr from "@/locales/fr.json";
import en from "@/locales/en.json";
import { readLocal, subscribeLocal, writeLocal } from "@/utils/useLocalStorage";

type Locale = "fr" | "en";
const translations = { fr, en };

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, replace?: Record<string, string>) => string;
}

function getLocale(): Locale {
  const saved = readLocal("game_lang");
  if (saved === "fr" || saved === "en") return saved;
  return navigator.language.startsWith("en") ? "en" : "fr";
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined,
);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Langue sauvegardée, sinon langue du navigateur ("fr" côté serveur)
  const locale = useSyncExternalStore<Locale>(
    subscribeLocal,
    getLocale,
    () => "fr",
  );

  const setLocale = (newLocale: Locale) => writeLocal("game_lang", newLocale);

  // Fonction helper pour accéder aux clés imbriquées (ex: "common.play") et remplacer des placeholders
  const t = (path: string, replace?: Record<string, string>): string => {
    const keys = path.split(".");
    let current: unknown = translations[locale];
    for (const key of keys) {
      if (
        !current ||
        typeof current !== "object" ||
        (current as Record<string, unknown>)[key] === undefined
      ) {
        return path;
      }
      current = (current as Record<string, unknown>)[key];
    }
    if (typeof current === "string") {
      if (replace) {
        let result = current;
        for (const [key, value] of Object.entries(replace)) {
          result = result.replace(new RegExp(`{{\\s*${key}\\s*}}`, "g"), value);
        }
        return result;
      }
      return current;
    }
    return path;
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
