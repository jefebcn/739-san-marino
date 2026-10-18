// Calendario fiscale di San Marino: le scadenze fiscali e contributive per chi ha un'attività (Lavorare).
// Dati raccolti e verificati sul web da Alex il 16/10/2026 (fattura elettronica aggiunta da Claude il 18/10/2026, dal testo del DD 133/2026). È l'unico file da aggiornare ogni anno:
// la pagina (/lavorare/calendario-fiscale) e il file .ics si costruiscono da qui (modules/lavorare/calendario-fiscale.ts).
//
// Regole: mai date, link o riferimenti inventati. Se un dato manca resta vuoto e la voce è «da verificare».
// Ogni voce elenca le sue fonti (chiavi di FONTI): la pagina mostra per prima la più autorevole
// (ufficiale, poi studio o associazione, poi stampa).
//
// Una scadenza nuova:
// - con una data sola: { id, data: "AAAA-MM-GG", … }
// - ogni anno lo stesso giorno: { id, ricorrenza: { tipo: "annuale", date: [{ mese, giorno }] }, … }
//   (con `dal` o `al` se vale solo da o fino a un certo giorno)
// - ogni mese: { id, ricorrenza: { tipo: "mensile", giorno }, … }
// - senza data fissa: { id, ricorrenza: { tipo: "senza data", quando: "…" }, … }

export const AGGIORNATO_IL = "2026-10-18";

export type Categoria = "IGR" | "Ritenute" | "Contributi ISS" | "Dichiarazioni" | "Monofase/Importazioni" | "Bollo/Servizi" | "Altro";
export type Destinatario = "persone fisiche" | "persone giuridiche" | "autonomi e professionisti" | "datori di lavoro";
export type TipoFonte = "ufficiale" | "studio" | "stampa";
export type StatoVerifica = "confermato" | "dedotto" | "da verificare";

export type Fonte = { nome: string; url: string; tipo: TipoFonte };

