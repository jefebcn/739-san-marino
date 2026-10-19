/*
 * Italiano e inglese. Le pagine italiane restano dove sono; quelle inglesi stanno sotto /en con indirizzi inglesi
 * (/en/map, /en/places/<id>…) e usano gli stessi componenti con la lingua come parametro.
 * Senza dipendenze dal server: si usa anche nel browser (testata, barra in basso, interruttore).
 * Una pagina inglese nuova: si crea in app/en/… e si aggiunge la coppia in PERCORSI (o in DINAMICI).
 */

import type { Metadata } from "next";

export type Lingua = "it" | "en";

export const TZ = "Europe/San_Marino";

export function linguaDi(path: string | null | undefined): Lingua {
  return path === "/en" || path?.startsWith("/en/") ? "en" : "it";
}

/** Le pagine che esistono in tutte e due le lingue: italiano, inglese */
const PERCORSI: [string, string][] = [
  ["/", "/en"],
  ["/mappa", "/en/map"],
  ["/eventi", "/en/events"],
  ["/uscire/mangiare", "/en/eat"],
  ["/uscire/dormire", "/en/stay"],
  ["/uscire/cultura", "/en/sights"],
  ["/uscire/natura", "/en/viewpoints"],
  ["/uscire/itinerari", "/en/trails"],
  ["/utili/farmacie", "/en/pharmacies"],
  ["/utili/trasporti", "/en/transport"],
  ["/utili/parcheggi", "/en/parking"],
];

/** Pagine inglesi senza una gemella italiana precisa: l'interruttore porta qui */
const VERSO_IT: Record<string, string> = { "/en/emergency": "/vivere" };

/** Pagine con un id: la parte dopo il prefisso resta uguale */
const DINAMICI: [string, string][] = [["/luoghi", "/en/places"], ["/eventi", "/en/events"], ["/uscire/itinerari", "/en/trails"]];

/** Le pagine inglesi fisse, per la mappa del sito */
export const PAGINE_EN = [...PERCORSI.map((p) => p[1]), ...Object.keys(VERSO_IT)];

/** La stessa pagina nell'altra lingua; se non c'è ancora, la prima pagina di quella lingua */
export function percorsoIn(lingua: Lingua, path: string): string {
  return traduzione(lingua, path) ?? (lingua === "en" ? "/en" : "/");
}

/** La stessa pagina nell'altra lingua, solo se esiste */
export function traduzione(lingua: Lingua, path: string): string | null {
  const da = lingua === "en" ? 0 : 1;
  const a = 1 - da;
  if (lingua === "it" && VERSO_IT[path]) return VERSO_IT[path];
  const fisso = PERCORSI.find((p) => p[da] === path);
  if (fisso) return fisso[a];
  for (const p of DINAMICI) {
    if (path.startsWith(p[da] + "/") && path.length > p[da].length + 1) return p[a] + path.slice(p[da].length);
  }
  return null;
}

/** Per i metadati delle pagine: canonical e hreflang (Google trova la pagina nell'altra lingua) */
export function alternati(it: string, en: string, lingua: Lingua) {
  return {
    canonical: lingua === "en" ? en : it,
    languages: { it, en, "x-default": it },
  };
}

/** Dove torna la scheda inglese di un luogo: la pagina inglese della sua categoria, se c'è, se no la mappa */
export function ritornoEn(categoria: string) {
  const pagine: Record<string, { href: string; nome: string }> = {
    farmacia: { href: "/en/pharmacies", nome: "Pharmacies" },
    parcheggio: { href: "/en/parking", nome: "Car parks" },
    locale: { href: "/en/eat", nome: "Where to eat" },
    dormire: { href: "/en/stay", nome: "Where to stay" },
    cultura: { href: "/en/sights", nome: "Museums and monuments" },
    luogo: { href: "/en/sights", nome: "Museums and monuments" },
    panorama: { href: "/en/viewpoints", nome: "Viewpoints" },
  };
  return pagine[categoria] ?? { href: "/en/map", nome: "Map" };
}

/** Titolo, descrizione, hreflang e anteprima delle pagine inglesi */
export function metaEn(titolo: string, descrizione: string, it: string | null, en: string): Metadata {
  return {
    title: `${titolo} · 739 San Marino`,
    description: descrizione,
    alternates: it ? alternati(it, en, "en") : { canonical: en },
    openGraph: { siteName: "739 San Marino", locale: "en_GB", type: "website", title: titolo, description: descrizione, url: en },
  };
}

/* Date in inglese, sempre nel fuso di San Marino */

function chiave(d: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export function giornoEn(iso: string) {
  const k = chiave(new Date(iso));
  if (k === chiave(new Date())) return "Today";
  if (k === chiave(new Date(Date.now() + 86400000))) return "Tomorrow";
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" }).format(new Date(iso));
}

export function meseBreveEn(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, month: "short" }).format(new Date(iso));
}

export function oggiLungoEn() {
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" }).format(new Date());
}

