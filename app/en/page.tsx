import Link from "next/link";
import { Icona, type NomeIcona } from "@/components/Icona";
import Tano from "@/components/Tano";
import { ProssimaPartenza } from "@/components/Partenze";
import { ConteggioAperte } from "@/components/Farmacie";
import { getFarmacie, getLinee, getParcheggi } from "@/lib/servizi";
import { cielo, getMeteo, gradi } from "@/lib/meteo";
import { CIELO_EN, metaEn, oggiLungoEn, salutoEn } from "@/lib/lingua";

export const revalidate = 60;

export const metadata = metaEn(
  "San Marino today",
  "The app of the Republic of San Marino: what's open now, the cable car, car parks, pharmacies and emergency numbers.",
  "/",
  "/en",
);

const fmt = new Intl.NumberFormat("en-GB");

/** Le pagine inglesi pronte, per chi visita (lib/lingua.ts) */
const PAGINE: { href: string; nome: string; riga: string; icona: NomeIcona }[] = [
  { href: "/en/events", nome: "What's on", riga: "Events, concerts and exhibitions", icona: "eventi" },
  { href: "/en/eat", nome: "Where to eat", riga: "Restaurants, pizzerias, cafés and ice cream", icona: "food" },
  { href: "/en/stay", nome: "Where to stay", riga: "Hotels, bed and breakfasts and apartments", icona: "dormire" },
  { href: "/en/sights", nome: "Museums and monuments", riga: "The three towers, gates and museums", icona: "cultura" },
  { href: "/en/viewpoints", nome: "Viewpoints", riga: "The sea and the Apennines from the top", icona: "panorama" },
  { href: "/en/map", nome: "Map", riga: "Car parks, museums, viewpoints, toilets and more", icona: "mappa" },
  { href: "/en/transport", nome: "Cable car and buses", riga: "Next departures and fares", icona: "trasporti" },
  { href: "/en/parking", nome: "Car parks", riga: "Spaces and fares in the old town", icona: "parcheggio" },
  { href: "/en/pharmacies", nome: "Pharmacies", riga: "Which ones are open right now", icona: "farmacia" },
  { href: "/en/emergency", nome: "Emergency", riga: "112, ambulance, fire brigade", icona: "telefono" },
];

function Titolo({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[19px] font-semibold tracking-tight">{children}</h2>;
}

export default async function Today() {
  const [farmacie, linee, parcheggi, meteo] = await Promise.all([getFarmacie(), getLinee(), getParcheggi(), getMeteo()]);
  const tempo = meteo ? cielo(meteo.codice, meteo.giorno) : null;
  const funivia = linee.find((l) => l.tipo === "funivia");
  const multipiano = parcheggi.find((p) => p.nome.startsWith("P9"));

  return (
    <>
      <section className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.03em] lg:text-[30px]">{salutoEn()}</h1>
          <p className="text-[15px] text-testo-2">{oggiLungoEn()} in San Marino</p>
        </div>
        {meteo && tempo ? (
          <div aria-label={`${gradi(meteo.temperatura)}, ${CIELO_EN[tempo.testo] ?? tempo.testo}`} className="flex shrink-0 items-center gap-2 px-1 py-1">
            <Icona nome={tempo.icona} size={30} />
            <span className="flex flex-col leading-tight">
              <span className="font-mono text-[22px] font-medium tracking-[-0.04em]">{gradi(meteo.temperatura)}</span>
              <span className="text-xs text-testo-2">{CIELO_EN[tempo.testo] ?? tempo.testo}</span>
            </span>
          </div>
        ) : null}
      </section>

      <section className="flex items-start justify-between gap-4 rounded-2xl bg-superficie p-5 lg:p-8">
        <div className="flex min-w-0 flex-col">
          <h2 className="text-[26px] font-semibold leading-[1.1] tracking-tight lg:text-[34px]">San Marino, from the top</h2>
          <p className="mt-2 max-w-[38ch] text-[15px] leading-relaxed text-testo-2 lg:max-w-[52ch] lg:text-[17px]">
            739 is the free app of the Republic of San Marino: what&apos;s open now, how to get up to the old town and what to do if something goes wrong. It takes its name from Monte Titano, 739 metres high.
          </p>
        </div>
        <Tano posa="saluta" lingua="en" priority className="-mr-1 h-28 w-auto shrink-0 lg:mr-6 lg:h-44" />
      </section>

      <div className="larga flex flex-col gap-7 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-10">
        <div className="flex flex-col gap-7 lg:gap-9">
          <section className="flex flex-col gap-3">
            <Titolo>Right now</Titolo>
            <div className="grid grid-cols-2 gap-2.5">
              <Link href="/en/transport" className="flex flex-col gap-3 rounded-2xl bg-superficie p-4 transition-colors hover:bg-superficie-2">
                <span className="flex items-center gap-2 text-sm font-medium text-testo-2"><Icona nome="trasporti" size={20} /> Cable car up</span>
                {funivia ? <ProssimaPartenza partenze={funivia.partenze.filter((p) => p.direzione === "Borgo Maggiore → Città")} lingua="en" /> : <span className="text-sm">Timetable coming soon</span>}
              </Link>
              <Link href="/en/pharmacies" className="flex flex-col gap-3 rounded-2xl bg-superficie p-4 transition-colors hover:bg-superficie-2">
                <span className="flex items-center gap-2 text-sm font-medium text-testo-2"><Icona nome="farmacia" size={18} /> Pharmacies</span>
                <ConteggioAperte farmacie={farmacie} lingua="en" />
              </Link>
              <Link href="/en/parking" className="col-span-2 flex items-center gap-4 rounded-2xl bg-superficie p-4 transition-colors hover:bg-superficie-2">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-fondo text-testo"><Icona nome="parcheggio" size={24} /></span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-[15px] font-semibold">{parcheggi.length} car parks in the old town</span>
                  <span className="truncate text-[13px] text-testo-2">{multipiano?.posti ? `The largest is P9, ${fmt.format(multipiano.posti)} spaces` : "Spaces and fares"}</span>
                </span>
                <span className="ml-auto text-testo-2"><Icona nome="avanti" size={18} /></span>
              </Link>
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <Titolo>For your visit</Titolo>
            <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie">
              {PAGINE.map((p) => (
                <li key={p.href}>
                  <Link href={p.href} prefetch={p.href === "/en/map" ? false : undefined} className="flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-superficie-2">
                    <span className="shrink-0 text-testo"><Icona nome={p.icona} size={26} /></span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-[15px] font-semibold">{p.nome}</span>
                      <span className="truncate text-[13px] text-testo-2">{p.riga}</span>
                    </span>
                    <span className="text-testo-2"><Icona nome="avanti" size={18} /></span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="flex flex-col gap-3 lg:sticky lg:top-0">
          <a href="tel:112" className="flex items-center gap-4 rounded-2xl bg-segnale-pieno p-4 text-white transition-transform active:scale-[0.99]">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/15"><Icona nome="telefono" size={22} /></span>
            <span className="flex flex-col">
              <span className="text-[15px] font-semibold">Emergency</span>
              <span className="text-[13px] text-white">Tap to call</span>
            </span>
            <span className="ml-auto font-mono text-[28px] font-medium tracking-[-0.04em]">112</span>
          </a>
          <Link href="/en/emergency" className="flex items-center gap-1 self-start text-sm font-medium text-testo-2 hover:text-testo">
            Other emergency numbers <Icona nome="avanti" size={14} />
          </Link>
        </aside>
      </div>
    </>
  );
}
