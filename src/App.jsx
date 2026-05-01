import { useEffect, useRef, useState } from "react";
import { createGame } from "./game/createGame.js";
import { gameEvents } from "./game/gameEvents.js";
import { SettingsScreen } from "./ui/SettingsScreen.jsx";

export default function App() {
  const gameRootRef = useRef(null);
  const gameRef = useRef(null);
  const [screen, setScreen] = useState("game");

  useEffect(() => {
    if (!gameRootRef.current || gameRef.current) {
      return undefined;
    }

    gameRef.current = createGame(gameRootRef.current);

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  useEffect(() => {
    const openSettings = () => setScreen("settings");
    const showGame = () => setScreen("game");

    gameEvents.addEventListener("edgecase:navigate-settings", openSettings);
    gameEvents.addEventListener("edgecase:navigate-menu", showGame);

    return () => {
      gameEvents.removeEventListener("edgecase:navigate-settings", openSettings);
      gameEvents.removeEventListener("edgecase:navigate-menu", showGame);
    };
  }, []);

  useEffect(() => {
    if (gameRef.current?.input?.keyboard) {
      gameRef.current.input.keyboard.enabled = screen !== "settings";
    }
  }, [screen]);

  return (
    <div className="app-shell">
      <div
        ref={gameRootRef}
        id="game-root"
        className={screen === "settings" ? "game-layer game-layer--obscured" : "game-layer"}
        aria-hidden={screen === "settings"}
      />
      {screen === "settings" ? <SettingsScreen onBack={() => setScreen("game")} /> : null}
    </div>
  );
}
