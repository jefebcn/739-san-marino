"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Icona } from "@/components/Icona";
import {
  FE_STATI, aggiornaScartata, data, esitoFattura, fileFattura, filePartiti, hubControlla, hubInvia, hubStato, perFe, puoVendere, ricevuteDocumento, codaDocumento,
  scaricaTesto, termineTrasmissione, type Documento, type FilePartito, type HubStato, type RicevutaHub, type VoceCoda,
} from "../api";
import { problemiFe, xmlFeRsm } from "../fe-rsm";
import { useAzienda } from "./Guscio";

const ora = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/San_Marino" });
const quando = (t: string | null | undefined) => (t ? ora.format(new Date(t)) : "");
const BOTTONE_PICCOLO = "h-9 rounded-xl bg-white/10 px-3 text-[13px] font-medium hover:bg-white/15";

/** Il pannello nero della fattura elettronica: invio diretto all'HUB-SM se l'azienda è collegata, altrimenti il file da caricare su TribWEB */
export default function PannelloFe({ doc, collegata, onCambio }: { doc: Documento; collegata: Documento | null; onCambio: () => void }) {
  const az = useAzienda();
  const vende = puoVendere(az.ruolo);
  const [hub, setHub] = useState<HubStato | null>(null);
  const [coda, setCoda] = useState<VoceCoda[]>([]);
  const [ricevute, setRicevute] = useState<RicevutaHub[]>([]);
  const [partiti, setPartiti] = useState<FilePartito[]>([]);
  const [errore, setErrore] = useState<string | null>(null);
  const [nota, setNota] = useState("");
  const [invio, setInvio] = useState(false);

  const carica = useCallback(async () => {
    const [h, c, r, p] = await Promise.all([hubStato(az.id), codaDocumento(doc.id), ricevuteDocumento(doc.id), filePartiti(doc.id)]);
    setHub(h.hub); setCoda(c); setRicevute(r); setPartiti(p);
  }, [az.id, doc.id]);
  useEffect(() => { carica(); }, [carica, doc.fe_stato, doc.fe_file]);

  const inAttesa = coda.find((c) => c.stato === "attesa");
  // Mentre c'è qualcosa in coda la pagina si aggiorna da sola ogni 20 secondi
  useEffect(() => {
    if (!inAttesa) return;
    const t = setInterval(() => { onCambio(); carica(); }, 20_000);
    return () => clearInterval(t);
  }, [inAttesa, onCambio, carica]);

  const collegato = hub?.stato === "ok";
  const termine = termineTrasmissione(doc);

  /** Prepara il nome del file (nuovo dopo uno scarto) e il testo XML */
  async function preparaFile() {
    setErrore(null);
    const f = await fileFattura(doc.id);
    if (f.errore || !f.nome) { setErrore(f.errore ?? "Non è stato possibile preparare il file."); return null; }
    const fe = perFe(doc, collegata);
    if (!fe) { setErrore("Mancano dati del documento."); return null; }
    const problemi = problemiFe(fe);
    if (problemi.length) { setErrore(problemi.join(" ")); return null; }
    return { nome: f.nome, xml: xmlFeRsm(fe, f.nome) };
  }

  async function scarica() {
    const f = await preparaFile();
    if (!f) return;
    scaricaTesto(`${f.nome}.xml`, f.xml);
    onCambio();
  }

  async function invia() {
    if (!confirm(`Mandare ${doc.td === "TD04" ? "la nota di credito" : "la fattura"} ${doc.numero}/${doc.anno} all'HUB-SM${hub?.ambiente === "test" ? " di TEST" : ""}? Dopo l'invio non si può più modificare.`)) return;
    setInvio(true);
    const f = await preparaFile();
    if (!f) { setInvio(false); return; }
    const r = await hubInvia(doc.id, f.xml);
    setInvio(false);
    if (r.errore) { setErrore(r.errore); onCambio(); return; }
    onCambio();
    carica();
  }

  async function riprendiDati() {
    const r = await aggiornaScartata(doc.id);
    if (r.errore) return setErrore(r.errore);
    onCambio();
  }

  async function controlla() {
    const r = await hubControlla(doc.id);
    if (r.errore) return setErrore(r.errore);
    carica();
  }

  async function segna(stato: string) {
    const r = await esitoFattura(doc.id, stato, stato === "scartata" ? nota : null);
    if (r.errore) return setErrore(r.errore);
    setNota("");
    onCambio();
  }

  const ultimoInvio = partiti.find((p) => p.inviato_il);
  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-[#09090B] p-5 text-white" aria-labelledby="t-fe">
      <div className="flex items-baseline justify-between gap-3">
        <h3 id="t-fe" className="text-[17px] font-semibold">Fattura elettronica</h3>
        {collegato ? <span className="text-[12px] text-zinc-400">HUB-SM{hub?.ambiente === "test" ? " di test" : ""}</span> : null}
      </div>
      <p className="text-[14px] text-zinc-300">
        {inAttesa?.azione === "invia" ? "In invio all'HUB-SM" : FE_STATI[doc.fe_stato]}
        {doc.fe_file ? <>, file <span className="font-mono">{doc.fe_file}.xml</span></> : null}
      </p>
      {doc.fe_nota ? <p className="text-[13px] leading-relaxed text-[#F28B74]">{doc.fe_nota}</p> : null}
      {ultimoInvio ? <p className="text-[13px] text-zinc-400">Mandata il {quando(ultimoInvio.inviato_il)}{ultimoInvio.hash ? <>, impronta <span className="break-all font-mono">{ultimoInvio.hash.slice(0, 16)}…</span></> : null}</p> : null}
      {termine && doc.fe_stato !== "consegnata" ? <p className="text-[13px] text-zinc-400">Da trasmettere entro il {data(termine)} circa (fine del secondo mese dopo {doc.ddt.length ? "il DDT" : "la fattura"}; se è festivo, il primo giorno lavorativo dopo).</p> : null}

      {vende && doc.fe_stato !== "consegnata" ? (
        collegato ? (
          <>
            {doc.fe_stato === "inviata" ? (
              <>
                <p className="text-[13px] leading-relaxed text-zinc-400">NeonUp chiede l&apos;esito all&apos;HUB-SM da solo ogni 30 minuti{inAttesa?.azione === "esito" ? `; prossima volta alle ${quando(inAttesa.prossimo).split(", ").pop()}` : ""}.</p>
                <button type="button" onClick={controlla} className={`${BOTTONE_PICCOLO} w-fit`}>Controlla adesso</button>
              </>
            ) : inAttesa?.azione === "invia" ? (
              <p className="text-[13px] text-zinc-400">Parte entro un minuto: la pagina si aggiorna da sola.</p>
            ) : (
              <button type="button" onClick={invia} disabled={invio} className="taglio-piccolo flex h-11 w-fit items-center gap-1.5 bg-white px-4 text-[14px] font-semibold text-[#09090B] disabled:opacity-50">
                <Icona nome="vai" size={16} /> {doc.fe_stato === "scartata" ? "Rifalla e mandala di nuovo" : "Manda all'HUB-SM"}
              </button>
            )}
            {doc.fe_stato === "scartata" ? (
              <p className="text-[13px] leading-relaxed text-zinc-400">
                Una fattura scartata si considera non emessa. Correggi il cliente o i dati dell&apos;azienda, poi <button type="button" onClick={riprendiDati} className="font-semibold text-white underline underline-offset-2">riprendi i dati corretti</button> e mandala di nuovo: parte con un nome di file nuovo.
              </p>
            ) : null}
            <button type="button" onClick={scarica} className="w-fit text-[13px] font-medium text-zinc-300 underline underline-offset-2">Scarica il file XML</button>
          </>
        ) : (
          <>
            <button type="button" onClick={scarica} className="taglio-piccolo flex h-11 w-fit items-center gap-1.5 bg-white px-4 text-[14px] font-semibold text-[#09090B]">
              <Icona nome="scarica" size={16} /> {doc.fe_stato === "scartata" ? "Prepara un file nuovo" : "Scarica il file XML"}
            </button>
            <p className="text-[13px] leading-relaxed text-zinc-400">
              Caricalo su TribWEB, «Upload File FE-RSM». Oppure <Link href={`/neonup/${az.id}/azienda#hub`} className="font-semibold text-white underline underline-offset-2">collega l&apos;azienda all&apos;HUB-SM</Link> e NeonUp la manda da solo.
            </p>
            {doc.fe_file ? (
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-2">
                  {doc.fe_stato !== "inviata" ? <button type="button" onClick={() => segna("inviata")} className={BOTTONE_PICCOLO}>L&apos;ho caricata</button> : null}
                  <button type="button" onClick={() => segna("consegnata")} className={BOTTONE_PICCOLO}>Consegnata</button>
                </div>
                <div className="flex gap-2">
                  <input value={nota} onChange={(e) => setNota(e.target.value)} maxLength={500} placeholder="Motivo dello scarto" aria-label="Motivo dello scarto" className="h-9 min-w-0 flex-1 rounded-xl bg-white/10 px-3 text-[13px] text-white placeholder:text-zinc-500" />
                  <button type="button" onClick={() => segna("scartata")} className={`${BOTTONE_PICCOLO} text-[#F28B74]`}>Scartata</button>
                </div>
              </div>
            ) : null}
          </>
        )
      ) : null}

      {ricevute.length ? (
        <div className="flex flex-col gap-1.5 border-t border-white/10 pt-3">
          <span className="text-[13px] text-zinc-400">Ricevute dell&apos;HUB-SM</span>
          {ricevute.map((r) => (
            <button key={r.id} type="button" onClick={() => scaricaTesto(r.nome.endsWith(".xml") ? r.nome : `${r.nome}.xml`, r.xml)} className="flex items-center gap-2 text-left text-[13px] hover:underline">
              <Icona nome="scarica" size={14} /> {r.tipo === "consegna" ? "Consegna" : r.tipo === "scarto" ? "Scarto" : "Ricevuta"}, {quando(r.ricevuta_il)}
            </button>
          ))}
        </div>
      ) : null}
      {errore ? <p role="alert" className="rounded-xl bg-white/10 px-3 py-2 text-[13px] text-[#F28B74]">{errore}</p> : null}
    </section>
  );
}
