import Phaser from "phaser";
import { MenuScene } from "./scenes/MenuScene.js";
import { GameScene } from "./scenes/GameScene.js";
import { LevelEditorScene } from "./scenes/LevelEditorScene.js";
import { getBorderlessEnabled } from "./settings.js";
import { installGlobalAudioUnlock } from "./audio.js";

const isDev = import.meta.env.DEV || Boolean(window.edgecase?.isDev);

export function createGame(parent) {
  const config = {
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#07100f",
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 1280,
      height: 720
    },
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    physics: {
      default: "arcade",
      arcade: {
        gravity: { y: 1420 },
        debug: false
      }
    },
    render: {
      pixelArt: false,
      antialias: true,
      antialiasGL: true,
      roundPixels: true
    },
    scene: isDev
      ? [MenuScene, GameScene, LevelEditorScene]
      : [MenuScene, GameScene]
  };

  installGlobalAudioUnlock();
  applyPersistedWindowMode();

  return new Phaser.Game(config);
}

async function applyPersistedWindowMode() {
  if (!window.edgecase?.getWindowMode || !window.edgecase?.setBorderless || !getBorderlessEnabled()) {
    return;
  }

  try {
    console.log("[edgecase:main] applying persisted borderless mode");
    const mode = await window.edgecase.getWindowMode();
    console.log("[edgecase:main] current window mode", mode);
    if (!mode?.borderless) {
      await window.edgecase.setBorderless(true);
    }
  } catch (error) {
    console.warn("Could not apply persisted window mode", error);
  }
}
