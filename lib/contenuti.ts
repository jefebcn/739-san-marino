import { supabase } from "./supabase";

// Contenuti editoriali (migrazione 0016): Bollettino, rubriche, liste, storie, speciali.
// Il pubblico legge solo i pubblicati con data già passata: quelli programmati compaiono da soli all'ora giusta.

import { TIPI, TIPI_ORDINE, type TipoContenuto } from "./rubriche";

export { TIPI, TIPI_ORDINE, type TipoContenuto };

export type Contenuto = {
  id: string;
  tipo: TipoContenuto;
  titolo: string;
  slug: string;
  sommario: string | null;
  corpo: string;
  area: string | null;
  castello_id: number | null;
  foto_url: string | null;
  foto_credito: string | null;
  luoghi: string[];
  eventi: string[];
  pubblicato_il: string | null;
  stato: "bozza" | "pubblicato";
  fonte_nome: string | null;
  fonte_link: string | null;
  aggiornato_il: string;
};

const CAMPI = "id, tipo, titolo, slug, sommario, corpo, area, castello_id, foto_url, foto_credito, luoghi, eventi, pubblicato_il, stato, fonte_nome, fonte_link, aggiornato_il";
const CAMPI_ELENCO = "id, tipo, titolo, slug, sommario, foto_url, foto_credito, pubblicato_il, stato, castello_id, area";

export async function getContenuto(slug: string): Promise<Contenuto | null> {
  const db = supabase();
  if (!db || !/^[a-z0-9-]{1,120}$/.test(slug)) return null;
  const { data, error } = await db.from("contenuti").select(CAMPI).eq("slug", slug).maybeSingle();
  if (error) {
    // Prima della migrazione 0016 la tabella non c'è: niente contenuti, nessun errore in pagina
    if (error.code !== "42P01" && error.code !== "PGRST205") console.error("contenuto", error.message);
    return null;
  }
  return (data as Contenuto | null) ?? null;
}

/** Ultimi contenuti pubblicati, anche filtrati per tipo. */
export async function getContenuti({ tipo, limite = 30 }: { tipo?: TipoContenuto; limite?: number } = {}): Promise<Contenuto[]> {
  const db = supabase();
  if (!db) return [];
  let q = db.from("contenuti").select(CAMPI_ELENCO).order("pubblicato_il", { ascending: false }).limit(limite);
  if (tipo) q = q.eq("tipo", tipo);
  const { data, error } = await q;
  if (error) {
    if (error.code !== "42P01" && error.code !== "PGRST205") console.error("contenuti", error.message);
    return [];
  }
  return (data ?? []) as Contenuto[];
}

/** L'ultimo uscito di una rubrica, solo se è uscito da meno di `giorni` giorni (per Oggi). */
export async function getUltimo(tipo: TipoContenuto, giorni: number): Promise<Contenuto | null> {
  const [c] = await getContenuti({ tipo, limite: 1 });
  if (!c?.pubblicato_il) return null;
  return Date.now() - new Date(c.pubblicato_il).getTime() < giorni * 86400_000 ? c : null;
}

/** «Il castello della settimana: Borgo Maggiore» → «il-castello-della-settimana-borgo-maggiore» */
export function slugDa(testo: string) {
  return testo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");
}
