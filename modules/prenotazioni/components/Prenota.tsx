"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Icona } from "@/components/Icona";
import PrimaryButton from "@/components/ui/PrimaryButton";
import Tano from "@/components/Tano";
import { useSessione } from "@/modules/core/store";
import { CAMPO } from "@/modules/attivita/components/stile";
import { disponibilita, giornoSM, infoPrenota, leggiGiorno, leggiOra, prenota, type InfoPrenota, type Slot, type StatoPrenotazione } from "../api";

const chip = new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "numeric", timeZone: "UTC" });
const etichettaGiorno = (g: string, n: number) => (n === 0 ? "Oggi" : n === 1 ? "Domani" : chip.format(new Date(`${g}T12:00:00Z`)).replace(".", ""));
const durata = (min: number) => (min % 60 === 0 ? `${min / 60} ${min === 60 ? "ora" : "ore"}` : min > 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} min`);

/**
 * Prenotare con 739 (migrazione 0046): il giorno, cosa (campo, sala…), l'orario libero, poi telefono e nota.
 * Chi non ha l'SMR ID sceglie lo stesso e entra solo per confermare. Si paga sul posto.
 */
export default function Prenota({ luogo, nome }: { luogo: string; nome: string }) {
  const { stato } = useSessione();
  const [info, setInfo] = useState<InfoPrenota | null | undefined>(undefined);
  const [errore, setErrore] = useState<string | null>(null);
  const [giorno, setGiorno] = useState(giornoSM(0));
  const [risorsa, setRisorsa] = useState<string | null>(null);
  const [slot, setSlot] = useState<Slot[] | null>(null);
  const [scelto, setScelto] = useState<Slot | null>(null);
  const [telefono, setTelefono] = useState("");
  const [nota, setNota] = useState("");
  const [invio, setInvio] = useState(false);
  const [fatto, setFatto] = useState<{ stato: StatoPrenotazione; slot: Slot } | null>(null);
  const [qui, setQui] = useState("");

  useEffect(() => setQui(window.location.pathname), []);

  useEffect(() => {
    infoPrenota(luogo).then((r) => {
      setInfo(r.info);
      setErrore(r.errore);
      if (r.info?.risorse.length) setRisorsa(r.info.risorse[0].id);
    });
  }, [luogo]);

  useEffect(() => {
    if (!info) return;
    setSlot(null);
    setScelto(null);
    let attivo = true;
    disponibilita(luogo, giorno).then((r) => {
      if (!attivo) return;
      setSlot(r.slot);
      if (r.errore) setErrore(r.errore);
    });
    return () => {
      attivo = false;
    };
  }, [luogo, giorno, info]);

  const giorni = useMemo(() => Array.from({ length: (info?.giorni_avanti ?? 0) + 1 }, (_, n) => giornoSM(n)), [info]);
  const dellaRisorsa = (slot ?? []).filter((s) => s.risorsa_id === risorsa);
  const liberi = dellaRisorsa.filter((s) => s.stato === "libero").length;
  const r = info?.risorse.find((x) => x.id === risorsa);

  async function conferma() {
    if (!scelto) return;
    setInvio(true);
    setErrore(null);
    const esito = await prenota(scelto.risorsa_id, scelto.inizio, telefono.trim(), nota.trim());
    setInvio(false);
    if (esito.errore || !esito.esito) {
      setErrore(esito.errore ?? "La prenotazione non è andata. Riprova tra poco.");
      disponibilita(luogo, giorno).then((x) => setSlot(x.slot));
      return;
    }
    setFatto({ stato: esito.esito.stato, slot: scelto });
  }

  if (info === undefined) return <div className="h-80 animate-pulse rounded-2xl bg-superficie" aria-busy="true" aria-label="Carico gli orari" />;

  if (!info) {
    return (
      <section className="flex flex-col gap-3 rounded-2xl bg-superficie p-5">
        <h2 className="text-[19px] font-semibold tracking-tight">Adesso non si prenota da 739</h2>
        <p className="text-[15px] leading-relaxed text-testo-2">{errore ?? `${nome} non accetta prenotazioni da 739 in questo momento. Per prenotare chiama o scrivi al centro: trovi i contatti nella scheda.`}</p>
        <PrimaryButton variante="interno" href={`/luoghi/${luogo}`}>Torna alla scheda</PrimaryButton>
      </section>
    );
  }

  if (fatto) {
    const confermata = fatto.stato === "confermata";
    return (
      <section className="flex flex-col items-start gap-4 rounded-2xl bg-superficie p-5" role="status">
        <Tano posa="pollice" className="h-32 w-auto" />
        <h2 className="text-[24px] font-semibold leading-tight tracking-tight">{confermata ? "Prenotazione confermata" : "Richiesta inviata"}</h2>
        <p className="text-[15px] leading-relaxed text-testo-2">
          {r?.nome}, {leggiGiorno(fatto.slot.inizio)} dalle <span className="font-mono">{leggiOra(fatto.slot.inizio)}</span> alle <span className="font-mono">{leggiOra(fatto.slot.fine)}</span>.{" "}
          {confermata ? "Ti aspettano: si paga sul posto." : `${nome} la conferma il prima possibile: lo vedi in «Le mie prenotazioni».`}
        </p>
        <div className="flex w-full flex-col gap-2 sm:flex-row">
          <PrimaryButton href="/profile/prenotazioni" pieno>Le mie prenotazioni</PrimaryButton>
          <PrimaryButton variante="interno" href={`/luoghi/${luogo}`} pieno>Torna alla scheda</PrimaryButton>
        </div>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Le regole del centro, prima di scegliere */}
      <ul className="flex flex-col gap-2 rounded-2xl bg-superficie p-4 text-[14px] leading-snug text-testo-2">
        <li className="flex gap-2.5"><span className="mt-0.5 shrink-0 text-testo"><Icona nome="scudo" size={18} /></span>{info.conferma === "automatica" ? "Confermata subito, se l'orario è libero." : "Mandi una richiesta: il centro la conferma e lo vedi in «Le mie prenotazioni»."}</li>
        <li className="flex gap-2.5"><span className="mt-0.5 shrink-0 text-testo"><Icona nome="banca" size={18} /></span>Si paga sul posto, come sempre. 739 non chiede soldi.</li>
        <li className="flex gap-2.5"><span className="mt-0.5 shrink-0 text-testo"><Icona nome="orologio" size={18} /></span>{info.disdetta_ore ? `Puoi annullare da 739 fino a ${info.disdetta_ore} ${info.disdetta_ore === 1 ? "ora" : "ore"} prima; dopo, chiama il centro.` : "Puoi annullare da 739 fino all'inizio."} Chi non si presenta due volte non prenota per un mese.</li>
        {info.nota ? <li className="flex gap-2.5"><span className="mt-0.5 shrink-0 text-testo"><Icona nome="info" size={18} /></span><span className="text-testo">{info.nota}</span></li> : null}
      </ul>

      {/* Il giorno */}
      <section className="flex flex-col gap-2.5" aria-labelledby="t-giorno">
        <h2 id="t-giorno" className="text-[17px] font-semibold tracking-tight">Quando</h2>
        <div className="-mx-[var(--lato)] flex gap-2 overflow-x-auto px-[var(--lato)] pb-1 [scrollbar-width:none] lg:mx-0 lg:flex-wrap lg:px-0">
          {giorni.map((g, n) => (
            <button key={g} type="button" onClick={() => setGiorno(g)} aria-pressed={g === giorno}
              className={`h-11 shrink-0 rounded-xl px-4 text-[14px] font-medium capitalize transition-colors ${g === giorno ? "bg-metallo text-su-accento" : "bg-superficie hover:bg-superficie-2"}`}>
              {etichettaGiorno(g, n)}
            </button>
          ))}
        </div>
      </section>

      {/* Cosa */}
      {info.risorse.length > 1 ? (
        <section className="flex flex-col gap-2.5" aria-labelledby="t-cosa">
          <h2 id="t-cosa" className="text-[17px] font-semibold tracking-tight">Cosa</h2>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
            {info.risorse.map((x) => (
              <button key={x.id} type="button" onClick={() => { setRisorsa(x.id); setScelto(null); }} aria-pressed={x.id === risorsa}
                className={`flex flex-col items-start rounded-xl px-4 py-3 text-left transition-colors ${x.id === risorsa ? "bg-metallo text-su-accento" : "bg-superficie hover:bg-superficie-2"}`}>
                <span className="text-[15px] font-semibold">{x.nome}</span>
                <span className={`text-[13px] ${x.id === risorsa ? "text-zinc-300" : "text-testo-2"}`}>{durata(x.durata_min)}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {/* L'orario */}
      <section className="flex flex-col gap-2.5" aria-labelledby="t-ora">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="t-ora" className="text-[17px] font-semibold tracking-tight">{info.risorse.length > 1 ? "A che ora" : `${r?.nome ?? "A che ora"}`}</h2>
          {r ? <span className="text-[13px] text-testo-2">{info.risorse.length > 1 ? "" : `${durata(r.durata_min)}, `}{slot ? (liberi === 1 ? "1 libero" : `${liberi} liberi`) : ""}</span> : null}
        </div>
        {r?.descrizione ? <p className="-mt-1 text-[14px] text-testo-2">{r.descrizione}</p> : null}
        {slot === null ? (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">{Array.from({ length: 8 }, (_, i) => <div key={i} className="h-11 animate-pulse rounded-xl bg-superficie" />)}</div>
        ) : dellaRisorsa.length === 0 ? (
          <p className="rounded-2xl bg-superficie px-4 py-5 text-[15px] text-testo-2">Questo giorno è chiuso. Prova un altro giorno.</p>
        ) : (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {dellaRisorsa.map((s) => {
              const libero = s.stato === "libero";
              const preso = scelto?.inizio === s.inizio && scelto.risorsa_id === s.risorsa_id;
              return (
                <button key={s.inizio} type="button" disabled={!libero} onClick={() => setScelto(s)} aria-pressed={preso}
                  aria-label={`${leggiOra(s.inizio)}, ${libero ? "libero" : s.stato === "passato" ? "non più prenotabile" : "occupato"}`}
                  className={`h-11 rounded-xl font-mono text-[15px] font-medium transition-colors ${preso ? "bg-metallo text-su-accento" : libero ? "bg-superficie hover:bg-superficie-2" : "cursor-not-allowed text-testo-2/50 line-through"}`}>
                  {leggiOra(s.inizio)}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Conferma */}
      {scelto ? (
        <section className="flex flex-col gap-3 rounded-2xl border border-linea p-4" aria-labelledby="t-riepilogo">
          <h2 id="t-riepilogo" className="text-[17px] font-semibold leading-snug tracking-tight">
            {r?.nome}, <span className="first-letter:uppercase">{leggiGiorno(scelto.inizio)}</span>, <span className="font-mono">{leggiOra(scelto.inizio)}–{leggiOra(scelto.fine)}</span>
          </h2>
          {stato === "connesso" ? (
            <>
              <label className="flex flex-col gap-1.5 text-[14px] font-medium">
                Telefono <span className="font-normal text-testo-2">Facoltativo: lo vede solo il centro, se deve avvisarti.</span>
                <input type="tel" inputMode="tel" autoComplete="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} maxLength={30} className={`h-12 ${CAMPO}`} />
              </label>
              <label className="flex flex-col gap-1.5 text-[14px] font-medium">
                Nota per il centro <span className="font-normal text-testo-2">Facoltativa: quanti siete, se vi serve qualcosa.</span>
                <textarea value={nota} onChange={(e) => setNota(e.target.value)} maxLength={300} rows={2} className={`py-3 ${CAMPO}`} />
              </label>
              {errore ? <p role="alert" className="rounded-xl bg-segnale/12 px-4 py-3 text-sm text-segnale">{errore}</p> : null}
              <PrimaryButton type="button" onClick={conferma} disabled={invio} pieno>
                {invio ? "Prenoto…" : info.conferma === "automatica" ? "Prenota" : "Manda la richiesta"}
              </PrimaryButton>
              <p className="text-[13px] text-testo-2">Il centro vedrà il tuo nome, l&apos;email del tuo SMR ID e il telefono, se lo scrivi.</p>
            </>
          ) : stato === "ospite" ? (
            <>
              <p className="text-[15px] text-testo-2">Per prenotare serve il tuo SMR ID: entra o crealo in un minuto, poi torni qui.</p>
              <PrimaryButton href={`/profile?torna=${encodeURIComponent(qui)}`} pieno>Entra con SMR ID</PrimaryButton>
            </>
          ) : null}
        </section>
      ) : errore ? (
        <p role="alert" className="rounded-xl bg-segnale/12 px-4 py-3 text-sm text-segnale">{errore}</p>
      ) : null}

      <p className="text-[13px] text-testo-2">
        Le prenotazioni le gestisce {nome}; 739 le porta soltanto. <Link href="/termini" className="font-medium text-accento">Come funziona</Link>
      </p>
    </div>
  );
}