/** Le fonti, con le sigle usate nella ricerca del 16/10/2026 */
export const FONTI = {
  "UFF-1": { nome: "Legge 12 novembre 2025 n. 141, Consiglio Grande e Generale", url: "https://www.consigliograndeegenerale.sm/on-line/home/archivio-leggi-decreti-e-regolamenti/documento17155359.html", tipo: "ufficiale" },
  "UFF-2": { nome: "Ufficio Tributario, gov.sm", url: "https://www.gov.sm/pub2/GovSM/Dipartimenti/Dipartimento-Economia-e-Finanze/Ufficio-Tributario.html", tipo: "ufficiale" },
  "UFF-3": { nome: "Circolari dell'Ufficio Tributario, gov.sm", url: "https://gov.sm/pub1/GovSM/Amministrazione-Trasparente/Atti-di-carattere-normativo-ed-amministrativo-generale/Direttive-Circolari-Istruzioni-Interpretazioni-di-norme-di-diritto/Circolari.html?ufficio=U017%20-%20Ufficio%20Tributario", tipo: "ufficiale" },
  "UFF-4": { nome: "ISS, servizi amministrativi e contributi", url: "https://www.iss.sm/on-line/home/servizi-generali-e-amministrativi/articolo49006992.html", tipo: "ufficiale" },
  "HLB-01": { nome: "HLB San Marino, scadenziario gennaio 2026", url: "https://www.hlbsanmarino.com/scadenziario-gennaio-2026/", tipo: "studio" },
  "HLB-04": { nome: "HLB San Marino, scadenziario aprile 2026", url: "https://www.hlbsanmarino.com/scadenziario-aprile-2026/", tipo: "studio" },
  "HLB-06": { nome: "HLB San Marino, scadenziario giugno 2026", url: "https://www.hlbsanmarino.com/scadenziario-giugno-2026/", tipo: "studio" },
  "HLB-07": { nome: "HLB San Marino, scadenziario luglio 2026", url: "https://www.hlbsanmarino.com/scadenziario-luglio-2026/", tipo: "studio" },
  "HLB-08": { nome: "HLB San Marino, scadenziario agosto 2026", url: "https://www.hlbsanmarino.com/scadenziario-agosto-2026/", tipo: "studio" },
  "HLB-09": { nome: "HLB San Marino, scadenziario settembre 2026", url: "https://www.hlbsanmarino.com/scadenziario-settembre-2026/", tipo: "studio" },
  "HLB-10": { nome: "HLB San Marino, scadenziario ottobre 2026", url: "https://www.hlbsanmarino.com/scadenziario-ottobre-2026/", tipo: "studio" },
  "HLB-LEG": { nome: "HLB San Marino, sintesi della Legge 141/2025", url: "https://www.hlbsanmarino.com/legge-12-novembre-2025-nr-141-modifiche-alla-legge-16-dicembre-2013-n-166-imposta-generale-sui-redditi-e-successive-modifiche/", tipo: "studio" },
  USC: { nome: "USC, scadenziario adempimenti", url: "https://www.usc.sm/scadenziario-adempimenti/", tipo: "studio" },
  "DD-133": { nome: "Decreto Delegato 4 settembre 2026 n. 133 (testo pubblicato da HLB San Marino)", url: "https://www.hlbsanmarino.com/wp-content/uploads/2026/09/171603612-DD133-2026-1.pdf", tipo: "ufficiale" },
  "UFF-FE": { nome: "Segreteria di Stato Finanze e Bilancio, fattura elettronica interna (25 maggio 2026)", url: "https://finanze.sm/pub1/dam/jcr:2651de7b-4955-4d29-9bd5-cc2d471ade55/25-05-2026%20Slides%20Fatturazione%20elettronica%20interna%20a%20San%20Marino.pdf", tipo: "ufficiale" },
  "STAMPA-1": { nome: "San Marino RTV, proroga al 31 agosto", url: "https://www.sanmarinortv.sm/news/economia-c5/dichiarazioni-dei-redditi-prorogata-al-31-agosto-a292195", tipo: "stampa" },
  "STAMPA-2": { nome: "GiornaleSM, proroga e DD 80/2026", url: "https://giornalesm.com/san-marino-proroga-fiscale-slitta-al-31-agosto-la-scadenza-per-le-dichiarazioni-dei-redditi-delle-persone-fisiche/", tipo: "stampa" },
} satisfies Record<string, Fonte>;
export type SiglaFonte = keyof typeof FONTI;

/** Un giorno dell'anno; `ultimo` vale l'ultimo giorno del mese (febbraio 28 o 29) */
export type GiornoAnno = { mese: number; giorno: number | "ultimo"; nota?: string; stato?: StatoVerifica; fonti?: SiglaFonte[] };

export type Ricorrenza =
  | { tipo: "mensile"; giorno: number; noteMese?: Record<number, string> }
  | { tipo: "annuale"; date: GiornoAnno[] }
  | { tipo: "senza data"; quando: string };

export type Voce = {
  id: string;
  /** Una data sola (AAAA-MM-GG); in alternativa `ricorrenza` */
  data?: string;
  ricorrenza?: Ricorrenza;
  /** Per le ricorrenze: da quando e fino a quando valgono (AAAA-MM-GG) */
  dal?: string;
  al?: string;
  titolo: string;
  descrizione: string;
  categoria: Categoria;
  destinatari: Destinatario[];
  /** Chi riguarda, a parole, come nella fonte */
  per_chi: string;
  fonti: SiglaFonte[];
  riferimento_normativo: string;
  stato_verifica: StatoVerifica;
  note: string;
};

const TUTTI: Destinatario[] = ["persone fisiche", "persone giuridiche", "autonomi e professionisti", "datori di lavoro"];
const IMPRESE: Destinatario[] = ["persone giuridiche", "autonomi e professionisti"];

