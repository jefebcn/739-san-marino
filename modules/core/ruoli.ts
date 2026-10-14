import { supabaseBrowser } from "@/lib/supabase/browser";

/** Ruoli di chi ha fatto l'accesso (migrazione 0015). Nessuno può darsi un ruolo dall'app. */
export type Ruoli = { amministratore: boolean; redattore: boolean; organizzatore: boolean };

export const NESSUN_RUOLO: Ruoli = { amministratore: false, redattore: false, organizzatore: false };

export async function mieiRuoli(): Promise<Ruoli> {
  const { data, error } = await supabaseBrowser().rpc("miei_ruoli");
  if (error || !data) return NESSUN_RUOLO;
  return { ...NESSUN_RUOLO, ...(data as Partial<Ruoli>) };
}
