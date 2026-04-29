import { DEFAULT_LEVEL_ID, LEVELS } from "../data/levels.js";
import { Pencil } from "lucide";

const IS_DEV = import.meta.env.DEV || Boolean(window.edgecase?.isDev);
const LEVEL_LIST_X = 110;
const LEVEL_LIST_Y = 274;
const LEVEL_BUTTON_WIDTH = 540;
const LEVEL_BUTTON_HEIGHT = 42;
const LEVEL_BUTTON_GAP = 52;
const LEVEL_LABEL_X = LEVEL_LIST_X + 24;
const LEVEL_LABEL_MAX_CHARS = 34;

export class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create() {
    this.registry.set("difficulty", this.registry.get("difficulty") || "normal");
    this.registry.set("selectedLevelId", this.registry.get("selectedLevelId") || DEFAULT_LEVEL_ID);
    this.registry.remove("draftLevel");
    this.registry.remove("editorDraft");
    this.levels = this.getSelectableLevels();
    this.editButtons = [];
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

    this.add.text(LEVEL_LIST_X, 230, "Select level", this.headingStyle());

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
    this.scale.on("resize", this.positionPencilButtons, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroyEditButtons());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.destroyEditButtons());
    this.updateMenuFocus();
    this.refreshDevLevelsFromDisk();
  }

  createMenuButtons() {
    this.createLevelButtons();
    this.createActionButtons();
  }

  createLevelButtons() {
    this.levels.forEach((level, index) => {
      const y = LEVEL_LIST_Y + index * LEVEL_BUTTON_GAP;
      const rect = this.add.rectangle(LEVEL_LIST_X + LEVEL_BUTTON_WIDTH / 2, y, LEVEL_BUTTON_WIDTH, LEVEL_BUTTON_HEIGHT, 0x22312b)
        .setStrokeStyle(2, 0xe9eedc)
        .setInteractive({ useHandCursor: true });
      const label = this.add.text(LEVEL_LABEL_X, y - 15, this.formatLevelLabel(index, level.name), this.itemStyle("#f2f8e8"));
      const item = { type: "level", id: level.id, rect, label, select: () => this.selectLevel(level.id) };
      rect.on("pointerover", () => this.focusItem(item));
      rect.on("pointerdown", item.select);
      if (IS_DEV) {
        const editButton = this.createPencilButton(rect.x + rect.displayWidth / 2 - 30, rect.y, level);
        item.editButton = editButton;
      }
      this.menuItems.push(item);
    });
  }

  formatLevelLabel(index, name) {
    const prefix = `${index + 1}. `;
    const cleanName = String(name || "Untitled").trim() || "Untitled";
    const maxNameLength = Math.max(8, LEVEL_LABEL_MAX_CHARS - prefix.length);
    const labelName = cleanName.length > maxNameLength ? `${cleanName.slice(0, maxNameLength - 3)}...` : cleanName;
    return `${prefix}${labelName}`;
  }

  createPencilButton(x, y, level) {
    const host = document.getElementById("game-root") || document.body;
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", `Edit ${level.name}`);
    button.className = "pointer-events-auto absolute z-20 grid h-8 w-8 place-items-center rounded-sm border border-[#385346] bg-[#102019] text-[#edf8ed] transition-colors hover:border-[#f4e786] hover:bg-[#21372e] hover:text-[#f4e786]";
    button.innerHTML = this.lucideSvg(Pencil, 16);
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      this.editLevel(level.id);
    });
    host.appendChild(button);
    this.editButtons.push({ button, x, y });
    this.positionPencilButton(button, x, y);
    return button;
  }

  positionPencilButton(button, x, y) {
    const host = document.getElementById("game-root") || document.body;
    const canvasRect = this.game.canvas.getBoundingClientRect();
    const hostRect = host.getBoundingClientRect();
    const scaleX = canvasRect.width / this.scale.width;
    const scaleY = canvasRect.height / this.scale.height;
    const left = canvasRect.left - hostRect.left + x * scaleX - 16;
    const top = canvasRect.top - hostRect.top + y * scaleY - 16;
    button.style.left = `${left}px`;
    button.style.top = `${top}px`;
  }

  positionPencilButtons() {
    this.editButtons?.forEach(({ button, x, y }) => this.positionPencilButton(button, x, y));
  }

  createActionButtons() {
    const actions = [
      { label: "START RUN", x: 250, y: 560, width: 300, action: () => this.startRun() }
    ];

    if (IS_DEV) {
      actions.push({ label: "LEVEL MAKER", x: 610, y: 560, width: 320, action: () => this.scene.start("LevelEditorScene") });
    }

    actions.forEach((action) => {
      const rect = this.add.rectangle(action.x, action.y, action.width, 62, 0xe7d66b).setStrokeStyle(3, 0x101814).setInteractive({ useHandCursor: true });
      const label = this.add.text(action.x, action.y, action.label, {
        fontFamily: "EdgecaseTitle, Bahnschrift, Impact",
        fontSize: "34px",
        color: "#07100f"
      }).setOrigin(0.5);
      const item = { type: "action", rect, label, select: action.action };
      rect.on("pointerover", () => this.focusItem(item));
      rect.on("pointerdown", item.select);
      this.menuItems.push(item);
    });
  }

  async refreshDevLevelsFromDisk() {
    if (!IS_DEV || !window.edgecase?.loadLevels) {
      return;
    }

    try {
      const levels = await window.edgecase.loadLevels();
      if (!this.scene.isActive()) {
        return;
      }
      if (!Array.isArray(levels) || !levels.length) {
        return;
      }

      this.registry.set("devSavedLevels", levels);
      const selectedLevelId = this.registry.get("selectedLevelId");
      if (!levels.some((level) => level.id === selectedLevelId)) {
        this.registry.set("selectedLevelId", levels[0].id);
      }

      this.levels = this.getSelectableLevels();
      this.rebuildMenuButtons();
      this.updateMenuFocus();
    } catch (error) {
      console.warn("Could not refresh dev levels", error);
    }
  }

  rebuildMenuButtons() {
    const selectedItem = this.menuItems[this.menuIndex];
    const selectedType = selectedItem?.type;
    const selectedId = selectedItem?.id;
    this.menuItems.forEach((item) => {
      item.rect?.destroy();
      item.label?.destroy();
      item.note?.destroy();
      item.editButton?.remove();
    });
    this.destroyEditButtons();
    this.menuItems = [];
    this.editButtons = [];
    this.createMenuButtons();

    const nextIndex = this.menuItems.findIndex((item) => item.type === selectedType && (!selectedId || item.id === selectedId));
    this.menuIndex = nextIndex >= 0 ? nextIndex : Math.min(this.menuIndex, this.menuItems.length - 1);
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

  startRun() {
    this.registry.remove("draftLevel");
    this.scene.start("GameScene");
  }

  selectLevel(id) {
    this.registry.set("selectedLevelId", id);
    this.updateMenuFocus();
  }

  editLevel(id) {
    const level = this.levels.find((item) => item.id === id);
    if (!level) return;
    this.registry.set("editorDraft", structuredClone(level));
    this.scene.start("LevelEditorScene");
  }

  updateMenuFocus() {
    const selectedLevelId = this.registry.get("selectedLevelId");

    this.menuItems.forEach((item, index) => {
      const focused = this.menuIndex === index;
      if (item.type === "level") {
        const selected = selectedLevelId === item.id;
        item.rect.setFillStyle(selected ? 0x2f5546 : 0x22312b);
        item.rect.setStrokeStyle(focused ? 4 : 2, focused ? 0xf4e786 : 0xe9eedc);
        item.label.setColor(selected ? "#f4e786" : "#f2f8e8");
      } else {
        item.rect.setStrokeStyle(focused ? 5 : 3, focused ? 0xf4e786 : 0x101814);
      }
    });
  }

  getSelectableLevels() {
    if (!IS_DEV) {
      return LEVELS;
    }

    const devSavedLevels = this.registry.get("devSavedLevels") || [];
    const levelsById = new Map(LEVELS.map((level) => [level.id, level]));
    for (const level of devSavedLevels) {
      levelsById.set(level.id, level);
    }
    return Array.from(levelsById.values());
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

  itemStyle(color) {
    return {
      fontFamily: "Cascadia Mono, Consolas, monospace",
      fontSize: "20px",
      color
    };
  }

  lucideSvg(icon, size) {
    const children = icon
      .map(([tag, attrs]) => {
        const attrText = Object.entries(attrs)
          .map(([key, value]) => `${key}="${String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;")}"`)
          .join(" ");
        return `<${tag} ${attrText}></${tag}>`;
      })
      .join("");

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${children}</svg>`;
  }

  destroyEditButtons() {
    this.scale?.off("resize", this.positionPencilButtons, this);
    this.menuItems?.forEach((item) => item.editButton?.remove());
    this.editButtons?.forEach((item) => item.button.remove());
    this.editButtons = [];
  }
}
