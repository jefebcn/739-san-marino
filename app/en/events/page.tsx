import Link from "next/link";
import { chiaveGiorno, getEventi, type Evento } from "@/lib/data";
import EventoRiga from "@/components/EventoRiga";
import Tano from "@/components/Tano";
import { giornoEn, metaEn } from "@/lib/lingua";

export const revalidate = 60;

export const metadata = metaEn("What's on in San Marino", "Events, concerts, exhibitions and festivals in San Marino, day by day.", "/eventi", "/en/events");

export default async function Events() {
  const eventi = await getEventi(80);

  const gruppi: { chiave: string; etichetta: string; eventi: Evento[] }[] = [];
  for (const e of eventi) {
    const k = chiaveGiorno(e.inizio);
    const ultimo = gruppi[gruppi.length - 1];
    if (ultimo && ultimo.chiave === k) ultimo.eventi.push(e);
    else gruppi.push({ chiave: k, etichetta: giornoEn(e.inizio), eventi: [e] });
  }

  return (
    <>
      <section className="intro">
        <h1 className="titolo">What&apos;s on</h1>
        <p className="sottotitolo">Events in San Marino, day by day. Names and descriptions are written by the organisers, in Italian.</p>
      </section>

      <div className="larga flex flex-col gap-7">
        {gruppi.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-superficie p-6 text-center">
            <Tano posa="indica" lingua="en" className="h-32 w-auto" />
            <h2 className="text-[19px] font-semibold tracking-tight">No events in the calendar right now</h2>
            <p className="max-w-[40ch] text-sm leading-relaxed text-testo-2">New events are added every week. In the meantime, the map shows museums, viewpoints and places to eat.</p>
            <Link href="/en/map" prefetch={false} className="mt-1 rounded-xl bg-metallo px-4 py-2.5 text-sm font-semibold text-su-accento">Open the map</Link>
          </div>
        ) : (
          gruppi.map((g) => (
            <section key={g.chiave} className="sezione" style={{ gap: 10 }}>
              <h2 className="giorno">{g.etichetta}</h2>
              <div className="lista lg:grid lg:grid-cols-2">
                {g.eventi.map((e) => (
                  <EventoRiga key={e.id} e={e} lingua="en" />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </>
  );
}
