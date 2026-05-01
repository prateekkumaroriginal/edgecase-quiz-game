import {
  getBorderlessEnabled,
  getMusicVolume,
  getSoundVolume,
  setBorderlessEnabled,
  setMusicVolume,
  setSoundVolume
} from "../settings.js";
import { updateGlobalMusicVolume } from "../audio.js";

const ROWS = [
  { id: "soundVolume", label: "SOUND VOLUME", kind: "slider" },
  { id: "musicVolume", label: "MUSIC VOLUME", kind: "slider" },
  { id: "window", label: "WINDOW MODE" }
];

export class SettingsScene extends Phaser.Scene {
  constructor() {
    super("SettingsScene");
  }

  create() {
    this.selectedIndex = 0;
    this.soundVolume = getSoundVolume();
    this.musicVolume = getMusicVolume();
    this.borderless = getBorderlessEnabled();
    this.windowModeAvailable = Boolean(window.edgecase?.setBorderless);
    this.windowModeChecked = false;
    this.rows = [];

    this.cameras.main.setBackgroundColor("#07100f");
    this.add.rectangle(640, 360, 1280, 720, 0x07100f);
    this.add.rectangle(640, 610, 1280, 130, 0x152017);
    this.add.rectangle(640, 630, 1280, 18, 0xb9a44c);
    this.drawCircuitBackdrop();

    this.add.text(92, 64, "SETTINGS", {
      fontFamily: "EdgecaseTitle, Bahnschrift, Impact",
      fontSize: "76px",
      color: "#f2f8e8",
      stroke: "#101814",
      strokeThickness: 8
    }).setShadow(7, 7, "#1d5f52", 0, true, true);

    this.add.text(100, 148, "SYSTEM / DISPLAY / AUDIO", {
      fontFamily: "Cascadia Mono, Consolas, monospace",
      fontSize: "18px",
      color: "#d7c96d"
    });

    this.createBackButton();
    this.createRows();
    this.statusText = this.add.text(640, 590, "", {
      fontFamily: "Cascadia Mono, Consolas, monospace",
      fontSize: "18px",
      color: "#f4e786"
    }).setOrigin(0.5, 0);

    this.add.text(100, 654, "W/S select  |  A/D adjust  |  Space/Enter toggle  |  Esc back", {
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
      s: Phaser.Input.Keyboard.KeyCodes.S,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
      esc: Phaser.Input.Keyboard.KeyCodes.ESC
    });

    this.syncWindowModeFromHost();
    this.updateFocus();
  }

