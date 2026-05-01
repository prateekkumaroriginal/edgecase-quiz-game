import { DEFAULT_LEVEL_ID } from "../data/levels.js";
import { emitGameEvent } from "../gameEvents.js";

const IS_DEV = import.meta.env.DEV || Boolean(window.edgecase?.isDev);

export class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create() {
    this.registry.set("difficulty", this.registry.get("difficulty") || "normal");
    this.registry.set("selectedLevelId", this.registry.get("selectedLevelId") || DEFAULT_LEVEL_ID);
    this.registry.remove("draftLevel");
    this.registry.remove("editorDraft");
    this.menuItems = [];
    this.menuIndex = 0;
    this.cameras.main.setBackgroundColor("#07100f");

    this.add.rectangle(640, 360, 1280, 720, 0x07100f);
    this.add.rectangle(640, 575, 1280, 190, 0x152017);
    this.add.rectangle(640, 610, 1280, 18, 0xb9a44c);
    this.drawCircuitBackdrop();

    this.add
      .text(92, 64, "EDGECASE", {
        fontFamily: "EdgecaseTitle, Bahnschrift, Impact",
        fontSize: "88px",
        color: "#f2f8e8",
        stroke: "#101814",
        strokeThickness: 8
      })
      .setShadow(8, 8, "#1d5f52", 0, true, true);

    this.add.text(100, 164, "TECH FIELD / PLATFORMER KNOWLEDGE RUN", {
      fontFamily: "Cascadia Mono, Consolas, monospace",
      fontSize: "18px",
      color: "#d7c96d"
    });

    this.add.text(110, 246, "MAIN MENU", this.headingStyle());
    this.createMenuButtons();

    this.add.text(100, 642, "A/D move  |  Space jump  |  E interact  |  Physical quiz answers use doors", {
      fontFamily: "Cascadia Mono, Consolas, monospace",
      fontSize: "16px",
      color: "#d9e5d0"
    });

    this.keys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER
    });
    this.updateMenuFocus();
  }

  createMenuButtons() {
    const actions = [
      { label: "PLAY", y: 318, action: () => this.scene.start("LevelSelectScene") },
      { label: "SETTINGS", y: 404, action: () => emitGameEvent("edgecase:navigate-settings") }
    ];

    if (IS_DEV) {
      actions.push({ label: "LEVEL MAKER", y: 490, action: () => this.scene.start("LevelEditorScene") });
    }

    actions.forEach((action) => {
      const rect = this.add.rectangle(300, action.y, 380, 62, 0xe7d66b)
        .setStrokeStyle(3, 0x101814)
        .setInteractive({ useHandCursor: true });
      const label = this.add.text(300, action.y, action.label, {
        fontFamily: "EdgecaseTitle, Bahnschrift, Impact",
        fontSize: action.label.length > 9 ? "30px" : "34px",
        color: "#07100f"
      }).setOrigin(0.5);
      const item = { rect, label, select: action.action };
      rect.on("pointerover", () => this.focusItem(item));
      rect.on("pointerdown", item.select);
      this.menuItems.push(item);
    });
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.keys.up) || Phaser.Input.Keyboard.JustDown(this.keys.w)) {
      this.menuIndex = Phaser.Math.Wrap(this.menuIndex - 1, 0, this.menuItems.length);
      this.updateMenuFocus();
    } else if (Phaser.Input.Keyboard.JustDown(this.keys.down) || Phaser.Input.Keyboard.JustDown(this.keys.s)) {
      this.menuIndex = Phaser.Math.Wrap(this.menuIndex + 1, 0, this.menuItems.length);
      this.updateMenuFocus();
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.space) || Phaser.Input.Keyboard.JustDown(this.keys.enter)) {
      this.menuItems[this.menuIndex].select();
    }
  }

  focusItem(item) {
    this.menuIndex = this.menuItems.indexOf(item);
    this.updateMenuFocus();
  }

  updateMenuFocus() {
    this.menuItems.forEach((item, index) => {
      const focused = this.menuIndex === index;
      item.rect.setStrokeStyle(focused ? 5 : 3, focused ? 0xf4e786 : 0x101814);
      item.rect.setFillStyle(focused ? 0xf4e786 : 0xe7d66b);
    });
  }

  drawCircuitBackdrop() {
    const graphics = this.add.graphics();
    graphics.lineStyle(2, 0x1d5f52, 0.28);
    for (let i = 0; i < 18; i += 1) {
      const x = 785 + (i % 5) * 90;
      const y = 245 + Math.floor(i / 5) * 62;
      graphics.strokeLineShape(new Phaser.Geom.Line(x, y, x + 58, y));
      graphics.strokeLineShape(new Phaser.Geom.Line(x + 58, y, x + 58, y + 38));
      graphics.fillStyle(i % 3 === 0 ? 0xd8cd6c : 0x3fa68f, 0.58);
      graphics.fillCircle(x + 58, y + 38, 5);
    }
  }

  headingStyle() {
    return {
      fontFamily: "Cascadia Mono, Consolas, monospace",
      fontSize: "22px",
      color: "#f2f8e8"
    };
  }
}
