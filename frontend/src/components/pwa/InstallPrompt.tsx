"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/context/LanguageContext";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => console.log("Service Worker registered!", reg))
        .catch((err) => console.error("SW registration failed:", err));
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    /* Conteneur principal de l'invite d'installation (à styliser) */
    <div className="fixed right-4 bottom-4 z-50 rounded-lg bg-(--white) p-4 text-black shadow-xl">
      {/* Message d'invite */}
      <p className="mb-2 font-medium">{t("pwa.install-text")}</p>

      {/* Actions */}
      <div className="flex gap-2">
        {/* Bouton d'action pour installer */}
        <button
          onClick={handleInstallClick}
          className="rounded bg-black px-3 py-1 text-white"
        >
          {t("pwa.install-button")}
        </button>

        {/* Bouton pour rejeter temporairement */}
        <button
          onClick={() => setShowPrompt(false)}
          className="rounded border border-gray-300 px-3 py-1"
        >
          {t("pwa.close")}
        </button>
      </div>
    </div>
  );
}
