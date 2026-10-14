import Link from "next/link";
import { Icona } from "./Icona";
import { TIPI_AVVISO, type Avviso } from "@/lib/avvisi";
import type { Castello } from "@/lib/data";

const quando = new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/San_Marino" });

/** «fino a domenica 18 ottobre alle 20:00», oppure da quando, se non è ancora iniziato */
function periodo(a: Avviso) {
  const ora = Date.now();
  if (new Date(a.dal).getTime() > ora) return `Dal ${quando.format(new Date(a.dal))}`;
  if (a.al) return `Fino a ${quando.format(new Date(a.al))}`;
  return "Fino a nuovo avviso";
}

/** Un avviso. Il colore Segnale solo per quelli di attenzione, come da identità visiva. */
export function RigaAvviso({ a, castello, compatto = false }: { a: Avviso; castello?: Castello | null; compatto?: boolean }) {
  const attenzione = a.gravita === "attenzione";
  const tipo = TIPI_AVVISO[a.tipo] ?? TIPI_AVVISO.altro;
  return (
    <article id={`avviso-${a.id}`} className={`flex gap-3 rounded-2xl p-4 ${attenzione ? "bg-segnale/12" : "bg-superficie"}`}>
      <span className={`mt-0.5 shrink-0 ${attenzione ? "text-segnale" : "text-azzurro"}`}><Icona nome={tipo.icona} size={22} /></span>
      <div className="flex min-w-0 flex-col gap-1">
        <h3 className={`text-[15px] font-semibold leading-snug ${attenzione ? "text-segnale" : ""}`}>{a.titolo}</h3>
        {a.testo && !compatto ? <p className="text-sm leading-relaxed text-testo-2">{a.testo}</p> : null}
        <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] text-testo-2">
          <span>{periodo(a)}</span>
          {castello ? (
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="size-2 rounded-full" style={{ background: castello.colore }} />
              {castello.nome}
            </span>
          ) : null}
          {a.luogo ? <Link href={`/luoghi/${a.luogo.id}`} className="text-accento">{a.luogo.nome}</Link> : null}
        </p>
        {a.fonte_nome && !compatto ? (
          <p className="text-xs text-testo-2">
            Fonte: {a.fonte_link ? <a href={a.fonte_link} target="_blank" rel="noopener" className="underline">{a.fonte_nome}</a> : a.fonte_nome}
          </p>
        ) : null}
      </div>
    </article>
  );
}
