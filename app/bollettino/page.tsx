import Link from "next/link";
import AvvisiOggi from "@/components/AvvisiOggi";
import Bollettino from "@/components/oggi/Bollettino";
import { Icona } from "@/components/Icona";
import { getAvvisi } from "@/lib/avvisi";
import { getContenuti } from "@/lib/contenuti";
import { chiaveGiorno, getClassifica, getEventi, oggiLungo } from "@/lib/data";
import { getMeteo } from "@/lib/meteo";
import { fineGiornata, nelPeriodo } from "@/lib/oggi";
import { getFarmacie, getLinee, getRaccolta } from "@/lib/servizi";
import { getPartiteAperte } from "@/modules/sport/dati";

export const revalidate = 60;

export const metadata = {
  title: "Il Bollettino · 739 San Marino",
  description: "Ogni mattina alle 7:39: meteo, avvisi, eventi di oggi, farmacie aperte, funivia e raccolta dei rifiuti a San Marino.",
};

const giorno = new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/San_Marino" });
const maiuscola = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default async function PaginaBollettino() {
  const adesso = new Date();
  // Il Bollettino parla sempre della giornata in corso, a qualunque ora lo si apra
  const fine = fineGiornata(adesso);
  const [eventi, castelli, farmacie, linee, raccolta, partite, meteo, avvisi, archivio] = await Promise.all([
    getEventi(40), getClassifica(), getFarmacie(), getLinee(), getRaccolta(), getPartiteAperte(), getMeteo(), getAvvisi(), getContenuti({ tipo: "bollettino", limite: 60 }),
  ]);
  const oggi = chiaveGiorno(adesso.toISOString());
  const scritto = archivio.find((c) => c.pubblicato_il && chiaveGiorno(c.pubblicato_il) === oggi) ?? null;
  const passati = archivio.filter((c) => c !== scritto);
  const funivia = linee.find((l) => l.tipo === "funivia");

  return (
    <>
      <section className="flex flex-col gap-1.5">
        <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.03em]">Il Bollettino</h1>
        <p className="text-[15px] text-testo-2">{maiuscola(oggiLungo())}. Ogni mattina alle 7:39 le cose da sapere su San Marino, aggiornate mentre la giornata va avanti.</p>
      </section>

      <Bollettino
        avvisi={<AvvisiOggi avvisi={avvisi} castelli={castelli} />}
        dati={{
          meteo,
          eventi: eventi.filter((e) => nelPeriodo(e, fine, adesso)),
          farmacie,
          funivia: funivia?.partenze.filter((p) => p.direzione === "Borgo Maggiore → Città") ?? [],
          raccolta,
          castelli,
          partite: partite.filter((p) => nelPeriodo(p, fine, adesso)),
          scritto,
        }}
      />

      <section className="flex flex-col gap-3" aria-labelledby="titolo-archivio">
        <h2 id="titolo-archivio" className="text-[19px] font-semibold tracking-tight">I Bollettini scritti</h2>
        {passati.length ? (
          <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie">
            {passati.map((c) => (
              <li key={c.id}>
                <Link href={`/storie/${c.slug}`} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-superficie-2">
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[15px] font-semibold">{c.titolo}</span>
                    <span className="text-[13px] text-testo-2">{c.pubblicato_il ? maiuscola(giorno.format(new Date(c.pubblicato_il))) : ""}</span>
                  </span>
                  <span className="text-testo-2"><Icona nome="avanti" size={18} /></span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl bg-superficie p-4 text-sm leading-relaxed text-testo-2">
            Qui si raccolgono i Bollettini scritti dalla redazione, giorno per giorno. Quello qui sopra invece si compone da solo con i dati di adesso.
          </p>
        )}
      </section>
    </>
  );
}
