import type { NomeIcona } from "@/components/Icona";

// Le cinque aree di 739 (docs/piano.md) e le loro sezioni. È l'unico elenco: lo usano Esplora,
// le pagine delle aree, la ricerca, le azioni rapide e i filtri della mappa.
// Una sezione senza `href` è "in arrivo": nell'area compare con la riga che dice cosa conterrà.

export type SlugArea = "vivere" | "uscire" | "sport" | "comunita" | "lavorare";

export type Sezione = {
  slug: string;
  nome: string;
  /** Una riga: cosa trovi qui, o cosa conterrà se è in arrivo */
  descrizione: string;
  icona: NomeIcona;
  href?: string;
  /** Categorie di `luoghi` mostrate in questa sezione (elenco e mappa) */
  categorie?: string[];
  /** Solo questi tipi (sottocategorie) delle categorie: la sezione è una parte di un'altra (Volontariato tra le associazioni) */
  tipi?: string[];
  /** Parole in più per la ricerca */
  parole?: string;
};

export type Area = {
  slug: SlugArea;
  nome: string;
  descrizione: string;
  /** Cosa c'è, in poche parole: la riga sotto il nome in Oggi, per chi arriva */
  breve: string;
  icona: NomeIcona;
  href: string;
  sezioni: Sezione[];
};

