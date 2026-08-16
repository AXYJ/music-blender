"use client";

// Import des modules
import { useState, useEffect } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import React from "react";

// Import du contexte
import { useGame } from "../context/GameContext";

// Import des composants
import Section from "../components/Section";

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
    <div className="flex flex-col items-center gap-8 my-16">
      <h1 className="text-4xl font-bold text-(--accent) text-center">
        Music Blender
      </h1>
      <div className="flex flex-col items-center gap-4 w-full">
        <Section>
          <div className="flex flex-col gap-2 mb-4">
            <label htmlFor="name" className="text-(--white) text-2xl font-bold">
              Votre pseudo
            </label>
            <input
              type="text"
              className="h-8 w-full px-4 rounded-lg text-base bg-(--white) text-(--background)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-4">
            <button
              className="bg-(--accent) text-(--white) px-4 py-2 rounded-lg"
              onClick={handleCreateGame}
            >
              Créer
            </button>
            <div className="flex flex-col gap-2">
              <input
                type="text"
                placeholder="Code de la room"
                className="h-8 w-full px-4 rounded-lg text-base bg-(--white) text-(--background)"
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value)}
              />
              <button
                className="bg-(--accent) text-(--white) px-4 py-2 rounded-lg"
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

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed top-8 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 bg-red-600/90 text-white rounded-lg shadow-lg backdrop-blur-md flex items-center gap-3 w-[calc(100%-4rem)]"
          >
            <span className="font-medium">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-2 text-red-100 hover:text-white transition-colors"
              aria-label="Fermer"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
