import sharp from "sharp";

export function logoPng() {
  return renderPng(
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="100" viewBox="0 0 320 100">
      <rect x="6" y="30" width="12" height="40" rx="6" fill="#38bdf8"/>
      <rect x="26" y="30" width="12" height="40" rx="6" fill="#0ea5e9" opacity="0.85"/>
      <text x="56" y="62" font-family="'Helvetica Neue','Arial',sans-serif" font-size="40" font-weight="700" fill="#ffffff">Family Bank</text>
      <text x="58" y="84" font-family="'Helvetica Neue','Arial',sans-serif" font-size="13" letter-spacing="6" fill="#64748b">FAMILY CARD</text>
    </svg>`,
    320,
    100,
  );
}

export function iconPng() {
  return renderPng(
    `<svg xmlns="http://www.w3.org/2000/svg" width="87" height="87" viewBox="0 0 87 87">
      <rect width="87" height="87" rx="20" fill="#0a0e16"/>
      <path d="M24 36 L43.5 22 L63 36" stroke="#38bdf8" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M28 36 v20 M38 36 v20 M49 36 v20 M59 36 v20" stroke="#ffffff" stroke-width="4" stroke-linecap="round"/>
      <rect x="26" y="56" width="35" height="12" rx="3" fill="#38bdf8"/>
    </svg>`,
    87,
    87,
  );
}

async function renderPng(svg: string, width: number, height: number) {
  return sharp(Buffer.from(svg)).png().resize(width, height).toBuffer();
}
