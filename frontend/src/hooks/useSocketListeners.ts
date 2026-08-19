import { Socket } from "socket.io-client";
import { useEffect, useRef } from "react";
import { Player, View } from "../types/game";
import { getSocketUrl } from "../utils/config";

interface SocketListenersProps {
  socket: Socket | null;
  view: View;
  setView: (view: View) => void;
  setError: (error: string | null) => void;
  setRoomCode: (code: string) => void;
  setPlayers: (players: Player[] | ((prev: Player[]) => Player[])) => void;
  setIsConnected: (connected: boolean) => void;
  setNoMorePlayers: React.Dispatch<React.SetStateAction<boolean>>;
  setName: (name: string) => void;
  setMusicAmount: (amount: number) => void;
  setTime: (time: number) => void;
  playlistUrl: string;
  setToPlay: (toPlay: any[]) => void;
  setDatabaseArtists: (database_artists: any[]) => void;
  setDatabaseTracks: (database_tracks: any[]) => void;
  setTurn: React.Dispatch<React.SetStateAction<number>>;
  setPhase: React.Dispatch<
    React.SetStateAction<"guessing" | "answer" | "transition">
  >;
  setTimeLeft: React.Dispatch<React.SetStateAction<number>>;
  time: number;
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
    setNoMorePlayers,
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
  } = props;

  const playlistUrlRef = useRef(playlistUrl);
  playlistUrlRef.current = playlistUrl;

  const viewRef = useRef(view);
  viewRef.current = view;

  useEffect(() => {
    if (!socket) return;

    // Keep-alive pour éviter que le serveur (ex: Render) ne mette le socket en veille
    const socketUrl = getSocketUrl();
    const keepAliveInterval = setInterval(
      () => {
        fetch(socketUrl).catch((err) =>
          console.error("Erreur keep-alive", err),
        );
      },
      5 * 60 * 1000,
    );

    // ----------------
    // Connexion & Cycle de vie
    // ----------------
    const handleConnect = () => {
      setIsConnected(true);
    };

    const handleConnectError = (err: Error) => {
      setError("Erreur de connexion serveur");
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
        setError("Vous avez été déconnecté du serveur.");
      }
    };

    socket.on("connect", handleConnect);
    socket.on("connect_error", handleConnectError);
    socket.on("disconnect", handleDisconnect);

    // ----------------
    // Gestion des erreurs
    // ----------------
    const handleError = (error: string) => {
      setError(error);
    };
    socket.on("error", handleError);

    // ----------------
    // Gestion des parties
    // ----------------
    const handleRoomCreated = (roomCode: string, players: any[]) => {
      setRoomCode(roomCode);
      setPlayers(players);
      setView("lobby");
      const me = players.find((p: any) => p.socketId === socket.id);
      if (me) {
        setName(me.name);
      }
    };

    const handleRoomUpdated = (roomCode: string, players: any[]) => {
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
      toPlay: any[],
      database_artists: any[],
      database_tracks: any[],
    ) => {
      setView("game");
      setToPlay(toPlay);
      setTurn(1);
      setPhase("guessing");
      setTimeLeft(time);

      let cachedArtists: any[] = [];
      let cachedTracks: any[] = [];

      if (typeof window !== "undefined") {
        try {
          const storedArtists = sessionStorage.getItem("database_artists");
          if (storedArtists) {
            cachedArtists = JSON.parse(storedArtists);
          }
        } catch (e) {
          console.error(
            "Error reading database_artists from sessionStorage:",
            e,
          );
        }

        try {
          const storedTracks = sessionStorage.getItem("database_tracks");
          if (storedTracks) {
            cachedTracks = JSON.parse(storedTracks);
          }
        } catch (e) {
          console.error(
            "Error reading database_tracks from sessionStorage:",
            e,
          );
        }
      }

      const seenArtistNames = new Set(
        cachedArtists
          .map((a) => (a?.artist || "").toLowerCase().trim())
          .filter(Boolean),
      );
      const mergedArtists = [...cachedArtists];
      for (const a of database_artists) {
        const artistKey = (a?.artist || "").toLowerCase().trim();
        if (artistKey && !seenArtistNames.has(artistKey)) {
          seenArtistNames.add(artistKey);
          mergedArtists.push(a);
        }
      }

      const seenTrackNames = new Set(
        cachedTracks
          .map((t) => (t?.name || "").toLowerCase().trim())
          .filter(Boolean),
      );
      const mergedTracks = [...cachedTracks];
      for (const t of database_tracks) {
        const trackKey = (t?.name || "").toLowerCase().trim();
        if (trackKey && !seenTrackNames.has(trackKey)) {
          seenTrackNames.add(trackKey);
          mergedTracks.push(t);
        }
      }

      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem(
            "database_artists",
            JSON.stringify(mergedArtists),
          );
          sessionStorage.setItem(
            "database_tracks",
            JSON.stringify(mergedTracks),
          );
        } catch (e) {
          console.error("Error writing to sessionStorage:", e);
        }
      }

      setDatabaseArtists(mergedArtists);
      setDatabaseTracks(mergedTracks);
    };

    socket.on("data_loaded", handleDataLoaded);

    // ----------------
    // Gestion des paramètres de partie
    // ----------------
    const handleGameSetting = (key: string, value: any) => {
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
      setError("Aucune musique trouvée dans les playlists");
      setView("lobby");
      setTimeout(() => {
        setError(null);
      }, 2000);
    };

    socket.on("no_playlist", handleNoPlaylist);

    const handleGameReset = (rules: any, players: Player[]) => {
      if (rules) {
        if (rules.musicAmount !== undefined) setMusicAmount(rules.musicAmount);
        if (rules.time !== undefined) setTime(rules.time);
      }
      setPlayers(players);
      setView("lobby");
    };

    socket.on("game_reset", handleGameReset);

    const handleGameReconnected = (data: any) => {
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
      clearInterval(keepAliveInterval);
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
    setNoMorePlayers,
    setToPlay,
    setDatabaseArtists,
    setDatabaseTracks,
    setTurn,
    setPhase,
    setTimeLeft,
    time,
  ]);
};
