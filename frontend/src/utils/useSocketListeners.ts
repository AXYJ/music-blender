import { Socket } from "socket.io-client";
import { useEffect, useRef } from "react";
import {
  Player,
  View,
  Track,
  DatabaseArtist,
  DatabaseTrack,
  GameClock,
  GamePhase,
  GameTiming,
} from "../types/game";
import { toGameClock } from "./gameClock";
import { getSocketUrl, isLocalHost } from "./config";
import { getSessionItem, setSessionItem } from "./storageUtils";

interface SocketListenersProps {
  socket: Socket | null;
  view: View;
  setView: (view: View) => void;
  setError: (error: string | null) => void;
  setRoomCode: (code: string) => void;
  setPlayers: (players: Player[] | ((prev: Player[]) => Player[])) => void;
  setIsConnected: (connected: boolean) => void;
  setName: (name: string) => void;
  setMusicAmount: (amount: number) => void;
  setTime: (time: number) => void;
  playlistUrl: string;
  setToPlay: (toPlay: Track[]) => void;
  setDatabaseArtists: (database_artists: DatabaseArtist[]) => void;
  setDatabaseTracks: (database_tracks: DatabaseTrack[]) => void;
  setTurn: React.Dispatch<React.SetStateAction<number>>;
  setPhase: React.Dispatch<React.SetStateAction<GamePhase>>;
  setTimeLeft: React.Dispatch<React.SetStateAction<number>>;
  setGameClock: (clock: GameClock | null) => void;
  time: number;
  t: (key: string, replace?: Record<string, string>) => string;
  setPlayerId: (id: string) => void;
}

