"use client";

// Import du contexte
import { useTranslation } from "@/context/LanguageContext";

export default function ChangeLanguage() {
  const { locale, setLocale } = useTranslation();
  return (
    <div className="static z-50 -mt-8 -mb-4 flex items-center gap-1 self-end rounded-full bg-(--accent)/20 p-1 md:-mb-12 lg:absolute lg:top-4 lg:right-4">
      {/* {t("header.language")} */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setLocale("fr")}
          className={`aspect-square rounded-full px-3 py-1 transition-all duration-300 hover:bg-(--accent)/60 active:scale-95 ${locale === "fr" ? "bg-(--accent)" : ""}`}
        >
          FR
        </button>
        <button
          onClick={() => setLocale("en")}
          className={`aspect-square rounded-full px-3 py-1 transition-all duration-300 hover:bg-(--accent)/60 active:scale-95 ${locale === "en" ? "bg-(--accent)" : ""}`}
        >
          EN
        </button>
      </div>
    </div>
  );
}
