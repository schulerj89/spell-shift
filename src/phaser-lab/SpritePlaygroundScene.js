import Phaser from "phaser";

const SPRITE_CONFIG = {
  key: "hero-sheet",
  path: "/assets/sprites/hero-sprite-sheet.jpg",
  frameWidth: 128,
  frameHeight: 128
};

const PLAYGROUND_CONFIG = {
  mapWidth: 2400,
  mapHeight: 1600,
  floorY: 1200,
  tileColor: 0x2d4a52,
  wallColor: 0x4c6278,
  playerSpeed: 260
};

export class SpritePlaygroundScene extends Phaser.Scene {
  constructor() {
    super("sprite-playground");
  }

  preload() {
    this.load.spritesheet(SPRITE_CONFIG.key, SPRITE_CONFIG.path, {
      frameWidth: SPRITE_CONFIG.frameWidth,
      frameHeight: SPRITE_CONFIG.frameHeight
    });

    this.load.on("loaderror", (_file, _img) => {
      console.error("Failed to load sprite assets.");
      const status = document.querySelector("#status");
      if (status) {
        status.textContent = "Failed to load sprite assets. Check path in public/assets/sprites.";
      }
    });
  }

  create() {
    const status = document.querySelector("#status");
    if (status) {
      status.textContent = "Loading sprite and building playground.";
    }

    this.background = this.add.rectangle(
      PLAYGROUND_CONFIG.mapWidth / 2,
      PLAYGROUND_CONFIG.mapHeight / 2,
      PLAYGROUND_CONFIG.mapWidth,
      PLAYGROUND_CONFIG.mapHeight,
      PLAYGROUND_CONFIG.tileColor
    );
    this.background.setStrokeStyle(2, 0x44586b);

    this.ground = this.add.rectangle(
      PLAYGROUND_CONFIG.mapWidth / 2,
      PLAYGROUND_CONFIG.floorY,
      PLAYGROUND_CONFIG.mapWidth - 120,
      60,
      0x3f5a4f
    );

    this.physics.world.setBounds(0, 0, PLAYGROUND_CONFIG.mapWidth, PLAYGROUND_CONFIG.mapHeight);
    this.physics.world.setBoundsCollision(true, true, true, true);

    this.wallGroup = this.physics.add.staticGroup();
    this.createWalls();

    this.player = this.physics.add.sprite(
      PLAYGROUND_CONFIG.mapWidth / 2,
      PLAYGROUND_CONFIG.floorY - 40,
      SPRITE_CONFIG.key,
      0
    );

    this.player.setOrigin(0.5, 0.75);
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(52, 52);
    this.player.setDisplaySize(72, 72);

    const frameCount = this.textures.exists(SPRITE_CONFIG.key)
      ? this.textures.get(SPRITE_CONFIG.key).frameTotal
      : 1;
    this.hasIdle = false;
    this.hasWalk = false;

    if (frameCount > 1) {
      this.anims.create({
        key: "idle",
        frames: this.anims.generateFrameNumbers(SPRITE_CONFIG.key, {
          start: 0,
          end: Math.min(3, frameCount - 1)
        }),
        frameRate: 4,
        repeat: -1
      });
      this.hasIdle = true;

      this.anims.create({
        key: "walk",
        frames: this.anims.generateFrameNumbers(SPRITE_CONFIG.key, {
          start: 4,
          end: Math.min(frameCount - 1, 9)
        }),
        frameRate: 10,
        repeat: -1
      });
      this.hasWalk = true;
    }

    this.physics.add.collider(this.player, this.wallGroup);
    this.cursors = this.input.keyboard.createCursorKeys();

    this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);

    this.physics.world.setBounds(0, 0, PLAYGROUND_CONFIG.mapWidth, PLAYGROUND_CONFIG.mapHeight);
    this.cameras.main.setBounds(0, 0, PLAYGROUND_CONFIG.mapWidth, PLAYGROUND_CONFIG.mapHeight);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.35);

    this.cameras.main.setRoundPixels(true);

    if (status) {
      status.textContent = "Sprite playground loaded. Move with WASD / arrow keys.";
    }
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
    this.makeWall(worldW * 0.16, worldH * 0.60, 18, 360);
  }

  makeWall(x, y, width, height) {
    const wall = this.add.rectangle(x, y, width, height, PLAYGROUND_CONFIG.wallColor);
    wall.setStrokeStyle(2, 0x8ea7ba);
    this.physics.add.existing(wall, true);
    this.wallGroup.add(wall);
    return wall;
  }

  update() {
    const velocity = PLAYGROUND_CONFIG.playerSpeed;
    const left = this.cursors.left.isDown || this.keyA.isDown;
    const right = this.cursors.right.isDown || this.keyD.isDown;
    const up = this.cursors.up.isDown || this.keyW.isDown;
    const down = this.cursors.down.isDown || this.keyS.isDown;

    let vx = 0;
    let vy = 0;

    if (left) vx = -velocity;
    if (right) vx = velocity;
    if (up) vy = -velocity;
    if (down) vy = velocity;

    if (vx !== 0 && vy !== 0) {
      vx *= Math.SQRT1_2;
      vy *= Math.SQRT1_2;
    }

    this.player.setVelocity(vx, vy);

    if (vx !== 0 || vy !== 0) {
      if (this.hasWalk) {
        this.player.play("walk", true);
      }
      this.player.rotation = Math.atan2(vy, vx) + Math.PI / 2;
    } else {
      if (this.hasIdle) {
        this.player.play("idle", true);
      } else {
        this.player.setFrame(0);
      }
      this.player.setVelocity(0, 0);
      this.player.rotation = 0;
    }
  }
}