export function salutoEn() {
  const h = Number(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hourCycle: "h23" }).format(new Date()));
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export const GIORNI_EN = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** «riapre domani alle 9:00» in inglese (lib/orario.ts dà il giorno in italiano) */
export function riapreEn(riapre: string) {
  const [quando, ora] = riapre.split(" alle ");
  const giorni = ["lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato", "domenica"];
  const g = quando === "oggi" ? "today" : quando === "domani" ? "tomorrow" : GIORNI_EN[giorni.indexOf(quando)] ?? quando;
  return `${g} at ${ora}`;
}

export function traEn(tra: number) {
  if (tra <= 0) return "now";
  if (tra < 60) return `in ${tra} min`;
  const h = Math.floor(tra / 60);
  const m = tra % 60;
  return m ? `in ${h} h ${m} min` : `in ${h} h`;
}

/** Il cielo di lib/meteo.ts in inglese */
export const CIELO_EN: Record<string, string> = {
  Sereno: "Clear",
  "Quasi sereno": "Mostly clear",
  "Poco nuvoloso": "Partly cloudy",
  Nuvoloso: "Cloudy",
  Nebbia: "Fog",
  Pioviggine: "Drizzle",
  "Pioggia debole": "Light rain",
  Pioggia: "Rain",
  "Pioggia forte": "Heavy rain",
  "Pioggia gelata": "Freezing rain",
  Neve: "Snow",
  Temporale: "Thunderstorm",
  Variabile: "Changeable",
};

/** Le cinque aree in inglese (lib/aree.ts) */
export const AREE_EN: Record<string, string> = { vivere: "Services", uscire: "Going out", sport: "Sport", comunita: "Community", lavorare: "Work" };

/* Categorie e tipi dei luoghi in inglese (gli stessi di lib/data.ts) */

export const CATEGORIE_EN: Record<string, string> = {
  luogo: "Places",
  trasporti: "Transport",
  parcheggio: "Car parks",
  farmacia: "Pharmacies",
  impianto: "Sports facilities",
  locale: "Eat and drink",
  servizio: "Services",
  cultura: "Museums and monuments",
  panorama: "Viewpoints",
  bagni: "Public toilets",
  acqua: "Drinking fountains",
  ricarica: "EV charging",
  avviso: "Notices",
  ufficio: "Public offices",
  salute: "Health",
  posta: "Post offices",
  banca: "Banks and ATMs",
  carburante: "Petrol stations",
  scuola: "Schools",
  chiesa: "Churches",
  negozio: "Shops",
  azienda: "Companies",
  professionista: "Professionals",
  artigiano: "Craftspeople",
  animali: "Pets",
  associazione: "Associations",
  dormire: "Places to stay",
};

/** Una scheda sola: «Pharmacy», non «Pharmacies» */
export const CATEGORIA_SINGOLA_EN: Record<string, string> = {
  luogo: "Place",
  trasporti: "Transport",
  parcheggio: "Car park",
  farmacia: "Pharmacy",
  impianto: "Sports facility",
  locale: "Restaurant or bar",
  servizio: "Service",
  cultura: "Museum or monument",
  panorama: "Viewpoint",
  bagni: "Public toilet",
  acqua: "Drinking fountain",
  ricarica: "EV charging point",
  avviso: "Notice",
  ufficio: "Public office",
  salute: "Health",
  posta: "Post office",
  banca: "Bank",
  carburante: "Petrol station",
  scuola: "School",
  chiesa: "Church",
  negozio: "Shop",
  azienda: "Company",
  professionista: "Professional",
  artigiano: "Craftsperson",
  animali: "Pet services",
  associazione: "Association",
  dormire: "Accommodation",
};

/** I gruppi delle sezioni in inglese (PaginaSezione), al plurale */
export const PLURALI_EN: Record<string, string> = {
  ristorante: "Restaurants", pizzeria: "Pizzerias", piadineria: "Piadina bars", "cibo veloce": "Fast food", bar: "Cafés and bars", gelateria: "Ice cream", pub: "Pubs",
  hotel: "Hotels", "bed and breakfast": "Bed and breakfasts", residence: "Apartment hotels", campeggio: "Campsites", agriturismo: "Farm stays", altro: "Other",
};

/** Le sottocategorie in inglese; quelle che mancano si mostrano con la categoria */
export const TIPI_EN: Record<string, string> = {
  // Locali
  ristorante: "Restaurant",
  pizzeria: "Pizzeria",
  piadineria: "Piadina bar",
  "cibo veloce": "Fast food",
  bar: "Café and bar",
  gelateria: "Ice cream",
  pub: "Pub",
  // Dormire
  hotel: "Hotel",
  "bed and breakfast": "Bed and breakfast",
  residence: "Apartment hotel",
  campeggio: "Campsite",
  agriturismo: "Farm stay",
  // Negozi
  souvenir: "Souvenirs",
  gioielleria: "Jewellery",
  armeria: "Gun shop",
  alimentari: "Food shop",
  abbigliamento: "Clothing",
  profumeria: "Perfumery",
  tabaccheria: "Tobacconist",
  "centro commerciale": "Shopping centre",
  casa: "Home and DIY",
  elettronica: "Electronics",
  "libri e giochi": "Books, music and games",
  auto: "Cars and motorbikes",
  servizi: "Services",
  negozio: "Shop",
  // Altri
  bancomat: "ATM",
  "giunta di castello": "Castle council",
  veterinario: "Vet",
};
