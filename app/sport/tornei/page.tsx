import Link from "next/link";
import TestaPagina from "@/components/Indietro";
import { Icona } from "@/components/Icona";
import { EmblemaCastello } from "@/components/LogoCastello";
import { getClassifica } from "@/lib/data";
import { getSport, getTornei } from "@/modules/sport/dati";
import { periodo, STATI_TORNEO } from "@/modules/sport/tornei";
import NuovoTorneoLink from "@/modules/sport/components/NuovoTorneoLink";

export const revalidate = 60;

export const metadata = {
  title: "Tornei di castello · 739 San Marino",
  description: "Squadre che giocano per il proprio castello: iscrizioni, tabellone e risultati.",
};

export default async function Tornei() {
  const [tornei, sport, castelli] = await Promise.all([getTornei(), getSport(), getClassifica()]);
  const nomeSport = (id: string) => sport.find((s) => s.id === id)?.nome ?? id;

  return (
    <>
      <TestaPagina href="/sport" verso="Sport" titolo="Tornei di castello">
        <p className="sottotitolo">Una squadra per castello: chi vince porta i metri a sé e al suo castello.</p>
      </TestaPagina>

      <NuovoTorneoLink />

      {tornei.length === 0 ? (
        <section className="flex flex-col gap-2 rounded-2xl bg-superficie p-5">
          <span className="text-testo-2"><Icona nome="tornei" size={28} /></span>
          <h2 className="text-[17px] font-semibold">Nessun torneo in programma</h2>
          <p className="text-[15px] text-testo-2">Quando la redazione apre un torneo lo trovi qui: il capitano iscrive la squadra del suo castello e manda il link ai compagni.</p>
        </section>
      ) : (
        <ul className="flex flex-col gap-3">
          {tornei.map((t) => {
            const vince = castelli.find((c) => c.id === t.vincitrice_castello);
            return (
              <li key={t.id}>
                <Link href={`/sport/tornei/${t.id}`} className="flex items-center gap-4 rounded-2xl bg-superficie p-4 transition-colors hover:bg-superficie-2">
                  {vince ? <EmblemaCastello c={vince} className="size-14" /> : (
                    <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-fondo text-testo"><Icona nome="tornei" size={26} /></span>
                  )}
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-[13px] text-testo-2">{nomeSport(t.sport_id)}, {periodo(t.dal, t.al)}</span>
                    <span className="text-[17px] font-semibold leading-tight">{t.titolo}</span>
                    <span className="text-[13px] text-testo-2">
                      {t.stato === "concluso" && vince ? `Ha vinto ${vince.nome}` : `${STATI_TORNEO[t.stato]}, ${t.squadre} ${t.squadre === 1 ? "squadra" : "squadre"}`}
                    </span>
                  </span>
                  <span className="text-testo-2"><Icona nome="avanti" size={18} /></span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
