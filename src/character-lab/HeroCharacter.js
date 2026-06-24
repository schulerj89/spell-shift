import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { getBaseHeroAsset, heroCharacterManifest } from "../data/heroCharacterManifest.js";

const HERO_TARGET_HEIGHT = 1.72;

export class HeroCharacter {
  constructor({ loadingManager, onStatusChange, onAnimationsChanged, onCurrentAnimationChanged }) {
    this.loader = new GLTFLoader(loadingManager);
    this.root = new THREE.Group();
    this.root.name = "HeroRoot";
    this.mixer = null;
    this.actions = new Map();
    this.clips = [];
    this.currentAction = null;
    this.currentAnimationId = null;
    this.baseScene = null;
    this.motionLocked = false;
    this.manualPreview = false;
    this.handBone = null;
    this.onStatusChange = onStatusChange;
    this.onAnimationsChanged = onAnimationsChanged;
    this.onCurrentAnimationChanged = onCurrentAnimationChanged;
  }

  async load() {
    const baseAsset = getBaseHeroAsset();

    if (!baseAsset) {
      throw new Error("Hero manifest does not define a valid base asset.");
    }

    this.onStatusChange?.(`Loading ${baseAsset.label}...`);
    const baseGltf = await this.loadBaseBody(baseAsset);

    this.baseScene = baseGltf.scene;
    this.baseScene.name = "HeroBaseBody";
    this.normalizeBaseScene(this.baseScene);
    this.root.add(this.baseScene);
    this.mixer = new THREE.AnimationMixer(this.baseScene);
    this.handBone = this.findHandBone(this.baseScene);

    this.registerClips(baseAsset, baseGltf.animations);
    this.logLoadedModel(baseGltf);

    this.onStatusChange?.("Loading animation clips...");
    const animationAssets = heroCharacterManifest.assets.filter((asset) => asset.id !== baseAsset.id);

    for (const asset of animationAssets) {
      try {
        const gltf = await this.loader.loadAsync(asset.url);
        this.registerClips(asset, gltf.animations);
        console.info(
          `[CharacterTestLab] Loaded animation asset "${asset.label}"`,
          gltf.animations.map((clip) => clip.name)
        );
      } catch (error) {
        console.error(`[CharacterTestLab] Failed to load animation asset "${asset.label}"`, error);
      }
    }

    this.onAnimationsChanged?.(this.clips);
    this.playBestIdle();
    this.onStatusChange?.(`Loaded ${this.clips.length} animation clips.`);
    return this;
  }

  async loadBaseBody(asset = getBaseHeroAsset()) {
    return this.loader.loadAsync(asset.url);
  }

  async attachClothingPiece(_gearAsset) {
    console.info("[CharacterTestLab] Outfit swapping placeholder: attachClothingPiece");
  }

  attachWandToHandBone(wandObject) {
    if (!this.handBone || !wandObject) {
      console.warn("[CharacterTestLab] Wand attachment skipped: no hand bone or wand object.");
      return;
    }

    this.handBone.add(wandObject);
  }