export const AREE: Area[] = [
  {
    slug: "vivere",
    nome: "Vivere",
    descrizione: "Servizi, uffici, salute, trasporti: quello che serve ogni giorno.",
    breve: "Farmacie, uffici, bus e parcheggi",
    icona: "vivere",
    href: "/vivere",
    sezioni: [
      { slug: "avvisi", nome: "Avvisi e chiusure", descrizione: "Strade chiuse, servizi sospesi, allerte meteo.", icona: "avvisi", href: "/vivere/avvisi", categorie: ["avviso"], parole: "avvisi chiusure strade lavori allerta" },
      { slug: "uffici", nome: "Uffici pubblici", descrizione: "Dove andare e cosa portare per ogni pratica.", icona: "uffici", href: "/vivere/uffici", categorie: ["ufficio"], parole: "uffici pubblici pratiche documenti carta identita anagrafe" },
      { slug: "salute", nome: "Salute e farmacie", descrizione: "Farmacie aperte adesso, ospedale e centri sanitari.", icona: "farmacia", href: "/vivere/salute", categorie: ["salute", "farmacia"], parole: "farmacia farmacie medicine salute ospedale cailungo medico centro sanitario iss" },
      { slug: "trasporti", nome: "Bus e funivia", descrizione: "Prossime partenze e tabellone.", icona: "trasporti", href: "/utili/trasporti", categorie: ["trasporti"], parole: "funivia bus autobus rimini orari trasporti" },
      { slug: "parcheggi", nome: "Parcheggi", descrizione: "Posti, tariffe e indicazioni.", icona: "parcheggio", href: "/utili/parcheggi", categorie: ["parcheggio"], parole: "parcheggi parcheggio auto camper p9 multipiano" },
      { slug: "rifiuti", nome: "Raccolta rifiuti", descrizione: "Il calendario del tuo castello.", icona: "rifiuti", href: "/utili/rifiuti", parole: "rifiuti raccolta spazzatura differenziata carta plastica vetro organico" },
      { slug: "meteo", nome: "Meteo", descrizione: "Adesso, prossime ore e settimana.", icona: "meteo", href: "/utili/meteo", parole: "meteo tempo pioggia previsioni temperatura" },
      { slug: "poste-banche", nome: "Poste, banche e carburante", descrizione: "Uffici postali, banche, bancomat e distributori.", icona: "banca", href: "/vivere/poste-banche", categorie: ["posta", "banca", "carburante"], parole: "poste posta ufficio postale banca banche bancomat atm soldi prelievo benzina carburante distributore gasolio diesel gpl metano" },
      { slug: "servizi", nome: "Bagni, fontanelle e ricarica", descrizione: "Bagni pubblici, acqua potabile e colonnine per l'auto elettrica.", icona: "servizi", href: "/vivere/servizi", categorie: ["bagni", "acqua", "ricarica", "servizio"], parole: "bagni toilette fontanelle acqua ricarica colonnine elettrica" },
      { slug: "animali", nome: "Animali", descrizione: "Veterinari, toelettature, centri cinofili e il rifugio.", icona: "animali", href: "/vivere/animali", categorie: ["animali"], parole: "animali veterinario veterinari cane cani gatto gatti toelettatura canile rifugio apas cinofilo addestramento" },
      { slug: "scuola", nome: "Scuola e famiglia", descrizione: "Nidi, scuole dell'infanzia, elementari, medie e università.", icona: "scuola", href: "/vivere/scuola", categorie: ["scuola"], parole: "scuola scuole nido asilo infanzia materna elementari medie superiori liceo universita famiglia bambini" },
    ],
  },
  {
    slug: "uscire",
    nome: "Uscire",
    descrizione: "Eventi, posti da vedere, dove mangiare e dormire.",
    breve: "Eventi, locali, negozi e musei",
    icona: "uscire",
    href: "/uscire",
    sezioni: [
      { slug: "eventi", nome: "Eventi", descrizione: "Il calendario di cosa succede sul Titano.", icona: "eventi", href: "/eventi", parole: "eventi calendario concerti serate spettacoli mostre" },
      { slug: "mangiare", nome: "Mangiare e bere", descrizione: "Ristoranti, pizzerie, bar e gelaterie, con indirizzo e orari.", icona: "food", href: "/uscire/mangiare", categorie: ["locale"], parole: "mangiare bere ristoranti ristorante bar caffe pizzeria pizza piadina piadineria gelato gelateria pub cena pranzo food" },
      { slug: "cultura", nome: "Musei e monumenti", descrizione: "Musei, torri, porte e monumenti.", icona: "cultura", href: "/uscire/cultura", categorie: ["cultura", "luogo"], parole: "musei museo monumenti torri guaita cesta montale" },
      { slug: "natura", nome: "Panorami e natura", descrizione: "I punti panoramici del territorio.", icona: "panorama", href: "/uscire/natura", categorie: ["panorama"], parole: "panorama panorami vista natura sentieri" },
      { slug: "dormire", nome: "Dormire", descrizione: "Hotel, b&b e agriturismi.", icona: "dormire", parole: "dormire hotel albergo bed breakfast agriturismo" },
      { slug: "negozi", nome: "Negozi e outlet", descrizione: "Souvenir, gioiellerie, alimentari, abbigliamento e centri commerciali.", icona: "negozi", href: "/uscire/negozi", categorie: ["negozio"], parole: "negozi negozio shopping outlet botteghe souvenir gioielleria gioielli orologi armeria supermercato alimentari abbigliamento vestiti profumeria tabacchi centro commerciale" },
      { slug: "itinerari", nome: "Itinerari", descrizione: "Percorsi a piedi per scoprire il territorio.", icona: "itinerari", parole: "itinerari percorsi passeggiate trekking" },
    ],
  },
  {
    slug: "sport",
    nome: "Sport",
    descrizione: "Partite aperte, rating, classifiche e impianti.",
    breve: "Partite, tornei e impianti",
    icona: "sport",
    href: "/sport",
    sezioni: [
      { slug: "partite", nome: "Partite aperte", descrizione: "Trova una partita o organizzane una.", icona: "partite", href: "/sport", parole: "partita partite calcetto padel tennis basket pallavolo rating classifica" },
      { slug: "impianti", nome: "Impianti sportivi", descrizione: "Campi, palestre, piscine e stadi.", icona: "impianti", href: "/sport/impianti", categorie: ["impianto"], parole: "impianti campi palestra piscina stadio" },
      { slug: "tornei", nome: "Tornei di castello", descrizione: "Squadre che giocano per il proprio castello.", icona: "tornei", href: "/sport/tornei", parole: "tornei torneo castello squadre" },
      { slug: "societa", nome: "Società sportive", descrizione: "Le società e le federazioni del territorio.", icona: "coppa", href: "/sport/societa", categorie: ["associazione"], tipi: ["sportiva"], parole: "societa sportive federazioni cons club squadra calcio" },
    ],
  },
  {
    slug: "comunita",
    nome: "Comunità",
    descrizione: "I 9 castelli, associazioni, volontariato e chiese.",
    breve: "Castelli, associazioni e chiese",
    icona: "comunita",
    href: "/comunita",
    sezioni: [
      { slug: "castelli", nome: "I 9 castelli", descrizione: "La classifica in metri e la pagina di ogni castello.", icona: "castelli", href: "/castelli", parole: "castelli classifica metri citta borgo maggiore serravalle domagnano" },
      { slug: "giunte", nome: "Giunte di castello", descrizione: "Le nove Giunte: sede, telefono, email e Capitano di castello.", icona: "giunte", href: "/comunita/giunte", categorie: ["ufficio"], tipi: ["giunta di castello"], parole: "giunte giunta capitano castello casa del castello" },
      { slug: "associazioni", nome: "Associazioni", descrizione: "Culturali, di volontariato, sportive, circoli e associazioni di categoria.", icona: "gruppo", href: "/comunita/associazioni", categorie: ["associazione"], parole: "associazioni associazione club circolo circoli fondazione sindacati sindacato ordine" },
      { slug: "volontariato", nome: "Volontariato", descrizione: "Le associazioni dove dare una mano.", icona: "associazioni", href: "/comunita/volontariato", categorie: ["associazione"], tipi: ["volontariato"], parole: "volontariato volontari aiutare onlus" },
      { slug: "chiese", nome: "Chiese", descrizione: "Le chiese del territorio. Gli orari delle messe arriveranno dalle parrocchie.", icona: "chiese", href: "/comunita/chiese", categorie: ["chiesa"], parole: "chiese chiesa messe messa parrocchia basilica pieve santuario culto" },
      { slug: "bacheca", nome: "Bacheca", descrizione: "Annunci e iniziative di chi vive qui.", icona: "bacheca", parole: "bacheca annunci" },
    ],
  },
  {
    slug: "lavorare",
    nome: "Lavorare",
    descrizione: "Aziende, professionisti, offerte di lavoro e bandi.",
    breve: "Aziende, studi e artigiani",
    icona: "lavorare",
    href: "/lavorare",
    sezioni: [
      { slug: "aziende", nome: "Aziende", descrizione: "Le imprese del territorio, con contatti e cosa fanno.", icona: "business", href: "/lavorare/aziende", categorie: ["azienda"], parole: "aziende imprese ditte business" },
      { slug: "professionisti", nome: "Professionisti", descrizione: "Commercialisti, avvocati, architetti, tecnici.", icona: "professionisti", href: "/lavorare/professionisti", categorie: ["professionista"], parole: "professionisti commercialista avvocato architetto notaio" },
      { slug: "artigiani", nome: "Artigiani", descrizione: "Idraulici, elettricisti, falegnami e altri mestieri.", icona: "artigiani", href: "/lavorare/artigiani", categorie: ["artigiano"], parole: "artigiani idraulico elettricista falegname" },
      { slug: "lavoro", nome: "Offerte di lavoro", descrizione: "Chi cerca personale a San Marino.", icona: "lavoro", parole: "lavoro offerte annunci cerco personale" },
      { slug: "fiere", nome: "Fiere e convegni", descrizione: "Appuntamenti per chi lavora: fiere, convegni e incontri.", icona: "fiere", href: "/lavorare/fiere", parole: "fiere fiera convegni convegno congressi kursaal incontri formazione" },
      { slug: "bandi", nome: "Bandi", descrizione: "Contributi e bandi pubblici.", icona: "bandi", parole: "bandi contributi finanziamenti" },
    ],
  },
];

