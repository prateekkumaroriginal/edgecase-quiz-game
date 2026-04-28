import { QUESTIONS } from "../data/questions.js";
import { UPGRADES } from "../data/upgrades.js";
import { DEFAULT_LEVEL_ID, LEVELS } from "../data/levels.js";

const CHALLENGE_SECONDS = 18;
const IS_DEV = import.meta.env.DEV || Boolean(window.edgecase?.isDev);

const DIFFICULTY = {
  easy: { reward: 24, enemySpeed: 75, hazardCount: 4, questionMix: ["easy", "easy", "medium"] },
  normal: { reward: 32, enemySpeed: 95, hazardCount: 6, questionMix: ["easy", "medium", "hard"] },
  hard: { reward: 44, enemySpeed: 125, hazardCount: 8, questionMix: ["medium", "hard", "hard"] }
};

export class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  create() {
    this.difficulty = this.registry.get("difficulty") || "normal";
    this.isEditorPlaytest = Boolean(this.registry.get("draftLevel"));
    this.tuning = DIFFICULTY[this.difficulty];
    this.level = this.getActiveLevel();
    this.worldWidth = this.level.worldWidth || 4300;
    this.floorY = this.level.floorY || 652;
    this.coins = 0;
    this.maxHealth = 3;
    this.health = this.maxHealth;
    this.answerStreak = 0;
    this.runEnded = false;
    this.quiz = null;
    this.merchantOpen = false;
    this.nearMerchant = false;
    this.nearExit = false;
    this.lastShieldUse = -99999;
    this.lastDamageAt = -99999;
    this.paused = false;
    this.pauseStartedAt = 0;
    this.pauseSelectedIndex = 0;
    this.merchantSelectedIndex = 0;
    this.merchantHoldStartedAt = null;
    this.merchantHoldComplete = false;
    this.merchantHoldDenied = false;
    this.merchantRequiresSpaceRelease = false;
    this.merchantChargeOsc = null;
    this.merchantChargeGain = null;
    this.audioReady = false;

    this.upgrades = {
      dash: false,
      doubleJump: false,
      shield: false,
      magnet: false
    };
    this.tempBuffs = {
      speedUntil: 0,
      magnetUntil: 0,
      shieldUntil: 0
    };

    this.createTextures();
    this.createWorld();
    this.createPlayer();
    this.createCollectibles();
    this.createHazardsAndEnemies();
    this.createChallenges();
    this.createMerchant();
    this.createExitGate();
    this.createHud();
    this.createInputs();