export const VOCI: Voce[] = [
  // ——— Ricorrenti ———
  {
    id: "iss-mensile",
    ricorrenza: { tipo: "mensile", giorno: 20, noteMese: { 1: "A gennaio anche la tredicesima." } },
    titolo: "Contributi ISS, FSS e Fondiss dei dipendenti",
    descrizione: "Versamento dei contributi ISS, FSS e Fondiss dei lavoratori dipendenti per il mese precedente.",
    categoria: "Contributi ISS",
    destinatari: ["datori di lavoro"],
    per_chi: "Datori di lavoro",
    fonti: ["UFF-4", "HLB-10", "USC"],
    riferimento_normativo: "",
    stato_verifica: "confermato",
    note: "",
  },
  {
    id: "ritenute-bimestrali",
    ricorrenza: {
      tipo: "annuale",
      date: [
        { mese: 2, giorno: "ultimo", nota: "Per novembre e dicembre dell'anno prima.", stato: "dedotto", fonti: ["USC"] },
        { mese: 4, giorno: 30, nota: "Per gennaio e febbraio.", fonti: ["HLB-04", "USC"] },
        { mese: 6, giorno: 30, nota: "Per marzo e aprile.", fonti: ["HLB-06", "USC"] },
        { mese: 8, giorno: 31, nota: "Per maggio e giugno.", fonti: ["HLB-08", "USC"] },
        { mese: 10, giorno: 31, nota: "Per luglio e agosto.", fonti: ["HLB-10", "USC"] },
        { mese: 12, giorno: 31, nota: "Per settembre e ottobre.", stato: "dedotto", fonti: ["USC"] },
      ],
    },
    titolo: "Ritenute IGR e imposta speciale di bollo del bimestre",
    descrizione:
      "Ritenute IGR su lavoro dipendente e autonomo (20% sugli autonomi); ritenuta del 5% sugli utili prelevati; ritenuta del 10% su noleggi e royalties; ritenuta del 13% sugli interessi passivi a banche estere; imposta speciale di bollo su agenzia e rappresentanza (3–6%) e su pubblicità ed elaborazione dati (3%).",
    categoria: "Ritenute",
    destinatari: ["datori di lavoro", "persone giuridiche", "autonomi e professionisti"],
    per_chi: "Sostituti d'imposta e operatori soggetti all'imposta speciale di bollo",
    fonti: ["HLB-04", "HLB-06", "HLB-08", "HLB-10", "USC"],
    riferimento_normativo: "",
    stato_verifica: "confermato",
    note: "Entro la fine del bimestre successivo. Le date del 31 dicembre e di fine febbraio sono dedotte dalla regola.",
  },
  {
    id: "monofase",
    ricorrenza: { tipo: "senza data", quando: "Alla scadenza indicata sull'avviso o sul cedolino dell'Ufficio Tributario" },
    titolo: "Imposta monofase sulle importazioni",
    descrizione: "Versamento dell'imposta monofase (imposta sulle importazioni), pagabile anche online da TribWeb (gov.sm, Conto Fiscale).",
    categoria: "Monofase/Importazioni",
    destinatari: IMPRESE,
    per_chi: "Importatori",
    fonti: ["UFF-2", "USC"],
    riferimento_normativo: "",
    stato_verifica: "confermato",
    note: "Non è una data fissa.",
  },

  // ——— Annuali ———
  {
    id: "complementare-2-semestre",
    ricorrenza: { tipo: "annuale", date: [{ mese: 1, giorno: 31 }] },
    titolo: "Imposta complementare del 3% sui servizi del secondo semestre",
    descrizione: "Imposta complementare del 3% sui servizi resi a privati nel secondo semestre dell'anno precedente.",
    categoria: "Bollo/Servizi",
    destinatari: IMPRESE,
    per_chi: "Operatori economici",
    fonti: ["HLB-01", "USC"],
    riferimento_normativo: "L. 194/2010, art. 48",
    stato_verifica: "confermato",
    note: "",
  },
  {
    id: "gestione-separata",
    ricorrenza: { tipo: "annuale", date: [{ mese: 1, giorno: 31 }] },
    titolo: "Gestione separata e Fondiss di amministratori, CO.CO.PRO e soci lavoratori",
    descrizione: "Versamento della gestione separata e del Fondiss per amministratori, collaboratori a progetto e soci lavoratori.",
    categoria: "Contributi ISS",
    destinatari: ["persone giuridiche"],
    per_chi: "Società",
    fonti: ["HLB-01"],
    riferimento_normativo: "L. 158/2011, art. 4; DD 199/2023",
    stato_verifica: "confermato",
    note: "",
  },
  {
    id: "smac-detrazioni",
    ricorrenza: { tipo: "annuale", date: [{ mese: 1, giorno: 31 }] },
    titolo: "Adesione alle detrazioni SMaC da comunicare al datore di lavoro",
    descrizione: "I dipendenti comunicano al datore di lavoro l'adesione alle detrazioni SMaC.",
    categoria: "IGR",
    destinatari: ["persone fisiche", "datori di lavoro"],
    per_chi: "Lavoratori dipendenti",
    fonti: ["HLB-01"],
    riferimento_normativo: "",
    stato_verifica: "confermato",
    note: "",
  },
  {
    id: "modello-igr-g",
    ricorrenza: { tipo: "annuale", date: [{ mese: 4, giorno: 15 }] },
    titolo: "Modello IGR G dei sostituti d'imposta",
    descrizione: "Trasmissione telematica del Modello IGR G (sostituti d'imposta) per l'anno precedente.",
    categoria: "Dichiarazioni",
    destinatari: ["datori di lavoro", "persone giuridiche"],
    per_chi: "Sostituti d'imposta",
    fonti: ["HLB-04", "USC"],
    riferimento_normativo: "",
    stato_verifica: "confermato",
    note: "",
  },
  {
    id: "complementare-1-semestre",
    ricorrenza: { tipo: "annuale", date: [{ mese: 7, giorno: 31 }] },
    titolo: "Imposta complementare del 3% sui servizi del primo semestre",
    descrizione: "Imposta complementare del 3% sui servizi resi a privati nel primo semestre.",
    categoria: "Bollo/Servizi",
    destinatari: IMPRESE,
    per_chi: "Operatori economici",
    fonti: ["HLB-07", "USC"],
    riferimento_normativo: "L. 194/2010, art. 48",
    stato_verifica: "confermato",
    note: "",
  },
  {
    id: "dichiarazione-pg-2026",
    data: "2026-07-31",
    titolo: "Persone giuridiche: dichiarazione IGR P, IGR O e allegati, con il conguaglio",
    descrizione: "Dichiarazione IGR P, IGR O (sostituto d'imposta) e allegati (bollo, imposta complementare), con il pagamento del conguaglio.",
    categoria: "Dichiarazioni",
    destinatari: ["persone giuridiche"],
    per_chi: "Persone giuridiche",
    fonti: ["HLB-07"],
    riferimento_normativo: "L. 166/2013, art. 92; L. 179/2005, art. 39; L. 194/2010, art. 48",
    stato_verifica: "confermato",
    note: "",
  },
  {
    id: "modello-q-2026",
    data: "2026-07-31",
    titolo: "Modello Q: dichiarazione annuale dell'imposta sulle importazioni",
    descrizione: "Dichiarazione annuale dell'imposta sulle importazioni (monofase).",
    categoria: "Monofase/Importazioni",
    destinatari: IMPRESE,
    per_chi: "Importatori",
    fonti: ["HLB-07"],
    riferimento_normativo: "",
    stato_verifica: "confermato",
    note: "",
  },
  {
    id: "dichiarazione-pf-2026",
    data: "2026-08-31",
    titolo: "Persone fisiche: dichiarazione IGR L, M, N e conguaglio (proroga)",
    descrizione: "Dichiarazione dei redditi IGR L, M, N e pagamento del conguaglio IGR, contributi e Fondiss, per il periodo d'imposta 2025.",
    categoria: "Dichiarazioni",
    destinatari: ["persone fisiche", "autonomi e professionisti"],
    per_chi: "Persone fisiche",
    fonti: ["HLB-08", "STAMPA-1", "STAMPA-2"],
    riferimento_normativo: "Decreto Delegato 18 giugno 2026 n. 80",
    stato_verifica: "da verificare",
    note: "Proroga valida solo per il periodo d'imposta 2025. Manca ancora il link ufficiale al decreto.",
  },
  {
    id: "acconto-igr-1",
    ricorrenza: { tipo: "annuale", date: [{ mese: 8, giorno: 31 }] },
    titolo: "Primo acconto IGR (35%)",
    descrizione: "Primo acconto dell'IGR, pari al 35% dell'imposta dell'anno precedente.",
    categoria: "IGR",
    destinatari: IMPRESE,
    per_chi: "Persone giuridiche, autonomi e professionisti",
    fonti: ["UFF-1", "HLB-08"],
    riferimento_normativo: "L. 141/2025, art. 42",
    stato_verifica: "confermato",
    note: "Non è dovuto se l'attività è sospesa o cessata.",
  },
  {
    id: "acconto-contributi-1",
    ricorrenza: { tipo: "annuale", date: [{ mese: 8, giorno: 31 }] },
    titolo: "Primo acconto dei contributi previdenziali",
    descrizione: "Primo acconto dei contributi previdenziali di autonomi e professionisti.",
    categoria: "Contributi ISS",
    destinatari: ["autonomi e professionisti"],
    per_chi: "Autonomi e professionisti",
    fonti: ["HLB-08", "STAMPA-1"],
    riferimento_normativo: "",
    stato_verifica: "confermato",
    note: "",
  },
  {
    id: "accise-carburanti",
    ricorrenza: { tipo: "annuale", date: [{ mese: 8, giorno: 31 }] },
    titolo: "Rimborso delle accise sui carburanti del primo semestre",
    descrizione: "Richiesta di rimborso delle accise sui carburanti per il primo semestre.",
    categoria: "Altro",
    destinatari: IMPRESE,
    per_chi: "Autotrasportatori",
    fonti: ["HLB-08"],
    riferimento_normativo: "",
    stato_verifica: "confermato",
    note: "",
  },
  {
    id: "dapef-irafe",
    ricorrenza: { tipo: "annuale", date: [{ mese: 9, giorno: 30 }] },
    titolo: "DAPEF e versamento IRAFE",
    descrizione: "Dichiarazione delle attività finanziarie e delle partecipazioni all'estero (DAPEF) e versamento dell'IRAFE.",
    categoria: "Dichiarazioni",
    destinatari: ["persone fisiche"],
    per_chi: "Persone fisiche con attività all'estero",
    fonti: ["HLB-09", "STAMPA-2"],
    riferimento_normativo: "DD 29/2022; L. 207/2021, art. 4",
    stato_verifica: "confermato",
    note: "",
  },
  {
    id: "libri-contabili",
    ricorrenza: { tipo: "annuale", date: [{ mese: 9, giorno: 30 }] },
    titolo: "Aggiornamento dei libri contabili vidimati",
    descrizione: "Aggiornamento dei libri contabili vidimati con i dati dell'anno precedente.",
    categoria: "Altro",
    destinatari: IMPRESE,
    per_chi: "Operatori economici",
    fonti: ["HLB-09"],
    riferimento_normativo: "L. 166/2013, art. 96, modificato dalla L. 141/2025",
    stato_verifica: "confermato",
    note: "",
  },
  {
    id: "rivalutazione-2026",
    data: "2026-10-31",
    titolo: "Ultimo termine per la rivalutazione dei beni strumentali",
    descrizione: "Ultimo giorno per la rivalutazione dei beni strumentali.",
    categoria: "IGR",
    destinatari: IMPRESE,
    per_chi: "Imprese",
    fonti: ["HLB-10"],
    riferimento_normativo: "L. 15/2025",
    stato_verifica: "confermato",
    note: "",
  },
  {
    id: "acconto-igr-2",
    ricorrenza: { tipo: "annuale", date: [{ mese: 11, giorno: 30 }] },
    titolo: "Secondo acconto IGR (55%)",
    descrizione: "Secondo acconto dell'IGR, pari al 55% dell'imposta dell'anno precedente.",
    categoria: "IGR",
    destinatari: IMPRESE,
    per_chi: "Persone giuridiche, autonomi e professionisti",
    fonti: ["UFF-1", "HLB-07"],
    riferimento_normativo: "L. 141/2025, art. 42",
    stato_verifica: "confermato",
    note: "Non è dovuto se l'attività è sospesa o cessata.",
  },
  {
    id: "acconto-contributi-2",
    ricorrenza: { tipo: "annuale", date: [{ mese: 11, giorno: 30 }] },
    titolo: "Secondo acconto dei contributi previdenziali",
    descrizione: "Secondo acconto dei contributi previdenziali di autonomi e professionisti.",
    categoria: "Contributi ISS",
    destinatari: ["autonomi e professionisti"],
    per_chi: "Autonomi e professionisti",
    fonti: ["USC", "STAMPA-1"],
    riferimento_normativo: "",
    stato_verifica: "da verificare",
    note: "Da verificare per il 2026.",
  },
  {
    id: "dichiarazione-tutti",
    ricorrenza: { tipo: "annuale", date: [{ mese: 7, giorno: 31 }] },
    dal: "2027-01-01",
    titolo: "Dichiarazione dei redditi",
    descrizione: "Dichiarazione dei redditi entro il 31 luglio per tutti, dal periodo d'imposta 2026, salvo nuove proroghe.",
    categoria: "Dichiarazioni",
    destinatari: TUTTI,
    per_chi: "Tutti",
    fonti: ["UFF-1"],
    riferimento_normativo: "L. 141/2025, art. 25",
    stato_verifica: "confermato",
    note: "Se presentata entro 30 giorni dalla scadenza è valida, ma con sanzione.",
  },
  // ——— Fattura elettronica tra operatori sammarinesi (DD 133/2026, letto il 18/10/2026) ———
  {
    id: "fe-obbligo",
    data: "2027-01-01",
    titolo: "Fattura elettronica obbligatoria tra operatori sammarinesi",
    descrizione: "Le fatture e le note di variazione verso altri operatori sammarinesi con codice operatore economico vanno emesse in formato elettronico e trasmesse all'HUB SM. Esclusi, salvo opzione, i soggetti con ricavi dell'anno precedente sotto 100.000 €, che fanno la fattura cartacea.",
    categoria: "Altro",
    destinatari: IMPRESE,
    per_chi: "Operatori economici con ricavi dell'anno precedente da 100.000 € in su",
    fonti: ["DD-133", "UFF-FE"],
    riferimento_normativo: "DD 4 settembre 2026 n. 133, art. 2 e art. 11",
    stato_verifica: "confermato",
    note: "Dal 1° ottobre al 31 dicembre 2026 è facoltativa. Per lo Stato e la Pubblica Amministrazione serve un regolamento.",
  },
  {
    id: "fe-sanzioni",
    data: "2028-01-01",
    titolo: "Fattura elettronica: partono le sanzioni",
    descrizione: "Sanzione di 100 € per la fattura o la nota di variazione omessa o trasmessa in ritardo; vale anche per le fatture cartacee non predisposte o non consegnate, e per il cliente che non regolarizza la fattura non ricevuta.",
    categoria: "Altro",
    destinatari: IMPRESE,
    per_chi: "Operatori economici",
    fonti: ["DD-133"],
    riferimento_normativo: "DD 4 settembre 2026 n. 133, art. 6, 7 e 11",
    stato_verifica: "confermato",
    note: "",
  },
  {
    id: "fe-termini",
    ricorrenza: { tipo: "senza data", quando: "Entro il secondo mese dopo consegna, fine del servizio o pagamento dell'acconto" },
    dal: "2026-10-01",
    titolo: "Fattura elettronica: termine di trasmissione all'HUB SM",
    descrizione: "La fattura elettronica va predisposta e trasmessa entro il secondo mese successivo alla consegna o spedizione dei beni, all'ultimazione del servizio o al pagamento dell'acconto. Scartata dall'HUB SM, si considera non emessa.",
    categoria: "Altro",
    destinatari: IMPRESE,
    per_chi: "Chi emette fattura elettronica verso operatori sammarinesi",
    fonti: ["DD-133", "UFF-FE"],
    riferimento_normativo: "DD 4 settembre 2026 n. 133, art. 3 e 4",
    stato_verifica: "confermato",
    note: "",
  },
];

/** Contatti per verificare, scritti nel disclaimer */
export const CONTATTI = {
  tributario: { nome: "Ufficio Tributario", email: "info.tributario@pa.sm", telefono: "0549 885015" },
  iss: { nome: "ISS", email: "contributi@iss.sm", telefono: "0549 994343" },
};
