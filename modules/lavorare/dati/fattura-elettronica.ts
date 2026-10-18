// Fattura elettronica tra operatori sammarinesi (Lavorare, /lavorare/fattura-elettronica).
// Dati letti il 18/10/2026 sul testo del Decreto Delegato 4 settembre 2026 n.133 e sulle slide ufficiali
// della Segreteria di Stato Finanze e Bilancio del 25 maggio 2026. Mai date o regole che non sono lì.
// Il testo del decreto non era ancora sul sito del Consiglio Grande e Generale: si usa la copia pubblicata da HLB San Marino.
//
// GESTIONALI: i software per emettere le fatture con cui 739 ha un accordo (scelta di Alex del 18/10/2026).
// Si aggiungono qui solo dopo l'accordo firmato: finché è vuoto la pagina invita le software house a scriverci.

export const AGGIORNATO_IL = "2026-10-18";

export type Fonte = { nome: string; url: string; tipo: "ufficiale" | "studio" };

export const FONTI = {
  decreto: { nome: "Decreto Delegato 4 settembre 2026 n.133 (testo pubblicato da HLB San Marino)", url: "https://www.hlbsanmarino.com/wp-content/uploads/2026/09/171603612-DD133-2026-1.pdf", tipo: "ufficiale" },
  slide: { nome: "Segreteria di Stato Finanze e Bilancio, slide del 25 maggio 2026", url: "https://finanze.sm/pub1/dam/jcr:2651de7b-4955-4d29-9bd5-cc2d471ade55/25-05-2026%20Slides%20Fatturazione%20elettronica%20interna%20a%20San%20Marino.pdf", tipo: "ufficiale" },
  regole: { nome: "Ufficio Tributario, regole tecniche e procedurali FE-RSM, 25 maggio 2026", url: "https://finanze.sm/pub1/dam/jcr:e6cd3be5-20c0-4681-b57d-2b63bb8074f2/Fatturazione%20Elettronica%20Interna%20RSM%20(FE-RSM).pdf", tipo: "ufficiale" },
} satisfies Record<string, Fonte>;

/** Le date del decreto (art. 11) */
export const DATE = {
  facoltativa: "2026-10-01",
  obbligo: "2027-01-01",
  sanzioni: "2028-01-01",
};

/** Ricavi dell'anno solare precedente sotto i quali non c'è l'obbligo (art. 2, comma 2) */
export const SOGLIA = 100_000;
/** Sanzione per fattura o nota di variazione omessa o in ritardo (art. 6), dal 1° gennaio 2028 */
export const SANZIONE = 100;

export type Regola = { titolo: string; testo: string; articolo: string; fonte: keyof typeof FONTI };

/** Cosa cambia, in parole semplici, con l'articolo del decreto */
export const REGOLE: Regola[] = [
  {
    titolo: "Chi",
    testo: "Operatori economici, imprese agricole ed enti con codice operatore economico, per le fatture verso altri operatori sammarinesi con codice operatore economico. Per lo Stato e la Pubblica Amministrazione serve ancora un regolamento.",
    articolo: "Art. 2 e art. 11",
    fonte: "decreto",
  },
  {
    titolo: "Sotto i 100.000 € di ricavi",
    testo: "Chi l'anno prima ha dichiarato meno di 100.000 € di ricavi non è obbligato: fa la fattura cartacea, con gli stessi dati di quella elettronica. Può scegliere l'elettronica; da quel momento, o quando supera la soglia, resta obbligatoria anche negli anni dopo.",
    articolo: "Art. 2",
    fonte: "decreto",
  },
  {
    titolo: "Entro quando",
    testo: "Entro il secondo mese dopo la consegna dei beni, la fine del servizio o il pagamento dell'acconto. Esempio delle slide: consegna il 10 gennaio, fattura trasmessa entro il 31 marzo.",
    articolo: "Art. 3",
    fonte: "decreto",
  },
  {
    titolo: "Passa dall'HUB SM",
    testo: "La fattura si trasmette all'Ufficio Tributario tramite l'HUB SM, che la controlla e la mette a disposizione del cliente. Se viene scartata si considera non emessa: va corretta e mandata di nuovo con un nome file nuovo.",
    articolo: "Art. 4",
    fonte: "decreto",
  },
  {
    titolo: "Note di variazione",
    testo: "Seguono il formato della fattura a cui si riferiscono: elettroniche per le fatture elettroniche, cartacee per quelle cartacee.",
    articolo: "Art. 5",
    fonte: "decreto",
  },
  {
    titolo: "Se la fattura non ti arriva",
    testo: "Chi compra deve muoversi: passati due mesi dal termine, entro i trenta giorni dopo manda all'HUB SM un documento con i dati della fattura mancante (cartaceo all'Ufficio Tributario se non è obbligato all'elettronica).",
    articolo: "Art. 7",
    fonte: "decreto",
  },
  {
    titolo: "Conservazione",
    testo: "L'Ufficio Tributario non conserva le fatture per conto tuo: le puoi consultare e scaricare dall'HUB SM, ma la conservazione è a carico tuo (le regole arriveranno con un regolamento). I tempi sono quelli dell'art. 100 della Legge 166/2013.",
    articolo: "Art. 8",
    fonte: "decreto",
  },
];

/** Cosa serve all'operatore per emettere (regole tecniche FE-RSM) */
export const SERVE = [
  { titolo: "Un gestionale", testo: "Un software che prepara la fattura in XML (lo stesso formato delle fatture verso l'Italia) e la manda all'HUB SM." },
  { titolo: "Il TokenFE", testo: "Si ottiene su TribWEB, il portale dell'Ufficio Tributario, con un profilo aziendale." },
  { titolo: "La data di inizio", testo: "Su TribWEB, nell'anagrafica dell'operatore, la «Data di inizio fatturazione elettronica RSM»." },
  { titolo: "Un domicilio digitale", testo: "Registrato e attivo." },
];

export type Gestionale = {
  nome: string;
  /** Chi lo fa */
  societa: string;
  sito: string;
  descrizione: string;
  /** Cosa offre a chi arriva da 739, come scritto nell'accordo */
  offerta?: string;
  contatto?: string;
  /** Giorno dell'accordo con 739 (AAAA-MM-GG) */
  accordo_dal: string;
};

/** I gestionali convenzionati con 739: solo dopo un accordo firmato */
export const GESTIONALI: Gestionale[] = [];
