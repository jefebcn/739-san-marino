import { supabaseBrowser } from "@/lib/supabase/browser";
import type { Contenuto } from "@/lib/contenuti";

// Scritture della redazione sui contenuti: passano dalle regole RLS (0016 e 0017), che ammettono solo e_redattore().

export type ContenutoModifica = Omit<Contenuto, "id" | "aggiornato_il">;

const CAMPI = "id, tipo, titolo, slug, sommario, corpo, area, castello_id, foto_url, foto_credito, luoghi, eventi, pubblicato_il, stato, fonte_nome, fonte_link, aggiornato_il";

function messaggio(e: { code?: string; message: string } | null) {
  if (!e) return null;
  if (e.code === "23505") return "Esiste già un contenuto con questo indirizzo: cambia lo slug.";
  if (e.code === "23514") return "Controlla i campi: lo slug va scritto in minuscolo con i trattini, e un contenuto pubblicato ha bisogno della data.";
  if (e.code === "42501") return "Non hai i permessi per questa modifica.";
  if (e.code === "42P01" || e.code === "PGRST205") return "I contenuti non sono ancora attivi nel database.";
  return "Qualcosa non ha funzionato. Riprova tra poco.";
}

const db = () => supabaseBrowser();

/** Tutti i contenuti, bozze comprese (la redazione li vede tutti). */
export async function elencoContenuti() {
  const { data, error } = await db().from("contenuti").select(CAMPI).order("aggiornato_il", { ascending: false }).limit(300);
  return { contenuti: (data ?? []) as Contenuto[], errore: messaggio(error) };
}

export async function salvaContenuto(id: string | null, c: ContenutoModifica) {
  if (!id) {
    const { data, error } = await db().from("contenuti").insert(c).select("id").single();
    return { id: (data?.id as string | undefined) ?? null, errore: messaggio(error) };
  }
  const { data, error } = await db().from("contenuti").update({ ...c, aggiornato_il: new Date().toISOString() }).eq("id", id).select("id");
  if (!error && !data?.length) return { id, errore: "Le modifiche non sono ancora attive: manca la migrazione 0017 nel database." };
  return { id, errore: messaggio(error) };
}

export async function eliminaContenuto(id: string) {
  const { data, error } = await db().from("contenuti").delete().eq("id", id).select("id");
  if (!error && !data?.length) return { errore: "Eliminare non è ancora attivo: manca la migrazione 0017 nel database." };
  return { errore: messaggio(error) };
}
