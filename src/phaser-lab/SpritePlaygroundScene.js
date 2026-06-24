import Phaser from "phaser";

const HERO_IDLE_FRAMES = Array.from({ length: 8 }, (_unused, index) => {
  const paddedIndex = String(index).padStart(3, "0");

  return {
    key: `hero-idle-frame-${paddedIndex}`,
    path: `/assets/sprites/frames/frame_${paddedIndex}.png`
  };
});

const SPRITE_SETS = [
  {
    key: "hero-idle-frames",
    frames: HERO_IDLE_FRAMES,
    label: "Hero idle frame sequence"
  }
];

const DEFAULT_IDLE_FRAME_INDEXES = [0, 1, 2, 3, 4, 7];
const DEFAULT_IDLE_FPS = 12;

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
    this.playerConfig = SPRITE_SETS[this.activeSpriteIndex];
    this.hud = null;
    this.currentSheetText = null;
    this.inspector = null;
    this.frameSlider = null;
    this.frameReadout = null;
    this.loopReadout = null;
    this.playButton = null;
    this.frameButtons = [];
    this.frameToggles = [];
    this.hasIdle = false;
    this.hasWalk = false;
    this.isPlaying = true;
    this.frameRate = DEFAULT_IDLE_FPS;
    this.currentFrameIndex = 0;
    this.frameCount = 0;
    this.activeFrameIndexes = DEFAULT_IDLE_FRAME_INDEXES;
  }

  preload() {
    SPRITE_SETS.forEach((cfg) => {
      cfg.frames.forEach((frame) => {
        this.load.image(frame.key, frame.path);
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
      this.playerConfig.frames[0].key
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
    this.applyCurrentSheetMessage();
    this.createAnimationInspector();
    this.playIdleAnimation();

    this.player.on("animationupdate", (_animation, frame) => {
      const frameIndex = this.playerConfig.frames.findIndex((candidate) => candidate.key === frame.textureKey);
      this.setInspectorFrame(frameIndex >= 0 ? frameIndex : 0, false);
    });

    this.cameras.main.setBounds(0, 0, PLAYGROUND_CONFIG.mapWidth, PLAYGROUND_CONFIG.mapHeight);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(1);
    this.cameras.main.setRoundPixels(true);

    if (status) {
      status.textContent = "Sprite playground loaded. Idle animation only.";
    }
  }

  resolveSheetGrid(cfg) {
    const sourceTexture = this.textures.get(cfg.frames[0].key);
    const sourceImage = sourceTexture?.source?.[0];
    const imageWidth = sourceImage?.width ?? 0;
    const imageHeight = sourceImage?.height ?? 0;

    if (imageWidth === 0 || imageHeight === 0) {
      return null;
    }

    console.log(`[sprite-frames] ${cfg.label} loaded frame size ${imageWidth}x${imageHeight}`);

    return {
      frameWidth: imageWidth,
      frameHeight: imageHeight,
      sourceWidth: imageWidth,
      sourceHeight: imageHeight,
      resolvedCols: 4,
      resolvedRows: 2
    };
  }

  bootstrapSpriteSheets() {
    SPRITE_SETS.forEach((cfg) => {
      const sourceTexture = this.textures.get(cfg.frames[0].key);
      const layout = this.resolveSheetGrid(cfg);

      if (!sourceTexture || !layout) {
        return;
      }

      cfg._frameWidth = layout.frameWidth;
      cfg._frameHeight = layout.frameHeight;
      cfg._frameColumns = layout.resolvedCols;
      cfg._frameRows = layout.resolvedRows;
      cfg._frameCount = cfg.frames.length;

      console.log(
        `[sprite-frames] ${cfg.label}: ${cfg._frameCount} frames, frame=${cfg._frameWidth}x${cfg._frameHeight}`
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
    const frameCount = config.frames.length;
    const activeFrames = this.getActiveFrames();

    this.hasIdle = frameCount > 0;
    this.hasWalk = false;
    this.frameCount = frameCount;

    const idleKey = `idle-${config.key}`;

    if (this.anims.exists(idleKey)) {
      this.anims.remove(idleKey);
    }

    this.anims.create({
      key: idleKey,
      frames: activeFrames.map((frameIndex) => ({ key: config.frames[frameIndex].key })),
      frameRate: this.frameRate,
      repeat: -1,
      skipMissedFrames: true
    });
  }

  getActiveFrames() {
    if (this.activeFrameIndexes.length === 0) {
      return [0];
    }

    return [...this.activeFrameIndexes].sort((a, b) => a - b);
  }

  rebuildIdleAnimation() {
    const wasPlaying = this.isPlaying;

    this.player.anims.stop();
    this.setupAnimations(this.playerConfig);
    this.updateLoopReadout();

    if (!this.activeFrameIndexes.includes(this.currentFrameIndex)) {
      this.showFrame(this.getActiveFrames()[0]);
    }

    if (wasPlaying) {
      this.playIdleAnimation();
    } else {
      this.pauseIdleAnimation();
      this.showFrame(this.currentFrameIndex);
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

  createAnimationInspector() {
    if (!this.hud) return;

    this.inspector = document.createElement("section");
    this.inspector.className = "animation-inspector";
    this.inspector.setAttribute("aria-label", "Sprite animation inspector");

    const controls = document.createElement("div");
    controls.className = "inspector-controls";

    this.playButton = document.createElement("button");
    this.playButton.type = "button";
    this.playButton.textContent = "Pause";
    this.playButton.addEventListener("click", () => {
      if (this.isPlaying) {
        this.pauseIdleAnimation();
      } else {
        this.playIdleAnimation();
      }
    });

    const prevButton = document.createElement("button");
    prevButton.type = "button";
    prevButton.textContent = "Prev";
    prevButton.addEventListener("click", () => this.stepFrame(-1));

    const nextButton = document.createElement("button");
    nextButton.type = "button";
    nextButton.textContent = "Next";
    nextButton.addEventListener("click", () => this.stepFrame(1));

    controls.append(this.playButton, prevButton, nextButton);

    const frameRow = document.createElement("label");
    frameRow.className = "inspector-row";
    frameRow.textContent = "Frame";

    this.frameSlider = document.createElement("input");
    this.frameSlider.type = "range";
    this.frameSlider.min = "0";
    this.frameSlider.max = String(Math.max(0, this.frameCount - 1));
    this.frameSlider.step = "1";
    this.frameSlider.value = "0";
    this.frameSlider.addEventListener("input", () => {
      this.pauseIdleAnimation();
      this.showFrame(Number(this.frameSlider.value));
    });

    this.frameReadout = document.createElement("span");
    this.frameReadout.className = "frame-readout";

    frameRow.append(this.frameSlider, this.frameReadout);

    const fpsRow = document.createElement("label");
    fpsRow.className = "inspector-row";
    fpsRow.textContent = "FPS";

    const fpsSlider = document.createElement("input");
    fpsSlider.type = "range";
    fpsSlider.min = "1";
    fpsSlider.max = "16";
    fpsSlider.step = "1";
    fpsSlider.value = String(this.frameRate);

    const fpsReadout = document.createElement("span");
    fpsReadout.className = "frame-readout";
    fpsReadout.textContent = String(this.frameRate);

    fpsSlider.addEventListener("input", () => {
      this.frameRate = Number(fpsSlider.value);
      fpsReadout.textContent = String(this.frameRate);
      this.rebuildIdleAnimation();
    });

    fpsRow.append(fpsSlider, fpsReadout);

    this.loopReadout = document.createElement("p");
    this.loopReadout.className = "loop-readout";

    const strip = document.createElement("div");
    strip.className = "frame-strip";

    this.frameButtons = Array.from({ length: this.frameCount }, (_unused, index) => {
      const cell = document.createElement("div");
      const button = document.createElement("button");
      const toggleLabel = document.createElement("label");
      const toggle = document.createElement("input");

      cell.className = "frame-cell";
      button.type = "button";
      button.className = "frame-thumb";
      button.title = `Frame ${index}`;
      button.textContent = String(index);
      button.style.backgroundImage = `url("${this.playerConfig.frames[index].path}")`;
      button.style.backgroundSize = "contain";
      button.style.backgroundPosition = "center";
      button.addEventListener("click", () => {
        this.pauseIdleAnimation();
        this.showFrame(index);
      });

      toggle.type = "checkbox";
      toggle.checked = this.activeFrameIndexes.includes(index);
      toggle.addEventListener("change", () => {
        this.setFrameIncluded(index, toggle.checked);
      });

      toggleLabel.className = "frame-toggle";
      toggleLabel.append(toggle, document.createTextNode("Use"));

      cell.append(button, toggleLabel);
      strip.appendChild(cell);
      this.frameToggles[index] = toggle;
      return button;
    });

    const utilityControls = document.createElement("div");
    utilityControls.className = "inspector-controls compact";

    const defaultButton = document.createElement("button");
    defaultButton.type = "button";
    defaultButton.textContent = "Default";
    defaultButton.addEventListener("click", () => {
      this.activeFrameIndexes = DEFAULT_IDLE_FRAME_INDEXES;
      this.frameRate = DEFAULT_IDLE_FPS;
      fpsSlider.value = String(DEFAULT_IDLE_FPS);
      fpsReadout.textContent = String(DEFAULT_IDLE_FPS);
      this.syncFrameToggles();
      this.rebuildIdleAnimation();
    });

    const allButton = document.createElement("button");
    allButton.type = "button";
    allButton.textContent = "All";
    allButton.addEventListener("click", () => this.setAllFramesIncluded(true));

    const oddEvenButton = document.createElement("button");
    oddEvenButton.type = "button";
    oddEvenButton.textContent = "Every Other";
    oddEvenButton.addEventListener("click", () => {
      this.activeFrameIndexes = this.playerConfig.frames
        .map((_frame, index) => index)
        .filter((index) => index % 2 === 0);
      this.syncFrameToggles();
      this.rebuildIdleAnimation();
    });

    const clearButton = document.createElement("button");
    clearButton.type = "button";
    clearButton.textContent = "First";
    clearButton.addEventListener("click", () => {
      this.activeFrameIndexes = [0];
      this.syncFrameToggles();
      this.rebuildIdleAnimation();
    });

    utilityControls.append(defaultButton, allButton, oddEvenButton, clearButton);

    this.inspector.append(controls, frameRow, fpsRow, this.loopReadout, utilityControls, strip);
    this.hud.appendChild(this.inspector);
    this.setInspectorFrame(0, false);
    this.updateLoopReadout();
  }

  setFrameIncluded(index, included) {
    const nextFrames = new Set(this.activeFrameIndexes);

    if (included) {
      nextFrames.add(index);
    } else if (nextFrames.size > 1) {
      nextFrames.delete(index);
    } else {
      this.frameToggles[index].checked = true;
      return;
    }

    this.activeFrameIndexes = [...nextFrames].sort((a, b) => a - b);
    this.syncFrameToggles();
    this.rebuildIdleAnimation();
  }

  setAllFramesIncluded(included) {
    if (included) {
      this.activeFrameIndexes = this.playerConfig.frames.map((_frame, index) => index);
    } else {
      this.activeFrameIndexes = [0];
    }

    this.syncFrameToggles();
    this.rebuildIdleAnimation();
  }

  syncFrameToggles() {
    this.frameToggles.forEach((toggle, index) => {
      if (toggle) {
        toggle.checked = this.activeFrameIndexes.includes(index);
      }
    });
  }

  updateLoopReadout() {
    if (!this.loopReadout) return;

    this.loopReadout.textContent = `Loop frames: ${this.getActiveFrames().join(", ")}`;
    this.frameButtons.forEach((button, frameIndex) => {
      button.classList.toggle("included", this.activeFrameIndexes.includes(frameIndex));
      button.classList.toggle("excluded", !this.activeFrameIndexes.includes(frameIndex));
    });
  }

  playIdleAnimation() {
    if (!this.hasIdle || !this.anims.exists(this.currentlyActiveIdleAnim)) {
      this.player.setFrame(0);
      return;
    }

    this.isPlaying = true;
    if (this.playButton) this.playButton.textContent = "Pause";
    this.player.play(this.currentlyActiveIdleAnim, false);
    this.player.anims.resume();
  }

  pauseIdleAnimation() {
    this.isPlaying = false;
    if (this.playButton) this.playButton.textContent = "Play";
    this.player.anims.pause();
  }

  stepFrame(direction) {
    this.pauseIdleAnimation();
    const nextFrame = Phaser.Math.Wrap(this.currentFrameIndex + direction, 0, this.frameCount);
    this.showFrame(nextFrame);
  }

  showFrame(index) {
    const frameIndex = Phaser.Math.Clamp(index, 0, Math.max(0, this.frameCount - 1));
    this.currentFrameIndex = frameIndex;
    this.player.setTexture(this.playerConfig.frames[frameIndex].key);
    this.setInspectorFrame(frameIndex, true);
  }

  setInspectorFrame(index, syncSlider) {
    this.currentFrameIndex = Phaser.Math.Clamp(index, 0, Math.max(0, this.frameCount - 1));

    if (syncSlider && this.frameSlider) {
      this.frameSlider.value = String(this.currentFrameIndex);
    }

    if (this.frameSlider && document.activeElement !== this.frameSlider) {
      this.frameSlider.value = String(this.currentFrameIndex);
    }

    if (this.frameReadout) {
      this.frameReadout.textContent = `${this.currentFrameIndex} / ${Math.max(0, this.frameCount - 1)}`;
    }

    this.frameButtons.forEach((button, frameIndex) => {
      button.classList.toggle("active", frameIndex === this.currentFrameIndex);
      button.classList.toggle("included", this.activeFrameIndexes.includes(frameIndex));
      button.classList.toggle("excluded", !this.activeFrameIndexes.includes(frameIndex));
    });
  }

  update() {
    const status = document.querySelector("#status");
    if (status) {
      const grounded = this.player.body.blocked.down ? "yes" : "no";
      const mode = this.isPlaying ? "playing" : "paused";
      status.textContent = `${this.playerConfig.label} | ${mode} | frame:${this.currentFrameIndex} | grounded:${grounded}`;
    }
  }
}
