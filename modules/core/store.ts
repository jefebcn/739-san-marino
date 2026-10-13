import { create } from "zustand";

/** Profilo SMR ID: rispecchia la tabella `profili` di Supabase. */
export type ProfiloSmr = {
  id: string;
  nome: string | null;
  castello_id: number | null;
  lingua: "it" | "en" | "de";
  tessera: string;
};

type StatoSessione = "caricamento" | "ospite" | "connesso";

type Sessione = {
  stato: StatoSessione;
  utente: { id: string; email: string | null } | null;
  profilo: ProfiloSmr | null;
  /** L'utente è arrivato dal link "password dimenticata" e deve sceglierne una nuova */
  recupero: boolean;
  accedi: (utente: { id: string; email: string | null }, profilo: ProfiloSmr | null) => void;
  aggiornaProfilo: (modifiche: Partial<Omit<ProfiloSmr, "id" | "tessera">>) => void;
  impostaRecupero: (attivo: boolean) => void;
  esci: () => void;
};

/** Stato globale della sessione (Core · SMR ID), alimentato da Supabase Auth in SessioneSync. */
export const useSessione = create<Sessione>()((set) => ({
  stato: "caricamento",
  utente: null,
  profilo: null,
  recupero: false,
  accedi: (utente, profilo) => set({ stato: "connesso", utente, profilo }),
  aggiornaProfilo: (modifiche) => set((s) => (s.profilo ? { profilo: { ...s.profilo, ...modifiche } } : s)),
  impostaRecupero: (attivo) => set({ recupero: attivo }),
  esci: () => set({ stato: "ospite", utente: null, profilo: null, recupero: false }),
}));
