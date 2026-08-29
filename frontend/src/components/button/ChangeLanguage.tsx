"use client";

// Import du contexte
import { useTranslation } from "@/context/LanguageContext";

export default function ChangeLanguage() {
  const { locale, setLocale } = useTranslation();
  return (
    <div className="flex items-center gap-1 rounded-full bg-(--accent)/20 p-2">
      {/* {t("header.language")} */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setLocale("fr")}
          className={`aspect-square h-12 rounded-full px-3 py-1 transition-all duration-300 hover:bg-(--accent)/60 active:scale-95 ${locale === "fr" ? "bg-(--accent)" : ""}`}
        >
          FR
        </button>
        <button
          onClick={() => setLocale("en")}
          className={`aspect-square h-12 rounded-full px-3 py-1 transition-all duration-300 hover:bg-(--accent)/60 active:scale-95 ${locale === "en" ? "bg-(--accent)" : ""}`}
        >
          EN
        </button>
      </div>
    </div>
  );
}
