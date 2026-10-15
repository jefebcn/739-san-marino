// Supabase (PostgREST) restituisce al massimo 1000 righe per richiesta, anche dalle funzioni RPC:
// oltre bisogna chiedere le pagine successive con .range(). Dal 15/10/2026 i luoghi sono più di 1000.
export const PAGINA = 1000;

type Risposta<T> = { data: T[] | null; error: { message: string; code?: string } | null };

/** Chiede tutte le righe una pagina alla volta (fino a `massimo`), finché una pagina arriva incompleta. */
export async function aPagine<T>(chiedi: (da: number, a: number) => PromiseLike<Risposta<T>>, massimo = 10000): Promise<Risposta<T>> {
  const tutte: T[] = [];
  for (let da = 0; da < massimo; da += PAGINA) {
    const r = await chiedi(da, Math.min(da + PAGINA, massimo) - 1);
    if (r.error) return tutte.length ? { data: tutte, error: null } : r;
    tutte.push(...(r.data ?? []));
    if ((r.data?.length ?? 0) < PAGINA) break;
  }
  return { data: tutte, error: null };
}
