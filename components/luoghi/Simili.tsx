import Link from "next/link";
import { Icona } from "@/components/Icona";
import { PuntoCategoria } from "@/components/Segnaposto";
import { tipoDi, type Vicino } from "@/lib/data";

const distanza = (m: number) => (m < 1000 ? `${Math.max(10, Math.round(m / 10) * 10)} m` : `${(m / 1000).toLocaleString("it-IT", { maximumFractionDigits: 1 })} km`);

/** «Simili qui vicino» in fondo alla scheda di un luogo */
export default function Simili({ vicini }: { vicini: Vicino[] }) {
  if (!vicini.length) return null;
  return (
    <section className="flex flex-col gap-3" aria-labelledby="simili">
      <h2 id="simili" className="text-[19px] font-semibold tracking-tight">Simili qui vicino</h2>
      <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie">
        {vicini.map((v) => (
          <li key={v.id}>
            <Link href={`/luoghi/${v.id}`} prefetch={false} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-superficie-2">
              <PuntoCategoria categoria={v.categoria} sottocategoria={v.sottocategoria} grande />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[15px] font-semibold">{v.nome}</span>
                <span className="truncate text-[13px] text-testo-2">{tipoDi(v)}</span>
              </span>
              <span className="shrink-0 font-mono text-[13px] text-testo-2">{distanza(v.distanza_m)}</span>
              <span className="shrink-0 text-testo-2"><Icona nome="avanti" size={16} /></span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
