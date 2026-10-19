"use client";

import { useCallback, useEffect, useState } from "react";
import AvvisiPersonali from "@/components/AvvisiPersonali";
import { Icona } from "@/components/Icona";
import { CAMPO } from "@/modules/attivita/components/stile";
import { useSessione } from "@/modules/core/store";
import { giornoSM, istanteSM } from "@/modules/prenotazioni/api";
import { METRI_MESE, METRI_TURNO, chiamateLuogo, quando, salvaChiamata, segna, volontari, type ChiamataLuogo, type Volontario } from "../api";

const ERRORE = "rounded-xl bg-segnale/12 px-4 py-3 text-sm text-segnale";
const STATI: Record<ChiamataLuogo["stato"], string> = { aperta: "Aperta", chiusa: "Iscrizioni chiuse", annullata: "Annullata" };
const giornoDi = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/San_Marino" }).format(new Date(iso));
const oraDi = (iso: string) => new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Europe/San_Marino" }).format(new Date(iso));

/** L'associazione: pubblica chiamate di volontari, vede chi si è iscritto e dopo l'inizio segna chi c'era */
export default function GestioneVolontari({ luogo }: { luogo: string }) {
  const { stato } = useSessione();
  const [lista, setLista] = useState<ChiamataLuogo[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [modifica, setModifica] = useState<ChiamataLuogo | "nuova" | null>(null);

  const carica = useCallback(() => chiamateLuogo(luogo).then((r) => { setLista(r.chiamate); setErrore(r.errore); }), [luogo]);
  useEffect(() => {
    if (stato === "connesso") carica();
  }, [stato, carica]);

  if (stato === "caricamento" || (stato === "connesso" && lista === null && !errore)) return <div className="h-60 animate-pulse rounded-2xl bg-superficie" />;
  if (stato === "ospite") return <p className={ERRORE}>Entra con l&apos;SMR ID per gestire i volontari della tua associazione.</p>;
  if (errore && !lista?.length) return <p role="alert" className={ERRORE}>{errore}</p>;

  return (
    <div className="flex flex-col gap-6">
      <AvvisiPersonali testo="Un avviso sul telefono per ogni volontario che si iscrive." />
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[19px] font-semibold tracking-tight">Le chiamate</h2>
        {modifica === null ? (
          <button type="button" onClick={() => setModifica("nuova")} className="taglio-piccolo flex h-9 items-center gap-1.5 bg-metallo px-4 text-[14px] font-semibold text-su-accento">
            <Icona nome="piu" size={16} /> Nuova chiamata
          </button>
        ) : null}
      </div>
      {modifica !== null ? <ModuloChiamata luogo={luogo} chiamata={modifica === "nuova" ? null : modifica} onFine={() => { setModifica(null); carica(); }} /> : null}
      {lista?.length ? (
        <ul className="flex flex-col gap-3">
          {lista.map((c) => <RigaChiamata key={c.id} c={c} onModifica={() => setModifica(c)} onCambio={carica} luogo={luogo} />)}
        </ul>
      ) : modifica === null ? (
        <p className="rounded-2xl bg-superficie px-4 py-5 text-[15px] leading-relaxed text-testo-2">
          Nessuna chiamata ancora. Serve una mano per una raccolta, una pulizia, una festa? Scrivi cosa c&apos;è da fare, quando e quante persone servono: la chiamata compare in Comunità, «Cercano volontari».
        </p>
      ) : null}
      <p className="text-[13px] leading-relaxed text-testo-2">
        Dopo l&apos;inizio del turno segni chi c&apos;era: ognuno riceve {METRI_TURNO} m (al massimo {METRI_MESE} m al mese dal volontariato), per sé e per il suo castello. La tua presenza la segna un altro dell&apos;associazione. Nome, email e telefono dei volontari servono solo per organizzare il turno.
      </p>
    </div>
  );
}

function RigaChiamata({ c, onModifica, onCambio, luogo }: { c: ChiamataLuogo; onModifica: () => void; onCambio: () => void; luogo: string }) {
  const [aperta, setAperta] = useState(false);
  const [persone, setPersone] = useState<Volontario[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const passata = Date.parse(c.fine) < Date.now();
  const cominciata = Date.parse(c.inizio) <= Date.now();

  const carica = useCallback(() => volontari(c.id).then((r) => { setPersone(r.volontari); setErrore(r.errore); }), [c.id]);
  useEffect(() => {
    if (aperta && persone === null) carica();
  }, [aperta, persone, carica]);

  async function cambiaStato(stato: ChiamataLuogo["stato"]) {
    if (stato === "annullata" && !confirm("Annullare la chiamata? Chi si è iscritto riceve un avviso.")) return;
    const r = await salvaChiamata(luogo, c.id, { titolo: c.titolo, descrizione: c.descrizione, inizio: c.inizio, fine: c.fine, dove: c.dove ?? "", posti: c.posti, stato });
    if (r.errore) setErrore(r.errore);
    else onCambio();
  }

  async function presenza(v: Volontario, presente: boolean) {
    const r = await segna(v.iscrizione_id, presente);
    if (r.errore) setErrore(r.errore);
    else { carica(); onCambio(); }
  }

  return (
    <li className={`flex flex-col gap-3 rounded-2xl bg-superficie p-4 ${c.stato === "annullata" || passata ? "opacity-80" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[16px] font-semibold">{c.titolo}</span>
          <span className="text-[13px] text-testo-2">{quando(c.inizio, c.fine)}{c.dove ? `, ${c.dove}` : ""}</span>
          <span className="text-[13px]"><b className="font-mono font-medium">{c.iscritti}</b> su {c.posti}{c.presenti ? `, ${c.presenti} presenti` : ""}</span>
        </span>
        <span className="shrink-0 text-[12px] font-medium text-testo-2">{passata && c.stato === "aperta" ? "Passata" : STATI[c.stato]}</span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[14px] font-semibold">
        <button type="button" onClick={() => setAperta(!aperta)} className="text-accento">{aperta ? "Nascondi i volontari" : "Vedi i volontari"}</button>
        {!passata && c.stato !== "annullata" ? <button type="button" onClick={onModifica} className="text-accento">Modifica</button> : null}
        {!cominciata && c.stato === "aperta" ? <button type="button" onClick={() => cambiaStato("chiusa")} className="text-testo-2">Chiudi le iscrizioni</button> : null}
        {!cominciata && c.stato === "chiusa" ? <button type="button" onClick={() => cambiaStato("aperta")} className="text-testo-2">Riapri le iscrizioni</button> : null}
        {!cominciata && c.stato !== "annullata" ? <button type="button" onClick={() => cambiaStato("annullata")} className="text-segnale">Annulla</button> : null}
      </div>
      {aperta ? (
        persone === null ? <div className="h-16 animate-pulse rounded-xl bg-fondo" /> : persone.length ? (
          <ul className="divide-y divide-linea overflow-hidden rounded-xl bg-fondo">
            {persone.map((v) => (
              <li key={v.iscrizione_id} className="flex flex-col gap-1 p-3 text-[14px]">
                <span className="flex items-start justify-between gap-3">
                  <span className="font-semibold">{v.nome ?? "SMR ID senza nome"}</span>
                  <span className="shrink-0 text-[12px] text-testo-2">{v.stato === "presente" ? `C'era${v.metri ? `, +${v.metri} m` : ""}` : v.stato === "assente" ? "Non c'era" : "Iscritto"}</span>
                </span>
                <span className="flex flex-wrap gap-x-3 text-[13px]">
                  <a href={`mailto:${v.email}`} className="text-accento underline-offset-2 hover:underline">{v.email}</a>
                  {v.telefono ? <a href={`tel:${v.telefono.replace(/\s/g, "")}`} className="font-mono text-accento">{v.telefono}</a> : null}
                </span>
                {v.nota ? <span className="text-[13px] text-testo-2">{v.nota}</span> : null}
                {cominciata && c.stato !== "annullata" ? (
                  <span className="flex gap-2 pt-1">
                    <button type="button" disabled={v.stato === "presente"} onClick={() => presenza(v, true)} className="h-9 rounded-lg bg-metallo px-3 text-[13px] font-semibold text-su-accento disabled:opacity-40">C&apos;era</button>
                    <button type="button" disabled={v.stato === "assente"} onClick={() => presenza(v, false)} className="h-9 rounded-lg bg-superficie px-3 text-[13px] font-semibold disabled:opacity-40">Non c&apos;era</button>
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : <p className="text-[14px] text-testo-2">Ancora nessuno.</p>
      ) : null}
      {errore ? <p role="alert" className="text-sm text-segnale">{errore}</p> : null}
    </li>
  );
}

function ModuloChiamata({ luogo, chiamata, onFine }: { luogo: string; chiamata: ChiamataLuogo | null; onFine: () => void }) {
  const [titolo, setTitolo] = useState(chiamata?.titolo ?? "");
  const [descrizione, setDescrizione] = useState(chiamata?.descrizione ?? "");
  const [giorno, setGiorno] = useState(chiamata ? giornoDi(chiamata.inizio) : giornoSM(7));
  const [dalle, setDalle] = useState(chiamata ? oraDi(chiamata.inizio) : "09:00");
  const [alle, setAlle] = useState(chiamata ? oraDi(chiamata.fine) : "12:00");
  const [dove, setDove] = useState(chiamata?.dove ?? "");
  const [posti, setPosti] = useState(String(chiamata?.posti ?? 10));
  const [errore, setErrore] = useState<string | null>(null);
  const [invio, setInvio] = useState(false);

  async function salva(e: React.FormEvent) {
    e.preventDefault();
    setInvio(true);
    setErrore(null);
    const r = await salvaChiamata(luogo, chiamata?.id ?? null, {
      titolo: titolo.trim(), descrizione: descrizione.trim(), inizio: istanteSM(giorno, dalle), fine: istanteSM(giorno, alle), dove: dove.trim(), posti: Number(posti), stato: chiamata?.stato ?? "aperta",
    });
    setInvio(false);
    if (r.errore) return setErrore(r.errore);
    onFine();
  }

  return (
    <form onSubmit={salva} className="flex flex-col gap-4 rounded-2xl border border-linea p-4">
      <label className="flex flex-col gap-1.5 text-[14px] font-medium">Cosa serve
        <input required value={titolo} onChange={(e) => setTitolo(e.target.value)} minLength={5} maxLength={80} placeholder="Pulizia del parco di Montecchio" className={`h-12 ${CAMPO}`} />
      </label>
      <label className="flex flex-col gap-1.5 text-[14px] font-medium">Cosa c&apos;è da fare
        <textarea required value={descrizione} onChange={(e) => setDescrizione(e.target.value)} minLength={10} maxLength={800} rows={4} placeholder="Raccogliamo i rifiuti lungo il sentiero. Guanti e sacchi li portiamo noi: servono scarpe comode." className={`py-3 ${CAMPO}`} />
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5 text-[14px] font-medium">Giorno
          <input type="date" required value={giorno} min={giornoSM(0)} onChange={(e) => setGiorno(e.target.value)} className={`h-12 ${CAMPO}`} />
        </label>
        <label className="flex flex-col gap-1.5 text-[14px] font-medium">Dalle
          <input type="time" required value={dalle} onChange={(e) => setDalle(e.target.value)} className={`h-12 ${CAMPO}`} />
        </label>
        <label className="flex flex-col gap-1.5 text-[14px] font-medium">Alle
          <input type="time" required value={alle} onChange={(e) => setAlle(e.target.value)} className={`h-12 ${CAMPO}`} />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
        <label className="flex flex-col gap-1.5 text-[14px] font-medium"><span>Dove <span className="font-normal text-testo-2">(se non è la vostra sede)</span></span>
          <input value={dove} onChange={(e) => setDove(e.target.value)} maxLength={160} placeholder="Parcheggio del parco, Montecchio" className={`h-12 ${CAMPO}`} />
        </label>
        <label className="flex flex-col gap-1.5 text-[14px] font-medium">Persone
          <input type="number" required min={1} max={100} inputMode="numeric" value={posti} onChange={(e) => setPosti(e.target.value)} className={`h-12 ${CAMPO}`} />
        </label>
      </div>
      {errore ? <p role="alert" className={ERRORE}>{errore}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={invio} className="taglio h-11 bg-metallo px-6 text-[15px] font-semibold text-su-accento disabled:opacity-50">{invio ? "Salvo…" : chiamata ? "Salva" : "Pubblica la chiamata"}</button>
        <button type="button" onClick={onFine} className="h-11 rounded-xl px-4 text-[14px] font-semibold text-testo-2">Annulla</button>
      </div>
    </form>
  );
}
