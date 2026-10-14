import Link from "next/link";
import SportHome from "@/modules/sport/components/SportHome";
import { getSport } from "@/modules/sport/dati";
import { getClassifica } from "@/lib/data";
import { Icona } from "@/components/Icona";
import { area } from "@/lib/aree";

export const revalidate = 300;

export const metadata = { title: "Sport · 739 San Marino" };

export default async function Sport() {
  const [sport, castelli] = await Promise.all([getSport(), getClassifica()]);
  // Le altre sezioni dell'area Sport (le partite sono questa pagina)
  const altre = area("sport")?.sezioni.filter((s) => s.slug !== "partite") ?? [];
  return (
    <>
      <SportHome sport={sport} castelli={castelli} />
      <section className="flex flex-col gap-3" aria-label="Altro in Sport">
        <h2 className="text-[19px] font-semibold tracking-tight">Anche in Sport</h2>
        <ul className="divide-y divide-linea rounded-2xl bg-superficie">
          {altre.map((s) => (
            <li key={s.slug}>
              {s.href ? (
                <Link href={s.href} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-superficie-2">
                  <span className="text-testo"><Icona nome={s.icona} size={26} /></span>
                  <span className="flex min-w-0 flex-1 flex-col"><span className="text-[15px] font-medium">{s.nome}</span><span className="text-[13px] text-testo-2">{s.descrizione}</span></span>
                  <span className="text-testo-2"><Icona nome="avanti" size={18} /></span>
                </Link>
              ) : (
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <span className="text-testo-2"><Icona nome={s.icona} size={20} /></span>
                  <span className="flex min-w-0 flex-col"><span className="text-[15px] font-medium">{s.nome}</span><span className="text-[13px] text-testo-2">In arrivo: {s.descrizione.charAt(0).toLowerCase() + s.descrizione.slice(1)}</span></span>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
