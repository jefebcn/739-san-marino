import Link from "next/link";
import TestaPagina from "@/components/Indietro";
import { Icona } from "@/components/Icona";
import { EmblemaCastello } from "@/components/LogoCastello";
import { chiaveGiorno, getClassifica } from "@/lib/data";
import { getVettaMese } from "@/lib/rubriche-auto";

export const revalidate = 300;

export const metadata = {
  title: "La vetta del mese · 739 San Marino",
  description: "I castelli che hanno guadagnato più metri nel mese.",
};

type Props = { searchParams: Promise<{ mese?: string }> };

const MESE = new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric", timeZone: "UTC" });
const fmt = new Intl.NumberFormat("it-IT");

function mese(chiave: string, n: number) {
  const [a, m] = chiave.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** La vetta del mese: la classifica dei metri guadagnati nel mese, si scrive da sola. */
export default async function VettaMese({ searchParams }: Props) {
  const { mese: richiesto } = await searchParams;
  const attuale = chiaveGiorno(new Date().toISOString()).slice(0, 7);
  const scelto = richiesto && /^\d{4}-\d{2}$/.test(richiesto) && richiesto <= attuale ? richiesto : attuale;
  const [righe, castelli] = await Promise.all([getVettaMese(`${scelto}-01`), getClassifica()]);
  const nome = MESE.format(new Date(`${scelto}-01T12:00:00Z`));
  const massimo = Math.max(1, ...righe.map((r) => r.metri));
  const vuoto = !righe.some((r) => r.metri > 0);
  const primo = righe[0];
  const vetta = primo && primo.metri > 0 ? castelli.find((c) => c.id === primo.castello_id) : undefined;

  return (
    <>
      <TestaPagina href="/rubriche" verso="Rubriche" titolo="La vetta del mese">
        <p className="sottotitolo">{nome.replace(/^./, (x) => x.toUpperCase())}{scelto === attuale ? ", mese in corso" : ""}</p>
      </TestaPagina>

      <nav aria-label="Altri mesi" className="flex items-center justify-between text-sm font-medium">
        <Link href={`/rubriche/vetta-del-mese?mese=${mese(scelto, -1)}`} className="flex items-center gap-1 text-accento"><Icona nome="freccia" size={16} /> Mese prima</Link>
        {scelto < attuale ? <Link href={`/rubriche/vetta-del-mese?mese=${mese(scelto, 1)}`} className="flex items-center gap-1 text-accento">Mese dopo <Icona nome="avanti" size={16} /></Link> : null}
      </nav>

      {vetta && primo ? (
        <section className="flex items-center gap-4 rounded-2xl bg-superficie p-4">
          <EmblemaCastello c={vetta} className="size-20" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[13px] text-testo-2">In vetta</span>
            <span className="text-[24px] font-semibold leading-tight">{vetta.nome}</span>
            <span className="text-[15px] text-testo-2"><b className="font-mono font-medium text-testo">{fmt.format(primo.metri)} m</b> da {primo.persone} {primo.persone === 1 ? "persona" : "persone"}</span>
          </div>
        </section>
      ) : null}

      {vuoto ? (
        <p className="rounded-2xl bg-superficie p-5 text-[15px] text-testo-2">Nessun metro guadagnato in questo mese. I metri arrivano con i check-in agli eventi e con i tornei di castello.</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {righe.map((r) => {
            const c = castelli.find((x) => x.id === r.castello_id);
            if (!c) return null;
            return (
              <li key={r.castello_id} className="flex items-center gap-3 rounded-2xl bg-superficie p-3">
                <span className="w-5 text-center font-mono text-sm text-testo-2">{r.posizione}</span>
                <EmblemaCastello c={c} className="size-11" />
                <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="truncate text-[15px] font-semibold">{c.nome}</span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-fondo">
                    <span className="block h-full rounded-full" style={{ width: `${r.metri ? Math.max(4, (r.metri / massimo) * 100) : 0}%`, background: c.colore }} />
                  </span>
                </span>
                <span className="flex w-20 flex-col items-end">
                  <span className="font-mono text-[15px] font-medium">{fmt.format(r.metri)} m</span>
                  <span className="text-xs text-testo-2">{r.persone} {r.persone === 1 ? "persona" : "persone"}</span>
                </span>
              </li>
            );
          })}
        </ol>
      )}
      <p className="text-xs text-testo-2">Contano i metri guadagnati nel mese da chi ha scelto quel castello nel suo SMR ID. La classifica di sempre è in <Link href="/castelli" className="underline">I nove castelli</Link>.</p>
    </>
  );
}
