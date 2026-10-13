/** Livelli della salita personale: la vetta è a 739 m, come il Monte Titano. */
export const VETTA = 739;

export const LIVELLI = [
  { nome: "Valle", da: 0 },
  { nome: "Mura", da: 200 },
  { nome: "Torri", da: 450 },
  { nome: "Vetta", da: 739 },
] as const;

export function livello(metri: number) {
  let i = 0;
  for (let k = 0; k < LIVELLI.length; k++) if (metri >= LIVELLI[k].da) i = k;
  const prossimo = LIVELLI[i + 1] ?? null;
  return { attuale: LIVELLI[i], prossimo, mancano: prossimo ? prossimo.da - metri : 0 };
}

/** Posizione in percentuale sulla scala 0–739 m. */
export function percentuale(metri: number) {
  return Math.min(100, Math.max(0, (metri / VETTA) * 100));
}