export const useSocketListeners = (props: SocketListenersProps) => {
  const {
    socket,
    view,
    setView,
    setError,
    setRoomCode,
    setPlayers,
    setIsConnected,
    setName,
    setMusicAmount,
    setTime,
    playlistUrl,
    setToPlay,
    setDatabaseArtists,
    setDatabaseTracks,
    setTurn,
    setPhase,
    setTimeLeft,
    setGameClock,
    time,
    t,
    setPlayerId,
  } = props;

  // Dernières valeurs des props, lues par les handlers sans réenregistrer les
  // écouteurs (sinon les erreurs resteraient dans l'ancienne langue)
  const latestRef = useRef({ t, view, playlistUrl });
  useEffect(() => {
    latestRef.current = { t, view, playlistUrl };
  });

  useEffect(() => {
    if (!socket) return;

    // Keep-alive pour éviter que le serveur (ex: Render) ne mette le socket en veille (uniquement en production)
    const socketUrl = getSocketUrl();
    let keepAliveInterval: NodeJS.Timeout | null = null;
    if (!isLocalHost(new URL(socketUrl).hostname)) {
      keepAliveInterval = setInterval(
        () => {
          fetch(socketUrl, { mode: "no-cors" }).catch(() => {
            // Ignorer silencieusement les échecs de ping keep-alive
          });
        },
        5 * 60 * 1000,
      );
    }

    // ----------------
    // Connexion & Cycle de vie
    // ----------------
    const handleConnect = () => {
      setIsConnected(true);
    };

    if (socket.connected) {
      setIsConnected(true);
    }

    const handleConnectError = () => {
      setError(latestRef.current.t("errors.connection_error"));
      setIsConnected(false);
      setView("home");
    };

    const handleDisconnect = (reason: string) => {
      setIsConnected(false);
      if (
        reason === "io server disconnect" ||
        reason === "io client disconnect"
      ) {
        setView("home");
        setError(latestRef.current.t("errors.disconnected"));
      }
    };

    // ----------------
    // Gestion des erreurs
    // ----------------
    const handleError = (error: string) => {
      if (error.startsWith("playlist_load_error:")) {
        const name = error.substring("playlist_load_error:".length);
        setError(latestRef.current.t("errors.playlist_load_error", { name }));
      } else {
        const translated = latestRef.current.t(`errors.${error}`);
        if (translated !== `errors.${error}`) {
          setError(translated);
        } else {
          setError(error);
        }
      }

      if (error === "room_not_found" || error === "room_full") {
        setRoomCode("");
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("game_code");
        }
        setView("home");
      }
    };

    socket.on("connect", handleConnect);
    socket.on("connect_error", handleConnectError);
    socket.on("disconnect", handleDisconnect);
    socket.on("error", handleError);

    // ----------------
    // Gestion des parties
    // ----------------
    // Le serveur ne donne aux joueurs que des identifiants publics. On retrouve le sien
    // grâce à sa socket et on le garde : il reste valable après une reconnexion,
    // quand socketId n'a pas encore été mis à jour dans la liste reçue.
    const rememberMe = (players: Player[]) => {
      const me = players.find((p) => p.socketId === socket.id);
      if (me) setPlayerId(me.id);
      return me;
    };

    const handleRoomCreated = (roomCode: string, players: Player[]) => {
      setRoomCode(roomCode);
      setPlayers(players);
      setView("lobby");
      const me = rememberMe(players);
      if (me) {
        setName(me.name);
      }
    };

    const handleRoomUpdated = (roomCode: string, players: Player[]) => {
      rememberMe(players);
      if (
        latestRef.current.view !== "game" &&
        latestRef.current.view !== "result"
      ) {
        setView("lobby");
      }
      setPlayers((prev) => {
        return players.map((p) => {
          const existing = prev.find((x) => x.id === p.id);
          if (existing) {
            return {
              ...p,
              artist_answer: existing.artist_answer,
              artist_score: existing.artist_score,
              track_answer: existing.track_answer,
            };
          }
          return p;
        });
      });
      setRoomCode(roomCode);
    };

    socket.on("room_created", handleRoomCreated);
    socket.on("room_updated", handleRoomUpdated);

    const handleGameStarted = (players: Player[]) => {
      rememberMe(players);
      setPlayers(players);
      socket.emit("send_playlist_url", latestRef.current.playlistUrl);
    };
    socket.on("game_started", handleGameStarted);

    const handleDataLoaded = (
      toPlay: Track[],
      database_artists: DatabaseArtist[],
      database_tracks: DatabaseTrack[],
      timing: GameTiming,
    ) => {
      setView("game");
      setToPlay(toPlay);
      setGameClock(toGameClock(timing));
      setTurn(1);
      setPhase("guessing");
      setTimeLeft(time);

      const cachedArtists: DatabaseArtist[] = getSessionItem<DatabaseArtist[]>(
        "database_artists",
        [],
      );
      const cachedTracks: DatabaseTrack[] = getSessionItem<DatabaseTrack[]>(
        "database_tracks",
        [],
      );

      const artistMap = new Map<string, DatabaseArtist>();
      for (const a of cachedArtists) {
        const key = (a?.artist || "").toLowerCase().trim();
        if (key) artistMap.set(key, a);
      }
      for (const a of database_artists) {
        const key = (a?.artist || "").toLowerCase().trim();
        if (key) {
          const existing = artistMap.get(key);
          if (!existing || a.internationalArtist) {
            artistMap.set(key, a);
          }
        }
      }
      const mergedArtists = Array.from(artistMap.values());

      const trackMap = new Map<string, DatabaseTrack>();
      for (const t of cachedTracks) {
        const key = (t?.name || "").toLowerCase().trim();
        if (key) trackMap.set(key, t);
      }
      for (const t of database_tracks) {
        const key = (t?.name || "").toLowerCase().trim();
        if (key) {
          const existing = trackMap.get(key);
          if (!existing || t.internationalName) {
            trackMap.set(key, t);
          }
        }
      }
      const mergedTracks = Array.from(trackMap.values());

      setSessionItem("database_artists", mergedArtists);
      setSessionItem("database_tracks", mergedTracks);

      setDatabaseArtists(mergedArtists);
      setDatabaseTracks(mergedTracks);
    };

    socket.on("data_loaded", handleDataLoaded);

    // ----------------
    // Gestion des paramètres de partie
    // ----------------
    const handleGameSetting = (key: string, value: number) => {
      if (key === "music_amount") {
        setMusicAmount(value);
      } else if (key === "time") {
        setTime(value);
      }
    };

    socket.on("game-setting", handleGameSetting);

    // ----------------
    // Gestion des réponses des joueurs
    // ----------------
    const handleAnswer = (
      name: string,
      artist_answer: boolean | number,
      track_answer: boolean,
    ) => {
      setPlayers((prev) =>
        prev.map((p) => {
          if (p.name === name) {
            let isCorrect = false;
            let scoreVal = 0;

            if (typeof artist_answer === "number") {
              isCorrect = artist_answer > 0;
              scoreVal = artist_answer;
            } else {
              isCorrect = artist_answer;
              scoreVal = artist_answer ? 1 : 0;
            }

            return {
              ...p,
              artist_answer: isCorrect,
              artist_score: scoreVal,
              track_answer,
            };
          }
          return p;
        }),
      );
    };

    const handleFinalScores = (players: Player[]) => {
      rememberMe(players);
      setPlayers(players);
    };

    socket.on("answer", handleAnswer);
    socket.on("final_scores", handleFinalScores);

    const handleNoPlaylist = () => {
      setError(latestRef.current.t("errors.no_playlist_tracks"));
      setView("lobby");
    };

    socket.on("no_playlist", handleNoPlaylist);

    const handleGameReset = (
      rules: { musicAmount?: number; time?: number },
      players: Player[],
    ) => {
      if (rules) {
        if (rules.musicAmount !== undefined) setMusicAmount(rules.musicAmount);
        if (rules.time !== undefined) setTime(rules.time);
      }
      rememberMe(players);
      setPlayers(players);
      setView("lobby");
    };

    socket.on("game_reset", handleGameReset);

    const handleGameReconnected = (data: {
      toPlay: Track[];
      database_artists: DatabaseArtist[];
      database_tracks: DatabaseTrack[];
      turn: number;
      phase: GamePhase;
      timeLeft: number;
      time: number;
      timing: GameTiming;
    }) => {
      setGameClock(toGameClock(data.timing));
      setToPlay(data.toPlay);
      setDatabaseArtists(data.database_artists);
      setDatabaseTracks(data.database_tracks);
      setTurn(data.turn);
      setPhase(data.phase);
      setTimeLeft(data.timeLeft);
      setTime(data.time);
      if (data.turn > data.toPlay.length) {
        // Partie déjà terminée : directement les résultats
        socket.emit("get_final_scores");
        setView("result");
      } else {
        setView("game");
      }
    };

    socket.on("game_reconnected", handleGameReconnected);

    return () => {
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
      }
      socket.off("connect", handleConnect);
      socket.off("connect_error", handleConnectError);
      socket.off("disconnect", handleDisconnect);
      socket.off("error", handleError);
      socket.off("room_created", handleRoomCreated);
      socket.off("room_updated", handleRoomUpdated);
      socket.off("game-setting", handleGameSetting);
      socket.off("game_started", handleGameStarted);
      socket.off("data_loaded", handleDataLoaded);
      socket.off("answer", handleAnswer);
      socket.off("final_scores", handleFinalScores);
      socket.off("no_playlist", handleNoPlaylist);
      socket.off("game_reset", handleGameReset);
      socket.off("game_reconnected", handleGameReconnected);
    };
  }, [
    socket,
    setView,
    setError,
    setIsConnected,
    setRoomCode,
    setPlayers,
    setName,
    setMusicAmount,
    setTime,
    setToPlay,
    setDatabaseArtists,
    setDatabaseTracks,
    setTurn,
    setPhase,
    setTimeLeft,
    setGameClock,
    setPlayerId,
    time,
  ]);
};
