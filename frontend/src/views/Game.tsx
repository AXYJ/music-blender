"use client";

// Import de react
import { useState, useEffect, useRef } from "react";

// Import des composants
import Error from "@/components/alert/Error";
import Message from "@/components/alert/Message";
import Stepper from "@/components/stepper/Stepper";
import TrackCover from "@/components/track/TrackCover";
import AutocompleteInput from "@/components/autocomplete/AutocompleteInput";
import QuitGame from "@/components/button/QuitGame";

// Import du contexte
import { useGame } from "@/context/GameContext";
import { useTranslation } from "@/context/LanguageContext";

// Import des utilitaires
import { normalizeString } from "@/utils/stringUtils";

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

  const { t } = useTranslation();

  // Find current player profile
  const me = players?.find((p) => p.socketId === socket?.id);
  const [artistGuess, setArtistGuess] = useState<string>("");
  const [trackGuess, setTrackGuess] = useState<string>("");
  const [guessingArtist, setGuessingArtist] = useState<boolean>(false);
  const [guessingSong, setGuessingSong] = useState<boolean>(false);
  const [isChangingVolume, setIsChangingVolume] = useState<boolean>(false);
  const volumeControlRef = useRef<HTMLDivElement>(null);

  // Close volume control when clicking outside
  useEffect(() => {
    if (!isChangingVolume) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        volumeControlRef.current &&
        !volumeControlRef.current.contains(event.target as Node)
      ) {
        setIsChangingVolume(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isChangingVolume]);

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
      const search = normalizeString(artistQuery);
      const matchesName = normalizeString(a.artist).includes(search);
      const matchesInt = normalizeString(a.internationalArtist).includes(
        search,
      );
      return matchesName || matchesInt;
    })
    .slice(0, 5);

  // Filter database tracks (max 5 results)
  const filteredTracks = (database_tracks || [])
    .filter((t) => {
      if (!trackGuess || trackGuess.length < 3) return false;
      const search = normalizeString(trackGuess);
      const matchesName = normalizeString(t.name).includes(search);
      const matchesInt = normalizeString(t.internationalName).includes(search);
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
          <p className="text-lg text-gray-400">{t("game.loading")}</p>
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
    <div className="relative mx-auto my-16 flex min-h-[calc(100vh-128px)] max-w-4xl flex-col items-center justify-center gap-4 px-4">
      <audio ref={audioRef} src={currentTrack.previewUrl}></audio>

      <QuitGame />

      <div
        className={`flex w-full flex-col items-center gap-4 transition-opacity duration-500 ${
          phase === "transition"
            ? "pointer-events-none opacity-0 select-none"
            : "opacity-100"
        }`}
      >
        <TrackCover
          imageUrl={trackImage}
          artist={currentTrack.artist}
          name={currentTrack.name}
          internationalName={currentTrack.internationalName}
          counterText={`${turn}/${toPlay.length}`}
          blurImage={phase === "guessing"}
          showAnswerOverlay={showAnswer}
          className="aspect-square w-full max-w-72"
          turn={turn}
        >
          {!showAnswer && (
            <div
              className="absolute right-2 bottom-2 z-10"
              ref={volumeControlRef}
            >
              {/* <Stepper
                value={Math.round(volume * 10) / 10}
                onIncrement={() => handleVolume("up")}
                onDecrement={() => handleVolume("down")}
                minDisabled={volume <= 0}
                maxDisabled={volume >= 1}
              /> */}
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
                className="lucide lucide-volume2-icon lucide-volume-2"
                onClick={() => {
                  setIsChangingVolume(!isChangingVolume);
                }}
              >
                <path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z" />
                <path d="M16 9a5 5 0 0 1 0 6" />
                <path d="M19.364 18.364a9 9 0 0 0 0-12.728" />
              </svg>
              {isChangingVolume && (
                <div className="absolute -top-[250%] left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 -rotate-90">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onMouseDown={() => setIsChangingVolume(true)}
                    onChange={(e) => {
                      setVolume(Number(e.target.value));
                      socket?.emit("volume", Number(e.target.value));
                    }}
                    className="h-2 w-24 cursor-pointer appearance-none rounded-lg bg-gray-200 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-(--accent) [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-(--accent)"
                  />
                </div>
              )}
            </div>
          )}
        </TrackCover>

        <section className="relative flex w-full flex-col gap-4">
          {/* Wrapper Artiste */}
          <div className="relative h-18 w-full">
            <AutocompleteInput
              id="artist-guess"
              label={t("game.artist")}
              value={artistGuess}
              onChange={setArtistGuess}
              suggestions={filteredArtists}
              isActive={guessingArtist}
              onActivate={() => {
                setGuessingSong(false);
                setGuessingArtist(true);
              }}
              onDeactivate={() => setGuessingArtist(false)}
              timeLeft={timeLeft}
              showAnswer={showAnswer}
              isCorrect={me?.artist_score === 1}
              isHalfCorrect={me?.artist_score === 0.5}
              isMultiple={true}
              getSuggestionValue={(item) => item.artist}
              getSuggestionLabel={(item) => ({
                main: item.artist,
                secondary:
                  item.internationalArtist !== item.artist
                    ? item.internationalArtist
                    : undefined,
              })}
              emptyText={t("game.no-artist-found")}
              phase={phase}
            />
          </div>

          {/* Wrapper Chanson */}
          <div className="relative h-18 w-full">
            <AutocompleteInput
              id="track-guess"
              label={t("game.track")}
              value={trackGuess}
              onChange={setTrackGuess}
              suggestions={filteredTracks}
              isActive={guessingSong}
              onActivate={() => {
                setGuessingArtist(false);
                setGuessingSong(true);
              }}
              onDeactivate={() => setGuessingSong(false)}
              timeLeft={timeLeft}
              showAnswer={showAnswer}
              isCorrect={me?.track_answer}
              isMultiple={false}
              getSuggestionValue={(item) => item.name}
              getSuggestionLabel={(item) => ({
                main: item.name,
                secondary:
                  item.internationalName !== item.name
                    ? item.internationalName
                    : undefined,
              })}
              emptyText={t("game.no-track-found")}
              phase={phase}
            />
          </div>
        </section>
      </div>

      {/* Barre de temps */}
      <div className="pointer-events-none mt-4 flex w-[calc(100vw-4rem)] max-w-lg flex-col items-center gap-2 md:w-1/2">
        <span className="text-sm font-semibold tracking-wider text-gray-300">
          {phase === "guessing"
            ? `${t("game.time-remaining")} : ${timeLeft}s`
            : phase === "transition"
              ? `${t("game.next-turn")} : ${timeLeft}s`
              : `${t("game.revelation")} : ${timeLeft}s`}
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
