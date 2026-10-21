import Link from "next/link";
import TestaPagina from "@/components/Indietro";
import { Cella, Cruscotto } from "@/components/Cruscotto";
import { Icona } from "@/components/Icona";
import { TITOLARE } from "@/lib/legale";
import { metadatiCondivisione } from "@/lib/condivisione";
import TiRiguarda from "@/modules/lavorare/components/TiRiguarda";
import { CONTATTI } from "@/modules/lavorare/dati/calendario-fiscale";
import { AGGIORNATO_IL, DATE, FONTI, GESTIONALI, REGOLE, SANZIONE, SERVE, SOGLIA } from "@/modules/lavorare/dati/fattura-elettronica";

// I «tra N giorni» seguono il giorno
export const revalidate = 3600;

export const metadata = metadatiCondivisione({
  titolo: "Fattura elettronica tra attività sammarinesi",
  descrizione: "Dal 1° gennaio 2027 le fatture tra operatori sammarinesi diventano elettroniche, tramite l'HUB SM (Decreto Delegato 133/2026). Chi è obbligato, la soglia dei 100.000 €, i termini, cosa serve. Informativo, non ufficiale.",
  percorso: "/lavorare/fattura-elettronica",
});

const giorno = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", timeZone: "UTC" });
const lungo = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const d = (s: string) => new Date(`${s}T12:00:00Z`);
const euro = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 0 });
const oggi = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/San_Marino" }).format(new Date());
function quando(data: string) {
  const n = Math.round((d(data).getTime() - d(oggi()).getTime()) / 86_400_000);
  if (n < 0) return "già in vigore";
  if (n === 0) return "da oggi";
  return n === 1 ? "da domani" : `tra ${n} giorni`;
}
const tel = (t: string) => `tel:+378${t.replace(/\D/g, "")}`;

