// Genera le icone dell'app 739 in public/icons (e public/favicon.ico) dal logo in public/brand.
// Bianco su zinc-950: il marchio Completo da 180 px in su, le Torri per favicon e icone fino a 64 px.
// Uso: node scripts/icone.mjs
import sharp from "sharp";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const FONDO = "#09090B"; // zinc-950
const LOGO = "#FFFFFF";

function marchio(nome) {
  const s = readFileSync(`public/brand/739-${nome}.svg`, "utf8");
  const [, , w, h] = s.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
  return { w, h, d: s.match(/ d="([^"]+)"/)[1] };
}
const COMPLETO = marchio("completo");
const TORRI = marchio("torri");

/**
 * size: lato in px; quota: larghezza del logo rispetto al lato;
 * angoli: raggio del fondo (0 = fondo pieno, per maskable e apple-touch-icon che il sistema ritaglia da sé)
 */
function svg(size, logo, quota, angoli) {
  const lw = size * quota;
  const lh = (lw * logo.h) / logo.w;
  const x = (size - lw) / 2;
  const y = (size - lh) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * angoli}" fill="${FONDO}"/>
  <g transform="translate(${x},${y}) scale(${lw / logo.w})"><path fill-rule="evenodd" fill="${LOGO}" d="${logo.d}"/></g>
</svg>`;
}

const png = (size, logo, quota, angoli) => sharp(Buffer.from(svg(size, logo, quota, angoli))).png().toBuffer();

mkdirSync("public/icons", { recursive: true });

const icone = [
  // Completo, da 180 px in su
  ["apple-touch-icon.png", 180, COMPLETO, 0.72, 0],
  ["icon-192.png", 192, COMPLETO, 0.7, 0.22],
  ["icon-512.png", 512, COMPLETO, 0.7, 0.22],
  // Maskable: il sistema ritaglia un cerchio di diametro 80%: il logo sta tutto dentro
  ["maskable-512.png", 512, COMPLETO, 0.56, 0],
  // Torri, fino a 64 px
  ["icon-32.png", 32, TORRI, 0.82, 0.22],
  ["icon-64.png", 64, TORRI, 0.8, 0.22],
];

for (const [nome, size, logo, quota, angoli] of icone) {
  writeFileSync(`public/icons/${nome}`, await png(size, logo, quota, angoli));
  console.log("ok", nome);
}

// favicon.ico con 16, 32 e 48 px (PNG dentro un ICO: lo leggono tutti i browser)
const pezzi = await Promise.all([16, 32, 48].map((s) => png(s, TORRI, s === 16 ? 0.86 : 0.82, 0.22)));
const testa = Buffer.alloc(6 + 16 * pezzi.length);
testa.writeUInt16LE(0, 0);
testa.writeUInt16LE(1, 2);
testa.writeUInt16LE(pezzi.length, 4);
let scarto = testa.length;
pezzi.forEach((p, i) => {
  const s = [16, 32, 48][i];
  const o = 6 + 16 * i;
  testa.writeUInt8(s, o);
  testa.writeUInt8(s, o + 1);
  testa.writeUInt8(0, o + 2);
  testa.writeUInt8(0, o + 3);
  testa.writeUInt16LE(1, o + 4);
  testa.writeUInt16LE(32, o + 6);
  testa.writeUInt32LE(p.length, o + 8);
  testa.writeUInt32LE(scarto, o + 12);
  scarto += p.length;
});
writeFileSync("public/favicon.ico", Buffer.concat([testa, ...pezzi]));
console.log("ok favicon.ico");
