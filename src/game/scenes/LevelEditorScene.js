import { Group, Ungroup, Trash2 } from "lucide";
import { LEVELS } from "../data/levels.js";

const TOOL_DEFS = [
  { id: "platform", label: "Platform" },
  { id: "coin", label: "Coin" },
  { id: "hazard", label: "Spike" },
  { id: "enemy", label: "Enemy" },
  { id: "challenge", label: "Challenge" },
  { id: "merchant", label: "Merchant" },
  { id: "exitGate", label: "Exit" },
  { id: "playerSpawn", label: "Spawn" },
  { id: "sign", label: "Sign" }
];

const COLORS = {
  platform: { fill: 0x17231d, stroke: 0xb9a44c },
  coin: { fill: 0xd8cd6c, stroke: 0xfff3a6 },
  hazard: { fill: 0xd65f4f, stroke: 0xffb0a6 },
  enemy: { fill: 0x2d7f6d, stroke: 0xe7d66b },
  challenge: { fill: 0x2d7f6d, stroke: 0xd8cd6c },
  merchant: { fill: 0x345347, stroke: 0xe7d66b },
  exitGate: { fill: 0x8a7440, stroke: 0xe7d66b },
  playerSpawn: { fill: 0xf0f4df, stroke: 0xd7c96d },
  sign: { fill: 0x08100f, stroke: 0xe7d66b }
};

const WORLD_WIDTH = 4300;
const WORLD_HEIGHT = 720;
const GROUND_Y = 684;
const GROUND_HEIGHT = 64;
const GROUND_TOP = GROUND_Y - GROUND_HEIGHT / 2;
const HUD_LEFT_WIDTH = 246;
const HUD_RIGHT_X = 1035;
const WORLD_VIEW_WIDTH = HUD_RIGHT_X - HUD_LEFT_WIDTH;

const FIELD_CONFIG = {
  platform: [
    ["x", "number"], ["y", "number"], ["width", "number"], ["height", "number"]
  ],
  coin: [["x", "number"], ["y", "number"]],
  hazard: [["x", "number"], ["y", "number"]],
  enemy: [["x", "number"], ["y", "number"], ["min", "number"], ["max", "number"]],
  challenge: [
    ["x", "number"], ["y", "number"], ["width", "number"], ["height", "number"], ["label", "text"], ["difficulty", "select"]
  ],
  merchant: [
    ["x", "number"], ["y", "number"], ["width", "number"], ["height", "number"], ["npcX", "number"], ["npcY", "number"]
  ],
  exitGate: [["x", "number"], ["y", "number"], ["width", "number"], ["height", "number"]],
  playerSpawn: [["x", "number"], ["y", "number"]],
  sign: [["x", "number"], ["y", "number"], ["text", "text"]]
};

export class LevelEditorScene extends Phaser.Scene {
  constructor() {
    super("LevelEditorScene");
  }

