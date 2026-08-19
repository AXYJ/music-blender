"use client";

// Import des modules
import { useState, useEffect } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import React from "react";

// Import du contexte
import { useGame } from "../context/GameContext";

// Import des composants
import Section from "../components/Section";
import Error from "../components/alert/Error";

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

  useEffect(() => {
    if (typeof window !== "undefined") {
      setSavedCode(localStorage.getItem("roomCode"));
    }
  }, []);

  // Effet pour cacher automatiquement les messages d'erreur après 3 secondes
  // useEffect(() => {
  //   let timer: NodeJS.Timeout | null = null;
  //   if (error) {
  //     timer = setTimeout(() => {
  //       setError(null);
  //     }, 2000);
  //   }
  //   return () => {
  //     if (timer) clearTimeout(timer);
  //   };
  // }, [error]);

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
    <div className="my-16 flex flex-col items-center gap-8">
      <h1 className="text-center text-4xl font-bold text-(--accent)">
        Music Blender
      </h1>
      <div className="flex w-full flex-col items-center gap-4">
        <Section>
          <div className="mb-4 flex flex-col gap-2">
            <label htmlFor="name" className="text-2xl font-bold text-(--white)">
              Votre pseudo
            </label>
            <input
              type="text"
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
        <Section>
          <h2>Comment jouer ?</h2>
        </Section>
        <Section>
          <h2>FAQ</h2>
        </Section>
      </div>

      <Error error={error} setError={setError} />
    </div>
  );
}
