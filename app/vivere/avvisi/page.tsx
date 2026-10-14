import TestaPagina from "@/components/Indietro";
import { RigaAvviso } from "@/components/Avvisi";
import { getAvvisi, inCorso } from "@/lib/avvisi";
import { getClassifica } from "@/lib/data";

export const revalidate = 60;

export const metadata = { title: "Avvisi e chiusure · 739 San Marino" };

export default async function Avvisi() {
  const [avvisi, castelli] = await Promise.all([getAvvisi({ giorni: 7 }), getClassifica()]);
  const ora = Date.now();
  const adesso = avvisi.filter((a) => inCorso(a, ora));
  const prossimi = avvisi.filter((a) => !inCorso(a, ora));
  const castello = (id: number | null) => castelli.find((c) => c.id === id) ?? null;

  return (
    <>
      <TestaPagina href="/vivere" verso="Vivere" titolo="Avvisi e chiusure">
        <p className="sottotitolo">Strade chiuse, servizi sospesi, allerte meteo e cambi di programma.</p>
      </TestaPagina>
      {adesso.length === 0 && prossimi.length === 0 ? (
        <p className="rounded-2xl bg-superficie p-5 text-[15px] text-testo-2">Nessun avviso in corso. Quando c&apos;è qualcosa da sapere, lo trovi qui e in Oggi.</p>
      ) : null}
      {adesso.length ? (
        <section className="flex flex-col gap-2.5">
          <h2 className="text-[19px] font-semibold tracking-tight">Adesso</h2>
          {adesso.map((a) => <RigaAvviso key={a.id} a={a} castello={castello(a.castello_id)} />)}
        </section>
      ) : null}
      {prossimi.length ? (
        <section className="flex flex-col gap-2.5">
          <h2 className="text-[19px] font-semibold tracking-tight">Nei prossimi giorni</h2>
          {prossimi.map((a) => <RigaAvviso key={a.id} a={a} castello={castello(a.castello_id)} />)}
        </section>
      ) : null}
    </>
  );
}
