import Phaser from "phaser";

const SPRITE_SHEETS = [
  {
    key: "hero-sheet-walk",
    imageKey: "hero-sheet-walk-image",
    path: "/assets/sprites/hero-sprite-sheet.jpg",
    frameWidth: 128,
    frameHeight: 128,
    label: "Walk/Action sheet (128x128)"
  },
  {
    key: "hero-sheet-idle",
    imageKey: "hero-sheet-idle-image",
    path: "/assets/sprites/hero-sprite-sheet-alt.jpg",
    frameCols: 4,
    frameRows: 4,
    frameWidth: 0,
    frameHeight: 0,
    label: "Idle candidate (4x4)"
  }
];

const PLAYGROUND_CONFIG = {
  mapWidth: 2400,
  mapHeight: 1600,
  floorY: 1180,
  floorThickness: 60,
  tileColor: 0x2d4a52,
  wallColor: 0x4c6278,
  playerSpeed: 250,
  gravityY: 700
};

export class SpritePlaygroundScene extends Phaser.Scene {
  constructor() {
    super("sprite-playground");

    this.activeSpriteIndex = 1;
    this.playerConfig = SPRITE_SHEETS[this.activeSpriteIndex];
    this.hud = null;
    this.currentSheetText = null;
    this.hasIdle = false;
    this.hasWalk = false;
  }

  preload() {
    SPRITE_SHEETS.forEach((cfg) => {
      this.load.image(cfg.imageKey, cfg.path);
    });

    this.load.on("loaderror", () => {
      console.error("Failed to load sprite assets.");
      const status = document.querySelector("#status");
      if (status) {
        status.textContent = "Failed to load sprite assets from public/assets/sprites.";
      }
    });
  }

