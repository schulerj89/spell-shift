export class InputController {
  constructor() {
    this.keys = new Set();
    this.jumpPressed = false;

    window.addEventListener("keydown", (event) => {
      this.keys.add(event.code);

      if (event.code === "Space") {
        this.jumpPressed = true;
        event.preventDefault();
      }
    });

    window.addEventListener("keyup", (event) => {
      this.keys.delete(event.code);
    });
  }

  consumeJumpPressed() {
    const wasPressed = this.jumpPressed;
    this.jumpPressed = false;
    return wasPressed;
  }

  getMovementVector() {
    let x = 0;
    let z = 0;

    if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) x -= 1;
    if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) x += 1;
    if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) z -= 1;
    if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) z += 1;

    return { x, z };
  }
}
