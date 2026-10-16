"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Cella, Cruscotto } from "@/components/Cruscotto";
import { Icona } from "@/components/Icona";
import PrimaryButton from "@/components/ui/PrimaryButton";
import type { Orari } from "@/modules/attivita/api";
import OrariSettimana from "@/modules/attivita/components/OrariSettimana";
import { CAMPO } from "@/modules/attivita/components/stile";
import {
  blocca, blocchi as leggiBlocchi, decidi, gestione as leggiGestione, giornoSM, istanteSM, leggiGiorno, leggiOra, prenotazioniCentro,
  salvaImpostazioni, salvaRisorsa, STATI, togliBlocco, type Blocco, type Gestione, type Impostazioni, type PrenotazioneCentro, type Risorsa,
} from "../api";

const chip = new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "numeric", timeZone: "UTC" });
const giornoDi = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/San_Marino" }).format(new Date(iso));
const durata = (min: number) => (min % 60 === 0 ? `${min / 60} ${min === 60 ? "ora" : "ore"}` : min > 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} min`);
const DURATE = [15, 30, 45, 60, 90, 120, 180, 240];
const ERRORE = "rounded-xl bg-segnale/12 px-4 py-3 text-sm text-segnale";

type Vista = "agenda" | "impostazioni";

/**
 * Le prenotazioni di 739 per chi gestisce la scheda (migrazione 0046): il cruscotto, le richieste da confermare,
 * l'agenda per giorno e, in «Impostazioni», cosa si prenota, regole e orari, orari chiusi.
 */
export default function GestionePrenotazioni({ luogo }: { luogo: string }) {
  const [g, setG] = useState<Gestione | null | undefined>(undefined);
  const [lista, setLista] = useState<PrenotazioneCentro[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [vista, setVista] = useState<Vista>("agenda");

  const carica = useCallback(async () => {
    const r = await leggiGestione(luogo);
    setG(r.gestione);
    setErrore(r.errore);
    if (!r.gestione) return;
    const p = await prenotazioniCentro(luogo, giornoSM(0), 62);
    setLista(p.prenotazioni);
    if (p.errore) setErrore(p.errore);
    if (!r.gestione.impostazioni.attiva && !r.gestione.risorse.length) setVista("impostazioni");
  }, [luogo]);

  useEffect(() => {
    carica();
  }, [carica]);

  if (g === undefined) return <div className="h-64 animate-pulse rounded-2xl bg-superficie" aria-busy="true" aria-label="Carico le prenotazioni" />;
  if (!g) return <p role="alert" className={ERRORE}>{errore ?? "Questa scheda non la gestisci tu."}</p>;

  const attiva = g.impostazioni.attiva;
  const prossima = (lista ?? []).find((p) => p.stato === "confermata" && Date.parse(p.fine) > Date.now());

  return (
    <div className="flex flex-col gap-6">
      <Cruscotto etichetta="Prenotazioni adesso" colonne={2}>
        <Cella titolo="Prenotazioni" valore={attiva ? "Aperte" : "Spente"} unita={attiva ? (g.impostazioni.conferma === "automatica" ? "conferma automatica" : "confermi tu") : "accendile in Impostazioni"} nota={attiva ? <Link href={`/luoghi/${luogo}/prenota`} className="underline">Apri la pagina pubblica</Link> : undefined} />
        <Cella titolo="Da confermare" valore={g.in_attesa} unita={g.in_attesa === 1 ? "richiesta" : "richieste"} avviso={g.in_attesa > 0} nota={g.in_attesa ? "Rispondi presto: chi prenota aspetta" : "Nessuna in attesa"} />
        <Cella titolo="Oggi" valore={g.oggi} unita={g.oggi === 1 ? "prenotazione" : "prenotazioni"} />
        <Cella titolo="Prossima" valore={prossima ? leggiOra(prossima.inizio) : "–"} unita={prossima ? (giornoDi(prossima.inizio) === giornoSM(0) ? "oggi" : leggiGiorno(prossima.inizio)) : "nessuna confermata"} nota={prossima ? `${prossima.risorsa}, ${prossima.nome ?? "SMR ID"}` : undefined} />
      </Cruscotto>

      <div role="tablist" aria-label="Prenotazioni" className="grid grid-cols-2 gap-1 rounded-xl bg-superficie p-1">
        {(["agenda", "impostazioni"] as const).map((v) => (
          <button key={v} role="tab" type="button" aria-selected={vista === v} onClick={() => setVista(v)}
            className={`h-10 rounded-lg text-[15px] font-semibold transition-colors ${vista === v ? "bg-fondo text-testo shadow-sm" : "text-testo-2 hover:text-testo"}`}>
            {v === "agenda" ? "Agenda" : "Impostazioni"}
          </button>
        ))}
      </div>

      {errore ? <p role="alert" className={ERRORE}>{errore}</p> : null}

      {vista === "agenda" ? (
        <Agenda lista={lista} giorniAvanti={g.impostazioni.giorni_avanti} onCambia={carica} vuota={!g.risorse.length} apriImpostazioni={() => setVista("impostazioni")} />
      ) : (
        <div className="flex flex-col gap-8">
          <Risorse luogo={luogo} risorse={g.risorse} onCambia={carica} />
          <Regole luogo={luogo} iniziali={g.impostazioni} orariScheda={g.orari_scheda} haRisorse={g.risorse.some((r) => r.attiva !== false)} onCambia={carica} />
          <OrariChiusi luogo={luogo} risorse={g.risorse} />
        </div>
      )}
    </div>
  );
}

// ——— Agenda ———

function Agenda({ lista, giorniAvanti, onCambia, vuota, apriImpostazioni }: { lista: PrenotazioneCentro[] | null; giorniAvanti: number; onCambia: () => void; vuota: boolean; apriImpostazioni: () => void }) {
  const [giorno, setGiorno] = useState(giornoSM(0));
  const giorni = useMemo(() => Array.from({ length: Math.min(giorniAvanti, 13) + 1 }, (_, n) => giornoSM(n)), [giorniAvanti]);
  if (lista === null) return <div className="h-40 animate-pulse rounded-2xl bg-superficie" />;

  if (vuota) {
    return (
      <section className="flex flex-col gap-3 rounded-2xl bg-superficie p-5">
        <h2 className="text-[19px] font-semibold tracking-tight">Per cominciare</h2>
        <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-[15px] text-testo-2">
          <li>Scrivi cosa si prenota: un campo, una sala, una poltrona, con quanto dura un turno.</li>
          <li>Scegli gli orari e come confermi: tu, oppure in automatico.</li>
          <li>Accendi le prenotazioni: nella scheda compare «Prenota con 739».</li>
        </ol>
        <PrimaryButton type="button" onClick={apriImpostazioni}>Vai alle impostazioni</PrimaryButton>
      </section>
    );
  }

  const daConfermare = lista.filter((p) => p.stato === "richiesta" && Date.parse(p.fine) > Date.now());
  const delGiorno = lista.filter((p) => giornoDi(p.inizio) === giorno);
  const conta = (gg: string) => lista.filter((p) => giornoDi(p.inizio) === gg && (p.stato === "richiesta" || p.stato === "confermata")).length;

  return (
    <div className="flex flex-col gap-6">
      {daConfermare.length ? (
        <section className="flex flex-col gap-3" aria-labelledby="t-attesa">
          <h2 id="t-attesa" className="text-[19px] font-semibold tracking-tight">Da confermare</h2>
          <ul className="divide-y divide-linea overflow-hidden rounded-2xl border border-linea">
            {daConfermare.map((p) => <RigaPrenotazione key={p.id} p={p} conGiorno onCambia={onCambia} />)}
          </ul>
        </section>
      ) : null}

      <section className="flex flex-col gap-3" aria-labelledby="t-agenda">
        <h2 id="t-agenda" className="text-[19px] font-semibold tracking-tight">Agenda</h2>
        <div className="-mx-[var(--lato)] flex gap-2 overflow-x-auto px-[var(--lato)] pb-1 [scrollbar-width:none] lg:mx-0 lg:flex-wrap lg:px-0">
          {giorni.map((gg, n) => {
            const c = conta(gg);
            return (
              <button key={gg} type="button" onClick={() => setGiorno(gg)} aria-pressed={gg === giorno}
                className={`flex h-11 shrink-0 items-center gap-2 rounded-xl px-4 text-[14px] font-medium capitalize transition-colors ${gg === giorno ? "bg-metallo text-su-accento" : "bg-superficie hover:bg-superficie-2"}`}>
                {n === 0 ? "Oggi" : n === 1 ? "Domani" : chip.format(new Date(`${gg}T12:00:00Z`)).replace(".", "")}
                {c ? <span className="font-mono text-[12px] opacity-70">{c}</span> : null}
              </button>
            );
          })}
        </div>
        {delGiorno.length ? (
          <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie">
            {delGiorno.map((p) => <RigaPrenotazione key={p.id} p={p} onCambia={onCambia} />)}
          </ul>
        ) : (
          <p className="rounded-2xl bg-superficie px-4 py-5 text-[15px] text-testo-2">Nessuna prenotazione in questo giorno.</p>
        )}
      </section>
      <p className="text-[13px] text-testo-2">Nome, email e telefono di chi prenota servono solo per questa prenotazione: non usarli per altro (pubblicità, liste). Lo dicono i Termini di 739.</p>
    </div>
  );
}

function RigaPrenotazione({ p, conGiorno = false, onCambia }: { p: PrenotazioneCentro; conGiorno?: boolean; onCambia: () => void }) {
  const [azione, setAzione] = useState<"rifiutata" | "annullata" | null>(null);
  const [nota, setNota] = useState("");
  const [invio, setInvio] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const iniziata = Date.parse(p.inizio) <= Date.now();
  const attiva = p.stato === "richiesta" || p.stato === "confermata";

  async function fai(stato: "confermata" | "rifiutata" | "annullata" | "assente", testo = "") {
    setInvio(true);
    setErrore(null);
    const r = await decidi(p.id, stato, testo);
    setInvio(false);
    if (r.errore) setErrore(r.errore);
    else {
      setAzione(null);
      onCambia();
    }
  }

  return (
    <li className={`flex flex-col gap-2 p-4 ${attiva ? "" : "opacity-60"}`}>
      <div className="flex items-start gap-3">
        <span className="w-14 shrink-0 font-mono text-[16px] font-medium leading-6">{leggiOra(p.inizio)}</span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-[15px] font-semibold">{p.nome ?? "SMR ID senza nome"}</span>
          <span className="text-[13px] text-testo-2">
            {p.risorsa}, fino alle <span className="font-mono">{leggiOra(p.fine)}</span>{conGiorno ? <>, <span>{leggiGiorno(p.inizio)}</span></> : null}
          </span>
        </div>
        <span className="shrink-0 text-[12px] font-medium text-testo-2">{p.stato === "annullata" && p.annullata_da === "cliente" ? "Annullata dal cliente" : STATI[p.stato as keyof typeof STATI]}</span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 pl-[68px] text-[14px]">
        {p.telefono ? <a href={`tel:${p.telefono.replace(/[^+0-9]/g, "")}`} className="font-medium text-accento">{p.telefono}</a> : null}
        {p.email ? <a href={`mailto:${p.email}`} className="truncate font-medium text-accento">{p.email}</a> : null}
      </div>
      {p.nota ? <p className="ml-[68px] rounded-xl bg-fondo px-3 py-2 text-[14px]">{p.nota}</p> : null}
      {errore ? <p role="alert" className={`ml-[68px] ${ERRORE}`}>{errore}</p> : null}

      {azione ? (
        <div className="ml-[68px] flex flex-col gap-2">
          <label className="flex flex-col gap-1.5 text-[14px] font-medium">
            Perché? <span className="font-normal text-testo-2">Facoltativo: lo legge chi ha prenotato.</span>
            <input value={nota} onChange={(e) => setNota(e.target.value)} maxLength={300} className={`h-11 ${CAMPO}`} />
          </label>
          <div className="flex gap-2">
            <button type="button" disabled={invio} onClick={() => fai(azione, nota)} className="h-10 rounded-xl bg-segnale-pieno px-4 text-sm font-semibold text-white disabled:opacity-50">
              {azione === "rifiutata" ? "Non accettare" : "Annulla la prenotazione"}
            </button>
            <button type="button" onClick={() => setAzione(null)} className="h-10 rounded-xl px-4 text-sm font-semibold text-testo-2 hover:bg-superficie-2">Lascia stare</button>
          </div>
        </div>
      ) : p.stato === "richiesta" ? (
        <div className="ml-[68px] flex gap-2">
          <button type="button" disabled={invio} onClick={() => fai("confermata")} className="taglio-piccolo h-10 bg-metallo px-5 text-sm font-semibold text-su-accento disabled:opacity-50">Conferma</button>
          <button type="button" onClick={() => setAzione("rifiutata")} className="h-10 rounded-xl px-4 text-sm font-semibold text-segnale hover:bg-segnale/12">Non accettare</button>
        </div>
      ) : p.stato === "confermata" ? (
        <div className="ml-[68px] flex gap-2">
          {iniziata ? (
            <button type="button" disabled={invio} onClick={() => fai("assente")} className="h-10 rounded-xl px-4 text-sm font-semibold text-testo-2 hover:bg-superficie-2">Non si è presentato</button>
          ) : (
            <button type="button" onClick={() => setAzione("annullata")} className="h-10 rounded-xl px-4 text-sm font-semibold text-segnale hover:bg-segnale/12">Annulla</button>
          )}
        </div>
      ) : null}
    </li>
  );
}

// ——— Cosa si prenota ———

type Bozza = { nome: string; descrizione: string; durata_min: number; attiva: boolean; orari: Orari | null };

function Risorse({ luogo, risorse, onCambia }: { luogo: string; risorse: Risorsa[]; onCambia: () => void }) {
  const [aperta, setAperta] = useState<string | "nuova" | null>(risorse.length ? null : "nuova");
  return (
    <section className="flex flex-col gap-3" aria-labelledby="t-risorse">
      <div className="flex flex-col gap-0.5">
        <h2 id="t-risorse" className="text-[19px] font-semibold tracking-tight">Cosa si prenota</h2>
        <p className="text-[14px] text-testo-2">Ogni campo, sala o poltrona a parte, con quanto dura un turno.</p>
      </div>
      {risorse.length ? (
        <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie">
          {risorse.map((r) => (
            <li key={r.id}>
              {aperta === r.id ? (
                <div className="p-4"><ModuloRisorsa luogo={luogo} r={r} onFatto={() => { setAperta(null); onCambia(); }} onAnnulla={() => setAperta(null)} /></div>
              ) : (
                <button type="button" onClick={() => setAperta(r.id)} className="flex w-full items-center gap-3 p-4 text-left hover:bg-superficie-2">
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-[15px] font-semibold">{r.nome}</span>
                    <span className="text-[13px] text-testo-2">{durata(r.durata_min)}{r.orari ? ", orari suoi" : ""}{r.attiva === false ? ", spenta" : ""}</span>
                  </span>
                  <span className="text-sm font-medium text-accento">Modifica</span>
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : null}
      {aperta === "nuova" ? (
        <div className="rounded-2xl border border-linea p-4"><ModuloRisorsa luogo={luogo} r={null} onFatto={() => { setAperta(null); onCambia(); }} onAnnulla={risorse.length ? () => setAperta(null) : undefined} /></div>
      ) : risorse.length < 20 ? (
        <button type="button" onClick={() => setAperta("nuova")} className="flex h-12 items-center justify-center gap-2 rounded-xl border border-dashed border-linea text-[15px] font-medium text-testo-2 hover:bg-superficie">
          <Icona nome="piu" size={18} /> Aggiungi
        </button>
      ) : null}
    </section>
  );
}

function ModuloRisorsa({ luogo, r, onFatto, onAnnulla }: { luogo: string; r: Risorsa | null; onFatto: () => void; onAnnulla?: () => void }) {
  const [b, setB] = useState<Bozza>({ nome: r?.nome ?? "", descrizione: r?.descrizione ?? "", durata_min: r?.durata_min ?? 60, attiva: r?.attiva ?? true, orari: r?.orari ?? null });
  const [invio, setInvio] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const cambia = (x: Partial<Bozza>) => setB((v) => ({ ...v, ...x }));

  async function salva(e: React.FormEvent) {
    e.preventDefault();
    setInvio(true);
    const esito = await salvaRisorsa(luogo, r?.id ?? null, b);
    setInvio(false);
    if (esito.errore) setErrore(esito.errore);
    else onFatto();
  }

  return (
    <form onSubmit={salva} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5 text-[14px] font-medium">
        Nome
        <input required value={b.nome} onChange={(e) => cambia({ nome: e.target.value })} maxLength={60} placeholder="Campo 1, Padel coperto, Sala prove" className={`h-12 ${CAMPO}`} />
      </label>
      <label className="flex flex-col gap-1.5 text-[14px] font-medium">
        Quanto dura un turno
        <select value={b.durata_min} onChange={(e) => cambia({ durata_min: Number(e.target.value) })} className={`h-12 ${CAMPO}`}>
          {(DURATE.includes(b.durata_min) ? DURATE : [...DURATE, b.durata_min].sort((x, y) => x - y)).map((d) => <option key={d} value={d}>{durata(d)}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-[14px] font-medium">
        Descrizione <span className="font-normal text-testo-2">Facoltativa: coperto, illuminato, per quante persone.</span>
        <input value={b.descrizione} onChange={(e) => cambia({ descrizione: e.target.value })} maxLength={200} className={`h-12 ${CAMPO}`} />
      </label>
      <label className="flex items-center gap-2.5 text-[15px]">
        <input type="checkbox" checked={!!b.orari} onChange={(e) => cambia({ orari: e.target.checked ? {} : null })} className="size-5 accent-[var(--accento)]" />
        Ha orari diversi dal resto del centro
      </label>
      {b.orari ? <OrariSettimana valore={b.orari} onCambia={(o) => cambia({ orari: o })} /> : null}
      {r ? (
        <label className="flex items-center gap-2.5 text-[15px]">
          <input type="checkbox" checked={b.attiva} onChange={(e) => cambia({ attiva: e.target.checked })} className="size-5 accent-[var(--accento)]" />
          Si può prenotare (togli la spunta per spegnerla senza perdere le prenotazioni fatte)
        </label>
      ) : null}
      {errore ? <p role="alert" className={ERRORE}>{errore}</p> : null}
      <div className="flex gap-2">
        <PrimaryButton type="submit" disabled={invio}>{invio ? "Salvo…" : r ? "Salva" : "Aggiungi"}</PrimaryButton>
        {onAnnulla ? <PrimaryButton type="button" variante="fantasma" onClick={onAnnulla}>Annulla</PrimaryButton> : null}
      </div>
    </form>
  );
}

// ——— Regole e orari ———

const ANTICIPI = [0, 1, 2, 3, 6, 12, 24, 48];
const AVANTI = [7, 14, 21, 30, 60, 90];
const DISDETTE = [0, 2, 6, 12, 24, 48];
const MASSIMI = [1, 2, 3, 4, 5, 10];
const ore = (n: number) => (n === 0 ? "nessun limite" : n === 1 ? "1 ora" : `${n} ore`);

function Regole({ luogo, iniziali, orariScheda, haRisorse, onCambia }: { luogo: string; iniziali: Impostazioni; orariScheda: Orari | null; haRisorse: boolean; onCambia: () => void }) {
  const [i, setI] = useState<Impostazioni>(iniziali);
  const [propri, setPropri] = useState(!!iniziali.orari || !orariScheda);
  const [invio, setInvio] = useState(false);
  const [esito, setEsito] = useState<{ ok: boolean; testo: string } | null>(null);
  const cambia = (x: Partial<Impostazioni>) => setI((v) => ({ ...v, ...x }));

  async function salva(e: React.FormEvent) {
    e.preventDefault();
    setInvio(true);
    setEsito(null);
    const r = await salvaImpostazioni(luogo, { ...i, orari: propri ? (i.orari ?? {}) : null });
    setInvio(false);
    setEsito(r.errore ? { ok: false, testo: r.errore } : { ok: true, testo: i.attiva ? "Salvato: le prenotazioni sono aperte e nella scheda c'è «Prenota con 739»." : "Salvato. Le prenotazioni restano spente." });
    if (!r.errore) onCambia();
  }

  const scelta = (label: string, valore: number, opzioni: number[], testo: (n: number) => string, chiave: keyof Impostazioni) => (
    <label className="flex flex-col gap-1.5 text-[14px] font-medium">
      {label}
      <select value={valore} onChange={(e) => cambia({ [chiave]: Number(e.target.value) } as Partial<Impostazioni>)} className={`h-12 ${CAMPO}`}>
        {(opzioni.includes(valore) ? opzioni : [...opzioni, valore].sort((x, y) => x - y)).map((n) => <option key={n} value={n}>{testo(n)}</option>)}
      </select>
    </label>
  );

  return (
    <form onSubmit={salva} className="flex flex-col gap-4" aria-labelledby="t-regole">
      <h2 id="t-regole" className="text-[19px] font-semibold tracking-tight">Regole e orari</h2>

      <label className={`flex items-center justify-between gap-4 rounded-2xl p-4 ${i.attiva ? "bg-metallo text-su-accento" : "bg-superficie"}`}>
        <span className="flex flex-col">
          <span className="text-[16px] font-semibold">{i.attiva ? "Prenotazioni aperte" : "Prenotazioni spente"}</span>
          <span className={`text-[13px] ${i.attiva ? "text-zinc-300" : "text-testo-2"}`}>{haRisorse ? "Aperte, nella scheda compare «Prenota con 739»." : "Prima aggiungi cosa si prenota."}</span>
        </span>
        <input type="checkbox" role="switch" checked={i.attiva} disabled={!haRisorse && !i.attiva} onChange={(e) => cambia({ attiva: e.target.checked })} className="size-6 shrink-0 accent-white" />
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-[14px] font-medium">Chi conferma</legend>
        {(["manuale", "automatica"] as const).map((c) => (
          <label key={c} className={`flex items-start gap-3 rounded-xl border p-3 ${i.conferma === c ? "border-testo" : "border-linea"}`}>
            <input type="radio" name="conferma" checked={i.conferma === c} onChange={() => cambia({ conferma: c })} className="mt-1 size-4 accent-[var(--accento)]" />
            <span className="flex flex-col">
              <span className="text-[15px] font-semibold">{c === "manuale" ? "Confermo io" : "Conferma automatica"}</span>
              <span className="text-[13px] text-testo-2">{c === "manuale" ? "Ogni prenotazione arriva come richiesta: la confermi qui." : "Se l'orario è libero è confermata subito."}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-[14px] font-medium">Orari in cui si prenota</legend>
        {orariScheda ? (
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2.5 text-[15px]"><input type="radio" name="orari" checked={!propri} onChange={() => setPropri(false)} className="size-4 accent-[var(--accento)]" /> Gli orari della scheda</label>
            <label className="flex items-center gap-2.5 text-[15px]"><input type="radio" name="orari" checked={propri} onChange={() => setPropri(true)} className="size-4 accent-[var(--accento)]" /> Orari solo per le prenotazioni</label>
          </div>
        ) : <p className="text-[13px] text-testo-2">La scheda non ha gli orari della settimana: scrivili qui.</p>}
        {propri ? <OrariSettimana valore={i.orari ?? {}} onCambia={(o) => cambia({ orari: o })} /> : null}
        <p className="text-[13px] text-testo-2">I turni partono dall&apos;apertura, uno dopo l&apos;altro. Un campo con orari suoi usa quelli.</p>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        {scelta("Prenotare almeno", i.anticipo_ore, ANTICIPI, (n) => (n ? `${ore(n)} prima` : "fino all'ultimo"), "anticipo_ore")}
        {scelta("Fino a", i.giorni_avanti, AVANTI, (n) => `${n} giorni avanti`, "giorni_avanti")}
        {scelta("Annullare da 739", i.disdetta_ore, DISDETTE, (n) => (n ? `${ore(n)} prima` : "fino all'inizio"), "disdetta_ore")}
        {scelta("Per persona", i.max_attive, MASSIMI, (n) => (n === 1 ? "1 prenotazione" : `${n} prenotazioni`), "max_attive")}
      </div>

      <label className="flex flex-col gap-1.5 text-[14px] font-medium">
        Nota per chi prenota <span className="font-normal text-testo-2">Facoltativa: scarpe, prezzi, come arrivare.</span>
        <textarea value={i.nota ?? ""} onChange={(e) => cambia({ nota: e.target.value })} maxLength={300} rows={2} className={`py-3 ${CAMPO}`} />
      </label>

      {esito ? <p role={esito.ok ? "status" : "alert"} className={esito.ok ? "rounded-xl bg-superficie px-4 py-3 text-sm" : ERRORE}>{esito.testo}</p> : null}
      <PrimaryButton type="submit" disabled={invio}>{invio ? "Salvo…" : "Salva le regole"}</PrimaryButton>
    </form>
  );
}

// ——— Orari chiusi ———

function OrariChiusi({ luogo, risorse }: { luogo: string; risorse: Risorsa[] }) {
  const [lista, setLista] = useState<Blocco[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [f, setF] = useState({ risorsa: "", dal: giornoSM(0), daOra: "08:00", al: giornoSM(0), aOra: "23:00", motivo: "" });
  const [invio, setInvio] = useState(false);

  const carica = useCallback(() => leggiBlocchi(luogo).then((r) => { setLista(r.blocchi); if (r.errore) setErrore(r.errore); }), [luogo]);
  useEffect(() => {
    carica();
  }, [carica]);

  async function aggiungi(e: React.FormEvent) {
    e.preventDefault();
    setInvio(true);
    setErrore(null);
    const r = await blocca(luogo, f.risorsa || null, istanteSM(f.dal, f.daOra), istanteSM(f.al, f.aOra), f.motivo);
    setInvio(false);
    if (r.errore) setErrore(r.errore);
    else {
      setF((v) => ({ ...v, motivo: "" }));
      carica();
    }
  }

  async function togli(id: string) {
    const r = await togliBlocco(id);
    if (r.errore) setErrore(r.errore);
    else carica();
  }

  return (
    <section className="flex flex-col gap-3" aria-labelledby="t-chiusi">
      <div className="flex flex-col gap-0.5">
        <h2 id="t-chiusi" className="text-[19px] font-semibold tracking-tight">Orari chiusi</h2>
        <p className="text-[14px] text-testo-2">Ferie, manutenzione, un torneo: in quelle ore non si prenota. Le prenotazioni già fatte restano: annullale dall&apos;agenda.</p>
      </div>
      {lista?.length ? (
        <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie">
          {lista.map((b) => (
            <li key={b.id} className="flex items-center gap-3 p-4">
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[15px] font-semibold">{b.risorsa ?? "Tutto il centro"}{b.motivo ? `: ${b.motivo}` : ""}</span>
                <span className="text-[13px] text-testo-2">Da {leggiGiorno(b.dal)} <span className="font-mono">{leggiOra(b.dal)}</span> a {leggiGiorno(b.al)} <span className="font-mono">{leggiOra(b.al)}</span></span>
              </span>
              <button type="button" onClick={() => togli(b.id)} className="h-10 shrink-0 rounded-xl px-3 text-sm font-semibold text-segnale hover:bg-segnale/12">Togli</button>
            </li>
          ))}
        </ul>
      ) : null}
      <form onSubmit={aggiungi} className="flex flex-col gap-3 rounded-2xl border border-linea p-4">
        <label className="flex flex-col gap-1.5 text-[14px] font-medium">
          Cosa chiudi
          <select value={f.risorsa} onChange={(e) => setF({ ...f, risorsa: e.target.value })} className={`h-12 ${CAMPO}`}>
            <option value="">Tutto il centro</option>
            {risorse.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
          </select>
        </label>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <label className="flex flex-col gap-1.5 text-[14px] font-medium">Dal<input type="date" required value={f.dal} min={giornoSM(0)} onChange={(e) => setF({ ...f, dal: e.target.value, al: e.target.value > f.al ? e.target.value : f.al })} className={`h-12 ${CAMPO}`} /></label>
          <label className="flex flex-col gap-1.5 text-[14px] font-medium">alle<input type="time" required value={f.daOra} onChange={(e) => setF({ ...f, daOra: e.target.value })} className={`h-12 ${CAMPO} font-mono`} /></label>
          <label className="flex flex-col gap-1.5 text-[14px] font-medium">Al<input type="date" required value={f.al} min={f.dal} onChange={(e) => setF({ ...f, al: e.target.value })} className={`h-12 ${CAMPO}`} /></label>
          <label className="flex flex-col gap-1.5 text-[14px] font-medium">alle<input type="time" required value={f.aOra} onChange={(e) => setF({ ...f, aOra: e.target.value })} className={`h-12 ${CAMPO} font-mono`} /></label>
        </div>
        <label className="flex flex-col gap-1.5 text-[14px] font-medium">
          Motivo <span className="font-normal text-testo-2">Facoltativo, lo vedi solo tu.</span>
          <input value={f.motivo} onChange={(e) => setF({ ...f, motivo: e.target.value })} maxLength={100} className={`h-12 ${CAMPO}`} />
        </label>
        {errore ? <p role="alert" className={ERRORE}>{errore}</p> : null}
        <PrimaryButton type="submit" variante="secondario" disabled={invio}>{invio ? "Salvo…" : "Chiudi queste ore"}</PrimaryButton>
      </form>
    </section>
  );
}
