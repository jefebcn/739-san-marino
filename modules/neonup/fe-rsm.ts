// Il file XML della fattura elettronica interna di San Marino (FE-RSM), formato FPR12 dello schema VFPR12 1.2.3.
// Regole da: Documento A e Documento B dell'Ufficio Tributario (8/9/2026), regole tecniche FE-RSM (25/5/2026).
// - CodiceDestinatario sempre 0000000, RegimeFiscale RF01, IdPaese SM con il codice operatore economico;
// - ogni riga: AliquotaIVA 0.00, Natura N4, Tipo Merce in AltriDatiGestionali (TipoDato «TM»);
// - un riepilogo per ogni Tipo Merce, con «TM:n» in RiferimentoNormativo;
// - Tipo Cessione in Causale «TC:nn»; DDT con le righe se sono più di uno.
// Nessuna dipendenza: lo usa la pagina del documento e lo prova `node scripts/prova-fe-rsm.mjs` contro lo schema.

export type RigaEmessa = {
  n: number; codice: string | null; descrizione: string; quantita: number; unita_misura: string | null;
  prezzo: number; sconto: number; totale: number; tipo_merce: number | null; nonrimb: boolean;
};
export type Parte = {
  denominazione: string; cod_oe: string | null; indirizzo: string | null; numero_civico: string | null; cap: string | null;
  comune: string | null; telefono?: string | null; email?: string | null; iban?: string | null; nazione?: string;
  provincia?: string | null; partita_iva?: string | null;
};
export type DocumentoFe = {
  td: "TD01" | "TD02" | "TD04" | "TD05"; numero: string; data: string; totale: number;
  cedente: Parte; cessionario: Parte; righe: RigaEmessa[];
  ddt: { numero: string; data: string; righe?: number[] }[];
  collegata?: { numero: string; data: string } | null;
  causale?: string | null; tipo_cessione?: number | null;
  pagamento?: { modalita?: string; scadenza?: string } | null;
};

const NS = "http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2";

