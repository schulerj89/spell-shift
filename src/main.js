import "./styles.css";
import Phaser from "phaser";
import { SpritePlaygroundScene } from "./phaser-lab/SpritePlaygroundScene.js";

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "app",
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: "#151817",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [SpritePlaygroundScene]
});

window.addEventListener("resize", () => {
  game.scale.resize(window.innerWidth, window.innerHeight);
});
