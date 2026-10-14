// Prepara i loghi dei castelli (forniti da Alex, ottobre 2026) per l'app.
// Da docs/castelli/<slug>.webp (1254×1254, fondo nero) crea in public/castelli, sempre con il logo intero
// (disegno e nome: Alex non vuole ritagli), togliendo solo il nero in eccesso ai bordi:
// - <slug>.webp: 640×480, per la pagina del castello;
// - <slug>-emblema.webp: 256×256, per classifiche, podio e scelta del castello.
// Uso: node scripts/castelli.mjs
import sharp from "sharp";
import { mkdirSync, readdirSync } from "node:fs";

mkdirSync("public/castelli", { recursive: true });

const NERO = "#000000";

for (const file of readdirSync("docs/castelli").filter((f) => f.endsWith(".webp"))) {
  const slug = file.replace(/\.webp$/, "");
  const intero = await sharp(`docs/castelli/${file}`).trim({ background: NERO, threshold: 30 }).toBuffer();

  await sharp(intero)
    .resize(592, 432, { fit: "contain", background: NERO })
    .extend({ top: 24, bottom: 24, left: 24, right: 24, background: NERO })
    .webp({ quality: 82 })
    .toFile(`public/castelli/${slug}.webp`);

  await sharp(intero)
    .resize(236, 236, { fit: "contain", background: NERO })
    .extend({ top: 10, bottom: 10, left: 10, right: 10, background: NERO })
    .webp({ quality: 88 })
    .toFile(`public/castelli/${slug}-emblema.webp`);
  console.log("ok", slug);
}
