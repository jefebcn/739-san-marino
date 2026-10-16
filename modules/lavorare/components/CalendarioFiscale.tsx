"use client";

import { useMemo, useState } from "react";
import { Icona } from "@/components/Icona";
import { CATEGORIE_FISCALI, DESTINATARI, filtra, fontiOrdinate, type Scadenza } from "@/modules/lavorare/calendario-fiscale";
import type { StatoVerifica, TipoFonte, Voce } from "@/modules/lavorare/dati/calendario-fiscale";

const giornoSett = new Intl.DateTimeFormat("it-IT", { weekday: "short", timeZone: "UTC" });
const mese = new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric", timeZone: "UTC" });
const lungo = new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const d = (s: string) => new Date(`${s}T12:00:00Z`);
const giorniA = (data: string, oggi: string) => Math.round((d(data).getTime() - d(oggi).getTime()) / 86_400_000);
const fra = (n: number) => (n === 0 ? "oggi" : n === 1 ? "domani" : `tra ${n} giorni`);

const NOMI_FONTE: Record<TipoFonte, string> = { ufficiale: "Ufficiale", studio: "Studio", stampa: "Stampa" };
const NOMI_DESTINATARI: Record<string, string> = {
  "persone fisiche": "Persone fisiche",
  "persone giuridiche": "Società",
  "autonomi e professionisti": "Autonomi e professionisti",
  "datori di lavoro": "Datori di lavoro",
};

function Badge({ children, forte = false, avviso = false }: { children: React.ReactNode; forte?: boolean; avviso?: boolean }) {
  const stile = avviso ? "bg-segnale/12 text-segnale" : forte ? "bg-accento text-su-accento" : "bg-fondo text-testo";
  return <span className={`rounded-md px-2 py-0.5 text-[12px] font-semibold ${stile}`}>{children}</span>;
}

function BadgeStato({ stato }: { stato: StatoVerifica }) {
  if (stato === "confermato") return null;
  return <Badge avviso>{stato === "dedotto" ? "Da verificare, data dedotta" : "Da verificare"}</Badge>;
}

/** Il corpo di una voce: cosa, per chi, note, riferimento normativo e le fonti (la più autorevole per prima) */
function Dettagli({ voce, nota, stato, fonti, weekend }: { voce: Voce; nota?: string | null; stato: StatoVerifica; fonti: Scadenza["fonti"]; weekend?: boolean }) {
  const [prima, ...altre] = fonti;
  return (
    <span className="flex min-w-0 flex-1 flex-col gap-1.5">
      <span className="flex flex-wrap items-center gap-1.5">
        <span className="text-[12px] font-medium text-testo-2">{voce.categoria}, {voce.per_chi.toLowerCase()}</span>
      </span>
      <span className="text-[15px] font-semibold leading-snug">{voce.titolo}</span>
      <span className="text-sm leading-relaxed">{voce.descrizione}</span>
      {nota ? <span className="text-sm text-testo-2">{nota}</span> : null}
      {voce.note ? <span className="text-sm text-testo-2">{voce.note}</span> : null}
      {weekend ? <span className="text-sm font-medium text-segnale">Cade nel weekend: verificare l&apos;eventuale slittamento.</span> : null}
      {voce.riferimento_normativo ? <span className="text-[13px] text-testo-2">Riferimento: {voce.riferimento_normativo}</span> : null}
      <span className="flex flex-wrap items-center gap-1.5 pt-1">
        {prima ? <Badge forte={prima.tipo === "ufficiale"}>{NOMI_FONTE[prima.tipo]}</Badge> : null}
        <BadgeStato stato={stato} />
        {prima ? (
          <a href={prima.url} target="_blank" rel="noopener" className="flex items-center gap-1 text-[13px] font-medium text-accento underline-offset-2 hover:underline">
            {prima.nome} <Icona nome="sito" size={12} />
          </a>
        ) : null}
      </span>
      {altre.length ? (
        <span className="text-[12px] text-testo-2">
          Anche:{" "}
          {altre.map((f, i) => (
            <span key={f.sigla}>
              {i ? ", " : ""}
              <a href={f.url} target="_blank" rel="noopener" className="underline underline-offset-2 hover:text-testo">{f.nome}</a> ({NOMI_FONTE[f.tipo].toLowerCase()})
            </span>
          ))}
        </span>
      ) : null}
    </span>
  );
}

