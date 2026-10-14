import Link from "next/link";
import { Icona } from "@/components/Icona";
import { testoPeriodo, type SpecialeBreve } from "@/lib/speciali";

/** In cima a Oggi quando c'è uno speciale in corso (Natale delle Meraviglie, Giornate Medievali, 3 settembre). */
export default function SpecialeOggi({ s }: { s: SpecialeBreve }) {
  return (
    <Link href={`/speciali/${s.slug}`} className="pannello topo group flex items-stretch gap-4 transition-transform active:scale-[0.99]">
      {s.foto_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={s.foto_url} alt="" className="-my-1 aspect-square w-24 shrink-0 rounded-xl object-cover" />
      ) : null}
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-sm font-medium text-ottone-300">Speciale, {testoPeriodo(s.periodo)}</span>
        <span className="text-[22px] font-semibold leading-[1.12] tracking-tight text-white [text-wrap:balance]">{s.titolo}</span>
        {s.sommario ? <span className="line-clamp-2 text-[15px]" style={{ color: "var(--pannello-testo)" }}>{s.sommario}</span> : null}
        <span className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-ottone-300">
          Il programma{s.eventi ? `, ${s.eventi} ${s.eventi === 1 ? "evento" : "eventi"}` : ""} <Icona nome="vai" size={16} />
        </span>
      </span>
    </Link>
  );
}
