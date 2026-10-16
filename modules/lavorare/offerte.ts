import { supabase } from "@/lib/supabase";

// Offerte di lavoro (Lavorare, migrazione 0043): le pubblica chi gestisce la scheda di un'attività in 739,
// restano online fino alla scadenza (al massimo 60 giorni) e le candidature vanno direttamente all'attività.

export const CONTRATTI = {
  indeterminato: "Tempo indeterminato",
  determinato: "Tempo determinato",
  stagionale: "Stagionale",
  apprendistato: "Apprendistato",
  stage: "Stage",
  collaborazione: "Collaborazione",
} as const;
export type Contratto = keyof typeof CONTRATTI;
export const ORARI = ["tempo pieno", "part-time"] as const;
export type Orario = (typeof ORARI)[number];

export type OffertaLavoro = {
  id: string;
  luogo_id: string;
  attivita: string;
  categoria: string;
  sottocategoria: string | null;
  castello_id: number | null;
  indirizzo: string | null;
  titolo: string;
  contratto: Contratto;
  orario: Orario;
  descrizione: string;
  sede: string | null;
  email: string | null;
  link: string | null;
  telefono: string | null;
  scadenza: string;
  creato_il: string;
  /** Solo nel dettaglio: false se chiusa o scaduta */
  aperta?: boolean;
};

const giorno = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", timeZone: "Europe/San_Marino" });
/** «15 novembre» da una data AAAA-MM-GG */
export const leggiGiorno = (d: string) => giorno.format(new Date(`${d}T12:00:00Z`));

/** Le offerte aperte, dalla più recente. Se la funzione non c'è ancora o il database non risponde: nessuna. */
export async function getOfferteLavoro(): Promise<OffertaLavoro[]> {
  const db = supabase();
  if (!db) return [];
  const { data, error } = await db.rpc("offerte_lavoro_aperte", { p_limite: 200 });
  if (error) {
    if (error.code !== "PGRST202") console.error("offerte lavoro", error.message);
    return [];
  }
  return (data ?? []) as OffertaLavoro[];
}

export async function getOffertaLavoro(id: string): Promise<OffertaLavoro | null> {
  const db = supabase();
  if (!db || !/^[0-9a-f-]{36}$/.test(id)) return null;
  const { data, error } = await db.rpc("offerta_lavoro", { p_id: id });
  if (error) {
    console.error("offerta lavoro", error.message);
    return null;
  }
  return ((data ?? []) as OffertaLavoro[])[0] ?? null;
}

/** Il tipo di rapporto per i motori di ricerca (schema.org JobPosting) */
export function tipoImpiego(o: Pick<OffertaLavoro, "contratto" | "orario">): string[] {
  const t: string[] = [o.orario === "part-time" ? "PART_TIME" : "FULL_TIME"];
  if (o.contratto === "determinato" || o.contratto === "stagionale") t.push("TEMPORARY");
  if (o.contratto === "stage" || o.contratto === "apprendistato") t.push("INTERN");
  if (o.contratto === "collaborazione") t.push("CONTRACTOR");
  return t;
}
