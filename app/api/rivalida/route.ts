import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

// Le schede dei luoghi restano in cache (ISR, 5 minuti). Quando un titolare salva la sua scheda o il suo Pro
// la pagina si rigenera subito, così le modifiche si vedono «subito» come promette il modulo.
// Lo stesso per le offerte di lavoro (elenco e pagina dell'offerta) e per scadenze e bandi.
// Accetta solo questi indirizzi: al massimo fa rigenerare una pagina, nessun dato cambia da qui.
const SCHEDA = /^\/(luoghi|lavorare\/lavoro)\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$|^\/lavorare\/(lavoro|scadenze|bandi)$/;

export async function POST(req: Request) {
  const { percorso } = (await req.json().catch(() => ({}))) as { percorso?: string };
  if (!percorso || !SCHEDA.test(percorso)) return NextResponse.json({ ok: false }, { status: 400 });
  revalidatePath(percorso);
  return NextResponse.json({ ok: true });
}
