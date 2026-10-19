import { supabase } from "./supabase";
import { CAMPI_LUOGO, type Luogo } from "./data";
import { partenzeVicine, type Partenza } from "./orario";

export type Linea = {
  id: string;
  tipo: "funivia" | "bus";
  nome: string;
  descrizione: string | null;
  colore: string;
  biglietto: string | null;
  fonte: string | null;
  da_verificare: boolean;
  partenze: Partenza[];
};
export type Raccolta = { castello_id: number; zona: string; frazione: string; giorni: number[]; orario: string | null; note: string | null; da_verificare: boolean };

export const FRAZIONI: Record<string, { nome: string; colore: string }> = {
  organico: { nome: "Organico", colore: "#8D6E4C" },
  carta: { nome: "Carta", colore: "#2E86DE" },
  plastica: { nome: "Plastica", colore: "#F3C623" },
  metalli: { nome: "Metalli", colore: "#8E5BB5" },
  vetro: { nome: "Vetro", colore: "#2BA84A" },
  secco: { nome: "Secco residuo", colore: "#5D6D7E" },
  verde: { nome: "Sfalci e potature", colore: "#7CB342" },
};

async function luoghiDi(categoria: string): Promise<Luogo[]> {
  const db = supabase();
  if (!db) return [];
  const { data, error } = await db.from("luoghi").select(CAMPI_LUOGO).eq("categoria", categoria).order("nome");
  if (error) {
    console.error(categoria, error.message);
    return [];
  }
  // Ordine naturale: P2 prima di P10
  return ((data ?? []) as Luogo[]).sort((a, b) => a.nome.localeCompare(b.nome, "it", { numeric: true }));
}

export const getFarmacie = () => luoghiDi("farmacia");
export const getParcheggi = () => luoghiDi("parcheggio");

export async function getLinee(): Promise<Linea[]> {
  const db = supabase();
  if (!db) return [];
  const { data, error } = await db
    .from("linee")
    .select("id, tipo, nome, descrizione, colore, biglietto, fonte, da_verificare, partenze(linea_id, direzione, ora, giorni, dal, al)")
    .order("ordine");
  if (error) {
    console.error("linee", error.message);
    return [];
  }
  // Solo le corse di oggi e domani: il resto dell'anno non serve alla pagina
  return ((data ?? []) as Linea[]).map((l) => ({ ...l, partenze: partenzeVicine(l.partenze) }));
}

export async function getRaccolta(): Promise<Raccolta[]> {
  const db = supabase();
  if (!db) return [];
  const { data, error } = await db.from("raccolta_rifiuti").select("castello_id, zona, frazione, giorni, orario, note, da_verificare").neq("giorni", "{}").order("zona");
  if (error) {
    console.error("raccolta", error.message);
    return [];
  }
  return (data ?? []) as Raccolta[];
}
