import webpush from "web-push";
import { supabase } from "@/lib/supabase";
import { chiaveGiorno, getEventi } from "@/lib/data";
import { cielo, getMeteo, gradi } from "@/lib/meteo";
import { getAvvisi } from "@/lib/avvisi";

// Invio delle notifiche (passo 1.6). La chiama solo pg_cron alle 7:39 di San Marino (manda_notifiche(),
// migrazione 0029) con il segreto della cassaforte: il database lo controlla in notifiche_da_inviare().
// Le chiavi VAPID stanno su Vercel (NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY): senza, non parte nulla.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Iscrizione = { id: string; endpoint: string; p256dh: string; auth: string; tipo: "bollettino" | "weekend" };
type Messaggio = { titolo: string; corpo: string; url: string; tag: string };

const plurale = (n: number, uno: string, tanti: string) => `${n} ${n === 1 ? uno : tanti}`;

/** Il testo del Bollettino e quello del weekend, uguali per tutti, composti una volta sola */
async function messaggi(): Promise<Record<Iscrizione["tipo"], Messaggio>> {
  const [meteo, eventi, avvisi] = await Promise.all([getMeteo(), getEventi(100), getAvvisi()]);
  const oggi = chiaveGiorno(new Date().toISOString());
  const diOggi = eventi.filter((e) => chiaveGiorno(e.inizio) === oggi);
  const tempo = meteo ? `${cielo(meteo.codice, true).testo}, ${gradi(meteo.temperatura)}` : null;
  const pezzi = [
    tempo,
    diOggi.length ? `${plurale(diOggi.length, "evento", "eventi")} oggi` : null,
    avvisi.length ? plurale(avvisi.length, "avviso", "avvisi") : null,
  ].filter(Boolean);

  // Il weekend: da oggi (venerdì) a domenica compresa
  const fine = new Date(Date.now() + 3 * 86_400_000).toISOString();
  const weekend = eventi.filter((e) => chiaveGiorno(e.inizio) >= oggi && chiaveGiorno(e.inizio) < chiaveGiorno(fine));
  return {
    bollettino: {
      titolo: "Il Bollettino delle 7:39",
      corpo: pezzi.length ? `${pezzi.join(", ")}. Le cose da sapere su San Marino.` : "Le cose da sapere oggi su San Marino.",
      url: "/bollettino",
      tag: `bollettino-${oggi}`,
    },
    weekend: {
      titolo: "Il weekend a San Marino",
      corpo: weekend.length ? `${plurale(weekend.length, "evento", "eventi")} da oggi a domenica${tempo ? `. Adesso: ${tempo.toLowerCase()}` : ""}.` : "Cosa succede da oggi a domenica sul Titano.",
      url: "/eventi",
      tag: `weekend-${oggi}`,
    },
  };
}

export async function POST(richiesta: Request) {
  const pubblica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privata = process.env.VAPID_PRIVATE_KEY;
  if (!pubblica || !privata) return Response.json({ errore: "Chiavi VAPID mancanti su Vercel" }, { status: 503 });

  const segreto = richiesta.headers.get("x-segreto") ?? "";
  const db = supabase();
  if (!db || !segreto) return Response.json({ errore: "Non autorizzato" }, { status: 401 });
  const { data, error } = await db.rpc("notifiche_da_inviare", { p_segreto: segreto });
  if (error) return Response.json({ errore: "Non autorizzato" }, { status: 401 });

  const iscrizioni = (data ?? []) as Iscrizione[];
  if (!iscrizioni.length) return Response.json({ inviate: 0 });

  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:conti9708@gmail.com", pubblica, privata);
  const testi = await messaggi();
  const inviate: string[] = [];
  const scadute: string[] = [];

  // A gruppi di 50, per non aprire troppe connessioni insieme
  for (let i = 0; i < iscrizioni.length; i += 50) {
    await Promise.all(
      iscrizioni.slice(i, i + 50).map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(testi[s.tipo]), { TTL: 6 * 3600, urgency: "normal" });
          inviate.push(s.id);
        } catch (e) {
          const stato = (e as { statusCode?: number }).statusCode;
          // 404 e 410: il telefono ha tolto il permesso o l'app; l'iscrizione non serve più
          if (stato === 404 || stato === 410) scadute.push(s.id);
        }
      }),
    );
  }

  await db.rpc("segna_notifiche", { p_segreto: segreto, p_inviate: inviate, p_scadute: scadute });
  return Response.json({ inviate: inviate.length, scadute: scadute.length, totale: iscrizioni.length });
}
