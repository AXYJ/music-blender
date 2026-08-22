"use client";

// Import du context
import { GameProvider, useGame } from "../context/GameContext";

// Import des composants
import Home from "../views/Home";
import Lobby from "../views/Lobby";
import Game from "../views/Game";
import Result from "../views/Results";
import Mentions from "../views/Mentions";

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
      return <Game />;
    case "result":
      return <Result />;
    case "mentions":
      return <Mentions />;
    default:
      return <Home />;
  }
}

export default function App() {
  return (
    <main className="mx-auto min-h-screen w-full px-8 md:max-w-lg lg:max-w-3xl">
      <GameProvider>
        <GameContent />
      </GameProvider>
    </main>
  );
}