export const area = (slug: string) => AREE.find((a) => a.slug === slug);

export function sezione(slugArea: string, slugSezione: string) {
  return area(slugArea)?.sezioni.find((s) => s.slug === slugSezione);
}

/** Area di una categoria di luoghi (per raggruppare i filtri della mappa). Conta la sezione che la elenca tutta. */
export function areaDiCategoria(categoria: string): SlugArea | null {
  for (const a of AREE) for (const s of a.sezioni) if (!s.tipi && s.categorie?.includes(categoria)) return a.slug;
  return null;
}

/** Dove torna indietro la scheda di un luogo: la sezione che lo elenca (quella del suo tipo, se c'è), altrimenti la sua area, altrimenti la mappa. */
export function ritornoDiCategoria(categoria: string, sottocategoria?: string | null): { href: string; nome: string } {
  const sezioni = AREE.flatMap((a) => a.sezioni.filter((s) => s.categorie?.includes(categoria)).map((s) => ({ a, s })));
  const x = sezioni.find(({ s }) => sottocategoria && s.tipi?.includes(sottocategoria)) ?? sezioni.find(({ s }) => !s.tipi);
  if (!x) return { href: "/mappa", nome: "Mappa" };
  return x.s.href ? { href: x.s.href, nome: x.s.nome } : { href: x.a.href, nome: x.a.nome };
}
