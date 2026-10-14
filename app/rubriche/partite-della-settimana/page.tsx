import Link from "next/link";
import TestaPagina from "@/components/Indietro";
import { Icona } from "@/components/Icona";
import { EmblemaCastello } from "@/components/LogoCastello";
import { chiaveGiorno, etichettaGiorno, getClassifica } from "@/lib/data";
import { getPartiteSettimana } from "@/lib/rubriche-auto";
import { testoPeriodo } from "@/lib/speciali";
import { getSport } from "@/modules/sport/dati";

export const revalidate = 300;

export const metadata = {
  title: "Le partite della settimana · 739 San Marino",
  description: "I risultati della settimana, i tornei finiti e i castelli che sono saliti di più.",
};

type Props = { searchParams: Promise<{ settimana?: string }> };

const fmt = new Intl.NumberFormat("it-IT");

/** Il lunedì di sette giorni prima o dopo, come «2026-10-12» */
function spostata(dal: string, giorni: number) {
  return chiaveGiorno(new Date(new Date(dal).getTime() + giorni * 86_400_000 + 12 * 3_600_000).toISOString());
}

/** Le partite della settimana: si scrive da sola dai risultati, la domenica sera compare in Oggi. */
export default async function PartiteSettimana({ searchParams }: Props) {
  const { settimana } = await searchParams;
  const giorno = settimana && /^\d{4}-\d{2}-\d{2}$/.test(settimana) ? settimana : undefined;
  const [s, castelli, sport] = await Promise.all([getPartiteSettimana(giorno), getClassifica(), getSport()]);
  const castello = (id: number | null) => castelli.find((c) => c.id === id);
  const nomeSport = (id: string) => sport.find((x) => x.id === id)?.nome ?? id;

  if (!s) {
    return (
      <TestaPagina href="/rubriche" verso="Rubriche" titolo="Le partite della settimana">
        <p className="sottotitolo">I risultati non si sono caricati. Riprova tra poco.</p>
      </TestaPagina>
    );
  }

  const ultimo = new Date(new Date(s.al).getTime() - 3_600_000).toISOString();
  const inCorso = chiaveGiorno(new Date().toISOString()) <= chiaveGiorno(ultimo) && chiaveGiorno(new Date().toISOString()) >= chiaveGiorno(s.dal);
  const giorni = [...new Set(s.partite.map((p) => chiaveGiorno(p.inizio)))];
  const massimo = Math.max(1, ...s.castelli.map((c) => c.metri));
  const vuota = !s.partite.length && !s.tornei.length && !s.castelli.length;

  return (
    <>
      <TestaPagina href="/rubriche" verso="Rubriche" titolo="Le partite della settimana">
        <p className="sottotitolo">
          {testoPeriodo({ dal: s.dal, al: ultimo }).replace(/^./, (x) => x.toUpperCase())}
          {inCorso ? ", settimana in corso" : ""}
        </p>
      </TestaPagina>

      <nav aria-label="Altre settimane" className="flex items-center justify-between text-sm font-medium">
        <Link href={`/rubriche/partite-della-settimana?settimana=${spostata(s.dal, -7)}`} className="flex items-center gap-1 text-accento"><Icona nome="freccia" size={16} /> Settimana prima</Link>
        {inCorso ? null : <Link href={`/rubriche/partite-della-settimana?settimana=${spostata(s.dal, 7)}`} className="flex items-center gap-1 text-accento">Settimana dopo <Icona nome="avanti" size={16} /></Link>}
      </nav>

      {vuota ? (
        <section className="flex flex-col gap-3 rounded-2xl bg-superficie p-5">
          <h2 className="text-[17px] font-semibold">Settimana tranquilla</h2>
          <p className="text-[15px] text-testo-2">Nessuna partita giocata e nessun metro guadagnato in questi giorni. La prossima la organizzi tu?</p>
          <Link href="/sport?nuova=1" className="text-sm font-medium text-accento">Organizza una partita</Link>
        </section>
      ) : null}

      {s.castelli.length ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-[19px] font-semibold tracking-tight">Chi è salito</h2>
          <ol className="flex flex-col gap-2">
            {s.castelli.map((r, i) => {
              const c = castello(r.castello_id);
              return (
                <li key={r.castello_id} className="flex items-center gap-3 rounded-2xl bg-superficie p-3">
                  <span className="w-5 text-center font-mono text-sm text-testo-2">{i + 1}</span>
                  {c ? <EmblemaCastello c={c} className="size-11" /> : null}
                  <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <span className="text-[15px] font-semibold">{c?.nome}</span>
                    <span className="h-1.5 overflow-hidden rounded-full bg-fondo">
                      <span className="block h-full rounded-full" style={{ width: `${Math.max(4, (r.metri / massimo) * 100)}%`, background: c?.colore }} />
                    </span>
                  </span>
                  <span className="font-mono text-[15px] font-medium">+{fmt.format(r.metri)} m</span>
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}

      {s.tornei.length ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-[19px] font-semibold tracking-tight">Tornei finiti</h2>
          {s.tornei.map((t) => {
            const c = castello(t.castello);
            return (
              <Link key={t.id} href={`/sport/tornei/${t.id}`} className="flex items-center gap-3 rounded-2xl bg-superficie p-3.5 hover:bg-superficie-2">
                {c ? <EmblemaCastello c={c} className="size-12" /> : null}
                <span className="flex min-w-0 flex-col">
                  <span className="text-[13px] text-testo-2">{nomeSport(t.sport_id)}</span>
                  <span className="text-[15px] font-semibold">{t.titolo}</span>
                  {c ? <span className="text-[13px] text-testo-2">Ha vinto {c.nome}</span> : null}
                </span>
              </Link>
            );
          })}
        </section>
      ) : null}

      {s.partite.length ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-[19px] font-semibold tracking-tight">I risultati <span className="font-mono text-[15px] font-medium text-testo-2">{s.partite.length}</span></h2>
          {giorni.map((g) => (
            <div key={g} className="flex flex-col gap-2">
              <h3 className="text-sm font-medium text-testo-2">{etichettaGiorno(s.partite.find((p) => chiaveGiorno(p.inizio) === g)!.inizio).replace(/^./, (x) => x.toUpperCase())}</h3>
              <ul className="divide-y divide-linea rounded-2xl bg-superficie">
                {s.partite.filter((p) => chiaveGiorno(p.inizio) === g).map((p) => (
                  <li key={p.id}>
                    <Link href={`/sport/${p.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-superficie-2">
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-[15px] font-medium">{p.titolo}</span>
                        <span className="truncate text-[13px] text-testo-2">{p.torneo ? `${p.torneo}, ` : ""}{nomeSport(p.sport_id)}, {p.luogo_nome}</span>
                      </span>
                      <span className="font-mono text-[17px] font-medium">{p.punteggio_a}–{p.punteggio_b}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ) : null}
    </>
  );
}
