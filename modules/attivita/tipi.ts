// I tipi di attività che un titolare può aggiungere, per categoria: gli stessi di tipi_attivita() (migrazione 0036).
// `nome` è come si legge da solo nella scheda e nel modulo.

export type CategoriaNuova = "locale" | "negozio" | "azienda" | "professionista" | "artigiano";

export const CATEGORIE_NUOVE: { categoria: CategoriaNuova; nome: string; esempio: string }[] = [
  { categoria: "azienda", nome: "Azienda", esempio: "Un'impresa: informatica, edilizia, industria, turismo…" },
  { categoria: "professionista", nome: "Studio professionale", esempio: "Commercialista, avvocato, architetto, geometra…" },
  { categoria: "artigiano", nome: "Artigiano", esempio: "Idraulico, elettricista, falegname, parrucchiere…" },
  { categoria: "locale", nome: "Locale", esempio: "Ristorante, pizzeria, bar, gelateria…" },
  { categoria: "negozio", nome: "Negozio", esempio: "Souvenir, abbigliamento, alimentari…" },
];

export const TIPI: Record<CategoriaNuova, { tipo: string; nome: string }[]> = {
  azienda: [
    { tipo: "informatica", nome: "Informatica e web" },
    { tipo: "edilizia", nome: "Edilizia e immobili" },
    { tipo: "industria", nome: "Industria e produzione" },
    { tipo: "commercio", nome: "Commercio e distribuzione" },
    { tipo: "finanza", nome: "Finanza e assicurazioni" },
    { tipo: "turismo", nome: "Turismo e ospitalità" },
    { tipo: "trasporti e logistica", nome: "Trasporti e logistica" },
    { tipo: "comunicazione", nome: "Comunicazione e marketing" },
    { tipo: "consulenza", nome: "Consulenza" },
    { tipo: "altro", nome: "Altro" },
  ],
  professionista: [
    { tipo: "commercialista", nome: "Commercialista" },
    { tipo: "avvocato", nome: "Avvocato" },
    { tipo: "notaio", nome: "Notaio" },
    { tipo: "architetto", nome: "Architetto" },
    { tipo: "ingegnere", nome: "Ingegnere" },
    { tipo: "geometra", nome: "Geometra" },
    { tipo: "agenzia immobiliare", nome: "Agenzia immobiliare" },
    { tipo: "assicurazioni", nome: "Assicurazioni" },
    { tipo: "studio medico", nome: "Studio medico" },
    { tipo: "consulente", nome: "Consulente" },
    { tipo: "altro", nome: "Altro" },
  ],
  artigiano: [
    { tipo: "idraulico", nome: "Idraulico" },
    { tipo: "elettricista", nome: "Elettricista" },
    { tipo: "falegname", nome: "Falegname" },
    { tipo: "edile", nome: "Impresa edile" },
    { tipo: "fabbro", nome: "Fabbro" },
    { tipo: "imbianchino", nome: "Imbianchino" },
    { tipo: "meccanico", nome: "Meccanico e carrozziere" },
    { tipo: "parrucchiere", nome: "Parrucchiere ed estetista" },
    { tipo: "sartoria", nome: "Sartoria" },
    { tipo: "giardiniere", nome: "Giardiniere" },
    { tipo: "altro", nome: "Altro" },
  ],
  locale: [
    { tipo: "ristorante", nome: "Ristorante" },
    { tipo: "pizzeria", nome: "Pizzeria" },
    { tipo: "piadineria", nome: "Piadineria" },
    { tipo: "cibo veloce", nome: "Cibo veloce" },
    { tipo: "bar", nome: "Bar" },
    { tipo: "gelateria", nome: "Gelateria" },
    { tipo: "pub", nome: "Pub" },
  ],
  negozio: [
    { tipo: "souvenir", nome: "Souvenir" },
    { tipo: "gioielleria", nome: "Gioielleria" },
    { tipo: "armeria", nome: "Armeria" },
    { tipo: "alimentari", nome: "Alimentari" },
    { tipo: "abbigliamento", nome: "Abbigliamento" },
    { tipo: "profumeria", nome: "Profumeria" },
    { tipo: "tabaccheria", nome: "Tabaccheria" },
    { tipo: "centro commerciale", nome: "Centro commerciale" },
    { tipo: "casa", nome: "Casa e fai da te" },
    { tipo: "elettronica", nome: "Elettronica" },
    { tipo: "libri e giochi", nome: "Libri, musica e giochi" },
    { tipo: "auto", nome: "Auto e moto" },
    { tipo: "servizi", nome: "Servizi" },
    { tipo: "negozio", nome: "Altro negozio" },
  ],
};

export const eCategoriaNuova = (c: string | null | undefined): c is CategoriaNuova => !!c && c in TIPI;
