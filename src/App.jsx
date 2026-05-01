import React, { useEffect, useRef, useState } from "react";
import { createGame } from "./game/createGame.js";
import { DEFAULT_LEVEL_ID } from "./game/data/levels.js";
import { emitGameEvent, gameEvents } from "./game/gameEvents.js";
import { LevelSelectScreen } from "./ui/LevelSelectScreen.jsx";
import { MenuScreen } from "./ui/MenuScreen.jsx";
import { PauseScreen } from "./ui/PauseScreen.jsx";
import { SettingsScreen } from "./ui/SettingsScreen.jsx";
import { getViewportStyleVars, useViewportMetrics } from "./ui/useViewportMetrics.js";

export default function App() {
  const gameRootRef = useRef(null);
  const gameRef = useRef(null);
  const [screen, setScreen] = useState("menu");
  const [pauseVisible, setPauseVisible] = useState(false);
  const viewportMetrics = useViewportMetrics();

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
    const openSettings = () => {
      setPauseVisible(false);
      setScreen("settings");
    };
    const openMenu = () => {
      setPauseVisible(false);
      setScreen("menu");
    };
    const openLevelSelect = () => {
      setPauseVisible(false);
      setScreen("level-select");
    };
    const openPause = () => {
      setPauseVisible(true);
    };
    const closePause = () => {
      setPauseVisible(false);
    };

    gameEvents.addEventListener("edgecase:navigate-settings", openSettings);
    gameEvents.addEventListener("edgecase:navigate-menu", openMenu);
    gameEvents.addEventListener("edgecase:navigate-level-select", openLevelSelect);
    gameEvents.addEventListener("edgecase:pause-open", openPause);
    gameEvents.addEventListener("edgecase:pause-close", closePause);

    return () => {
      gameEvents.removeEventListener("edgecase:navigate-settings", openSettings);
      gameEvents.removeEventListener("edgecase:navigate-menu", openMenu);
      gameEvents.removeEventListener("edgecase:navigate-level-select", openLevelSelect);
      gameEvents.removeEventListener("edgecase:pause-open", openPause);
      gameEvents.removeEventListener("edgecase:pause-close", closePause);
    };
  }, []);

  useEffect(() => {
    if (gameRef.current?.input?.keyboard) {
      gameRef.current.input.keyboard.enabled = screen === "game";
    }
  }, [screen]);

  const startScene = (sceneName) => {
    const registry = getRegistry();
    if (sceneName === "LevelEditorScene") {
      registry?.remove("editorDraft");
      registry?.remove("draftLevel");
    }
    setPauseVisible(false);
    setScreen("game");
    gameRef.current?.scene?.start(sceneName);
  };

  const getRegistry = () => gameRef.current?.registry;

  const playLevel = (id) => {
    const registry = getRegistry();
    registry?.set("selectedLevelId", id);
    registry?.remove("draftLevel");
    setPauseVisible(false);
    setScreen("game");
    gameRef.current?.scene?.start("GameScene");
  };

  const editLevel = (level) => {
    const registry = getRegistry();
    registry?.set("editorDraft", structuredClone(level));
    setPauseVisible(false);
    setScreen("game");
    gameRef.current?.scene?.start("LevelEditorScene");
  };

  const syncDevLevels = (levels, loaded = true) => {
    const registry = getRegistry();
    registry?.set("devSavedLevels", levels);
    registry?.set("devSavedLevelsLoaded", loaded);
    const selectedLevelId = registry?.get("selectedLevelId");
    if (!levels.some((level) => level.id === selectedLevelId)) {
      registry?.set("selectedLevelId", levels[0]?.id || DEFAULT_LEVEL_ID);
    }
  };

  const handlePauseAction = (action) => {
    emitGameEvent("edgecase:pause-action", { action });
    if (action === "resume") {
      setPauseVisible(false);
    }
  };

  return (
    <div className="app-shell" style={getViewportStyleVars(viewportMetrics)}>
      <div
        ref={gameRootRef}
        id="game-root"
        className={screen !== "game" ? "game-layer game-layer--obscured" : "game-layer"}
        aria-hidden={screen !== "game"}
      />
      {pauseVisible ? <PauseScreen onAction={handlePauseAction} /> : null}
      {screen === "menu" ? (
        <MenuScreen
          onPlay={() => setScreen("level-select")}
          onSettings={() => setScreen("settings")}
          onLevelMaker={() => startScene("LevelEditorScene")}
        />
      ) : null}
      {screen === "level-select" ? (
        <LevelSelectScreen
          initialDevLevels={getRegistry()?.get("devSavedLevels") || []}
          initialDevLevelsLoaded={Boolean(getRegistry()?.get("devSavedLevelsLoaded"))}
          onBack={() => setScreen("menu")}
          onDeleteLevel={(_id, levels) => syncDevLevels(levels, true)}
          onEditLevel={editLevel}
          onLevelsLoaded={syncDevLevels}
          onPlayLevel={playLevel}
        />
      ) : null}
      {screen === "settings" ? <SettingsScreen onBack={() => setScreen("menu")} /> : null}
    </div>
  );
}
