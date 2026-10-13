"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { Icona } from "@/components/Icona";
import { formatData, linkIndicazioni, type Castello } from "@/lib/data";
import { useSessione } from "@/modules/core/store";
import { annulla, dettaglioPartita, formaSquadre, giocatoriPartita, iscriviti, registraRisultato, ritirati } from "../api";
import { probabilitaVittoria, squadra } from "../glicko";
import type { DettaglioPartita as Dettaglio, Giocatore, Sport } from "../tipi";

const STATI: Record<string, { testo: string; classe: string }> = {
  aperta: { testo: "Iscrizioni aperte", classe: "bg-ok/15 text-ok" },
  squadre: { testo: "Squadre fatte", classe: "bg-accento-tenue text-accento" },
  giocata: { testo: "Giocata", classe: "bg-superficie-2 text-testo-2" },
  annullata: { testo: "Annullata", classe: "bg-segnale/12 text-segnale" },
};

function RigaGiocatore({ g, castelli, giocata }: { g: Giocatore; castelli: Castello[]; giocata: boolean }) {
  const c = castelli.find((x) => x.id === g.castello_id);
  const delta = giocata && g.rating_prima != null && g.rating_dopo != null ? Math.round(g.rating_dopo - g.rating_prima) : null;
  return (
    <li className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 ${g.sono_io ? "bg-accento-tenue" : "bg-superficie"}`}>
      <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: c?.colore ?? "#52525B" }} />
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{g.nome}{g.sono_io ? " (tu)" : ""}</span>
      <span className="font-mono text-xs text-testo-2">{Math.round(g.rating_dopo ?? g.rating)}</span>
      {delta != null ? <span className={`font-mono text-xs font-semibold ${delta >= 0 ? "text-ok" : "text-segnale"}`}>{delta >= 0 ? `+${delta}` : delta}</span> : null}
    </li>
  );
}

function Squadra({ nome, giocatori, castelli, giocata, punti }: { nome: string; giocatori: Giocatore[]; castelli: Castello[]; giocata: boolean; punti: number | null }) {
  const media = squadra(giocatori.map((g) => ({ rating: g.rating_prima ?? g.rating, rd: g.rd })));
  return (
    <section className="flex min-w-0 flex-col gap-2">
      <header className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold">{nome}</h3>
        <span className="font-mono text-[11px] text-testo-2">media {Math.round(media.rating)}</span>
      </header>
      {punti != null ? <p className="font-mono text-4xl font-bold leading-none tracking-tight">{punti}</p> : null}
      <ul className="flex flex-col gap-1.5">
        {giocatori.map((g, i) => <RigaGiocatore key={`${g.nome}-${i}`} g={g} castelli={castelli} giocata={giocata} />)}
      </ul>
    </section>
  );
}

export default function DettaglioPartita({ id, sport, castelli }: { id: string; sport: Sport[]; castelli: Castello[] }) {
  const stato = useSessione((s) => s.stato);
  const [p, setP] = useState<Dettaglio | null | undefined>(undefined);
  const [giocatori, setGiocatori] = useState<Giocatore[]>([]);
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);
  const [puntiA, setPuntiA] = useState("");
  const [puntiB, setPuntiB] = useState("");

  const carica = useCallback(async () => {
    const r = await dettaglioPartita(id);
    setP(r.partita);
    if (stato === "connesso") setGiocatori((await giocatoriPartita(id)).giocatori);
  }, [id, stato]);

  useEffect(() => {
    if (stato !== "caricamento") carica();
  }, [carica, stato]);

  const esegui = async (azione: () => Promise<{ errore: string | null }>) => {
    setInCorso(true);
    setErrore(null);
    const r = await azione();
    if (r.errore) setErrore(r.errore);
    await carica();
    setInCorso(false);
  };

  if (p === undefined) return <div className="h-64 animate-pulse rounded-3xl bg-superficie" aria-busy="true" />;
  if (p === null) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Partita non trovata</h1>
        <PrimaryButton href="/sport" variante="secondario">Torna alle partite</PrimaryButton>
      </div>
    );
  }

  const nomeSport = sport.find((s) => s.id === p.sport_id)?.nome ?? p.sport_id;
  const iniziata = new Date(p.inizio).getTime() <= Date.now();
  const squadraA = giocatori.filter((g) => g.squadra === "A");
  const squadraB = giocatori.filter((g) => g.squadra === "B");
  const conSquadre = (p.stato === "squadre" || p.stato === "giocata") && squadraA.length > 0;
  const probA = conSquadre ? probabilitaVittoria(squadra(squadraA.map((g) => ({ rating: g.rating_prima ?? g.rating, rd: g.rd }))), squadra(squadraB.map((g) => ({ rating: g.rating_prima ?? g.rating, rd: g.rd })))) : null;
  const pari = p.iscritti >= 2 && p.iscritti % 2 === 0;
  const s = STATI[p.stato];

  return (
    <div className="flex flex-col gap-6">
      <Link href="/sport" className="inline-flex items-center gap-1.5 text-sm font-medium text-accento"><Icona nome="freccia" size={18} /> Partite</Link>

      <section className="relative isolate flex flex-col gap-3 overflow-hidden rounded-3xl border border-linea bg-pannello p-5 text-zinc-50">
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_90%_0%,rgba(201,164,92,0.22),transparent_55%)]" />
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-ottone-300">{nomeSport}</span>
          <span className={`rounded-md px-2 py-0.5 font-mono text-[10.5px] font-semibold uppercase ${s.classe}`}>{s.testo}</span>
        </div>
        <h1 className="text-[28px] font-bold leading-[1.05] tracking-tight">{p.titolo}</h1>
        <p className="text-[15px] text-zinc-300">{formatData(p.inizio)} · {p.luogo_nome}</p>
        <div className="flex items-center gap-3">
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
            <span className="block h-full rounded-full bg-metallo" style={{ width: `${Math.min(100, (p.iscritti / p.posti) * 100)}%` }} />
          </span>
          <span className="font-mono text-sm font-semibold">{p.iscritti}/{p.posti}</span>
        </div>
        {p.organizzatore ? <p className="text-xs text-zinc-400">Organizza {p.organizzatore}</p> : null}
      </section>

      {errore ? <p role="alert" className="rounded-2xl bg-segnale/12 px-4 py-3 text-sm text-segnale">{errore}</p> : null}

      {/* Azioni */}
      <section className="flex flex-col gap-2.5">
        {stato !== "connesso" ? (
          <PrimaryButton href="/profile" pieno>Accedi con l&apos;SMR ID per partecipare</PrimaryButton>
        ) : p.stato === "aperta" && !p.sono_iscritto && !iniziata ? (
          <PrimaryButton pieno disabled={inCorso || p.iscritti >= p.posti} onClick={() => esegui(() => iscriviti(p.id))}>
            {p.iscritti >= p.posti ? "Al completo" : "Partecipa"}
          </PrimaryButton>
        ) : null}

        {p.sono_organizzatore && (p.stato === "aperta" || p.stato === "squadre") ? (
          <PrimaryButton pieno variante={p.stato === "squadre" ? "secondario" : "primario"} disabled={inCorso || !pari} onClick={() => esegui(() => formaSquadre(p.id))}>
            {p.stato === "squadre" ? "Rifai le squadre" : pari ? "Forma squadre bilanciate" : "Servono giocatori in numero pari"}
          </PrimaryButton>
        ) : null}

        {p.sono_organizzatore && p.stato === "squadre" && iniziata ? (
          <form
            className="flex flex-col gap-3 rounded-2xl border border-linea bg-superficie p-4"
            onSubmit={(e) => {
              e.preventDefault();
              esegui(() => registraRisultato(p.id, Number(puntiA), Number(puntiB)));
            }}
          >
            <h2 className="text-base font-semibold">Risultato finale</h2>
            <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
              <label className="flex flex-col gap-1.5 text-[13px] font-medium text-testo-2">Squadra A
                <input inputMode="numeric" pattern="[0-9]*" required value={puntiA} onChange={(e) => setPuntiA(e.target.value.replace(/\D/g, "").slice(0, 3))}
                  className="h-14 rounded-2xl border border-linea bg-fondo text-center font-mono text-2xl font-bold text-testo outline-none focus:border-accento" />
              </label>
              <span className="pb-4 font-mono text-xl text-testo-2">–</span>
              <label className="flex flex-col gap-1.5 text-[13px] font-medium text-testo-2">Squadra B
                <input inputMode="numeric" pattern="[0-9]*" required value={puntiB} onChange={(e) => setPuntiB(e.target.value.replace(/\D/g, "").slice(0, 3))}
                  className="h-14 rounded-2xl border border-linea bg-fondo text-center font-mono text-2xl font-bold text-testo outline-none focus:border-accento" />
              </label>
            </div>
            <PrimaryButton type="submit" pieno disabled={inCorso}>Registra e aggiorna i rating</PrimaryButton>
          </form>
        ) : null}

        {p.sono_iscritto && !p.sono_organizzatore && (p.stato === "aperta" || p.stato === "squadre") && !iniziata ? (
          <PrimaryButton pieno variante="secondario" disabled={inCorso} onClick={() => esegui(() => ritirati(p.id))}>Ritirati</PrimaryButton>
        ) : null}

        {p.lat != null && p.lng != null ? (
          <PrimaryButton href={linkIndicazioni(p.lat, p.lng)} esterno pieno variante="secondario" icona={<Icona nome="indicazioni" />}>Indicazioni per il campo</PrimaryButton>
        ) : null}
      </section>

      {/* Squadre o elenco iscritti */}
      {stato === "connesso" ? (
        conSquadre ? (
          <section className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between">
              <h2 className="text-xl font-semibold tracking-tight">Squadre</h2>
              {probA != null ? <span className="font-mono text-xs text-testo-2">Vittoria A {Math.round(probA * 100)}% · B {Math.round((1 - probA) * 100)}%</span> : null}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Squadra nome="Squadra A" giocatori={squadraA} castelli={castelli} giocata={p.stato === "giocata"} punti={p.stato === "giocata" ? p.punteggio_a : null} />
              <Squadra nome="Squadra B" giocatori={squadraB} castelli={castelli} giocata={p.stato === "giocata"} punti={p.stato === "giocata" ? p.punteggio_b : null} />
            </div>
            <p className="text-xs text-testo-2">Squadre bilanciate sulla somma dei rating Glicko-2. Chi non ha ancora giocato parte da 1500.</p>
          </section>
        ) : giocatori.length ? (
          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold tracking-tight">Iscritti</h2>
            <ul className="flex flex-col gap-1.5">
              {giocatori.map((g, i) => <RigaGiocatore key={`${g.nome}-${i}`} g={g} castelli={castelli} giocata={false} />)}
            </ul>
          </section>
        ) : null
      ) : null}

      {p.sono_organizzatore && (p.stato === "aperta" || p.stato === "squadre") && !iniziata ? (
        <PrimaryButton variante="fantasma" dimensione="sm" disabled={inCorso} onClick={() => confirm("Annullare la partita per tutti?") && esegui(() => annulla(p.id))}>
          Annulla la partita
        </PrimaryButton>
      ) : null}
    </div>
  );
}
