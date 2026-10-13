export type Sport = { id: string; nome: string; giocatori_per_squadra: number; ordine: number };

export type StatoPartita = "aperta" | "squadre" | "giocata" | "annullata";

export type Partita = {
  id: string;
  sport_id: string;
  titolo: string;
  inizio: string;
  luogo_nome: string;
  lat: number | null;
  lng: number | null;
  posti: number;
  iscritti: number;
  stato: StatoPartita;
  sono_iscritto: boolean;
  sono_organizzatore: boolean;
};

export type DettaglioPartita = Partita & { punteggio_a: number | null; punteggio_b: number | null; organizzatore: string | null };

export type Giocatore = {
  nome: string;
  castello_id: number | null;
  rating: number;
  rd: number;
  partite: number;
  squadra: "A" | "B" | null;
  sono_io: boolean;
  rating_prima: number | null;
  rating_dopo: number | null;
};

export type RigaClassifica = { posizione: number; nome: string; castello_id: number | null; rating: number; rd: number; partite: number; vittorie: number; sono_io: boolean };
export type RigaCastello = { castello_id: number; giocatori: number; vittorie: number; rating_medio: number };
