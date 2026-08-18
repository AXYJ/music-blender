"use client";

// Import de react
import { useState, useEffect } from "react";

// Import du contexte
import { useGame } from "../context/GameContext";

// Import des composants
import Section from "../components/Section";
import Error from "../components/alert/Error";
import Message from "../components/alert/Message";

import { motion, AnimatePresence } from "framer-motion";

export default function Lobby() {
  const {
    roomCode,
    players,
    socket,
    beReady,
    musicAmount,
    setMusicAmount,
    time,
    setTime,
    playlistUrl,
    setPlaylistUrl,
    launchGame,
    message,
    setMessage,
    error,
    setError,
    quitGame,
  } = useGame();

  const me = players.find((p) => p.socketId === socket?.id);
  const isHost = me?.isHost || false;
  const isReady = me?.isReady || false;

  // Gestion du nombre de musique par joueur
  const handleMusicAmount = (operation: "up" | "down") => {
    if (operation === "up") {
      if (musicAmount < 20) {
        setMusicAmount(musicAmount + 1);
        socket?.emit("music_amount", musicAmount + 1);
      }
    } else if (operation === "down") {
      if (musicAmount > 1) {
        setMusicAmount(musicAmount - 1);
        socket?.emit("music_amount", musicAmount - 1);
      }
    }
  };

  // Gestion du temps par musique
  const handleTime = (operation: "up" | "down") => {
    if (operation === "up") {
      if (time < 30) {
        setTime(time + 5);
        socket?.emit("time", time + 5);
      }
    } else if (operation === "down") {
      if (time > 5) {
        setTime(time - 5);
        socket?.emit("time", time - 5);
      }
    }
  };

  // Copier le code de la partie
  const handleCopyCode = () => {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode);
    setMessage("Code copié !");
  };

  // Reset du message après 2 secondes
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (message) {
      timer = setTimeout(() => {
        setMessage("");
      }, 2000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [message]);

  // Reset de l'erreur après 2 secondes
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

  return (
    <div className="flex flex-col items-center gap-8 my-16 w-full">
      <h1 className="text-4xl font-bold text-(--accent) text-center">
        Music Blender
      </h1>

      <div className="flex flex-col gap-4 w-full">
        <div className="flex flex-col items-center gap-8">
          <p
            className="text-xl font-bold text-(--white) text-center cursor-pointer"
            onClick={() => {
              handleCopyCode();
            }}
            title="Copier le code"
          >
            Code de la partie : {roomCode}
          </p>
        </div>
        <div className="flex flex-col items-center gap-4 w-full lg:grid lg:grid-cols-3 lg:items-stretch">
          <Section
            sectionClassName="lg:h-full"
            className="flex flex-col gap-4 h-full"
          >
            <h2>Liste des joueurs</h2>
            <div className="flex flex-col gap-2 flex-1 min-h-48 overflow-y-auto">
              {players.map((player) => (
                <p
                  key={player.id}
                  className={`px-3 py-2 rounded-full transition-all duration-300 ${player.isReady ? "text-(--white) bg-(--accent)" : "text-(--background) bg-(--grey)"}`}
                >
                  {player.name}
                </p>
              ))}
            </div>
          </Section>
          <div className="flex flex-col items-center gap-4 w-full lg:col-span-2">
            <Section>
              <h2>Paramètres de la partie</h2>
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-4">
                  <p>Nombre de musique par playlist</p>
                  <div className="flex items-center justify-center gap-4">
                    {isHost && (
                      <button
                        className={`rounded-full bg-(--white) aspect-square text-(--background) h-8 w-8 ${musicAmount === 1 ? "opacity-50 cursor-not-allowed" : ""}`}
                        onClick={() => {
                          handleMusicAmount("down");
                        }}
                      >
                        -
                      </button>
                    )}
                    <p>{musicAmount}</p>
                    {isHost && (
                      <button
                        className={`rounded-full bg-(--white) aspect-square text-(--background) h-8 w-8 ${musicAmount === 20 ? "opacity-50 cursor-not-allowed" : ""}`}
                        onClick={() => {
                          handleMusicAmount("up");
                        }}
                      >
                        +
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-4">
                  <p>Temps par musique (secondes)</p>
                  <div className="flex items-center justify-center gap-4">
                    {isHost && (
                      <button
                        className={`rounded-full bg-(--white) aspect-square text-(--background) h-8 w-8 ${time === 5 ? "opacity-50 cursor-not-allowed" : ""}`}
                        onClick={() => {
                          handleTime("down");
                        }}
                      >
                        -
                      </button>
                    )}
                    <p>{time}</p>
                    {isHost && (
                      <button
                        className={`rounded-full bg-(--white) aspect-square text-(--background) h-8 w-8 ${time === 30 ? "opacity-50 cursor-not-allowed" : ""}`}
                        onClick={() => {
                          handleTime("up");
                        }}
                      >
                        +
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </Section>
            <Section>
              <h2>Ajoute ta musique</h2>
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <p>Plateforme de streaming</p>
                  <select
                    name="stream-service"
                    id="stream"
                    className="rounded-md p-2 bg-(--white) text-(--background)"
                  >
                    <option value="spotify">Spotify</option>
                    {/* <option value="deezer">Deezer</option> */}
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <p>URL de la playlist</p>
                  <input
                    type="text"
                    className="h-8 w-full px-4 rounded-lg text-base bg-(--white) text-(--background)"
                    value={playlistUrl}
                    onChange={(e) => setPlaylistUrl(e.target.value)}
                  />
                </div>
              </div>
            </Section>
          </div>
        </div>
      </div>

      <div className="w-full flex justify-between gap-4">
        <button
          className="rounded-full px-8 py-2 bg-(--white) text-(--background) flex-1"
          onClick={quitGame}
        >
          Quitter
        </button>
        {isHost && (
          <button
            className="rounded-full px-8 py-2 bg-(--accent) text-(--white) flex-1"
            onClick={() => {
              launchGame();
            }}
          >
            Lancer
          </button>
        )}
        {!isHost && (
          <button
            className={`rounded-full px-8 py-2 transition-colors  flex-1 duration-300 ${!isReady ? "bg-(--accent) text-(--white)" : "bg-(--grey) text-(--background)"}`}
            onClick={() => {
              beReady();
            }}
          >
            {isReady ? "Annuler" : "Prêt"}
          </button>
        )}
      </div>

      <Message message={message} setMessage={setMessage} />
      <Error error={error} setError={setError} />
    </div>
  );
}
