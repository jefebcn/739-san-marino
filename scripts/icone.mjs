// Genera le icone dell'app 739 in public/icons. Uso: node scripts/icone.mjs
import sharp from "sharp";
import { mkdirSync } from "node:fs";

mkdirSync("public/icons", { recursive: true });

function svg(size, { maskable = false } = {}) {
  const pad = maskable ? size * 0.12 : 0;
  const inner = size - pad * 2;
  const r = maskable ? 0 : size * 0.22;
  const fs = inner * 0.36;
  const peaksH = inner * 0.34;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs><clipPath id="c"><rect width="${size}" height="${size}" rx="${r}"/></clipPath></defs>
  <g clip-path="url(#c)">
  <rect width="${size}" height="${size}" fill="#0B1F2E"/>
  <text x="${pad + inner * 0.11}" y="${pad + inner * 0.6}" font-family="DejaVu Sans, Arial, sans-serif" font-weight="700" font-size="${fs}" letter-spacing="${-fs * 0.06}" fill="#FFFFFF">739</text>
  <g transform="translate(${pad},${pad + inner - peaksH}) scale(${inner / 120},${peaksH / 39})">
    <path d="M0 39 L26 15 L36 23 L58 0 L78 19 L90 9 L120 39 Z" fill="#5EB6E4"/>
  </g>
  </g>
</svg>`;
}

const out = [
  ["icon-192.png", 192, {}],
  ["icon-512.png", 512, {}],
  ["maskable-512.png", 512, { maskable: true }],
  ["apple-touch-icon.png", 180, { maskable: true }],
];

for (const [name, size, opts] of out) {
  await sharp(Buffer.from(svg(size, opts))).png().toFile(`public/icons/${name}`);
  console.log("ok", name);
}
