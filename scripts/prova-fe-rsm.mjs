// Prova del file XML della fattura elettronica interna (modules/neonup/fe-rsm.ts) contro lo schema ufficiale VFPR12 1.2.3
// pubblicato da finanze.sm (copia in scripts/dati/fe-rsm, con lo schema della firma del W3C in locale).
// Uso: node --experimental-strip-types scripts/prova-fe-rsm.mjs   (serve xmllint)
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { xmlFeRsm, problemiFe } from "../modules/neonup/fe-rsm.ts";

const schema = new URL("./dati/fe-rsm/Schema_VFPR12_v1.2.3.xsd", import.meta.url).pathname;
const cartella = mkdtempSync(join(tmpdir(), "fe-rsm-"));

const cedente = { denominazione: "Prova Srl – “Ferramenta” & C.", cod_oe: "01234", indirizzo: "Via Prova", numero_civico: "1", cap: "47890", comune: "San Marino", telefono: "0549 123456", email: "info@prova.sm", iban: "SM86U0322509800000000270100" };
const cessionario = { denominazione: "Cliente Spa", cod_oe: "04321", indirizzo: "Via Cliente 2", numero_civico: null, cap: "47891", comune: "Dogana" };

const casi = {
  "beni con un DDT e bonifico": {
    td: "TD01", numero: "1", data: "2026-10-21", totale: 53.6, cedente, cessionario,
    righe: [
      { n: 1, codice: "VT-3", descrizione: "Viti 3 mm\nconfezione da 100 €", quantita: 3, unita_misura: "pz", prezzo: 1.333, sconto: 10, totale: 3.6, tipo_merce: 4, nonrimb: false },
      { n: 2, codice: null, descrizione: "Bulloni", quantita: 1, unita_misura: null, prezzo: 50, sconto: 0, totale: 50, tipo_merce: 1, nonrimb: true },
    ],
    ddt: [{ numero: "7", data: "2026-10-20" }], tipo_cessione: 4, pagamento: { modalita: "MP05", scadenza: "2026-11-30" },
  },
  "servizi con due DDT": {
    td: "TD01", numero: "2", data: "2026-10-21", totale: 150, cedente, cessionario,
    righe: [
      { n: 1, codice: null, descrizione: "Lavorazione", quantita: 1, unita_misura: null, prezzo: 100, sconto: 0, totale: 100, tipo_merce: 2, nonrimb: false },
      { n: 2, codice: null, descrizione: "Lavorazione bis", quantita: 2, unita_misura: "h", prezzo: 25, sconto: 0, totale: 50, tipo_merce: 2, nonrimb: false },
    ],
    ddt: [{ numero: "8", data: "2026-10-20", righe: [1] }, { numero: "9", data: "2026-10-21", righe: [2] }],
  },
  "nota di credito": {
    td: "TD04", numero: "3", data: "2026-10-21", totale: 3.6, cedente, cessionario,
    righe: [{ n: 1, codice: null, descrizione: "Reso viti", quantita: 1, unita_misura: null, prezzo: 3.6, sconto: 0, totale: 3.6, tipo_merce: 4, nonrimb: false }],
    ddt: [{ numero: "10", data: "2026-10-21" }], collegata: { numero: "1", data: "2026-10-21" },
  },
  "nota per variazioni contrattuali, servizi": {
    td: "TD04", numero: "4", data: "2026-10-21", totale: 20, cedente, cessionario, causale: "VariazioniContrattuali",
    righe: [{ n: 1, codice: null, descrizione: "Premio di fine anno", quantita: 1, unita_misura: null, prezzo: 20, sconto: 0, totale: 20, tipo_merce: 3, nonrimb: false }],
    ddt: [],
  },
};

let errori = 0;
for (const [nome, doc] of Object.entries(casi)) {
  const problemi = problemiFe(doc);
  const file = join(cartella, `SM01234_${nome.length.toString(36).padStart(5, "0")}.xml`);
  writeFileSync(file, xmlFeRsm(doc, file.split("/").pop().replace(".xml", "")));
  try {
    execFileSync("xmllint", ["--noout", "--nonet", "--schema", schema, file], { stdio: "pipe" });
    console.log(problemi.length ? `NO  ${nome}: ${problemi.join(" ")}` : `ok  ${nome}`);
    if (problemi.length) errori++;
  } catch (e) {
    errori++;
    console.log(`NO  ${nome}\n${e.stderr}`);
  }
}
console.log(`File in ${cartella}`);
process.exit(errori ? 1 : 0);
