// Prepara i tracciati delle icone Phosphor usate da 739, solo nello stile che usiamo («fill», o «bold» per le lineari).
// Il pacchetto di Phosphor porta in ogni pagina tutti e sei gli stili di ogni icona (259 KB di JavaScript, 59 KB
// compressi): qui si prende solo quello che serve e si scrive components/icone-tracciati.ts.
// Le forme restano quelle di Phosphor. Si rilancia ogni volta che si aggiunge un'icona in components/Icona.tsx:
//   node scripts/icone-phosphor.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as P from "@phosphor-icons/react/dist/ssr";

const sorgente = readFileSync("components/Icona.tsx", "utf8");
const blocco = sorgente.slice(sorgente.indexOf("const ICONE = {"), sorgente.indexOf("} satisfies Record<string, string>"));
const icone = [...blocco.matchAll(/^\s+"?([a-z-]+)"?: "([A-Z][A-Za-z]*)",/gm)].map((m) => [m[1], m[2]]);
const lineari = new Set([...sorgente.match(/const LINEARI = new Set<NomeIcona>\(\[([^\]]*)\]\)/)[1].matchAll(/"([a-z]+)"/g)].map((m) => m[1]));
if (!icone.length) throw new Error("Elenco ICONE non trovato in components/Icona.tsx");

const righe = [];
for (const [nome, componente] of icone) {
  const C = P[componente] ?? P[`${componente}Icon`];
  if (!C) throw new Error(`Phosphor non ha l'icona ${componente}`);
  const svg = renderToStaticMarkup(createElement(C, { weight: lineari.has(nome) ? "bold" : "fill" }));
  const dentro = svg.slice(svg.indexOf(">") + 1, svg.lastIndexOf("</svg>"));
  righe.push(`  ${JSON.stringify(nome)}: ${JSON.stringify(dentro)},`);
}
writeFileSync(
  "components/icone-tracciati.ts",
  `// Generato da scripts/icone-phosphor.mjs: non modificare a mano.\n// Tracciati delle icone Phosphor (MIT, phosphoricons.com) nello stile usato da 739, viewBox 0 0 256 256.\nexport const TRACCIATI: Record<string, string> = {\n${righe.join("\n")}\n};\n`,
);
console.log(`${righe.length} icone scritte in components/icone-tracciati.ts`);