  swapElementalMaterial({ color = 0xffffff, emissive = 0x000000 } = {}) {
    if (!this.baseScene) return;

    this.baseScene.traverse((object) => {
      if (!object.isMesh || !object.material) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => {
        if (material.color) material.color.setHex(color);
        if (material.emissive) material.emissive.setHex(emissive);
      });
    });
  }

  update(delta) {
    this.mixer?.update(delta);
  }

  playBestIdle() {
    const idleClip = this.findClipByText("idle") ?? this.clips[0];
    if (idleClip) {
      this.playAnimation(idleClip.id);
    }
  }

  playLocomotion(isMoving) {
    if (this.motionLocked || this.manualPreview) return;

    const target = isMoving
      ? this.findClipByText("run") ?? this.findClipByText("walk")
      : this.findClipByText("idle");

    if (target && target.id !== this.currentAnimationId) {
      this.playAnimation(target.id);
    }
  }

  playJumpIfAvailable({ moving = false } = {}) {
    const jumpClip = moving
      ? this.findClipByText("jump over obstacle") ?? this.findClipByText("obstacle") ?? this.findClipByText("jump")
      : this.findClipByText("regular jump") ?? this.findClipByText("jump");
    if (!jumpClip) return false;

    this.playAnimation(jumpClip.id, { loopOnce: true, lockMotion: true });
    return true;
  }

  playPreviewAnimation(id) {
    const clipEntry = this.clips.find((clip) => clip.id === id);
    if (!clipEntry) return;

    const loopsForPreview = /idle|walk|run/i.test(clipEntry.label);
    this.playAnimation(id, {
      loopOnce: !loopsForPreview,
      lockMotion: !loopsForPreview,
      manualPreview: loopsForPreview
    });
  }

  clearManualPreview() {
    this.manualPreview = false;
  }

  playAnimation(id, { loopOnce = false, lockMotion = false, manualPreview = false } = {}) {
    const clipEntry = this.clips.find((clip) => clip.id === id);
    if (!clipEntry || !this.mixer) return;

    const nextAction = this.actions.get(id);
    if (!nextAction) return;

    nextAction.enabled = true;
    nextAction.reset();
    nextAction.setEffectiveWeight(1);
    nextAction.setEffectiveTimeScale(1);
    nextAction.setLoop(loopOnce ? THREE.LoopOnce : THREE.LoopRepeat, loopOnce ? 1 : Infinity);
    nextAction.clampWhenFinished = loopOnce;

    if (this.currentAction && this.currentAction !== nextAction) {
      nextAction.crossFadeFrom(this.currentAction, 0.2, false);
    }

    nextAction.play();
    this.currentAction = nextAction;
    this.currentAnimationId = id;
    this.motionLocked = lockMotion;
    this.manualPreview = manualPreview;
    this.onCurrentAnimationChanged?.(clipEntry);

    if (loopOnce) {
      const handleFinished = (event) => {
        if (event.action !== nextAction) return;
        this.mixer.removeEventListener("finished", handleFinished);
        this.motionLocked = false;
        this.manualPreview = false;
        this.playBestIdle();
      };
      this.mixer.addEventListener("finished", handleFinished);
    }
  }

  registerClips(asset, clips) {
    clips.forEach((clip, index) => {
      const semanticName = clips.length === 1 ? asset.label : `${asset.label} ${index + 1}`;
      const renamedClip = clip.clone();
      renamedClip.name = semanticName;

      const clipEntry = {
        id: `${asset.id}-${index}`,
        assetId: asset.id,
        label: semanticName,
        originalName: clip.name || "(unnamed)",
        clip: renamedClip
      };

      const action = this.mixer?.clipAction(renamedClip);
      if (action) {
        this.actions.set(clipEntry.id, action);
      }

      this.clips.push(clipEntry);
    });
  }

  normalizeBaseScene(scene) {
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const scale = size.y > 0 ? HERO_TARGET_HEIGHT / size.y : 1;

    scene.scale.setScalar(scale);
    scene.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
  }

  findClipByText(text) {
    const normalized = text.toLowerCase();
    return this.clips.find((clip) => clip.label.toLowerCase().includes(normalized));
  }

  findHandBone(scene) {
    const candidates = [];

    scene.traverse((object) => {
      if (object.isBone && /hand|wrist|mixamorig.*hand/i.test(object.name)) {
        candidates.push(object);
      }
    });

    return (
      candidates.find((bone) => /right|rhand|hand_r|r_/i.test(bone.name)) ??
      candidates[0] ??
      null
    );
  }

  logLoadedModel(gltf) {
    const hierarchy = [];
    const meshes = [];
    const materials = new Set();
    const bones = [];

    gltf.scene.traverse((object) => {
      hierarchy.push(`${"  ".repeat(this.getDepth(object))}${object.type}: ${object.name || "(unnamed)"}`);

      if (object.isMesh) {
        meshes.push(object.name || "(unnamed mesh)");
        const meshMaterials = Array.isArray(object.material) ? object.material : [object.material];
        meshMaterials.filter(Boolean).forEach((material) => materials.add(material.name || material.type));
      }

      if (object.isBone) {
        bones.push(object.name || "(unnamed bone)");
      }
    });

    console.group("[CharacterTestLab] Hero model loaded");
    console.info("Hierarchy", hierarchy);
    console.info("Meshes", meshes);
    console.info("Materials", [...materials]);
    console.info("Bones", bones);
    console.info(
      "Base animation clips",
      gltf.animations.map((clip) => clip.name || "(unnamed)")
    );
    console.groupEnd();
  }

  getDepth(object) {
    let depth = 0;
    let parent = object.parent;
    while (parent) {
      depth += 1;
      parent = parent.parent;
    }
    return depth;
  }
}
