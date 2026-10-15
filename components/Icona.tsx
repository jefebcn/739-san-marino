import type React from "react";
import { TRACCIATI } from "./icone-tracciati";

// Una sola famiglia di icone (Phosphor), con nomi italiani usati in tutta l'app. Qui il nome del componente Phosphor:
// i tracciati veri, solo nello stile usato, li scrive scripts/icone-phosphor.mjs in icone-tracciati.ts
// (il pacchetto intero porterebbe in ogni pagina tutti e sei gli stili di ogni icona).
// Stile scelto da Alex sui set di riferimento: icone piene con angoli arrotondati (peso "fill").
const ICONE = {
  home: "House",
  mappa: "MapTrifold",
  eventi: "CalendarDots",
  castelli: "Trophy",
  utili: "Lifebuoy",
  orologio: "Clock",
  pin: "MapPin",
  freccia: "CaretLeft",
  avanti: "CaretRight",
  vai: "ArrowRight",
  calendario: "CalendarPlus",
  indicazioni: "NavigationArrow",
  telefono: "Phone",
  persona: "User",
  scudo: "ShieldCheck",
  allerta: "WarningCircle",
  sport: "SoccerBall",
  id: "IdentificationCard",
  food: "ForkKnife",
  business: "Briefcase",
  farmacia: "FirstAid",
  bus: "Bus",
  funivia: "CableCar",
  rifiuti: "Recycle",
  parcheggio: "LetterCircleP",
  cerca: "MagnifyingGlass",
  piu: "Plus",
  qr: "QrCode",
  // Aree e sezioni (lib/aree.ts)
  vivere: "House",
  lavorare: "Briefcase",
  partite: "SoccerBall",
  coda: "FileText",
  servizi: "Toilet",
  meteo: "CloudSun",
  trasporti: "CableCar",
  esplora: "Compass",
  uscire: "Ticket",
  comunita: "UsersThree",
  uffici: "Buildings",
  salute: "Heartbeat",
  avvisi: "Megaphone",
  scuola: "Student",
  dormire: "Bed",
  negozi: "ShoppingBag",
  itinerari: "Path",
  natura: "Tree",
  chiese: "Church",
  associazioni: "HandHeart",
  gruppo: "UsersThree",
  animali: "PawPrint",
  coppa: "Trophy",
  bacheca: "PushPin",
  professionisti: "IdentificationBadge",
  artigiani: "Hammer",
  lavoro: "Handshake",
  fiere: "Storefront",
  bandi: "FileText",
  giunte: "Flag",
  tornei: "Medal",
  impianti: "Barbell",
  storie: "Article",
  email: "EnvelopeSimple",
  strada: "Barricade",
  chiudi: "X",
  condividi: "ShareNetwork",
  collegamento: "LinkSimple",
  modifica: "PencilSimple",
  sito: "Globe",
  // Meteo
  sole: "Sun",
  luna: "Moon",
  "sole-nuvole": "CloudSun",
  "luna-nuvole": "CloudMoon",
  nuvole: "Cloud",
  nebbia: "CloudFog",
  pioggia: "CloudRain",
  neve: "CloudSnow",
  temporale: "CloudLightning",
  // Luoghi da OpenStreetMap
  bagni: "Toilet",
  acqua: "Drop",
  ricarica: "ChargingStation",
  cultura: "Bank",
  panorama: "Binoculars",
  stampa: "Newspaper",
  importa: "FileArrowUp",
  scarica: "DownloadSimple",
  banca: "Wallet",
  info: "Info",
  carburante: "GasPump",
  caffe: "Coffee",
  gelato: "IceCream",
  pizza: "Pizza",
  birra: "BeerStein",
  panino: "Hamburger",
  numeri: "ChartBar",
} satisfies Record<string, string>;

export type NomeIcona = keyof typeof ICONE;

// Frecce, "+" e lente sono segni a linea: piene diventerebbero triangoli o macchie, quindi restano a tratto spesso
const LINEARI = new Set<NomeIcona>(["freccia", "avanti", "vai", "piu", "cerca", "chiudi"]);

// Icone piatte disegnate per Alex (ottobre 2026) per quattro aree e la mappa: prendono il posto di Phosphor.
// Due maschere in public/icone (node scripts/icone-aree.mjs): la base prende il colore del testo, l'accento resta blu.
const PROPRIE = new Set<NomeIcona>(["vivere", "uscire", "comunita", "lavorare"]);

// Icone a colori disegnate per Alex (ottobre 2026, stile 3D): si usano così come sono, in public/icone-colore
// (node scripts/icone-colore.mjs). Più nomi possono usare lo stesso disegno.
const COLORE: Partial<Record<NomeIcona, string>> = {
  sport: "sport",
  home: "home",
  mappa: "mappa",
  partite: "partite",
  tornei: "tornei",
  impianti: "impianti",
  cerca: "cerca",
  qr: "qr",
  calendario: "calendario",
  eventi: "eventi",
  esplora: "esplora",
  persona: "persona",
  scuola: "scuola",
  meteo: "meteo",
  servizi: "servizi",
  rifiuti: "rifiuti",
  parcheggio: "parcheggio",
  trasporti: "trasporti",
  farmacia: "farmacia",
  uffici: "uffici",
  avvisi: "avvisi",
  storie: "giornale",
  stampa: "giornale",
  numeri: "numeri",
  coda: "coda",
};

/** `piatta`: sempre l'icona Phosphor, anche dove c'è quella disegnata (segnaposto della mappa) */
export function Icona({ nome, size = 24, piatta = false }: { nome: NomeIcona; size?: number; piatta?: boolean }) {
  const colore = piatta ? undefined : COLORE[nome];
  if (colore) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={`/icone-colore/${colore}.webp`} alt="" aria-hidden="true" width={size} height={size} draggable={false} className="icona-colore" style={{ width: size, height: size }} />;
  }
  if (!piatta && PROPRIE.has(nome)) {
    return (
      <span
        aria-hidden="true"
        className="icona-propria"
        style={{ width: size, height: size, "--base": `url(/icone/${nome}-base.png)`, "--accento-icona": `url(/icone/${nome}-accento.png)` } as React.CSSProperties}
      />
    );
  }
  // Stile «fill», o «bold» per le lineari (LINEARI): già scelto nei tracciati
  return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} fill="currentColor" viewBox="0 0 256 256" aria-hidden="true" dangerouslySetInnerHTML={{ __html: TRACCIATI[nome] }} />;
}
