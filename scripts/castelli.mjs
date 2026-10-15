// Prepara i loghi dei castelli (forniti da Alex, ottobre 2026) per l'app.
// Da docs/castelli/<slug>.webp (1254×1254, fondo nero) crea in public/castelli, sempre con il logo intero
// (Alex non vuole ritagli): il nero del fondo, cioè quello collegato ai bordi, diventa trasparente, così
// il logo sta sul fondo scuro della pagina (tema scuro) o su una tessera grigio scuro (tema chiaro, --tessera).
// Le parti scure dentro il disegno restano com'erano.
// - <slug>.webp: 640×480, per la pagina del castello;
// - <slug>-emblema.webp: 192×192, per classifiche, podio e scelta del castello;
//   <slug>-emblema-piccolo.webp: 112×112, per quando a schermo è piccolo (srcset in components/LogoCastello.tsx).
// Uso: node scripts/castelli.mjs
import sharp from "sharp";
import { mkdirSync, readdirSync } from "node:fs";

mkdirSync("public/castelli", { recursive: true });

const VUOTO = { r: 0, g: 0, b: 0, alpha: 0 };
const SOGLIA = 26;

/** Rende trasparente il nero collegato ai bordi (riempimento a partire dai lati) */
async function senzaFondo(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const scuro = (i) => Math.max(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]) <= SOGLIA;
  const visto = new Uint8Array(w * h);
  const coda = [];
  for (let x = 0; x < w; x++) coda.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) coda.push(y * w, y * w + w - 1);
  while (coda.length) {
    const i = coda.pop();
    if (visto[i] || !scuro(i)) continue;
    visto[i] = 1;
    data[i * 4 + 3] = 0;
    const x = i % w;
    if (x > 0) coda.push(i - 1);
    if (x < w - 1) coda.push(i + 1);
    if (i >= w) coda.push(i - w);
    if (i < w * (h - 1)) coda.push(i + w);
  }
  return sharp(data, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}

for (const file of readdirSync("docs/castelli").filter((f) => f.endsWith(".webp"))) {
  const slug = file.replace(/\.webp$/, "");
  const pulito = await senzaFondo(`docs/castelli/${file}`);
  const intero = await sharp(pulito).trim({ threshold: 1 }).toBuffer();

  await sharp(intero)
    .resize(592, 432, { fit: "contain", background: VUOTO })
    .extend({ top: 24, bottom: 24, left: 24, right: 24, background: VUOTO })
    .webp({ quality: 85, alphaQuality: 100 })
    .toFile(`public/castelli/${slug}.webp`);

  await sharp(intero)
    .resize(176, 176, { fit: "contain", background: VUOTO })
    .extend({ top: 8, bottom: 8, left: 8, right: 8, background: VUOTO })
    // 192 px bastano fino a 96 px a schermo su display doppi (classifica, podio, scelta): un terzo del peso di prima
    .webp({ quality: 80, alphaQuality: 90, effort: 6 })
    .toFile(`public/castelli/${slug}-emblema.webp`);

  // Versione piccola (112 px) per griglie e righe fino a 56 px a schermo: il browser la sceglie con srcset
  await sharp(intero)
    .resize(102, 102, { fit: "contain", background: VUOTO })
    .extend({ top: 5, bottom: 5, left: 5, right: 5, background: VUOTO })
    .webp({ quality: 80, alphaQuality: 90, effort: 6 })
    .toFile(`public/castelli/${slug}-emblema-piccolo.webp`);
  console.log("ok", slug);
}