  createBackButton() {
    const rect = this.add.rectangle(1080, 92, 220, 52, 0x22312b)
      .setStrokeStyle(2, 0xe9eedc)
      .setInteractive({ useHandCursor: true });
    const label = this.add.text(1080, 92, "BACK", {
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

  createRows() {
    ROWS.forEach((row, index) => {
      const y = 226 + index * 86;
      const container = this.add.container(0, 0);
      const panel = this.add.rectangle(640, y, 820, 72, 0x102019)
        .setStrokeStyle(2, 0x385346)
        .setInteractive({ useHandCursor: true });
      const label = this.add.text(270, y - 20, row.label, {
        fontFamily: "Cascadia Mono, Consolas, monospace",
        fontSize: "22px",
        color: "#edf8ed"
      });
      const value = this.add.text(920, y, "", {
        fontFamily: "EdgecaseTitle, Bahnschrift, Impact",
        fontSize: "28px",
        color: "#07100f"
      }).setOrigin(0.5);
      const switchBg = this.add.rectangle(920, y, 210, 46, 0xe7d66b).setStrokeStyle(3, 0x101814);
      const sliderTrack = this.add.rectangle(885, y, 280, 12, 0x22312b).setStrokeStyle(2, 0x385346).setVisible(false);
      const sliderFill = this.add.rectangle(745, y, 1, 12, 0xe7d66b).setOrigin(0, 0.5).setVisible(false);
      const sliderKnob = this.add.circle(745, y, 13, 0xe7d66b).setStrokeStyle(3, 0x101814).setVisible(false);
      const note = this.add.text(270, y + 10, "", {
        fontFamily: "Cascadia Mono, Consolas, monospace",
        fontSize: "13px",
        color: "#8fa89d"
      });
      container.add([panel, label, switchBg, sliderTrack, sliderFill, sliderKnob, value, note]);
      panel.on("pointerover", () => {
        this.selectedIndex = index;
        this.updateFocus();
      });
      panel.on("pointerdown", () => this.toggleFocused());
      if (row.kind === "slider") {
        [panel, sliderTrack, sliderFill, sliderKnob].forEach((target) => {
          target.setInteractive({ useHandCursor: true });
          target.on("pointerdown", (pointer) => this.setSliderFromPointer(row.id, pointer));
          target.on("pointermove", (pointer) => {
            if (pointer.isDown) {
              this.setSliderFromPointer(row.id, pointer);
            }
          });
        });
      }
      this.rows.push({ ...row, panel, label, switchBg, sliderTrack, sliderFill, sliderKnob, value, note });
    });
    this.updateRows();
  }

  async syncWindowModeFromHost() {
    if (!window.edgecase?.getWindowMode) {
      console.log("[edgecase:settings] getWindowMode unavailable");
      return;
    }

    try {
      console.log("[edgecase:settings] getWindowMode start");
      const mode = await window.edgecase.getWindowMode();
      console.log("[edgecase:settings] getWindowMode result", mode);
      if (!this.scene.isActive()) {
        return;
      }
      this.windowModeAvailable = true;
      this.windowModeChecked = true;
      this.borderless = Boolean(mode?.borderless);
      setBorderlessEnabled(this.borderless);
      this.updateRows();
    } catch (error) {
      console.error("[edgecase:settings] getWindowMode failed", error);
      this.windowModeAvailable = false;
      this.windowModeChecked = true;
      this.updateRows();
      this.showStatus(`Could not read window mode: ${error?.message || "unknown error"}`);
    }
  }

  update() {
    if (this.justDown("up") || this.justDown("w")) {
      this.selectedIndex = Phaser.Math.Wrap(this.selectedIndex - 1, 0, this.rows.length);
      this.updateFocus();
    } else if (this.justDown("down") || this.justDown("s")) {
      this.selectedIndex = Phaser.Math.Wrap(this.selectedIndex + 1, 0, this.rows.length);
      this.updateFocus();
    }

    if (this.justDown("left") || this.justDown("a")) {
      this.adjustFocused(-0.05);
    } else if (this.justDown("right") || this.justDown("d")) {
      this.adjustFocused(0.05);
    }

    if (this.justDown("space") || this.justDown("enter")) {
      this.toggleFocused();
    }

    if (this.justDown("esc")) {
      this.goBack();
    }
  }

  justDown(name) {
    return Phaser.Input.Keyboard.JustDown(this.keys[name]);
  }

  toggleFocused() {
    const row = this.rows[this.selectedIndex];
    if (row.kind === "slider") {
      this.adjustFocused(0.05);
      return;
    }

    this.toggleBorderless();
  }

  adjustFocused(delta) {
    const row = this.rows[this.selectedIndex];
    if (row.id === "soundVolume") {
      this.soundVolume = setSoundVolume(this.soundVolume + delta);
      this.updateRows();
    } else if (row.id === "musicVolume") {
      this.musicVolume = setMusicVolume(this.musicVolume + delta);
      updateGlobalMusicVolume();
      this.updateRows();
    } else if (delta !== 0) {
      this.toggleFocused();
    }
  }

  setSliderFromPointer(id, pointer) {
    const row = this.rows.find((item) => item.id === id);
    if (!row) return;
    this.selectedIndex = this.rows.indexOf(row);
    const value = Phaser.Math.Clamp((pointer.x - 745) / 280, 0, 1);
    if (id === "soundVolume") {
      this.soundVolume = setSoundVolume(value);
    } else {
      this.musicVolume = setMusicVolume(value);
      updateGlobalMusicVolume();
    }
    this.updateRows();
  }

  async toggleBorderless() {
    if (!this.windowModeAvailable) {
      console.log("[edgecase:settings] setBorderless unavailable");
      this.showStatus("Window mode is available in desktop builds");
      return;
    }

    const previous = this.borderless;
    const next = !previous;
    console.log("[edgecase:settings] setBorderless start", { previous, next });
    this.borderless = next;
    setBorderlessEnabled(next);
    this.updateRows();

    try {
      const result = await window.edgecase.setBorderless(next);
      console.log("[edgecase:settings] setBorderless result", result);
      if (!this.scene.isActive()) {
        return;
      }
      this.borderless = Boolean(result?.borderless);
      setBorderlessEnabled(this.borderless);
      this.updateRows();
    } catch (error) {
      console.error("[edgecase:settings] setBorderless failed", error);
      this.borderless = previous;
      setBorderlessEnabled(previous);
      this.updateRows();
      this.showStatus(`Could not change window mode: ${error?.message || "unknown error"}`);
    }
  }

  updateRows() {
    this.rows?.forEach((row) => {
      const disabled = row.id === "window" && !this.windowModeAvailable;
      if (row.id === "soundVolume" || row.id === "musicVolume") {
        const volume = row.id === "soundVolume" ? this.soundVolume : this.musicVolume;
        row.value.setText(`${Math.round(volume * 100)}%`);
        row.note.setText(row.id === "soundVolume" ? "Controls jumps, coins, hits, and UI tones" : "Controls background music level");
        row.switchBg.setVisible(false);
        row.sliderTrack.setVisible(true);
        row.sliderFill.setVisible(true);
        row.sliderKnob.setVisible(true);
        row.sliderFill.width = 280 * volume;
        row.sliderKnob.setPosition(745 + 280 * volume, row.sliderKnob.y);
      } else {
        row.value.setText(this.windowModeAvailable ? (this.borderless ? "BORDERLESS" : "WINDOWED") : "DESKTOP ONLY");
        row.note.setText(this.windowModeAvailable ? "Switches the desktop window presentation" : "Unavailable in browser preview");
        row.switchBg.setFillStyle(disabled ? 0x385346 : 0xe7d66b);
      }
      row.value.setFontSize(row.value.text.length > 10 ? "21px" : "30px");
      row.value.setColor(disabled ? "#b8c7b5" : "#07100f");
      row.value.setAlpha(disabled ? 0.72 : 1);
      row.switchBg.setVisible(row.kind !== "slider");
      row.panel.setAlpha(1);
      row.label.setAlpha(disabled ? 0.82 : 1);
      row.note.setAlpha(disabled ? 0.82 : 1);
      row.switchBg.setAlpha(disabled ? 0.62 : 1);
      if (row.kind === "slider") {
        row.value.setColor("#f4e786");
        row.value.setFontSize("22px");
      }
    });
    this.updateFocus();
  }

  updateFocus() {
    this.rows?.forEach((row, index) => {
      const focused = index === this.selectedIndex;
      row.panel.setFillStyle(focused ? 0x1b3028 : 0x102019);
      row.panel.setStrokeStyle(focused ? 4 : 2, focused ? 0xf4e786 : 0x385346);
      row.label.setColor(focused ? "#f4e786" : "#edf8ed");
    });
  }

  showStatus(message) {
    if (!this.statusText) return;
    this.statusText.setText(message);
    this.time.delayedCall(1800, () => {
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
    graphics.lineStyle(2, 0x1d5f52, 0.24);
    for (let i = 0; i < 20; i += 1) {
      const x = 780 + (i % 5) * 88;
      const y = 205 + Math.floor(i / 5) * 70;
      graphics.strokeLineShape(new Phaser.Geom.Line(x, y, x + 58, y));
      graphics.strokeLineShape(new Phaser.Geom.Line(x + 58, y, x + 58, y + 36));
      graphics.fillStyle(i % 3 === 0 ? 0xd8cd6c : 0x3fa68f, 0.56);
      graphics.fillCircle(x + 58, y + 36, 5);
    }
  }
}