/** Il calendario fiscale: filtri, le prossime in evidenza, l'elenco per mese, le voci senza data e il file .ics */
export default function CalendarioFiscale({ scadenze, senzaData, oggi }: { scadenze: Scadenza[]; senzaData: Voce[]; oggi: string }) {
  const [categoria, setCategoria] = useState<string | null>(null);
  const [destinatario, setDestinatario] = useState<string | null>(null);
  const lista = useMemo(() => filtra(scadenze, categoria, destinatario), [scadenze, categoria, destinatario]);
  const senza = useMemo(() => senzaData.filter((v) => (!categoria || v.categoria === categoria) && (!destinatario || v.destinatari.includes(destinatario as Voce["destinatari"][number]))), [senzaData, categoria, destinatario]);
  const categorie = CATEGORIE_FISCALI.filter((c) => scadenze.some((s) => s.voce.categoria === c) || senzaData.some((v) => v.categoria === c));
  const prossime = lista.slice(0, 3);
  const mesi = useMemo(() => {
    const out: { chiave: string; nome: string; voci: Scadenza[] }[] = [];
    for (const s of lista) {
      const k = s.data.slice(0, 7);
      const ultimo = out[out.length - 1];
      if (ultimo?.chiave === k) ultimo.voci.push(s);
      else out.push({ chiave: k, nome: mese.format(d(s.data)), voci: [s] });
    }
    return out;
  }, [lista]);
  const ics = `/lavorare/calendario-fiscale/ics${categoria || destinatario ? `?${new URLSearchParams({ ...(categoria ? { categoria } : {}), ...(destinatario ? { destinatari: destinatario } : {}) })}` : ""}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2.5">
        <div className="chips" role="group" aria-label="Filtra per categoria">
          <button type="button" className="chip" aria-pressed={!categoria} onClick={() => setCategoria(null)}>Tutte</button>
          {categorie.map((c) => (
            <button key={c} type="button" className="chip" aria-pressed={categoria === c} onClick={() => setCategoria(categoria === c ? null : c)}>{c}</button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtra per chi">
          {DESTINATARI.map((x) => (
            <button key={x} type="button" aria-pressed={destinatario === x} onClick={() => setDestinatario(destinatario === x ? null : x)} className={`rounded-lg px-2.5 py-1 text-[13px] font-medium transition-colors ${destinatario === x ? "bg-accento text-su-accento" : "bg-superficie text-testo hover:bg-superficie-2"}`}>
              {NOMI_DESTINATARI[x]}
            </button>
          ))}
        </div>
      </div>

      {prossime.length ? (
        <section className="flex flex-col gap-3" aria-labelledby="prossime-fisco">
          <h2 id="prossime-fisco" className="text-[19px] font-semibold tracking-tight">Le prossime</h2>
          <ul className="grid gap-px overflow-hidden rounded-2xl bg-white/10 lg:grid-cols-3">
            {prossime.map((s) => {
              const n = giorniA(s.data, oggi);
              return (
                <li key={s.chiave} className="flex flex-col gap-2 bg-[#09090B] p-4 text-white">
                  <span className="flex items-baseline gap-2">
                    <span className="voce-logo text-[30px] leading-none text-white">{d(s.data).getUTCDate()}</span>
                    <span className="text-[13px] text-zinc-400">{lungo.format(d(s.data))}, {fra(n)}</span>
                  </span>
                  <span className="text-[15px] font-semibold leading-snug text-white">{s.voce.titolo}</span>
                  <span className="text-[13px] text-zinc-400">{s.voce.categoria}, {s.voce.per_chi.toLowerCase()}</span>
                  {s.stato !== "confermato" ? <span className="w-fit rounded-md bg-white/10 px-2 py-0.5 text-[12px] font-semibold text-white">Da verificare</span> : null}
                  {s.weekend ? <span className="text-[12px] text-zinc-400">Cade nel weekend: verificare l&apos;eventuale slittamento.</span> : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className="flex flex-col gap-5" aria-labelledby="tutte-fisco">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="tutte-fisco" className="text-[19px] font-semibold tracking-tight">I prossimi 12 mesi</h2>
          <a href={ics} download className="flex items-center gap-1.5 text-sm font-semibold text-accento">
            <Icona nome="calendario" size={16} /> Aggiungi al tuo calendario (.ics)
          </a>
        </div>
        {mesi.length === 0 ? <p className="rounded-2xl bg-superficie p-5 text-[15px] text-testo-2">Nessuna scadenza con questi filtri.</p> : null}
        {mesi.map((m) => (
          <div key={m.chiave} className="flex flex-col gap-2">
            <h3 className="text-[15px] font-semibold first-letter:uppercase">{m.nome}</h3>
            <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie">
              {m.voci.map((s) => (
                <li key={s.chiave} className="flex gap-4 px-4 py-4">
                  <span className="flex w-11 shrink-0 flex-col items-center pt-0.5 text-center">
                    <span className="voce-logo text-[24px] leading-none">{d(s.data).getUTCDate()}</span>
                    <span className={`text-[12px] ${s.weekend ? "font-semibold text-segnale" : "text-testo-2"}`}>{giornoSett.format(d(s.data))}</span>
                  </span>
                  <Dettagli voce={s.voce} nota={s.nota} stato={s.stato} fonti={s.fonti} weekend={s.weekend} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {senza.length ? (
        <section className="flex flex-col gap-3" aria-labelledby="senza-data">
          <h2 id="senza-data" className="text-[19px] font-semibold tracking-tight">Senza una data fissa</h2>
          <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie">
            {senza.map((v) => (
              <li key={v.id} className="flex flex-col gap-1 px-4 py-4">
                <span className="text-[13px] font-medium">{v.ricorrenza?.tipo === "senza data" ? v.ricorrenza.quando : ""}</span>
                <Dettagli voce={v} stato={v.stato_verifica} fonti={fontiOrdinate(v.fonti)} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
