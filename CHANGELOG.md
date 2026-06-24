# Changelog

## 0.1.14 - 2026-06-24

- Switched the idle animation to load the 8 individual PNG frames from `public/assets/sprites/frames/`.
- Updated the animation inspector thumbnails and controls to work with the frame sequence instead of a sliced spritesheet.
- Added the new frame assets and supporting sprite metadata files.
- Refreshed the Playwright screenshot and idle video captures for the frame-folder animation.

## 0.1.13 - 2026-06-24

- Added an in-page sprite animation inspector with play/pause, previous/next frame controls, a frame scrubber, and FPS adjustment.
- Added clickable frame thumbnails for inspecting each idle frame directly.
- Updated Playwright verification and capture artifacts to show the new animation inspector panel.

## 0.1.12 - 2026-06-24

- Replaced the hero idle source spritesheet with the newly provided bounce-idle character sheet.
- Regenerated the transparent hero spritesheet from the updated source JPG.
- Refreshed the Playwright still image and idle-loop video captures for reviewing the updated idle bounce.

## 0.1.11 - 2026-06-24

- Added `scripts/make-sprite-transparent.ps1` to sample the JPG frame-edge background color and generate a transparent PNG spritesheet.
- Generated `public/assets/sprites/hero-sprite-sheet-transparent.png` from the hero JPG and switched the playground to load that PNG directly.
- Added `npm run sprite:transparent` for regenerating the transparent spritesheet.
- Refreshed the idle preview screenshot and Playwright video artifacts against the generated transparent PNG.

## 0.1.10 - 2026-06-24

- Updated the sprite playground to preview only the idle animation with no player movement input.
- Added runtime near-white edge background removal for the JPG hero spritesheet so frames render transparently over the level art.
- Refreshed the Playwright idle capture and added a still transparency check artifact.

## 0.1.9 - 2026-06-24

- Switched the sprite playground to use `hero-sprite-sheet.jpg` as the character spritesheet with explicit `320x320` frames.
- Reclassified `hero-sprite-sheet-alt.jpg` as the level background instead of trying to slice it as a player animation sheet.
- Updated the playground to show the level art behind the player and keep a bottom floor collider so the sprite remains grounded.
- Refreshed the Playwright capture artifacts against the corrected spritesheet loader.

## 0.1.8 - 2026-06-24

- Corrected the sprite-sheet bootstrap for the sprite playground so the candidate sheet layout is validated with explicit frame-size logging.
- Added HUD text for active sheet frame dimensions (cols/rows and pixel frame size) to make sprite-sheet slicing easier to verify without changing code.
- Kept Playwright capture workflow wired to the sprite-sheet validation path and updated recording artifacts.

## 0.1.7 - 2026-06-24

- Added support for both provided sprite sheets in the playground and added quick sheet swapping (1/2 or [ ] keys) to test idle-only vs. movement sheets.
- Enabled a grounded floor collider at the bottom platform so the character cannot fall through the floor.
- Switched movement to gravity-aware floor testing with wall grounding plus simple movement animations for the active sheet.
- Added a short Playwright-based local capture to validate the sprite sheet behavior in the running playground.

## 0.1.6 - 2026-06-24

- Updated the Phaser playground bootstrap to finish the 3D-to-2D conversion cleanup.
- Fixed playground HTML status message and load error reporting for sprite assets.
- Kept collision behavior focused on wall/object boundaries only, with a focused level layout.

## 0.1.5 - 2026-06-24

- Replaced the Three.js character test lab with a Phaser 2D sprite playground.
- Removed 3D pipeline assets, manifests, and character lab scenes.
- Added a top-down level playground with floor and wall collision using Arcade physics.
- Added playable character sprite from provided sprite sheet and WASD/arrow movement.

## 0.1.4 - 2026-06-23

- Added separate run-jump tuning controls for obstacle-jump delay, force, gravity, forward speed, and airborne foot lift.
- Updated jump and bounds helpers to follow the animated body during root-motion clips.
- Added hero accessory toggles for starter shirt, starter pants, and starter shoes.
- Added a hero accessory manifest and mirrored the single starter shoe asset into a shoe pair.

## 0.1.3 - 2026-06-23

- Added the `Jump Over Obstacle 2` hero animation asset to the character manifests.
- Updated jump selection so Space uses `Regular Jump` while still and `Jump Over Obstacle 2` while moving.
- Synced airborne jump hitbox lift with the launch delay so it starts when the physics jump launches.

## 0.1.2 - 2026-06-23

- Added left-click drag look controls for the follow camera.
- Added follow camera tuning sliders for distance, height, target height, side offset, and reset-behind behavior.
- Added jump tuning controls for launch delay, force, gravity, collider radius, collider height, and ground offset.
- Added a visible jump hitbox helper toggle for character movement testing.

## 0.1.1 - 2026-06-23

- Added a vanilla Vite + Three.js Character Test Lab scene.
- Organized imported hero GLB assets under `public/assets/characters/hero/`.
- Added a hero asset manifest and runtime registry for GLB loading.
- Added animation discovery, preview buttons, number-key shortcuts, and crossfading via `AnimationMixer`.
- Added basic WASD/arrow movement, rotation toward movement, idle/run blending, and guarded jump testing.
- Added debug helpers for skeleton, bounding box, axes, grid, and follow/orbit camera mode.
- Added placeholder structure for future base body loading, outfit swaps, wand attachment, and elemental material variants.
