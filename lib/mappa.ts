// Costanti della mappa condivise da MappaTerritorio (pagina Mappa), MappaPunti (speciali) e MappaPunto (scheda su computer).
import type { NomeIcona } from "@/components/Icona";

/** Colore del segnaposto per categoria di luogo */
export const COLORI: Record<string, string> = {
  luogo: "#0B1F2E",
  trasporti: "#2C79AE",
  parcheggio: "#5EB6E4",
  farmacia: "#E8573A",
  servizio: "#E8573A",
  impianto: "#2BA84A",
  locale: "#F3A712",
  cultura: "#C9A45C",
  panorama: "#5C9E8F",
  bagni: "#9AA0A6",
  acqua: "#4FC3F7",
  ricarica: "#7CB342",
  avviso: "#E8573A",
  ufficio: "#3F5B73",
  salute: "#E8573A",
  posta: "#3F5B73",
  banca: "#3F5B73",
  carburante: "#6B7280",
  scuola: "#5C6BC0",
  chiesa: "#8D6E63",
  negozio: "#8E6C8A",
  azienda: "#455A64",
  professionista: "#4E5D8C",
  artigiano: "#8D6E4F",
  animali: "#8C7B35",
  associazione: "#5F5A8F",
  dormire: "#3D6E8C",
};

/** Icona del segnaposto per categoria (sempre Phosphor, bianca sul colore della categoria) */
export const ICONE_CATEGORIA: Record<string, NomeIcona> = {
  luogo: "pin",
  trasporti: "trasporti",
  parcheggio: "parcheggio",
  farmacia: "farmacia",
  servizio: "info",
  impianto: "sport",
  locale: "food",
  cultura: "cultura",
  panorama: "panorama",
  bagni: "bagni",
  acqua: "acqua",
  ricarica: "ricarica",
  avviso: "allerta",
  ufficio: "uffici",
  salute: "salute",
  posta: "email",
  banca: "banca",
  carburante: "carburante",
  scuola: "scuola",
  chiesa: "chiese",
  negozio: "negozi",
  azienda: "business",
  professionista: "professionisti",
  artigiano: "artigiani",
  animali: "animali",
  associazione: "gruppo",
  dormire: "dormire",
};

/** Per i locali l'icona dice che posto è */
const ICONE_LOCALE: Record<string, NomeIcona> = { pizzeria: "pizza", bar: "caffe", gelateria: "gelato", pub: "birra", "cibo veloce": "panino", piadineria: "panino" };

export function iconaDi(categoria: string, sottocategoria?: string | null): NomeIcona {
  if (categoria === "locale" && sottocategoria && ICONE_LOCALE[sottocategoria]) return ICONE_LOCALE[sottocategoria];
  return ICONE_CATEGORIA[categoria] ?? "pin";
}

export const coloreDi = (categoria: string) => COLORI[categoria] ?? "#0B1F2E";

export const CENTRO: [number, number] = [12.4578, 43.9424];
export const STILE_CHIARO = "https://tiles.openfreemap.org/styles/liberty";
export const STILE_SCURO = "https://tiles.openfreemap.org/styles/dark";
