import { create } from "zustand";

/** Profilo SMR ID: rispecchia la tabella `profili` di Supabase. */
export type ProfiloSmr = {
  id: string;
  nome: string | null;
  castello_id: number | null;
  lingua: "it" | "en" | "de";
};

type StatoSessione = "caricamento" | "ospite" | "connesso";

type Sessione = {
  stato: StatoSessione;
  utente: { id: string; email: string | null } | null;
  profilo: ProfiloSmr | null;
  accedi: (utente: { id: string; email: string | null }, profilo: ProfiloSmr | null) => void;
  aggiornaProfilo: (modifiche: Partial<Omit<ProfiloSmr, "id">>) => void;
  esci: () => void;
};

/** Stato globale della sessione (Core · SMR ID). Supabase Auth lo alimenta dallo step 3. */
export const useSessione = create<Sessione>()((set) => ({
  stato: "caricamento",
  utente: null,
  profilo: null,
  accedi: (utente, profilo) => set({ stato: "connesso", utente, profilo }),
  aggiornaProfilo: (modifiche) => set((s) => (s.profilo ? { profilo: { ...s.profilo, ...modifiche } } : s)),
  esci: () => set({ stato: "ospite", utente: null, profilo: null }),
}));
