// Prepara le icone a colori disegnate per Alex (ottobre 2026, stile 3D con bianco, blu e parti scure).
// Originali in docs/icone-colore/<nome>.webp (1254 px, fondo trasparente); per l'app crea
// public/icone-colore/<nome>.webp da 128 px, senza il trasparente in eccesso e con un piccolo margine.
// Si usano così come sono (non cambiano colore col tema): vedi components/Icona.tsx, insieme COLORE.
// Uso: node scripts/icone-colore.mjs
import sharp from "sharp";
import { mkdirSync, readdirSync } from "node:fs";

const LATO = 128;
const MARGINE = 4;
const VUOTO = { r: 0, g: 0, b: 0, alpha: 0 };
mkdirSync("public/icone-colore", { recursive: true });

for (const file of readdirSync("docs/icone-colore").filter((f) => /\.(webp|png)$/.test(f))) {
  const nome = file.replace(/\.(webp|png)$/, "");
  const ritagliata = await sharp(`docs/icone-colore/${file}`).trim({ threshold: 1 }).toBuffer();
  await sharp(ritagliata)
    .resize(LATO - MARGINE * 2, LATO - MARGINE * 2, { fit: "contain", background: VUOTO })
    .extend({ top: MARGINE, bottom: MARGINE, left: MARGINE, right: MARGINE, background: VUOTO })
    .webp({ quality: 90, alphaQuality: 100 })
    .toFile(`public/icone-colore/${nome}.webp`);
  console.log("ok", nome);
}
