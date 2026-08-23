"use client";

// Import des modules
import { useState, useEffect } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import React from "react";
import Image from "next/image";

// Import du contexte
import { useGame } from "../context/GameContext";

// Import des composants
import Section from "../components/Section";
import Error from "../components/alert/Error";
import Toggle from "../components/toggle/Toggle";

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
      setError("Connexion au serveur en cours... Veuillez patienter.");
      return;
    }
    if (!name.trim()) {
      setError("Veuillez entrer un pseudo.");
      return;
    }
    setError(null);
    createGame();
  };

  const handleJoinGame = () => {
    if (!isConnected) {
      setError("Connexion au serveur en cours... Veuillez patienter.");
      return;
    }
    if (!name.trim()) {
      setError("Veuillez entrer un pseudo.");
      return;
    }
    if (!roomInput.trim()) {
      setError("Veuillez entrer un code de room.");
      return;
    }
    setError(null);
    joinGame(roomInput.trim().toUpperCase());
  };

  return (
    <div className="my-16 flex flex-col items-center gap-4 md:gap-8">
      <h1 className="text-center text-4xl font-bold text-(--accent)">Museek</h1>
      <Section>
        <div className="mb-4 flex flex-col gap-2">
          <label htmlFor="name" className="text-2xl font-bold text-(--white)">
            Votre pseudo
          </label>
          <input
            type="text"
            id="name"
            className="h-8 w-full rounded-lg bg-(--white) px-4 text-base text-(--background)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-4">
          <button
            className="rounded-lg bg-(--accent) px-4 py-2 text-(--white) transition-all duration-300 hover:bg-(--accent)/60 active:scale-95"
            onClick={handleCreateGame}
          >
            Créer
          </button>
          <div className="flex flex-col gap-2">
            <input
              type="text"
              placeholder="Code de la room"
              className="h-8 w-full rounded-lg bg-(--white) px-4 text-base text-(--background)"
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value)}
              list={savedCode ? "saved-room-code" : undefined}
              aria-label="Code de la room"
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
              Rejoindre
            </button>
          </div>
        </div>
      </Section>
      <div className="grid w-full grid-cols-1 flex-col gap-4 md:flex-row md:gap-8 lg:grid-cols-2">
        <Section>
          <h2>Comment jouer ?</h2>
          <div className="explain-container relative overflow-hidden">
            <div className="explain-slider flex items-center justify-between gap-4">
              <div
                className="slides flex w-full items-center justify-start transition-transform duration-500 ease-in-out"
                style={{
                  transform: `translateX(-${currentSlide * 100}%)`,
                }}
              >
                <div className="slide pointer-events-none flex w-full flex-shrink-0 flex-col items-center gap-8 rounded-lg">
                  <div
                    className="flex w-full flex-col gap-4 rounded-lg px-16 py-4"
                    aria-hidden="true"
                  >
                    <div className="w-full -rotate-2 rounded-lg bg-(--accent) px-4 py-2 text-center text-(--white)">
                      Créer
                    </div>
                    <div className="w-full -rotate-6 rounded-lg bg-(--accent) px-4 py-2 text-center text-(--white)">
                      Rejoindre
                    </div>
                  </div>
                  <p className="px-2 text-center">
                    Créer une partie ou rejoingnez en une avec le code de la
                    partie
                  </p>
                </div>

                <div className="slide pointer-events-none flex w-full flex-shrink-0 flex-col items-center gap-8 rounded-lg">
                  <div
                    className="flex w-full flex-col items-center gap-4 rounded-lg px-16 py-4"
                    aria-hidden="true"
                  >
                    <Image src="/spotify.svg" alt="" width={50} height={50} />
                  </div>
                  <p className="px-2 text-center">
                    Ajouter le lien de votre playlist préférée
                  </p>
                </div>

                <div className="slide pointer-events-none flex w-full flex-shrink-0 flex-col items-center gap-8 rounded-lg">
                  <div
                    className="flex w-full flex-col gap-2 rounded-lg px-16 py-4"
                    aria-hidden="true"
                  >
                    <div className="rotate-2">
                      <label htmlFor="artist-guess" className="text-sm">
                        Artist
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
                        Chanson
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
                  <p className="px-2 text-center">
                    Devinez le titre et l'artiste de la musique et gagnez des
                    points
                  </p>
                </div>
              </div>
            </div>
            <button
              className={`previous absolute top-1/2 left-0 flex aspect-square h-12 w-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-(--accent) ${currentSlide === 0 ? "pointer-events-none opacity-50" : ""}`}
              onClick={prevSlide}
              aria-label="Diapositive précédente"
            >
              {"<"}
            </button>
            <button
              className={`next absolute top-1/2 right-0 flex aspect-square h-12 w-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-(--accent) ${currentSlide === 2 ? "pointer-events-none opacity-50" : ""}`}
              onClick={nextSlide}
              aria-label="Diapositive suivante"
            >
              {">"}
            </button>
            <div
              className="mt-4 flex justify-center gap-2"
              role="group"
              aria-label="Sélection de la diapositive"
            >
              {[0, 1, 2].map((index) => (
                <button
                  key={index}
                  type="button"
                  className={`h-4 w-4 rounded-full border-none p-0 ${index === currentSlide ? "bg-(--accent)" : "bg-(--white)"} cursor-pointer transition-all duration-300`}
                  onClick={() => setCurrentSlide(index)}
                  aria-label={`Aller à la diapositive ${index + 1}`}
                  aria-current={index === currentSlide ? "step" : undefined}
                />
              ))}
            </div>
          </div>
        </Section>
        <Section>
          <h2>FAQ</h2>
          <Toggle
            question="Comment ajouter une playlist depuis Spotify ?"
            answer={`
              <ol className="space-y-2">
              <li>Allez sur Spotify et trouvez la playlist que vous souhaitez partager (la playlist doit être en publique).</li>
              <li>Cliquez sur les trois petits points (...) à côté du nom de la playlist.</li>
              <li>Cliquez sur 'Partager', puis sur 'Copier le lien'.</li>
              <li>Collez ce lien dans le champ prévu à cet effet dans l'application.</li>
              </ol>
              `}
          />
          {/* <Toggle
            question="Comment ajouter une playlist depuis Deezer ?"
            answer=" 1. Allez sur Deezer et trouvez la playlist que vous souhaitez partager (la playlist doit être en publique). 2. Cliquez sur les trois petits points (...) à côté du nom de la playlist. 3. Cliquez sur 'Partager', puis sur 'Copier le lien'. 4. Collez ce lien dans le champ prévu à cet effet dans l'application."
          />
          <Toggle
            question="Comment ajouter une playlist depuis YouTube ?"
            answer=" 1. Allez sur YouTube et trouvez la playlist que vous souhaitez partager (la playlist doit être en publique). 2. Cliquez sur les trois petits points (...) à côté du nom de la playlist. 3. Cliquez sur 'Partager', puis sur 'Copier le lien'. 4. Collez ce lien dans le champ prévu à cet effet dans l'application."
          /> */}
        </Section>
      </div>

      <footer className="mt-16 flex w-full flex-col items-center gap-4 text-center">
        <p className="text-(--white)/50">
          Ce jeu est un projet indépendant et n'est ni affilié, ni sponsorisé,
          ni approuvé par Spotify / Deezer / YouTube. Les titres, artistes et
          visuels associés restent la propriété exclusive de leurs ayants droit
          respectifs.
        </p>
        <button
          className="rounded-lg bg-(--accent) px-4 py-2 text-(--white) transition-all duration-300 hover:bg-(--accent)/60 active:scale-95"
          onClick={() => setView("mentions")}
        >
          Mentions légales &amp; Politique de confidentialité
        </button>
        <p className="mt-2 text-(--white)/50">
          © 2026 Museek - Tous droits réservés
        </p>
      </footer>

      <Error error={error} setError={setError} />
    </div>
  );
}
