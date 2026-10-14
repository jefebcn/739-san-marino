// Prepara le icone disegnate per Alex (ottobre 2026): originali in docs/icone/<nome>.png, bianco e blu su trasparente.
// Per ogni icona crea in public/icone due maschere quadrate da 128 px (solo trasparenza):
// - <nome>-base.png: la parte bianca, che nell'app prende il colore del testo (bianca sul tema scuro, nera sul chiaro);
// - <nome>-accento.png: la parte blu, che resta blu (--icona-accento in globals.css).
// Uso: node scripts/icone-aree.mjs
import sharp from "sharp";
import { mkdirSync, readdirSync } from "node:fs";

const LATO = 128;
const MARGINE = 6;
mkdirSync("public/icone", { recursive: true });

for (const file of readdirSync("docs/icone").filter((f) => f.endsWith(".png"))) {
  const nome = file.replace(/\.png$/, "");
  const ritagliata = await sharp(`docs/icone/${file}`).trim({ threshold: 1 }).toBuffer();
  const { data, info } = await sharp(ritagliata)
    .resize(LATO - MARGINE * 2, LATO - MARGINE * 2, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({ top: MARGINE, bottom: MARGINE, left: MARGINE, right: MARGINE, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const base = Buffer.alloc(info.width * info.height * 4);
  const accento = Buffer.alloc(info.width * info.height * 4);
  for (let p = 0, k = 0; k < data.length; p++, k += 4) {
    const [r, , b, a] = [data[k], data[k + 1], data[k + 2], data[k + 3]];
    // Quanto è blu il punto (0 = bianco, 1 = blu pieno): divide anche i bordi sfumati tra le due parti
    const blu = Math.min(1, Math.max(0, (b - r) / 200));
    base.fill(255, k, k + 3);
    accento.fill(255, k, k + 3);
    base[k + 3] = Math.round(a * (1 - blu));
    accento[k + 3] = Math.round(a * blu);
  }
  const opzioni = { raw: { width: info.width, height: info.height, channels: 4 } };
  await sharp(base, opzioni).png({ compressionLevel: 9 }).toFile(`public/icone/${nome}-base.png`);
  await sharp(accento, opzioni).png({ compressionLevel: 9 }).toFile(`public/icone/${nome}-accento.png`);
  console.log("ok", nome);
}
