import "./styles.css";
import { CharacterLabScene } from "./character-lab/CharacterLabScene.js";

const canvas = document.querySelector("#character-lab");
const lab = new CharacterLabScene(canvas);

lab.start().catch((error) => {
  console.error("[CharacterTestLab] Failed to start scene", error);
});
