import { useEffect, useRef, useState } from "react";
import { createGame } from "./game/createGame.js";
import { gameEvents } from "./game/gameEvents.js";
import { MenuScreen } from "./ui/MenuScreen.jsx";
import { SettingsScreen } from "./ui/SettingsScreen.jsx";

export default function App() {
  const gameRootRef = useRef(null);
  const gameRef = useRef(null);
  const [screen, setScreen] = useState("menu");

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
    const openMenu = () => setScreen("menu");

    gameEvents.addEventListener("edgecase:navigate-settings", openSettings);
    gameEvents.addEventListener("edgecase:navigate-menu", openMenu);

    return () => {
      gameEvents.removeEventListener("edgecase:navigate-settings", openSettings);
      gameEvents.removeEventListener("edgecase:navigate-menu", openMenu);
    };
  }, []);

  useEffect(() => {
    if (gameRef.current?.input?.keyboard) {
      gameRef.current.input.keyboard.enabled = screen === "game";
    }
  }, [screen]);

  const startScene = (sceneName) => {
    setScreen("game");
    gameRef.current?.scene?.start(sceneName);
  };

  return (
    <div className="app-shell">
      <div
        ref={gameRootRef}
        id="game-root"
        className={screen !== "game" ? "game-layer game-layer--obscured" : "game-layer"}
        aria-hidden={screen !== "game"}
      />
      {screen === "menu" ? (
        <MenuScreen
          onPlay={() => startScene("LevelSelectScene")}
          onSettings={() => setScreen("settings")}
          onLevelMaker={() => startScene("LevelEditorScene")}
        />
      ) : null}
      {screen === "settings" ? <SettingsScreen onBack={() => setScreen("menu")} /> : null}
    </div>
  );
}
