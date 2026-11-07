import { useState } from "preact/hooks";
import { GameConfig } from "../config/games";
import { Game } from "./Game";
import { Launcher } from "./Launcher";

export function App() {
  const [selectedGame, setSelectedGame] = useState<GameConfig | null>(null);

  return (
    <div class="app-root">
      {selectedGame ? (
        <Game
          game={selectedGame}
          onExit={() => setSelectedGame(null)}
        />
      ) : (
        <Launcher onSelectGame={setSelectedGame} />
      )}
    </div>
  );
}
