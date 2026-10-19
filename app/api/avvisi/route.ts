import webpush from "web-push";
import { supabase } from "@/lib/supabase";
import { TITOLARE } from "@/lib/legale";

// Invio degli avvisi personali (migrazione 0049). La chiama solo pg_cron (manda_avvisi(), ogni minuto, solo se
// c'è qualcosa in coda) col segreto della cassaforte, lo stesso del Bollettino: il database lo controlla.
// Le chiavi VAPID stanno su Vercel: senza, non parte nulla.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

type Avviso = { avviso_id: string; endpoint: string; p256dh: string; auth: string; titolo: string; corpo: string; url: string };

export async function POST(richiesta: Request) {
  const pubblica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privata = process.env.VAPID_PRIVATE_KEY;
  if (!pubblica || !privata) return Response.json({ errore: "Chiavi VAPID mancanti su Vercel" }, { status: 503 });

  const segreto = richiesta.headers.get("x-segreto") ?? "";
  const db = supabase();
  if (!db || !segreto) return Response.json({ errore: "Non autorizzato" }, { status: 401 });
  const { data, error } = await db.rpc("avvisi_da_inviare", { p_segreto: segreto });
  if (error) return Response.json({ errore: "Non autorizzato" }, { status: 401 });

  const righe = (data ?? []) as Avviso[];
  if (!righe.length) return Response.json({ inviati: 0 });

  webpush.setVapidDetails(process.env.VAPID_SUBJECT || `mailto:${TITOLARE.email}`, pubblica, privata);
  // Un avviso può andare su più telefoni della stessa persona: è mandato se almeno uno l'ha ricevuto
  const riusciti = new Set<string>();
  const provati = new Set<string>();
  const scaduti: string[] = [];

  await Promise.all(
    righe.map(async (r) => {
      provati.add(r.avviso_id);
      try {
        await webpush.sendNotification(
          { endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } },
          JSON.stringify({ titolo: r.titolo, corpo: r.corpo, url: r.url, tag: `avviso-${r.avviso_id}` }),
          { TTL: 24 * 3600, urgency: "high" },
        );
        riusciti.add(r.avviso_id);
      } catch (e) {
        const stato = (e as { statusCode?: number }).statusCode;
        // 404 e 410: il telefono ha tolto il permesso o l'app
        if (stato === 404 || stato === 410) scaduti.push(r.endpoint);
      }
    }),
  );

  const inviati = [...riusciti];
  const falliti = [...provati].filter((id) => !riusciti.has(id));
  await db.rpc("segna_avvisi", { p_segreto: segreto, p_inviati: inviati, p_falliti: falliti, p_scaduti: scaduti });
  return Response.json({ inviati: inviati.length, falliti: falliti.length, scaduti: scaduti.length });
}