/** Testo accettato dallo schema: solo Latin-1, niente a capo, con i caratteri speciali dell'XML protetti */
export function latino(s: string, max: number) {
  const t = s
    .replace(/[‘’‚′]/g, "'").replace(/[“”„″]/g, '"')
    .replace(/[–—−]/g, "-").replace(/…/g, "...").replace(/€/g, "EUR")
    .replace(/[\r\n\t]+/g, " ").replace(/[^\x20-\x7E\xA0-\xFF]/g, "").replace(/\s{2,}/g, " ").trim()
    .slice(0, max);
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Numero con almeno 2 decimali e al massimo `max` (8 nelle righe, 2 nei totali) */
export function cifre(n: number, max = 2) {
  const fisso = Number(n).toFixed(max);
  if (max === 2) return fisso;
  const [intero, dec] = fisso.split(".");
  return intero + "." + dec.replace(/0+$/, "").padEnd(2, "0");
}

const el = (nome: string, valore: string | null | undefined) => (valore == null || valore === "" ? "" : `<${nome}>${valore}</${nome}>`);

function sede(p: Parte) {
  return "<Sede>" + el("Indirizzo", latino(p.indirizzo ?? "", 60)) + el("NumeroCivico", latino(p.numero_civico ?? "", 8))
    + el("CAP", p.cap) + el("Comune", latino(p.comune ?? "", 60)) + el("Nazione", p.nazione ?? "SM") + "</Sede>";
}

const idFiscale = (p: Parte) => `<IdFiscaleIVA><IdPaese>SM</IdPaese><IdCodice>${p.cod_oe}</IdCodice></IdFiscaleIVA>`;

/** Il progressivo del file (dopo «_»), che fa anche da ProgressivoInvio */
export const progressivoDi = (nomeFile: string) => nomeFile.split("_")[1] ?? nomeFile;

/** Problemi che impedirebbero all'HUB-SM di accettare il file: vuoto se è a posto */
export function problemiFe(d: DocumentoFe): string[] {
  const p: string[] = [];
  if (!d.cedente.cod_oe || !/^\d{5}$/.test(d.cedente.cod_oe)) p.push("Manca il codice operatore economico dell'azienda.");
  if (!d.cessionario.cod_oe || !/^\d{5}$/.test(d.cessionario.cod_oe)) p.push("Manca il codice operatore economico del cliente.");
  for (const [chi, x] of [["dell'azienda", d.cedente], ["del cliente", d.cessionario]] as const) {
    if (!x.indirizzo || !x.comune || !x.cap || !/^\d{5}$/.test(x.cap)) p.push(`Indirizzo, CAP (5 cifre) e comune ${chi} sono obbligatori.`);
  }
  if (!/\d/.test(d.numero)) p.push("Il numero deve contenere almeno una cifra.");
  for (const r of d.righe) if (r.totale !== 0 && !r.tipo_merce) p.push(`Riga ${r.n}: manca il tipo merce.`);
  if (d.ddt.length > 1) for (const x of d.ddt) if (!x.righe?.length) p.push(`DDT ${x.numero}: indica le righe.`);
  if ((d.td === "TD04" || d.td === "TD05") && !d.collegata && d.causale !== "VariazioniContrattuali") p.push("La nota deve indicare la fattura che varia.");
  return p;
}

/** Il file XML, pronto da caricare su TribWEB («Upload File FE-RSM») o da mandare all'HUB-SM */
export function xmlFeRsm(d: DocumentoFe, nomeFile: string) {
  const prog = progressivoDi(nomeFile);
  const tel = (d.cedente.telefono ?? "").replace(/[^0-9+]/g, "");
  const contatti = (tel.length >= 5 && tel.length <= 12 ? el("Telefono", tel) : "") + el("Email", d.cedente.email ? latino(d.cedente.email, 256) : null);

  const causali = [d.tipo_cessione ? `TC:${d.tipo_cessione}` : null, d.causale ? latino(d.causale, 200) : null].filter(Boolean) as string[];

  const righe = d.righe.map((r) => {
    let x = "<DettaglioLinee>" + el("NumeroLinea", String(r.n));
    if (r.codice) x += `<CodiceArticolo><CodiceTipo>INTERNO</CodiceTipo><CodiceValore>${latino(r.codice, 35)}</CodiceValore></CodiceArticolo>`;
    x += el("Descrizione", latino(r.descrizione, 1000)) + el("Quantita", cifre(r.quantita, 8)) + el("UnitaMisura", r.unita_misura ? latino(r.unita_misura, 10) : null)
      + el("PrezzoUnitario", cifre(r.prezzo, 8));
    if (r.sconto > 0) x += `<ScontoMaggiorazione><Tipo>SC</Tipo><Percentuale>${cifre(r.sconto, 2)}</Percentuale></ScontoMaggiorazione>`;
    x += el("PrezzoTotale", cifre(r.totale, 8)) + "<AliquotaIVA>0.00</AliquotaIVA><Natura>N4</Natura>";
    if (r.tipo_merce) x += `<AltriDatiGestionali><TipoDato>TM</TipoDato><RiferimentoTesto>${r.tipo_merce}</RiferimentoTesto></AltriDatiGestionali>`;
    if (r.nonrimb) x += "<AltriDatiGestionali><TipoDato>NONRIMB</TipoDato></AltriDatiGestionali>";
    return x + "</DettaglioLinee>";
  }).join("");

  // Un riepilogo per ogni Tipo Merce (le righe a zero senza tipo stanno nel primo)
  const gruppi = new Map<number | null, number>();
  for (const r of d.righe) {
    const k = r.tipo_merce ?? (r.totale === 0 ? [...gruppi.keys()][0] ?? null : null);
    gruppi.set(k, Math.round(((gruppi.get(k) ?? 0) + r.totale) * 100) / 100);
  }
  const riepilogo = [...gruppi].map(([tm, imp]) =>
    `<DatiRiepilogo><AliquotaIVA>0.00</AliquotaIVA><Natura>N4</Natura><ImponibileImporto>${cifre(imp)}</ImponibileImporto><Imposta>0.00</Imposta>`
    + el("RiferimentoNormativo", tm ? `TM:${tm}, ESENTE` : "ESENTE") + "</DatiRiepilogo>").join("");

  const ddt = d.ddt.map((x) => "<DatiDDT>" + el("NumeroDDT", latino(x.numero, 20)) + el("DataDDT", x.data)
    + (d.ddt.length > 1 ? (x.righe ?? []).map((n) => el("RiferimentoNumeroLinea", String(n))).join("") : "") + "</DatiDDT>").join("");

  const pag = d.pagamento?.modalita && (d.td === "TD01" || d.td === "TD02")
    ? "<DatiPagamento><CondizioniPagamento>TP02</CondizioniPagamento><DettaglioPagamento>" + el("ModalitaPagamento", d.pagamento.modalita)
      + el("DataScadenzaPagamento", d.pagamento.scadenza) + el("ImportoPagamento", cifre(d.totale))
      + (d.pagamento.modalita === "MP05" ? el("IBAN", d.cedente.iban) : "") + "</DettaglioPagamento></DatiPagamento>"
    : "";

  return '<?xml version="1.0" encoding="UTF-8"?>\n'
    + `<p:FatturaElettronica xmlns:p="${NS}" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" versione="FPR12">`
    + "<FatturaElettronicaHeader>"
    + `<DatiTrasmissione><IdTrasmittente><IdPaese>SM</IdPaese><IdCodice>${d.cedente.cod_oe}</IdCodice></IdTrasmittente>`
    + `<ProgressivoInvio>${prog}</ProgressivoInvio><FormatoTrasmissione>FPR12</FormatoTrasmissione><CodiceDestinatario>0000000</CodiceDestinatario></DatiTrasmissione>`
    + `<CedentePrestatore><DatiAnagrafici>${idFiscale(d.cedente)}<Anagrafica><Denominazione>${latino(d.cedente.denominazione, 80)}</Denominazione></Anagrafica><RegimeFiscale>RF01</RegimeFiscale></DatiAnagrafici>`
    + sede(d.cedente) + (contatti ? `<Contatti>${contatti}</Contatti>` : "") + "</CedentePrestatore>"
    + `<CessionarioCommittente><DatiAnagrafici>${idFiscale(d.cessionario)}<Anagrafica><Denominazione>${latino(d.cessionario.denominazione, 80)}</Denominazione></Anagrafica></DatiAnagrafici>`
    + sede(d.cessionario) + "</CessionarioCommittente>"
    + "</FatturaElettronicaHeader>"
    + "<FatturaElettronicaBody><DatiGenerali><DatiGeneraliDocumento>"
    + el("TipoDocumento", d.td) + "<Divisa>EUR</Divisa>" + el("Data", d.data) + el("Numero", latino(d.numero, 20))
    + el("ImportoTotaleDocumento", cifre(d.totale)) + causali.map((c) => el("Causale", c)).join("")
    + "</DatiGeneraliDocumento>"
    + (d.collegata && d.causale !== "VariazioniContrattuali" ? `<DatiFattureCollegate>${el("IdDocumento", latino(d.collegata.numero, 20))}${el("Data", d.collegata.data)}</DatiFattureCollegate>` : "")
    + ddt + "</DatiGenerali>"
    + `<DatiBeniServizi>${righe}${riepilogo}</DatiBeniServizi>` + pag
    + "</FatturaElettronicaBody></p:FatturaElettronica>\n";
}
