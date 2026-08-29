"use client";

// Import des modules
import { useState, useEffect } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import React from "react";
import Image from "next/image";

// Import du contexte
import { useGame } from "@/context/GameContext";
import { useTranslation } from "@/context/LanguageContext";

// Import des composants
import Section from "@/components/Section";
import Error from "@/components/alert/Error";
import Toggle from "@/components/toggle/Toggle";
import Logo from "@/components/Logo";
import ChangeLanguage from "@/components/button/ChangeLanguage";

export default function Home() {
  const {
    setView,
    isConnected,
    error,
    setError,
    name,
    setName,
    createGame,
    joinGame,
  } = useGame();
  const { locale, setLocale, t } = useTranslation();

  const [roomInput, setRoomInput] = useState("");
  const [savedCode, setSavedCode] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = () => {
    if (currentSlide < 2) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      setSavedCode(localStorage.getItem("roomCode"));
    }
  }, []);

  // Effet pour cacher automatiquement les messages d'erreur après 3 secondes
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (error) {
      timer = setTimeout(() => {
        setError(null);
      }, 2000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [error]);

  const handleCreateGame = () => {
    if (!isConnected) {
      setError(t("home.error-connecting"));
      return;
    }
    if (!name.trim()) {
      setError(t("home.error-no-username"));
      return;
    }
    setError(null);
    createGame();
  };

  const handleJoinGame = () => {
    if (!isConnected) {
      setError(t("home.error-connecting"));
      return;
    }
    if (!name.trim()) {
      setError(t("home.error-no-username"));
      return;
    }
    if (!roomInput.trim()) {
      setError(t("home.error-no-room"));
      return;
    }
    setError(null);
    joinGame(roomInput.trim().toUpperCase());
  };

  return (
    <div className="my-16 flex flex-col items-center gap-4 md:gap-8">
      <ChangeLanguage />
      <Logo />
      <Section>
        <div className="mb-4 flex flex-col gap-2">
          <label htmlFor="name" className="text-2xl text-(--white)">
            {t("home.username")}
          </label>
          <input
            type="text"
            id="name"
            className="h-8 w-full rounded-lg bg-(--white) px-4 text-base text-(--background)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <button
            className="rounded-lg bg-(--accent) px-4 py-2 text-(--white) transition-all duration-300 hover:bg-(--accent)/60 active:scale-95"
            onClick={handleCreateGame}
          >
            {t("home.create")}
          </button>
          <div className="flex items-center gap-2">
            <div className="h-px w-full rounded-full bg-(--white)/20"></div>
            <p className="w-10 text-center text-(--white)">{t("home.or")}</p>
            <div className="h-px w-full rounded-full bg-(--white)/20"></div>
          </div>
          <div className="flex flex-col gap-2">
            <input
              type="text"
              placeholder={t("home.room-placeholder")}
              className="h-8 w-full rounded-lg bg-(--white) px-4 text-base text-(--background)"
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value)}
              list={savedCode ? "saved-room-code" : undefined}
              aria-label={t("home.room-placeholder")}
            />
            {savedCode && (
              <datalist id="saved-room-code">
                <option value={savedCode}></option>
              </datalist>
            )}
            <button
              className="rounded-lg bg-(--accent) px-4 py-2 text-(--white) transition-all duration-300 hover:bg-(--accent)/60 active:scale-95"
              onClick={handleJoinGame}
            >
              {t("home.join")}
            </button>
          </div>
        </div>
      </Section>
      <Section>
        <h3 className="text-2xl text-(--white)">{t("home.about")}</h3>
        <p>
          {t("home.about-text-1")}
          <br />
          {t("home.about-text-2")}
        </p>
      </Section>
      <div className="grid w-full grid-cols-1 flex-col gap-4 md:flex-row md:gap-8 lg:grid-cols-2">
        <Section>
          <h2>{t("home.how-to-play")}</h2>
          <div className="explain-container relative overflow-hidden">
            <div className="explain-slider flex items-center justify-between gap-4">
              <div
                className="slides flex w-full items-center justify-start transition-transform duration-500 ease-in-out"
                style={{
                  transform: `translateX(-${currentSlide * 100}%)`,
                }}
              >
                <div className="slide pointer-events-none flex w-full shrink-0 flex-col items-center gap-8 rounded-lg">
                  <div
                    className="flex min-h-32 w-full flex-col items-center justify-center gap-4 rounded-lg px-16 py-4"
                    aria-hidden="true"
                  >
                    <div className="w-full -rotate-2 rounded-lg bg-(--accent) px-4 py-2 text-center text-(--white)">
                      {t("home.create")}
                    </div>
                    <div className="w-full -rotate-6 rounded-lg bg-(--accent) px-4 py-2 text-center text-(--white)">
                      {t("home.join")}
                    </div>
                  </div>
                  <p className="px-2 text-center">{t("home.step1")}</p>
                </div>

                <div className="slide pointer-events-none flex w-full shrink-0 flex-col items-center gap-8 rounded-lg">
                  <div
                    className="flex min-h-32 w-full flex-col items-center justify-center gap-4 rounded-lg px-16 py-4"
                    aria-hidden="true"
                  >
                    <div className="flex flex-wrap items-center justify-center gap-8">
                      <Image src="/spotify.svg" alt="" width={50} height={50} />
                      <Image src="/deezer.svg" alt="" width={50} height={50} />
                      <Image src="/apple.webp" alt="" width={50} height={50} />
                    </div>
                  </div>
                  <p className="px-2 text-center">{t("home.step2")}</p>
                </div>

                <div className="slide pointer-events-none flex w-full shrink-0 flex-col items-center gap-8 rounded-lg">
                  <div
                    className="flex min-h-32 w-full flex-col justify-center gap-2 rounded-lg px-16 py-4"
                    aria-hidden="true"
                  >
                    <div className="rotate-2">
                      <label htmlFor="artist-guess" className="text-sm">
                        {t("home.artist")}
                      </label>
                      <input
                        id="artist-guess"
                        type="text"
                        tabIndex={-1}
                        readOnly
                        className={`w-full rounded-lg bg-white px-4 py-2 focus:ring-2 focus:ring-(--accent) focus:outline-none`}
                      />
                    </div>
                    <div className="rotate-6">
                      <label htmlFor="track-guess" className="text-sm">
                        {t("home.track")}
                      </label>
                      <input
                        id="track-guess"
                        type="text"
                        tabIndex={-1}
                        readOnly
                        className={`w-full rounded-lg bg-white px-4 py-2 focus:ring-2 focus:ring-(--accent) focus:outline-none`}
                      />
                    </div>
                  </div>
                  <p className="px-2 text-center">{t("home.step3")}</p>
                </div>
              </div>
            </div>
            <button
              className="previous absolute top-1/2 left-0 flex aspect-square h-12 w-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-(--accent) text-(--white) transition-all duration-300 disabled:pointer-events-none disabled:opacity-0"
              onClick={prevSlide}
              disabled={currentSlide === 0}
              aria-label={t("home.prev-slide")}
            >
              {"<"}
            </button>
            <button
              className="next absolute top-1/2 right-0 flex aspect-square h-12 w-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-(--accent) text-(--white) transition-all duration-300 disabled:pointer-events-none disabled:opacity-0"
              onClick={nextSlide}
              disabled={currentSlide === 2}
              aria-label={t("home.next-slide")}
            >
              {">"}
            </button>
            <div
              className="mt-4 flex justify-center gap-2"
              role="group"
              aria-label={t("home.select-slide")}
            >
              {[0, 1, 2].map((index) => (
                <button
                  key={index}
                  type="button"
                  className={`h-4 w-4 rounded-full border-none p-0 ${index === currentSlide ? "bg-(--accent)" : "bg-(--white)"} cursor-pointer transition-all duration-300`}
                  onClick={() => setCurrentSlide(index)}
                  aria-label={`${t("home.go-to-slide")} ${index + 1}`}
                  aria-current={index === currentSlide ? "step" : undefined}
                />
              ))}
            </div>
          </div>
        </Section>
        <Section>
          <h2>{t("home.faq-title")}</h2>
          <div className="flex flex-col overflow-hidden">
            <Toggle question={t("home.faq-q1")} answer={t("home.faq-a1")} />
            <Toggle question={t("home.faq-q2")} answer={t("home.faq-a2")} />
            <Toggle question={t("home.faq-q3")} answer={t("home.faq-a3")} />
            <Toggle question={t("home.faq-q4")} answer={t("home.faq-a4")} />
          </div>
        </Section>
      </div>

      <footer className="mt-4 flex w-full flex-col items-center gap-4 text-center">
        <p className="text-(--white)/50">{t("home.message")}</p>
        <button
          className="rounded-lg bg-(--accent) px-4 py-2 text-(--white) transition-all duration-300 hover:bg-(--accent)/60 active:scale-95"
          onClick={() => setView("mentions")}
        >
          {t("home.mentions")}
        </button>
        <p className="mt-2 text-(--white)/50">{t("home.copyright")}</p>
      </footer>

      <Error error={error} setError={setError} />
    </div>
  );
}
