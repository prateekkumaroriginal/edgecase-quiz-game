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

const DEFAULT_WORLD_WIDTH = 4300;
const DEFAULT_WORLD_HEIGHT = 720;
const MIN_WORLD_WIDTH = 1280;
const MIN_WORLD_HEIGHT = 720;
const DEAD_CANVAS_RIGHT = 900;
const DEAD_CANVAS_TOP = 420;
const DEAD_CANVAS_BOTTOM = 420;
const WORLD_EXPAND_PADDING = 120;
const GROUND_HEIGHT = 64;
const GROUND_BOTTOM_MARGIN = 4;
const HUD_LEFT_WIDTH = 246;
const HUD_RIGHT_X = 1035;
const WORLD_VIEW_WIDTH = HUD_RIGHT_X - HUD_LEFT_WIDTH;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.1;
const DEFAULT_ZOOM = 1;
const GRID_SIZES = [4, 8, 16, 32, 64];
const DEFAULT_GRID_SIZE = 16;

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
    this.cameraDrag = null;
    this.areaSelection = null;
    this.hoveredObject = null;
    this.hudVisible = true;
    this.gridSize = DEFAULT_GRID_SIZE;
    this.snapEnabled = true;
    this.cursorWorldPoint = null;
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
      return this.normalizeDraftDimensions(this.stripFixedGround(structuredClone(retainedDraft)));
    }

    return this.normalizeDraftDimensions(this.createBlankLevel());
  }

  createWorldChrome() {
    this.worldChrome = this.add.container(0, 0).setDepth(-20);
    this.redrawWorldChrome();
  }

  createInputs() {
    this.input.on("pointerdown", (pointer) => this.onPointerDown(pointer));
    this.input.on("pointermove", (pointer) => this.onPointerMove(pointer));
    this.input.on("pointerup", () => this.onPointerUp());
    window.addEventListener("pointerup", this.handleWindowPointerUp);
    window.addEventListener("blur", this.handleWindowPointerCancel);
    this.input.on("wheel", (pointer, _objects, dx, dy, event) => this.onWheel(pointer, dx, dy, event));

    this.keys = this.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      del: Phaser.Input.Keyboard.KeyCodes.DELETE,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      c: Phaser.Input.Keyboard.KeyCodes.C,
      p: Phaser.Input.Keyboard.KeyCodes.P,
      ctrl: Phaser.Input.Keyboard.KeyCodes.CTRL,
      shift: Phaser.Input.Keyboard.KeyCodes.SHIFT,
      alt: Phaser.Input.Keyboard.KeyCodes.ALT,
      zero: Phaser.Input.Keyboard.KeyCodes.ZERO,
      i: Phaser.Input.Keyboard.KeyCodes.I,
      esc: Phaser.Input.Keyboard.KeyCodes.ESC
    });
  }

  createDomHud() {
    const host = document.getElementById("game-root") || document.body;
    this.hudRoot = document.createElement("div");
    this.hudRoot.className = "pointer-events-none absolute inset-0 z-10 font-mono text-[#edf8ed]";
    this.hudRoot.innerHTML = `
      <div data-zoom-control class="pointer-events-auto absolute left-1/2 top-3 flex -translate-x-1/2 items-center overflow-hidden rounded-sm border border-[#385346] bg-[#06100e]/90 text-xs font-bold text-[#f4e786] shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
        <button data-zoom-out type="button" title="Zoom out" class="grid h-8 w-8 place-items-center border-r border-[#385346] text-lg leading-none transition hover:bg-[#102019] hover:text-[#fff3a6]">-</button>
        <button data-zoom-indicator type="button" title="Reset zoom" class="h-8 min-w-24 px-3 transition hover:bg-[#102019] hover:text-[#fff3a6]">ZOOM 100%</button>
        <button data-zoom-in type="button" title="Zoom in" class="grid h-8 w-8 place-items-center border-l border-[#385346] text-lg leading-none transition hover:bg-[#102019] hover:text-[#fff3a6]">+</button>
      </div>
      <div data-grid-control class="pointer-events-auto absolute left-1/2 top-14 flex -translate-x-1/2 items-center overflow-hidden rounded-sm border border-[#385346] bg-[#06100e]/90 text-xs font-bold text-[#edf8ed] shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
        <div class="border-r border-[#385346] px-3 text-[#8fa89d]">GRID</div>
        ${GRID_SIZES.map((size) => `<button data-grid-size="${size}" type="button" title="Grid ${size}px" class="h-8 min-w-10 border-r border-[#385346] px-2 transition hover:bg-[#102019] hover:text-[#fff3a6]">${size}</button>`).join("")}
        <button data-snap-toggle type="button" title="Toggle snapping" class="h-8 min-w-24 border-r border-[#385346] px-3 transition hover:bg-[#102019] hover:text-[#fff3a6]">SNAP ON</button>
        <div data-snap-modifier class="min-w-20 px-3 text-center text-[#8fa89d]">ALT: SNAP</div>
      </div>
      <div data-cursor-coords class="pointer-events-none absolute bottom-3 left-1/2 min-w-40 -translate-x-1/2 rounded-sm border border-[#385346] bg-[#06100e]/90 px-3 py-2 text-center text-xs font-bold text-[#8fa89d] shadow-[0_8px_24px_rgba(0,0,0,0.3)]">X: ---- Y: ----</div>
      <aside data-left-panel class="pointer-events-auto absolute left-0 top-0 flex h-full w-[246px] flex-col border-r border-[#385346] bg-[#06100e]/95 p-4 shadow-[18px_0_36px_rgba(0,0,0,0.35)]">
        <div class="font-[EdgecaseTitle] text-3xl text-[#e7d66b]">LEVEL MAKER</div>
        <div class="mt-2 text-xs text-[#8fa89d]">Ctrl+I hides panels</div>
        <label class="mt-5 flex flex-col gap-1 text-xs font-bold text-[#8fa89d]">
          LEVEL NAME
          <input data-level-name type="text" value="${this.escapeHtml(this.draft.name)}" class="rounded-sm border border-[#385346] bg-[#102019] px-2 py-2 text-sm text-[#edf8ed] outline-none transition focus:border-[#f4e786]" />
        </label>
        <div data-canvas-size class="mt-4 grid grid-cols-2 gap-2">
          <label class="flex flex-col gap-1 text-xs font-bold text-[#8fa89d]">
            WIDTH
            <input data-world-width type="number" min="${MIN_WORLD_WIDTH}" step="10" value="${this.worldWidth()}" class="rounded-sm border border-[#385346] bg-[#102019] px-2 py-2 text-sm text-[#edf8ed] outline-none transition focus:border-[#f4e786]" />
          </label>
          <label class="flex flex-col gap-1 text-xs font-bold text-[#8fa89d]">
            HEIGHT
            <input data-world-height type="number" min="${MIN_WORLD_HEIGHT}" step="10" value="${this.worldHeight()}" class="rounded-sm border border-[#385346] bg-[#102019] px-2 py-2 text-sm text-[#edf8ed] outline-none transition focus:border-[#f4e786]" />
          </label>
        </div>
        <div class="mt-2 text-xs text-[#8fa89d]">Dead canvas expands on drop</div>
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
        <button data-action="playtest" class="mt-2 flex w-full items-center justify-center gap-3 rounded-sm border border-[#6ad8b4] bg-[#3fa68f] px-3 py-3 text-base font-bold text-[#07100f] transition-colors hover:border-[#8ee0c6] hover:bg-[#62cba8]">
          <span class="inline-block h-0 w-0 border-y-[8px] border-l-[13px] border-y-transparent border-l-[#07100f]"></span>
          <span>PLAYTEST</span>
        </button>
        <div data-save-status class="mt-2 rounded-sm border border-[#385346] bg-[#0d1a16] px-3 py-2 text-xs font-bold text-[#d65f4f]">UNSAVED</div>
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
    this.zoomIndicatorEl = this.hudRoot.querySelector("[data-zoom-indicator]");
    this.snapToggleEl = this.hudRoot.querySelector("[data-snap-toggle]");
    this.snapModifierEl = this.hudRoot.querySelector("[data-snap-modifier]");
    this.cursorCoordsEl = this.hudRoot.querySelector("[data-cursor-coords]");
    this.worldWidthInputEl = this.hudRoot.querySelector("[data-world-width]");
    this.worldHeightInputEl = this.hudRoot.querySelector("[data-world-height]");
    this.nameInputEl = this.hudRoot.querySelector("[data-level-name]");
    this.nameInputEl.addEventListener("input", () => {
      this.draft.name = this.nameInputEl.value;
      this.markDirty();
    });
    this.worldWidthInputEl.addEventListener("input", () => this.updateCanvasSizeFromInputs());
    this.worldHeightInputEl.addEventListener("input", () => this.updateCanvasSizeFromInputs());
    this.hudRoot.querySelector("[data-zoom-out]").addEventListener("click", () => this.adjustCanvasZoom(-ZOOM_STEP));
    this.hudRoot.querySelector("[data-zoom-in]").addEventListener("click", () => this.adjustCanvasZoom(ZOOM_STEP));
    this.zoomIndicatorEl.addEventListener("click", () => this.resetCanvasZoom());
    this.snapToggleEl.addEventListener("click", () => {
      this.snapEnabled = !this.snapEnabled;
      this.updateGridControls();
    });
    this.hudRoot.querySelectorAll("[data-grid-size]").forEach((button) => {
      button.addEventListener("click", () => {
        this.gridSize = Number(button.dataset.gridSize) || DEFAULT_GRID_SIZE;
        this.redrawWorldChrome();
        this.updateGridControls();
      });
    });

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
    this.scale.on(Phaser.Scale.Events.RESIZE, this.resizeWorldViewport, this);
    this.updateToolButtons();
    this.renderInspector();
    this.savedSnapshot = this.serializeDraft();
    this.updateSaveStatus();
    this.updateZoomIndicator();
    this.updateGridControls();
    this.updateCursorCoordinates();
  }

  update() {
    if (this.isTypingInDomField()) {
      return;
    }

    const speed = 16;
    if (this.keys.left.isDown) {
      this.cameras.main.scrollX -= speed;
      this.clampCameraScroll();
    } else if (this.keys.right.isDown) {
      this.cameras.main.scrollX += speed;
      this.clampCameraScroll();
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.zero) && this.keys.ctrl.isDown) {
      this.resetCanvasZoom();
      return;
    }

    this.updateGridControls();

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

  blurActiveDomField() {
    if (this.isEditableDomTarget(document.activeElement)) {
      document.activeElement.blur();
    }
  }

  worldWidth() {
    return this.draft?.worldWidth || DEFAULT_WORLD_WIDTH;
  }

  worldHeight() {
    return this.draft?.worldHeight || DEFAULT_WORLD_HEIGHT;
  }

  groundY() {
    return this.worldHeight() - GROUND_HEIGHT / 2 - GROUND_BOTTOM_MARGIN;
  }

  groundTop() {
    return this.groundY() - GROUND_HEIGHT / 2;
  }

  editableMinY() {
    return -DEAD_CANVAS_TOP;
  }

  editableMaxX() {
    return this.worldWidth() + DEAD_CANVAS_RIGHT;
  }

  normalizeDraftDimensions(level) {
    level.worldWidth = Math.max(MIN_WORLD_WIDTH, Number(level.worldWidth) || DEFAULT_WORLD_WIDTH);
    level.worldHeight = Math.max(MIN_WORLD_HEIGHT, Number(level.worldHeight) || DEFAULT_WORLD_HEIGHT);
    level.floorY = level.worldHeight - GROUND_HEIGHT - GROUND_BOTTOM_MARGIN;
    level.platforms ||= [];
    level.coins ||= [];
    level.hazards ||= [];
    level.enemies ||= [];
    level.challenges ||= [];
    level.signs ||= [];
    return level;
  }

  updateCanvasSizeFromInputs() {
    const previousWidth = this.worldWidth();
    const previousHeight = this.worldHeight();
    this.draft.worldWidth = Math.max(MIN_WORLD_WIDTH, Number(this.worldWidthInputEl.value) || MIN_WORLD_WIDTH);
    this.draft.worldHeight = Math.max(MIN_WORLD_HEIGHT, Number(this.worldHeightInputEl.value) || MIN_WORLD_HEIGHT);
    this.draft.floorY = this.groundTop();
    this.updateCanvasSizeInputs();

    if (this.draft.worldWidth < previousWidth || this.draft.worldHeight < previousHeight) {
      this.clampAllObjectsToWorld();
      this.rebuildObjects();
    }

    this.redrawWorldChrome();
    this.resizeWorldViewport();
    this.refreshInspectorValues();
    this.markDirty();
  }

  updateCanvasSizeInputs() {
    if (this.worldWidthInputEl && document.activeElement !== this.worldWidthInputEl) {
      this.worldWidthInputEl.value = this.worldWidth();
    }
    if (this.worldHeightInputEl && document.activeElement !== this.worldHeightInputEl) {
      this.worldHeightInputEl.value = this.worldHeight();
    }
  }

  onWheel(pointer, dx, dy, event) {
    if (!this.pointerInsideWorldViewport(pointer)) return;

    const ctrlDown = pointer.event?.ctrlKey || event?.ctrlKey || this.keys.ctrl.isDown;
    if (!ctrlDown) {
      pointer.event?.preventDefault?.();
      event?.preventDefault?.();
      this.panCanvasByWheel(dx, dy);
      return;
    }

    pointer.event?.preventDefault?.();
    event?.preventDefault?.();

    const direction = dy > 0 ? -1 : 1;
    const nextZoom = Phaser.Math.Clamp(
      this.cameras.main.zoom + direction * ZOOM_STEP,
      MIN_ZOOM,
      MAX_ZOOM
    );

    this.setCanvasZoom(nextZoom, pointer);
  }

  panCanvasByWheel(dx, dy) {
    const camera = this.cameras.main;
    camera.scrollX += dx / camera.zoom;
    camera.scrollY += dy / camera.zoom;
    this.clampCameraScroll();
  }

  setCanvasZoom(nextZoom, pointer = null) {
    const camera = this.cameras.main;
    if (Math.abs(camera.zoom - nextZoom) < 0.001) return;

    const anchorWorld = pointer && this.pointerInsideWorldViewport(pointer)
      ? this.worldPointFromPointer(pointer)
      : null;

    camera.setZoom(nextZoom);

    if (anchorWorld) {
      const pointerWorld = camera.getWorldPoint(pointer.x, pointer.y);
      camera.scrollX += anchorWorld.x - pointerWorld.x;
      camera.scrollY += anchorWorld.y - pointerWorld.y;
    }

    this.clampCameraScroll();
    this.updateZoomIndicator();
  }

  handleWindowPointerUp = () => {
    if (this.areaSelection || this.dragging || this.cameraDrag) {
      this.onPointerUp();
    }
  };

  handleWindowPointerCancel = () => {
    this.cancelPointerInteraction();
  };

  adjustCanvasZoom(delta) {
    this.setCanvasZoom(Phaser.Math.Clamp(
      this.cameras.main.zoom + delta,
      MIN_ZOOM,
      MAX_ZOOM
    ));
  }

  resetCanvasZoom() {
    this.cameras.main.setZoom(DEFAULT_ZOOM);
    this.clampCameraScroll();
    this.updateZoomIndicator();
  }

  onPointerDown(pointer) {
    this.blurActiveDomField();
    if (this.areaSelection || this.dragging || this.cameraDrag) {
      this.cancelPointerInteraction();
    }

    const worldPoint = this.worldPointFromPointer(pointer);
    if (!worldPoint) return;
    this.cursorWorldPoint = worldPoint;
    this.updateCursorCoordinates();

    if (this.keys.shift.isDown) {
      this.startCameraDrag(pointer);
      return;
    }

    const world = this.snapPoint(worldPoint.x, worldPoint.y, pointer);
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
    this.clampDataToEditableArea(created.type, created);
    const added = this.addData(created);
    this.expandWorldToIncludeObjects([{ type: created.type, data: created }]);
    this.clampDataToWorld(created.type, created);
    this.rebuildObjects();
    this.redrawWorldChrome();
    this.resizeWorldViewport();
    this.selectObject(this.objects.find((obj) => obj.data === added) || this.objects[this.objects.length - 1]);
    this.activeTool = null;
    this.updateToolButtons();
    this.markDirty();
  }

  onPointerMove(pointer) {
    const worldPoint = this.worldPointFromPointer(pointer);
    if (!worldPoint) {
      this.cursorWorldPoint = null;
      this.updateCursorCoordinates();
      this.setHoveredObject(null);
      if (!pointer.isDown && (this.areaSelection || this.dragging || this.cameraDrag)) {
        this.cancelPointerInteraction();
      }
      return;
    }
    this.cursorWorldPoint = worldPoint;
    this.updateCursorCoordinates();

    if (this.cameraDrag) {
      this.updateCameraDrag(pointer);
      return;
    }

    const world = this.snapPoint(worldPoint.x, worldPoint.y, pointer);
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
    const clampedDelta = this.clampedEditableSelectionDelta(this.dragging.objects, dx, dy);
    for (const item of this.dragging.objects) {
      item.obj.data.x = item.startX + clampedDelta.dx;
      item.obj.data.y = item.startY + clampedDelta.dy;
      this.clampDataToEditableArea(item.obj.type, item.obj.data);
      this.syncVisual(item.obj);
    }
    this.refreshInspectorValues();
    this.markDirty();
  }

  onPointerUp() {
    const draggedObjects = this.dragging?.objects.map(({ obj }) => obj) || [];
    this.finishAreaSelection();
    this.dragging = null;
    this.cameraDrag = null;
    this.input.setDefaultCursor("default");
    if (draggedObjects.length > 0) {
      this.expandWorldToIncludeObjects(draggedObjects);
      draggedObjects.forEach((obj) => {
        this.clampDataToWorld(obj.type, obj.data);
        this.syncVisual(obj);
      });
      this.redrawWorldChrome();
      this.resizeWorldViewport();
      this.refreshInspectorValues();
      this.markDirty();
    }
  }

  cancelPointerInteraction() {
    if (this.areaSelection) {
      this.areaSelection.visual.destroy();
      this.areaSelection = null;
    }
    this.dragging = null;
    this.cameraDrag = null;
    this.input.setDefaultCursor("default");
  }

  startCameraDrag(pointer) {
    this.cameraDrag = {
      startPointerX: pointer.x,
      startPointerY: pointer.y,
      startScrollX: this.cameras.main.scrollX,
      startScrollY: this.cameras.main.scrollY
    };
    this.input.setDefaultCursor("grabbing");
  }

  updateCameraDrag(pointer) {
    const camera = this.cameras.main;
    const dx = (pointer.x - this.cameraDrag.startPointerX) / camera.zoom;
    const dy = (pointer.y - this.cameraDrag.startPointerY) / camera.zoom;

    camera.scrollX = this.cameraDrag.startScrollX - dx;
    camera.scrollY = this.cameraDrag.startScrollY - dy;
    this.clampCameraScroll();
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

  redrawWorldChrome() {
    this.worldChrome?.removeAll(true);

    const width = this.worldWidth();
    const height = this.worldHeight();
    const groundY = this.groundY();

    const graphics = this.add.graphics().setDepth(-20);
    graphics.fillStyle(0x000000, 1);
    graphics.fillRect(0, -DEAD_CANVAS_TOP, width + DEAD_CANVAS_RIGHT, height + DEAD_CANVAS_TOP + DEAD_CANVAS_BOTTOM);

    graphics.fillStyle(0x000000, 1);
    graphics.fillRect(0, -DEAD_CANVAS_TOP, width, DEAD_CANVAS_TOP);
    graphics.fillRect(width, -DEAD_CANVAS_TOP, DEAD_CANVAS_RIGHT, height + DEAD_CANVAS_TOP + DEAD_CANVAS_BOTTOM);
    graphics.fillRect(0, height, width + DEAD_CANVAS_RIGHT, DEAD_CANVAS_BOTTOM);
    this.drawDeadCanvasDots(graphics, 0, -DEAD_CANVAS_TOP, width + DEAD_CANVAS_RIGHT, height + DEAD_CANVAS_TOP + DEAD_CANVAS_BOTTOM, width, height);

    graphics.fillStyle(0x07100f, 1);
    graphics.fillRect(0, 0, width, height);

    this.drawWorldGrid(graphics, width, height);

    graphics.fillStyle(0x17231d, 0.9);
    graphics.fillRect(0, groundY - GROUND_HEIGHT / 2, width, GROUND_HEIGHT);
    graphics.lineStyle(4, 0xf4e786, 1);
    graphics.strokeLineShape(new Phaser.Geom.Line(0, this.groundTop(), width, this.groundTop()));
    graphics.lineStyle(3, 0xb9a44c, 1);
    graphics.strokeRect(0, groundY - GROUND_HEIGHT / 2, width, GROUND_HEIGHT);

    graphics.lineStyle(5, 0xff6b5e, 1);
    graphics.strokeLineShape(new Phaser.Geom.Line(0, 0, width, 0));
    graphics.lineStyle(3, 0xd65f4f, 0.9);
    graphics.strokeLineShape(new Phaser.Geom.Line(width, 0, width, height));
    graphics.lineStyle(2, 0xd65f4f, 0.28);
    graphics.strokeRect(0, -DEAD_CANVAS_TOP, width + DEAD_CANVAS_RIGHT, height + DEAD_CANVAS_TOP + DEAD_CANVAS_BOTTOM);
    this.worldChrome.add(graphics);

    const groundLabel = this.add.text(14, this.groundTop() - 22, "GROUND", this.smallStyle("#f4e786")).setDepth(-19);
    this.worldChrome.add(groundLabel);

    this.cameras.main.setBounds(0, -DEAD_CANVAS_TOP, width + DEAD_CANVAS_RIGHT, height + DEAD_CANVAS_TOP + DEAD_CANVAS_BOTTOM);
  }

  drawWorldGrid(graphics, width, height) {
    const size = this.gridSize || DEFAULT_GRID_SIZE;
    const majorEvery = size * 4;
    graphics.lineStyle(1, 0x2f4b3e, 0.32);
    for (let x = 0; x <= width; x += size) {
      if (x % majorEvery === 0) continue;
      graphics.strokeLineShape(new Phaser.Geom.Line(x, 0, x, height));
    }
    for (let y = 0; y <= height; y += size) {
      if (y % majorEvery === 0) continue;
      graphics.strokeLineShape(new Phaser.Geom.Line(0, y, width, y));
    }

    graphics.lineStyle(1, 0x6d8e78, 0.56);
    for (let x = 0; x <= width; x += majorEvery) {
      graphics.strokeLineShape(new Phaser.Geom.Line(x, 0, x, height));
    }
    for (let y = 0; y <= height; y += majorEvery) {
      graphics.strokeLineShape(new Phaser.Geom.Line(0, y, width, y));
    }
  }

  drawDeadCanvasDots(graphics, x, y, width, height, playableWidth, playableHeight) {
    if (width <= 0 || height <= 0) return;
    const spacing = 24;
    graphics.fillStyle(0xff3b30, 1);
    for (let dotY = y + spacing / 2; dotY < y + height; dotY += spacing) {
      for (let dotX = x + spacing / 2; dotX < x + width; dotX += spacing) {
        if (dotX >= 0 && dotX <= playableWidth && dotY >= 0 && dotY <= playableHeight) {
          continue;
        }
        graphics.fillRect(Math.round(dotX) - 1, Math.round(dotY) - 1, 3, 3);
      }
    }
  }

  objectBounds(type, data) {
    const size = this.objectSize(type, data);
    return {
      left: data.x - size.width / 2,
      right: data.x + size.width / 2,
      top: data.y - size.height / 2,
      bottom: data.y + size.height / 2
    };
  }

  unionObjectBounds(objects) {
    return objects.reduce((bounds, obj) => {
      const next = this.objectBounds(obj.type, obj.data);
      if (!bounds) return { ...next };
      return {
        left: Math.min(bounds.left, next.left),
        right: Math.max(bounds.right, next.right),
        top: Math.min(bounds.top, next.top),
        bottom: Math.max(bounds.bottom, next.bottom)
      };
    }, null);
  }

  expandWorldToIncludeObjects(objects) {
    const bounds = this.unionObjectBounds(objects);
    if (!bounds) return false;

    let expanded = false;
    if (bounds.right > this.worldWidth()) {
      this.draft.worldWidth = Math.max(
        this.worldWidth(),
        Math.ceil((bounds.right + WORLD_EXPAND_PADDING) / 10) * 10
      );
      expanded = true;
    }

    if (bounds.top < 0) {
      const shiftY = Math.ceil((-bounds.top + WORLD_EXPAND_PADDING) / 10) * 10;
      this.shiftAllObjectsY(shiftY);
      this.draft.worldHeight = this.worldHeight() + shiftY;
      this.cameras.main.scrollY += shiftY;
      expanded = true;
    }

    if (expanded) {
      this.draft.floorY = this.groundTop();
      this.updateCanvasSizeInputs();
      this.objects.forEach((obj) => this.syncVisual(obj));
    }
    return expanded;
  }

  shiftAllObjectsY(shiftY) {
    this.allObjectData().forEach(({ type, data }) => {
      data.y += shiftY;
      if (type === "merchant" && typeof data.npcY === "number") {
        data.npcY += shiftY;
      }
    });
  }

  allObjectData() {
    return [
      ...this.draft.platforms.map((data) => ({ type: "platform", data })),
      ...this.draft.coins.map((data) => ({ type: "coin", data })),
      ...this.draft.hazards.map((data) => ({ type: "hazard", data })),
      ...this.draft.enemies.map((data) => ({ type: "enemy", data })),
      ...this.draft.challenges.map((data) => ({ type: "challenge", data })),
      ...(this.draft.merchant ? [{ type: "merchant", data: this.draft.merchant }] : []),
      ...(this.draft.exitGate ? [{ type: "exitGate", data: this.draft.exitGate }] : []),
      ...(this.draft.playerSpawn ? [{ type: "playerSpawn", data: this.draft.playerSpawn }] : []),
      ...this.draft.signs.map((data) => ({ type: "sign", data }))
    ];
  }

  clampAllObjectsToWorld() {
    this.allObjectData().forEach(({ type, data }) => this.clampDataToWorld(type, data));
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

  clampedEditableSelectionDelta(items, dx, dy) {
    let minDx = -Infinity;
    let maxDx = Infinity;
    let minDy = -Infinity;
    let maxDy = Infinity;
    for (const { obj, startX, startY } of items) {
      const size = this.objectSize(obj.type, obj.data);
      minDx = Math.max(minDx, size.width / 2 - startX);
      maxDx = Math.min(maxDx, this.editableMaxX() - size.width / 2 - startX);
      minDy = Math.max(minDy, this.editableMinY() + size.height / 2 - startY);
      maxDy = Math.min(maxDy, this.groundTop() - size.height / 2 - startY);
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
      const levels = window.edgecase.loadLevels ? await window.edgecase.loadLevels() : this.upsertDevSavedLevel(this.toLevelData());
      this.registry.set("devSavedLevels", Array.isArray(levels) ? levels : this.upsertDevSavedLevel(this.toLevelData()));
      this.registry.set("devSavedLevelsLoaded", Array.isArray(levels));
      this.registry.set("selectedLevelId", saved.id);
      this.savedSnapshot = this.serializeDraft();
      this.updateSaveStatus();
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
    const width = this.worldWidth();
    const height = this.worldHeight();
    level.worldWidth = width;
    level.worldHeight = height;
    level.floorY = this.groundTop();
    level.platforms = [
      { x: width / 2, y: this.groundY(), width, height: GROUND_HEIGHT },
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
    if (this.registry.get("devSavedLevelsLoaded")) {
      return devSavedLevels;
    }

    const levelsById = new Map(LEVELS.map((level) => [level.id, level]));
    for (const level of devSavedLevels) {
      levelsById.set(level.id, level);
    }
    return Array.from(levelsById.values());
  }

  createBlankLevel() {
    return {
      id: "new-level",
      name: "New Level",
      worldWidth: DEFAULT_WORLD_WIDTH,
      worldHeight: DEFAULT_WORLD_HEIGHT,
      floorY: DEFAULT_WORLD_HEIGHT - GROUND_HEIGHT - GROUND_BOTTOM_MARGIN,
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
    const width = level.worldWidth || DEFAULT_WORLD_WIDTH;
    const height = level.worldHeight || DEFAULT_WORLD_HEIGHT;
    const groundY = height - GROUND_HEIGHT / 2 - GROUND_BOTTOM_MARGIN;
    return {
      ...level,
      platforms: (level.platforms || []).filter((platform) => {
        return !(
          platform.x === width / 2 &&
          platform.y === groundY &&
          platform.width === width &&
          platform.height === GROUND_HEIGHT
        );
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
      ? "mt-2 rounded-sm border border-[#3fa68f] bg-[#102019] px-3 py-2 text-xs font-bold text-[#8ee0c6]"
      : "mt-2 rounded-sm border border-[#7b332d] bg-[#1f1110] px-3 py-2 text-xs font-bold text-[#f07b6e]";
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
    const gameWidth = this.scale.gameSize.width || 1280;
    const gameHeight = this.scale.gameSize.height || DEFAULT_WORLD_HEIGHT;
    const rightPanelWidth = this.hudVisible ? Math.max(0, gameWidth - HUD_RIGHT_X) : 0;
    const width = this.hudVisible ? Math.max(320, gameWidth - HUD_LEFT_WIDTH - rightPanelWidth) : gameWidth;
    this.cameras.main.setViewport(x, 0, width, gameHeight);
    this.clampCameraScroll();
  }

  clampCameraScroll() {
    const camera = this.cameras.main;
    const visibleWorldWidth = camera.width / camera.zoom;
    const visibleWorldHeight = camera.height / camera.zoom;
    const maxScrollX = this.worldWidth() + DEAD_CANVAS_RIGHT - visibleWorldWidth;
    const maxScrollY = this.worldHeight() + DEAD_CANVAS_BOTTOM - visibleWorldHeight;

    camera.scrollX = Phaser.Math.Clamp(
      camera.scrollX,
      Math.min(0, maxScrollX),
      Math.max(0, maxScrollX)
    );
    camera.scrollY = Phaser.Math.Clamp(
      camera.scrollY,
      Math.min(-DEAD_CANVAS_TOP, maxScrollY),
      Math.max(-DEAD_CANVAS_TOP, maxScrollY)
    );
  }

  updateZoomIndicator() {
    if (!this.zoomIndicatorEl) return;
    this.zoomIndicatorEl.textContent = `ZOOM ${Math.round(this.cameras.main.zoom * 100)}%`;
  }

  updateGridControls() {
    if (this.snapToggleEl) {
      this.snapToggleEl.textContent = this.snapEnabled ? "SNAP ON" : "SNAP OFF";
      this.snapToggleEl.className = [
        "h-8 min-w-24 border-r border-[#385346] px-3 transition hover:bg-[#102019] hover:text-[#fff3a6]",
        this.snapEnabled ? "bg-[#17231d] text-[#f4e786]" : "bg-[#1f1110] text-[#f07b6e]"
      ].join(" ");
    }
    if (this.snapModifierEl) {
      const free = this.snapEnabled && this.keys?.alt?.isDown;
      this.snapModifierEl.textContent = free ? "ALT: FREE" : "ALT: SNAP";
      this.snapModifierEl.className = free
        ? "min-w-20 px-3 text-center text-[#8ee0c6]"
        : "min-w-20 px-3 text-center text-[#8fa89d]";
    }
    this.hudRoot?.querySelectorAll("[data-grid-size]").forEach((button) => {
      const active = Number(button.dataset.gridSize) === this.gridSize;
      button.className = [
        "h-8 min-w-10 border-r border-[#385346] px-2 transition hover:bg-[#102019] hover:text-[#fff3a6]",
        active ? "bg-[#e7d66b] text-[#07100f]" : "text-[#edf8ed]"
      ].join(" ");
    });
  }

  updateCursorCoordinates() {
    if (!this.cursorCoordsEl) return;
    if (!this.cursorWorldPoint) {
      this.cursorCoordsEl.textContent = "X: ---- Y: ----";
      this.cursorCoordsEl.className = "pointer-events-none absolute bottom-3 left-1/2 min-w-40 -translate-x-1/2 rounded-sm border border-[#385346] bg-[#06100e]/90 px-3 py-2 text-center text-xs font-bold text-[#8fa89d] shadow-[0_8px_24px_rgba(0,0,0,0.3)]";
      return;
    }
    this.cursorCoordsEl.textContent = `X: ${Math.round(this.cursorWorldPoint.x)} Y: ${Math.round(this.cursorWorldPoint.y)}`;
    this.cursorCoordsEl.className = "pointer-events-none absolute bottom-3 left-1/2 min-w-40 -translate-x-1/2 rounded-sm border border-[#6ad8b4] bg-[#06100e]/90 px-3 py-2 text-center text-xs font-bold text-[#8ee0c6] shadow-[0_8px_24px_rgba(0,0,0,0.3)]";
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
    window.removeEventListener("pointerup", this.handleWindowPointerUp);
    window.removeEventListener("blur", this.handleWindowPointerCancel);
    this.scale?.off(Phaser.Scale.Events.RESIZE, this.resizeWorldViewport, this);
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

  isSnapActive(pointer = null) {
    return this.snapEnabled && !pointer?.event?.altKey && !this.keys?.alt?.isDown;
  }

  snapPoint(x, y, pointer = null) {
    if (!this.isSnapActive(pointer)) {
      return { x, y };
    }
    const size = this.gridSize || DEFAULT_GRID_SIZE;
    return {
      x: Math.round(x / size) * size,
      y: Math.round(y / size) * size
    };
  }

  pointerInsideWorldViewport(pointer) {
    const camera = this.cameras.main;
    return (
      pointer.x >= camera.x &&
      pointer.x <= camera.x + camera.width &&
      pointer.y >= camera.y &&
      pointer.y <= camera.y + camera.height
    );
  }

  worldPointFromPointer(pointer) {
    const camera = this.cameras.main;
    if (!this.pointerInsideWorldViewport(pointer)) {
      return null;
    }

    return camera.getWorldPoint(pointer.x, pointer.y);
  }

  clampDataToWorld(type, data) {
    const size = this.objectSize(type, data);
    data.x = Phaser.Math.Clamp(data.x, size.width / 2, this.worldWidth() - size.width / 2);
    data.y = Phaser.Math.Clamp(data.y, size.height / 2, this.groundTop() - size.height / 2);
    if (type === "enemy") {
      data.min = Phaser.Math.Clamp(data.min, 0, this.worldWidth());
      data.max = Phaser.Math.Clamp(data.max, 0, this.worldWidth());
      if (data.min > data.max) {
        [data.min, data.max] = [data.max, data.min];
      }
    }
    if (type === "merchant") {
      data.npcX = Phaser.Math.Clamp(data.npcX ?? data.x, 30, this.worldWidth() - 30);
      data.npcY = Phaser.Math.Clamp(data.npcY ?? data.y - 11, 43, this.groundTop() - 43);
    }
  }

  clampDataToEditableArea(type, data) {
    const size = this.objectSize(type, data);
    data.x = Phaser.Math.Clamp(data.x, size.width / 2, this.editableMaxX() - size.width / 2);
    data.y = Phaser.Math.Clamp(data.y, this.editableMinY() + size.height / 2, this.groundTop() - size.height / 2);
    if (type === "enemy") {
      data.min = Phaser.Math.Clamp(data.min, 0, this.editableMaxX());
      data.max = Phaser.Math.Clamp(data.max, 0, this.editableMaxX());
      if (data.min > data.max) {
        [data.min, data.max] = [data.max, data.min];
      }
    }
    if (type === "merchant") {
      data.npcX = Phaser.Math.Clamp(data.npcX ?? data.x, 30, this.editableMaxX() - 30);
      data.npcY = Phaser.Math.Clamp(data.npcY ?? data.y - 11, this.editableMinY() + 43, this.groundTop() - 43);
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
