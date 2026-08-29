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
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-(--white) p-6 text-center text-black">
      {/* Titre de l'erreur */}
      <h2 className="mb-2 text-2xl font-bold">{t("pwa.offline-title")}</h2>

      {/* Message descriptif */}
      <p className="max-w-md">{t("pwa.offline-message")}</p>
    </div>
  );
}
