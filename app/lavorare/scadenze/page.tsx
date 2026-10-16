import Link from "next/link";
import TestaPagina from "@/components/Indietro";
import { Icona } from "@/components/Icona";
import Scadenze from "@/modules/lavorare/components/Scadenze";
import Notifiche from "@/components/Notifiche";
import { RigaNotizia } from "@/components/Notizie";
import { getNotizie, FONTE_NOTIZIE } from "@/lib/notizie";
import { getScadenze, notiziaPerAttivita, oggiSM, SERVIZI_STATO } from "@/modules/lavorare/scadenze";
import { metadatiCondivisione } from "@/lib/condivisione";
import { prossimeScadenze } from "@/modules/lavorare/calendario-fiscale";
import { etichettaGiorno, ora } from "@/lib/data";

export const revalidate = 900;

const MESE = new Intl.DateTimeFormat("it-IT", { month: "long", timeZone: "UTC" });

export const metadata = metadatiCondivisione({
  titolo: "Scadenze e novità per le attività",
  descrizione: "Le prossime scadenze per chi ha un'attività a San Marino, le nuove regole, le notizie di economia e i servizi online dello Stato.",
  percorso: "/lavorare/scadenze",
});

/** Scadenze e novità (Lavorare): per chi ha un'attività. Le scadenze le scrive la redazione con la fonte ufficiale. */
export default async function PaginaScadenze() {
  const [scadenze, notizie] = await Promise.all([getScadenze({ da: oggiSM() }), getNotizie(60)]);
  const perAttivita = notizie.filter(notiziaPerAttivita).slice(0, 6);
  const norme = scadenze.filter((s) => s.tipo === "norme");
  const altre = scadenze.filter((s) => s.tipo !== "norme" && s.tipo !== "bando");
  const bandi = scadenze.filter((s) => s.tipo === "bando").length;
  const fiscali = prossimeScadenze(3).slice(0, 3);

  return (
    <>
      <TestaPagina href="/lavorare" verso="Lavorare" titolo="Scadenze e novità">
        <p className="sottotitolo">Per chi ha un&apos;attività a San Marino: cosa scade, cosa cambia e dove si fa. Ogni voce ha la sua fonte ufficiale.</p>
      </TestaPagina>

      <div className="larga flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-10">
        <div className="flex flex-col gap-8">
          <section className="flex flex-col gap-3" aria-labelledby="fisco">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="fisco" className="text-[19px] font-semibold tracking-tight">Dal calendario fiscale</h2>
              <Link href="/lavorare/calendario-fiscale" className="flex items-center gap-0.5 text-sm font-medium text-testo-2 hover:text-testo">Tutto <Icona nome="avanti" size={14} /></Link>
            </div>
            <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie">
              {fiscali.map((s) => (
                <li key={s.chiave}>
                  <Link href="/lavorare/calendario-fiscale" className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-superficie-2">
                    <span className="voce-logo w-9 shrink-0 text-center text-[22px] leading-none">{Number(s.data.slice(8))}</span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-[12px] text-testo-2">{MESE.format(new Date(`${s.data}T12:00:00Z`))}, {s.voce.categoria}{s.stato !== "confermato" ? ", da verificare" : ""}</span>
                      <span className="text-[15px] font-semibold leading-snug">{s.voce.titolo}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="text-[12px] text-testo-2">Informativo, non ufficiale: verifica sempre con l&apos;Ufficio Tributario, l&apos;ISS o il tuo commercialista.</p>
          </section>

          {altre.length ? (
            <section className="flex flex-col gap-3" aria-labelledby="prossime">
              <h2 id="prossime" className="text-[19px] font-semibold tracking-tight">Altre scadenze</h2>
              <Scadenze scadenze={altre} />
            </section>
          ) : null}

          <Notifiche scadenzePrima />

          {norme.length ? (
            <section className="flex flex-col gap-3" aria-labelledby="regole">
              <h2 id="regole" className="text-[19px] font-semibold tracking-tight">Nuove regole in arrivo</h2>
              <Scadenze scadenze={norme} />
            </section>
          ) : null}

          {bandi ? (
            <Link href="/lavorare/bandi" className="flex items-center gap-3 rounded-2xl bg-superficie p-4 transition-colors hover:bg-superficie-2">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-fondo"><Icona nome="bandi" size={24} /></span>
              <span className="flex-1 text-[15px] font-semibold">{bandi === 1 ? "1 bando aperto" : `${bandi} bandi aperti`}</span>
              <Icona nome="avanti" size={18} />
            </Link>
          ) : null}

          {perAttivita.length ? (
            <section className="flex flex-col gap-3" aria-labelledby="notizie">
              <div className="flex items-baseline justify-between gap-3">
                <h2 id="notizie" className="text-[19px] font-semibold tracking-tight">Dalle notizie</h2>
                <Link href="/notizie" className="flex items-center gap-0.5 text-sm font-medium text-testo-2 hover:text-testo">Tutte <Icona nome="avanti" size={14} /></Link>
              </div>
              <p className="-mt-1 text-[13px] text-testo-2">Economia, e la politica che tocca imposte, contributi e lavoro. Da {FONTE_NOTIZIE.nome}.</p>
              <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie">
                {perAttivita.map((n) => <li key={n.link}><RigaNotizia n={{ ...n, quando: `${etichettaGiorno(n.data).toLowerCase()} alle ${ora(n.data)}` }} /></li>)}
              </ul>
            </section>
          ) : null}
        </div>

        <aside className="flex flex-col gap-3" aria-labelledby="servizi">
          <h2 id="servizi" className="text-[19px] font-semibold tracking-tight">Servizi online dello Stato</h2>
          <p className="-mt-1 text-[13px] text-testo-2">Dal portale gov.sm: si entra con utente e password della Pubblica Amministrazione.</p>
          <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie">
            {SERVIZI_STATO.map((s) => (
              <li key={s.link}>
                <a href={s.link} target="_blank" rel="noopener" className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-superficie-2">
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-[15px] font-semibold">{s.nome}</span>
                    <span className="text-[13px] leading-snug text-testo-2">{s.riga}</span>
                  </span>
                  <span className="shrink-0 text-testo-2"><Icona nome="sito" size={16} /></span>
                </a>
              </li>
            ))}
          </ul>
          <p className="text-[12px] text-testo-2">Elenco preso da gov.sm il 16 ottobre 2026.</p>
        </aside>
      </div>
    </>
  );
}
