import Phaser from "phaser";
import "../styles.css";
import { MenuScene } from "./scenes/MenuScene.js";
import { LevelSelectScene } from "./scenes/LevelSelectScene.js";
import { SettingsScene } from "./scenes/SettingsScene.js";
import { GameScene } from "./scenes/GameScene.js";
import { LevelEditorScene } from "./scenes/LevelEditorScene.js";
import { getBorderlessEnabled } from "./settings.js";
import { installGlobalAudioUnlock } from "./audio.js";

const isDev = import.meta.env.DEV || Boolean(window.edgecase?.isDev);

const config = {
  type: Phaser.AUTO,
  parent: "game-root",
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
    ? [MenuScene, LevelSelectScene, SettingsScene, GameScene, LevelEditorScene]
    : [MenuScene, LevelSelectScene, SettingsScene, GameScene]
};

new Phaser.Game(config);
installGlobalAudioUnlock();

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

applyPersistedWindowMode();
