import Phaser from "phaser";

const SPRITE_SHEETS = [
  {
    key: "hero-sheet-idle",
    path: "/assets/sprites/hero-sprite-sheet-transparent.png",
    frameWidth: 320,
    frameHeight: 320,
    label: "Hero idle transparent sheet (320x320)"
  }
];

const LEVEL_BACKGROUND = {
  key: "level-background",
  path: "/assets/sprites/hero-sprite-sheet-alt.jpg"
};

const PLAYGROUND_CONFIG = {
  mapWidth: 1280,
  mapHeight: 720,
  floorY: 555,
  floorThickness: 28,
  wallColor: 0x4c6278,
  gravityY: 700
};

export class SpritePlaygroundScene extends Phaser.Scene {
  constructor() {
    super("sprite-playground");

    this.activeSpriteIndex = 0;
    this.playerConfig = SPRITE_SHEETS[this.activeSpriteIndex];
    this.hud = null;
    this.currentSheetText = null;
    this.hasIdle = false;
    this.hasWalk = false;
  }

  preload() {
    SPRITE_SHEETS.forEach((cfg) => {
      this.load.spritesheet(cfg.key, cfg.path, {
        frameWidth: cfg.frameWidth,
        frameHeight: cfg.frameHeight
      });
    });
    this.load.image(LEVEL_BACKGROUND.key, LEVEL_BACKGROUND.path);

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

    this.add.image(0, 0, LEVEL_BACKGROUND.key).setOrigin(0, 0);

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
      PLAYGROUND_CONFIG.floorY - 20,
      this.playerConfig.key
    );
    this.player.setOrigin(0.5, 1);
    this.player.setCollideWorldBounds(true);
    this.player.setDisplaySize(150, 150);
    this.player.body.setSize(this.playerConfig._frameWidth * 0.34, this.playerConfig._frameHeight * 0.62);
    this.player.body.setOffset(
      (this.playerConfig._frameWidth - this.playerConfig._frameWidth * 0.34) / 2,
      this.playerConfig._frameHeight * 0.35
    );
    this.physics.add.collider(this.player, this.wallGroup);
    this.physics.add.collider(this.player, this.groundGroup);

    this.setupAnimations(this.playerConfig);
    this.currentlyActiveIdleAnim = `idle-${this.playerConfig.key}`;
    this.player.play(this.hasIdle ? this.currentlyActiveIdleAnim : null, true);
    this.applyCurrentSheetMessage();

    this.cameras.main.setBounds(0, 0, PLAYGROUND_CONFIG.mapWidth, PLAYGROUND_CONFIG.mapHeight);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(1);
    this.cameras.main.setRoundPixels(true);

    if (status) {
      status.textContent = "Sprite playground loaded. Idle animation only.";
    }
  }

  resolveSheetGrid(cfg) {
    const sourceTexture = this.textures.get(cfg.key);
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
      const sourceTexture = this.textures.get(cfg.key);
      const layout = this.resolveSheetGrid(cfg);

      if (!sourceTexture || !layout) {
        return;
      }

      cfg._frameWidth = layout.frameWidth;
      cfg._frameHeight = layout.frameHeight;
      cfg._frameColumns = Math.max(1, Math.floor(layout.sourceWidth / layout.frameWidth));
      cfg._frameRows = Math.max(1, Math.floor(layout.sourceHeight / layout.frameHeight));
      cfg._frameCount = Math.max(0, sourceTexture.frameTotal - 1);

      console.log(
        `[sprite-sheet] ${cfg.label}: ${cfg._frameColumns}x${cfg._frameRows}, frame=${cfg._frameWidth}x${cfg._frameHeight}, total=${cfg._frameCount}`
      );
    });
  }

  createFloor() {
    const floor = this.add.rectangle(
      PLAYGROUND_CONFIG.mapWidth / 2,
      PLAYGROUND_CONFIG.floorY,
      PLAYGROUND_CONFIG.mapWidth,
      PLAYGROUND_CONFIG.floorThickness,
      0x2f4f3f,
      0.35
    );
    floor.setStrokeStyle(1, 0x99f0b8, 0.55);
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
  }

  makeWall(x, y, width, height) {
    const wall = this.add.rectangle(x, y, width, height, PLAYGROUND_CONFIG.wallColor);
    wall.setStrokeStyle(2, 0x8ea7ba);
    this.physics.add.existing(wall, true);
    this.wallGroup.add(wall);
  }

  setupAnimations(config) {
    const texture = this.textures.get(config.key);
    const frameCount = texture ? Math.max(0, texture.frameTotal - 1) : 0;

    this.hasIdle = frameCount > 0;
    this.hasWalk = false;

    const idleKey = `idle-${config.key}`;

    if (!this.anims.exists(idleKey)) {
      this.anims.create({
        key: idleKey,
        frames: this.anims.generateFrameNumbers(config.key, {
          start: 0,
          end: Math.max(0, frameCount - 1)
        }),
        frameRate: 6,
        repeat: -1,
        skipMissedFrames: true
      });
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
    } (${this.playerConfig._frameColumns || "?"}x${this.playerConfig._frameRows || "?"}, ${this.playerConfig._frameWidth || "?"}x${this.playerConfig._frameHeight || "?"} px).`;
  }

  update() {
    if (this.hasIdle && this.player.anims.exists(this.currentlyActiveIdleAnim)) {
      this.player.play(this.currentlyActiveIdleAnim, true);
    } else {
      this.player.setFrame(0);
    }

    const status = document.querySelector("#status");
    if (status) {
      const grounded = this.player.body.blocked.down ? "yes" : "no";
      status.textContent = `${this.playerConfig.label} | grounded:${grounded} | y:${Math.round(this.player.y)}`;
    }
  }
}
