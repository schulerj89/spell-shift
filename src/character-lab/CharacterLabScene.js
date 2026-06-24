import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { HeroCharacter } from "./HeroCharacter.js";
import { InputController } from "./InputController.js";

const DEFAULT_CAMERA_SETTINGS = {
  distance: 4.8,
  height: 2.3,
  targetHeight: 1.1,
  sideOffset: 0
};
const DEFAULT_JUMP_SETTINGS = {
  launchDelayMs: 0,
  force: 4.8,
  gravity: 13,
  radius: 0.35,
  height: 1.7,
  groundOffset: 0,
  airFootLift: 0
};
const DEFAULT_RUN_JUMP_SETTINGS = {
  launchDelayMs: 0,
  force: 3.8,
  gravity: 18,
  forwardSpeed: 4.5,
  airFootLift: 0.4
};
const MOVE_SPEED = 2.8;
const TURN_SPEED = 12;
const LOOK_SENSITIVITY = 0.005;
const MIN_CAMERA_PITCH = 0.12;
const MAX_CAMERA_PITCH = 0.95;

export class CharacterLabScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x151817);
    this.scene.fog = new THREE.Fog(0x151817, 12, 34);

    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.set(0, 2.2, 5.5);

    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.target.set(0, 1, 0);
    this.controls.enableDamping = true;
    this.controls.maxPolarAngle = Math.PI * 0.48;
    this.controls.minDistance = 2.2;
    this.controls.maxDistance = 12;

    this.clock = new THREE.Clock();
    this.input = new InputController();
    this.hero = null;
    this.followCamera = true;
    this.followCameraYaw = 0;
    this.isPointerLooking = false;
    this.cameraSettings = { ...DEFAULT_CAMERA_SETTINGS };
    this.jumpSettings = { ...DEFAULT_JUMP_SETTINGS };
    this.runJumpSettings = { ...DEFAULT_RUN_JUMP_SETTINGS };
    this.activeJumpSettings = this.jumpSettings;
    this.activeJumpType = "standing";
    this.pendingJumpLaunchSeconds = null;
    this.verticalVelocity = 0;
    this.jumpHorizontalVelocity = new THREE.Vector3();
    this.jumpLaunchDirection = new THREE.Vector3();
    this.currentMoveDirection = new THREE.Vector3();
    this.isGrounded = true;
    this.isMovingForJump = false;
    this.animationFrameId = null;

    this.helpers = {
      grid: new THREE.GridHelper(18, 18, 0x8fd4bb, 0x3d514b),
      axes: new THREE.AxesHelper(1.4),
      skeleton: null,
      bounds: null,
      jumpHitbox: null
    };

    this.statusEl = document.querySelector("#load-status");
    this.animationButtonsEl = document.querySelector("#animation-buttons");
    this.currentAnimationEl = document.querySelector("#current-animation");
    this.visualBounds = new THREE.Box3();
    this.visualCenter = new THREE.Vector3();

    this.boundAnimate = this.animate.bind(this);
    this.boundResize = this.resize.bind(this);
    this.boundPointerDown = this.handlePointerDown.bind(this);
    this.boundPointerMove = this.handlePointerMove.bind(this);
    this.boundPointerUp = this.handlePointerUp.bind(this);
  }

  async start() {
    this.createEnvironment();
    this.bindDebugControls();

    const loadingManager = new THREE.LoadingManager();
    loadingManager.onProgress = (url, loaded, total) => {
      console.info(`[CharacterTestLab] Loading ${loaded}/${total}: ${url}`);
    };
    loadingManager.onError = (url) => {
      console.error(`[CharacterTestLab] Failed to load ${url}`);
      this.setStatus(`Failed to load ${url}`);
    };

    this.hero = new HeroCharacter({
      loadingManager,
      onStatusChange: (message) => this.setStatus(message),
      onAnimationsChanged: (clips) => this.renderAnimationButtons(clips),
      onCurrentAnimationChanged: (clip) => this.setCurrentAnimation(clip)
    });

    await this.hero.load();
    this.scene.add(this.hero.root);
    this.createCharacterHelpers();
    this.controls.target.copy(this.hero.root.position).add(new THREE.Vector3(0, 1, 0));

    window.addEventListener("resize", this.boundResize);
    window.addEventListener("keydown", (event) => this.handleAnimationShortcut(event));
    this.canvas.addEventListener("pointerdown", this.boundPointerDown);
    this.canvas.addEventListener("pointermove", this.boundPointerMove);
    this.canvas.addEventListener("pointerup", this.boundPointerUp);
    this.canvas.addEventListener("pointercancel", this.boundPointerUp);

    this.animate();
  }

  createEnvironment() {
    const hemiLight = new THREE.HemisphereLight(0xddeee6, 0x343027, 1.6);
    this.scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff1cf, 3.2);
    keyLight.position.set(4, 8, 4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 30;
    keyLight.shadow.camera.left = -8;
    keyLight.shadow.camera.right = 8;
    keyLight.shadow.camera.top = 8;
    keyLight.shadow.camera.bottom = -8;
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x8fb8ff, 0.9);
    fillLight.position.set(-5, 3, -5);
    this.scene.add(fillLight);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 18),
      new THREE.MeshStandardMaterial({
        color: 0x3b473f,
        roughness: 0.82,
        metalness: 0.02
      })
    );
    ground.name = "CharacterLabGround";
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    this.helpers.grid.name = "CharacterLabGrid";
    this.helpers.axes.name = "CharacterLabAxes";
    this.helpers.axes.visible = false;
    this.scene.add(this.helpers.grid);
    this.scene.add(this.helpers.axes);
  }

  createCharacterHelpers() {
    this.helpers.skeleton = new THREE.SkeletonHelper(this.hero.baseScene);
    this.helpers.skeleton.name = "HeroSkeletonHelper";
    this.helpers.skeleton.visible = false;
    this.scene.add(this.helpers.skeleton);

    this.helpers.bounds = new THREE.BoxHelper(this.hero.root, 0x96d2bb);
    this.helpers.bounds.name = "HeroBoundsHelper";
    this.scene.add(this.helpers.bounds);

    this.createJumpHitboxHelper();
  }

  bindDebugControls() {
    this.bindCheckbox("#toggle-skeleton", (checked) => {
      if (this.helpers.skeleton) this.helpers.skeleton.visible = checked;
    });
    this.bindCheckbox("#toggle-bounds", (checked) => {
      if (this.helpers.bounds) this.helpers.bounds.visible = checked;
    });
    this.bindCheckbox("#toggle-grid", (checked) => {
      this.helpers.grid.visible = checked;
    });
    this.bindCheckbox("#toggle-axes", (checked) => {
      this.helpers.axes.visible = checked;
    });
    this.bindCheckbox("#toggle-jump-hitbox", (checked) => {
      if (this.helpers.jumpHitbox) this.helpers.jumpHitbox.visible = checked;
    });
    this.bindCheckbox("#toggle-follow-camera", (checked) => {
      this.followCamera = checked;
      this.controls.enabled = !checked;
      if (checked) {
        this.syncFollowAnglesFromCamera();
      }
    });

    this.controls.enabled = !this.followCamera;
    this.bindCameraControls();
    this.bindJumpControls();
    this.bindRunJumpControls();
  }

  bindCheckbox(selector, onChange) {
    const input = document.querySelector(selector);
    if (!input) return;
    input.addEventListener("change", () => onChange(input.checked));
  }

  bindCameraControls() {
    this.bindRange("#camera-distance", "#camera-distance-value", this.cameraSettings, "distance");
    this.bindRange("#camera-height", "#camera-height-value", this.cameraSettings, "height");
    this.bindRange("#camera-target", "#camera-target-value", this.cameraSettings, "targetHeight");
    this.bindRange("#camera-side", "#camera-side-value", this.cameraSettings, "sideOffset");

    document.querySelector("#reset-follow-camera")?.addEventListener("click", () => {
      this.cameraSettings = { ...DEFAULT_CAMERA_SETTINGS };
      this.syncCameraControlValues();
      this.resetFollowCameraBehindCharacter();
    });

    this.syncCameraControlValues();
  }

  bindJumpControls() {
    this.bindRange("#jump-delay", "#jump-delay-value", this.jumpSettings, "launchDelayMs", {
      format: (value) => `${Math.round(value)}ms`
    });
    this.bindRange("#jump-force", "#jump-force-value", this.jumpSettings, "force");
    this.bindRange("#jump-gravity", "#jump-gravity-value", this.jumpSettings, "gravity");
    this.bindRange("#jump-radius", "#jump-radius-value", this.jumpSettings, "radius", {
      decimals: 2,
      onInput: () => this.rebuildJumpHitbox()
    });
    this.bindRange("#jump-height", "#jump-height-value", this.jumpSettings, "height", {
      decimals: 2,
      onInput: () => this.rebuildJumpHitbox()
    });
    this.bindRange("#jump-ground", "#jump-ground-value", this.jumpSettings, "groundOffset", {
      decimals: 2,
      onInput: () => {
        if (this.hero && this.isGrounded && this.pendingJumpLaunchSeconds === null) {
          this.hero.root.position.y = this.jumpSettings.groundOffset;
        }
        this.updateJumpHitbox();
      }
    });
    this.bindRange("#jump-air-foot-lift", "#jump-air-foot-lift-value", this.jumpSettings, "airFootLift", {
      decimals: 2,
      onInput: () => this.updateJumpHitbox()
    });
  }

  bindRunJumpControls() {
    this.bindRange("#run-jump-delay", "#run-jump-delay-value", this.runJumpSettings, "launchDelayMs", {
      format: (value) => `${Math.round(value)}ms`
    });
    this.bindRange("#run-jump-force", "#run-jump-force-value", this.runJumpSettings, "force");
    this.bindRange("#run-jump-gravity", "#run-jump-gravity-value", this.runJumpSettings, "gravity");
    this.bindRange(
      "#run-jump-forward-speed",
      "#run-jump-forward-speed-value",
      this.runJumpSettings,
      "forwardSpeed"
    );
    this.bindRange(
      "#run-jump-air-foot-lift",
      "#run-jump-air-foot-lift-value",
      this.runJumpSettings,
      "airFootLift",
      {
        decimals: 2,
        onInput: () => this.updateJumpHitbox()
      }
    );
  }

  bindRange(inputSelector, valueSelector, settings, settingKey, options = {}) {
    const input = document.querySelector(inputSelector);
    const value = document.querySelector(valueSelector);
    if (!input) return;

    const update = () => {
      settings[settingKey] = Number(input.value);
      if (value) {
        value.textContent =
          options.format?.(Number(input.value)) ?? Number(input.value).toFixed(options.decimals ?? 1);
      }
      options.onInput?.();
    };

    input.addEventListener("input", update);
    update();
  }

  syncCameraControlValues() {
    const controls = [
      ["#camera-distance", "#camera-distance-value", "distance"],
      ["#camera-height", "#camera-height-value", "height"],
      ["#camera-target", "#camera-target-value", "targetHeight"],
      ["#camera-side", "#camera-side-value", "sideOffset"]
    ];

    controls.forEach(([inputSelector, valueSelector, settingKey]) => {
      const input = document.querySelector(inputSelector);
      const value = document.querySelector(valueSelector);
      if (!input) return;
      input.value = String(this.cameraSettings[settingKey]);
      if (value) value.textContent = this.cameraSettings[settingKey].toFixed(1);
    });
  }

  createJumpHitboxHelper() {
    this.helpers.jumpHitbox = this.buildJumpHitboxMesh();
    this.helpers.jumpHitbox.name = "HeroJumpHitboxHelper";
    this.scene.add(this.helpers.jumpHitbox);
    this.updateJumpHitbox();
  }

  buildJumpHitboxMesh() {
    const geometry = this.buildJumpHitboxGeometry();
    const material = new THREE.MeshBasicMaterial({
      color: 0xf6d365,
      wireframe: true,
      transparent: true,
      opacity: 0.72,
      depthWrite: false
    });

    return new THREE.Mesh(geometry, material);
  }

  buildJumpHitboxGeometry() {
    return new THREE.CylinderGeometry(
      this.jumpSettings.radius,
      this.jumpSettings.radius,
      this.jumpSettings.height,
      20,
      1,
      true
    );
  }

  rebuildJumpHitbox() {
    if (!this.helpers.jumpHitbox) return;

    const wasVisible = this.helpers.jumpHitbox.visible;
    this.helpers.jumpHitbox.geometry.dispose();
    this.helpers.jumpHitbox.geometry = this.buildJumpHitboxGeometry();
    this.helpers.jumpHitbox.visible = wasVisible;
    this.updateJumpHitbox();
  }

  renderAnimationButtons(clips) {
    if (!this.animationButtonsEl) return;

    this.animationButtonsEl.innerHTML = "";
    clips.forEach((clip, index) => {
      const button = document.createElement("button");
      button.className = "animation-button";
      button.type = "button";
      button.dataset.animationId = clip.id;
      button.textContent = `${index + 1}. ${clip.label}`;
      button.addEventListener("click", () => this.hero.playPreviewAnimation(clip.id));
      this.animationButtonsEl.append(button);
    });
  }

  setCurrentAnimation(clip) {
    if (this.currentAnimationEl) {
      this.currentAnimationEl.textContent = clip?.label ?? "None";
    }

    document.querySelectorAll(".animation-button").forEach((button) => {
      button.classList.toggle("active", button.dataset.animationId === clip?.id);
    });
  }

  setStatus(message) {
    console.info(`[CharacterTestLab] ${message}`);
    if (this.statusEl) {
      this.statusEl.textContent = message;
    }
  }

  handleAnimationShortcut(event) {
    if (!this.hero || event.altKey || event.ctrlKey || event.metaKey) return;
    if (!/^Digit\d$/.test(event.code)) return;

    const index = Number(event.code.replace("Digit", "")) - 1;
    const clip = this.hero.clips[index];
    if (clip) {
      this.hero.playPreviewAnimation(clip.id);
    }
  }

  handlePointerDown(event) {
    if (!this.followCamera || event.button !== 0) return;

    this.isPointerLooking = true;
    this.canvas.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  handlePointerMove(event) {
    if (!this.isPointerLooking || !this.followCamera) return;

    this.followCameraYaw -= event.movementX * LOOK_SENSITIVITY;
    this.cameraSettings.height = THREE.MathUtils.clamp(
      this.cameraSettings.height + event.movementY * LOOK_SENSITIVITY * 7,
      MIN_CAMERA_PITCH * this.cameraSettings.distance,
      MAX_CAMERA_PITCH * this.cameraSettings.distance
    );
    this.syncCameraControlValues();
  }

  handlePointerUp(event) {
    if (!this.isPointerLooking) return;

    this.isPointerLooking = false;
    if (this.canvas.hasPointerCapture(event.pointerId)) {
      this.canvas.releasePointerCapture(event.pointerId);
    }
  }

  animate() {
    this.animationFrameId = window.requestAnimationFrame(this.boundAnimate);
    const delta = Math.min(this.clock.getDelta(), 0.05);

    this.updateMovement(delta);
    this.hero?.update(delta);
    this.updateBoundsHelper();
    this.updateJumpHitbox();
    this.updateCamera(delta);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  updateMovement(delta) {
    if (!this.hero) return;

    const moveInput = this.input.getMovementVector();
    const inputLength = Math.hypot(moveInput.x, moveInput.z);
    const isMoving = inputLength > 0;
    this.isMovingForJump = isMoving;

    if (isMoving) {
      this.hero.clearManualPreview();
      const cameraForward = new THREE.Vector3();
      this.camera.getWorldDirection(cameraForward);
      cameraForward.y = 0;
      cameraForward.normalize();

      const cameraRight = new THREE.Vector3().crossVectors(cameraForward, this.camera.up).normalize();
      const direction = new THREE.Vector3()
        .addScaledVector(cameraRight, moveInput.x / inputLength)
        .addScaledVector(cameraForward, -moveInput.z / inputLength)
        .normalize();

      this.currentMoveDirection.copy(direction);

      if (!this.isRunJumpInAir()) {
        this.hero.root.position.addScaledVector(direction, MOVE_SPEED * delta);
      }

      const targetRotation = Math.atan2(direction.x, direction.z);
      this.hero.root.rotation.y = lerpAngle(
        this.hero.root.rotation.y,
        targetRotation,
        Math.min(1, TURN_SPEED * delta)
      );
    } else {
      this.currentMoveDirection.set(0, 0, 0);
    }

    if (this.input.consumeJumpPressed()) {
      this.requestJump();
    }

    this.updateJump(delta);
    this.hero.playLocomotion(isMoving);
  }

  requestJump() {
    if (!this.hero || !this.isGrounded || this.pendingJumpLaunchSeconds !== null) return;
    const moving = this.isMovingForJump;
    if (!this.hero.playJumpIfAvailable({ moving })) return;

    this.activeJumpType = moving ? "run" : "standing";
    this.activeJumpSettings = moving ? this.runJumpSettings : this.jumpSettings;
    this.isGrounded = false;
    this.verticalVelocity = 0;
    this.jumpHorizontalVelocity.set(0, 0, 0);
    this.jumpLaunchDirection.copy(this.currentMoveDirection);
    this.pendingJumpLaunchSeconds = this.activeJumpSettings.launchDelayMs / 1000;

    if (this.pendingJumpLaunchSeconds <= 0) {
      this.launchJump();
    }
  }

  launchJump() {
    this.pendingJumpLaunchSeconds = null;
    this.verticalVelocity = this.activeJumpSettings.force;

    if (this.activeJumpType === "run") {
      const launchDirection = this.jumpLaunchDirection.lengthSq() > 0
        ? this.jumpLaunchDirection
        : new THREE.Vector3(Math.sin(this.hero.root.rotation.y), 0, Math.cos(this.hero.root.rotation.y));
      this.jumpHorizontalVelocity.copy(launchDirection).multiplyScalar(this.runJumpSettings.forwardSpeed);
    }
  }

  updateJump(delta) {
    if (!this.hero || this.isGrounded) return;

    if (this.pendingJumpLaunchSeconds !== null) {
      this.pendingJumpLaunchSeconds -= delta;
      if (this.pendingJumpLaunchSeconds <= 0) {
        this.launchJump();
      }
      return;
    }

    this.verticalVelocity -= this.activeJumpSettings.gravity * delta;
    this.hero.root.position.addScaledVector(this.jumpHorizontalVelocity, delta);
    this.hero.root.position.y += this.verticalVelocity * delta;

    if (this.hero.root.position.y <= this.jumpSettings.groundOffset) {
      this.hero.root.position.y = this.jumpSettings.groundOffset;
      this.verticalVelocity = 0;
      this.jumpHorizontalVelocity.set(0, 0, 0);
      this.jumpLaunchDirection.set(0, 0, 0);
      this.isGrounded = true;
      this.pendingJumpLaunchSeconds = null;
      this.activeJumpType = "standing";
      this.activeJumpSettings = this.jumpSettings;
    }
  }

  updateCamera(delta) {
    if (!this.hero || !this.followCamera) return;

    const desiredOffset = this.getFollowCameraOffset();
    const desiredPosition = this.hero.root.position.clone().add(desiredOffset);
    const desiredTarget = this.hero.root.position
      .clone()
      .add(new THREE.Vector3(0, this.cameraSettings.targetHeight, 0));

    this.camera.position.lerp(desiredPosition, Math.min(1, delta * 5));
    this.controls.target.lerp(desiredTarget, Math.min(1, delta * 8));
  }

  getFollowCameraOffset() {
    const forwardBack = new THREE.Vector3(
      Math.sin(this.followCameraYaw) * this.cameraSettings.distance,
      0,
      Math.cos(this.followCameraYaw) * this.cameraSettings.distance
    );
    const side = new THREE.Vector3(
      Math.cos(this.followCameraYaw) * this.cameraSettings.sideOffset,
      0,
      -Math.sin(this.followCameraYaw) * this.cameraSettings.sideOffset
    );

    return forwardBack.add(side).add(new THREE.Vector3(0, this.cameraSettings.height, 0));
  }

  syncFollowAnglesFromCamera() {
    if (!this.hero) return;

    const target = this.hero.root.position
      .clone()
      .add(new THREE.Vector3(0, this.cameraSettings.targetHeight, 0));
    const offset = this.camera.position.clone().sub(target);

    this.followCameraYaw = Math.atan2(offset.x, offset.z);
    this.cameraSettings.distance = THREE.MathUtils.clamp(Math.hypot(offset.x, offset.z), 2.5, 9);
    this.cameraSettings.height = THREE.MathUtils.clamp(offset.y, 0.7, 5);
    this.syncCameraControlValues();
  }

  resetFollowCameraBehindCharacter() {
    if (!this.hero) return;

    this.followCameraYaw = this.hero.root.rotation.y + Math.PI;
    const desiredTarget = this.hero.root.position
      .clone()
      .add(new THREE.Vector3(0, this.cameraSettings.targetHeight, 0));

    this.camera.position.copy(this.hero.root.position).add(this.getFollowCameraOffset());
    this.controls.target.copy(desiredTarget);
  }

  updateJumpHitbox() {
    if (!this.hero || !this.helpers.jumpHitbox) return;
    const visualAnchor = this.getHeroVisualAnchor();

    this.helpers.jumpHitbox.position.set(
      visualAnchor.x,
      visualAnchor.y + this.getActiveJumpHitboxFloorOffset() + this.jumpSettings.height * 0.5,
      visualAnchor.z
    );
  }

  updateBoundsHelper() {
    if (!this.hero || !this.helpers.bounds) return;
    this.helpers.bounds.setFromObject(this.hero.baseScene ?? this.hero.root);
  }

  getHeroVisualAnchor() {
    const target = this.hero.baseScene ?? this.hero.root;
    this.visualBounds.setFromObject(target);

    if (this.visualBounds.isEmpty()) {
      return this.hero.root.position;
    }

    this.visualBounds.getCenter(this.visualCenter);
    this.visualCenter.y = this.visualBounds.min.y;
    return this.visualCenter;
  }

  getActiveJumpHitboxFloorOffset() {
    if (this.isGrounded || this.pendingJumpLaunchSeconds !== null) {
      return 0;
    }

    return this.activeJumpSettings.airFootLift ?? 0;
  }

  isRunJumpInAir() {
    return this.activeJumpType === "run" && !this.isGrounded;
  }

  resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

function lerpAngle(from, to, alpha) {
  const wrappedDelta = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + wrappedDelta * alpha;
}
