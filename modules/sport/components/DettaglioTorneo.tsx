"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Icona } from "@/components/Icona";
import { EmblemaCastello } from "@/components/LogoCastello";
import PrimaryButton from "@/components/ui/PrimaryButton";
import type { Castello } from "@/lib/data";
import { useSessione } from "@/modules/core/store";
import { annullaTorneo, avviaTorneo, classificaGirone, dettaglioTorneo, iscriviSquadra, lasciaSquadra, programmaIncontro, unisciti } from "../tornei-api";
import { nomeTurno, periodo, STATI_TORNEO, type Incontro, type RigaGirone, type SquadraTorneo, type Torneo } from "../tornei";
import type { Sport } from "../tipi";

const CAMPO =
  "w-full rounded-xl border border-linea bg-fondo px-3 text-[15px] text-testo outline-none transition-colors placeholder:text-testo-2/60 focus:border-accento";

const QUANDO = new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/San_Marino", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** «2026-12-05T15:00» nell'ora del telefono, per il campo data e ora */
function perCampo(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

type Aiuti = { squadra: (id: string | null) => SquadraTorneo | undefined; castello: (s?: SquadraTorneo) => Castello | undefined };

function RigaSquadra({ s, punti, vince, aiuti, vuota }: { s?: SquadraTorneo; punti: number | null; vince: boolean; aiuti: Aiuti; vuota: string }) {
  const c = aiuti.castello(s);
  return (
    <div className={`flex items-center gap-2.5 ${s && !vince && punti != null ? "text-testo-2" : ""}`}>
      {c ? <EmblemaCastello c={c} className="size-8 rounded-lg" /> : <span className="size-8 shrink-0 rounded-lg bg-fondo" />}
      <span className={`min-w-0 flex-1 truncate text-[15px] ${vince ? "font-semibold" : ""}`}>{s ? s.nome : <span className="text-testo-2">{vuota}</span>}</span>
      {punti != null ? <span className={`font-mono text-[17px] font-medium ${vince ? "text-testo" : ""}`}>{punti}</span> : null}
    </div>
  );
}

function SchedaIncontro({ i, aiuti, redazione, inCorso, ricarica }: { i: Incontro; aiuti: Aiuti; redazione: boolean; inCorso: boolean; ricarica: () => Promise<void> }) {
  const [apri, setApri] = useState(false);
  const [quando, setQuando] = useState(perCampo(i.inizio));
  const [dove, setDove] = useState(i.luogo ?? "");
  const [errore, setErrore] = useState<string | null>(null);
  const [invio, setInvio] = useState(false);
  const a = aiuti.squadra(i.squadra_a);
  const b = aiuti.squadra(i.squadra_b);
  const passa = i.giocato && i.partita_id == null && (!i.squadra_a || !i.squadra_b);
  const pronta = !!a && !!b && !i.giocato;

  if (passa) {
    const c = aiuti.castello(a);
    return (
      <article className="flex items-center gap-2.5 rounded-2xl bg-superficie px-3.5 py-2.5 text-[13px] text-testo-2">
        {c ? <EmblemaCastello c={c} className="size-6 rounded-md" /> : null}
        <span className="min-w-0 truncate"><b className="font-medium text-testo">{a?.nome}</b> passa il turno</span>
      </article>
    );
  }

  return (
    <article className="flex flex-col gap-2.5 rounded-2xl bg-superficie p-3.5">
      <RigaSquadra s={a} punti={i.giocato ? i.punti_a : null} vince={!!i.vincitrice && i.vincitrice === i.squadra_a} aiuti={aiuti} vuota="Da decidere" />
      <RigaSquadra s={b} punti={i.giocato ? i.punti_b : null} vince={!!i.vincitrice && i.vincitrice === i.squadra_b} aiuti={aiuti} vuota="Da decidere" />
      {i.giocato && !i.vincitrice ? <p className="text-[13px] text-testo-2">Pareggio.</p> : null}
      {!i.giocato && i.inizio ? <p className="text-[13px] text-testo-2">{QUANDO.format(new Date(i.inizio))}, {i.luogo}</p> : null}
      {i.partita_id ? (
        <Link href={`/sport/${i.partita_id}`} className="inline-flex w-fit items-center gap-1 text-[13px] font-medium text-accento">
          {i.giocato ? "La partita" : redazione ? "Squadre e risultato" : "La partita"} <Icona nome="avanti" size={14} />
        </Link>
      ) : null}
      {redazione && inCorso && pronta ? (
        apri ? (
          <form
            className="flex flex-col gap-2 border-t border-linea pt-3"
            onSubmit={async (e) => {
              e.preventDefault();
              setInvio(true);
              setErrore(null);
              const r = await programmaIncontro(i.id, new Date(quando).toISOString(), dove);
              setInvio(false);
              if (r.errore) return setErrore(r.errore);
              setApri(false);
              await ricarica();
            }}
          >
            <input type="datetime-local" required value={quando} onChange={(e) => setQuando(e.target.value)} className={`${CAMPO} h-11`} aria-label="Giorno e ora" />
            <input required minLength={2} maxLength={80} value={dove} onChange={(e) => setDove(e.target.value)} placeholder="Campo" className={`${CAMPO} h-11`} aria-label="Dove si gioca" />
            {errore ? <p role="alert" className="text-[13px] text-segnale">{errore}</p> : null}
            <div className="flex gap-2">
              <PrimaryButton type="submit" dimensione="sm" disabled={invio}>Salva</PrimaryButton>
              <PrimaryButton type="button" dimensione="sm" variante="interno" onClick={() => setApri(false)}>Chiudi</PrimaryButton>
            </div>
          </form>
        ) : (
          <button type="button" onClick={() => setApri(true)} className="w-fit text-[13px] font-medium text-accento">
            {i.partita_id ? "Cambia giorno e luogo" : "Metti in calendario"}
          </button>
        )
      ) : null}
    </article>
  );
}

function Girone({ righe, aiuti }: { righe: RigaGirone[]; aiuti: Aiuti }) {
  return (
    <div className="rounded-2xl border border-linea">
      <table className="w-full text-left text-sm">
        <thead className="text-[12px] text-testo-2">
          <tr className="border-b border-linea">
            <th className="py-2.5 pl-3 font-medium">Squadra</th>
            {["G", "V", "N", "P", "+/-"].map((x) => <th key={x} className="w-7 px-0.5 py-2.5 text-center font-medium">{x}</th>)}
            <th className="w-10 py-2.5 pr-3 text-right font-medium">Pt</th>
          </tr>
        </thead>
        <tbody>
          {righe.map((r, n) => {
            const s = aiuti.squadra(r.squadra_id);
            const c = aiuti.castello(s);
            return (
              <tr key={r.squadra_id} className="border-b border-linea last:border-0">
                <td className="max-w-0 py-2 pl-3">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="w-4 font-mono text-xs text-testo-2">{n + 1}</span>
                    {c ? <EmblemaCastello c={c} className="size-7 rounded-lg" /> : null}
                    <span className="min-w-0 truncate font-medium">{s?.nome}</span>
                  </span>
                </td>
                {[r.giocate, r.vinte, r.pari, r.perse, r.fatti - r.subiti].map((v, k) => (
                  <td key={k} className="px-0.5 py-2 text-center font-mono text-[13px]">{k === 4 && v > 0 ? `+${v}` : v}</td>
                ))}
                <td className="py-2 pr-3 text-right font-mono font-medium">{r.punti}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Il torneo: iscrizioni delle squadre, link per i compagni, tabellone e strumenti della redazione. */
export default function DettaglioTorneo({ id, sport, castelli }: { id: string; sport: Sport[]; castelli: Castello[] }) {
  const { stato, profilo } = useSessione();
  const [t, setT] = useState<Torneo | null | undefined>(undefined);
  const [girone, setGirone] = useState<RigaGirone[]>([]);
  const [errore, setErrore] = useState<string | null>(null);
  const [avviso, setAvviso] = useState<string | null>(null);
  const [invio, setInvio] = useState(false);
  const [nomeSquadra, setNomeSquadra] = useState("");
  const [codice, setCodice] = useState<string | null>(null);
  const [qui, setQui] = useState("");
  const [copiato, setCopiato] = useState(false);

  useEffect(() => {
    setCodice(new URLSearchParams(window.location.search).get("squadra"));
    setQui(window.location.pathname + window.location.search);
  }, []);

  const carica = useCallback(async () => {
    const r = await dettaglioTorneo(id);
    if (r.errore) setErrore(r.errore);
    setT(r.torneo);
    if (r.torneo?.formato === "girone" && r.torneo.stato !== "iscrizioni") setGirone((await classificaGirone(id)).righe);
  }, [id]);

  useEffect(() => {
    if (stato !== "caricamento") carica();
  }, [carica, stato]);

  const esegui = async (azione: () => Promise<{ errore: string | null }>, ok?: string) => {
    setInvio(true);
    setErrore(null);
    setAvviso(null);
    const r = await azione();
    if (r.errore) setErrore(r.errore);
    else if (ok) setAvviso(ok);
    await carica();
    setInvio(false);
  };

  if (t === undefined) return <div className="h-64 animate-pulse rounded-2xl bg-superficie" aria-busy="true" aria-label="Caricamento del torneo" />;
  if (t === null) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="titolo">Torneo non trovato</h1>
        <p className="text-[15px] text-testo-2">Forse è stato annullato, o il link non è giusto.</p>
        {errore ? <p className="text-[15px] text-testo-2">{errore}</p> : null}
        <PrimaryButton href="/sport/tornei" variante="secondario" className="w-fit">Tutti i tornei</PrimaryButton>
      </div>
    );
  }

  const aiuti: Aiuti = {
    squadra: (sid) => t.squadre.find((s) => s.id === sid),
    castello: (s) => (s ? castelli.find((c) => c.id === s.castello_id) : undefined),
  };
  const nomeSport = sport.find((s) => s.id === t.sport_id)?.nome ?? t.sport_id;
  const minimo = sport.find((s) => s.id === t.sport_id)?.giocatori_per_squadra ?? 1;
  const mia = aiuti.squadra(t.mia_squadra);
  const capitano = t.squadre.find((s) => s.sono_capitano);
  const iscrizioni = t.stato === "iscrizioni";
  const mioCastello = castelli.find((c) => c.id === profilo?.castello_id);
  const squadraMioCastello = t.squadre.find((s) => s.castello_id === profilo?.castello_id);
  const vincitrice = aiuti.squadra(t.vincitrice);
  const castelloVincitore = aiuti.castello(vincitrice);
  const turni = [...new Set(t.incontri.map((i) => i.turno))].sort((a, b) => a - b);
  const ultimo = turni[turni.length - 1] ?? 1;
  const link = capitano?.codice && typeof window !== "undefined" ? `${window.location.origin}/sport/tornei/${t.id}?squadra=${capitano.codice}` : null;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/sport/tornei" className="indietro scuro w-fit"><Icona nome="freccia" size={18} /> Tornei</Link>

      <section className="pannello topo flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-ottone-300">{nomeSport}</span>
          <span className="rounded-md bg-white/10 px-2 py-0.5 text-xs font-medium text-white">{STATI_TORNEO[t.stato]}</span>
        </div>
        <h1 className="text-[26px] font-semibold leading-[1.1] tracking-tight text-white">{t.titolo}</h1>
        <p className="text-[15px]" style={{ color: "var(--pannello-testo)" }}>
          {periodo(t.dal, t.al).replace(/^./, (x) => x.toUpperCase())}{t.luogo_nome ? <>, {t.luogo_nome}</> : null}
          <br />
          {t.formato === "eliminazione" ? "Eliminazione diretta" : "Girone all'italiana"}, una squadra per castello
        </p>
        {t.metri > 0 ? (
          <p className="text-[15px] text-white">
            <b className="font-mono font-medium">+{t.metri} m</b> <span style={{ color: "var(--pannello-testo)" }}>a ogni giocatore della squadra che vince</span>
          </p>
        ) : null}
      </section>

      {t.stato === "concluso" && vincitrice ? (
        <section className="flex items-center gap-4 rounded-2xl bg-superficie p-4">
          {castelloVincitore ? <EmblemaCastello c={castelloVincitore} className="size-20" /> : null}
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[13px] text-testo-2">Ha vinto</span>
            <span className="text-[22px] font-semibold leading-tight">{vincitrice.nome}</span>
            <span className="text-[15px] text-testo-2">per {castelloVincitore?.nome}{t.metri > 0 ? `, +${t.metri} m a testa` : ""}</span>
          </div>
        </section>
      ) : null}

      {t.descrizione ? <p className="whitespace-pre-line text-[15px] leading-relaxed text-testo-2">{t.descrizione}</p> : null}

      {errore ? <p role="alert" className="rounded-2xl bg-segnale/12 px-4 py-3 text-sm text-segnale">{errore}</p> : null}
      {avviso ? <p role="status" className="rounded-2xl bg-accento-tenue px-4 py-3 text-sm text-accento">{avviso}</p> : null}

      {/* Iscrizioni: link di un capitano, nuova squadra, la mia squadra */}
      {iscrizioni ? (
        <section className="flex flex-col gap-3">
          {codice && !mia ? (
            (() => {
              const invito = t.squadre.find((s) => s.codice === codice) ?? null;
              return stato !== "connesso" ? (
                <div className="flex flex-col gap-3 rounded-2xl bg-superficie p-4">
                  <h2 className="text-[17px] font-semibold">Ti hanno invitato in squadra</h2>
                  <p className="text-[15px] text-testo-2">Per giocare entra con il tuo SMR ID: dopo l&apos;accesso torni qui e ti unisci con un tocco.</p>
                  <PrimaryButton href={`/profile?torna=${encodeURIComponent(qui)}`} className="w-fit">Entra con SMR ID</PrimaryButton>
                </div>
              ) : (
                <div className="flex flex-col gap-3 rounded-2xl bg-superficie p-4">
                  <h2 className="text-[17px] font-semibold">{invito ? `Entra in «${invito.nome}»` : "Entra nella squadra del tuo castello"}</h2>
                  <p className="text-[15px] text-testo-2">Puoi giocare solo per il castello che hai scelto nel tuo SMR ID{mioCastello ? <>: {mioCastello.nome}</> : null}.</p>
                  <PrimaryButton className="w-fit" disabled={invio} onClick={() => esegui(() => unisciti(codice), "Sei in squadra. Il calendario delle partite arriva quando parte il torneo.")}>Unisciti alla squadra</PrimaryButton>
                </div>
              );
            })()
          ) : null}

          {mia ? (
            <div className="flex flex-col gap-3 rounded-2xl bg-superficie p-4">
              <div className="flex items-center gap-3">
                {aiuti.castello(mia) ? <EmblemaCastello c={aiuti.castello(mia)!} className="size-12" /> : null}
                <div className="flex min-w-0 flex-col">
                  <span className="text-[13px] text-testo-2">{mia.sono_capitano ? "Sei il capitano di" : "Giochi in"}</span>
                  <span className="text-[17px] font-semibold">{mia.nome}</span>
                </div>
              </div>
              {mia.sono_capitano && link ? (
                <>
                  <p className="text-[15px] text-testo-2">
                    Manda questo link ai compagni del tuo castello: con il loro SMR ID entrano in squadra. Servono almeno {minimo} {minimo === 1 ? "giocatore" : "giocatori"}, ora siete {mia.giocatori}.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {typeof navigator !== "undefined" && "share" in navigator ? (
                      <PrimaryButton dimensione="sm" onClick={() => navigator.share({ title: t.titolo, text: `Gioca con noi per ${aiuti.castello(mia)?.nome} a «${t.titolo}»`, url: link }).catch(() => {})}>Condividi il link</PrimaryButton>
                    ) : null}
                    <PrimaryButton dimensione="sm" variante="interno" onClick={() => navigator.clipboard?.writeText(link).then(() => setCopiato(true))}>{copiato ? "Copiato" : "Copia il link"}</PrimaryButton>
                  </div>
                </>
              ) : null}
              <button
                type="button"
                disabled={invio}
                onClick={() => confirm(mia.sono_capitano ? "Ritirare la squadra dal torneo? Escono anche i compagni." : "Uscire dalla squadra?") && esegui(() => lasciaSquadra(t.id))}
                className="w-fit text-[13px] font-medium text-testo-2 underline underline-offset-4"
              >
                {mia.sono_capitano ? "Ritira la squadra" : "Esci dalla squadra"}
              </button>
            </div>
          ) : !codice ? (
            stato !== "connesso" ? (
              <div className="flex flex-col gap-3 rounded-2xl bg-superficie p-4">
                <h2 className="text-[17px] font-semibold">Gioca per il tuo castello</h2>
                <p className="text-[15px] text-testo-2">Il capitano iscrive la squadra con il suo SMR ID e manda il link ai compagni.</p>
                <PrimaryButton href={`/profile?torna=${encodeURIComponent(qui)}`} className="w-fit">Entra con SMR ID</PrimaryButton>
              </div>
            ) : !mioCastello ? (
              <div className="flex flex-col gap-3 rounded-2xl bg-superficie p-4">
                <h2 className="text-[17px] font-semibold">Scegli il tuo castello</h2>
                <p className="text-[15px] text-testo-2">La squadra rappresenta il castello del tuo SMR ID: sceglilo nel profilo, poi torna qui.</p>
                <PrimaryButton href="/profile" className="w-fit">Vai al profilo</PrimaryButton>
              </div>
            ) : squadraMioCastello ? (
              <div className="flex flex-col gap-1 rounded-2xl bg-superficie p-4">
                <h2 className="text-[17px] font-semibold">{mioCastello.nome} ha già una squadra</h2>
                <p className="text-[15px] text-testo-2">«{squadraMioCastello.nome}», capitano {squadraMioCastello.capitano ?? "del castello"}: chiedigli il link per entrare.</p>
              </div>
            ) : (
              <form
                className="flex flex-col gap-3 rounded-2xl bg-superficie p-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  esegui(async () => {
                    const r = await iscriviSquadra(t.id, nomeSquadra);
                    return { errore: r.errore };
                  }, "Squadra iscritta. Ora manda il link ai compagni.");
                }}
              >
                <div className="flex items-center gap-3">
                  <EmblemaCastello c={mioCastello} className="size-12" />
                  <div className="flex flex-col">
                    <h2 className="text-[17px] font-semibold">Iscrivi la squadra di {mioCastello.nome}</h2>
                    <p className="text-[13px] text-testo-2">Sarai il capitano.</p>
                  </div>
                </div>
                <input required minLength={2} maxLength={40} value={nomeSquadra} onChange={(e) => setNomeSquadra(e.target.value)} placeholder={`Nome della squadra, per esempio ${mioCastello.nome} United`} className={`${CAMPO} h-12`} aria-label="Nome della squadra" />
                <PrimaryButton type="submit" className="w-fit" disabled={invio}>Iscrivi la squadra</PrimaryButton>
              </form>
            )
          ) : null}
        </section>
      ) : null}

      {/* Squadre */}
      <section className="flex flex-col gap-3">
        <h2 className="text-[19px] font-semibold tracking-tight">Squadre <span className="font-mono text-[15px] font-medium text-testo-2">{t.squadre.length}</span></h2>
        {t.squadre.length === 0 ? (
          <p className="text-[15px] text-testo-2">Ancora nessuna squadra iscritta.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {t.squadre.map((s) => {
              const c = aiuti.castello(s);
              return (
                <li key={s.id} className="flex items-center gap-3 rounded-2xl bg-superficie p-3">
                  {c ? <EmblemaCastello c={c} className="size-12" /> : null}
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[15px] font-semibold">{s.nome}</span>
                    <span className="text-[13px] text-testo-2">{c?.nome}, {s.giocatori} {s.giocatori === 1 ? "giocatore" : "giocatori"}{iscrizioni && s.giocatori < minimo ? `, ne servono ${minimo}` : ""}</span>
                    {s.nomi?.length ? <span className="truncate text-[13px] text-testo-2">{s.nomi.join(", ")}</span> : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Tabellone */}
      {t.incontri.length ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-[19px] font-semibold tracking-tight">{t.formato === "eliminazione" ? "Tabellone" : "Classifica"}</h2>
          {t.formato === "girone" && girone.length ? <Girone righe={girone} aiuti={aiuti} /> : null}
          {turni.map((n) => (
            <div key={n} className="flex flex-col gap-2">
              <h3 className="text-[15px] font-semibold text-testo-2">{t.formato === "eliminazione" ? nomeTurno(n, ultimo) : `Giornata ${n}`}</h3>
              <div className="grid gap-2 lg:grid-cols-2">
                {t.incontri.filter((i) => i.turno === n).map((i) => (
                  <SchedaIncontro key={i.id} i={i} aiuti={aiuti} redazione={t.redazione} inCorso={t.stato === "in_corso"} ricarica={carica} />
                ))}
              </div>
            </div>
          ))}
          <p className="text-xs text-testo-2">
            I risultati si registrano nella pagina di ogni partita e aggiornano anche il rating dei giocatori.
            {t.formato === "girone" ? " G giocate, V vinte, N pari, P perse, +/- differenza. A parità di punti conta la differenza, poi i punti fatti." : ""}
          </p>
        </section>
      ) : null}

      {/* Redazione */}
      {t.redazione && (iscrizioni || t.stato === "in_corso") ? (
        <section className="flex flex-col gap-3 rounded-2xl border border-linea p-4">
          <h2 className="text-[17px] font-semibold">Per la redazione</h2>
          {iscrizioni ? (
            <>
              <p className="text-[15px] text-testo-2">Quando le squadre sono pronte, fai partire il torneo: le iscrizioni si chiudono e si sorteggia il tabellone. Poi metti in calendario ogni incontro.</p>
              <PrimaryButton className="w-fit" disabled={invio || t.squadre.length < 2} onClick={() => confirm("Chiudere le iscrizioni e sorteggiare il tabellone?") && esegui(() => avviaTorneo(t.id), "Torneo partito: il tabellone è pronto.")}>
                {t.squadre.length < 2 ? "Servono almeno 2 squadre" : "Fai partire il torneo"}
              </PrimaryButton>
            </>
          ) : (
            <p className="text-[15px] text-testo-2">Metti in calendario gli incontri dal tabellone; il risultato lo registra dalla pagina della partita chi l&apos;ha messa in calendario.</p>
          )}
          <button type="button" disabled={invio} onClick={() => confirm("Annullare il torneo per tutti?") && esegui(() => annullaTorneo(t.id))} className="w-fit text-[13px] font-medium text-segnale">
            Annulla il torneo
          </button>
        </section>
      ) : null}
    </div>
  );
}
