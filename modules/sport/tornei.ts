// Tornei di castello (migrazione 0025): tipi e formati, usati sia dal server sia dal browser.
// Le chiamate al database sono in tornei-api.ts.

export type StatoTorneo = "iscrizioni" | "in_corso" | "concluso" | "annullato";
export type Formato = "eliminazione" | "girone";

export type RigaTorneo = {
  id: string;
  titolo: string;
  sport_id: string;
  formato: Formato;
  dal: string;
  al: string;
  luogo_nome: string | null;
  metri: number;
  stato: StatoTorneo;
  squadre: number;
  vincitrice_castello: number | null;
};

export type SquadraTorneo = {
  id: string;
  castello_id: number;
  nome: string;
  capitano: string | null;
  sono_capitano: boolean;
  codice: string | null;
  giocatori: number;
  nomi: string[] | null;
};

export type Incontro = {
  id: string;
  turno: number;
  posizione: number;
  squadra_a: string | null;
  squadra_b: string | null;
  punti_a: number | null;
  punti_b: number | null;
  vincitrice: string | null;
  giocato: boolean;
  partita_id: string | null;
  inizio: string | null;
  luogo: string | null;
};

export type Torneo = Omit<RigaTorneo, "squadre" | "vincitrice_castello"> & {
  descrizione: string | null;
  luogo_id: string | null;
  vincitrice: string | null;
  redazione: boolean;
  mia_squadra: string | null;
  squadre: SquadraTorneo[];
  incontri: Incontro[];
};

export type RigaGirone = { squadra_id: string; giocate: number; vinte: number; pari: number; perse: number; fatti: number; subiti: number; punti: number };

export type TorneoDiPartita = { id: string; titolo: string; castello_a: number | null; castello_b: number | null; nome_a: string | null; nome_b: string | null; eliminazione: boolean };

/** Nome del turno di un'eliminazione diretta contando dalla fine: finale, semifinali, quarti, ottavi */
export function nomeTurno(turno: number, ultimo: number) {
  const mancano = ultimo - turno;
  if (mancano === 0) return "Finale";
  if (mancano === 1) return "Semifinali";
  if (mancano === 2) return "Quarti";
  if (mancano === 3) return "Ottavi";
  return `Turno ${turno}`;
}

const GIORNO = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", timeZone: "UTC" });
const SOLO_GIORNO = new Intl.DateTimeFormat("it-IT", { day: "numeric", timeZone: "UTC" });

/** «1 dicembre», «dal 1 al 3 dicembre», «dal 30 novembre al 2 dicembre» (date senza ora, come le salva il database) */
export function periodo(dal: string, al: string) {
  const a = new Date(`${dal}T00:00:00Z`);
  const b = new Date(`${al}T00:00:00Z`);
  if (dal === al) return GIORNO.format(a);
  if (a.getUTCMonth() === b.getUTCMonth()) return `dal ${SOLO_GIORNO.format(a)} al ${GIORNO.format(b)}`;
  return `dal ${GIORNO.format(a)} al ${GIORNO.format(b)}`;
}

export const STATI_TORNEO: Record<StatoTorneo, string> = {
  iscrizioni: "Iscrizioni aperte",
  in_corso: "In corso",
  concluso: "Concluso",
  annullato: "Annullato",
};
