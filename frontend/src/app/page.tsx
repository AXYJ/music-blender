"use client";

// Import du context
import { GameProvider, useGame } from "../context/GameContext";

// Import des composants
import Home from "../pages/Home";
import Lobby from "../pages/Lobby";
import Game from "../pages/Game";

function GameContent() {
  const { view } = useGame();

  // Rendu des vues
  // Rendu conditionnel plutôt que routing Next.js pour éviter de perdre la connexion WebSocket
  const baseView = view.split("#")[0];
  switch (baseView) {
    case "home":
      return <Home />;
    case "lobby":
      return <Lobby />;
    case "game":
      return (
        <>
          <Game />
        </>
      );
    default:
      return <Home />;
  }
}

export default function App() {
  
  return (
    <main className="min-h-screen py-16 px-8">
      <GameProvider>
        <GameContent />
      </GameProvider>
    </main>
  );
}
