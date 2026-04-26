export class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create() {
    this.registry.set("difficulty", "normal");
    this.menuIndex = 1;
    this.cameras.main.setBackgroundColor("#07100f");

    this.add.rectangle(640, 360, 1280, 720, 0x07100f);
    this.add.rectangle(640, 575, 1280, 190, 0x152017);
    this.add.rectangle(640, 610, 1280, 18, 0xb9a44c);

    this.drawCircuitBackdrop();

    this.add
      .text(92, 72, "EDGECASE", {
        fontFamily: "EdgecaseTitle, Bahnschrift, Impact",
        fontSize: "96px",
        color: "#f2f8e8",
        stroke: "#101814",
        strokeThickness: 8
      })
      .setShadow(8, 8, "#1d5f52", 0, true, true);

    this.add.text(100, 176, "TECH FIELD / PLATFORMER KNOWLEDGE RUN", {
      fontFamily: "Cascadia Mono, Consolas, monospace",
      fontSize: "18px",
      color: "#d7c96d"
    });

    this.add.text(100, 245, "Choose difficulty", {
      fontFamily: "Cascadia Mono, Consolas, monospace",
      fontSize: "22px",
      color: "#f2f8e8"
    });

    const difficulties = [
      { id: "easy", label: "Easy", note: "Shorter gaps, easier questions" },
      { id: "normal", label: "Normal", note: "Balanced rewards and hazards" },
      { id: "hard", label: "Hard", note: "Hard questions, denser hazards" }
    ];

    this.buttons = difficulties.map((difficulty, index) => {
      const y = 300 + index * 72;
      const button = this.add
        .rectangle(230, y, 260, 48, difficulty.id === "normal" ? 0xb9a44c : 0x22312b)
        .setStrokeStyle(2, 0xe9eedc)
        .setInteractive({ useHandCursor: true });

      const label = this.add.text(122, y - 16, difficulty.label, {
        fontFamily: "Cascadia Mono, Consolas, monospace",
        fontSize: "22px",
        color: difficulty.id === "normal" ? "#07100f" : "#f2f8e8"
      });

      const note = this.add.text(390, y - 12, difficulty.note, {
        fontFamily: "Cascadia Mono, Consolas, monospace",
        fontSize: "17px",
        color: "#b8c7b5"
      });

      button.on("pointerover", () => {
        this.menuIndex = index;
        this.updateMenuFocus();
      });
      button.on("pointerdown", () => {
        this.menuIndex = index;
        this.selectDifficulty(difficulty.id);
      });
      return { id: difficulty.id, button, label, note };
    });

    const start = this.add
      .rectangle(250, 565, 300, 62, 0xe7d66b)
      .setStrokeStyle(3, 0x101814)
      .setInteractive({ useHandCursor: true });
    this.startButton = start;
    this.startLabel = this.add.text(250, 565, "START RUN", {
      fontFamily: "EdgecaseTitle, Bahnschrift, Impact",
      fontSize: "34px",
      color: "#07100f"
    }).setOrigin(0.5);
    start.on("pointerover", () => {
      this.menuIndex = 3;
      this.updateMenuFocus();
    });
    start.on("pointerdown", () => this.scene.start("GameScene"));

    this.add.text(100, 642, "A/D move  |  Space jump  |  E interact  |  Physical quiz answers use doors", {
      fontFamily: "Cascadia Mono, Consolas, monospace",
      fontSize: "16px",
      color: "#d9e5d0"
    });

    this.add.text(870, 98, "MVP BUILD", {
      fontFamily: "Cascadia Mono, Consolas, monospace",
      fontSize: "20px",
      color: "#07100f",
      backgroundColor: "#d8cd6c",
      padding: { x: 14, y: 8 }
    });

    this.add.text(870, 150, "1 level\n3 challenge zones\n1 merchant\n4 upgrades\n16 tech questions", {
      fontFamily: "Cascadia Mono, Consolas, monospace",
      fontSize: "20px",
      color: "#edf8ed",
      lineSpacing: 13
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

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.keys.up) || Phaser.Input.Keyboard.JustDown(this.keys.w)) {
      this.menuIndex = Phaser.Math.Wrap(this.menuIndex - 1, 0, 4);
      this.updateMenuFocus();
    } else if (Phaser.Input.Keyboard.JustDown(this.keys.down) || Phaser.Input.Keyboard.JustDown(this.keys.s)) {
      this.menuIndex = Phaser.Math.Wrap(this.menuIndex + 1, 0, 4);
      this.updateMenuFocus();
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.space) || Phaser.Input.Keyboard.JustDown(this.keys.enter)) {
      if (this.menuIndex === 3) {
        this.scene.start("GameScene");
      } else {
        this.selectDifficulty(this.buttons[this.menuIndex].id);
      }
    }
  }

  drawCircuitBackdrop() {
    const graphics = this.add.graphics();
    graphics.lineStyle(2, 0x1d5f52, 0.38);
    for (let i = 0; i < 18; i += 1) {
      const x = 760 + (i % 5) * 90;
      const y = 230 + Math.floor(i / 5) * 62;
      graphics.strokeLineShape(new Phaser.Geom.Line(x, y, x + 58, y));
      graphics.strokeLineShape(new Phaser.Geom.Line(x + 58, y, x + 58, y + 38));
      graphics.fillStyle(i % 3 === 0 ? 0xd8cd6c : 0x3fa68f, 0.7);
      graphics.fillCircle(x + 58, y + 38, 5);
    }
  }

  selectDifficulty(id) {
    this.registry.set("difficulty", id);

    for (const item of this.buttons) {
      const selected = item.id === id;
      item.button.setFillStyle(selected ? 0xb9a44c : 0x22312b);
      item.label.setColor(selected ? "#07100f" : "#f2f8e8");
    }

    this.updateMenuFocus();
  }

  updateMenuFocus() {
    this.buttons.forEach((item, index) => {
      const focused = this.menuIndex === index;
      item.button.setStrokeStyle(focused ? 4 : 2, focused ? 0xf4e786 : 0xe9eedc);
    });

    if (this.startButton) {
      this.startButton.setStrokeStyle(this.menuIndex === 3 ? 5 : 3, this.menuIndex === 3 ? 0xf4e786 : 0x101814);
    }
  }
}