    this.cameras.main.startFollow(this.player, true, 0.09, 0.09);
    this.cameras.main.setBounds(0, 0, this.worldWidth, 720);
    this.physics.world.setBounds(0, 0, this.worldWidth, 720);
  }

  getActiveLevel() {
    const draftLevel = this.registry.get("draftLevel");
    if (draftLevel) {
      return structuredClone(draftLevel);
    }

    const selectedLevelId = this.registry.get("selectedLevelId") || DEFAULT_LEVEL_ID;
    const devSavedLevels = IS_DEV ? this.registry.get("devSavedLevels") || [] : [];
    const levelsById = new Map(LEVELS.map((item) => [item.id, item]));
    for (const item of devSavedLevels) {
      levelsById.set(item.id, item);
    }
    const level = levelsById.get(selectedLevelId) || LEVELS[0];
    return structuredClone(level);
  }

  createTextures() {
    const g = this.add.graphics();

    g.fillStyle(0xf0f4df, 1);
    g.fillRoundedRect(0, 0, 34, 48, 8);
    g.fillStyle(0x18231d, 1);
    g.fillRect(7, 10, 20, 8);
    g.fillStyle(0xd7c96d, 1);
    g.fillRect(21, 31, 9, 11);
    g.generateTexture("player", 34, 48);
    g.clear();

    g.fillStyle(0xd8cd6c, 1);
    g.fillCircle(12, 12, 12);
    g.lineStyle(3, 0xfff3a6, 1);
    g.strokeCircle(12, 12, 8);
    g.generateTexture("coin", 24, 24);
    g.clear();

    g.fillStyle(0x17231d, 1);
    g.fillRoundedRect(0, 0, 64, 34, 4);
    g.fillStyle(0x2f4b3e, 1);
    g.fillRect(0, 0, 64, 7);
    g.lineStyle(2, 0xb9a44c, 0.65);
    g.strokeRect(1, 1, 62, 32);
    g.generateTexture("platform", 64, 34);
    g.clear();

    g.fillStyle(0xd65f4f, 1);
    g.fillTriangle(0, 30, 18, 0, 36, 30);
    g.generateTexture("spike", 36, 30);
    g.clear();

    g.fillStyle(0x2d7f6d, 1);
    g.fillRoundedRect(0, 0, 40, 38, 6);
    g.fillStyle(0xe7d66b, 1);
    g.fillRect(9, 11, 22, 7);
    g.generateTexture("enemy", 40, 38);
    g.destroy();
  }

  createWorld() {
    this.add.rectangle(this.worldWidth / 2, 360, this.worldWidth, 720, 0x07100f);
    this.drawParallaxBands();

    this.platforms = this.physics.add.staticGroup();
    for (const platform of this.level.platforms || []) {
      this.addPlatform(platform.x, platform.y, platform.width, platform.height);
    }

    for (const sign of this.level.signs || []) {
      this.add.text(sign.x, sign.y, sign.text, this.signStyle()).setDepth(3);
    }
  }

  drawParallaxBands() {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x0f1a18, 1);
    graphics.fillRect(0, 508, this.worldWidth, 144);
    graphics.fillStyle(0x16251f, 1);
    for (let x = 0; x < this.worldWidth; x += 180) {
      const height = 80 + ((x / 180) % 4) * 34;
      graphics.fillRect(x, 508 - height, 92, height);
      graphics.fillRect(x + 110, 508 - height * 0.7, 54, height * 0.7);
    }
    graphics.lineStyle(2, 0x385346, 0.45);
    for (let x = 0; x < this.worldWidth; x += 120) {
      graphics.strokeLineShape(new Phaser.Geom.Line(x, 510, x + 90, 470));
    }
  }

  createPlayer() {
    const spawn = this.level.playerSpawn || { x: 90, y: 560 };
    this.player = this.physics.add.sprite(spawn.x, spawn.y, "player");
    this.player.setCollideWorldBounds(true);
    this.player.setDragX(1550);
    this.player.setMaxVelocity(420, 920);
    this.physics.add.collider(this.player, this.platforms, () => {
      if (this.player.body.blocked.down) {
        this.jumpsUsed = 0;
      }
    });
    this.jumpsUsed = 0;
    this.dashReadyAt = 0;
  }

  createCollectibles() {
    this.coinGroup = this.physics.add.group({ allowGravity: false, immovable: true });

    for (const item of this.level.coins || []) {
      const coin = this.coinGroup.create(item.x, item.y, "coin");
      coin.body.setCircle(12);
      coin.setData("value", item.value || 3);
    }

    this.physics.add.overlap(this.player, this.coinGroup, (_, coin) => this.collectCoin(coin));
  }

  createHazardsAndEnemies() {
    this.hazards = this.physics.add.staticGroup();
    const spikes = (this.level.hazards || []).slice(0, this.tuning.hazardCount);

    for (const hazard of spikes) {
      const spike = this.hazards.create(hazard.x, hazard.y, "spike");
      spike.refreshBody();
    }

    this.enemies = this.physics.add.group({ allowGravity: true });
    const patrols = this.level.enemies || [];

    for (const patrol of patrols.slice(0, this.difficulty === "easy" ? 1 : 3)) {
      const enemy = this.enemies.create(patrol.x, patrol.y, "enemy");
      enemy.setData("min", patrol.min);
      enemy.setData("max", patrol.max);
      enemy.setVelocityX(this.tuning.enemySpeed);
      enemy.setBounce(0);
      enemy.setCollideWorldBounds(false);
    }

    this.physics.add.collider(this.enemies, this.platforms);
    this.physics.add.overlap(this.player, this.hazards, () => this.takeDamage("spike"));
    this.physics.add.overlap(this.player, this.enemies, () => this.takeDamage("sentry"));
  }

  createChallenges() {
    this.challengeZones = [];
    const questionLevels = this.tuning.questionMix;
    const positions = this.level.challenges || [];

    positions.forEach((pos, index) => {
      const zone = this.add
        .rectangle(pos.x, pos.y, pos.width || 170, pos.height || 110, 0x2d7f6d, 0.22)
        .setStrokeStyle(3, 0xd8cd6c, 0.85);
      this.physics.add.existing(zone, true);
      zone.setData("id", index);
      zone.setData("locked", false);
      zone.setData("completed", false);
      zone.setData("question", this.pickQuestion(pos.difficulty || questionLevels[index] || "easy", index));
      this.challengeZones.push(zone);

      this.add.text(pos.x - 78, pos.y - 83, pos.label || `CHALLENGE ${String(index + 1).padStart(2, "0")}`, this.signStyle()).setDepth(3);
      this.physics.add.overlap(this.player, zone, () => this.tryStartChallenge(zone));
    });
  }

  createMerchant() {
    const merchant = this.level.merchant;
    if (!merchant) {
      this.merchantZone = null;
      return;
    }

    this.merchantZone = this.add.rectangle(merchant.x, merchant.y, merchant.width, merchant.height, 0x345347, 0.25).setStrokeStyle(3, 0xe7d66b);
    this.physics.add.existing(this.merchantZone, true);
    this.physics.add.overlap(this.player, this.merchantZone, () => {
      this.nearMerchant = true;
    });

    const npcX = merchant.npcX || merchant.x;
    const npcY = merchant.npcY || merchant.y - 11;
    this.add.rectangle(npcX, npcY, 60, 86, 0x26372d).setStrokeStyle(3, 0xd8cd6c);
    this.add.text(npcX - 27, npcY - 51, "NPC", this.signStyle()).setDepth(3);
  }

  createExitGate() {
    const gate = this.level.exitGate;
    if (!gate) {
      this.exitGate = null;
      return;
    }

    this.exitGate = this.add.rectangle(gate.x, gate.y, gate.width, gate.height, 0x8a7440, 0.58).setStrokeStyle(4, 0xe7d66b);
    this.physics.add.existing(this.exitGate, true);
    this.physics.add.overlap(this.player, this.exitGate, () => {
      this.nearExit = true;
    });
  }

  createHud() {
    this.hud = this.add.container(0, 0).setScrollFactor(0).setDepth(50);
    this.hud.add(this.add.rectangle(640, 28, 1280, 56, 0x08100f, 0.88));
    this.coinIcon = this.add.image(26, 28, "coin").setDisplaySize(24, 24);
    this.coinText = this.add.text(48, 28, "", this.hudStyle("#e7d66b")).setOrigin(0, 0.5);
    this.healthText = this.add.text(115, 28, "", this.hudStyle("#d65f4f")).setOrigin(0, 0.5);
    this.statusText = this.add.text(250, 13, "", this.hudStyle("#edf8ed"));
    this.promptText = this.add.text(820, 13, "", this.hudStyle("#d9e5d0"));
    this.hud.add([this.coinIcon, this.coinText, this.healthText, this.statusText, this.promptText]);

    this.toastText = this.add
      .text(640, 84, "", {
        fontFamily: "Cascadia Mono, Consolas, monospace",
        fontSize: "20px",
        color: "#07100f",
        backgroundColor: "#e7d66b",
        padding: { x: 14, y: 8 }
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(80)
      .setVisible(false);

    this.updateHud();
  }

  createInputs() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      a: Phaser.Input.Keyboard.KeyCodes.A,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      e: Phaser.Input.Keyboard.KeyCodes.E,
      shift: Phaser.Input.Keyboard.KeyCodes.SHIFT,
      esc: Phaser.Input.Keyboard.KeyCodes.ESC,
      r: Phaser.Input.Keyboard.KeyCodes.R,
      m: Phaser.Input.Keyboard.KeyCodes.M,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
      one: Phaser.Input.Keyboard.KeyCodes.ONE,
      two: Phaser.Input.Keyboard.KeyCodes.TWO,
      three: Phaser.Input.Keyboard.KeyCodes.THREE,
      four: Phaser.Input.Keyboard.KeyCodes.FOUR
    });
  }

  update(time, delta) {
    if (this.runEnded) {
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.esc)) {
      if (this.merchantOpen) {
        this.closeMerchant();
      } else {
        this.togglePause();
      }
      return;
    }

    if (this.paused) {
      this.updatePauseInput();
      return;
    }

    this.nearMerchant = false;
    this.nearExit = false;

    this.updateEnemies();
    this.updateMovement(time);
    this.updateMagnet(delta);
    this.updateQuiz(time);
    this.updateProximity();
    this.updateMerchantInput(time);
    this.handleInteractions();
    this.updateHud();
  }

  updateMovement(time) {
    if (this.merchantOpen || this.paused || this.runEnded) {
      this.player.setAccelerationX(0);
      return;
    }

    const speedBuff = time < this.tempBuffs.speedUntil ? 1.22 : 1;
    const runSpeed = 335 * speedBuff;
    const left = this.cursors.left.isDown || this.keys.a.isDown;
    const right = this.cursors.right.isDown || this.keys.d.isDown;

    if (left) {
      this.player.setAccelerationX(-1700);
      this.player.setMaxVelocity(runSpeed, 920);
      this.player.setFlipX(true);
    } else if (right) {
      this.player.setAccelerationX(1700);
      this.player.setMaxVelocity(runSpeed, 920);
      this.player.setFlipX(false);
    } else {
      this.player.setAccelerationX(0);
    }

    const jumpPressed =
      Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
      Phaser.Input.Keyboard.JustDown(this.cursors.space) ||
      Phaser.Input.Keyboard.JustDown(this.keys.w);
    if (jumpPressed) {
      this.tryJump();
      this.playTone("jump");
    }

    if (this.upgrades.dash && Phaser.Input.Keyboard.JustDown(this.keys.shift) && time >= this.dashReadyAt) {
      const direction = this.player.flipX ? -1 : 1;
      this.player.setVelocityX(direction * 640);
      this.player.setVelocityY(Math.min(this.player.body.velocity.y, -40));
      this.dashReadyAt = time + 1150;
      this.showToast("Dash ready again in 1s");
      this.playTone("dash");
    }
  }

  tryJump() {
    const grounded = this.player.body.blocked.down;
    const maxJumps = this.upgrades.doubleJump ? 2 : 1;

    if (grounded) {
      this.jumpsUsed = 0;
    }

    if (this.jumpsUsed < maxJumps) {
      this.player.setVelocityY(this.jumpsUsed === 0 ? -575 : -520);
      this.jumpsUsed += 1;
    }
  }

  updateEnemies() {
    for (const enemy of this.enemies.getChildren()) {
      const min = enemy.getData("min");
      const max = enemy.getData("max");
      if (enemy.x <= min) {
        enemy.setVelocityX(this.tuning.enemySpeed);
      } else if (enemy.x >= max) {
        enemy.setVelocityX(-this.tuning.enemySpeed);
      }
    }
  }

  updateMagnet(delta) {
    const active = this.upgrades.magnet || this.time.now < this.tempBuffs.magnetUntil;
    if (!active) {
      return;
    }

    for (const coin of this.coinGroup.getChildren()) {
      if (!coin.active) continue;
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, coin.x, coin.y);
      if (distance < 180) {
        const angle = Phaser.Math.Angle.Between(coin.x, coin.y, this.player.x, this.player.y);
        coin.x += Math.cos(angle) * delta * 0.34;
        coin.y += Math.sin(angle) * delta * 0.34;
        coin.body.updateFromGameObject();
      }
    }
  }

  updateProximity() {
    const playerBounds = this.player.getBounds();
    this.nearMerchant = this.merchantZone ? Phaser.Geom.Intersects.RectangleToRectangle(playerBounds, this.merchantZone.getBounds()) : false;
    this.nearExit = this.exitGate ? Phaser.Geom.Intersects.RectangleToRectangle(playerBounds, this.exitGate.getBounds()) : false;
  }

  isInMerchantSafeZone() {
    return this.merchantZone && Phaser.Geom.Intersects.RectangleToRectangle(this.player.getBounds(), this.merchantZone.getBounds());
  }

  updateQuiz(time) {
    if (!this.quiz) {
      return;
    }

    if (this.quiz.closing) {
      return;
    }

    const remaining = Math.max(0, (this.quiz.endsAt - time) / 1000);
    this.quiz.timerText.setText(`TIME ${remaining.toFixed(1)}s`);
    this.updateSelectedAnswerDoor();

    if (remaining <= 0) {
      this.finishChallenge(false, "Timeout");
    }
  }

  handleInteractions() {
    if (Phaser.Input.Keyboard.JustDown(this.keys.e)) {
      this.ensureAudio();
      if (this.quiz && !this.quiz.closing) {
        this.confirmSelectedAnswer();
      } else if (this.nearMerchant && !this.merchantOpen) {
        this.openMerchant();
      } else if (this.nearExit && !this.merchantOpen) {
        this.endRun();
      }
    }

  }

  togglePause() {
    this.ensureAudio();

    if (this.isEditorPlaytest) {
      this.registry.remove("draftLevel");
      this.scene.start("LevelEditorScene");
      return;
    }

    if (this.paused) {
      this.paused = false;
      this.physics.resume();
      if (this.quiz) {
        this.quiz.endsAt += this.time.now - this.pauseStartedAt;
      }
      this.destroyPauseMenu();
      this.playTone("resume");
      return;
    }

    this.paused = true;
    this.pauseStartedAt = this.time.now;
    this.player.setAccelerationX(0);
    this.physics.pause();
    this.createPauseMenu();
    this.playTone("pause");
  }

  createPauseMenu() {
    if (this.pauseUi) {
      return;
    }

    this.pauseSelectedIndex = 0;
    this.pauseUi = this.add.container(0, 0).setScrollFactor(0).setDepth(120);
    this.pauseUi.add(this.add.rectangle(640, 360, 1280, 720, 0x07100f, 0.72));
    this.pauseUi.add(this.add.rectangle(640, 360, 520, 360, 0x08100f, 0.96).setStrokeStyle(4, 0xe7d66b));
    this.pauseUi.add(this.add.text(506, 190, "PAUSED", {
      fontFamily: "EdgecaseTitle, Bahnschrift, Impact",
      fontSize: "64px",
      color: "#e7d66b",
      stroke: "#101814",
      strokeThickness: 6
    }));

    const buttons = [
      { y: 302, label: "RESUME", action: "resume" },
      { y: 374, label: "RESTART RUN", action: "restart" },
      { y: 446, label: "MAIN MENU", action: "menu" }
    ];

    this.pauseButtons = buttons.map((button, index) => {
      const rect = this.add
        .rectangle(640, button.y, 310, 52, 0x1a2a23, 1)
        .setStrokeStyle(2, 0xe7d66b)
        .setInteractive({ useHandCursor: true });
      const text = this.add.text(640, button.y - 15, button.label, {
        fontFamily: "Cascadia Mono, Consolas, monospace",
        fontSize: "22px",
        color: "#edf8ed"
      }).setOrigin(0.5, 0);
      rect.on("pointerover", () => {
        this.pauseSelectedIndex = index;
        this.updatePauseFocus();
      });
      rect.on("pointerout", () => this.updatePauseFocus());
      rect.on("pointerdown", () => this.executePauseAction(button.action));
      this.pauseUi.add([rect, text]);
      return { ...button, rect, text };
    });

    this.pauseUi.add(this.add.text(640, 514, "W/S or arrows select  |  Space/Enter choose", {
      fontFamily: "Cascadia Mono, Consolas, monospace",
      fontSize: "16px",
      color: "#b8c7b5"
    }).setOrigin(0.5, 0));

    this.pauseUi.setAlpha(0);
    this.pauseUi.setScale(0.98);
    this.tweens.add({
      targets: this.pauseUi,
      alpha: 1,
      scale: 1,
      duration: 115,
      ease: "Quad.easeOut"
    });
    this.updatePauseFocus();
  }

  updatePauseInput() {
    if (this.menuUpPressed()) {
      this.pauseSelectedIndex = Phaser.Math.Wrap(this.pauseSelectedIndex - 1, 0, this.pauseButtons.length);
      this.updatePauseFocus();
      this.playTone("menu");
    } else if (this.menuDownPressed()) {
      this.pauseSelectedIndex = Phaser.Math.Wrap(this.pauseSelectedIndex + 1, 0, this.pauseButtons.length);
      this.updatePauseFocus();
      this.playTone("menu");
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.r)) {
      this.executePauseAction("restart");
    } else if (Phaser.Input.Keyboard.JustDown(this.keys.m)) {
      this.executePauseAction("menu");
    } else if (Phaser.Input.Keyboard.JustDown(this.keys.enter) || Phaser.Input.Keyboard.JustDown(this.cursors.space)) {
      this.executePauseAction(this.pauseButtons[this.pauseSelectedIndex].action);
    }
  }

  updatePauseFocus() {
    if (!this.pauseButtons) {
      return;
    }

    this.pauseButtons.forEach((button, index) => {
      const focused = index === this.pauseSelectedIndex;
      button.rect.setFillStyle(focused ? 0x2f5546 : 0x1a2a23);
      button.rect.setStrokeStyle(focused ? 4 : 2, focused ? 0xf4e786 : 0xe7d66b);
      button.text.setColor(focused ? "#f4e786" : "#edf8ed");
    });
  }

  executePauseAction(action) {
    if (action === "resume") {
      this.togglePause();
      return;
    }

    this.physics.resume();
    this.paused = false;
    this.destroyPauseMenu();

    if (action === "restart") {
      this.scene.restart();
    } else {
      this.scene.start("MenuScene");
    }
  }

  destroyPauseMenu() {
    if (!this.pauseUi) {
      return;
    }

    const ui = this.pauseUi;
    this.pauseUi = null;
    this.pauseButtons = null;
    this.tweens.add({
      targets: ui,
      alpha: 0,
      scale: 0.98,
      duration: 85,
      ease: "Quad.easeIn",
      onComplete: () => ui.destroy(true)
    });
  }

  tryStartChallenge(zone) {
    if (this.quiz || this.merchantOpen || zone.getData("locked") || zone.getData("completed")) {
      return;
    }

    this.startChallenge(zone);
  }

  startChallenge(zone) {
    const question = zone.getData("question");
    const id = zone.getData("id");
    const baseX = zone.x + (id === 2 ? -250 : 120);
    const doorY = 585;
    const doors = [];
    const uiItems = [];

    const panel = this.add.container(0, 0).setScrollFactor(0).setDepth(70);
    panel.add(this.add.rectangle(640, 118, 1110, 178, 0x08100f, 0.94).setStrokeStyle(3, 0xe7d66b));
    panel.add(this.add.text(110, 48, question.prompt, {
      fontFamily: "Cascadia Mono, Consolas, monospace",
      fontSize: "24px",
      color: "#edf8ed",
      wordWrap: { width: 760 }
    }));
    const timerText = this.add.text(1010, 50, "", {
      fontFamily: "Cascadia Mono, Consolas, monospace",
      fontSize: "28px",
      color: "#e7d66b"
    });
    panel.add(timerText);
    panel.setAlpha(0);
    panel.y = -18;

    question.options.forEach((option, index) => {
      const door = this.add.rectangle(baseX + index * 105, doorY, 78, 112, 0x18231d, 0.92).setStrokeStyle(4, 0xe7d66b);
      this.physics.add.existing(door, true);
      door.setData("answer", index);
      door.setDepth(25);
      door.setAlpha(0);
      door.setScale(1, 0.08);
      doors.push(door);
      uiItems.push(door);

      const letter = String.fromCharCode(65 + index);
      const optionX = 112 + (index % 2) * 450;
      const optionY = 104 + Math.floor(index / 2) * 44;
      panel.add(this.add.rectangle(optionX + 205, optionY + 15, 410, 32, 0x13201b, 1).setStrokeStyle(1, 0x3f5d4f));
      panel.add(this.add.text(optionX, optionY, `${letter}: ${option}`, {
        fontFamily: "Cascadia Mono, Consolas, monospace",
        fontSize: "15px",
        color: "#edf8ed",
        wordWrap: { width: 390 }
      }));

      const label = this.add.text(door.x - 21, door.y - 80, letter, {
        fontFamily: "EdgecaseTitle, Bahnschrift, Impact",
        fontSize: "38px",
        color: "#e7d66b",
        stroke: "#08100f",
        strokeThickness: 4
      }).setDepth(26);
      label.setAlpha(0);

      uiItems.push(label);
    });

    this.quiz = {
      zone,
      question,
      panel,
      doors,
      uiItems,
      selectedAnswer: null,
      startedAt: this.time.now,
      endsAt: this.time.now + CHALLENGE_SECONDS * 1000,
      timerText,
      closing: false
    };
    this.animateChallengeIn();
    this.showToast("Stand at a door and press E");
  }

  updateSelectedAnswerDoor() {
    if (!this.quiz) {
      return;
    }

    const playerBounds = this.player.getBounds();
    let selectedAnswer = null;

    for (const door of this.quiz.doors) {
      const isSelected = Phaser.Geom.Intersects.RectangleToRectangle(playerBounds, door.getBounds());
      if (isSelected) {
        selectedAnswer = door.getData("answer");
      }

      door.setFillStyle(isSelected ? 0x35594b : 0x18231d, isSelected ? 1 : 0.92);
      door.setStrokeStyle(isSelected ? 5 : 4, isSelected ? 0xf4e786 : 0xe7d66b);
    }

    this.quiz.selectedAnswer = selectedAnswer;
  }

  confirmSelectedAnswer() {
    if (!this.quiz || this.quiz.selectedAnswer === null) {
      this.showToast("Stand inside an answer door first");
      return;
    }

    const selected = this.quiz.selectedAnswer;
    const correct = selected === this.quiz.question.correct;
    this.finishChallenge(correct, correct ? "Correct" : "Wrong");
  }

  animateChallengeIn() {
    if (!this.quiz) {
      return;
    }

    this.tweens.add({
      targets: this.quiz.panel,
      alpha: 1,
      y: 0,
      duration: 120,
      ease: "Quad.easeOut"
    });

    this.quiz.uiItems.forEach((item, index) => {
      this.tweens.add({
        targets: item,
        alpha: 1,
        scaleY: 1,
        duration: 105,
        delay: 18 * index,
        ease: "Back.easeOut"
      });
    });
  }

  finishChallenge(success, reason) {
    if (!this.quiz) {
      return;
    }

    if (this.quiz.closing) {
      return;
    }

    const quiz = this.quiz;
    quiz.closing = true;

    const { zone, panel, uiItems, startedAt } = quiz;
    const elapsed = (this.time.now - startedAt) / 1000;
    const remaining = Math.max(0, CHALLENGE_SECONDS - elapsed);

    this.tweens.add({
      targets: panel,
      alpha: 0,
      y: -18,
      duration: 100,
      ease: "Quad.easeIn"
    });

    uiItems.forEach((item, index) => {
      this.tweens.add({
        targets: item,
        alpha: 0,
        scaleY: item.type === "Rectangle" ? 0.08 : 1,
        duration: 95,
        delay: 12 * index,
        ease: "Quad.easeIn"
      });
    });

    if (success) {
      const speedBonus = Math.round(remaining * 1.4);
      const multiplier = 1 + (this.answerStreak * 0.08);
      const earned = Math.round((this.tuning.reward + speedBonus) * multiplier);
      this.answerStreak += 1;
      zone.setData("completed", true);
      zone.setFillStyle(0x3fa68f, 0.14);
      zone.setStrokeStyle(3, 0x3fa68f, 0.65);

      this.coins += earned;
      this.showToast(`Correct: +${earned}`);
      this.playTone("correct");
    } else {
      this.answerStreak = 0;
      this.coins = Math.max(0, this.coins - 5);
      zone.setData("locked", true);
      zone.setFillStyle(0x5d2020, 0.2);
      zone.setStrokeStyle(3, 0xd65f4f, 0.8);
      this.addPenaltyHazard(zone.x + 120);
      this.showToast(`${reason}: zone locked, -5 coins`);
      this.playTone(reason === "Timeout" ? "timeout" : "wrong");
    }

    this.time.delayedCall(155, () => {
      panel.destroy(true);
      for (const item of uiItems) {
        item.destroy();
      }

      if (this.quiz === quiz) {
        this.quiz = null;
      }
    });
  }

  grantFastBuff() {
    const buffs = ["speed", "magnet", "shield"];
    const buff = buffs[this.answerStreak % buffs.length];
    const until = this.time.now + 12000;

    if (buff === "speed") {
      this.tempBuffs.speedUntil = until;
      return "speed boost";
    } else if (buff === "magnet") {
      this.tempBuffs.magnetUntil = until;
      return "coin magnet";
    }

    this.tempBuffs.shieldUntil = until;
    return "shield";
  }

  addPenaltyHazard(x) {
    const spike = this.hazards.create(x, this.floorY - 14, "spike");
    spike.refreshBody();
  }

  openMerchant() {
    this.merchantOpen = true;
    this.merchantSelectedIndex = Phaser.Math.Clamp(this.merchantSelectedIndex, 0, UPGRADES.length - 1);
    this.merchantHoldStartedAt = null;
    this.merchantHoldComplete = false;
    this.player.setVelocity(0, 0);
    this.playTone("menu");

    this.merchantUi = this.add.container(0, 0).setScrollFactor(0).setDepth(90);
    this.merchantUi.add(this.add.rectangle(640, 360, 770, 475, 0x08100f, 0.96).setStrokeStyle(4, 0xe7d66b));
    this.merchantUi.add(this.add.text(640, 178, "MERCHANT", {
      fontFamily: "EdgecaseTitle, Bahnschrift, Impact",
      fontSize: "46px",
      color: "#e7d66b"
    }).setOrigin(0.5));
    this.merchantUi.add(this.add.text(640, 216, "W/S or arrows select. Hold Space for 1s to buy. Esc closes.", {
      fontFamily: "Cascadia Mono, Consolas, monospace",
      fontSize: "18px",
      color: "#d9e5d0"
    }).setOrigin(0.5));

    this.merchantRows = UPGRADES.map((upgrade, index) => {
      const y = 275 + index * 70;
      const owned = this.upgrades[upgrade.id];
      const affordable = this.coins >= upgrade.cost;
      const color = owned ? 0x274136 : affordable ? 0x22312b : 0x201b18;
      const row = this.add.rectangle(640, y, 610, 54, color, 1).setStrokeStyle(2, owned ? 0x3fa68f : 0x6f744e);
      const progressFill = this.add.rectangle(335, y, 0, 54, 0xe7d66b, 0.26).setOrigin(0, 0.5);
      const title = owned ? `${index + 1}. ${upgrade.name} - OWNED` : `${index + 1}. ${upgrade.name} - ${upgrade.cost}`;
      const text = this.add.text(360, y - 18, title, {
        fontFamily: "Cascadia Mono, Consolas, monospace",
        fontSize: "18px",
        color: owned ? "#8ee0c6" : "#edf8ed"
      });
      const coinIcon = this.add.image(text.x + text.width + 15, y - 8, "coin").setDisplaySize(18, 18);
      coinIcon.setVisible(!owned);
      const desc = this.add.text(360, y + 7, upgrade.description, {
        fontFamily: "Cascadia Mono, Consolas, monospace",
        fontSize: "13px",
        color: "#b8c7b5"
      });
      row.setInteractive({ useHandCursor: true });
      row.on("pointerover", () => {
        this.merchantSelectedIndex = index;
        this.resetMerchantHold();
        this.updateMerchantFocus();
      });
      row.on("pointerdown", () => {
        this.merchantSelectedIndex = index;
        this.updateMerchantFocus();
      });
      this.merchantUi.add([row, progressFill, text, coinIcon, desc]);
      return { upgrade, row, text, coinIcon, desc, progressFill };
    });
    this.updateMerchantFocus();
  }

  closeMerchant() {
    this.merchantOpen = false;
    this.resetMerchantHold();
    this.merchantRequiresSpaceRelease = false;
    this.merchantRows = null;
    if (this.merchantUi) {
      this.merchantUi.destroy(true);
      this.merchantUi = null;
    }
  }

  updateMerchantInput(time) {
    if (!this.merchantOpen || !this.merchantRows) {
      return;
    }

    if (this.merchantRequiresSpaceRelease) {
      if (!this.cursors.space.isDown) {
        this.merchantRequiresSpaceRelease = false;
      }
      return;
    }

    if (this.menuUpPressed()) {
      this.merchantSelectedIndex = Phaser.Math.Wrap(this.merchantSelectedIndex - 1, 0, this.merchantRows.length);
      this.resetMerchantHold();
      this.updateMerchantFocus();
      this.playTone("menu");
    } else if (this.menuDownPressed()) {
      this.merchantSelectedIndex = Phaser.Math.Wrap(this.merchantSelectedIndex + 1, 0, this.merchantRows.length);
      this.resetMerchantHold();
      this.updateMerchantFocus();
      this.playTone("menu");
    }

    const selectedRow = this.merchantRows[this.merchantSelectedIndex];
    if (!selectedRow) {
      return;
    }

    if (!this.cursors.space.isDown) {
      this.resetMerchantHold();
      return;
    }

    const owned = this.upgrades[selectedRow.upgrade.id];
    const affordable = this.coins >= selectedRow.upgrade.cost;
    if (owned || !affordable) {
      this.resetMerchantHold();
      if (Phaser.Input.Keyboard.JustDown(this.cursors.space) && !this.merchantHoldDenied) {
        this.merchantHoldDenied = true;
        this.showToast(owned ? "Already owned" : "Not enough coins");
        this.playTone("deny");
      }
      return;
    }

    if (this.merchantHoldStartedAt === null) {
      this.merchantHoldStartedAt = time;
      this.merchantHoldComplete = false;
      this.merchantHoldDenied = false;
      this.startMerchantChargeTone();
    }

    const progress = Phaser.Math.Clamp((time - this.merchantHoldStartedAt) / 1000, 0, 1);
    selectedRow.progressFill.width = 610 * progress;
    this.updateMerchantChargeTone(progress);

    if (progress >= 1 && !this.merchantHoldComplete) {
      this.merchantHoldComplete = true;
      this.stopMerchantChargeTone();
      this.buyUpgrade(selectedRow.upgrade);
    }
  }

  resetMerchantHold() {
    this.merchantHoldStartedAt = null;
    this.merchantHoldComplete = false;
    this.merchantHoldDenied = false;
    this.stopMerchantChargeTone();
    if (!this.merchantRows) {
      return;
    }

    for (const row of this.merchantRows) {
      row.progressFill.width = 0;
    }
  }

  updateMerchantFocus() {
    if (!this.merchantRows) {
      return;
    }

    this.merchantRows.forEach((item, index) => {
      const focused = index === this.merchantSelectedIndex;
      const owned = this.upgrades[item.upgrade.id];
      const affordable = this.coins >= item.upgrade.cost;
      item.row.setFillStyle(owned ? 0x274136 : affordable ? 0x22312b : 0x201b18);
      item.row.setStrokeStyle(focused ? 4 : 2, focused ? 0xf4e786 : owned ? 0x3fa68f : 0x6f744e);
      item.text.setColor(focused ? "#f4e786" : owned ? "#8ee0c6" : "#edf8ed");
      item.coinIcon.setVisible(!owned);
      item.coinIcon.setAlpha(affordable ? 1 : 0.45);
      item.desc.setColor(affordable || owned ? "#b8c7b5" : "#8d7770");
    });
  }

  startMerchantChargeTone() {
    const audio = this.ensureAudio();
    if (!audio || !this.masterGain || this.merchantChargeOsc) {
      return;
    }

    const now = audio.currentTime;
    this.merchantChargeOsc = audio.createOscillator();
    this.merchantChargeGain = audio.createGain();
    this.merchantChargeOsc.type = "triangle";
    this.merchantChargeOsc.frequency.setValueAtTime(220, now);
    this.merchantChargeGain.gain.setValueAtTime(0.001, now);
    this.merchantChargeGain.gain.exponentialRampToValueAtTime(0.085, now + 0.04);
    this.merchantChargeOsc.connect(this.merchantChargeGain);
    this.merchantChargeGain.connect(this.masterGain);
    this.merchantChargeOsc.start(now);
  }

  updateMerchantChargeTone(progress) {
    if (!this.audioContext || !this.merchantChargeOsc || !this.merchantChargeGain) {
      return;
    }

    const now = this.audioContext.currentTime;
    const frequency = Phaser.Math.Linear(220, 760, progress);
    const gain = Phaser.Math.Linear(0.055, 0.14, progress);
    this.merchantChargeOsc.frequency.setTargetAtTime(frequency, now, 0.025);
    this.merchantChargeGain.gain.setTargetAtTime(gain, now, 0.025);
  }

  stopMerchantChargeTone() {
    if (!this.audioContext || !this.merchantChargeOsc || !this.merchantChargeGain) {
      this.merchantChargeOsc = null;
      this.merchantChargeGain = null;
      return;
    }

    const now = this.audioContext.currentTime;
    const osc = this.merchantChargeOsc;
    const gain = this.merchantChargeGain;
    this.merchantChargeOsc = null;
    this.merchantChargeGain = null;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setTargetAtTime(0.001, now, 0.02);
    osc.stop(now + 0.08);
  }

  buyUpgrade(upgrade) {
    if (!upgrade || this.upgrades[upgrade.id]) {
      this.showToast("Already owned");
      this.playTone("deny");
      return;
    }

    if (this.coins < upgrade.cost) {
      this.showToast("Not enough coins");
      this.playTone("deny");
      return;
    }

    this.coins -= upgrade.cost;
    this.upgrades[upgrade.id] = true;
    this.showToast(`${upgrade.name} purchased`);
    this.playTone("buy");
    this.closeMerchant();
    this.openMerchant();
    this.merchantRequiresSpaceRelease = true;
  }

  endRun(title = "RUN COMPLETE") {
    this.runEnded = true;
    this.merchantOpen = false;
    this.nearMerchant = false;
    this.nearExit = false;
    this.quiz = null;
    this.player.setAccelerationX(0);
    this.player.setVelocity(0, 0);
    if (this.player.body) {
      this.player.body.enable = false;
    }
    if (this.enemies) {
      for (const enemy of this.enemies.getChildren()) {
        enemy.setVelocity(0, 0);
      }
    }
    this.add.rectangle(640, 360, 1280, 720, 0x07100f, 0.9).setScrollFactor(0).setDepth(100);
    this.add.text(640, 205, title, {
      fontFamily: "EdgecaseTitle, Bahnschrift, Impact",
      fontSize: "68px",
      color: "#e7d66b",
      stroke: "#101814",
      strokeThickness: 6
    }).setOrigin(0.5).setScrollFactor(0).setDepth(101);
    this.add.text(448, 288, `Coins banked: ${this.coins}\nHealth left: ${this.health}/${this.maxHealth}\nDifficulty: ${this.difficulty.toUpperCase()}`, {
      fontFamily: "Cascadia Mono, Consolas, monospace",
      fontSize: "26px",
      color: "#edf8ed",
      lineSpacing: 14
    }).setScrollFactor(0).setDepth(101);

    const restart = this.add.rectangle(640, 500, 310, 62, 0xe7d66b).setScrollFactor(0).setDepth(101).setInteractive({ useHandCursor: true });
    this.add.text(640, 500, "NEW RUN", {
      fontFamily: "EdgecaseTitle, Bahnschrift, Impact",
      fontSize: "34px",
      color: "#07100f"
    }).setOrigin(0.5).setScrollFactor(0).setDepth(102);
    restart.on("pointerdown", () => this.scene.start("MenuScene"));
    this.input.keyboard.once("keydown-SPACE", () => this.scene.start("MenuScene"));
  }

  collectCoin(coin) {
    this.coins += coin.getData("value") || 1;
    coin.disableBody(true, true);
    this.playTone("coin");
  }

  takeDamage(source) {
    const time = this.time.now;
    if (this.merchantOpen || this.isInMerchantSafeZone()) {
      return;
    }

    if (time - this.lastDamageAt < 900) {
      return;
    }

    const hasShield = time < this.tempBuffs.shieldUntil || (this.upgrades.shield && time - this.lastShieldUse > 18000);
    if (hasShield) {
      this.lastShieldUse = time;
      this.tempBuffs.shieldUntil = 0;
      this.player.setVelocityY(-360);
      this.showToast(`Shield blocked ${source}`);
      this.playTone("shield");
      this.lastDamageAt = time;
      return;
    }

    this.health = Math.max(0, this.health - 1);
    this.player.setVelocity(this.player.flipX ? 300 : -300, -430);
    this.cameras.main.shake(130, 0.01);
    this.showToast(`${source} hit: -1 HP`);
    this.playTone("hit");
    this.lastDamageAt = time;

    if (this.health <= 0) {
      this.endRun("DEFEATED");
    }
  }

  updateHud() {
    this.coinText.setText(`${this.coins}`);
    this.healthText.setText(`HP ${this.health}/${this.maxHealth}`);

    const buffs = [];
    if (this.upgrades.dash) buffs.push("Dash");
    if (this.upgrades.doubleJump) buffs.push("Double jump");
    if (this.upgrades.shield) buffs.push("Shield");
    if (this.upgrades.magnet) buffs.push("Magnet");
    if (this.time.now < this.tempBuffs.speedUntil) buffs.push("Speed buff");
    if (this.time.now < this.tempBuffs.magnetUntil) buffs.push("Magnet buff");
    if (this.time.now < this.tempBuffs.shieldUntil) buffs.push("Shield buff");
    this.statusText.setText(`FIELD Tech  |  ${this.difficulty.toUpperCase()}  |  ${buffs.join(", ") || "No upgrades"}`);

    if (this.merchantOpen) {
      this.promptText.setText("");
    } else if (this.nearMerchant) {
      this.promptText.setText("Press E: Merchant");
    } else if (this.nearExit) {
      this.promptText.setText("Press E: End run");
    } else if (this.quiz) {
      this.promptText.setText(this.quiz.selectedAnswer === null ? "Stand in a door" : "Press E: Lock answer");
    } else {
      this.promptText.setText("");
    }
  }

  showToast(message) {
    this.toastText.setText(message);
    this.toastText.setVisible(true);
    this.tweens.killTweensOf(this.toastText);
    this.toastText.setAlpha(1);
    this.tweens.add({
      targets: this.toastText,
      alpha: 0,
      delay: 1400,
      duration: 350,
      onComplete: () => this.toastText.setVisible(false)
    });
  }

  menuUpPressed() {
    return Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.keys.w);
  }

  menuDownPressed() {
    return Phaser.Input.Keyboard.JustDown(this.cursors.down) || Phaser.Input.Keyboard.JustDown(this.keys.s);
  }

  ensureAudio() {
    if (!this.audioContext) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        return null;
      }
      this.audioContext = new AudioContextClass();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.14;
      this.masterGain.connect(this.audioContext.destination);
    }

    if (this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }

    return this.audioContext;
  }

  playTone(type) {
    const audio = this.ensureAudio();
    if (!audio || !this.masterGain) {
      return;
    }

    const now = audio.currentTime;
    const presets = {
      coin: { frequency: 920, end: 1320, duration: 0.08, wave: "square", gain: 0.22 },
      jump: { frequency: 260, end: 440, duration: 0.09, wave: "triangle", gain: 0.16 },
      dash: { frequency: 180, end: 90, duration: 0.11, wave: "sawtooth", gain: 0.12 },
      correct: { frequency: 520, end: 880, duration: 0.18, wave: "triangle", gain: 0.2 },
      wrong: { frequency: 180, end: 90, duration: 0.2, wave: "sawtooth", gain: 0.13 },
      timeout: { frequency: 150, end: 70, duration: 0.26, wave: "sawtooth", gain: 0.11 },
      hit: { frequency: 120, end: 55, duration: 0.16, wave: "square", gain: 0.16 },
      shield: { frequency: 360, end: 620, duration: 0.14, wave: "triangle", gain: 0.18 },
      buy: { frequency: 420, end: 760, duration: 0.16, wave: "triangle", gain: 0.18 },
      deny: { frequency: 160, end: 145, duration: 0.11, wave: "square", gain: 0.12 },
      menu: { frequency: 340, end: 420, duration: 0.07, wave: "triangle", gain: 0.1 },
      pause: { frequency: 260, end: 180, duration: 0.1, wave: "triangle", gain: 0.1 },
      resume: { frequency: 180, end: 260, duration: 0.1, wave: "triangle", gain: 0.1 }
    };
    const preset = presets[type] || presets.menu;

    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = preset.wave;
    osc.frequency.setValueAtTime(preset.frequency, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, preset.end), now + preset.duration);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(preset.gain, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + preset.duration);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + preset.duration + 0.02);
  }

  pickQuestion(difficulty, offset) {
    const pool = QUESTIONS.filter((question) => question.difficulty === difficulty);
    return pool[offset % pool.length];
  }

  addPlatform(x, y, width, height) {
    const tileCount = Math.ceil(width / 64);
    for (let i = 0; i < tileCount; i += 1) {
      const tileX = x - width / 2 + 32 + i * 64;
      const tile = this.platforms.create(tileX, y, "platform");
      tile.setDisplaySize(Math.min(64, width - i * 64), height);
      tile.refreshBody();
    }
  }

  signStyle() {
    return {
      fontFamily: "Cascadia Mono, Consolas, monospace",
      fontSize: "15px",
      color: "#e7d66b",
      backgroundColor: "#08100f",
      padding: { x: 7, y: 5 }
    };
  }

  hudStyle(color) {
    return {
      fontFamily: "Cascadia Mono, Consolas, monospace",
      fontSize: "18px",
      color
    };
  }
}
