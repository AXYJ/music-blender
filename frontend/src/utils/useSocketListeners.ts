import { Socket } from "socket.io-client";
import { useEffect, useRef } from "react";
import {
  Player,
  View,
  Track,
  DatabaseArtist,
  DatabaseTrack,
} from "../types/game";
import { getSocketUrl } from "./config";
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
  setPhase: React.Dispatch<
    React.SetStateAction<"guessing" | "answer" | "transition">
  >;
  setTimeLeft: React.Dispatch<React.SetStateAction<number>>;
  time: number;
  t: (key: string, replace?: Record<string, string>) => string;
  playerId?: string;
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
    time,
    t,
    playerId,
  } = props;

  const playlistUrlRef = useRef<string>(playlistUrl);
  playlistUrlRef.current = playlistUrl;

  const viewRef = useRef<View>(view);
  viewRef.current = view;

  useEffect(() => {
    if (!socket) return;

    // Keep-alive pour éviter que le serveur (ex: Render) ne mette le socket en veille (uniquement en production)
    const socketUrl = getSocketUrl();
    const isLocal =
      socketUrl.includes("localhost") ||
      socketUrl.includes("127.0.0.1") ||
      socketUrl.includes("192.168.") ||
      socketUrl.includes("10.") ||
      socketUrl.includes(".local");

    let keepAliveInterval: NodeJS.Timeout | null = null;
    if (!isLocal) {
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

    const handleConnectError = (err: Error) => {
      setError(t("errors.connection_error"));
      setIsConnected(false);
      setView("home");
    };

    const handleDisconnect = (reason: string) => {
      console.log("Socket déconnecté:", reason);
      setIsConnected(false);
      if (
        reason === "io server disconnect" ||
        reason === "io client disconnect"
      ) {
        setView("home");
        setError(t("errors.disconnected"));
      }
    };

    // ----------------
    // Gestion des erreurs
    // ----------------
    const handleError = (error: string) => {
      if (error.startsWith("playlist_load_error:")) {
        const name = error.substring("playlist_load_error:".length);
        setError(t("errors.playlist_load_error", { name }));
      } else {
        const translated = t(`errors.${error}`);
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
    const handleRoomCreated = (roomCode: string, players: Player[]) => {
      setRoomCode(roomCode);
      setPlayers(players);
      setView("lobby");
      const me = players.find(
        (p: Player) =>
          (playerId && p.id === playerId) || p.socketId === socket.id,
      );
      if (me) {
        setName(me.name);
      }
    };

    const handleRoomUpdated = (roomCode: string, players: Player[]) => {
      if (viewRef.current !== "game" && viewRef.current !== "result") {
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
      setPlayers(players);
      socket.emit("send_playlist_url", playlistUrlRef.current);
    };
    socket.on("game_started", handleGameStarted);

    const handleDataLoaded = (
      toPlay: Track[],
      database_artists: DatabaseArtist[],
      database_tracks: DatabaseTrack[],
    ) => {
      setView("game");
      setToPlay(toPlay);
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
      console.log("Game setting:", key, value);
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
      setPlayers(players);
    };

    socket.on("answer", handleAnswer);
    socket.on("final_scores", handleFinalScores);

    const handleNoPlaylist = () => {
      setError(t("errors.no_playlist_tracks"));
      setView("lobby");
      setTimeout(() => {
        setError(null);
      }, 2000);
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
      setPlayers(players);
      setView("lobby");
    };

    socket.on("game_reset", handleGameReset);

    const handleGameReconnected = (data: {
      toPlay: Track[];
      database_artists: DatabaseArtist[];
      database_tracks: DatabaseTrack[];
      turn: number;
      phase: "guessing" | "answer" | "transition";
      timeLeft: number;
      time: number;
    }) => {
      setToPlay(data.toPlay);
      setDatabaseArtists(data.database_artists);
      setDatabaseTracks(data.database_tracks);
      setTurn(data.turn);
      setPhase(data.phase);
      setTimeLeft(data.timeLeft);
      setTime(data.time);
      setView("game");
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
    time,
  ]);
};