  create() {
    const status = document.querySelector("#status");
    this.hud = document.querySelector("#playground-hud");

    if (status) {
      status.textContent = "Loading sprite sheets and building playground.";
    }

    this.add
      .rectangle(
        PLAYGROUND_CONFIG.mapWidth / 2,
        PLAYGROUND_CONFIG.mapHeight / 2,
        PLAYGROUND_CONFIG.mapWidth,
        PLAYGROUND_CONFIG.mapHeight,
        PLAYGROUND_CONFIG.tileColor
      )
      .setStrokeStyle(2, 0x44586b);

    this.physics.world.setBounds(0, 0, PLAYGROUND_CONFIG.mapWidth, PLAYGROUND_CONFIG.mapHeight);
    this.physics.world.setBoundsCollision(true, true, true, true);
    this.physics.world.gravity.y = PLAYGROUND_CONFIG.gravityY;

    this.wallGroup = this.physics.add.staticGroup();
    this.groundGroup = this.physics.add.staticGroup();

    this.bootstrapSpriteSheets();
    this.createFloor();
    this.createWalls();

    this.player = this.physics.add.sprite(
      PLAYGROUND_CONFIG.mapWidth / 2,
      PLAYGROUND_CONFIG.floorY - 80,
      this.playerConfig.key
    );
    this.player.setOrigin(0.5, 0.75);
    this.player.setCollideWorldBounds(true);
    this.player.setDisplaySize(84, 84);
    this.player.body.setSize(this.playerConfig._frameWidth * 0.45, this.playerConfig._frameHeight * 0.65);
    this.player.body.setOffset(
      (this.player.width - this.playerConfig._frameWidth * 0.45) / 2,
      this.player.height * 0.6
    );
    this.physics.add.collider(this.player, this.wallGroup);
    this.physics.add.collider(this.player, this.groundGroup);

    this.setupAnimations(this.playerConfig);
    this.currentlyActiveWalkAnim = `walk-${this.playerConfig.key}`;
    this.currentlyActiveIdleAnim = `idle-${this.playerConfig.key}`;
    this.player.play(this.hasIdle ? this.currentlyActiveIdleAnim : null, true);
    this.applyCurrentSheetMessage();

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyOne = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
    this.keyTwo = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);
    this.keyLeftBracket = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT_BRACKET);
    this.keyRightBracket = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT_BRACKET);

    this.cameras.main.setBounds(0, 0, PLAYGROUND_CONFIG.mapWidth, PLAYGROUND_CONFIG.mapHeight);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.35);
    this.cameras.main.setRoundPixels(true);

    if (status) {
      status.textContent = "Sprite playground loaded. Press WASD/arrow to move. 1/2 or [/] swap sprite sheet.";
    }
  }

  resolveSheetGrid(cfg) {
    const sourceTexture = this.textures.get(cfg.imageKey);
    const sourceImage = sourceTexture?.source?.[0];
    const imageWidth = sourceImage?.width ?? 0;
    const imageHeight = sourceImage?.height ?? 0;

    if (imageWidth === 0 || imageHeight === 0) {
      return null;
    }

    const frameWidth = cfg.frameWidth > 0 ? cfg.frameWidth : imageWidth / Math.max(1, cfg.frameCols);
    const frameHeight = cfg.frameHeight > 0 ? cfg.frameHeight : imageHeight / Math.max(1, cfg.frameRows);

    if (!Number.isInteger(frameWidth) || !Number.isInteger(frameHeight)) {
      console.warn(
        `[sprite-sheet] ${cfg.label} has non-integer frame size from layout ${cfg.frameCols ?? 1}x${
          cfg.frameRows ?? 1
        } on ${imageWidth}x${imageHeight}.`
      );
    }

    if (cfg.frameWidth > 0 || cfg.frameHeight > 0) {
      console.log(`[sprite-sheet] ${cfg.label} uses explicit frame size ${frameWidth}x${frameHeight}`);
    } else {
      console.log(
        `[sprite-sheet] ${cfg.label} resolved to ${Math.floor(imageWidth / frameWidth)}x${Math.floor(
          imageHeight / frameHeight
        )} from ${cfg.frameCols ?? "auto"}x${cfg.frameRows ?? "auto"}`
      );
    }

    const resolvedCols = Math.max(1, Math.floor(imageWidth / frameWidth));
    const resolvedRows = Math.max(1, Math.floor(imageHeight / frameHeight));

    return {
      frameWidth: Math.floor(frameWidth),
      frameHeight: Math.floor(frameHeight),
      sourceWidth: imageWidth,
      sourceHeight: imageHeight,
      resolvedCols,
      resolvedRows
    };
  }

  bootstrapSpriteSheets() {
    SPRITE_SHEETS.forEach((cfg) => {
      const sourceTexture = this.textures.get(cfg.imageKey);
      const layout = this.resolveSheetGrid(cfg);

      if (!sourceTexture || !layout) {
        return;
      }

      const created = this.textures.addSpriteSheet(cfg.key, sourceTexture, {
        frameWidth: layout.frameWidth,
        frameHeight: layout.frameHeight
      });

      if (!created) {
        console.error(`[sprite-sheet] Failed to create sprite sheet for ${cfg.key}`);
        return;
      }

      cfg._frameWidth = layout.frameWidth;
      cfg._frameHeight = layout.frameHeight;
      cfg._frameColumns = Math.max(1, Math.floor(layout.sourceWidth / layout.frameWidth));
      cfg._frameRows = Math.max(1, Math.floor(layout.sourceHeight / layout.frameHeight));
      cfg._frameCount = Math.max(0, created.frameTotal);

      console.log(
        `[sprite-sheet] ${cfg.label}: ${cfg._frameColumns}x${cfg._frameRows}, frame=${cfg._frameWidth}x${cfg._frameHeight}, total=${cfg._frameCount}`
      );

      this.textures.remove(cfg.imageKey);
    });
  }

  createFloor() {
    const floor = this.add.rectangle(
      PLAYGROUND_CONFIG.mapWidth / 2,
      PLAYGROUND_CONFIG.floorY,
      PLAYGROUND_CONFIG.mapWidth - 120,
      PLAYGROUND_CONFIG.floorThickness,
      0x3f5a4f
    );
    floor.setStrokeStyle(2, 0x2b403b);
    this.physics.add.existing(floor, true);
    this.groundGroup.add(floor);
  }

  createWalls() {
    const worldW = PLAYGROUND_CONFIG.mapWidth;
    const worldH = PLAYGROUND_CONFIG.mapHeight;

    this.makeWall(worldW / 2, worldH - 10, worldW - 20, 20);
    this.makeWall(worldW / 2, 10, worldW - 20, 20);
    this.makeWall(10, worldH / 2, 20, worldH - 20);
    this.makeWall(worldW - 10, worldH / 2, 20, worldH - 20);

    this.makeWall(worldW * 0.45, worldH * 0.34, 20, 320);
    this.makeWall(worldW * 0.75, worldH * 0.68, 18, 260);
    this.makeWall(worldW * 0.58, worldH * 0.82, 22, 300);
    this.makeWall(worldW * 0.16, worldH * 0.6, 18, 360);
  }

  makeWall(x, y, width, height) {
    const wall = this.add.rectangle(x, y, width, height, PLAYGROUND_CONFIG.wallColor);
    wall.setStrokeStyle(2, 0x8ea7ba);
    this.physics.add.existing(wall, true);
    this.wallGroup.add(wall);
  }

  setupAnimations(config) {
    const texture = this.textures.get(config.key);
    const frameCount = texture ? texture.frameTotal : 0;

    this.hasIdle = frameCount > 0;
    this.hasWalk = frameCount >= 5;

    const idleKey = `idle-${config.key}`;
    const walkKey = `walk-${config.key}`;

    if (!this.anims.exists(idleKey)) {
      this.anims.create({
        key: idleKey,
        frames: this.anims.generateFrameNumbers(config.key, {
          start: 0,
          end: Math.max(0, Math.min(3, frameCount - 1))
        }),
        frameRate: 4,
        repeat: -1,
        skipMissedFrames: true
      });
    }

    if (this.hasWalk && !this.anims.exists(walkKey)) {
      this.anims.create({
        key: walkKey,
        frames: this.anims.generateFrameNumbers(config.key, {
          start: Math.min(4, frameCount - 1),
          end: Math.min(frameCount - 1, Math.max(4, Math.min(11, frameCount - 1)))
        }),
        frameRate: 10,
        repeat: -1,
        skipMissedFrames: true
      });
    }
  }

  switchSheet(nextIndex) {
    const clampedIndex = Phaser.Math.Clamp(nextIndex, 0, SPRITE_SHEETS.length - 1);
    if (clampedIndex === this.activeSpriteIndex) {
      return;
    }

    const prevX = this.player?.x ?? PLAYGROUND_CONFIG.mapWidth / 2;
    const prevY = this.player?.y ?? PLAYGROUND_CONFIG.floorY - 80;
    const prevVx = this.player?.body?.velocity?.x ?? 0;
    const prevVy = this.player?.body?.velocity?.y ?? 0;

    this.activeSpriteIndex = clampedIndex;
    this.playerConfig = SPRITE_SHEETS[this.activeSpriteIndex];

    this.setupAnimations(this.playerConfig);
    this.player.setTexture(this.playerConfig.key);
    this.player.body.setSize(
      this.playerConfig._frameWidth * 0.45,
      this.playerConfig._frameHeight * 0.65
    );
    this.player.body.setOffset(
      (this.player.width - this.playerConfig._frameWidth * 0.45) / 2,
      this.player.height * 0.6
    );
    this.player.setDisplaySize(84, 84);
    this.player.setPosition(prevX, prevY);
    this.player.setVelocity(prevVx, prevVy);

    this.currentlyActiveWalkAnim = `walk-${this.playerConfig.key}`;
    this.currentlyActiveIdleAnim = `idle-${this.playerConfig.key}`;
    this.applyCurrentSheetMessage();

    const status = document.querySelector("#status");
    if (status) {
      status.textContent = `Switched to ${this.playerConfig.label}`;
    }
  }

  applyCurrentSheetMessage() {
    if (!this.currentSheetText) {
      this.currentSheetText = document.createElement("p");
      this.currentSheetText.className = "hint";
      if (this.hud) {
        this.hud.appendChild(this.currentSheetText);
      }
    }

    this.currentSheetText.textContent = `Sprite: ${
      this.playerConfig.label
    } (${this.playerConfig._frameColumns || "?"}x${this.playerConfig._frameRows || "?"}, ${this.playerConfig._frameWidth || "?"}x${this.playerConfig._frameHeight || "?"} px). Use 1/2 or [/] to switch.`;
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.keyOne) || Phaser.Input.Keyboard.JustDown(this.keyLeftBracket)) {
      this.switchSheet(0);
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.keyTwo) || Phaser.Input.Keyboard.JustDown(this.keyRightBracket)) {
      this.switchSheet(1);
      return;
    }

    const speed = PLAYGROUND_CONFIG.playerSpeed;
    const left = this.cursors.left.isDown || this.keyA.isDown;
    const right = this.cursors.right.isDown || this.keyD.isDown;
    const up = this.cursors.up.isDown || this.keyW.isDown;
    const down = this.cursors.down.isDown || this.keyS.isDown;

    let vx = 0;
    let vy = 0;

    if (left) vx = -speed;
    if (right) vx = speed;
    if (up) vy = -speed;
    if (down) vy = speed;

    if (vx !== 0 && vy !== 0) {
      vx *= Math.SQRT1_2;
      vy *= Math.SQRT1_2;
    }

    this.player.setVelocityX(vx);
    if (up || down) {
      this.player.setVelocityY(vy);
    }

    const isMoving = vx !== 0 || vy !== 0;

    if (isMoving) {
      if (this.hasWalk && this.player.anims.exists(this.currentlyActiveWalkAnim)) {
        this.player.play(this.currentlyActiveWalkAnim, true);
      }
      if (vx !== 0 || vy !== 0) {
        this.player.rotation = Math.atan2(vy, vx) + Math.PI / 2;
      }
    } else {
      if (this.hasIdle && this.player.anims.exists(this.currentlyActiveIdleAnim)) {
        this.player.play(this.currentlyActiveIdleAnim, true);
      } else {
        this.player.setFrame(0);
      }
      this.player.setVelocityX(0);
      this.player.rotation = 0;
    }

    const status = document.querySelector("#status");
    if (status) {
      const grounded = this.player.body.blocked.down ? "yes" : "no";
      status.textContent = `${this.playerConfig.label} | grounded:${grounded} | y:${Math.round(this.player.y)}`;
    }
  }
}
