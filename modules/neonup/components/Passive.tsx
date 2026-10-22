"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CAMPO } from "@/modules/attivita/components/stile";
import { data, hubCercaRicevute, hubStato, passivaSegna, passiveCaricate, passive as leggi, puoVendere, scaricaTesto, soldi, type HubStato, type Passiva } from "../api";
import { ERRORE, useAzienda } from "./Guscio";

const ora = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/San_Marino" });
const STATI: Record<Passiva["stato"], string> = { nuova: "Nuova", vista: "Vista", registrata: "Registrata", rettifica: "Rettifica chiesta" };
const TD: Record<string, string> = { TD01: "Fattura", TD02: "Acconto", TD04: "Nota di credito", TD05: "Nota di debito", TD29: "Comunicazione TD29" };

/** Le fatture ricevute dai fornitori sammarinesi tramite l'HUB-SM */
export default function Passive() {
  const az = useAzienda();
  const [elenco, setElenco] = useState<Passiva[] | null>(null);
  const [hub, setHub] = useState<HubStato | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [aperta, setAperta] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [cerca, setCerca] = useState(false);
  const [caricate, setCaricate] = useState<Map<string, string>>(new Map());

  const carica = useCallback(async () => {
    const [p, h, c] = await Promise.all([leggi(az.id), hubStato(az.id), passiveCaricate(az.id)]);
    setElenco(p.passive); setHub(h.hub); setErrore(p.errore ?? h.errore); setCaricate(c);
  }, [az.id]);
  useEffect(() => { carica(); }, [carica]);
  useEffect(() => {
    if (!cerca) return;
    const t = setInterval(carica, 15_000);
    const fine = setTimeout(() => setCerca(false), 180_000);
    return () => { clearInterval(t); clearTimeout(fine); };
  }, [cerca, carica]);

  async function controllaOra() {
    const r = await hubCercaRicevute(az.id);
    if (r.errore) return setErrore(r.errore);
    setCerca(true);
  }

  async function segna(p: Passiva, stato: Passiva["stato"], nota?: string) {
    const r = await passivaSegna(p.id, stato, nota);
    if (r.errore) return setErrore(r.errore);
    setMotivo("");
    carica();
  }

  if (!elenco && !errore) return <div className="h-60 animate-pulse rounded-2xl bg-superficie" />;
  const collegato = hub?.stato === "ok";
  return (
    <div className="flex flex-col gap-4">
      {collegato ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[14px] text-testo-2">
            NeonUp le scarica da solo ogni 3 ore{hub?.ultime_ricevute_il ? `; ultima volta ${ora.format(new Date(hub.ultime_ricevute_il))}` : ""}{hub?.ambiente === "test" ? ", dall'ambiente di test" : ""}.
          </p>
          {puoVendere(az.ruolo) ? (
            <button type="button" onClick={controllaOra} disabled={cerca} className="h-10 rounded-xl bg-superficie px-4 text-[14px] font-medium hover:bg-superficie-2 disabled:opacity-50">
              {cerca ? "Sto controllando…" : "Controlla adesso"}
            </button>
          ) : null}
        </div>
      ) : (
        <p className="rounded-2xl bg-superficie px-4 py-4 text-[15px] leading-relaxed">
          Le fatture che i fornitori sammarinesi ti mandano arrivano qui quando l&apos;azienda è collegata all&apos;HUB-SM. <Link href={`/neonup/${az.id}/azienda#hub`} className="font-semibold text-accento">Collegala</Link>.
        </p>
      )}
      {errore ? <p role="alert" className={ERRORE}>{errore}</p> : null}

      {elenco?.length ? (
        <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie">
          {elenco.map((p) => (
            <li key={p.id} className="flex flex-col">
              <button type="button" onClick={() => { setAperta(aperta === p.id ? null : p.id); if (p.stato === "nuova") segna(p, "vista"); }}
                aria-expanded={aperta === p.id} className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-superficie-2">
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[15px] font-semibold">{p.cedente ?? p.nome}</span>
                  <span className="truncate text-[13px] text-testo-2">
                    {TD[p.td ?? ""] ?? "Documento"}{p.numero ? ` ${p.numero}` : ""}{p.data ? ` del ${data(p.data)}` : ""}{p.ambiente === "test" ? ", test" : ""}
                  </span>
                  <span className={`text-[13px] ${p.stato === "nuova" ? "font-medium text-testo" : "text-testo-2"}`}>{STATI[p.stato]}</span>
                </span>
                <span className="shrink-0 font-mono text-[15px] font-medium">{p.totale != null ? soldi(p.totale) : ""}</span>
              </button>
              {aperta === p.id ? (
                <div className="flex flex-col gap-3 px-4 pb-4">
                  <p className="text-[13px] text-testo-2">
                    File <span className="font-mono">{p.nome}</span>{p.cedente_cod_oe ? `, COE del fornitore ${p.cedente_cod_oe}` : ""}{p.confermata_il ? `, consegnata il ${ora.format(new Date(p.confermata_il))}` : ""}.
                  </p>
                  {p.nota ? <p className="text-[13px]">{p.nota}</p> : null}
                  <div className="flex flex-wrap gap-2">
                    {p.xml ? <button type="button" onClick={() => scaricaTesto(p.nome.endsWith(".xml") ? p.nome : `${p.nome}.xml`, p.xml!)} className="h-9 rounded-xl bg-fondo px-3 text-[13px] font-medium">Scarica il file XML</button> : <span className="text-[13px] text-testo-2">File firmato: si apre da TribWEB.</span>}
                    {caricate.has(p.id) ? <span className="flex h-9 items-center text-[13px] text-testo-2">Caricata in magazzino il {data(caricate.get(p.id))}</span>
                      : puoVendere(az.ruolo) && p.td !== "TD04" && p.td !== "TD29" ? <Link href={`/neonup/${az.id}/magazzino?carico=${p.id}`} className="flex h-9 items-center rounded-xl bg-fondo px-3 text-[13px] font-medium">Carica in magazzino</Link> : null}
                    {puoVendere(az.ruolo) && p.stato !== "registrata" ? <button type="button" onClick={() => segna(p, "registrata")} className="h-9 rounded-xl bg-fondo px-3 text-[13px] font-medium">Segna come registrata</button> : null}
                  </div>
                  {puoVendere(az.ruolo) && p.stato !== "rettifica" && p.td !== "TD29" ? (
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={500} placeholder="Cosa c'è da correggere" aria-label="Motivo della rettifica" className={`${CAMPO} h-10 bg-fondo`} />
                      <button type="button" onClick={() => segna(p, "rettifica", motivo)} disabled={motivo.trim().length < 5} className="h-10 shrink-0 rounded-xl bg-fondo px-3 text-[13px] font-medium text-segnale disabled:opacity-50">Chiedi una rettifica</button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : collegato ? (
        <p className="rounded-2xl bg-superficie px-4 py-5 text-[15px] text-testo-2">Nessuna fattura ricevuta finora.</p>
      ) : null}
      <p className="text-[13px] leading-relaxed text-testo-2">La richiesta di rettifica arriva al fornitore come email di cortesia dell&apos;HUB-SM al suo domicilio digitale.</p>
    </div>
  );
}
