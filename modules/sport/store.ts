import { create } from "zustand";

type StatoPosizione = "spenta" | "ricerca" | "attiva" | "negata" | "non-disponibile";

type StoreSport = {
  sport: string | null;
  scheda: "partite" | "classifiche";
  posizione: { lat: number; lng: number } | null;
  statoPosizione: StatoPosizione;
  scegliSport: (id: string | null) => void;
  scegliScheda: (s: "partite" | "classifiche") => void;
  /** Location scanning: chiede la posizione al telefono per ordinare le partite per distanza */
  attivaPosizione: () => void;
  spegniPosizione: () => void;
};

export const useSport = create<StoreSport>()((set) => ({
  sport: null,
  scheda: "partite",
  posizione: null,
  statoPosizione: "spenta",
  scegliSport: (id) => set({ sport: id }),
  scegliScheda: (scheda) => set({ scheda }),
  attivaPosizione: () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return set({ statoPosizione: "non-disponibile" });
    set({ statoPosizione: "ricerca" });
    navigator.geolocation.getCurrentPosition(
      (p) => set({ posizione: { lat: p.coords.latitude, lng: p.coords.longitude }, statoPosizione: "attiva" }),
      (e) => set({ statoPosizione: e.code === e.PERMISSION_DENIED ? "negata" : "non-disponibile" }),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  },
  spegniPosizione: () => set({ posizione: null, statoPosizione: "spenta" }),
}));
