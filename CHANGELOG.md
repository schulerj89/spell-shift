# Changelog

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
