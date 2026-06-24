import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { HeroCharacter } from "./HeroCharacter.js";
import { InputController } from "./InputController.js";

const CAMERA_FOLLOW_OFFSET = new THREE.Vector3(0, 2.25, 4.25);
const MOVE_SPEED = 2.8;
const TURN_SPEED = 12;
const JUMP_SPEED = 4.8;
const GRAVITY = 13;
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
    this.followCameraPitch = Math.atan2(CAMERA_FOLLOW_OFFSET.y, CAMERA_FOLLOW_OFFSET.z);
    this.isPointerLooking = false;
    this.verticalVelocity = 0;
    this.isGrounded = true;
    this.animationFrameId = null;

    this.helpers = {
      grid: new THREE.GridHelper(18, 18, 0x8fd4bb, 0x3d514b),
      axes: new THREE.AxesHelper(1.4),
      skeleton: null,
      bounds: null
    };

    this.statusEl = document.querySelector("#load-status");
    this.animationButtonsEl = document.querySelector("#animation-buttons");
    this.currentAnimationEl = document.querySelector("#current-animation");

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
    this.bindCheckbox("#toggle-follow-camera", (checked) => {
      this.followCamera = checked;
      this.controls.enabled = !checked;
      if (checked) {
        this.syncFollowAnglesFromCamera();
      }
    });

    this.controls.enabled = !this.followCamera;
  }

  bindCheckbox(selector, onChange) {
    const input = document.querySelector(selector);
    if (!input) return;
    input.addEventListener("change", () => onChange(input.checked));
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
    this.followCameraPitch = THREE.MathUtils.clamp(
      this.followCameraPitch + event.movementY * LOOK_SENSITIVITY,
      MIN_CAMERA_PITCH,
      MAX_CAMERA_PITCH
    );
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
    this.helpers.bounds?.update();
    this.updateCamera(delta);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  updateMovement(delta) {
    if (!this.hero) return;

    const moveInput = this.input.getMovementVector();
    const inputLength = Math.hypot(moveInput.x, moveInput.z);
    const isMoving = inputLength > 0;

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

      this.hero.root.position.addScaledVector(direction, MOVE_SPEED * delta);

      const targetRotation = Math.atan2(direction.x, direction.z);
      this.hero.root.rotation.y = lerpAngle(
        this.hero.root.rotation.y,
        targetRotation,
        Math.min(1, TURN_SPEED * delta)
      );
    }

    if (this.input.consumeJumpPressed() && this.isGrounded && this.hero.playJumpIfAvailable()) {
      this.verticalVelocity = JUMP_SPEED;
      this.isGrounded = false;
    }

    if (!this.isGrounded) {
      this.verticalVelocity -= GRAVITY * delta;
      this.hero.root.position.y += this.verticalVelocity * delta;

      if (this.hero.root.position.y <= 0) {
        this.hero.root.position.y = 0;
        this.verticalVelocity = 0;
        this.isGrounded = true;
      }
    }

    this.hero.playLocomotion(isMoving);
  }

  updateCamera(delta) {
    if (!this.hero || !this.followCamera) return;

    const followDistance = CAMERA_FOLLOW_OFFSET.length();
    const horizontalDistance = Math.cos(this.followCameraPitch) * followDistance;
    const desiredOffset = new THREE.Vector3(
      Math.sin(this.followCameraYaw) * horizontalDistance,
      Math.sin(this.followCameraPitch) * followDistance,
      Math.cos(this.followCameraYaw) * horizontalDistance
    );
    const desiredPosition = this.hero.root.position.clone().add(desiredOffset);
    const desiredTarget = this.hero.root.position.clone().add(new THREE.Vector3(0, 1.05, 0));

    this.camera.position.lerp(desiredPosition, Math.min(1, delta * 5));
    this.controls.target.lerp(desiredTarget, Math.min(1, delta * 8));
  }

  syncFollowAnglesFromCamera() {
    if (!this.hero) return;

    const target = this.hero.root.position.clone().add(new THREE.Vector3(0, 1.05, 0));
    const offset = this.camera.position.clone().sub(target);
    const horizontalDistance = Math.hypot(offset.x, offset.z);

    this.followCameraYaw = Math.atan2(offset.x, offset.z);
    this.followCameraPitch = THREE.MathUtils.clamp(
      Math.atan2(offset.y, horizontalDistance),
      MIN_CAMERA_PITCH,
      MAX_CAMERA_PITCH
    );
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