  create() {
    this.cameras.main.setBackgroundColor("#07100f");
    this.activeTool = null;
    this.selected = null;
    this.selection = [];
    this.dragging = null;
    this.areaSelection = null;
    this.hoveredObject = null;
    this.hudVisible = true;
    this.savedSnapshot = null;
    this.nextChallenge = 1;
    this.draft = this.makeDraftLevel();
    this.objects = [];

    this.createWorldChrome();
    this.createInputs();
    this.createDomHud();
    this.rebuildObjects();
    this.resizeWorldViewport();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroyDomHud());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.destroyDomHud());
  }

  makeDraftLevel() {
    const retainedDraft = this.registry.get("editorDraft");
    if (retainedDraft) {
      return structuredClone(retainedDraft);
    }

    return this.createBlankLevel();
  }

  createWorldChrome() {
    this.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, 0x07100f);
    const g = this.add.graphics();
    g.lineStyle(1, 0x2f4b3e, 0.35);
    for (let x = 0; x <= WORLD_WIDTH; x += 100) {
      g.strokeLineShape(new Phaser.Geom.Line(x, 0, x, WORLD_HEIGHT));
    }
    for (let y = 0; y <= WORLD_HEIGHT; y += 60) {
      g.strokeLineShape(new Phaser.Geom.Line(0, y, WORLD_WIDTH, y));
    }
    this.add.rectangle(WORLD_WIDTH / 2, GROUND_Y, WORLD_WIDTH, GROUND_HEIGHT, 0x17231d, 0.8).setStrokeStyle(3, 0xb9a44c);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  }

  createInputs() {
    this.input.on("pointerdown", (pointer) => this.onPointerDown(pointer));
    this.input.on("pointermove", (pointer) => this.onPointerMove(pointer));
    this.input.on("pointerup", () => {
      this.finishAreaSelection();
      this.dragging = null;
    });

    this.keys = this.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      del: Phaser.Input.Keyboard.KeyCodes.DELETE,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      c: Phaser.Input.Keyboard.KeyCodes.C,
      p: Phaser.Input.Keyboard.KeyCodes.P,
      ctrl: Phaser.Input.Keyboard.KeyCodes.CTRL,
      i: Phaser.Input.Keyboard.KeyCodes.I,
      esc: Phaser.Input.Keyboard.KeyCodes.ESC
    });
  }

  createDomHud() {
    const host = document.getElementById("game-root") || document.body;
    this.hudRoot = document.createElement("div");
    this.hudRoot.className = "pointer-events-none absolute inset-0 z-10 font-mono text-[#edf8ed]";
    this.hudRoot.innerHTML = `
      <aside data-left-panel class="pointer-events-auto absolute left-0 top-0 flex h-full w-[246px] flex-col border-r border-[#385346] bg-[#06100e]/95 p-4 shadow-[18px_0_36px_rgba(0,0,0,0.35)]">
        <div class="font-[EdgecaseTitle] text-3xl text-[#e7d66b]">LEVEL MAKER</div>
        <div class="mt-2 text-xs text-[#8fa89d]">Ctrl+I hides panels</div>
        <label class="mt-5 flex flex-col gap-1 text-xs font-bold text-[#8fa89d]">
          LEVEL NAME
          <input data-level-name type="text" value="${this.escapeHtml(this.draft.name)}" class="rounded-sm border border-[#385346] bg-[#102019] px-2 py-2 text-sm text-[#edf8ed] outline-none transition focus:border-[#f4e786]" />
        </label>
        <div data-save-status class="mt-3 rounded-sm border border-[#385346] bg-[#0d1a16] px-3 py-2 text-xs font-bold text-[#d65f4f]">UNSAVED</div>
        <label class="mt-4 flex flex-col gap-1 text-xs font-bold text-[#8fa89d]">
          EDIT EXISTING
          <select data-edit-level class="rounded-sm border border-[#385346] bg-[#102019] px-2 py-2 text-sm text-[#edf8ed] outline-none transition focus:border-[#f4e786]">
            <option value="">Blank draft</option>
            ${this.getEditableLevels().map((level) => `<option value="${this.escapeHtml(level.id)}" ${level.id === this.draft.id ? "selected" : ""}>${this.escapeHtml(level.name)}</option>`).join("")}
          </select>
        </label>
        <div data-tools class="mt-5 flex flex-col gap-2"></div>
      </aside>
      <aside data-right-panel class="pointer-events-auto absolute right-0 top-0 flex h-full w-[245px] flex-col border-l border-[#385346] bg-[#06100e]/95 p-4 shadow-[-18px_0_36px_rgba(0,0,0,0.35)]">
        <div class="font-[EdgecaseTitle] text-3xl text-[#e7d66b]">SELECTED</div>
        <div data-inspector class="mt-5 min-h-0 flex-1 overflow-y-auto pr-1"></div>
        <div data-message class="mb-3 min-h-10 text-sm text-[#f4e786]"></div>
        <div class="grid grid-cols-2 gap-2">
          <button data-action="exit" class="rounded-sm border border-[#7b332d] bg-[#d65f4f] px-3 py-2 text-sm font-bold text-[#07100f] transition-colors hover:border-[#f07b6e] hover:bg-[#f07b6e]">EXIT</button>
          <button data-action="save" class="rounded-sm border border-[#b9a44c] bg-[#e7d66b] px-3 py-2 text-sm font-bold text-[#07100f] transition-colors hover:border-[#f4e786] hover:bg-[#f4e786]">SAVE</button>
        </div>
        <button data-action="playtest" class="mt-3 flex w-full items-center justify-center gap-3 rounded-sm border border-[#6ad8b4] bg-[#3fa68f] px-3 py-3 text-base font-bold text-[#07100f] transition-colors hover:border-[#8ee0c6] hover:bg-[#62cba8]">
          <span class="inline-block h-0 w-0 border-y-[8px] border-l-[13px] border-y-transparent border-l-[#07100f]"></span>
          <span>PLAYTEST</span>
        </button>
      </aside>
    `;
    host.appendChild(this.hudRoot);
    ["keydown", "keyup", "keypress"].forEach((eventName) => {
      this.hudRoot.addEventListener(eventName, (event) => {
        if (this.isEditableDomTarget(event.target)) {
          event.stopPropagation();
        }
      });
    });

    this.toolListEl = this.hudRoot.querySelector("[data-tools]");
    this.inspectorEl = this.hudRoot.querySelector("[data-inspector]");
    this.messageEl = this.hudRoot.querySelector("[data-message]");
    this.statusEl = this.hudRoot.querySelector("[data-save-status]");
    this.nameInputEl = this.hudRoot.querySelector("[data-level-name]");
    this.editLevelEl = this.hudRoot.querySelector("[data-edit-level]");
    this.nameInputEl.addEventListener("input", () => {
      this.draft.name = this.nameInputEl.value;
      this.markDirty();
    });
    this.editLevelEl.addEventListener("change", () => this.loadEditableLevel(this.editLevelEl.value));

    TOOL_DEFS.forEach((tool) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.tool = tool.id;
      button.className = this.toolClass(false);
      button.textContent = tool.label;
      button.addEventListener("click", () => {
        this.activeTool = tool.id;
        this.clearSelection();
        this.updateToolButtons();
        this.showMessage(`${tool.label} ready`);
      });
      this.toolListEl.appendChild(button);
    });

    this.hudRoot.querySelector("[data-action='exit']").addEventListener("click", () => this.exitEditor());
    this.hudRoot.querySelector("[data-action='save']").addEventListener("click", () => this.saveLevel());
    this.hudRoot.querySelector("[data-action='playtest']").addEventListener("click", () => this.playtest());
    this.updateToolButtons();
    this.renderInspector();
    this.markDirty();
  }

  update() {
    if (this.isTypingInDomField()) {
      return;
    }

    const speed = 16;
    const maxScroll = Math.max(0, WORLD_WIDTH - this.cameras.main.width);
    if (this.keys.left.isDown) {
      this.cameras.main.scrollX = Math.max(0, this.cameras.main.scrollX - speed);
    } else if (this.keys.right.isDown) {
      this.cameras.main.scrollX = Math.min(maxScroll, this.cameras.main.scrollX + speed);
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.i) && this.keys.ctrl.isDown) {
      this.toggleHud();
    } else if (Phaser.Input.Keyboard.JustDown(this.keys.esc)) {
      this.activeTool = null;
      this.clearSelection();
      this.updateToolButtons();
    } else if (Phaser.Input.Keyboard.JustDown(this.keys.del)) {
      this.deleteSelected();
    } else if (Phaser.Input.Keyboard.JustDown(this.keys.d)) {
      this.duplicateSelected();
    } else if (Phaser.Input.Keyboard.JustDown(this.keys.c)) {
      this.copyLevelData("Copied level data");
    } else if (Phaser.Input.Keyboard.JustDown(this.keys.p)) {
      this.playtest();
    }
  }

  isTypingInDomField() {
    return this.isEditableDomTarget(document.activeElement);
  }

  isEditableDomTarget(target) {
    return target instanceof HTMLElement && (
      target.matches("input, textarea, select") ||
      target.isContentEditable
    );
  }

  onPointerDown(pointer) {
    const worldPoint = this.worldPointFromPointer(pointer);
    if (!worldPoint) return;

    const world = this.snapPoint(worldPoint.x, worldPoint.y);
    const hit = this.findObjectAt(world.x, world.y);
    if (hit) {
      const group = hit.data.groupId ? this.objects.filter((obj) => obj.data.groupId === hit.data.groupId) : [hit];
      const targets = this.selection.includes(hit) ? this.selection : group;
      this.selectObjects(targets, hit);
      this.dragging = {
        objects: targets.map((obj) => ({ obj, startX: obj.data.x, startY: obj.data.y })),
        startX: world.x,
        startY: world.y
      };
      return;
    }

    if (!this.activeTool) {
      this.startAreaSelection(world.x, world.y);
      return;
    }

    const created = this.createDataForTool(world.x, world.y);
    this.clampDataToWorld(created.type, created);
    this.addData(created);
    this.rebuildObjects();
    this.selectObject(this.objects[this.objects.length - 1]);
    this.activeTool = null;
    this.updateToolButtons();
    this.markDirty();
  }

  onPointerMove(pointer) {
    const worldPoint = this.worldPointFromPointer(pointer);
    if (!worldPoint) {
      this.setHoveredObject(null);
      return;
    }

    const world = this.snapPoint(worldPoint.x, worldPoint.y);
    if (this.areaSelection) {
      this.updateAreaSelection(world.x, world.y);
      return;
    }

    if (!this.dragging) {
      this.setHoveredObject(this.findObjectAt(world.x, world.y));
      return;
    }

    const dx = world.x - this.dragging.startX;
    const dy = world.y - this.dragging.startY;
    const clampedDelta = this.clampedSelectionDelta(this.dragging.objects, dx, dy);
    for (const item of this.dragging.objects) {
      item.obj.data.x = item.startX + clampedDelta.dx;
      item.obj.data.y = item.startY + clampedDelta.dy;
      this.clampDataToWorld(item.obj.type, item.obj.data);
      this.syncVisual(item.obj);
    }
    this.refreshInspectorValues();
    this.markDirty();
  }

  createDataForTool(x, y) {
    if (this.activeTool === "platform") return { type: "platform", x, y, width: 220, height: 34 };
    if (this.activeTool === "coin") return { type: "coin", x, y };
    if (this.activeTool === "hazard") return { type: "hazard", x, y };
    if (this.activeTool === "enemy") return { type: "enemy", x, y, min: x - 120, max: x + 120 };
    if (this.activeTool === "challenge") {
      const index = this.nextChallenge;
      this.nextChallenge += 1;
      return { type: "challenge", x, y, width: 170, height: 110, label: `CHALLENGE ${String(index).padStart(2, "0")}`, difficulty: "easy" };
    }
    if (this.activeTool === "merchant") return { type: "merchant", x, y, width: 240, height: 120, npcX: x, npcY: y - 11 };
    if (this.activeTool === "exitGate") return { type: "exitGate", x, y, width: 115, height: 138 };
    if (this.activeTool === "playerSpawn") return { type: "playerSpawn", x, y };
    return { type: "sign", x, y, text: "SIGN" };
  }

  addData(item) {
    const { type, ...data } = item;
    if (type === "platform") this.draft.platforms.push(data);
    if (type === "coin") this.draft.coins.push(data);
    if (type === "hazard") this.draft.hazards.push(data);
    if (type === "enemy") this.draft.enemies.push(data);
    if (type === "challenge") this.draft.challenges.push(data);
    if (type === "merchant") this.draft.merchant = data;
    if (type === "exitGate") this.draft.exitGate = data;
    if (type === "playerSpawn") this.draft.playerSpawn = data;
    if (type === "sign") this.draft.signs.push(data);
    return data;
  }

  rebuildObjects() {
    for (const obj of this.objects) {
      obj.visual.destroy();
      if (obj.label) obj.label.destroy();
      if (obj.patrol) obj.patrol.destroy();
    }
    this.objects = [];

    this.addObjects("platform", this.draft.platforms);
    this.addObjects("coin", this.draft.coins);
    this.addObjects("hazard", this.draft.hazards);
    this.addObjects("enemy", this.draft.enemies);
    this.addObjects("challenge", this.draft.challenges);
    this.addObjects("merchant", this.draft.merchant ? [this.draft.merchant] : []);
    this.addObjects("exitGate", this.draft.exitGate ? [this.draft.exitGate] : []);
    this.addObjects("playerSpawn", this.draft.playerSpawn ? [this.draft.playerSpawn] : []);
    this.addObjects("sign", this.draft.signs);
  }

  addObjects(type, list) {
    for (const data of list) {
      const colors = COLORS[type];
      let visual;
      if (type === "coin") {
        visual = this.add.circle(data.x, data.y, 12, colors.fill).setStrokeStyle(3, colors.stroke);
      } else if (type === "hazard") {
        visual = this.add.triangle(data.x, data.y, 0, 30, 18, 0, 36, 30, colors.fill).setStrokeStyle(2, colors.stroke);
      } else if (type === "enemy") {
        visual = this.add.rectangle(data.x, data.y, 40, 38, colors.fill).setStrokeStyle(3, colors.stroke);
      } else if (type === "playerSpawn") {
        visual = this.add.rectangle(data.x, data.y, 34, 48, colors.fill).setStrokeStyle(3, colors.stroke);
      } else {
        visual = this.add.rectangle(data.x, data.y, data.width || 90, data.height || 34, colors.fill, type === "sign" ? 0.9 : 0.55).setStrokeStyle(3, colors.stroke);
      }
      visual.setDepth(10);
      const obj = { type, data, visual };
      if (type === "enemy") {
        obj.patrol = this.add.line(0, 0, data.min, data.y + 36, data.max, data.y + 36, 0xe7d66b, 0.8).setOrigin(0).setDepth(8);
      }
      if (type === "challenge" || type === "sign") {
        obj.label = this.add.text(data.x - 55, data.y - 58, data.label || data.text || type.toUpperCase(), this.smallStyle("#e7d66b")).setDepth(11);
      }
      this.objects.push(obj);
      this.syncVisual(obj);
    }
  }

  syncVisual(obj) {
    obj.visual.setPosition(obj.data.x, obj.data.y);
    if (obj.visual.setSize && obj.data.width && obj.data.height) {
      obj.visual.setSize(obj.data.width, obj.data.height);
      obj.visual.setDisplaySize(obj.data.width, obj.data.height);
    }
    if (obj.label) {
      obj.label.setPosition(obj.data.x - 55, obj.data.y - 58);
      obj.label.setText(obj.data.label || obj.data.text || obj.type.toUpperCase());
    }
    if (obj.patrol) {
      obj.patrol.destroy();
      obj.patrol = this.add.line(0, 0, obj.data.min, obj.data.y + 36, obj.data.max, obj.data.y + 36, 0xe7d66b, 0.8).setOrigin(0).setDepth(8);
    }
  }

  findObjectAt(x, y) {
    for (let i = this.objects.length - 1; i >= 0; i -= 1) {
      const obj = this.objects[i];
      if (Phaser.Geom.Rectangle.Contains(obj.visual.getBounds(), x, y)) {
        return obj;
      }
    }
    return null;
  }

  startAreaSelection(x, y) {
    this.clearSelection();
    const visual = this.add.rectangle(x, y, 1, 1, 0x6ad8b4, 0.12)
      .setStrokeStyle(2, 0x8ee0c6, 0.95)
      .setDepth(100);
    this.areaSelection = { startX: x, startY: y, x, y, visual };
  }

  updateAreaSelection(x, y) {
    if (!this.areaSelection) return;
    this.areaSelection.x = x;
    this.areaSelection.y = y;
    const bounds = this.areaSelectionBounds();
    this.areaSelection.visual.setPosition(bounds.centerX, bounds.centerY);
    this.areaSelection.visual.setSize(bounds.width, bounds.height);
    this.areaSelection.visual.setDisplaySize(bounds.width, bounds.height);
  }

  finishAreaSelection() {
    if (!this.areaSelection) return;
    const bounds = this.areaSelectionBounds();
    const selected = bounds.width < 10 && bounds.height < 10
      ? []
      : this.objects.filter((obj) => Phaser.Geom.Intersects.RectangleToRectangle(bounds, obj.visual.getBounds()));
    this.areaSelection.visual.destroy();
    this.areaSelection = null;
    if (selected.length > 0) {
      this.selectObjects(selected);
    } else {
      this.clearSelection();
      this.showMessage("Pick an item first");
    }
  }

  areaSelectionBounds() {
    const minX = Math.min(this.areaSelection.startX, this.areaSelection.x);
    const minY = Math.min(this.areaSelection.startY, this.areaSelection.y);
    const maxX = Math.max(this.areaSelection.startX, this.areaSelection.x);
    const maxY = Math.max(this.areaSelection.startY, this.areaSelection.y);
    return new Phaser.Geom.Rectangle(minX, minY, maxX - minX, maxY - minY);
  }

  clampedSelectionDelta(items, dx, dy) {
    let minDx = -Infinity;
    let maxDx = Infinity;
    let minDy = -Infinity;
    let maxDy = Infinity;
    for (const { obj, startX, startY } of items) {
      const size = this.objectSize(obj.type, obj.data);
      minDx = Math.max(minDx, size.width / 2 - startX);
      maxDx = Math.min(maxDx, WORLD_WIDTH - size.width / 2 - startX);
      minDy = Math.max(minDy, size.height / 2 - startY);
      maxDy = Math.min(maxDy, GROUND_TOP - size.height / 2 - startY);
    }
    return {
      dx: Phaser.Math.Clamp(dx, minDx, maxDx),
      dy: Phaser.Math.Clamp(dy, minDy, maxDy)
    };
  }

  selectObject(obj) {
    this.selectObjects([obj], obj);
  }

  selectObjects(objects, primary = objects[0] || null) {
    this.selection = objects;
    this.selected = primary;
    this.activeTool = null;
    this.objects.forEach((item) => {
      const colors = COLORS[item.type];
      const selected = objects.includes(item);
      item.visual.setStrokeStyle(selected ? 5 : 3, selected ? 0xf4e786 : colors.stroke);
      item.visual.setAlpha(1);
    });
    this.updateToolButtons();
    this.renderInspector();
  }

  renderInspector() {
    if (!this.inspectorEl) return;
    if (!this.selected) {
      this.inspectorEl.innerHTML = `
        <div class="rounded-sm border border-[#385346] bg-[#0d1a16] p-3 text-sm leading-6 text-[#b8c7b5]">
          No object selected.<br><br>
          Drag an empty area to select multiple items, or pick an item and drag it. Escape clears selection.
        </div>
      `;
      return;
    }

    if (this.selection.length > 1) {
      const grouped = this.selection.every((obj) => obj.data.groupId && obj.data.groupId === this.selection[0].data.groupId);
      this.inspectorEl.innerHTML = `
        <div class="flex items-center justify-between gap-3">
          <div class="text-lg font-bold uppercase tracking-wide text-[#f4e786]">${this.selection.length} SELECTED</div>
          <button data-action="delete" aria-label="Delete selected" class="grid h-9 w-9 place-items-center rounded-sm border border-[#7b332d] bg-[#d65f4f] text-[#07100f] transition-colors hover:border-[#f07b6e] hover:bg-[#f07b6e]">${this.lucideSvg(Trash2, 18)}</button>
        </div>
        <div class="mt-5 grid grid-cols-1 gap-2">
          <button data-action="duplicate" class="rounded-sm border border-[#b9a44c] bg-[#e7d66b] px-2 py-2 text-sm font-bold text-[#07100f] transition-colors hover:border-[#f4e786] hover:bg-[#f4e786]">DUPLICATE</button>
          <button data-action="${grouped ? "ungroup" : "group"}" class="flex items-center justify-center gap-2 rounded-sm border border-[#6ad8b4] bg-[#3fa68f] px-2 py-2 text-sm font-bold text-[#07100f] transition-colors hover:border-[#8ee0c6] hover:bg-[#62cba8]">
            ${this.lucideSvg(grouped ? Ungroup : Group, 17)}
            ${grouped ? "UNGROUP" : "GROUP"}
          </button>
        </div>
      `;
      this.inspectorEl.querySelector("[data-action='duplicate']")?.addEventListener("click", () => this.duplicateSelected());
      this.inspectorEl.querySelector("[data-action='delete']")?.addEventListener("click", () => this.deleteSelected());
      this.inspectorEl.querySelector("[data-action='group']")?.addEventListener("click", () => this.groupSelected());
      this.inspectorEl.querySelector("[data-action='ungroup']")?.addEventListener("click", () => this.ungroupSelected());
      return;
    }

    const fields = FIELD_CONFIG[this.selected.type] || [];
    const title = TOOL_DEFS.find((tool) => tool.id === this.selected.type)?.label || this.selected.type;
    this.inspectorEl.innerHTML = `
      <div class="flex items-center justify-between gap-3">
        <div class="text-lg font-bold uppercase tracking-wide text-[#f4e786]">${title}</div>
        <button data-action="delete" aria-label="Delete selected" class="grid h-9 w-9 place-items-center rounded-sm border border-[#7b332d] bg-[#d65f4f] text-[#07100f] transition-colors hover:border-[#f07b6e] hover:bg-[#f07b6e]">${this.lucideSvg(Trash2, 18)}</button>
      </div>
      <div class="mt-4 flex flex-col gap-3">
        ${fields.map(([key, type]) => this.fieldMarkup(key, type, this.selected.data[key])).join("")}
      </div>
      <div class="mt-5 grid grid-cols-1 gap-2">
        ${this.canDuplicateSelected() ? `<button data-action="duplicate" class="rounded-sm border border-[#b9a44c] bg-[#e7d66b] px-2 py-2 text-sm font-bold text-[#07100f] transition-colors hover:border-[#f4e786] hover:bg-[#f4e786]">DUPLICATE</button>` : ""}
      </div>
    `;

    this.inspectorEl.querySelectorAll("[data-field]").forEach((input) => {
      input.addEventListener("input", () => this.updateSelectedField(input.dataset.field, input.value, input.dataset.kind));
    });
    this.inspectorEl.querySelector("[data-action='duplicate']")?.addEventListener("click", () => this.duplicateSelected());
    this.inspectorEl.querySelector("[data-action='delete']")?.addEventListener("click", () => this.deleteSelected());
  }

  fieldMarkup(key, type, value) {
    const label = key.replace(/([A-Z])/g, " $1").toUpperCase();
    if (type === "select") {
      return `
        <label class="flex flex-col gap-1 text-xs font-bold text-[#8fa89d]">
          ${label}
          <select data-field="${key}" data-kind="${type}" class="rounded-sm border border-[#385346] bg-[#102019] px-2 py-2 text-sm text-[#edf8ed] outline-none transition focus:border-[#f4e786]">
            ${["easy", "medium", "hard"].map((item) => `<option value="${item}" ${value === item ? "selected" : ""}>${item}</option>`).join("")}
          </select>
        </label>
      `;
    }
    return `
      <label class="flex flex-col gap-1 text-xs font-bold text-[#8fa89d]">
        ${label}
        <input data-field="${key}" data-kind="${type}" type="${type === "number" ? "number" : "text"}" value="${value ?? ""}" class="rounded-sm border border-[#385346] bg-[#102019] px-2 py-2 text-sm text-[#edf8ed] outline-none transition focus:border-[#f4e786]" />
      </label>
    `;
  }

  updateSelectedField(key, value, type) {
    if (!this.selected) return;
    this.selected.data[key] = type === "number" ? Number(value) || 0 : value;
    this.clampDataToWorld(this.selected.type, this.selected.data);
    this.syncVisual(this.selected);
    this.markDirty();
  }

  refreshInspectorValues() {
    if (!this.selected || !this.inspectorEl) return;
    this.inspectorEl.querySelectorAll("[data-field]").forEach((input) => {
      const value = this.selected.data[input.dataset.field];
      if (document.activeElement !== input) {
        input.value = value ?? "";
      }
    });
  }

  canDuplicateSelected() {
    return this.selection.length > 0 && this.selection.every((obj) => !["merchant", "exitGate", "playerSpawn"].includes(obj.type));
  }

  duplicateSelected() {
    if (!this.canDuplicateSelected()) return;
    const sourceGroupId = this.selection[0]?.data.groupId;
    const shouldDuplicateAsGroup = this.selection.length > 1 && sourceGroupId && this.selection.every((obj) => obj.data.groupId === sourceGroupId);
    const nextGroupId = shouldDuplicateAsGroup ? `group-${Date.now().toString(36)}` : null;
    const copied = this.selection.map((obj) => {
      const copy = { type: obj.type, ...structuredClone(obj.data), x: obj.data.x + 40, y: obj.data.y - 20 };
      if (nextGroupId) {
        copy.groupId = nextGroupId;
      } else {
        delete copy.groupId;
      }
      this.clampDataToWorld(copy.type, copy);
      return this.addData(copy);
    });
    this.rebuildObjects();
    this.selectObjects(this.objects.filter((obj) => copied.includes(obj.data)));
    this.markDirty();
  }

  deleteSelected() {
    if (!this.selected) return;
    for (const { type, data } of this.selection) {
      if (type === "merchant") this.draft.merchant = null;
      else if (type === "exitGate") this.draft.exitGate = null;
      else if (type === "playerSpawn") this.draft.playerSpawn = null;
      else this.listForType(type).splice(this.listForType(type).indexOf(data), 1);
    }
    this.selected = null;
    this.selection = [];
    this.rebuildObjects();
    this.renderInspector();
    this.updateToolButtons();
    this.markDirty();
  }

  groupSelected() {
    if (this.selection.length < 2) return;
    const groupId = `group-${Date.now().toString(36)}`;
    this.selection.forEach((obj) => {
      obj.data.groupId = groupId;
    });
    this.renderInspector();
    this.markDirty();
  }

  ungroupSelected() {
    if (this.selection.length < 1) return;
    this.selection.forEach((obj) => {
      delete obj.data.groupId;
    });
    this.renderInspector();
    this.markDirty();
  }

  listForType(type) {
    return {
      platform: this.draft.platforms,
      coin: this.draft.coins,
      hazard: this.draft.hazards,
      enemy: this.draft.enemies,
      challenge: this.draft.challenges,
      sign: this.draft.signs
    }[type];
  }

  async saveLevel() {
    const name = this.draft.name.trim();
    if (!name) {
      this.showMessage("Level name is required.");
      return;
    }
    if (this.getEditableLevels().some((level) => level.name.trim().toLowerCase() === name.toLowerCase() && level.id !== this.draft.id)) {
      this.showMessage("Level name must be unique.");
      return;
    }
    if (!this.draft.playerSpawn || !this.draft.exitGate) {
      this.showMessage("You must have a Spawn and Exit point before saving.");
      return;
    }
    if (!window.edgecase?.saveLevel) {
      this.showMessage("Save is only available in the Electron dev app.");
      return;
    }

    this.draft.name = name;
    try {
      const saved = await window.edgecase.saveLevel(this.toLevelData());
      this.draft.id = saved.id;
      this.registry.set("devSavedLevels", this.upsertDevSavedLevel(this.toLevelData()));
      this.registry.set("selectedLevelId", saved.id);
      this.savedSnapshot = this.serializeDraft();
      this.updateSaveStatus();
      this.refreshEditableLevelOptions();
      this.showMessage("Saved permanently.");
    } catch (error) {
      this.showMessage(error?.message || "Could not save level.");
    }
  }

  playtest() {
    if (!this.draft.playerSpawn || !this.draft.exitGate) {
      this.showMessage("Add a Spawn and Exit before playtesting.");
      return;
    }
    this.registry.set("editorDraft", structuredClone(this.draft));
    this.registry.set("draftLevel", this.toLevelData());
    this.scene.start("GameScene");
  }

  exitEditor() {
    if (!this.isSaved() && !window.confirm("Exit Level Maker? Unsaved changes will be deleted.")) {
      return;
    }
    this.registry.remove("editorDraft");
    this.scene.start("MenuScene");
  }

  async copyLevelData(message) {
    const text = JSON.stringify(this.toLevelData(), null, 2);
    try {
      await navigator.clipboard.writeText(text);
      this.showMessage(message);
    } catch {
      window.prompt("Copy level data", text);
      this.showMessage("Copy prompt opened");
    }
  }

  toLevelData() {
    const level = structuredClone(this.draft);
    level.platforms = [
      { x: WORLD_WIDTH / 2, y: GROUND_Y, width: WORLD_WIDTH, height: GROUND_HEIGHT },
      ...(level.platforms || [])
    ];
    return level;
  }

  upsertDevSavedLevel(level) {
    const levels = this.registry.get("devSavedLevels") || [];
    const nextLevel = structuredClone(level);
    const index = levels.findIndex((item) => item.id === nextLevel.id);
    if (index >= 0) {
      levels[index] = nextLevel;
      return levels;
    }
    return [...levels, nextLevel];
  }

  getEditableLevels() {
    const devSavedLevels = this.registry.get("devSavedLevels") || [];
    const levelsById = new Map(LEVELS.map((level) => [level.id, level]));
    for (const level of devSavedLevels) {
      levelsById.set(level.id, level);
    }
    return Array.from(levelsById.values());
  }

  loadEditableLevel(id) {
    if (!id) {
      this.draft = this.createBlankLevel();
    } else {
      const level = this.getEditableLevels().find((item) => item.id === id);
      if (!level) return;
      this.draft = this.stripFixedGround(structuredClone(level));
    }

    this.selected = null;
    this.activeTool = null;
    this.savedSnapshot = this.serializeDraft();
    this.nameInputEl.value = this.draft.name;
    this.rebuildObjects();
    this.updateToolButtons();
    this.renderInspector();
    this.updateSaveStatus();
    this.showMessage(id ? "Loaded level for editing." : "Blank draft ready.");
  }

  refreshEditableLevelOptions() {
    if (!this.editLevelEl) return;
    this.editLevelEl.innerHTML = `
      <option value="">Blank draft</option>
      ${this.getEditableLevels().map((level) => `<option value="${this.escapeHtml(level.id)}" ${level.id === this.draft.id ? "selected" : ""}>${this.escapeHtml(level.name)}</option>`).join("")}
    `;
  }

  createBlankLevel() {
    return {
      id: "new-level",
      name: "New Level",
      worldWidth: WORLD_WIDTH,
      floorY: 652,
      playerSpawn: null,
      platforms: [],
      coins: [],
      hazards: [],
      enemies: [],
      challenges: [],
      merchant: null,
      exitGate: null,
      signs: []
    };
  }

  stripFixedGround(level) {
    return {
      ...level,
      platforms: (level.platforms || []).filter((platform) => {
        return !(platform.x === WORLD_WIDTH / 2 && platform.y === GROUND_Y && platform.width === WORLD_WIDTH && platform.height === GROUND_HEIGHT);
      })
    };
  }

  markDirty() {
    this.updateSaveStatus();
  }

  isSaved() {
    return this.savedSnapshot !== null && this.savedSnapshot === this.serializeDraft();
  }

  serializeDraft() {
    return JSON.stringify(this.draft);
  }

  updateSaveStatus() {
    if (!this.statusEl) return;
    const saved = this.isSaved();
    this.statusEl.textContent = saved ? "SAVED" : "UNSAVED";
    this.statusEl.className = saved
      ? "mt-3 rounded-sm border border-[#3fa68f] bg-[#102019] px-3 py-2 text-xs font-bold text-[#8ee0c6]"
      : "mt-3 rounded-sm border border-[#7b332d] bg-[#1f1110] px-3 py-2 text-xs font-bold text-[#f07b6e]";
  }

  clearSelection() {
    this.selected = null;
    this.selection = [];
    this.clearObjectFocus();
    this.renderInspector();
  }

  clearObjectFocus() {
    this.objects.forEach((item) => {
      const colors = COLORS[item.type];
      item.visual.setStrokeStyle(3, colors.stroke);
      item.visual.setAlpha(1);
    });
  }

  setHoveredObject(obj) {
    if (this.hoveredObject === obj) return;
    if (this.hoveredObject && !this.selection.includes(this.hoveredObject)) {
      const colors = COLORS[this.hoveredObject.type];
      this.hoveredObject.visual.setStrokeStyle(3, colors.stroke);
      this.hoveredObject.visual.setAlpha(1);
    }
    this.hoveredObject = obj;
    if (obj && !this.selection.includes(obj)) {
      obj.visual.setStrokeStyle(4, 0x8ee0c6);
      obj.visual.setAlpha(0.86);
    }
  }

  toggleHud() {
    this.hudVisible = !this.hudVisible;
    this.hudRoot.classList.toggle("hidden", !this.hudVisible);
    this.resizeWorldViewport();
  }

  resizeWorldViewport() {
    const x = this.hudVisible ? HUD_LEFT_WIDTH : 0;
    const width = this.hudVisible ? WORLD_VIEW_WIDTH : 1280;
    this.cameras.main.setViewport(x, 0, width, WORLD_HEIGHT);
    this.cameras.main.scrollX = Phaser.Math.Clamp(this.cameras.main.scrollX, 0, Math.max(0, WORLD_WIDTH - width));
  }

  updateToolButtons() {
    this.toolListEl?.querySelectorAll("[data-tool]").forEach((button) => {
      const disabled =
        (button.dataset.tool === "playerSpawn" && Boolean(this.draft.playerSpawn)) ||
        (button.dataset.tool === "exitGate" && Boolean(this.draft.exitGate));
      button.disabled = disabled;
      button.className = this.toolClass(button.dataset.tool === this.activeTool, disabled);
    });
  }

  showMessage(message) {
    if (!this.messageEl) return;
    this.messageEl.textContent = message;
    window.clearTimeout(this.messageTimer);
    this.messageTimer = window.setTimeout(() => {
      if (this.messageEl) this.messageEl.textContent = "";
    }, 2200);
  }

  destroyDomHud() {
    window.clearTimeout(this.messageTimer);
    this.hudRoot?.remove();
    this.hudRoot = null;
  }

  escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  lucideSvg(icon, size) {
    const children = icon
      .map(([tag, attrs]) => {
        const attrText = Object.entries(attrs)
          .map(([key, value]) => `${key}="${this.escapeHtml(value)}"`)
          .join(" ");
        return `<${tag} ${attrText}></${tag}>`;
      })
      .join("");

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${children}</svg>`;
  }

  toolClass(active, disabled = false) {
    if (disabled) {
      return "w-full cursor-not-allowed rounded-sm border border-[#263d35] bg-[#0a1411] px-3 py-2 text-left text-sm font-bold text-[#526a60] opacity-70";
    }

    return [
      "w-full rounded-sm border px-3 py-2 text-left text-sm font-bold transition duration-100",
      active
        ? "border-[#f4e786] bg-[#e7d66b] text-[#07100f]"
        : "border-[#385346] bg-[#102019] text-[#edf8ed] hover:border-[#6d8e78] hover:bg-[#21372e] hover:text-[#f4e786]"
    ].join(" ");
  }

  snapPoint(x, y) {
    return {
      x: Math.round(x / 10) * 10,
      y: Math.round(y / 10) * 10
    };
  }

  worldPointFromPointer(pointer) {
    const camera = this.cameras.main;
    const insideViewport =
      pointer.x >= camera.x &&
      pointer.x <= camera.x + camera.width &&
      pointer.y >= camera.y &&
      pointer.y <= camera.y + camera.height;

    if (!insideViewport) {
      return null;
    }

    return {
      x: camera.scrollX + ((pointer.x - camera.x) / camera.zoom),
      y: camera.scrollY + ((pointer.y - camera.y) / camera.zoom)
    };
  }

  clampDataToWorld(type, data) {
    const size = this.objectSize(type, data);
    data.x = Phaser.Math.Clamp(data.x, size.width / 2, WORLD_WIDTH - size.width / 2);
    data.y = Phaser.Math.Clamp(data.y, size.height / 2, GROUND_TOP - size.height / 2);
    if (type === "enemy") {
      data.min = Phaser.Math.Clamp(data.min, 0, WORLD_WIDTH);
      data.max = Phaser.Math.Clamp(data.max, 0, WORLD_WIDTH);
      if (data.min > data.max) {
        [data.min, data.max] = [data.max, data.min];
      }
    }
    if (type === "merchant") {
      data.npcX = Phaser.Math.Clamp(data.npcX ?? data.x, 30, WORLD_WIDTH - 30);
      data.npcY = Phaser.Math.Clamp(data.npcY ?? data.y - 11, 43, GROUND_TOP - 43);
    }
  }

  objectSize(type, data) {
    if (type === "coin") return { width: 24, height: 24 };
    if (type === "hazard") return { width: 36, height: 30 };
    if (type === "enemy") return { width: 40, height: 38 };
    if (type === "playerSpawn") return { width: 34, height: 48 };
    return { width: data.width || 90, height: data.height || 34 };
  }

  smallStyle(color) {
    return {
      fontFamily: "Cascadia Mono, Consolas, monospace",
      fontSize: "14px",
      color
    };
  }
}
