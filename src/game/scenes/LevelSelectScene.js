import { DEFAULT_LEVEL_ID, LEVELS } from "../data/levels.js";

const IS_DEV = import.meta.env.DEV || Boolean(window.edgecase?.isDev);
const VIEWPORT = { x: 90, y: 145, width: 1100, height: 460 };
const CARD_HEIGHT = 96;
const GAP = 18;

export class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super("LevelSelectScene");
  }

  create() {
    this.levels = this.getSelectableLevels();
    this.items = [];
    this.selectedIndex = 0;
    this.scrollY = 0;
    this.maxScroll = 0;

    this.cameras.main.setBackgroundColor("#07100f");
    this.add.rectangle(640, 360, 1280, 720, 0x07100f);
    this.add.rectangle(640, 615, 1280, 130, 0x152017);
    this.add.rectangle(640, 632, 1280, 18, 0xb9a44c);
    this.drawCircuitBackdrop();

    this.add.text(92, 54, "SELECT LEVEL", {
      fontFamily: "EdgecaseTitle, Bahnschrift, Impact",
      fontSize: "72px",
      color: "#f2f8e8",
      stroke: "#101814",
      strokeThickness: 8
    }).setShadow(7, 7, "#1d5f52", 0, true, true);

    this.createBackButton();
    this.createGrid();
    this.statusText = this.add.text(640, 608, "", {
      fontFamily: "Cascadia Mono, Consolas, monospace",
      fontSize: "18px",
      color: "#f4e786"
    }).setOrigin(0.5, 0);

    this.add.text(100, 642, "Arrows/WASD select  |  Space/Enter play  |  Mouse wheel scroll  |  Esc back", {
      fontFamily: "Cascadia Mono, Consolas, monospace",
      fontSize: "16px",
      color: "#d9e5d0"
    });

    this.keys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
      esc: Phaser.Input.Keyboard.KeyCodes.ESC
    });

    this.input.on("wheel", (_pointer, _objects, _dx, dy) => {
      this.setScroll(this.scrollY + dy * 0.7);
    });
    this.refreshDevLevelsFromDisk();
    this.updateFocus();
  }

  createBackButton() {
    const rect = this.add.rectangle(1080, 88, 220, 52, 0x22312b)
      .setStrokeStyle(2, 0xe9eedc)
      .setInteractive({ useHandCursor: true });
    const label = this.add.text(1080, 88, "BACK", {
      fontFamily: "Cascadia Mono, Consolas, monospace",
      fontSize: "30px",
      color: "#edf8ed"
    }).setOrigin(0.5);
    rect.on("pointerdown", () => this.goBack());
    rect.on("pointerover", () => {
      rect.setStrokeStyle(4, 0xf4e786);
      label.setColor("#f4e786");
    });
    rect.on("pointerout", () => {
      rect.setStrokeStyle(2, 0xe9eedc);
      label.setColor("#edf8ed");
    });
  }

  createGrid() {
    this.gridContainer?.destroy(true);
    this.gridMask?.destroy();
    this.items = [];
    this.gridContainer = this.add.container(0, 0);

    const maskGraphics = this.make.graphics();
    maskGraphics.fillStyle(0xffffff);
    maskGraphics.fillRect(VIEWPORT.x, VIEWPORT.y, VIEWPORT.width, VIEWPORT.height);
    this.gridMask = maskGraphics.createGeometryMask();
    this.gridContainer.setMask(this.gridMask);

    if (!this.levels.length) {
      this.gridContainer.add(this.add.text(640, 340, "NO LEVELS AVAILABLE", {
        fontFamily: "Cascadia Mono, Consolas, monospace",
        fontSize: "28px",
        color: "#f4e786"
      }).setOrigin(0.5));
      return;
    }

    this.columns = this.columnCount();
    const cardWidth = (VIEWPORT.width - GAP * (this.columns - 1)) / this.columns;

    this.levels.forEach((level, index) => {
      const col = index % this.columns;
      const row = Math.floor(index / this.columns);
      const x = VIEWPORT.x + cardWidth / 2 + col * (cardWidth + GAP);
      const y = VIEWPORT.y + CARD_HEIGHT / 2 + row * (CARD_HEIGHT + GAP);
      const rect = this.add.rectangle(x, y, cardWidth, CARD_HEIGHT, 0x102019)
        .setStrokeStyle(2, 0x385346)
        .setInteractive({ useHandCursor: true });
      const number = this.add.text(x - cardWidth / 2 + 18, y - 32, String(index + 1).padStart(2, "0"), {
        fontFamily: "Cascadia Mono, Consolas, monospace",
        fontSize: "16px",
        color: "#8fa89d"
      });
      const name = this.add.text(x - cardWidth / 2 + 18, y - 8, this.formatName(level.name, cardWidth), {
        fontFamily: "Cascadia Mono, Consolas, monospace",
        fontSize: "21px",
        color: "#edf8ed"
      });
      const meta = this.add.text(x - cardWidth / 2 + 18, y + 24, `${level.worldWidth || 4300}px field`, {
        fontFamily: "Cascadia Mono, Consolas, monospace",
        fontSize: "14px",
        color: "#b8c7b5"
      });
      const item = { level, rect, number, name, meta, row, x, y };
      rect.on("pointerover", () => {
        this.selectedIndex = index;
        this.updateFocus();
      });
      rect.on("pointerdown", () => this.playLevel(level.id));
      const children = [rect, number, name, meta];
      this.items.push(item);

      if (IS_DEV) {
        const editRect = this.add.rectangle(x + cardWidth / 2 - 83, y - 27, 62, 30, 0xe7d66b)
          .setStrokeStyle(2, 0x101814)
          .setInteractive({ useHandCursor: true });
        const editLabel = this.add.text(editRect.x, editRect.y, "EDIT", {
          fontFamily: "Cascadia Mono, Consolas, monospace",
          fontSize: "14px",
          color: "#07100f"
        }).setOrigin(0.5);
        editRect.on("pointerover", () => {
          this.selectedIndex = index;
          editRect.setFillStyle(0xf4e786);
          this.updateFocus();
        });
        editRect.on("pointerout", () => editRect.setFillStyle(0xe7d66b));
        editRect.on("pointerdown", () => this.editLevel(level.id));
        const deleteRect = this.add.rectangle(x + cardWidth / 2 - 25, y - 27, 34, 30, 0xd65f4f)
          .setStrokeStyle(2, 0x101814)
          .setInteractive({ useHandCursor: true });
        const deleteLabel = this.add.text(deleteRect.x, deleteRect.y, "X", {
          fontFamily: "Cascadia Mono, Consolas, monospace",
          fontSize: "16px",
          color: "#07100f"
        }).setOrigin(0.5);
        deleteRect.on("pointerover", () => {
          this.selectedIndex = index;
          deleteRect.setFillStyle(0xf07b6e);
          this.updateFocus();
        });
        deleteRect.on("pointerout", () => deleteRect.setFillStyle(0xd65f4f));
        deleteRect.on("pointerdown", () => this.deleteLevel(level.id));
        item.editRect = editRect;
        item.editLabel = editLabel;
        item.deleteRect = deleteRect;
        item.deleteLabel = deleteLabel;
        children.push(editRect, editLabel, deleteRect, deleteLabel);
      }

      this.gridContainer.add(children);
    });

    const rowCount = Math.ceil(this.levels.length / this.columns);
    const contentHeight = rowCount * CARD_HEIGHT + Math.max(0, rowCount - 1) * GAP;
    this.maxScroll = Math.max(0, contentHeight - VIEWPORT.height);
    this.setScroll(Math.min(this.scrollY, this.maxScroll));
  }

  columnCount() {
    const width = VIEWPORT.width;
    if (width < 620) return 1;
    if (width >= 1072) return 4;
    if (width >= 820) return 3;
    return 2;
  }

  formatName(name, cardWidth) {
    const cleanName = String(name || "Untitled").trim() || "Untitled";
    const maxChars = Math.max(12, Math.floor((cardWidth - 46) / 12));
    return cleanName.length > maxChars ? `${cleanName.slice(0, maxChars - 3)}...` : cleanName;
  }

  update() {
    if (!this.items.length) {
      if (Phaser.Input.Keyboard.JustDown(this.keys.esc)) {
        this.goBack();
      }
      return;
    }

    if (this.justDown("left") || this.justDown("a")) {
      this.moveSelection(-1);
    } else if (this.justDown("right") || this.justDown("d")) {
      this.moveSelection(1);
    } else if (this.justDown("up") || this.justDown("w")) {
      this.moveSelection(-this.columns);
    } else if (this.justDown("down") || this.justDown("s")) {
      this.moveSelection(this.columns);
    }

    if (this.justDown("space") || this.justDown("enter")) {
      this.playLevel(this.items[this.selectedIndex].level.id);
    }

    if (this.justDown("esc")) {
      this.goBack();
    }
  }

  justDown(name) {
    return Phaser.Input.Keyboard.JustDown(this.keys[name]);
  }

  moveSelection(delta) {
    this.selectedIndex = Phaser.Math.Clamp(this.selectedIndex + delta, 0, this.items.length - 1);
    this.scrollSelectedIntoView();
    this.updateFocus();
  }

  scrollSelectedIntoView() {
    const item = this.items[this.selectedIndex];
    const top = item.y - CARD_HEIGHT / 2;
    const bottom = item.y + CARD_HEIGHT / 2;
    if (top - this.scrollY < VIEWPORT.y) {
      this.setScroll(top - VIEWPORT.y);
    } else if (bottom - this.scrollY > VIEWPORT.y + VIEWPORT.height) {
      this.setScroll(bottom - VIEWPORT.y - VIEWPORT.height);
    }
  }

  setScroll(value) {
    this.scrollY = Phaser.Math.Clamp(value, 0, this.maxScroll);
    if (this.gridContainer) {
      this.gridContainer.y = -this.scrollY;
    }
  }

  updateFocus() {
    const selectedLevelId = this.registry.get("selectedLevelId");
    this.items?.forEach((item, index) => {
      const focused = index === this.selectedIndex;
      const selected = item.level.id === selectedLevelId;
      item.rect.setFillStyle(selected ? 0x2f5546 : focused ? 0x1b3028 : 0x102019);
      item.rect.setStrokeStyle(focused ? 4 : 2, focused ? 0xf4e786 : selected ? 0xe7d66b : 0x385346);
      item.name.setColor(focused || selected ? "#f4e786" : "#edf8ed");
    });
  }

  async refreshDevLevelsFromDisk() {
    if (!IS_DEV || !window.edgecase?.loadLevels) {
      return;
    }

    try {
      const levels = await window.edgecase.loadLevels();
      if (!this.scene.isActive() || !Array.isArray(levels) || !levels.length) {
        return;
      }
      this.registry.set("devSavedLevels", levels);
      this.registry.set("devSavedLevelsLoaded", true);
      this.levels = this.getSelectableLevels();
      const selectedLevelId = this.registry.get("selectedLevelId");
      if (!this.levels.some((level) => level.id === selectedLevelId)) {
        this.registry.set("selectedLevelId", this.levels[0]?.id || DEFAULT_LEVEL_ID);
      }
      this.selectedIndex = Math.max(0, this.levels.findIndex((level) => level.id === this.registry.get("selectedLevelId")));
      this.createGrid();
      this.updateFocus();
    } catch (error) {
      console.warn("Could not refresh dev levels", error);
    }
  }

  getSelectableLevels() {
    if (!IS_DEV) {
      return LEVELS;
    }

    const devSavedLevels = this.registry.get("devSavedLevels") || [];
    if (this.registry.get("devSavedLevelsLoaded")) {
      return devSavedLevels;
    }

    const levelsById = new Map(LEVELS.map((level) => [level.id, level]));
    for (const level of devSavedLevels) {
      levelsById.set(level.id, level);
    }
    return Array.from(levelsById.values());
  }

  playLevel(id) {
    this.registry.set("selectedLevelId", id);
    this.registry.remove("draftLevel");
    this.scene.start("GameScene");
  }

  editLevel(id) {
    const level = this.levels.find((item) => item.id === id);
    if (!level) return;
    this.registry.set("editorDraft", structuredClone(level));
    this.scene.start("LevelEditorScene");
  }

  async deleteLevel(id) {
    const level = this.levels.find((item) => item.id === id);
    if (!level || !window.edgecase?.deleteLevel) return;
    if (this.levels.length <= 1) {
      this.showStatus("At least one level is required.");
      return;
    }
    if (!window.confirm(`Delete level "${level.name}"? This cannot be undone.`)) {
      return;
    }

    try {
      await window.edgecase.deleteLevel(id);
      const levels = await window.edgecase.loadLevels();
      this.registry.set("devSavedLevels", Array.isArray(levels) ? levels : []);
      this.registry.set("devSavedLevelsLoaded", true);
      this.levels = this.getSelectableLevels();
      if (!this.levels.some((item) => item.id === this.registry.get("selectedLevelId"))) {
        this.registry.set("selectedLevelId", this.levels[0]?.id || DEFAULT_LEVEL_ID);
      }
      this.selectedIndex = Math.min(this.selectedIndex, Math.max(0, this.levels.length - 1));
      this.createGrid();
      this.updateFocus();
      this.showStatus(`Deleted ${level.name}`);
    } catch (error) {
      this.showStatus(error?.message || "Could not delete level.");
    }
  }

  showStatus(message) {
    if (!this.statusText) return;
    this.statusText.setText(message);
    this.time.delayedCall(2000, () => {
      if (this.statusText?.text === message) {
        this.statusText.setText("");
      }
    });
  }

  goBack() {
    this.scene.start("MenuScene");
  }

  drawCircuitBackdrop() {
    const graphics = this.add.graphics();
    graphics.lineStyle(2, 0x1d5f52, 0.22);
    for (let i = 0; i < 18; i += 1) {
      const x = 810 + (i % 5) * 80;
      const y = 205 + Math.floor(i / 5) * 66;
      graphics.strokeLineShape(new Phaser.Geom.Line(x, y, x + 52, y));
      graphics.strokeLineShape(new Phaser.Geom.Line(x + 52, y, x + 52, y + 34));
      graphics.fillStyle(i % 3 === 0 ? 0xd8cd6c : 0x3fa68f, 0.5);
      graphics.fillCircle(x + 52, y + 34, 5);
    }
  }

}