/** Fattura elettronica tra operatori sammarinesi: cosa dice il DD 133/2026, chi riguarda, cosa serve, i gestionali convenzionati con 739 */
export default function PaginaFatturaElettronica() {
  const { tributario } = CONTATTI;
  const scriviPartner = `mailto:${TITOLARE.email}?subject=${encodeURIComponent("Gestionale per la fattura elettronica su 739")}`;
  return (
    <>
      <TestaPagina href="/lavorare" verso="Lavorare" titolo="Fattura elettronica">
        <p className="sottotitolo">Dal 1° gennaio 2027 le fatture tra attività sammarinesi diventano elettroniche e passano dall&apos;HUB SM. Cosa cambia, per chi e cosa serve.</p>
      </TestaPagina>

      <section className="larga flex flex-col gap-6">
        <Cruscotto etichetta="Le date della fattura elettronica">
          <Cella titolo="Facoltativa" valore={giorno.format(d(DATE.facoltativa)).replace(".", "")} unita={`2026, ${quando(DATE.facoltativa)}`} nota="Per chi la sceglie" />
          <Cella titolo="Obbligatoria" valore={giorno.format(d(DATE.obbligo)).replace(".", "")} unita={`2027, ${quando(DATE.obbligo)}`} nota={`Sopra ${euro.format(SOGLIA)} € di ricavi`} />
          <Cella titolo="Sanzioni" valore={giorno.format(d(DATE.sanzioni)).replace(".", "")} unita={`2028, ${quando(DATE.sanzioni)}`} nota={`${SANZIONE} € per fattura omessa o in ritardo`} />
          <Cella titolo="Soglia" valore={`${euro.format(SOGLIA / 1000)}k`} unita="€ di ricavi l'anno prima" nota="Sotto, resta la carta" />
        </Cruscotto>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start lg:gap-10">
          <div className="flex flex-col gap-6">
            <TiRiguarda soglia={SOGLIA} />

            <section className="flex flex-col gap-3" aria-labelledby="t-serve">
              <h2 id="t-serve" className="text-[19px] font-semibold tracking-tight">Cosa serve per emetterla</h2>
              <ol className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie">
                {SERVE.map((s, i) => (
                  <li key={s.titolo} className="flex gap-3.5 p-4">
                    <span className="voce-logo w-6 shrink-0 text-[20px]">{i + 1}</span>
                    <span className="flex flex-col gap-0.5">
                      <span className="text-[15px] font-semibold">{s.titolo}</span>
                      <span className="text-[14px] leading-snug text-testo-2">{s.testo}</span>
                    </span>
                  </li>
                ))}
              </ol>
              <p className="text-[13px] text-testo-2">Senza un gestionale collegato, i file si possono caricare a mano dal portale TribWEB. Fonte: <a href={FONTI.regole.url} target="_blank" rel="noopener" className="underline underline-offset-2">{FONTI.regole.nome}</a>.</p>
            </section>

            {/* I gestionali convenzionati con 739: solo dopo un accordo (modules/lavorare/dati/fattura-elettronica.ts) */}
            <section className="flex flex-col gap-3" aria-labelledby="t-gestionali">
              <h2 id="t-gestionali" className="text-[19px] font-semibold tracking-tight">Un gestionale per farla</h2>
              <Link href="/neonup" className="flex flex-col gap-1.5 rounded-2xl bg-[#09090B] p-5 text-white transition-colors hover:bg-zinc-900">
                <span className="flex items-baseline justify-between gap-3"><span className="text-[17px] font-semibold">NeonUp</span><span className="text-[12px] text-zinc-400">Di 739</span></span>
                <span className="text-[14px] leading-relaxed text-zinc-200">Il gestionale di 739: fatture, DDT e il file XML della fattura elettronica interna da caricare su TribWEB. Per ora gratis, come prova.</span>
                <span className="mt-1 inline-flex items-center gap-1.5 text-[14px] font-semibold">Apri NeonUp <Icona nome="vai" size={16} /></span>
              </Link>
              {GESTIONALI.length ? (
                <ul className="flex flex-col gap-2.5">
                  {GESTIONALI.map((g) => (
                    <li key={g.nome} className="flex flex-col gap-2 rounded-2xl bg-[#09090B] p-5 text-white">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="text-[17px] font-semibold">{g.nome}</span>
                        <span className="text-[12px] text-zinc-400">Convenzionato con 739</span>
                      </span>
                      <span className="text-[13px] text-zinc-400">{g.societa}</span>
                      <span className="text-[14px] leading-relaxed text-zinc-200">{g.descrizione}</span>
                      {g.offerta ? <span className="taglio-piccolo w-fit bg-white py-0.5 text-[13px] font-semibold text-[#09090B]">{g.offerta}</span> : null}
                      <a href={g.sito} target="_blank" rel="noopener sponsored" className="mt-1 inline-flex w-fit items-center gap-1.5 text-[14px] font-semibold text-white underline underline-offset-2">
                        Vai al sito <Icona nome="vai" size={16} />
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-col gap-2 rounded-2xl border border-linea p-5">
                  <p className="text-[15px] leading-relaxed">Stiamo scegliendo i gestionali da consigliare alle attività di 739, con un accordo e condizioni chiare. Intanto chiedi al tuo commercialista o a chi ti segue la contabilità.</p>
                  <p className="text-[14px] text-testo-2">
                    Fai software gestionali collegati all&apos;HUB SM? <a href={scriviPartner} className="font-semibold text-accento underline underline-offset-2">Scrivici</a>.
                  </p>
                </div>
              )}
              <Link href="/lavorare/fornitori" className="flex items-center gap-1 text-[14px] font-medium text-accento">Cerca tra i fornitori del territorio <Icona nome="avanti" size={14} /></Link>
            </section>
          </div>

          <section className="flex flex-col gap-3" aria-labelledby="t-regole">
            <h2 id="t-regole" className="text-[19px] font-semibold tracking-tight">Cosa dice il decreto</h2>
            <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie">
              {REGOLE.map((r) => (
                <li key={r.titolo} className="flex flex-col gap-1 p-4">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="text-[15px] font-semibold">{r.titolo}</span>
                    <span className="shrink-0 font-mono text-[12px] text-testo-2">{r.articolo}</span>
                  </span>
                  <span className="text-[14px] leading-relaxed text-testo-2">{r.testo}</span>
                </li>
              ))}
            </ul>
            <Link href="/lavorare/calendario-fiscale" className="flex items-center gap-1 text-[14px] font-medium text-accento">Le date nel calendario fiscale <Icona nome="avanti" size={14} /></Link>
          </section>
        </div>

        <aside role="note" className="flex gap-3 rounded-2xl border border-linea p-4 text-sm leading-relaxed">
          <span className="mt-0.5 shrink-0 text-testo-2"><Icona nome="info" size={20} /></span>
          <span className="flex flex-col gap-1.5">
            <span>
              <b className="font-semibold">Pagina informativa di 739, non ufficiale e non è una consulenza.</b> Per il tuo caso senti il commercialista o
              l&apos;{tributario.nome} (<a href={`mailto:${tributario.email}`} className="underline underline-offset-2">{tributario.email}</a>, tel. <a href={tel(tributario.telefono)} className="whitespace-nowrap font-mono underline underline-offset-2">{tributario.telefono}</a>).
            </span>
            <span className="text-[13px] text-testo-2">
              Fonti: {Object.values(FONTI).map((f, i, tutte) => (
                <span key={f.url}><a href={f.url} target="_blank" rel="noopener" className="underline underline-offset-2">{f.nome}</a>{i < tutte.length - 1 ? "; " : "."}</span>
              ))}{" "}
              Letto il {lungo.format(d(AGGIORNATO_IL))}.
            </span>
          </span>
        </aside>
      </section>
    </>
  );
}
