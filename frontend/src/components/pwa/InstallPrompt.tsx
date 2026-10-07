"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useTranslation } from "@/context/LanguageContext";
import { subscribeNever } from "@/utils/useLocalStorage";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface Window {
    deferredPrompt?: BeforeInstallPromptEvent;
  }
  interface Navigator {
    standalone?: boolean;
  }
}

// Le script du layout intercepte beforeinstallprompt avant l'hydratation, le garde dans
// window.deferredPrompt et émet "pwa-prompt-available"
const subscribeToPrompt = (callback: () => void) => {
  window.addEventListener("pwa-prompt-available", callback);
  return () => window.removeEventListener("pwa-prompt-available", callback);
};
const getDeferredPrompt = () => window.deferredPrompt ?? null;

// iOS (iPad récents inclus) hors mode standalone, c'est-à-dire pas encore installée
const detectInstallableIOS = (): boolean => {
  const isIPadOrIPhone =
    /iPad|iPhone|iPod/.test(window.navigator.userAgent) ||
    (window.navigator.platform === "MacIntel" &&
      window.navigator.maxTouchPoints > 1);
  const isStandaloneMode =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
  return isIPadOrIPhone && !isStandaloneMode;
};

export default function InstallPrompt() {
  const deferredPrompt = useSyncExternalStore(
    subscribeToPrompt,
    getDeferredPrompt,
    () => null,
  );
  const isIOS = useSyncExternalStore(
    subscribeNever,
    detectInstallableIOS,
    () => false,
  );
  const showPrompt = isIOS || deferredPrompt !== null;
  const [showIOSInstructions, setShowIOSInstructions] =
    useState<boolean>(false);
  const { t } = useTranslation();

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => console.error("SW registration failed:", err));
    }
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    // L'invite ne sert qu'une fois : on l'oublie et on prévient les abonnés
    window.deferredPrompt = undefined;
    window.dispatchEvent(new Event("pwa-prompt-available"));
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
