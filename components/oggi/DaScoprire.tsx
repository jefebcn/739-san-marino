import Link from "next/link";
import { Icona } from "@/components/Icona";
import { iconaDi } from "@/lib/mappa";
import { CATEGORIA_SINGOLA, CATEGORIE, TIPI_LEGGIBILI, type Castello, type Luogo } from "@/lib/data";

/** Il tipo di un posto in una parola: «Museo», «Panorama», «Piadineria» */
function tipo(l: Luogo) {
  if (l.categoria === "locale" && l.sottocategoria) return TIPI_LEGGIBILI[l.sottocategoria] ?? l.sottocategoria[0].toUpperCase() + l.sottocategoria.slice(1);
  if (l.categoria === "panorama") return "Panorama";
  if (l.categoria === "cultura") return "Museo o monumento";
  return CATEGORIA_SINGOLA[l.categoria] ?? CATEGORIE[l.categoria] ?? l.categoria;
}

/**
 * Quando la fascia di Oggi non ha eventi né partite: tre posti veri da vedere (lib/data.ts, getDaScoprire),
 * così la sezione non è mai vuota.
 */
export default function DaScoprire({ luoghi, castelli }: { luoghi: Luogo[]; castelli: Castello[] }) {
  if (!luoghi.length) return null;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-testo-2">Niente in calendario per adesso: tre posti da scoprire oggi.</p>
      <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie">
        {luoghi.map((l) => {
          const c = castelli.find((x) => x.id === l.castello_id);
          return (
            <li key={l.id}>
              <Link prefetch={false} href={`/luoghi/${l.id}`} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-superficie-2">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#09090B] text-white"><Icona nome={iconaDi(l.categoria, l.sottocategoria)} size={18} piatta /></span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[15px] font-semibold">{l.nome}</span>
                  <span className="truncate text-[13px] text-testo-2">{tipo(l)}{c ? `, ${c.nome}` : ""}</span>
                </span>
                <span className="shrink-0 text-testo-2"><Icona nome="avanti" size={18} /></span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
