"use client";

import { useEffect, useMemo, useState } from "react";
import { Icona } from "@/components/Icona";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { CAMPO } from "@/modules/attivita/components/stile";
import { TIPI_MERCE, articoli as leggi, puoVendere, salvaArticolo, soldi, type Articolo } from "../api";
import { Campo } from "./DatiAzienda";
import { ERRORE, useAzienda } from "./Guscio";

const senzaAccenti = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const nomeTm = (n: number | null) => TIPI_MERCE.find((t) => t.n === n)?.breve;

/** Articoli e servizi: codice, descrizione, prezzo e tipo merce, per riempire le righe dei documenti */
export default function Articoli() {
  const az = useAzienda();
  const [elenco, setElenco] = useState<Articolo[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [cerca, setCerca] = useState("");
  const [aperto, setAperto] = useState<Partial<Articolo> | null>(null);
  const carica = () => leggi(az.id).then((r) => { setElenco(r.articoli); setErrore(r.errore); });
  useEffect(() => { carica(); }, [az.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const visti = useMemo(() => {
    const q = senzaAccenti(cerca.trim());
    return (elenco ?? []).filter((a) => !q || senzaAccenti(`${a.codice ?? ""} ${a.descrizione}`).includes(q));
  }, [elenco, cerca]);

  if (!elenco && !errore) return <div className="h-60 animate-pulse rounded-2xl bg-superficie" />;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <input type="search" value={cerca} onChange={(e) => setCerca(e.target.value)} placeholder="Cerca per codice o descrizione" aria-label="Cerca" className={`${CAMPO} h-11 min-w-0 flex-1`} />
        {puoVendere(az.ruolo) ? (
          <button type="button" onClick={() => setAperto({ descrizione: "", prezzo: 0, attivo: true })} className="taglio-piccolo flex h-11 items-center gap-1.5 bg-metallo px-4 text-[14px] font-semibold text-su-accento">
            <Icona nome="piu" size={16} /> Nuovo
          </button>
        ) : null}
      </div>
      {errore ? <p role="alert" className={ERRORE}>{errore}</p> : null}
      {aperto ? <Scheda a={aperto} onFine={(ok) => { setAperto(null); if (ok) carica(); }} /> : null}
      {visti.length ? (
        <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie">
          {visti.map((a) => (
            <li key={a.id}>
              <button type="button" onClick={() => setAperto(a)} disabled={!puoVendere(az.ruolo)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-superficie-2 ${a.attivo ? "" : "opacity-50"}`}>
                {a.codice ? <span className="w-20 shrink-0 truncate font-mono text-[13px] text-testo-2">{a.codice}</span> : null}
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[15px] font-medium">{a.descrizione}</span>
                  <span className="text-[13px] text-testo-2">{nomeTm(a.tipo_merce) ?? "Tipo merce da scegliere"}{a.attivo ? "" : ", non attivo"}</span>
                </span>
                <span className="shrink-0 font-mono text-[14px] font-medium">{soldi(a.prezzo)}{a.unita_misura ? <span className="text-testo-2">/{a.unita_misura}</span> : null}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl bg-superficie px-4 py-5 text-[15px] text-testo-2">{cerca ? "Nessun articolo trovato." : "Nessun articolo ancora. Non sono obbligatori: nelle righe puoi scrivere anche a mano."}</p>
      )}
    </div>
  );
}

function Scheda({ a: iniziale, onFine }: { a: Partial<Articolo>; onFine: (ok: boolean) => void }) {
  const az = useAzienda();
  const [a, setA] = useState(iniziale);
  const [errore, setErrore] = useState<string | null>(null);
  const [invio, setInvio] = useState(false);
  const cambia = (k: keyof Articolo) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setA({ ...a, [k]: e.target.value });

  async function salva(e: React.FormEvent) {
    e.preventDefault();
    setInvio(true);
    const r = await salvaArticolo(az.id, a.id ?? null, {
      codice: a.codice?.trim() || null, descrizione: (a.descrizione ?? "").trim(), unita_misura: a.unita_misura?.trim() || null,
      prezzo: Number(String(a.prezzo ?? 0).replace(",", ".")) || 0, tipo_merce: a.tipo_merce ? Number(a.tipo_merce) : null,
      nomenclatura: a.nomenclatura?.trim() || null, attivo: a.attivo !== false,
    });
    setInvio(false);
    if (r.errore) return setErrore(r.errore);
    onFine(true);
  }

  return (
    <form onSubmit={salva} className="flex flex-col gap-4 rounded-2xl border border-linea p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[17px] font-semibold">{a.id ? "Modifica articolo" : "Nuovo articolo o servizio"}</h2>
        <button type="button" onClick={() => onFine(false)} aria-label="Chiudi" className="text-testo-2"><Icona nome="chiudi" size={20} /></button>
      </div>
      <div className="grid grid-cols-[9rem_minmax(0,1fr)] gap-3">
        <Campo etichetta="Codice"><input maxLength={35} value={a.codice ?? ""} onChange={cambia("codice")} className={`${CAMPO} h-12 font-mono`} /></Campo>
        <Campo etichetta="Descrizione"><input required maxLength={1000} value={a.descrizione ?? ""} onChange={cambia("descrizione")} className={`${CAMPO} h-12`} /></Campo>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Campo etichetta="Prezzo (€)"><input required inputMode="decimal" value={String(a.prezzo ?? "")} onChange={cambia("prezzo")} className={`${CAMPO} h-12 font-mono`} /></Campo>
        <Campo etichetta="Unità di misura"><input maxLength={10} value={a.unita_misura ?? ""} onChange={cambia("unita_misura")} placeholder="pz, kg, h" className={`${CAMPO} h-12`} /></Campo>
      </div>
      <Campo etichetta="Tipo merce" aiuto="Serve per la fattura elettronica e il monofase. In una fattura vanno solo beni (materie prime, beni di consumo, strumentali), oppure solo conto lavoro con materie prime, oppure solo servizi.">
        <select value={a.tipo_merce ?? ""} onChange={cambia("tipo_merce")} className={`${CAMPO} h-12`}>
          <option value="">Da scegliere nel documento</option>
          {TIPI_MERCE.map((t) => <option key={t.n} value={t.n}>{t.n}: {t.nome}</option>)}
        </select>
      </Campo>
      {a.id ? (
        <label className="flex items-center gap-2 text-[15px]">
          <input type="checkbox" checked={a.attivo !== false} onChange={(e) => setA({ ...a, attivo: e.target.checked })} className="size-5 accent-[#09090B]" /> Attivo
        </label>
      ) : null}
      {errore ? <p role="alert" className={ERRORE}>{errore}</p> : null}
      <PrimaryButton type="submit" disabled={invio} className="w-fit">Salva</PrimaryButton>
    </form>
  );
}
