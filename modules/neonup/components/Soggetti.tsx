"use client";

import { useEffect, useMemo, useState } from "react";
import { Icona } from "@/components/Icona";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { CAMPO } from "@/modules/attivita/components/stile";
import { PAGAMENTI, puoVendere, salvaSoggetto, soggetti as leggi, type Soggetto } from "../api";
import { Campo } from "./DatiAzienda";
import { ERRORE, useAzienda } from "./Guscio";

const senzaAccenti = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const NUOVO: Partial<Soggetto> = { tipo: "cliente", nazione: "SM", denominazione: "", attivo: true };

/** Clienti e fornitori: elenco con ricerca e scheda da modificare */
export default function Soggetti() {
  const az = useAzienda();
  const [elenco, setElenco] = useState<Soggetto[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [cerca, setCerca] = useState("");
  const [aperto, setAperto] = useState<Partial<Soggetto> | null>(null);
  const carica = () => leggi(az.id).then((r) => { setElenco(r.soggetti); setErrore(r.errore); });
  useEffect(() => { carica(); }, [az.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const visti = useMemo(() => {
    const q = senzaAccenti(cerca.trim());
    return (elenco ?? []).filter((s) => !q || senzaAccenti(`${s.denominazione} ${s.cod_oe ?? ""} ${s.partita_iva ?? ""} ${s.comune ?? ""}`).includes(q));
  }, [elenco, cerca]);

  if (!elenco && !errore) return <div className="h-60 animate-pulse rounded-2xl bg-superficie" />;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <input type="search" value={cerca} onChange={(e) => setCerca(e.target.value)} placeholder="Cerca per nome, COE, partita IVA" aria-label="Cerca" className={`${CAMPO} h-11 min-w-0 flex-1`} />
        {puoVendere(az.ruolo) ? (
          <button type="button" onClick={() => setAperto(NUOVO)} className="taglio-piccolo flex h-11 items-center gap-1.5 bg-metallo px-4 text-[14px] font-semibold text-su-accento">
            <Icona nome="piu" size={16} /> Nuovo
          </button>
        ) : null}
      </div>
      {errore ? <p role="alert" className={ERRORE}>{errore}</p> : null}
      {aperto ? <Scheda s={aperto} onFine={(salvato) => { setAperto(null); if (salvato) carica(); }} /> : null}
      {visti.length ? (
        <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie lg:grid lg:grid-cols-2 lg:divide-y-0 lg:gap-px lg:bg-linea">
          {visti.map((s) => (
            <li key={s.id} className="lg:bg-superficie">
              <button type="button" onClick={() => setAperto(s)} disabled={!puoVendere(az.ruolo)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-superficie-2 ${s.attivo ? "" : "opacity-50"}`}>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[15px] font-semibold">{s.denominazione}</span>
                  <span className="truncate text-[13px] text-testo-2">
                    {s.tipo === "cliente" ? "Cliente" : s.tipo === "fornitore" ? "Fornitore" : "Cliente e fornitore"}
                    {s.nazione === "SM" ? (s.cod_oe ? `, COE ${s.cod_oe}` : ", senza COE") : `, ${s.nazione}${s.partita_iva ? ` ${s.partita_iva}` : ""}`}
                    {s.comune ? `, ${s.comune}` : ""}{s.attivo ? "" : ", non attivo"}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl bg-superficie px-4 py-5 text-[15px] text-testo-2">{cerca ? "Nessuno trovato." : "Nessun cliente ancora: aggiungi il primo con «Nuovo»."}</p>
      )}
    </div>
  );
}

function Scheda({ s: iniziale, onFine }: { s: Partial<Soggetto>; onFine: (salvato: boolean) => void }) {
  const az = useAzienda();
  const [s, setS] = useState(iniziale);
  const [errore, setErrore] = useState<string | null>(null);
  const [invio, setInvio] = useState(false);
  const sm = s.nazione === "SM";
  const cambia = (k: keyof Soggetto) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setS({ ...s, [k]: e.target.value });

  async function salva(e: React.FormEvent) {
    e.preventDefault();
    setInvio(true);
    const pulito: Partial<Soggetto> = {};
    for (const [k, v] of Object.entries(s)) (pulito as Record<string, unknown>)[k] = typeof v === "string" ? v.trim() || null : v;
    pulito.nazione = (s.nazione || "SM").toUpperCase();
    pulito.provincia = s.provincia ? s.provincia.toUpperCase() : null;
    pulito.giorni_pagamento = s.giorni_pagamento ? Number(s.giorni_pagamento) : null;
    if (sm) { pulito.partita_iva = null; pulito.codice_fiscale = null; pulito.provincia = null; }
    const r = await salvaSoggetto(az.id, s.id ?? null, pulito);
    setInvio(false);
    if (r.errore) return setErrore(r.errore);
    onFine(true);
  }

  return (
    <form onSubmit={salva} className="flex flex-col gap-4 rounded-2xl border border-linea p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[17px] font-semibold">{s.id ? "Modifica" : "Nuovo cliente o fornitore"}</h2>
        <button type="button" onClick={() => onFine(false)} aria-label="Chiudi" className="text-testo-2"><Icona nome="chiudi" size={20} /></button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo etichetta="È un">
          <select value={s.tipo} onChange={cambia("tipo")} className={`${CAMPO} h-12`}>
            <option value="cliente">Cliente</option><option value="fornitore">Fornitore</option><option value="entrambi">Cliente e fornitore</option>
          </select>
        </Campo>
        <Campo etichetta="Paese" aiuto="SM per San Marino, IT per l'Italia.">
          <input required maxLength={2} value={s.nazione ?? ""} onChange={cambia("nazione")} className={`${CAMPO} h-12 font-mono uppercase`} />
        </Campo>
      </div>
      <Campo etichetta="Ragione sociale o nome"><input required maxLength={80} value={s.denominazione ?? ""} onChange={cambia("denominazione")} className={`${CAMPO} h-12`} /></Campo>
      {sm ? (
        <Campo etichetta="Codice operatore economico" aiuto="Senza COE (privati) la fattura resta su carta.">
          <input inputMode="numeric" pattern="\d{5}" maxLength={5} value={s.cod_oe ?? ""} onChange={cambia("cod_oe")} className={`${CAMPO} h-12 font-mono`} />
        </Campo>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo etichetta="Partita IVA"><input maxLength={28} value={s.partita_iva ?? ""} onChange={cambia("partita_iva")} className={`${CAMPO} h-12 font-mono`} /></Campo>
          <Campo etichetta="Codice fiscale"><input maxLength={16} value={s.codice_fiscale ?? ""} onChange={cambia("codice_fiscale")} className={`${CAMPO} h-12 font-mono uppercase`} /></Campo>
        </div>
      )}
      <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
        <Campo etichetta="Indirizzo"><input maxLength={60} value={s.indirizzo ?? ""} onChange={cambia("indirizzo")} className={`${CAMPO} h-12`} /></Campo>
        <Campo etichetta="Civico"><input maxLength={8} value={s.numero_civico ?? ""} onChange={cambia("numero_civico")} className={`${CAMPO} h-12`} /></Campo>
      </div>
      <div className={`grid gap-3 ${sm ? "grid-cols-[7rem_minmax(0,1fr)]" : "grid-cols-[7rem_minmax(0,1fr)_5rem]"}`}>
        <Campo etichetta="CAP"><input maxLength={10} value={s.cap ?? ""} onChange={cambia("cap")} className={`${CAMPO} h-12 font-mono`} /></Campo>
        <Campo etichetta={sm ? "Località" : "Comune"}><input maxLength={60} value={s.comune ?? ""} onChange={cambia("comune")} className={`${CAMPO} h-12`} /></Campo>
        {!sm ? <Campo etichetta="Prov."><input maxLength={2} value={s.provincia ?? ""} onChange={cambia("provincia")} className={`${CAMPO} h-12 font-mono uppercase`} /></Campo> : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo etichetta="Email"><input type="email" maxLength={120} value={s.email ?? ""} onChange={cambia("email")} className={`${CAMPO} h-12`} /></Campo>
        <Campo etichetta="Telefono"><input type="tel" maxLength={30} value={s.telefono ?? ""} onChange={cambia("telefono")} className={`${CAMPO} h-12`} /></Campo>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo etichetta="Pagamento di solito">
          <select value={s.pagamento ?? ""} onChange={cambia("pagamento")} className={`${CAMPO} h-12`}>
            <option value="">Nessuno</option>
            {Object.entries(PAGAMENTI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Campo>
        <Campo etichetta="Giorni per pagare"><input type="number" min={0} max={365} value={s.giorni_pagamento ?? ""} onChange={cambia("giorni_pagamento")} className={`${CAMPO} h-12 font-mono`} /></Campo>
      </div>
      <Campo etichetta="Note"><textarea maxLength={500} rows={2} value={s.note ?? ""} onChange={cambia("note")} className={`${CAMPO} py-3`} /></Campo>
      {s.id ? (
        <label className="flex items-center gap-2 text-[15px]">
          <input type="checkbox" checked={s.attivo !== false} onChange={(e) => setS({ ...s, attivo: e.target.checked })} className="size-5 accent-[#09090B]" /> Attivo (togli la spunta per nasconderlo dai nuovi documenti)
        </label>
      ) : null}
      {errore ? <p role="alert" className={ERRORE}>{errore}</p> : null}
      <PrimaryButton type="submit" disabled={invio} className="w-fit">Salva</PrimaryButton>
    </form>
  );
}
