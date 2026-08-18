"use client";

// Import de next
import Image from "next/image";

// Import de react
import { useState, useEffect, useRef } from "react";

import { motion } from "framer-motion";

// Import des composants

// Import du contexte
import { useGame } from "../context/GameContext";

export default function Game() {
  const {
    toPlay,
    time,
    volume,
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

  // Helper to get the current artist query (the part after the last comma)
  const getArtistQuery = (input: string) => {
    const parts = input.split(",");
    return parts[parts.length - 1].trim();
  };

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
        // Transition to inter-turn pause phase (2 seconds) - music fades out!
        setPhase("transition");
        setTimeLeft(2);
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
  }, [timeLeft, phase, time]);

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

  if (!toPlay || toPlay.length === 0) {
    return (
      <div className="flex flex-col items-center gap-8 min-h-screen justify-center">
        <h1>Music Blender</h1>
        <p>Chargement de la partie...</p>
      </div>
    );
  }

  if (turn > toPlay.length) {
    return (
      <div className="flex flex-col items-center gap-8 min-h-screen justify-center lg:my-16">
        <h1 className="text-4xl font-bold text-(--accent)">
          {players.map((p) => (
            <div key={p.socketId}>
              {p.name} : {p.score}
            </div>
          ))}
        </h1>
        <p className="text-xl">{"Merci d'avoir joué."}</p>
        <button
          className="rounded-full px-8 py-2 bg-(--accent) text-(--white) cursor-pointer"
          onClick={() => restart()}
        >
          Rejouer
        </button>
      </div>
    );
  }

  const currentTrack = toPlay[turn - 1];
  const trackImage = currentTrack.imageUrl || null;
  const totalPhaseTime = phase === "guessing" ? time : 5;
  const showAnswer = phase === "answer";

  return (
    <div className="flex flex-col items-center gap-4 min-h-screen justify-center">
      <audio ref={audioRef} autoPlay src={currentTrack.previewUrl}></audio>

      {phase === "transition" ? (
        <div className="bg-black w-screen h-screen fixed inset-0 z-50 flex items-center justify-center">
          {/* Écran noir durant la transition */}
        </div>
      ) : (
        <>
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
          <section className="w-full relative overflow-hidden">
            {trackImage ? (
              <Image
                src={trackImage}
                alt={currentTrack.name || "Cover"}
                width={100}
                height={100}
                className={`w-full aspect-square transition-all rounded-lg object-cover lg:w-1/2 lg:mx-auto ${phase === "guessing" ? "blur-md" : "blur-none duration-300"}`}
              />
            ) : (
              <div className="w-full aspect-square bg-gray-700 rounded-2xl flex items-center justify-center text-sm text-gray-400">
                {"Pas d'image"}
              </div>
            )}

            <div
              className={`absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center gap-1 transition-all duration-300 px-4 ${showAnswer ? "bg-black/75 opacity-100 pointer-events-auto lg:w-1/2 lg:left-1/2 lg:-translate-x-1/2 " : "bg-black/0 opacity-0 pointer-events-none lg:w-1/2 lg:left-1/2 lg:-translate-x-1/2"}`}
            >
              <p className="text-lg">La réponse est :</p>
              <p className="text-2xl font-bold text-(--white)">
                {currentTrack.artist}
              </p>
              <p className="text-xl text-(--white)">{currentTrack.name}</p>
            </div>
            <div className="absolute top-2 right-2 lg:w-1/2">
              <p className="text-sm">
                {turn}/{toPlay.length}
              </p>
            </div>
          </section>

          <section className="flex flex-col gap-4 w-full">
            {/* Wrapper Artiste */}
            <div className="h-18 w-full relative">
              <motion.div
                layout
                transition={{ type: "spring", stiffness: 350, damping: 35 }}
                className={`flex flex-col ${
                  guessingArtist
                    ? "fixed top-[20%] left-1/2 -translate-x-1/2 z-50 w-80 max-w-[90vw]"
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
                <label htmlFor="artist-guess" className="text-xl mb-1">
                  Artiste
                </label>
                <input
                  id="artist-guess"
                  type="text"
                  className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-(--accent) ${
                    phase === "answer"
                      ? me?.artist_score === 1
                        ? "bg-(--green) text-white"
                        : me?.artist_score === 0.5
                          ? "bg-amber-500 text-white"
                          : "bg-(--red) text-white"
                      : "text-(--background) bg-(--white)"
                  }`}
                  value={artistGuess}
                  onFocus={() => {
                    if (phase !== "guessing") return;
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
                  <div className="absolute top-full left-0 right-0 z-50 mt-2 max-h-60 overflow-y-auto rounded-xl bg-neutral-900/95 border border-neutral-800/80 shadow-2xl backdrop-blur-md overflow-hidden flex flex-col">
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
                          className={`px-4 py-3 text-sm transition-colors duration-150 flex items-center justify-between border-b border-neutral-800/50 last:border-0 cursor-pointer ${
                            idx === activeArtistIndex
                              ? "bg-(--semiaccent) text-(--white)"
                              : "text-gray-200 hover:bg-(--semiaccent) hover:text-(--white)"
                          }`}
                        >
                          <span className="font-medium">{artist.artist}</span>
                          {artist.internationalArtist &&
                            artist.internationalArtist !== artist.artist && (
                              <span className="text-xs text-gray-400 italic">
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
            <div className="h-18 w-full relative">
              <motion.div
                layout
                transition={{ type: "spring", stiffness: 350, damping: 35 }}
                className={`flex flex-col ${
                  guessingSong
                    ? "fixed top-[20%] left-1/2 -translate-x-1/2 z-50 w-80 max-w-[90vw]"
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
                <label htmlFor="track-guess" className="text-xl mb-1">
                  Chanson
                </label>
                <input
                  id="track-guess"
                  type="text"
                  className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-(--accent) ${
                    phase === "answer"
                      ? me?.track_answer
                        ? "bg-(--green) text-white"
                        : "bg-(--red) text-white"
                      : "text-(--background) bg-(--white)"
                  }`}
                  value={trackGuess}
                  onFocus={() => {
                    if (phase !== "guessing") return;
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
                  <div className="absolute top-full left-0 right-0 z-50 mt-2 max-h-60 overflow-y-auto rounded-xl bg-neutral-900/95 border border-neutral-800/80 shadow-2xl backdrop-blur-md overflow-hidden flex flex-col">
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
                          className={`px-4 py-3 text-sm transition-colors duration-150 flex items-center justify-between border-b border-neutral-800/50 last:border-0 cursor-pointer ${
                            idx === activeTrackIndex
                              ? "bg-(--semiaccent) text-(--white)"
                              : "text-gray-200 hover:bg-(--semiaccent) hover:text-(--white)"
                          }`}
                        >
                          <span className="font-medium">{track.name}</span>
                          {track.internationalName &&
                            track.internationalName !== track.name && (
                              <span className="text-xs text-gray-400 italic">
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

          <div className="flex flex-col items-center w-[calc(100vw-4rem)] lg:w-1/3 max-w-3xl gap-2 fixed bottom-6 left-1/2 -translate-x-1/2">
            <span className="text-sm font-semibold tracking-wider text-gray-300">
              {phase === "guessing"
                ? `Temps restant : ${timeLeft}s`
                : `Révélation : ${timeLeft}s`}
            </span>
            <div className="w-full bg-(--white)/20 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ease-linear ${phase === "guessing" ? "bg-(--accent)" : "bg-green-500"}`}
                style={{
                  width: `${((totalPhaseTime - timeLeft) / totalPhaseTime) * 100}%`,
                }}
              ></div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
