// Rubriche di 739 (docs/piano.md, piano editoriale). Senza dipendenze: lo usa anche la validazione delle importazioni.

export type TipoContenuto =
  | "bollettino"
  | "castello_settimana"
  | "come_si_fa"
  | "weekend"
  | "partite_settimana"
  | "vetta_mese"
  | "lista"
  | "storia"
  | "speciale";

/** Nome della rubrica e una riga su cosa contiene (docs/piano.md, piano editoriale) */
export const TIPI: Record<TipoContenuto, { nome: string; riga: string }> = {
  bollettino: { nome: "Il Bollettino", riga: "Ogni mattina alle 7:39: meteo, tre cose da sapere, servizi." },
  castello_settimana: { nome: "Il castello della settimana", riga: "Ogni lunedì un castello raccontato da vicino." },
  come_si_fa: { nome: "Come si fa", riga: "Ogni mercoledì una pratica spiegata passo per passo." },
  weekend: { nome: "Il weekend dalla vetta", riga: "Ogni giovedì cinque cose scelte per il fine settimana." },
  partite_settimana: { nome: "Le partite della settimana", riga: "La domenica sera i risultati e chi è salito." },
  vetta_mese: { nome: "La vetta del mese", riga: "A fine mese chi ha guadagnato più metri." },
  lista: { nome: "Liste", riga: "Al massimo sette voci, sempre con il perché." },
  storia: { nome: "Storie", riga: "Storie brevi di persone e posti del territorio." },
  speciale: { nome: "Speciali", riga: "Le grandi occasioni dell'anno, giorno per giorno." },
};

export const TIPI_ORDINE = Object.keys(TIPI) as TipoContenuto[];
