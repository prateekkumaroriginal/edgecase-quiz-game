import { DEFAULT_LEVEL_ID } from "../data/levels.js";
import { emitGameEvent } from "../gameEvents.js";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create() {
    this.registry.set("difficulty", this.registry.get("difficulty") || "normal");
    this.registry.set("selectedLevelId", this.registry.get("selectedLevelId") || DEFAULT_LEVEL_ID);
    this.registry.remove("draftLevel");
    this.registry.remove("editorDraft");
    this.cameras.main.setBackgroundColor("#07100f");
    emitGameEvent("edgecase:navigate-menu");
  }
}
