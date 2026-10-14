import Link from "next/link";
import { Icona } from "@/components/Icona";
import { chiaveGiorno, etichettaGiorno, ora, type Evento } from "@/lib/data";
import type { Contenuto } from "@/lib/contenuti";
import type { Partita } from "@/modules/sport/tipi";

type Voce = { tipo: "evento"; inizio: string; e: Evento } | { tipo: "partita"; inizio: string; p: Partita };

const maiuscola = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Il programma della fascia in Oggi: eventi e partite da adesso a fine fascia
 * (pomeriggio e sera, stasera e domani, il weekend), divisi per giorno quando i giorni sono più di uno.
 */
export default function Programma({
  titolo,
  eventi,
  partite,
  nomeSport,
  rubrica,
  massimo = 8,
  perGiorno = false,
}: {
  titolo: string;
  eventi: Evento[];
  partite: Partita[];
  nomeSport: Record<string, string>;
  /** Il weekend dalla vetta, se è uscito in settimana */
  rubrica?: Contenuto | null;
  massimo?: number;
  /** Il titolo del giorno anche quando il giorno è uno solo (nel weekend) */
  perGiorno?: boolean;
}) {
  const voci: Voce[] = [
    ...eventi.map((e) => ({ tipo: "evento" as const, inizio: e.inizio, e })),
    ...partite.map((p) => ({ tipo: "partita" as const, inizio: p.inizio, p })),
  ].sort((a, b) => a.inizio.localeCompare(b.inizio));
  const mostrate = voci.slice(0, massimo);
  const giorni = Array.from(new Set(mostrate.map((v) => chiaveGiorno(v.inizio))));

  return (
    <section className="flex flex-col gap-3" aria-labelledby="titolo-programma">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="titolo-programma" className="text-[19px] font-semibold tracking-tight">{titolo}</h2>
        <Link href="/eventi" className="flex items-center gap-0.5 text-sm font-medium text-testo-2 hover:text-testo">
          Calendario <Icona nome="avanti" size={14} />
        </Link>
      </div>

      {rubrica ? (
        <Link href={`/storie/${rubrica.slug}`} className="flex flex-col gap-1 rounded-2xl bg-accento-tenue p-4 transition-transform active:scale-[0.99]">
          <span className="text-[15px] font-semibold text-accento">{rubrica.titolo}</span>
          {rubrica.sommario ? <span className="text-sm leading-relaxed text-testo">{rubrica.sommario}</span> : null}
        </Link>
      ) : null}

      {giorni.map((g) => (
        <div key={g} className="flex flex-col gap-2">
          {giorni.length > 1 || perGiorno ? <h3 className="text-sm font-medium text-testo-2">{maiuscola(etichettaGiorno(mostrate.find((v) => chiaveGiorno(v.inizio) === g)!.inizio))}</h3> : null}
          <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie">
            {mostrate
              .filter((v) => chiaveGiorno(v.inizio) === g)
              .map((v) =>
                v.tipo === "evento" ? (
                  <li key={`e-${v.e.id}`}>
                    <Link href={`/eventi/${v.e.id}`} className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-superficie-2">
                      <span className="w-12 shrink-0 pt-px font-mono text-[15px] font-medium">{ora(v.inizio)}</span>
                      <span className="flex min-w-0 flex-col">
                        <span className="line-clamp-2 text-[15px] font-semibold leading-snug">{v.e.titolo}</span>
                        {v.e.luogo ? <span className="truncate text-[13px] text-testo-2">{v.e.luogo.nome}</span> : null}
                      </span>
                    </Link>
                  </li>
                ) : (
                  <li key={`p-${v.p.id}`}>
                    <Link href={`/sport/${v.p.id}`} className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-superficie-2">
                      <span className="w-12 shrink-0 pt-px font-mono text-[15px] font-medium">{ora(v.inizio)}</span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-[15px] font-semibold">{v.p.titolo}</span>
                        <span className="truncate text-[13px] text-testo-2">{nomeSport[v.p.sport_id] ?? v.p.sport_id}, {v.p.luogo_nome}</span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block font-mono text-[15px] font-medium">{Math.max(0, v.p.posti - v.p.iscritti)}</span>
                        <span className="block text-[11px] text-testo-2">posti</span>
                      </span>
                    </Link>
                  </li>
                ),
              )}
          </ul>
        </div>
      ))}

      {voci.length > mostrate.length ? (
        <Link href="/eventi" className="text-sm font-medium text-accento">E altri {voci.length - mostrate.length} in calendario</Link>
      ) : null}
    </section>
  );
}
