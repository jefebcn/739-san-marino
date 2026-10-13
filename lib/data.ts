import { supabase } from "./supabase";

export type Castello = { id: number; slug: string; nome: string; colore: string; metri?: number };
export type Luogo = { id: string; nome: string; categoria: string; descrizione: string | null; lat: number; lng: number };
export type Evento = {
  id: string;
  titolo: string;
  descrizione: string | null;
  inizio: string;
  metri: number;
  organizzatore: string | null;
  luogo: { nome: string } | null;
  castello: { nome: string; colore: string } | null;
};

export async function getEventi(limite = 20): Promise<Evento[]> {
  const db = supabase();
  if (!db) return [];
  const { data, error } = await db
    .from("eventi")
    .select("id, titolo, descrizione, inizio, metri, organizzatore, luogo:luoghi(nome), castello:castelli(nome, colore)")
    .gte("inizio", new Date(Date.now() - 6 * 3600 * 1000).toISOString())
    .order("inizio", { ascending: true })
    .limit(limite);
  if (error) {
    console.error("eventi", error.message);
    return [];
  }
  return (data ?? []) as unknown as Evento[];
}

export async function getLuoghi(): Promise<Luogo[]> {
  const db = supabase();
  if (!db) return [];
  const { data, error } = await db.from("luoghi").select("id, nome, categoria, descrizione, lat, lng").order("nome");
  if (error) {
    console.error("luoghi", error.message);
    return [];
  }
  return data ?? [];
}

export async function getClassifica(): Promise<Castello[]> {
  const db = supabase();
  if (!db) return [];
  const { data, error } = await db.rpc("classifica_castelli_totali");
  if (error) {
    console.error("classifica", error.message);
    return [];
  }
  return (data ?? []).map((c: Castello & { metri: number | string }) => ({ ...c, metri: Number(c.metri) }));
}

export function formatData(iso: string) {
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/San_Marino",
  }).format(new Date(iso));
}
