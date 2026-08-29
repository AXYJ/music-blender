"use client";

import { useGame } from "@/context/GameContext";
import { useTranslation } from "@/context/LanguageContext";

export default function QuitGame() {
  const { quitGame } = useGame();
  const { t } = useTranslation();

  return (
    <button
      className="static z-50 flex h-12 w-12 cursor-pointer items-center justify-center self-start rounded-full bg-(--accent) p-2 font-semibold text-(--white) shadow-md transition-all hover:scale-105 hover:bg-(--semiaccent) hover:shadow-lg active:scale-95 lg:absolute lg:top-4 lg:left-4"
      onClick={() => quitGame()}
      aria-label={t("button.quit-game")}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="lucide lucide-log-out-icon lucide-log-out"
      >
        <path d="m16 17 5-5-5-5" />
        <path d="M21 12H9" />
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      </svg>
    </button>
  );
}
