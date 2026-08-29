"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/context/LanguageContext";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => console.log("Service Worker registered!", reg))
        .catch((err) => console.error("SW registration failed:", err));
    }

    // Détecter si l'appareil est sous iOS
    const checkIOS = () => {
      const userAgent = window.navigator.userAgent;
      const isIPadOrIPhone =
        /iPad|iPhone|iPod/.test(userAgent) ||
        (window.navigator.platform === "MacIntel" &&
          window.navigator.maxTouchPoints > 1);

      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;

      // Si c'est iOS et que ce n'est pas déjà lancé en mode standalone (déjà installé)
      if (isIPadOrIPhone && !isStandaloneMode) {
        setIsIOS(true);
        setShowPrompt(true);
      }
    };
    checkIOS();

    // Si l'événement a déjà été intercepté par le script du layout avant l'hydratation (Android/Desktop)
    if (typeof window !== "undefined" && (window as any).deferredPrompt) {
      setDeferredPrompt((window as any).deferredPrompt);
      setShowPrompt(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    const handlePwaPromptAvailable = () => {
      if (typeof window !== "undefined" && (window as any).deferredPrompt) {
        setDeferredPrompt((window as any).deferredPrompt);
        setShowPrompt(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("pwa-prompt-available", handlePwaPromptAvailable);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener(
        "pwa-prompt-available",
        handlePwaPromptAvailable,
      );
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  return (
    <>
      {showPrompt && (
        <button
          onClick={handleInstallClick}
          className="z-50 aspect-square cursor-pointer rounded-full bg-(--accent) p-4 text-black"
          aria-label={t("home.install")}
        >
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
            className="lucide lucide-arrow-down-to-line-icon lucide-arrow-down-to-line"
          >
            <path d="M12 17V3" />
            <path d="m6 11 6 6 6-6" />
            <path d="M19 21H5" />
          </svg>
        </button>
      )}

      {/* Pop-up explicatif iOS à styliser par vos soins */}
      {showIOSInstructions && (
        <div className="fixed inset-0 z-10000 flex items-center justify-center bg-black/60 p-4">
          <div className="flex max-w-sm flex-col gap-4 rounded-2xl bg-(--white) p-6 text-black">
            {/* Titre popup */}
            <h3 className="text-xl font-bold">{t("pwa.ios-install-title")}</h3>

            {/* Instructions (convertir les retours à la ligne \n en balises ou rendu préformaté) */}
            <p className="text-sm whitespace-pre-line text-gray-700">
              {t("pwa.ios-install-steps")}
            </p>

            {/* Bouton de fermeture */}
            <button
              onClick={() => setShowIOSInstructions(false)}
              className="mt-2 w-full cursor-pointer rounded-lg bg-black py-2 font-semibold text-white"
            >
              {t("pwa.close")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
