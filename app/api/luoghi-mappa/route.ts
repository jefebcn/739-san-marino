import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// I luoghi del territorio per la mappa grande, con i campi minimi. Una risposta sola per tutti, in cache sulla CDN
// di Vercel per 5 minuti (e servita ancora per un giorno mentre si rigenera): il telefono la scarica in parallelo
// alla pagina (preload in app/mappa/page.tsx) invece di aspettare il JavaScript e poi chiedere al database.
export const revalidate = 300;

const CAMPI = "id, nome, categoria, sottocategoria, lat, lng, indirizzo, fonte";
const LIMITE = 3000;

export async function GET() {
  const db = supabase();
  let punti: unknown[] = [];
  if (db) {
    // Con la 0037 la funzione con l'indice spaziale; prima, gli stessi luoghi con i filtri normali
    const r = await db.rpc("luoghi_mappa", { p_ovest: 12.39, p_sud: 43.88, p_est: 12.53, p_nord: 44.0, p_limite: LIMITE });
    if (!r.error) punti = r.data ?? [];
    else {
      const q = await db.from("luoghi").select(CAMPI).gte("lng", 12.39).lte("lng", 12.53).gte("lat", 43.88).lte("lat", 44.0).order("nome").limit(LIMITE);
      punti = q.data ?? [];
    }
  }
  return NextResponse.json(
    { punti, completo: punti.length < LIMITE },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=86400" } },
  );
}
