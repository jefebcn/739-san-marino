/** Glicko-2 lato app: solo la probabilità di vittoria da mostrare. Gli aggiornamenti dei rating li fa il database. */
const K = 173.7178;

const g = (phi: number) => 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI));

/** Rating e RD "di squadra": media dei rating, RD come media quadratica. */
export function squadra(giocatori: { rating: number; rd: number }[]) {
  if (giocatori.length === 0) return { rating: 1500, rd: 350 };
  const rating = giocatori.reduce((s, x) => s + x.rating, 0) / giocatori.length;
  const rd = Math.sqrt(giocatori.reduce((s, x) => s + x.rd * x.rd, 0) / giocatori.length);
  return { rating, rd };
}

/** Probabilità (0–1) che la squadra A batta la B, tenendo conto dell'incertezza di entrambe. */
export function probabilitaVittoria(a: { rating: number; rd: number }, b: { rating: number; rd: number }) {
  const phi = Math.sqrt((a.rd / K) ** 2 + (b.rd / K) ** 2);
  return 1 / (1 + Math.exp(-g(phi) * ((a.rating - b.rating) / K)));
}
