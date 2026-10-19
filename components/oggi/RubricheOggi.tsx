import Link from "next/link";
import { getUltimo, TIPI } from "@/lib/contenuti";
import { chiaveGiorno, type Castello } from "@/lib/data";
import { rubricheDelGiorno } from "@/lib/oggi";
import { getPartiteSettimana, getVettaMese } from "@/lib/rubriche-auto";

type Scheda = { chiave: string; rubrica: string; titolo: string; riga: string | null; href: string };

const MESE = new Intl.DateTimeFormat("it-IT", { month: "long", timeZone: "UTC" });
const fmt = new Intl.NumberFormat("it-IT");

/**
 * Le rubriche del piano editoriale nel loro giorno (lib/oggi.ts, rubricheDelGiorno): quelle scritte dalla
 * redazione solo se sono uscite oggi; partite della settimana e vetta del mese solo se c'è qualcosa da dire.
 */
export default async function RubricheOggi({ castelli, adesso = new Date() }: { castelli: Castello[]; adesso?: Date }) {
  const oggi = chiaveGiorno(adesso.toISOString());
  const schede = (
    await Promise.all(
      rubricheDelGiorno(adesso).map(async (r): Promise<Scheda | null> => {
        if (r.tipo === "castello_settimana" || r.tipo === "come_si_fa" || r.tipo === "weekend") {
          const c = await getUltimo(r.tipo, 1);
          if (!c?.pubblicato_il || chiaveGiorno(c.pubblicato_il) !== oggi) return null;
          return { chiave: r.tipo, rubrica: TIPI[r.tipo].nome, titolo: c.titolo, riga: c.sommario, href: `/storie/${c.slug}` };
        }
        if (r.tipo === "partite_settimana") {
          const s = await getPartiteSettimana();
          if (!s || (!s.partite.length && !s.tornei.length && !s.castelli.length)) return null;
          const primo = castelli.find((c) => c.id === s.castelli[0]?.castello_id);
          const pezzi = [
            s.partite.length ? `${s.partite.length} ${s.partite.length === 1 ? "partita giocata" : "partite giocate"}` : null,
            s.tornei.length ? `${s.tornei.length} ${s.tornei.length === 1 ? "torneo finito" : "tornei finiti"}` : null,
            primo ? `è salito di più ${primo.nome}, +${fmt.format(s.castelli[0].metri)} m` : null,
          ].filter(Boolean);
          return { chiave: r.tipo, rubrica: TIPI.partite_settimana.nome, titolo: "I risultati di questa settimana", riga: pezzi.join(", "), href: "/rubriche/partite-della-settimana" };
        }
        if (r.tipo !== "vetta_mese") return null;
        const righe = await getVettaMese(r.giorno);
        const primo = righe[0];
        const c = castelli.find((x) => x.id === primo?.castello_id);
        if (!primo || primo.metri <= 0 || !c) return null;
        const nomeMese = MESE.format(new Date(`${r.giorno.slice(0, 7)}-01T12:00:00Z`));
        return {
          chiave: `vetta-${r.giorno}`,
          rubrica: TIPI.vetta_mese.nome,
          titolo: `A ${nomeMese} in vetta c'è ${c.nome}`,
          riga: `${fmt.format(primo.metri)} m guadagnati da ${primo.persone} ${primo.persone === 1 ? "persona" : "persone"}`,
          href: `/rubriche/vetta-del-mese?mese=${r.giorno.slice(0, 7)}`,
        };
      }),
    )
  ).filter((x): x is Scheda => x !== null);

  if (!schede.length) return null;
  return (
    <div className="flex flex-col gap-2">
      {schede.map((s) => (
        <Link key={s.chiave} href={s.href} className="flex flex-col gap-1 rounded-2xl bg-accento-tenue p-4 transition-transform active:scale-[0.99]">
          <span className="text-[13px] font-medium text-accento">{s.rubrica}</span>
          <span className="text-[17px] font-semibold leading-snug">{s.titolo}</span>
          {s.riga ? <span className="text-sm leading-relaxed text-testo-2">{s.riga}</span> : null}
        </Link>
      ))}
    </div>
  );
}
