import { chromium } from "playwright";
import fs from "node:fs";

if (fs.existsSync("artifacts/sprite-sheet-idle-check.webm")) {
  fs.rmSync("artifacts/sprite-sheet-idle-check.webm");
}
if (fs.existsSync("artifacts/sprite-sheet-idle-check.mp4")) {
  fs.rmSync("artifacts/sprite-sheet-idle-check.mp4");
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: "artifacts" }
  });
  const page = await context.newPage();
  const video = page.video();

  await page.goto("http://127.0.0.1:4173", { waitUntil: "networkidle" });
  await page.waitForTimeout(1400);

  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(900);
  await page.keyboard.up("ArrowRight");

  await page.keyboard.down("ArrowLeft");
  await page.waitForTimeout(900);
  await page.keyboard.up("ArrowLeft");

  await page.waitForTimeout(700);

  await page.close();
  await context.close();
  await browser.close();

  const path = await video.path();
  if (path && fs.existsSync(path)) {
    fs.renameSync(path, "artifacts/sprite-sheet-idle-check.webm");
  }

  console.log("Saved video: artifacts/sprite-sheet-idle-check.webm");
})();
