"use client";

// Import de next
import Image from "next/image";

// Import de react
import { useState, useEffect, useRef } from "react";

import { motion } from "framer-motion";

// Import des composants
import Error from "../components/alert/Error";
import Message from "../components/alert/Message";

// Import du contexte
import { useGame } from "../context/GameContext";

export default function Game() {
  const {
    toPlay,
    time,
    volume,
    setVolume,
    database_artists = [],
    database_tracks = [],
    sendAnswer,
    setPlayers,
    socket,
    players,
    restart,
    turn,
    setTurn,
    phase,
    setPhase,
    timeLeft,
    setTimeLeft,
    error,
    setError,
    message,
    setMessage,
    quitGame,
  } = useGame();

  // Find current player profile
  const me = players?.find((p) => p.socketId === socket?.id);
  const [artistGuess, setArtistGuess] = useState<string>("");
  const [trackGuess, setTrackGuess] = useState<string>("");
  const [guessingArtist, setGuessingArtist] = useState<boolean>(false);
  const [guessingSong, setGuessingSong] = useState<boolean>(false);
  const [showArtistSuggestions, setShowArtistSuggestions] =
    useState<boolean>(false);
  const [showTrackSuggestions, setShowTrackSuggestions] =
    useState<boolean>(false);
  const [activeArtistIndex, setActiveArtistIndex] = useState<number>(-1);
  const [activeTrackIndex, setActiveTrackIndex] = useState<number>(-1);

  // Reset active suggestion indices when guesses change
  useEffect(() => {
    setActiveArtistIndex(-1);
  }, [artistGuess]);

  useEffect(() => {
    setActiveTrackIndex(-1);
  }, [trackGuess]);

  // Bloquer le défilement du body lors de la saisie
  useEffect(() => {
    if (guessingArtist || guessingSong) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, [guessingArtist, guessingSong]);

  // Helper to get the current artist query (the part after the last comma)
  const getArtistQuery = (input: string) => {
    const parts = input.split(",");
    return parts[parts.length - 1].trim();
  };

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

  const artistQuery = getArtistQuery(artistGuess);

  // Filter database artists (max 5 results)
  const filteredArtists = (database_artists || [])
    .filter((a) => {
      if (!artistQuery || artistQuery.length < 3) return false;
      const search = artistQuery.toLowerCase();
      const matchesName = a.artist?.toLowerCase().includes(search);
      const matchesInt = a.internationalArtist?.toLowerCase().includes(search);
      return matchesName || matchesInt;
    })
    .slice(0, 5);

  // Filter database tracks (max 5 results)
  const filteredTracks = (database_tracks || [])
    .filter((t) => {
      if (!trackGuess || trackGuess.length < 3) return false;
      const search = trackGuess.toLowerCase();
      const matchesName = t.name?.toLowerCase().includes(search);
      const matchesInt = t.internationalName?.toLowerCase().includes(search);
      return matchesName || matchesInt;
    })
    .slice(0, 5);

  const audioRef = useRef<HTMLAudioElement>(null);
  const volumeRef = useRef(volume);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  // Sync volume when setting changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Handle track autoplay, reload, and crescendo on new turn
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = 0; // Start at 0 for crescendo
      audioRef.current.load();
      audioRef.current.play().catch(() => {});

      // Crescendo (fade-in) over 2 seconds
      const targetVolume = volumeRef.current;
      const duration = 2000; // 2s
      const tickRate = 50; // ms per step
      const steps = duration / tickRate;
      let currentStep = 0;

      const crescendoInterval = setInterval(() => {
        currentStep++;
        if (audioRef.current) {
          const currentVol = (currentStep / steps) * targetVolume;
          audioRef.current.volume = Math.min(targetVolume, currentVol);
        }
        if (currentStep >= steps) {
          clearInterval(crescendoInterval);
        }
      }, tickRate);

      return () => clearInterval(crescendoInterval);
    }
  }, [turn]);

  // Enable play after user interaction
  useEffect(() => {
    const handleInteraction = () => {
      if (audioRef.current?.paused) {
        audioRef.current.play().catch(() => {});
      }
      document.removeEventListener("click", handleInteraction);
    };
    document.addEventListener("click", handleInteraction);
    return () => document.removeEventListener("click", handleInteraction);
  }, []);

  // Countdown timer ticks down every second
  useEffect(() => {
    if (timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft]);

  // State machine transitions when timer hits 0
  useEffect(() => {
    if (timeLeft <= 0) {
      if (phase === "guessing") {
        // Transition to show answer phase (5 seconds) - music keeps playing!
        setPhase("answer");
        setTimeLeft(5);
        setGuessingArtist(false);
        setGuessingSong(false);
        setShowArtistSuggestions(false);
        setShowTrackSuggestions(false);
        sendAnswer(artistGuess, trackGuess, turn);
      } else if (phase === "answer") {
        if (turn === toPlay.length) {
          // Si c'est le dernier morceau, on passe directement aux résultats sans transition
          setTurn((prev) => prev + 1);
        } else {
          // Transition to inter-turn pause phase (2 seconds) - music fades out!
          setPhase("transition");
          setTimeLeft(2);
        }
      } else if (phase === "transition") {
        // Transition to next turn, restart guessing (time seconds)
        setTurn((prev) => prev + 1);
        setPhase("guessing");
        setTimeLeft(time);
        setArtistGuess("");
        setTrackGuess("");
        setPlayers((prev) =>
          prev.map((p) => ({
            ...p,
            artist_answer: false,
            artist_score: 0,
            track_answer: false,
          })),
        );
      }
    }
  }, [
    timeLeft,
    phase,
    time,
    turn,
    toPlay,
    artistGuess,
    trackGuess,
    sendAnswer,
    setPlayers,
    setTurn,
    setPhase,
    setTimeLeft,
  ]);

  // Local decrescendo (fade out) of the audio during the last 2s of the answer phase
  useEffect(() => {
    if (!audioRef.current) return;

    if (phase === "answer" && timeLeft <= 2 && timeLeft > 0) {
      const startVolume = audioRef.current.volume;
      const duration = timeLeft * 1000; // remaining time in ms
      const tickRate = 50; // ms per volume step
      const steps = duration / tickRate;
      let currentStep = 0;

      const fadeInterval = setInterval(() => {
        currentStep++;
        if (audioRef.current) {
          const targetVolume = Math.max(
            0,
            startVolume * (1 - currentStep / steps),
          );
          audioRef.current.volume = targetVolume;
        }
        if (currentStep >= steps) {
          clearInterval(fadeInterval);
          if (audioRef.current) {
            audioRef.current.pause();
          }
        }
      }, tickRate);

      return () => clearInterval(fadeInterval);
    } else if (phase === "transition") {
      // Ensure audio is fully silent and paused during transition (Phase 3)
      audioRef.current.volume = 0;
      audioRef.current.pause();
    } else if (phase === "guessing") {
      // Reset volume to global setting at start of turn/guessing phase
      audioRef.current.volume = volume;
    }
  }, [timeLeft, phase, volume]);

  const currentTrack = toPlay[turn - 1];

  if (!currentTrack) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-(--accent) border-t-transparent"></div>
          <p className="text-lg text-gray-400">Chargement de la partie...</p>
        </div>
      </div>
    );
  }

  const trackImage = currentTrack.imageUrl || null;
  const totalPhaseTime =
    phase === "guessing" ? time : phase === "transition" ? 2 : 5;
  const showAnswer = phase === "answer" || phase === "transition";

  const handleVolume = (operation: "up" | "down") => {
    if (operation === "up") {
      if (volume < 1) {
        const newVolume = Math.min(1, Math.round((volume + 0.1) * 10) / 10);
        setVolume(newVolume);
        socket?.emit("volume", newVolume);
      }
    } else if (operation === "down") {
      if (volume > 0) {
        const newVolume = Math.max(0, Math.round((volume - 0.1) * 10) / 10);
        setVolume(newVolume);
        socket?.emit("volume", newVolume);
      }
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <audio ref={audioRef} autoPlay src={currentTrack.previewUrl}></audio>

      {/* Bouton quitter */}
      <button
        className="absolute top-4 right-4 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-(--accent) p-2 font-semibold text-(--white) shadow-md transition-all hover:scale-105 hover:bg-(--semiaccent) hover:shadow-lg active:scale-95"
        onClick={() => quitGame()}
        aria-label="Quitter la partie"
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

      <div
        className={`flex w-full flex-col items-center gap-4 transition-opacity duration-500 ${
          phase === "transition"
            ? "pointer-events-none opacity-0 select-none"
            : "opacity-100"
        }`}
      >
        {(guessingArtist || guessingSong) && (
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-all duration-300"
            onClick={() => {
              setGuessingArtist(false);
              setGuessingSong(false);
              setShowArtistSuggestions(false);
              setShowTrackSuggestions(false);
            }}
          />
        )}
        <h1>Music Blender</h1>
        <section className="relative w-full max-w-72 overflow-hidden rounded-lg">
          {trackImage ? (
            <Image
              src={trackImage}
              alt="Cover"
              width={100}
              height={100}
              className={`mx-auto aspect-square w-full overflow-hidden object-cover transition-all ${phase === "guessing" ? "blur-md" : "blur-none duration-300"}`}
            />
          ) : (
            <div className="flex aspect-square w-full items-center justify-center rounded-2xl bg-gray-700 text-sm text-gray-400">
              {"Pas d'image"}
            </div>
          )}

          {/* Overlay de réponse attendu */}
          {showAnswer && (
            <div
              className={`absolute top-0 left-0 flex h-full w-full flex-col items-center justify-center gap-1 bg-black/75 px-8 opacity-100 transition-all duration-300 md:left-1/2 md:-translate-x-1/2`}
            >
              <p className="text-base">La réponse est :</p>
              <p className="text-xl font-bold text-(--white)">
                {currentTrack.artist}
              </p>
              <div className="flex flex-col items-center">
                <p className="text-center text-lg text-(--white)">
                  {currentTrack.name}
                </p>
                {currentTrack.internationalName !==
                  currentTrack.name.toLowerCase().replace(/\s+/g, "") && (
                  <p className="text-md text-center text-(--grey)/50 italic">
                    {currentTrack.internationalName}
                  </p>
                )}
              </div>
            </div>
          )}

          {!showAnswer && (
            <>
              <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 items-center gap-4">
                <button
                  className={`aspect-square h-8 w-8 rounded-full bg-(--white) text-(--background) transition-all duration-100 ease-out hover:scale-105 active:scale-95 ${volume === 0 ? "cursor-not-allowed opacity-50" : ""}`}
                  onClick={() => {
                    handleVolume("down");
                  }}
                >
                  -
                </button>
                <p>{Math.round(volume * 10) / 10}</p>
                <button
                  className={`aspect-square h-8 w-8 rounded-full bg-(--white) text-(--background) transition-all duration-100 ease-out hover:scale-105 active:scale-95 ${volume === 1 ? "cursor-not-allowed opacity-50" : ""}`}
                  onClick={() => {
                    handleVolume("up");
                  }}
                >
                  +
                </button>
              </div>
              <div className="overlay-cover absolute top-0 left-1/2 h-full w-full -translate-x-1/2"></div>
            </>
          )}

          {/* Compteur de tours */}
          <div className="absolute top-2 right-2">
            <p className="text-sm">
              {turn}/{toPlay.length}
            </p>
          </div>
        </section>

        <section className="relative flex w-full flex-col gap-4">
          {/* Wrapper Artiste */}
          <div className="relative h-18 w-full">
            <motion.div
              layout
              transition={{ type: "spring", stiffness: 350, damping: 35 }}
              className={`flex flex-col ${
                guessingArtist
                  ? "fixed top-[20%] left-1/2 z-50 w-80 max-w-[90vw] -translate-x-1/2"
                  : "absolute inset-0"
              }`}
              onClick={() => {
                if (phase !== "guessing") return;
                setGuessingSong(false);
                setGuessingArtist(true);
                const query = getArtistQuery(artistGuess);
                if (query.length > 2) {
                  setShowArtistSuggestions(true);
                }
              }}
            >
              <div className="flex w-full justify-between">
                <label htmlFor="artist-guess" className="mb-1 text-xl">
                  Artiste
                </label>
                {guessingArtist && (
                  <span className="text-xs text-(--grey) italic">
                    Temps restants : {timeLeft}s
                  </span>
                )}
              </div>

              <input
                id="artist-guess"
                type="text"
                className={`w-full rounded-lg px-4 py-2 focus:ring-2 focus:ring-(--accent) focus:outline-none ${
                  showAnswer
                    ? me?.artist_score === 1
                      ? "bg-(--green) text-white"
                      : me?.artist_score === 0.5
                        ? "bg-amber-500 text-white"
                        : "bg-(--red) text-white"
                    : "bg-(--white) text-(--background)"
                }`}
                value={artistGuess}
                onFocus={() => {
                  if (phase !== "guessing") return;
                  setGuessingSong(false);
                  setGuessingArtist(true);
                  const query = getArtistQuery(artistGuess);
                  if (query.length > 2) {
                    setShowArtistSuggestions(true);
                  }
                }}
                onChange={(e) => {
                  setArtistGuess(e.target.value);
                  const query = getArtistQuery(e.target.value);
                  if (query.length > 2) {
                    setShowArtistSuggestions(true);
                  } else {
                    setShowArtistSuggestions(false);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Tab") {
                    setShowArtistSuggestions(false);
                    return;
                  }
                  if (showArtistSuggestions && filteredArtists.length > 0) {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setActiveArtistIndex((prev) =>
                        prev < filteredArtists.length - 1 ? prev + 1 : 0,
                      );
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setActiveArtistIndex((prev) =>
                        prev > 0 ? prev - 1 : filteredArtists.length - 1,
                      );
                    } else if (e.key === "Enter") {
                      e.preventDefault();
                      const indexToSelect =
                        activeArtistIndex >= 0 &&
                        activeArtistIndex < filteredArtists.length
                          ? activeArtistIndex
                          : 0;
                      const selectedName =
                        filteredArtists[indexToSelect].artist;

                      const parts = artistGuess.split(",");
                      parts[parts.length - 1] = " " + selectedName;
                      const newValue =
                        parts
                          .map((p) => p.trim())
                          .filter(Boolean)
                          .join(", ") + ", ";

                      setArtistGuess(newValue);
                      setShowArtistSuggestions(false);
                      setActiveArtistIndex(-1);
                    } else if (e.key === "Escape") {
                      setGuessingArtist(false);
                      setShowArtistSuggestions(false);
                      e.currentTarget.blur();
                    }
                  } else {
                    if (e.key === "Enter" || e.key === "Escape") {
                      setGuessingArtist(false);
                      setShowArtistSuggestions(false);
                      e.currentTarget.blur();
                    }
                  }
                }}
                autoComplete="off"
              />
              {showArtistSuggestions && artistQuery.length > 2 && (
                <div className="absolute top-full right-0 left-0 z-50 mt-2 flex max-h-60 flex-col overflow-hidden overflow-y-auto rounded-xl border border-neutral-800/80 bg-neutral-900/95 shadow-2xl backdrop-blur-md">
                  {filteredArtists.length > 0 ? (
                    filteredArtists.map((artist, idx) => (
                      <div
                        key={artist.artist + "-" + idx}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          const parts = artistGuess.split(",");
                          parts[parts.length - 1] = " " + artist.artist;
                          const newValue =
                            parts
                              .map((p) => p.trim())
                              .filter(Boolean)
                              .join(", ") + ", ";

                          setArtistGuess(newValue);
                          setShowArtistSuggestions(false);
                          setActiveArtistIndex(-1);
                        }}
                        className={`grid cursor-pointer grid-cols-3 items-center justify-between border-b border-neutral-800/50 px-4 py-3 text-sm transition-colors duration-150 last:border-0 ${
                          idx === activeArtistIndex
                            ? "bg-(--semiaccent) text-(--white)"
                            : "text-gray-200 hover:bg-(--semiaccent) hover:text-(--white)"
                        }`}
                      >
                        <span className="col-span-2 font-medium">
                          {artist.artist}
                        </span>
                        {artist.internationalArtist &&
                          artist.internationalArtist !== artist.artist && (
                            <span className="text-right text-xs text-gray-400 italic">
                              ({artist.internationalArtist})
                            </span>
                          )}
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-sm text-gray-400 italic">
                      Aucun artiste trouvé
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </div>

          {/* Wrapper Chanson */}
          <div className="relative h-18 w-full">
            <motion.div
              layout
              transition={{ type: "spring", stiffness: 350, damping: 35 }}
              className={`flex flex-col ${
                guessingSong
                  ? "fixed top-[20%] left-1/2 z-50 w-80 max-w-[90vw] -translate-x-1/2"
                  : "absolute inset-0"
              }`}
              onClick={() => {
                if (phase !== "guessing") return;
                setGuessingArtist(false);
                setGuessingSong(true);
                if (trackGuess.length > 2) {
                  setShowTrackSuggestions(true);
                }
              }}
            >
              <div className="flex w-full justify-between">
                <label htmlFor="track-guess" className="mb-1 text-xl">
                  Chanson
                </label>
                {guessingSong && (
                  <span className="text-xs text-(--grey) italic">
                    Temps restants : {timeLeft}s
                  </span>
                )}
              </div>

              <input
                id="track-guess"
                type="text"
                className={`w-full rounded-lg px-4 py-2 focus:ring-2 focus:ring-(--accent) focus:outline-none ${
                  showAnswer
                    ? me?.track_answer
                      ? "bg-(--green) text-white"
                      : "bg-(--red) text-white"
                    : "bg-(--white) text-(--background)"
                }`}
                value={trackGuess}
                onFocus={() => {
                  if (phase !== "guessing") return;
                  setGuessingArtist(false);
                  setGuessingSong(true);
                  if (trackGuess.length > 2) {
                    setShowTrackSuggestions(true);
                  }
                }}
                onChange={(e) => {
                  setTrackGuess(e.target.value);
                  if (e.target.value.length > 2) {
                    setShowTrackSuggestions(true);
                  } else {
                    setShowTrackSuggestions(false);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Tab") {
                    setShowTrackSuggestions(false);
                    return;
                  }
                  if (showTrackSuggestions && filteredTracks.length > 0) {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setActiveTrackIndex((prev) =>
                        prev < filteredTracks.length - 1 ? prev + 1 : 0,
                      );
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setActiveTrackIndex((prev) =>
                        prev > 0 ? prev - 1 : filteredTracks.length - 1,
                      );
                    } else if (e.key === "Enter") {
                      e.preventDefault();
                      const indexToSelect =
                        activeTrackIndex >= 0 &&
                        activeTrackIndex < filteredTracks.length
                          ? activeTrackIndex
                          : 0;
                      setTrackGuess(filteredTracks[indexToSelect].name);
                      setShowTrackSuggestions(false);
                      setGuessingSong(false);
                      e.currentTarget.blur();
                    } else if (e.key === "Escape") {
                      setGuessingSong(false);
                      setShowTrackSuggestions(false);
                      e.currentTarget.blur();
                    }
                  } else {
                    if (e.key === "Enter" || e.key === "Escape") {
                      setGuessingSong(false);
                      setShowTrackSuggestions(false);
                      e.currentTarget.blur();
                    }
                  }
                }}
                autoComplete="off"
              />
              {showTrackSuggestions && trackGuess.length > 2 && (
                <div className="absolute top-full right-0 left-0 z-50 mt-2 flex max-h-60 flex-col overflow-hidden overflow-y-auto rounded-xl border border-neutral-800/80 bg-neutral-900/95 shadow-2xl backdrop-blur-md">
                  {filteredTracks.length > 0 ? (
                    filteredTracks.map((track, idx) => (
                      <div
                        key={track.name + "-" + idx}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setTrackGuess(track.name);
                          setShowTrackSuggestions(false);
                          setGuessingSong(false);
                        }}
                        className={`grid cursor-pointer grid-cols-3 items-center justify-between border-b border-neutral-800/50 px-4 py-3 text-sm transition-colors duration-150 last:border-0 ${
                          idx === activeTrackIndex
                            ? "bg-(--semiaccent) text-(--white)"
                            : "text-gray-200 hover:bg-(--semiaccent) hover:text-(--white)"
                        }`}
                      >
                        <span className="col-span-2 font-medium">
                          {track.name}
                        </span>
                        {track.internationalName &&
                          track.internationalName !== track.name && (
                            <span className="text-right text-xs text-gray-400 italic">
                              ({track.internationalName})
                            </span>
                          )}
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-sm text-gray-400 italic">
                      Aucune chanson trouvée
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        </section>
      </div>

      {/* Barre de temps */}
      <div className="pointer-events-none mt-4 flex w-[calc(100vw-4rem)] max-w-lg flex-col items-center gap-2 md:w-1/2">
        <span className="text-sm font-semibold tracking-wider text-gray-300">
          {phase === "guessing"
            ? `Temps restant : ${timeLeft}s`
            : phase === "transition"
              ? `Prochain tour : ${timeLeft}s`
              : `Révélation : ${timeLeft}s`}
        </span>
        <div className="h-2 w-full overflow-hidden rounded-full bg-(--white)/20">
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-linear ${
              phase === "guessing"
                ? "bg-(--accent)"
                : phase === "transition"
                  ? "bg-(--grey)"
                  : "bg-(--green)"
            }`}
            style={{
              width: `${((totalPhaseTime - timeLeft) / totalPhaseTime) * 100}%`,
            }}
          ></div>
        </div>
      </div>

      {/* Affichage des erreurs */}
      <Error error={error} setError={setError} />
      <Message message={message} setMessage={setMessage} />
    </div>
  );
}
