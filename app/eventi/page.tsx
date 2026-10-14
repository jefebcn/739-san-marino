import Link from "next/link";
import { chiaveGiorno, etichettaGiorno, getEventi, type Evento } from "@/lib/data";
import EventoRiga from "@/components/EventoRiga";
import { Icona } from "@/components/Icona";
import { getNotizieEventi } from "@/lib/stampa";

const dataBreve = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", timeZone: "Europe/San_Marino" });

export const revalidate = 60;

export const metadata = { title: "Eventi · 739 San Marino" };

export default async function Eventi() {
  const [eventi, notizie] = await Promise.all([getEventi(80), getNotizieEventi()]);

  const gruppi: { chiave: string; etichetta: string; eventi: Evento[] }[] = [];
  for (const e of eventi) {
    const k = chiaveGiorno(e.inizio);
    const ultimo = gruppi[gruppi.length - 1];
    if (ultimo && ultimo.chiave === k) ultimo.eventi.push(e);
    else gruppi.push({ chiave: k, etichetta: etichettaGiorno(e.inizio), eventi: [e] });
  }

  return (
    <>
      <section className="intro">
        <h1 className="titolo">Eventi sul Titano</h1>
        <p className="sottotitolo">Ogni check-in vale metri per te e per il tuo castello.</p>
        <Link href="/eventi/proponi" className="mt-2 flex w-fit items-center gap-1.5 text-sm font-semibold text-accento">
          <Icona nome="piu" size={16} /> Proponi un evento
        </Link>
      </section>

      {/* Computer: il calendario a sinistra, la stampa locale a destra */}
      <div className="larga flex flex-col gap-7 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-10">
        <div className="flex flex-col gap-7">
          {gruppi.length === 0 ? (
            <p className="vuoto">Nessun evento in calendario per ora.</p>
          ) : (
            gruppi.map((g) => (
              <section key={g.chiave} className="sezione" style={{ gap: 10 }}>
                <h2 className="giorno">{g.etichetta}</h2>
                <div className="lista lg:grid lg:grid-cols-2">
                  {g.eventi.map((e) => (
                    <EventoRiga key={e.id} e={e} />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
        <aside className="flex flex-col gap-7 empty:hidden lg:sticky lg:top-0">
          {notizie.length ? (
            <section className="flex flex-col gap-3">
              <div>
                <h2 className="text-[19px] font-semibold tracking-tight">Dalla stampa locale</h2>
                <p className="text-sm text-testo-2">Articoli su spettacoli, mostre e cultura, aggiornati da soli.</p>
              </div>
              <div className="divide-y divide-linea rounded-2xl bg-superficie">
                {notizie.map((n) => (
                  <a key={n.link} href={n.link} target="_blank" rel="noopener" className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-superficie-2">
                    <span className="mt-0.5 text-testo-2"><Icona nome="stampa" size={20} /></span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-[15px] font-semibold leading-snug">{n.titolo}</span>
                      <span className="text-[13px] text-testo-2">{n.fonte}, {dataBreve.format(new Date(n.data))}</span>
                    </span>
                    <span className="mt-0.5 text-testo-2"><Icona nome="avanti" size={16} /></span>
                  </a>
                ))}
              </div>
            </section>
          ) : null}
        </aside>
      </div>
    </>
  );
}
