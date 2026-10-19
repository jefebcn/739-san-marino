"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PrimaryButton from "@/components/ui/PrimaryButton";
import Tano from "@/components/Tano";
import { leggiCastello } from "@/components/Castello";
import { CAMPO } from "@/modules/attivita/components/stile";
import { useSessione } from "@/modules/core/store";
import { DURATE, proponiAnnuncio, TIPI_ANNUNCIO, type TipoAnnuncio } from "../api";

type Castello = { id: number; nome: string; slug: string };

/** Scrivere in bacheca (con SMR ID): tipo, titolo, testo, castello, contatto, quanto resta. Va alla redazione. */
export default function NuovoAnnuncio({ castelli }: { castelli: Castello[] }) {
  const { stato, profilo } = useSessione();
  const [tipo, setTipo] = useState<TipoAnnuncio>("cerco");
  const [titolo, setTitolo] = useState("");
  const [testo, setTesto] = useState("");
  const [castello, setCastello] = useState<number | null>(null);
  const [contatto, setContatto] = useState("");
  const [giorni, setGiorni] = useState(30);
  const [invio, setInvio] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [fatto, setFatto] = useState(false);

  useEffect(() => {
    const slug = leggiCastello();
    setCastello(profilo?.castello_id ?? castelli.find((c) => c.slug === slug)?.id ?? null);
  }, [profilo, castelli]);

  async function invia(e: React.FormEvent) {
    e.preventDefault();
    setInvio(true);
    setErrore(null);
    const r = await proponiAnnuncio({ tipo, titolo: titolo.trim(), testo: testo.trim(), castello_id: castello, contatto: contatto.trim(), giorni });
    setInvio(false);
    if (r.errore) return setErrore(r.errore);
    setFatto(true);
  }

  if (stato === "caricamento") return <div className="h-96 animate-pulse rounded-2xl bg-superficie" />;
  if (stato === "ospite") {
    return (
      <section className="flex flex-col gap-4 rounded-2xl bg-superficie p-5">
        <p className="text-[15px] leading-relaxed text-testo-2">In bacheca si scrive con il tuo SMR ID: così sappiamo che sei una persona e puoi chiudere l&apos;annuncio quando hai finito.</p>
        <PrimaryButton href="/profile?torna=/comunita/bacheca/nuovo" className="w-fit">Entra con SMR ID</PrimaryButton>
      </section>
    );
  }
  if (fatto) {
    return (
      <section className="flex flex-col items-start gap-4 rounded-2xl bg-superficie p-5" role="status">
        <Tano posa="pollice" className="h-32 w-auto" />
        <h2 className="text-[22px] font-semibold tracking-tight">Annuncio mandato</h2>
        <p className="text-[15px] leading-relaxed text-testo-2">La redazione lo legge e lo mette in bacheca, di solito in giornata. Lo segui da «I miei annunci», dove puoi anche chiuderlo.</p>
        <div className="flex flex-wrap gap-2">
          <PrimaryButton href="/profile/bacheca">I miei annunci</PrimaryButton>
          <PrimaryButton href="/comunita/bacheca" variante="secondario">Torna alla bacheca</PrimaryButton>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={invia} className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-[14px] font-medium">Che annuncio è</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {(Object.keys(TIPI_ANNUNCIO) as TipoAnnuncio[]).map((t) => (
            <button key={t} type="button" aria-pressed={tipo === t} onClick={() => setTipo(t)}
              className={`flex flex-col items-start rounded-xl px-4 py-3 text-left transition-colors ${tipo === t ? "bg-metallo text-su-accento" : "bg-superficie hover:bg-superficie-2"}`}>
              <span className="text-[15px] font-semibold">{TIPI_ANNUNCIO[t].nome}</span>
              <span className={`text-[12px] leading-snug ${tipo === t ? "text-zinc-300" : "text-testo-2"}`}>{TIPI_ANNUNCIO[t].riga}</span>
            </button>
          ))}
        </div>
      </fieldset>
      <label className="flex flex-col gap-1.5 text-[14px] font-medium">Titolo
        <input required value={titolo} onChange={(e) => setTitolo(e.target.value)} minLength={5} maxLength={80} placeholder="Cerco passaggio per Rimini il martedì" className={`h-12 ${CAMPO}`} />
      </label>
      <label className="flex flex-col gap-1.5 text-[14px] font-medium">Testo
        <textarea required value={testo} onChange={(e) => setTesto(e.target.value)} minLength={10} maxLength={600} rows={5} className={`py-3 ${CAMPO}`} />
        <span className="text-[12px] font-normal text-testo-2">{testo.length}/600</span>
      </label>
      <label className="flex flex-col gap-1.5 text-[14px] font-medium">Dove
        <select value={castello ?? ""} onChange={(e) => setCastello(e.target.value ? Number(e.target.value) : null)} className={`h-12 ${CAMPO}`}>
          <option value="">Tutto il territorio</option>
          {castelli.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-[14px] font-medium">Come contattarti
        <input required value={contatto} onChange={(e) => setContatto(e.target.value)} minLength={5} maxLength={120} placeholder="Telefono o email" className={`h-12 ${CAMPO}`} />
        <span className="text-[12px] font-normal text-testo-2">Lo vede solo chi è entrato con l&apos;SMR ID.</span>
      </label>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-[14px] font-medium">Quanto resta in bacheca</legend>
        <div className="flex flex-wrap gap-2">
          {DURATE.map((g) => (
            <button key={g} type="button" aria-pressed={giorni === g} onClick={() => setGiorni(g)}
              className={`h-10 rounded-xl px-4 text-[14px] font-medium ${giorni === g ? "bg-metallo text-su-accento" : "bg-superficie hover:bg-superficie-2"}`}>{g} giorni</button>
          ))}
        </div>
      </fieldset>
      <p className="rounded-xl bg-superficie px-4 py-3 text-[13px] leading-relaxed text-testo-2">
        Lo legge la redazione prima che esca. Non vanno in bacheca: vendite e pubblicità di attività (per quelle c&apos;è la scheda), offerte di lavoro (ci sono le <Link href="/lavorare/lavoro" className="underline">Offerte di lavoro</Link>), politica, animali o cose in vendita che la legge non permette, nomi, foto o dati di altre persone. Le regole complete sono nei <Link href="/termini" className="underline">Termini</Link>.
      </p>
      {errore ? <p role="alert" className="rounded-xl bg-segnale/12 px-4 py-3 text-sm text-segnale">{errore}</p> : null}
      <PrimaryButton type="submit" disabled={invio} className="w-fit">{invio ? "Mando…" : "Manda alla redazione"}</PrimaryButton>
    </form>
  );
}
