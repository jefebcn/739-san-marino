import Link from "next/link";
import type { ReactNode } from "react";
import { Icona } from "@/components/Icona";
import { ConteggioAperte } from "@/components/Farmacie";
import { AREE, type SlugArea } from "@/lib/aree";
import { getClassifica, getEventi } from "@/lib/data";
import { getFarmacie } from "@/lib/servizi";
import { getPartiteAperte } from "@/modules/sport/dati";

export const revalidate = 60;

export const metadata = { title: "Esplora · 739 San Marino" };

const num = (n: number) => <b className="font-mono font-medium text-testo">{n}</b>;

export default async function Esplora() {
  const [farmacie, eventi, partite, classifica] = await Promise.all([getFarmacie(), getEventi(80), getPartiteAperte(), getClassifica()]);
  const settimana = Date.now() + 7 * 86_400_000;
  const prossimi = eventi.filter((e) => new Date(e.inizio).getTime() < settimana).length;

  // Una riga viva per area: cosa c'è adesso, non una descrizione fissa
  const vivo: Partial<Record<SlugArea, ReactNode>> = {
    vivere: farmacie.length ? <ConteggioAperte farmacie={farmacie} breve /> : undefined,
    uscire: prossimi ? <>{num(prossimi)} {prossimi === 1 ? "evento" : "eventi"} nei prossimi 7 giorni</> : undefined,
    sport: partite.length ? <>{num(partite.length)} {partite.length === 1 ? "partita aperta" : "partite aperte"}</> : undefined,
    comunita: classifica[0] ? <>In vetta: <b className="font-semibold text-testo">{classifica[0].nome}</b></> : undefined,
  };

  return (
    <>
      <section className="flex flex-col gap-1.5">
        <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.03em]">Esplora</h1>
        <p className="text-[15px] text-testo-2">Tutto 739 in cinque aree.</p>
      </section>

      <Link href="/cerca" className="flex h-12 items-center gap-3 rounded-xl bg-superficie px-4 text-[15px] text-testo-2 transition-colors hover:bg-superficie-2">
        <Icona nome="cerca" size={20} /> Cerca un servizio, un luogo, un evento
      </Link>

      <nav aria-label="Aree" className="grid grid-cols-2 gap-2.5">
        {AREE.map((a, i) => {
          const attive = a.sezioni.filter((s) => s.href).length;
          return (
            <Link
              key={a.slug}
              href={a.href}
              // Vivere occupa tutta la riga: è l'area che si apre più spesso
              className={`flex flex-col gap-3 rounded-2xl bg-superficie p-4 transition-colors hover:bg-superficie-2 active:scale-[0.99] ${i === 0 ? "col-span-2" : ""}`}
            >
              <span className="flex items-center justify-between">
                <span className="grid size-11 place-items-center rounded-xl bg-fondo text-testo"><Icona nome={a.icona} size={24} /></span>
                <span className="text-testo-2"><Icona nome="avanti" size={18} /></span>
              </span>
              <span className="flex flex-col gap-1">
                <span className="text-[19px] font-semibold tracking-tight">{a.nome}</span>
                <span className="text-sm leading-snug text-testo-2">{vivo[a.slug] ?? a.descrizione}</span>
              </span>
              <span className="mt-auto text-xs text-testo-2">
                {attive} {attive === 1 ? "sezione" : "sezioni"}{a.sezioni.length > attive ? `, ${a.sezioni.length - attive} in arrivo` : ""}
              </span>
            </Link>
          );
        })}
      </nav>

      <Link href="/rubriche" className="flex items-center gap-3.5 rounded-2xl border border-linea p-4 transition-colors hover:bg-superficie">
        <span className="text-testo"><Icona nome="storie" size={22} /></span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[15px] font-semibold">Le rubriche di 739</span>
          <span className="text-sm text-testo-2">Il Bollettino, il castello della settimana, il weekend dalla vetta e le storie.</span>
        </span>
        <span className="text-testo-2"><Icona nome="avanti" size={18} /></span>
      </Link>
    </>
  );
}
