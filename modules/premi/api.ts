import { supabaseBrowser } from "@/lib/supabase/browser";

// Premi dei metri (migrazione 0050): chi gestisce una scheda offre un premio a chi ha raggiunto un livello;
// il cliente mostra il QR del suo SMR ID e il titolare lo legge dalla sua pagina.

export type Ogni = "volta" | "settimana" | "mese";
export const OGNI: Record<Ogni, { nome: string; riga: string }> = {
  volta: { nome: "Una volta", riga: "una volta sola per persona" },
  settimana: { nome: "Ogni settimana", riga: "una volta a settimana per persona" },
  mese: { nome: "Ogni mese", riga: "una volta al mese per persona" },
};

/** I livelli dei metri (lib/quota.ts), gli unici ammessi come soglia */
export const SOGLIE = [
  { metri: 0, nome: "Valle", riga: "tutti con l'SMR ID" },
  { metri: 200, nome: "Mura", riga: "da 200 m" },
  { metri: 450, nome: "Torri", riga: "da 450 m" },
  { metri: 739, nome: "Vetta", riga: "da 739 m" },
] as const;
export const nomeSoglia = (m: number) => SOGLIE.find((s) => s.metri === m)?.nome ?? `${m} m`;

export type PremioAttivo = {
  id: string; luogo_id: string; luogo: string; categoria: string; castello_id: number | null; titolo: string; descrizione: string | null;
  metri_min: number; ogni: Ogni; al: string | null; rimasti: number | null; posso: boolean | null;
};
export type PremioLuogo = {
  id: string; titolo: string; descrizione: string | null; metri_min: number; ogni: Ogni; quanti: number | null; dal: string; al: string | null;
  attivo: boolean; aperto: boolean; ritirati: number; ritirati_30: number;
};
export type Controllo = { esito: "ok" | "pochi_metri" | "gia_ritirato" | "chiuso" | "tessera" | "consegnato"; nome?: string | null; metri?: number; ultimo?: string | null };
export type MioPremio = { titolo: string; luogo_id: string; luogo: string; ritirato_il: string };

type ErroreDb = { code?: string; message: string } | null;
const messaggio = (e: ErroreDb) => (!e ? null : e.code === "P0001" ? e.message : e.code === "PGRST202" ? "I premi dei metri non sono ancora attivi nel database." : "Qualcosa non ha funzionato. Riprova tra poco.");
const db = () => supabaseBrowser();

export async function premiAttivi(luogo: string | null = null) {
  const { data, error } = await db().rpc("premi_attivi", { p_luogo: luogo });
  return { premi: (data ?? []) as PremioAttivo[], errore: messaggio(error) };
}

export async function premiLuogo(luogo: string) {
  const { data, error } = await db().rpc("premi_luogo", { p_luogo: luogo });
  return { premi: (data ?? []) as PremioLuogo[], errore: messaggio(error) };
}

export async function salvaPremio(luogo: string, id: string | null, p: { titolo: string; descrizione: string; metri_min: number; ogni: Ogni; quanti: number | null; dal: string; al: string | null; attivo: boolean }) {
  const { error } = await db().rpc("salva_premio", { p_luogo: luogo, p_id: id, p });
  // La scheda pubblica mostra i premi: si rigenera subito
  if (!error) {
    await Promise.all([`/luoghi/${luogo}`, "/premi"].map((percorso) =>
      fetch("/api/rivalida", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ percorso }) }).catch(() => undefined)));
  }
  return { errore: messaggio(error) };
}

export async function controllaPremio(premio: string, tessera: string) {
  const { data, error } = await db().rpc("controlla_premio", { p_premio: premio, p_tessera: tessera });
  return { controllo: (data as Controllo | null) ?? null, errore: messaggio(error) };
}

export async function riscattaPremio(premio: string, tessera: string) {
  const { data, error } = await db().rpc("riscatta_premio", { p_premio: premio, p_tessera: tessera });
  return { controllo: (data as Controllo | null) ?? null, errore: messaggio(error) };
}

export async function mieiPremi() {
  const { data, error } = await db().rpc("miei_premi");
  return { premi: (data ?? []) as MioPremio[], errore: error?.code === "PGRST202" ? null : messaggio(error) };
}

/** Il QR della carta SMR ID è «739ID:<tessera>»: tiene solo la tessera, scritta bene */
export function tesseraDa(testo: string) {
  const t = testo.trim().replace(/^739ID:/i, "").toUpperCase().replace(/\s+/g, "");
  const m = t.match(/^739-?([A-Z0-9]{4})-?([A-Z0-9]{2})$/);
  return m ? `739-${m[1]}-${m[2]}` : null;
}
