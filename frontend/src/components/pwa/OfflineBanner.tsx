"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/context/LanguageContext";

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    setIsOffline(!navigator.onLine);

    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    /* Conteneur d'alerte hors-ligne bloquant tout l'écran (à styliser par vos soins) */
    <div className="fixed inset-0 z-9999 flex flex-col items-center justify-center bg-(--background) p-6 text-center text-white">
      {/* Titre de l'erreur */}
      <h2 className="mb-2 flex items-center gap-2 text-2xl font-bold">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#f6effb"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10.114 4.462A14.5 14.5 0 0 1 12 2a10 10 0 0 1 9.313 13.643" />
          <path d="M15.557 15.556A14.5 14.5 0 0 1 12 22 10 10 0 0 1 4.929 4.929" />
          <path d="M15.892 10.234A14.5 14.5 0 0 0 12 2a10 10 0 0 0-3.643.687" />
          <path d="M17.656 12H22" />
          <path d="M19.071 19.071A10 10 0 0 1 12 22 14.5 14.5 0 0 1 8.44 8.45" />
          <path d="M2 12h10" />
          <path d="m2 2 20 20" />
        </svg>{" "}
        {t("pwa.offline-title")}
      </h2>

      {/* Message descriptif */}
      <p className="max-w-md">{t("pwa.offline-message")}</p>
    </div>
  );
}
