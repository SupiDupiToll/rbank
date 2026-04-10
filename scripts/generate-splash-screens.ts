import sharp from "sharp";
import * as fs from "node:fs";
import * as path from "node:path";

const OUTPUT_DIR = path.join(process.cwd(), "public", "splash");

interface SplashScreenConfig {
  name: string;
  width: number;
  height: number;
  pixelRatio: number;
}

const SPLASH_SCREENS: SplashScreenConfig[] = [
  { name: "se-portrait", width: 375, height: 812, pixelRatio: 2 },
  { name: "14-portrait", width: 390, height: 844, pixelRatio: 3 },
  { name: "14pro-portrait", width: 393, height: 852, pixelRatio: 3 },
  { name: "14promax-portrait", width: 430, height: 932, pixelRatio: 3 }
];

async function generateSplash(config: SplashScreenConfig) {
  const w = config.width * config.pixelRatio;
  const h = config.height * config.pixelRatio;

  const svg = `
    <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${w}" height="${h}" fill="#0f1115"/>
      <rect x="4" y="4" width="${w - 8}" height="${h - 8}" rx="40" fill="none" stroke="#b7e44b" stroke-width="4"/>
      <text x="${w / 2}" y="${h / 2 + 40}" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="${Math.round(w / 5)}" font-weight="bold" fill="#b7e44b">RB</text>
      <text x="${w / 2}" y="${h / 2 + 140}" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="${Math.round(w / 18)}" font-weight="bold" fill="#f8fafc">RuiBank</text>
    </svg>
  `;

  const outputPath = path.join(OUTPUT_DIR, `${config.name}.png`);
  await sharp(Buffer.from(svg))
    .resize(w, h, { fit: "fill" })
    .png()
    .toFile(outputPath);
  console.log(`Generated ${outputPath} (${w}x${h})`);
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  for (const config of SPLASH_SCREENS) {
    await generateSplash(config);
  }

  console.log("All splash screens generated successfully!");
}

main().catch(console.error);
