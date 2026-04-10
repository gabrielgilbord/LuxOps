/**
 * Rasteriza public/icon.svg a PNG/ICO usados por el sitio y el PWA.
 * Sin esto, layout/manifest apuntan a archivos inexistentes → fallback feo (p. ej. Vercel).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const svgPath = path.join(root, "public", "icon.svg");
const publicDir = path.join(root, "public");

async function main() {
  if (!fs.existsSync(svgPath)) {
    console.error("Missing public/icon.svg");
    process.exit(1);
  }
  const svg = fs.readFileSync(svgPath);

  const sizes = [
    ["favicon-48x48.png", 48],
    ["apple-touch-icon.png", 180],
    ["android-chrome-192x192.png", 192],
    ["android-chrome-512x512.png", 512],
  ];

  for (const [name, size] of sizes) {
    await sharp(svg)
      .resize(size, size)
      .png()
      .toFile(path.join(publicDir, name));
    console.log("wrote", name);
  }

  await sharp(svg)
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, "favicon-temp-32.png"));
  await sharp(path.join(publicDir, "favicon-temp-32.png"))
    .toFile(path.join(publicDir, "favicon.ico"));
  fs.unlinkSync(path.join(publicDir, "favicon-temp-32.png"));
  console.log("wrote favicon.ico");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
