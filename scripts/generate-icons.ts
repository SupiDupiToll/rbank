import sharp from "sharp";
import * as fs from "node:fs";
import * as path from "node:path";

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const OUTPUT_DIR = path.join(process.cwd(), "public");

// Primary color: #b7e44b — create a simple app icon with "RB" text
async function generateIcon(size: number, outputPath: string) {
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <rect width="512" height="512" rx="100" fill="#0f1115"/>
      <rect x="8" y="8" width="496" height="496" rx="92" fill="none" stroke="#b7e44b" stroke-width="8"/>
      <text x="256" y="320" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="240" font-weight="bold" fill="#b7e44b">RB</text>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(outputPath);
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  for (const size of SIZES) {
    const fileName = size <= 192 ? `icon-${size}x${size}.png` : `icon-${size}x${size}.png`;
    const outputPath = path.join(OUTPUT_DIR, fileName);
    await generateIcon(size, outputPath);
    console.log(`Generated ${outputPath}`);
  }

  // Generate apple-touch-icon.png (180px — standard for iPhone)
  await generateIcon(180, path.join(OUTPUT_DIR, "apple-touch-icon.png"));
  console.log("Generated apple-touch-icon.png (180x180)");

  // Generate base icon.svg as source
  const svgSource = `
    <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <rect width="512" height="512" rx="100" fill="#0f1115"/>
      <rect x="8" y="8" width="496" height="496" rx="92" fill="none" stroke="#b7e44b" stroke-width="8"/>
      <text x="256" y="320" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="240" font-weight="bold" fill="#b7e44b">RB</text>
    </svg>
  `;
  fs.writeFileSync(path.join(OUTPUT_DIR, "icon.svg"), svgSource.trim());
  console.log("Generated icon.svg");

  console.log("All icons generated successfully!");
}

main().catch(console.error);
