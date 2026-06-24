import Phaser from "phaser";

const SPRITE_SHEETS = [
  {
    key: "hero-sheet-idle",
    imageKey: "hero-sheet-idle-source",
    path: "/assets/sprites/hero-sprite-sheet.jpg",
    frameWidth: 320,
    frameHeight: 320,
    label: "Hero idle sheet (320x320)"
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
      this.load.image(cfg.imageKey, cfg.path);
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

    this.createTransparentSpriteSheets();
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

  createTransparentSpriteSheets() {
    SPRITE_SHEETS.forEach((cfg) => {
      const sourceTexture = this.textures.get(cfg.imageKey);
      const sourceImage = sourceTexture?.getSourceImage?.() ?? sourceTexture?.source?.[0]?.image;

      if (!sourceImage) {
        console.error(`[sprite-sheet] Missing source image for ${cfg.label}`);
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = sourceImage.width;
      canvas.height = sourceImage.height;

      const context = canvas.getContext("2d", { willReadFrequently: true });
      context.drawImage(sourceImage, 0, 0);

      this.removeFrameEdgeBackground(context, canvas.width, canvas.height, cfg.frameWidth, cfg.frameHeight);

      const created = this.textures.addSpriteSheet(cfg.key, canvas, {
        frameWidth: cfg.frameWidth,
        frameHeight: cfg.frameHeight
      });

      if (!created) {
        console.error(`[sprite-sheet] Failed to create transparent sprite sheet for ${cfg.key}`);
        return;
      }

      console.log(`[sprite-sheet] Removed near-white edge background for ${cfg.label}`);
    });
  }

  removeFrameEdgeBackground(context, width, height, frameWidth, frameHeight) {
    const image = context.getImageData(0, 0, width, height);
    const { data } = image;
    const columns = Math.floor(width / frameWidth);
    const rows = Math.floor(height / frameHeight);

    const isBackgroundPixel = (index) => {
      const red = data[index];
      const green = data[index + 1];
      const blue = data[index + 2];
      const brightest = Math.max(red, green, blue);
      const darkest = Math.min(red, green, blue);

      return brightest > 218 && brightest - darkest < 42;
    };

    const clearConnectedBackground = (frameX, frameY) => {
      const minX = frameX * frameWidth;
      const minY = frameY * frameHeight;
      const maxX = minX + frameWidth - 1;
      const maxY = minY + frameHeight - 1;
      const stack = [];
      const visited = new Uint8Array(frameWidth * frameHeight);

      const push = (x, y) => {
        if (x < minX || x > maxX || y < minY || y > maxY) return;
        const localIndex = (y - minY) * frameWidth + (x - minX);
        if (visited[localIndex]) return;

        visited[localIndex] = 1;
        stack.push([x, y]);
      };

      for (let x = minX; x <= maxX; x += 1) {
        push(x, minY);
        push(x, maxY);
      }

      for (let y = minY; y <= maxY; y += 1) {
        push(minX, y);
        push(maxX, y);
      }

      while (stack.length > 0) {
        const [x, y] = stack.pop();
        const index = (y * width + x) * 4;

        if (!isBackgroundPixel(index)) {
          continue;
        }

        data[index + 3] = 0;
        push(x + 1, y);
        push(x - 1, y);
        push(x, y + 1);
        push(x, y - 1);
      }
    };

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        clearConnectedBackground(column, row);
      }
    }

    context.putImageData(image, 0, 0);
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
