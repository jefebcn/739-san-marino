"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Icona } from "@/components/Icona";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { CAMPO } from "@/modules/attivita/components/stile";
import {
  OPERAZIONI, PAGAMENTI, TIPI, TIPI_MERCE, annulla, articoli as leggiArticoli, azienda as leggiAzienda, data, depositi as leggiDepositi,
  documento as leggi, documenti as leggiDocumenti, emetti, giacenze as leggiGiacenze, magArticoli, nuovoDocumento, oggiSM,
  operazioniDocumento, puoVendere, quantita, salvaBozza, soggetti as leggiSoggetti, soldi, titoloDocumento, totaleRiga,
  type Articolo, type Azienda, type Ddt, type Deposito, type Documento as Doc, type Giacenza, type MagArticolo, type Operazione, type Riga,
  type Soggetto, type TipoDocumento, type VoceDocumento,
} from "../api";
import { Campo } from "./DatiAzienda";
import Incasso from "./Incasso";
import PannelloFe from "./PannelloFe";
import { ERRORE, useAzienda } from "./Guscio";

const RIGA_VUOTA: Riga = { descrizione: "", quantita: 1, prezzo: 0, sconto: 0, tipo_merce: null };
const aggiungiGiorni = (d: string, n: number) => { const x = new Date(`${d}T12:00:00Z`); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const nomeTm = (n: number | null | undefined) => TIPI_MERCE.find((t) => t.n === n)?.breve ?? "";

/** /neonup/[azienda]/documenti/[id]: la bozza si modifica, il documento emesso si stampa, si invia e si incassa */
export default function Documento({ id }: { id: string }) {
  const [doc, setDoc] = useState<Doc | null | undefined>(undefined);
  const [errore, setErrore] = useState<string | null>(null);
  const carica = useCallback(() => leggi(id).then((r) => { setDoc(r.documento); setErrore(r.errore); }), [id]);
  useEffect(() => { carica(); }, [carica]);

  if (doc === undefined && !errore) return <div className="h-96 animate-pulse rounded-2xl bg-superficie" />;
  if (!doc) return <p role="alert" className={ERRORE}>{errore ?? "Documento non trovato."}</p>;
  if (doc.stato === "eliminato") return <p className={ERRORE}>Questa bozza è stata tolta.</p>;
  return doc.stato === "bozza" ? <Bozza iniziale={doc} onEmesso={carica} /> : <Emesso doc={doc} onCambio={carica} />;
}

/* ———————————————————— Bozza ———————————————————— */

function Bozza({ iniziale, onEmesso }: { iniziale: Doc; onEmesso: () => void }) {
  const az = useAzienda();
  const router = useRouter();
  const [d, setD] = useState<Doc>({ ...iniziale, righe: iniziale.righe.length ? iniziale.righe : [{ ...RIGA_VUOTA }] });
  const [clienti, setClienti] = useState<Soggetto[]>([]);
  const [catalogo, setCatalogo] = useState<Articolo[]>([]);
  const [azienda, setAzienda] = useState<Azienda | null>(null);
  const [fatture, setFatture] = useState<VoceDocumento[]>([]);
  const [mag, setMag] = useState<Map<string, MagArticolo>>(new Map());
  const [depositi, setDepositi] = useState<Deposito[]>([]);
  const [giacenze, setGiacenze] = useState<Giacenza[]>([]);
  const [errore, setErrore] = useState<string | null>(null);
  const [salvato, setSalvato] = useState(true);
  const [invio, setInvio] = useState(false);
  const fiscale = TIPI[d.tipo].fiscale;
  const nota = d.tipo === "nota_credito" || d.tipo === "nota_debito";
  const modificabile = puoVendere(az.ruolo);

  useEffect(() => {
    leggiSoggetti(az.id).then((r) => setClienti(r.soggetti.filter((s) => s.attivo && s.tipo !== "fornitore")));
    leggiArticoli(az.id).then((r) => setCatalogo(r.articoli.filter((a) => a.attivo)));
    leggiAzienda(az.id).then((r) => setAzienda(r.azienda));
    leggiDocumenti(az.id).then((r) => setFatture(r.documenti.filter((x) => x.stato === "emesso" && (x.tipo === "fattura" || x.tipo === "acconto"))));
    magArticoli(az.id).then((r) => setMag(new Map(r.impostazioni.map((x) => [x.articolo_id, x]))));
    leggiDepositi(az.id).then((r) => setDepositi(r.depositi.filter((x) => x.attivo)));
    leggiGiacenze(az.id).then((r) => setGiacenze(r.giacenze));
  }, [az.id]);

  const cliente = clienti.find((c) => c.id === d.soggetto_id) ?? null;
  const elettronica = fiscale && !!azienda?.cod_oe && !!azienda.fe_dal && (d.data || oggiSM()) >= azienda.fe_dal && cliente?.nazione === "SM" && !!cliente.cod_oe;
  const totale = useMemo(() => d.righe.reduce((t, r) => t + totaleRiga(r), 0), [d.righe]);
  const tms = new Set(d.righe.map((r) => r.tipo_merce).filter(Boolean));
  const serveDdt = elettronica && [...tms].some((t) => t === 1 || t === 2 || t === 4 || t === 7);
  // Magazzino: DDT e fatture scaricano, le note di credito ricaricano le righe che rientrano
  const muove = d.tipo === "ddt" || d.tipo === "fattura" || d.tipo === "nota_credito";
  const gestito = (r: Riga) => (r.articolo_id ? mag.get(r.articolo_id) : undefined)?.gestito ? mag.get(r.articolo_id!) : undefined;
  const conMagazzino = muove && d.righe.some((r) => gestito(r));
  const deposito = d.righe.find((r) => r.deposito_id)?.deposito_id ?? depositi.find((x) => x.predefinito)?.id ?? "";
  const disponibili = (r: Riga) => giacenze
    .filter((g) => g.articolo_id === r.articolo_id && (!deposito || g.deposito_id === deposito) && (!r.variante || g.variante === r.variante) && (!r.lotto || g.lotto === r.lotto))
    .reduce((t, g) => t + g.quantita, 0);

  const cambia = (modifica: Partial<Doc>) => { setD((x) => ({ ...x, ...modifica })); setSalvato(false); };
  const cambiaRiga = (i: number, modifica: Partial<Riga>) => cambia({ righe: d.righe.map((r, j) => (j === i ? { ...r, ...modifica } : r)) });

  function scegliCliente(id: string) {
    const c = clienti.find((x) => x.id === id);
    const pag = c?.pagamento ? { modalita: c.pagamento, scadenza: c.giorni_pagamento != null ? aggiungiGiorni(d.data || oggiSM(), c.giorni_pagamento) : undefined } : d.pagamento;
    cambia({ soggetto_id: id || null, pagamento: pag });
  }

  function scegliArticolo(i: number, testo: string) {
    const a = catalogo.find((x) => `${x.codice ? `${x.codice} ` : ""}${x.descrizione}` === testo);
    if (!a) return cambiaRiga(i, { descrizione: testo, articolo_id: null, variante: null, lotto: null });
    cambiaRiga(i, { descrizione: a.descrizione, codice: a.codice, prezzo: a.prezzo, unita_misura: a.unita_misura, tipo_merce: a.tipo_merce ?? d.righe[i].tipo_merce, articolo_id: a.id, variante: null, lotto: null });
  }

  const pulito = (): Partial<Doc> => ({
    ...d,
    righe: d.righe.filter((r) => r.descrizione.trim()).map((r) => ({
      codice: r.codice?.trim() || null, descrizione: r.descrizione.trim(), quantita: Number(String(r.quantita).replace(",", ".")) || 1,
      unita_misura: r.unita_misura?.trim() || null, prezzo: Number(String(r.prezzo).replace(",", ".")) || 0, sconto: Number(String(r.sconto ?? 0).replace(",", ".")) || 0,
      tipo_merce: r.tipo_merce ? Number(r.tipo_merce) : null, nonrimb: !!r.nonrimb, articolo_id: r.articolo_id ?? null,
      variante: r.variante || null, lotto: r.lotto?.trim() || null, deposito_id: r.deposito_id || null, rientra: d.tipo === "nota_credito" ? !!r.rientra : undefined,
    })),
    ddt: d.ddt.filter((x) => x.numero.trim() || x.data),
  });

  async function salva() {
    setInvio(true);
    setErrore(null);
    const r = await salvaBozza(d.id, pulito());
    setInvio(false);
    if (r.errore) { setErrore(r.errore); return false; }
    setSalvato(true);
    return true;
  }

  async function emettiOra() {
    if (!(await salva())) return;
    if (!confirm(`Emettere ${TIPI[d.tipo].nome.toLowerCase()}? Dopo non si potrà più modificare${fiscale ? ": per correggere servirà una nota di credito" : ""}.`)) return;
    setInvio(true);
    const r = await emetti(d.id);
    setInvio(false);
    if (r.errore) return setErrore(r.errore);
    onEmesso();
  }

  async function togli() {
    if (!confirm("Togliere questa bozza?")) return;
    const r = await annulla(d.id);
    if (r.errore) return setErrore(r.errore);
    router.push(`/neonup/${az.id}/documenti`);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[22px] font-semibold tracking-tight">{titoloDocumento(d)}</h2>
        <span className="text-[13px] text-testo-2">{salvato ? "Salvata" : "Modifiche non salvate"}</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Campo etichetta="Tipo">
          <select disabled={!modificabile} value={d.tipo} onChange={(e) => cambia({ tipo: e.target.value as TipoDocumento })} className={`${CAMPO} h-12`}>
            {(Object.keys(TIPI) as TipoDocumento[]).map((t) => <option key={t} value={t}>{TIPI[t].nome}</option>)}
          </select>
        </Campo>
        <Campo etichetta="Cliente">
          <select disabled={!modificabile} value={d.soggetto_id ?? ""} onChange={(e) => scegliCliente(e.target.value)} className={`${CAMPO} h-12`}>
            <option value="">Scegli</option>
            {clienti.map((c) => <option key={c.id} value={c.id}>{c.denominazione}</option>)}
          </select>
        </Campo>
        <Campo etichetta="Data" aiuto="Vuota: la data di quando lo emetti.">
          <input type="date" disabled={!modificabile} max={oggiSM()} value={d.data ?? ""} onChange={(e) => cambia({ data: e.target.value || null })} className={`${CAMPO} h-12`} />
        </Campo>
      </div>
      {!clienti.length ? <p className="text-[14px] text-testo-2">Prima aggiungi un cliente in <Link href={`/neonup/${az.id}/clienti`} className="font-semibold text-accento">Clienti e fornitori</Link>.</p> : null}

      {fiscale && cliente ? (
        <p className={`rounded-xl px-4 py-3 text-[14px] leading-relaxed ${elettronica ? "bg-[#09090B] text-white" : "bg-superficie"}`}>
          {elettronica
            ? "Fattura elettronica: dopo l'emissione NeonUp prepara il file XML da caricare su TribWEB. Ogni riga con un importo vuole il tipo merce."
            : cliente.nazione !== "SM"
              ? "Cliente fuori San Marino: per ora NeonUp prepara solo la fattura su carta. Le regole dell'interscambio con l'Italia arriveranno in una fase successiva: chiedi al tuo commercialista."
              : !cliente.cod_oe
                ? "Cliente senza codice operatore economico: la fattura resta su carta."
                : !azienda?.fe_dal
                  ? "Fattura su carta: per farla elettronica scrivi nei dati dell'azienda la data di inizio fissata su TribWEB."
                  : "Fattura su carta: la data è precedente all'inizio della tua fatturazione elettronica."}
        </p>
      ) : null}

      <section className="flex flex-col gap-3" aria-labelledby="t-righe">
        <h3 id="t-righe" className="text-[17px] font-semibold">Righe</h3>
        <datalist id="neon-catalogo">{catalogo.map((a) => <option key={a.id} value={`${a.codice ? `${a.codice} ` : ""}${a.descrizione}`} />)}</datalist>
        <ol className="flex flex-col gap-3">
          {d.righe.map((r, i) => (
            <li key={i} className="flex flex-col gap-3 rounded-2xl bg-superficie p-4">
              <div className="flex items-start gap-2">
                <span className="mt-3 w-6 shrink-0 font-mono text-[13px] text-testo-2">{i + 1}</span>
                <input list="neon-catalogo" disabled={!modificabile} value={r.descrizione} onChange={(e) => scegliArticolo(i, e.target.value)} placeholder="Descrizione o articolo dal catalogo"
                  aria-label={`Descrizione della riga ${i + 1}`} className={`${CAMPO} h-11 min-w-0 flex-1 bg-fondo`} />
                {modificabile && d.righe.length > 1 ? (
                  <button type="button" onClick={() => cambia({ righe: d.righe.filter((_, j) => j !== i) })} aria-label={`Togli la riga ${i + 1}`} className="mt-2.5 text-testo-2"><Icona nome="chiudi" size={20} /></button>
                ) : null}
              </div>
              <div className="grid grid-cols-2 gap-2 pl-8 sm:grid-cols-[6rem_5rem_8rem_5rem_minmax(0,1fr)]">
                <label className="flex flex-col gap-1"><span className="text-[12px] text-testo-2">Quantità</span><input disabled={!modificabile} inputMode="decimal" value={String(r.quantita)} onChange={(e) => cambiaRiga(i, { quantita: e.target.value })} placeholder="Qtà" className={`${CAMPO} h-10 bg-fondo font-mono`} /></label>
                <label className="flex flex-col gap-1"><span className="text-[12px] text-testo-2">Unità</span><input disabled={!modificabile} maxLength={10} value={r.unita_misura ?? ""} onChange={(e) => cambiaRiga(i, { unita_misura: e.target.value })} placeholder="pz" className={`${CAMPO} h-10 bg-fondo`} /></label>
                <label className="flex flex-col gap-1"><span className="text-[12px] text-testo-2">Prezzo €</span><input disabled={!modificabile} inputMode="decimal" value={String(r.prezzo)} onChange={(e) => cambiaRiga(i, { prezzo: e.target.value })} placeholder="Prezzo" className={`${CAMPO} h-10 bg-fondo font-mono`} /></label>
                <label className="flex flex-col gap-1"><span className="text-[12px] text-testo-2">Sconto %</span><input disabled={!modificabile} inputMode="decimal" value={String(r.sconto ?? 0)} onChange={(e) => cambiaRiga(i, { sconto: e.target.value })} placeholder="Sc. %" className={`${CAMPO} h-10 bg-fondo font-mono`} /></label>
                <label className="col-span-2 flex flex-col gap-1 sm:col-span-1"><span className="text-[12px] text-testo-2">Tipo merce</span><select disabled={!modificabile} value={r.tipo_merce ?? ""} onChange={(e) => cambiaRiga(i, { tipo_merce: e.target.value ? Number(e.target.value) : null })}
                  className={`${CAMPO} h-10 bg-fondo ${elettronica && !r.tipo_merce && totaleRiga(r) !== 0 ? "border-segnale" : ""}`}>
                  <option value="">Da scegliere</option>
                  {TIPI_MERCE.map((t) => <option key={t.n} value={t.n}>{t.n}: {t.breve}</option>)}
                </select></label>
              </div>
              {muove && gestito(r) ? (() => {
                const cfg = gestito(r)!;
                const esce = d.tipo !== "nota_credito";
                const lotti = [...new Set(giacenze.filter((g) => g.articolo_id === r.articolo_id && g.lotto && g.quantita > 0 && (!r.variante || g.variante === r.variante)).map((g) => g.lotto))];
                const disp = disponibili(r);
                return (
                  <div className="flex flex-wrap items-end gap-2 pl-8">
                    {cfg.varianti.length ? (
                      <label className="flex flex-col gap-1"><span className="text-[12px] text-testo-2">Variante</span>
                        <select disabled={!modificabile} value={r.variante ?? ""} onChange={(e) => cambiaRiga(i, { variante: e.target.value || null })}
                          className={`${CAMPO} h-10 w-32 bg-fondo ${!r.variante ? "border-segnale" : ""}`}>
                          <option value="">Scegli</option>
                          {cfg.varianti.map((v) => <option key={v} value={v}>{v}</option>)}
                        </select></label>
                    ) : null}
                    {cfg.lotti ? (
                      <label className="flex flex-col gap-1"><span className="text-[12px] text-testo-2">Lotto</span>
                        <input list={`doc-lotti-${i}`} disabled={!modificabile} maxLength={40} value={r.lotto ?? ""} onChange={(e) => cambiaRiga(i, { lotto: e.target.value })}
                          placeholder={esce ? "Il primo a scadere" : "Facoltativo"} className={`${CAMPO} h-10 w-44 bg-fondo`} />
                        <datalist id={`doc-lotti-${i}`}>{lotti.map((l) => <option key={l} value={l} />)}</datalist></label>
                    ) : null}
                    {esce ? (
                      <span className={`pb-2.5 text-[13px] ${Number(r.quantita || 1) > disp ? "text-segnale" : "text-testo-2"}`}>A magazzino {quantita(disp, r.unita_misura)}</span>
                    ) : (
                      <label className="flex items-center gap-2 pb-2.5 text-[13px]">
                        <input type="checkbox" disabled={!modificabile} checked={!!r.rientra} onChange={(e) => cambiaRiga(i, { rientra: e.target.checked })} className="size-4 accent-[#09090B]" /> Rientra in magazzino
                      </label>
                    )}
                  </div>
                );
              })() : null}
              <div className="flex items-center justify-between gap-3 pl-8 text-[13px]">
                <label className="flex items-center gap-2 text-testo-2">
                  <input type="checkbox" disabled={!modificabile} checked={!!r.nonrimb} onChange={(e) => cambiaRiga(i, { nonrimb: e.target.checked })} className="size-4 accent-[#09090B]" /> Non rimborsabile (monofase)
                </label>
                <span className="font-mono text-[15px] font-medium text-testo">{soldi(totaleRiga(r))}</span>
              </div>
            </li>
          ))}
        </ol>
        {modificabile ? (
          <button type="button" onClick={() => cambia({ righe: [...d.righe, { ...RIGA_VUOTA, tipo_merce: d.righe.at(-1)?.tipo_merce ?? null }] })} className="flex w-fit items-center gap-1.5 text-[14px] font-semibold text-accento">
            <Icona nome="piu" size={16} /> Aggiungi una riga
          </button>
        ) : null}
        <p className="flex items-baseline justify-end gap-3 text-[15px]">Totale <b className="voce-logo text-[28px]">{soldi(totale)}</b></p>
        {conMagazzino ? (
          <div className="flex flex-col gap-2 rounded-xl bg-superficie px-4 py-3 text-[14px] leading-relaxed">
            <p>
              {d.tipo === "nota_credito" ? "All'emissione rientrano in magazzino le righe segnate." : d.tipo === "ddt" ? "All'emissione il DDT scarica il magazzino." : "All'emissione la fattura scarica il magazzino, tranne le righe di un DDT di NeonUp indicato qui sotto (le ha già scaricate il DDT)."}
            </p>
            {depositi.length > 1 ? (
              <label className="flex flex-wrap items-center gap-2">
                <span>{d.tipo === "nota_credito" ? "Rientrano in" : "Escono da"}</span>
                <select disabled={!modificabile} value={deposito} onChange={(e) => cambia({ righe: d.righe.map((r) => ({ ...r, deposito_id: e.target.value })) })} className={`${CAMPO.replace("w-full ", "")} h-10 bg-fondo`}>
                  {depositi.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
                </select>
              </label>
            ) : null}
          </div>
        ) : null}
      </section>

      {fiscale || d.tipo === "ddt" ? (
        <section className="flex flex-col gap-3" aria-labelledby="t-ddt">
          <h3 id="t-ddt" className="text-[17px] font-semibold">{d.tipo === "ddt" ? "Trasporto" : "Documenti di trasporto"}</h3>
          {d.tipo === "ddt" ? <p className="text-[14px] text-testo-2">Il numero del DDT lo dà NeonUp all&apos;emissione: poi lo indichi nella fattura.</p> : (
            <>
              <p className="text-[14px] leading-relaxed text-testo-2">{serveDdt ? "Obbligatorio con i tipi merce 1, 2, 4 e 7." : "Facoltativo per i servizi."} Con più DDT indica le righe di ciascuno.</p>
              {d.ddt.map((x, i) => (
                <div key={i} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2 sm:grid-cols-[8rem_10rem_minmax(0,1fr)_auto]">
                  <input disabled={!modificabile} maxLength={20} value={x.numero} onChange={(e) => cambia({ ddt: d.ddt.map((y, j) => (j === i ? { ...y, numero: e.target.value } : y)) })} placeholder="Numero" aria-label="Numero del DDT" className={`${CAMPO} h-10 font-mono`} />
                  <input disabled={!modificabile} type="date" value={x.data} onChange={(e) => cambia({ ddt: d.ddt.map((y, j) => (j === i ? { ...y, data: e.target.value } : y)) })} aria-label="Data del DDT" className={`${CAMPO} h-10`} />
                  {d.ddt.length > 1 ? (
                    <input disabled={!modificabile} value={(x.righe ?? []).join(", ")} placeholder="Righe, es. 1, 2"
                      onChange={(e) => cambia({ ddt: d.ddt.map((y, j) => (j === i ? { ...y, righe: e.target.value.split(/[^0-9]+/).filter(Boolean).map(Number) } : y)) })}
                      aria-label="Righe del DDT" className={`${CAMPO} col-span-2 h-10 font-mono sm:col-span-1`} />
                  ) : <span className="hidden sm:block" />}
                  {modificabile ? <button type="button" onClick={() => cambia({ ddt: d.ddt.filter((_, j) => j !== i) })} aria-label="Togli il DDT" className="text-testo-2"><Icona nome="chiudi" size={18} /></button> : null}
                </div>
              ))}
              {modificabile ? (
                <button type="button" onClick={() => cambia({ ddt: [...d.ddt, { numero: "", data: d.data || oggiSM() } as Ddt] })} className="flex w-fit items-center gap-1.5 text-[14px] font-semibold text-accento">
                  <Icona nome="piu" size={16} /> Aggiungi un DDT
                </button>
              ) : null}
            </>
          )}
        </section>
      ) : null}

      {nota ? (
        <section className="flex flex-col gap-3" aria-labelledby="t-collegata">
          <h3 id="t-collegata" className="text-[17px] font-semibold">Fattura che la nota varia</h3>
          <label className="flex items-center gap-2 text-[15px]">
            <input type="checkbox" disabled={!modificabile} checked={d.causale === "VariazioniContrattuali"} onChange={(e) => cambia({ causale: e.target.checked ? "VariazioniContrattuali" : null, collegato_id: e.target.checked ? null : d.collegato_id })} className="size-5 accent-[#09090B]" />
            Variazioni contrattuali (premi, adeguamenti: nessuna fattura precisa)
          </label>
          {d.causale !== "VariazioniContrattuali" ? (
            <select disabled={!modificabile} value={d.collegato_id ?? ""} onChange={(e) => cambia({ collegato_id: e.target.value || null })} className={`${CAMPO} h-12`}>
              <option value="">Scegli la fattura</option>
              {fatture.filter((f) => !d.soggetto_id || f.soggetto_id === d.soggetto_id).map((f) => (
                <option key={f.id} value={f.id}>{titoloDocumento(f)}, {data(f.data)}, {soldi(f.totale)}</option>
              ))}
            </select>
          ) : null}
        </section>
      ) : null}

      {fiscale ? (
        <details className="rounded-2xl bg-superficie p-4">
          <summary className="cursor-pointer text-[15px] font-semibold">Pagamento e altri dati</summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Campo etichetta="Pagamento">
              <select disabled={!modificabile} value={d.pagamento?.modalita ?? ""} onChange={(e) => cambia({ pagamento: e.target.value ? { ...d.pagamento, modalita: e.target.value } : null })} className={`${CAMPO} h-11 bg-fondo`}>
                <option value="">Non indicato</option>
                {Object.entries(PAGAMENTI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Campo>
            <Campo etichetta="Scadenza">
              <input type="date" disabled={!modificabile || !d.pagamento?.modalita} value={d.pagamento?.scadenza ?? ""} onChange={(e) => cambia({ pagamento: { ...d.pagamento, scadenza: e.target.value || undefined } })} className={`${CAMPO} h-11 bg-fondo`} />
            </Campo>
            <Campo etichetta="Tipo cessione" aiuto="Solo per i rimborsi monofase: il numero dal manuale di TribWEB.">
              <input type="number" min={1} max={99} disabled={!modificabile} value={d.tipo_cessione ?? ""} onChange={(e) => cambia({ tipo_cessione: e.target.value ? Number(e.target.value) : null })} className={`${CAMPO} h-11 bg-fondo font-mono`} />
            </Campo>
          </div>
        </details>
      ) : null}

      <Campo etichetta="Note (solo sulla stampa)">
        <textarea disabled={!modificabile} maxLength={1000} rows={2} value={d.note ?? ""} onChange={(e) => cambia({ note: e.target.value })} className={`${CAMPO} py-3`} />
      </Campo>

      {errore ? <p role="alert" className={ERRORE}>{errore}</p> : null}
      {modificabile ? (
        <div className="flex flex-wrap items-center gap-3">
          <PrimaryButton onClick={emettiOra} disabled={invio || !d.soggetto_id}>Emetti</PrimaryButton>
          <PrimaryButton variante="secondario" onClick={salva} disabled={invio || salvato}>Salva la bozza</PrimaryButton>
          <button type="button" onClick={togli} className="ml-auto text-[14px] font-semibold text-segnale">Togli la bozza</button>
        </div>
      ) : null}
    </div>
  );
}

/* ———————————————————— Emesso ———————————————————— */

function Emesso({ doc, onCambio }: { doc: Doc; onCambio: () => void }) {
  const az = useAzienda();
  const router = useRouter();
  const [collegata, setCollegata] = useState<Doc | null>(null);
  const [magazzino, setMagazzino] = useState<Operazione[]>([]);
  const [errore, setErrore] = useState<string | null>(null);
  const vende = puoVendere(az.ruolo);
  const fiscale = TIPI[doc.tipo].fiscale;
  const ced = doc.cedente!, ces = doc.cessionario!;

  useEffect(() => { if (doc.collegato_id) leggi(doc.collegato_id).then((r) => setCollegata(r.documento)); }, [doc.collegato_id]);
  useEffect(() => { operazioniDocumento(doc.id).then(setMagazzino); }, [doc.id, doc.stato]);

  const riepilogo = useMemo(() => {
    const m = new Map<number | null, number>();
    for (const r of doc.righe) m.set(r.tipo_merce ?? null, Math.round(((m.get(r.tipo_merce ?? null) ?? 0) + Number(r.totale ?? 0)) * 100) / 100);
    return [...m];
  }, [doc.righe]);

  async function copia(tipo: TipoDocumento, collega: boolean) {
    const r = await nuovoDocumento(az.id, {
      tipo, soggetto_id: doc.soggetto_id, righe: doc.righe.map((x) => ({ ...x, totale: undefined, n: undefined })),
      ddt: collega || doc.tipo !== "ddt" ? doc.ddt : [{ numero: doc.numero ?? "", data: doc.data ?? "" }],
      collegato_id: collega ? doc.id : null, pagamento: tipo === "fattura" ? doc.pagamento : null,
    });
    if (r.errore || !r.id) return setErrore(r.errore ?? "Non è stato possibile creare il documento.");
    router.push(`/neonup/${az.id}/documenti/${r.id}`);
  }

  async function annullaDoc() {
    if (!confirm(doc.tipo === "ddt" && magazzino.length ? "Annullare questo DDT? Le merci che ha scaricato tornano in magazzino." : "Annullare questo documento?")) return;
    const r = await annulla(doc.id);
    if (r.errore) return setErrore(r.errore);
    onCambio();
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      {/* Il foglio: quello che si stampa */}
      <article className="flex flex-col gap-6 rounded-2xl border border-linea bg-fondo p-5 sm:p-8 print:border-0 print:p-0">
        <header className="flex flex-col gap-4 sm:flex-row sm:justify-between">
          <div className="flex flex-col gap-0.5 text-[14px]">
            <b className="text-[17px]">{ced.denominazione}</b>
            <span>{[ced.indirizzo, ced.numero_civico].filter(Boolean).join(" ")}</span>
            <span>{[ced.cap, ced.comune].filter(Boolean).join(" ")} (RSM)</span>
            {ced.cod_oe ? <span>COE {ced.cod_oe}</span> : null}
            {ced.telefono || ced.email ? <span className="text-testo-2">{[ced.telefono, ced.email].filter(Boolean).join(", ")}</span> : null}
          </div>
          <div className="flex flex-col gap-0.5 text-[14px] sm:text-right">
            <span className="text-testo-2">{TIPI[doc.tipo].nome}{doc.elettronica ? " elettronica" : ""}</span>
            <b className="voce-logo text-[26px]">{doc.numero}/{doc.anno}</b>
            <span>del {data(doc.data)}</span>
          </div>
        </header>
        <div className="flex flex-col gap-0.5 rounded-xl bg-superficie p-4 text-[14px] print:bg-transparent print:p-0">
          <span className="text-testo-2">{doc.tipo === "preventivo" || doc.tipo === "ordine" ? "Per" : "Cliente"}</span>
          <b className="text-[16px]">{ces.denominazione}</b>
          <span>{[ces.indirizzo, ces.numero_civico].filter(Boolean).join(" ")}</span>
          <span>{[ces.cap, ces.comune, ces.provincia].filter(Boolean).join(" ")}{ces.nazione && ces.nazione !== "SM" ? `, ${ces.nazione}` : ""}</span>
          {ces.cod_oe ? <span>COE {ces.cod_oe}</span> : null}
          {ces.partita_iva ? <span>P. IVA {ces.partita_iva}</span> : null}
        </div>
        {collegata ? <p className="text-[14px]">Varia la {TIPI[collegata.tipo].nome.toLowerCase()} {collegata.numero}/{collegata.anno} del {data(collegata.data)}.</p> : null}
        {doc.causale === "VariazioniContrattuali" ? <p className="text-[14px]">Nota per variazioni contrattuali.</p> : null}
        {doc.ddt.length ? <p className="text-[14px]">DDT: {doc.ddt.map((x) => `n. ${x.numero} del ${data(x.data)}${doc.ddt.length > 1 && x.righe?.length ? ` (righe ${x.righe.join(", ")})` : ""}`).join("; ")}</p> : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-[14px]">
            <thead>
              <tr className="border-b border-linea text-left text-[12px] text-testo-2">
                <th className="py-2 pr-2 font-medium">Descrizione</th><th className="py-2 pr-2 text-right font-medium">Qtà</th>
                <th className="py-2 pr-2 text-right font-medium">Prezzo</th><th className="py-2 pr-2 text-right font-medium">Sc.</th>
                {fiscale ? <th className="py-2 pr-2 font-medium">Tipo merce</th> : null}<th className="py-2 text-right font-medium">Importo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-linea">
              {doc.righe.map((r) => (
                <tr key={r.n} className="align-top">
                  <td className="py-2 pr-2">
                    {r.codice ? <span className="mr-1.5 font-mono text-[12px] text-testo-2">{r.codice}</span> : null}{r.descrizione}
                    {r.variante || r.lotto ? <span className="block text-[12px] text-testo-2">{[r.variante, r.lotto ? `Lotto ${r.lotto}` : ""].filter(Boolean).join(", ")}</span> : null}
                  </td>
                  <td className="py-2 pr-2 text-right font-mono">{Number(r.quantita).toLocaleString("it-IT")}{r.unita_misura ? ` ${r.unita_misura}` : ""}</td>
                  <td className="py-2 pr-2 text-right font-mono">{soldi(Number(r.prezzo))}</td>
                  <td className="py-2 pr-2 text-right font-mono">{Number(r.sconto) ? `${Number(r.sconto).toLocaleString("it-IT")}%` : ""}</td>
                  {fiscale ? <td className="py-2 pr-2 text-[13px]">{r.tipo_merce ? `${r.tipo_merce} ${nomeTm(r.tipo_merce)}` : ""}</td> : null}
                  <td className="py-2 text-right font-mono">{soldi(Number(r.totale))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col items-end gap-1 text-[14px]">
          {fiscale && riepilogo.length > 1 ? riepilogo.map(([tm, imp]) => <span key={String(tm)}>{tm ? `Tipo merce ${tm}` : "Altro"}: <span className="font-mono">{soldi(imp)}</span></span>) : null}
          <span className="flex items-baseline gap-3">Totale <b className="voce-logo text-[28px]">{soldi(doc.totale)}</b></span>
        </div>
        {doc.pagamento?.modalita ? (
          <p className="text-[14px]">Pagamento: {PAGAMENTI[doc.pagamento.modalita]}{doc.pagamento.scadenza ? `, entro il ${data(doc.pagamento.scadenza)}` : ""}{doc.pagamento.modalita === "MP05" && ced.iban ? `, IBAN ${ced.iban}` : ""}</p>
        ) : null}
        {doc.note ? <p className="whitespace-pre-line text-[14px]">{doc.note}</p> : null}
        <p className="text-[12px] text-testo-2">Preparato con NeonUp di 739.</p>
      </article>

      {/* Le azioni: non si stampano */}
      <aside className="no-stampa flex flex-col gap-4">
        <PrimaryButton variante="secondario" onClick={() => window.print()} icona={<Icona nome="stampa" />}>Stampa o salva in PDF</PrimaryButton>

        {doc.elettronica ? <PannelloFe doc={doc} collegata={collegata} onCambio={onCambio} /> : null}

        {vende && (doc.tipo === "fattura" || doc.tipo === "acconto" || doc.tipo === "nota_debito") ? <Incasso doc={doc} onCambio={onCambio} /> : null}

        {magazzino.length ? (
          <section className="flex flex-col gap-2 rounded-2xl bg-superficie p-4">
            <h3 className="text-[15px] font-semibold">Magazzino</h3>
            <ul className="flex flex-col gap-1 text-[14px]">
              {magazzino.map((o) => <li key={o.id}>{OPERAZIONI[o.tipo]} del {data(o.data)}{o.stornata ? ", stornata" : ""}{o.nota ? `: ${o.nota.toLowerCase()}` : ""}</li>)}
            </ul>
            <Link href={`/neonup/${az.id}/magazzino?vista=movimenti`} className="text-[14px] font-semibold text-accento">Apri il magazzino</Link>
          </section>
        ) : null}

        {vende && doc.stato === "emesso" ? (
          <section className="flex flex-col gap-2 rounded-2xl bg-superficie p-4">
            <h3 className="text-[15px] font-semibold">Da qui</h3>
            {doc.tipo === "preventivo" || doc.tipo === "ordine" ? <button type="button" onClick={() => copia("fattura", false)} className="text-left text-[14px] font-semibold text-accento">Fanne una fattura</button> : null}
            {doc.tipo === "preventivo" ? <button type="button" onClick={() => copia("ordine", false)} className="text-left text-[14px] font-semibold text-accento">Fanne un ordine</button> : null}
            {doc.tipo === "ordine" ? <button type="button" onClick={() => copia("ddt", false)} className="text-left text-[14px] font-semibold text-accento">Fanne un DDT</button> : null}
            {doc.tipo === "ddt" ? <button type="button" onClick={() => copia("fattura", false)} className="text-left text-[14px] font-semibold text-accento">Fattura questo DDT</button> : null}
            {doc.tipo === "fattura" || doc.tipo === "acconto" ? <button type="button" onClick={() => copia("nota_credito", true)} className="text-left text-[14px] font-semibold text-accento">Fai una nota di credito</button> : null}
            <button type="button" onClick={() => copia(doc.tipo, false)} className="text-left text-[14px] font-semibold text-accento">Duplica</button>
            {!fiscale ? <button type="button" onClick={annullaDoc} className="text-left text-[14px] font-semibold text-segnale">Annulla</button> : null}
          </section>
        ) : null}
        {errore ? <p role="alert" className={ERRORE}>{errore}</p> : null}
      </aside>
    </div>
  );
}
