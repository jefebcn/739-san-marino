// Costanti della mappa condivise da MappaTerritorio (pagina Mappa) e MappaPunto (scheda su computer).

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
};

export const CENTRO: [number, number] = [12.4578, 43.9424];
export const STILE_CHIARO = "https://tiles.openfreemap.org/styles/liberty";
export const STILE_SCURO = "https://tiles.openfreemap.org/styles/dark";
