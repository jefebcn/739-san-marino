import Link from "next/link";
import { notFound } from "next/navigation";
import TestaPagina from "@/components/Indietro";
import { Icona } from "@/components/Icona";
import { CATEGORIE, getLuoghi, type Luogo } from "@/lib/data";
import { area as trovaArea, sezione as trovaSezione } from "@/lib/aree";

/** Sezione di un'area fatta di luoghi (es. Musei e monumenti): elenco raggruppato per categoria, con la mappa. */
export default async function PaginaSezione({ area, sezione }: { area: string; sezione: string }) {
  const a = trovaArea(area);
  const s = trovaSezione(area, sezione);
  // Solo le sezioni di luoghi hanno questa pagina; le altre portano altrove o sono in arrivo
  if (!a || !s?.categorie) notFound();

  const tutti = await getLuoghi();
  const gruppi = s.categorie
    .map((c) => ({ categoria: c, luoghi: tutti.filter((l) => l.categoria === c) }))
    .filter((g) => g.luoghi.length);
  const totale = gruppi.reduce((n, g) => n + g.luoghi.length, 0);

  return (
    <>
      <TestaPagina href={a.href} verso={a.nome} titolo={s.nome}>
        <p className="sottotitolo">{s.descrizione}</p>
      </TestaPagina>

      {totale === 0 ? (
        <p className="rounded-2xl bg-superficie p-5 text-[15px] text-testo-2">Nessun luogo ancora in questa sezione.</p>
      ) : (
        gruppi.map((g) => (
          <section key={g.categoria} className="flex flex-col gap-2.5">
            {gruppi.length > 1 ? (
              <h2 className="flex items-baseline justify-between text-[17px] font-semibold tracking-tight">
                {CATEGORIE[g.categoria] ?? g.categoria}
                <span className="font-mono text-sm font-medium text-testo-2">{g.luoghi.length}</span>
              </h2>
            ) : null}
            <ul className="divide-y divide-linea rounded-2xl bg-superficie">
              {g.luoghi.map((l) => (
                <li key={l.id}>
                  <RigaLuogo l={l} />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      {s.categorie.some((c) => tutti.some((l) => l.categoria === c && l.fonte === "osm")) ? (
        <p className="fonte">
          Dati ©{" "}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors, aggiornati ogni notte.
        </p>
      ) : null}
    </>
  );
}

function RigaLuogo({ l }: { l: Luogo }) {
  const sotto = [l.indirizzo, l.descrizione].filter(Boolean).join(", ");
  return (
    <Link href={`/mappa?luogo=${l.id}`} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-superficie-2">
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[15px] font-medium leading-snug">{l.nome}</span>
        {sotto ? <span className="line-clamp-1 text-[13px] text-testo-2">{sotto}</span> : null}
      </span>
      <span className="shrink-0 text-testo-2"><Icona nome="pin" size={18} /></span>
    </Link>
  );
}
