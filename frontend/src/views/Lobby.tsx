"use client";

// Import de react
import { useState, useEffect } from "react";

// Import du contexte
import { useGame } from "../context/GameContext";

// Import des composants
import Section from "../components/Section";
import Error from "../components/alert/Error";
import Message from "../components/alert/Message";
import Stepper from "../components/stepper/Stepper";
import Logo from "../components/Logo";
import Info from "../components/Info/Info";

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

  const [isLoading, setIsLoading] = useState(false);
  const [infoType, setInfoType] = useState<"number-music" | "time" | null>(
    null,
  );

  // Gestion du nombre de morceau par playlist
  const handleMusicAmount = (operation: "up" | "down") => {
    if (operation === "up") {
      if (musicAmount < 30) {
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

  // Gestion du temps par morceau
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

  // Reset de l'état isLoading en cas d'erreur
  useEffect(() => {
    if (error) {
      setIsLoading(false);
    }
  }, [error]);

  return (
    <div className="my-16 flex w-full flex-col items-center gap-8">
      <Logo />

      <div className="flex w-full flex-col gap-4">
        <div className="flex flex-col items-center gap-8">
          <button
            className="cursor-pointer text-center text-xl font-bold text-(--white) transition-all duration-100 ease-out hover:scale-105 active:scale-95"
            onClick={() => {
              handleCopyCode();
            }}
            title="Copier le code"
          >
            Code de la partie : {roomCode}
            {/* Rajouter icone de copie */}
          </button>
        </div>
        <div className="flex w-full flex-col items-center gap-4 lg:grid lg:grid-cols-3 lg:items-stretch">
          <Section
            sectionClassName="lg:h-full"
            className="flex h-full flex-col gap-4"
          >
            <h2>Liste des joueurs</h2>
            <div className="flex min-h-48 flex-1 flex-col gap-2 overflow-y-auto">
              {players.map((player) => (
                <p
                  key={player.id}
                  className={`rounded-full px-3 py-2 transition-all duration-300 ${player.isReady ? "bg-(--accent) text-(--white)" : "bg-(--grey) text-(--background)"}`}
                >
                  {player.name}
                </p>
              ))}
            </div>
          </Section>
          <div className="flex w-full flex-col items-center gap-4 lg:col-span-2">
            <Section>
              <h2>Paramètres de la partie</h2>
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-4">
                  <p>
                    Nombre de morceaux par playlist
                    <button
                      className="relative ml-1 inline-flex items-center align-middle"
                      aria-describedby="info-number-music"
                      onMouseOver={() => setInfoType("number-music")}
                      onMouseOut={() => setInfoType(null)}
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
                        className="lucide lucide-info-icon lucide-info"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 16v-4" />
                        <path d="M12 8h.01" />
                      </svg>
                      <Info
                        id="info-number-music"
                        visible={infoType === "number-music"}
                      >
                        <p>
                          Le nombre de morceaux choisit dans chaque playlist.
                        </p>
                      </Info>
                    </button>
                  </p>
                  <Stepper
                    value={musicAmount}
                    onIncrement={() => handleMusicAmount("up")}
                    onDecrement={() => handleMusicAmount("down")}
                    minDisabled={musicAmount <= 1}
                    maxDisabled={musicAmount >= 30}
                    readOnly={!isHost}
                  />
                </div>
                <div className="flex flex-col gap-4">
                  <p>
                    Temps par morceau (secondes)
                    <button
                      className="relative ml-1 inline-flex items-center align-middle"
                      aria-describedby="info-time"
                      onMouseOver={() => setInfoType("time")}
                      onMouseOut={() => setInfoType(null)}
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
                        className="lucide lucide-info-icon lucide-info"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 16v-4" />
                        <path d="M12 8h.01" />
                      </svg>
                      <Info id="info-time" visible={infoType === "time"}>
                        <p>
                          Le temps accordé pour deviner et écrire les réponses
                          pour chaque morceaux.
                        </p>
                      </Info>
                    </button>
                  </p>
                  <Stepper
                    value={time}
                    onIncrement={() => handleTime("up")}
                    onDecrement={() => handleTime("down")}
                    minDisabled={time <= 5}
                    maxDisabled={time >= 30}
                    readOnly={!isHost}
                  />
                </div>
              </div>
            </Section>
            <Section>
              <h2>Ajoute ta musique</h2>
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <label htmlFor="stream">Plateforme de streaming</label>
                  <select
                    name="stream-service"
                    id="stream"
                    className="rounded-md bg-(--white) p-2 text-(--background)"
                    aria-label="Plateforme de streaming"
                  >
                    <option value="spotify">Spotify</option>
                    {/* <option value="deezer">Deezer</option> */}
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="playlist">URL de la playlist</label>
                  <input
                    type="text"
                    id="playlist"
                    className="h-8 w-full rounded-lg bg-(--white) px-4 text-base text-(--background)"
                    value={playlistUrl}
                    onChange={(e) => setPlaylistUrl(e.target.value)}
                  />
                </div>
              </div>
            </Section>
          </div>
        </div>
      </div>

      <div className="flex w-full justify-between gap-4">
        <button
          className="flex-1 rounded-full bg-(--white) px-8 py-2 text-sm text-(--background) transition-all duration-300 ease-out hover:bg-(--accent)/60 hover:text-(--white) active:scale-95 md:text-base"
          onClick={quitGame}
        >
          Quitter
        </button>
        {isHost && (
          <button
            className={`flex-1 rounded-full bg-(--accent) px-8 py-2 text-sm text-(--white) transition-all duration-300 ease-out hover:bg-(--accent)/60 hover:text-(--white) active:scale-95 md:text-base ${players.filter((p) => p.isReady).length !== players.length ? "cursor-not-allowed opacity-50" : ""} ${isLoading ? "cursor-not-allowed opacity-50" : ""}`}
            onClick={() => {
              setIsLoading(true);
              launchGame();
            }}
            disabled={
              players.filter((p) => p.isReady).length !== players.length ||
              isLoading
            }
          >
            Lancer ({players.filter((p) => p.isReady).length}/{players.length})
          </button>
        )}
        {!isHost && (
          <button
            className={`flex-1 rounded-full px-8 py-2 text-sm transition-all duration-300 ease-out hover:bg-(--accent)/60 hover:text-(--white) active:scale-95 md:text-base ${!isReady ? "bg-(--accent) text-(--white)" : "bg-(--semiaccent) text-(--white)"}`}
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
