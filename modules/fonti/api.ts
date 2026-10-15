import { supabaseBrowser } from "@/lib/supabase/browser";

// Luoghi da fonti aperte esterne (oggi Overture Maps, migrazione 0038): si caricano in un'area di appoggio,
// si confrontano con quelli di 739 e un amministratore decide cosa pubblicare. Tutto passa dalle funzioni del database.

export type StatoCandidato = "nuovo" | "doppione" | "pubblicato" | "scartato";
export type Candidato = {
  id: string; nome: string; categoria: string; sottocategoria: string | null; lat: number; lng: number;
  indirizzo: string | null; telefono: string | null; sito: string | null; confidenza: number | null; qualita: number | null;
  fonti: string[] | null; tassonomia: string | null; stato: StatoCandidato; motivo: string | null;
  simile_a: string | null; simile_nome: string | null; distanza_m: number | null; luogo_id: string | null;
};
export type Riepilogo = {
  per_stato: Partial<Record<StatoCandidato, number>>;
  nuovi_per_categoria: Record<string, number>;
  nuovi_per_qualita: Record<string, number>;
  release: string | null;
  ultimo_caricamento: string | null;
};
/** Il file scritto da scripts/overture.py */
export type FileFonte = { fonte: string; release: string; riquadro?: number[]; letti?: number; candidati: Record<string, unknown>[] };

type ErroreDb = { code?: string; message: string } | null;
function messaggio(e: ErroreDb) {
  if (!e) return null;
  if (e.code === "P0001") return e.message;
  if (e.code === "PGRST202") return "Questa funzione non è ancora attiva nel database (migrazioni 0037 e 0038).";
  return "Qualcosa non ha funzionato. Riprova tra poco.";
}
const db = () => supabaseBrowser();

export async function riepilogo() {
  const { data, error } = await db().rpc("riepilogo_candidati");
  return { riepilogo: (data as Riepilogo | null) ?? null, errore: messaggio(error) };
}

export async function elenco(stato: StatoCandidato, categoria: string | null, offset = 0) {
  const { data, error } = await db().rpc("elenco_candidati", { p_stato: stato, p_categoria: categoria, p_qualita: 0, p_limite: 100, p_offset: offset });
  return { candidati: (data ?? []) as Candidato[], errore: messaggio(error) };
}

/** Carica il file a pezzi da 500: la funzione accetta al massimo 3000 luoghi per volta */
export async function carica(file: FileFonte, avanzamento: (fatti: number) => void) {
  const totali = { letti: 0, validi: 0, nuovi: 0, aggiornati: 0, luoghi_aggiornati: 0 };
  for (let i = 0; i < file.candidati.length; i += 500) {
    const { data, error } = await db().rpc("carica_candidati", { p: { fonte: file.fonte, release: file.release, candidati: file.candidati.slice(i, i + 500) } });
    if (error) return { totali, errore: messaggio(error) };
    for (const k of Object.keys(totali) as (keyof typeof totali)[]) totali[k] += Number((data as Record<string, number>)[k] ?? 0);
    avanzamento(Math.min(i + 500, file.candidati.length));
  }
  return { totali, errore: null };
}

export async function pubblica(ids: string[] | null, qualita: number, categorie: string[] | null) {
  const { data, error } = await db().rpc("pubblica_candidati", { p_ids: ids, p_qualita: qualita, p_categorie: categorie, p_limite: 2000 });
  return { pubblicati: (data as number | null) ?? 0, errore: messaggio(error) };
}

export async function scarta(ids: string[], motivo: string) {
  const { data, error } = await db().rpc("scarta_candidati", { p_ids: ids, p_motivo: motivo || null });
  return { n: (data as number | null) ?? 0, errore: messaggio(error) };
}

export async function rimetti(ids: string[]) {
  const { data, error } = await db().rpc("rimetti_candidati", { p_ids: ids });
  return { n: (data as number | null) ?? 0, errore: messaggio(error) };
}
