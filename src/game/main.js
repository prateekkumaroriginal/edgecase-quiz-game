import Phaser from "phaser";
import "../styles.css";
import { MenuScene } from "./scenes/MenuScene.js";
import { GameScene } from "./scenes/GameScene.js";

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
  scene: [MenuScene, GameScene]
};

new Phaser.Game(config);
