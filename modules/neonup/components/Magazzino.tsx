"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Cella, Cruscotto } from "@/components/Cruscotto";
import { Icona } from "@/components/Icona";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { CAMPO } from "@/modules/attivita/components/stile";
import {
  OPERAZIONI, articoli as leggiArticoli, costi as leggiCosti, data, depositi as leggiDepositi, giacenze as leggiGiacenze, inventario,
  magArticoli, magAvvia, movimenti as leggiMovimenti, oggiSM, operazioni as leggiOperazioni, passive as leggiPassive, puoGestire, puoVendere,
  quantita, registraMagazzino, righeFattura, salvaDeposito, soggetti as leggiSoggetti, soldi, storna,
  type Articolo, type CostoArticolo, type Deposito, type Giacenza, type MagArticolo, type Movimento, type Operazione, type Soggetto,
} from "../api";
import { Campo } from "./DatiAzienda";
import { ERRORE, useAzienda } from "./Guscio";

type Dati = {
  articoli: Articolo[]; impostazioni: Map<string, MagArticolo>; giacenze: Giacenza[]; costi: Map<string, CostoArticolo>;
  depositi: Deposito[]; soggetti: Soggetto[]; operazioni: Operazione[];
};
type Vista = "giacenze" | "movimenti" | "inventario" | "depositi";
type TipoManuale = "carico" | "scarico" | "rettifica" | "trasferimento";

const senzaAccenti = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const etichetta = (a: Pick<Articolo, "codice" | "descrizione">) => `${a.codice ? `${a.codice} ` : ""}${a.descrizione}`;
const fraGiorni = (n: number) => { const x = new Date(`${oggiSM()}T12:00:00Z`); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const intero = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 0 });
const STRETTO = CAMPO.replace("w-full ", "");
/** «3 righe» (una riga dell'operazione può muovere più lotti o due depositi) */
const contaRighe = (o: Operazione, m: Movimento[]) => {
  const n = new Set(m.map((x) => x.riga)).size;
  return n ? `${n} ${n === 1 ? "riga" : "righe"}` : o.tipo === "inventario" ? "Nessuna differenza" : "";
};
const numero = (s: string | number | null | undefined) => Number(String(s ?? "").replace(",", "."));

/** /neonup/[azienda]/magazzino: giacenze, movimenti, inventario e depositi */
export default function Magazzino() {
  const az = useAzienda();
  const router = useRouter();
  const cerca = useSearchParams();
  const vende = puoVendere(az.ruolo);
  const gestisce = puoGestire(az.ruolo);
  const [dati, setDati] = useState<Dati | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [vista, setVista] = useState<Vista>((cerca.get("vista") as Vista) || "giacenze");
  const [modulo, setModulo] = useState<{ tipo: TipoManuale; passiva?: string } | null>(cerca.get("carico") ? { tipo: "carico", passiva: cerca.get("carico")! } : null);

  const carica = useCallback(async () => {
    let dep = await leggiDepositi(az.id);
    if (!dep.errore && !dep.depositi.length && vende) { await magAvvia(az.id); dep = await leggiDepositi(az.id); }
    const [ar, im, gi, co, so, op] = await Promise.all([
      leggiArticoli(az.id), magArticoli(az.id), leggiGiacenze(az.id), leggiCosti(az.id), leggiSoggetti(az.id), leggiOperazioni(az.id),
    ]);
    setErrore(dep.errore ?? ar.errore ?? im.errore ?? gi.errore ?? op.errore);
    setDati({
      articoli: ar.articoli, impostazioni: new Map(im.impostazioni.map((x) => [x.articolo_id, x])), giacenze: gi.giacenze,
      costi: new Map(co.map((x) => [x.articolo_id, x])), depositi: dep.depositi, soggetti: so.soggetti, operazioni: op.operazioni,
    });
  }, [az.id, vende]);
  useEffect(() => { carica(); }, [carica]);

  const fine = (ok: boolean) => {
    setModulo(null);
    if (cerca.get("carico")) router.replace(`/neonup/${az.id}/magazzino`);
    if (ok) { setVista("movimenti"); carica(); }
  };

  if (!dati && !errore) return <div className="h-72 animate-pulse rounded-2xl bg-[#09090B]" />;
  if (!dati) return <p role="alert" className={ERRORE}>{errore}</p>;

  const gestiti = dati.articoli.filter((a) => dati.impostazioni.get(a.id)?.gestito);
  const totale = new Map<string, number>();
  for (const g of dati.giacenze) totale.set(g.articolo_id, (totale.get(g.articolo_id) ?? 0) + g.quantita);
  const sotto = gestiti.filter((a) => { const s = dati.impostazioni.get(a.id)?.scorta_minima; return s != null && (totale.get(a.id) ?? 0) < Number(s); });
  const valore = gestiti.reduce((t, a) => t + Math.max(0, totale.get(a.id) ?? 0) * Number(dati.costi.get(a.id)?.costo_medio ?? 0), 0);
  const scadono = dati.giacenze.filter((g) => g.lotto && g.scadenza && g.quantita > 0 && g.scadenza <= fraGiorni(30));
  const attivi = dati.depositi.filter((d) => d.attivo);
  const VISTE: { v: Vista; nome: string }[] = [
    { v: "giacenze", nome: "Giacenze" }, { v: "movimenti", nome: "Movimenti" },
    ...(gestisce ? [{ v: "inventario" as Vista, nome: "Inventario" }] : []), { v: "depositi", nome: "Depositi" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Cruscotto etichetta="Il magazzino">
        <Cella titolo="Articoli a magazzino" valore={gestiti.length} nota={`${attivi.length} ${attivi.length === 1 ? "deposito" : "depositi"}`} />
        <Cella titolo="Valore" valore={intero.format(valore)} unita="€" nota="Giacenze al costo medio dei carichi" />
        <Cella titolo="Sotto la scorta minima" valore={sotto.length} nota={sotto[0] ? sotto.slice(0, 2).map((a) => a.descrizione).join(", ") : "Nessuno"} avviso={sotto.length > 0} />
        <Cella titolo="Lotti in scadenza" valore={scadono.length} nota={scadono.length ? "Entro 30 giorni o già scaduti" : "Nessuno nei prossimi 30 giorni"} avviso={scadono.length > 0} />
      </Cruscotto>

      {vende && !modulo ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setModulo({ tipo: "carico" })} className="taglio-piccolo flex h-11 items-center gap-1.5 bg-metallo px-4 text-[14px] font-semibold text-su-accento">
            <Icona nome="piu" size={16} /> Carico
          </button>
          <button type="button" onClick={() => setModulo({ tipo: "scarico" })} className="h-11 rounded-xl bg-superficie px-4 text-[14px] font-medium hover:bg-superficie-2">Scarico</button>
          <button type="button" onClick={() => setModulo({ tipo: "rettifica" })} className="h-11 rounded-xl bg-superficie px-4 text-[14px] font-medium hover:bg-superficie-2">Rettifica</button>
          {attivi.length > 1 ? <button type="button" onClick={() => setModulo({ tipo: "trasferimento" })} className="h-11 rounded-xl bg-superficie px-4 text-[14px] font-medium hover:bg-superficie-2">Trasferimento</button> : null}
        </div>
      ) : null}
      {modulo ? <ModuloOperazione tipo={modulo.tipo} passiva={modulo.passiva} dati={dati} onFine={fine} /> : null}
      {errore ? <p role="alert" className={ERRORE}>{errore}</p> : null}

      <div className="-mx-1 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Viste del magazzino">
        {VISTE.map((x) => (
          <button key={x.v} type="button" role="tab" aria-selected={vista === x.v} onClick={() => setVista(x.v)}
            className={`h-9 shrink-0 rounded-xl px-3.5 text-[14px] font-medium ${vista === x.v ? "bg-[#09090B] text-white" : "bg-superficie hover:bg-superficie-2"}`}>{x.nome}</button>
        ))}
      </div>

      {vista === "giacenze" ? <Giacenze dati={dati} totale={totale} onCarico={vende ? () => setModulo({ tipo: "carico" }) : null} /> : null}
      {vista === "movimenti" ? <Movimenti dati={dati} onCambio={carica} /> : null}
      {vista === "inventario" && gestisce ? <Inventario dati={dati} onFatto={carica} /> : null}
      {vista === "depositi" ? <Depositi dati={dati} onCambio={carica} /> : null}
    </div>
  );
}

/* ———————————————————— Giacenze ———————————————————— */

function Giacenze({ dati, totale, onCarico }: { dati: Dati; totale: Map<string, number>; onCarico: (() => void) | null }) {
  const az = useAzienda();
  const [deposito, setDeposito] = useState("");
  const [testo, setTesto] = useState("");
  const [filtro, setFiltro] = useState<"tutti" | "sotto" | "scadenza">("tutti");
  const [aperto, setAperto] = useState<string | null>(null);
  const nomeDep = (id: string) => dati.depositi.find((d) => d.id === id)?.nome ?? "";
  const limite = fraGiorni(30);

  const righe = useMemo(() => {
    const q = senzaAccenti(testo.trim());
    return dati.articoli
      .filter((a) => dati.impostazioni.get(a.id)?.gestito)
      .map((a) => {
        const dettaglio = dati.giacenze.filter((g) => g.articolo_id === a.id && (!deposito || g.deposito_id === deposito));
        const qta = deposito ? dettaglio.reduce((t, g) => t + g.quantita, 0) : totale.get(a.id) ?? 0;
        const cfg = dati.impostazioni.get(a.id)!;
        const sotto = cfg.scorta_minima != null && (totale.get(a.id) ?? 0) < Number(cfg.scorta_minima);
        const scade = dettaglio.some((g) => g.lotto && g.scadenza && g.quantita > 0 && g.scadenza <= limite);
        return { a, cfg, dettaglio, qta, sotto, scade };
      })
      .filter((r) => (!q || senzaAccenti(etichetta(r.a)).includes(q)) && (filtro === "tutti" || (filtro === "sotto" ? r.sotto : r.scade)));
  }, [dati, totale, deposito, testo, filtro, limite]);

  if (!dati.articoli.some((a) => dati.impostazioni.get(a.id)?.gestito)) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-2xl bg-superficie p-5">
        <p className="text-[15px] leading-relaxed">Nessun articolo a magazzino. Il primo carico di un articolo lo mette a magazzino; varianti (taglie, colori), lotti e scorta minima si scelgono negli <Link href={`/neonup/${az.id}/articoli`} className="font-semibold text-accento">Articoli</Link>.</p>
        <p className="text-[14px] leading-relaxed text-testo-2">Da lì in poi DDT e fatture scaricano da soli, le note di credito ricaricano i resi.</p>
        {onCarico ? <PrimaryButton dimensione="sm" onClick={onCarico}>Fai il primo carico</PrimaryButton> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <input type="search" value={testo} onChange={(e) => setTesto(e.target.value)} placeholder="Cerca per codice o descrizione" aria-label="Cerca" className={`${CAMPO} h-11 min-w-0 flex-1`} />
        {dati.depositi.length > 1 ? (
          <select value={deposito} onChange={(e) => setDeposito(e.target.value)} aria-label="Deposito" className={`${STRETTO} h-11 sm:w-56`}>
            <option value="">Tutti i depositi</option>
            {dati.depositi.map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}
          </select>
        ) : null}
      </div>
      <div className="flex gap-2" role="group" aria-label="Filtra">
        {([["tutti", "Tutti"], ["sotto", "Sotto scorta"], ["scadenza", "Lotti in scadenza"]] as const).map(([k, n]) => (
          <button key={k} type="button" aria-pressed={filtro === k} onClick={() => setFiltro(k)}
            className={`h-9 shrink-0 rounded-xl px-3.5 text-[14px] font-medium ${filtro === k ? "bg-[#09090B] text-white" : "bg-superficie hover:bg-superficie-2"}`}>{n}</button>
        ))}
      </div>
      {righe.length ? (
        <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie">
          {righe.map(({ a, cfg, dettaglio, qta, sotto, scade }) => {
            const costo = dati.costi.get(a.id);
            return (
              <li key={a.id} className="flex flex-col">
                <button type="button" onClick={() => setAperto(aperto === a.id ? null : a.id)} aria-expanded={aperto === a.id}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-superficie-2">
                  {a.codice ? <span className="w-20 shrink-0 truncate font-mono text-[13px] text-testo-2">{a.codice}</span> : null}
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[15px] font-medium">{a.descrizione}</span>
                    <span className={`truncate text-[13px] ${sotto || scade ? "font-medium text-segnale" : "text-testo-2"}`}>
                      {[
                        sotto ? `Sotto la scorta minima (${quantita(cfg.scorta_minima, a.unita_misura)})` : cfg.scorta_minima != null ? `Scorta minima ${quantita(cfg.scorta_minima, a.unita_misura)}` : null,
                        scade ? "Un lotto scade entro 30 giorni" : null,
                        cfg.varianti.length ? `${cfg.varianti.length} varianti` : null,
                        cfg.lotti ? "a lotti" : null,
                      ].filter(Boolean).join(", ") || "Senza scorta minima"}
                    </span>
                  </span>
                  <span className={`shrink-0 font-mono text-[15px] font-medium ${qta < 0 || sotto ? "text-segnale" : ""}`}>{quantita(qta, a.unita_misura)}</span>
                </button>
                {aperto === a.id ? (
                  <div className="flex flex-col gap-3 px-4 pb-4">
                    {dettaglio.length ? (
                      <table className="w-full text-[14px]">
                        <thead>
                          <tr className="text-left text-[12px] text-testo-2">
                            {dati.depositi.length > 1 ? <th className="py-1 pr-2 font-medium">Deposito</th> : null}
                            {cfg.varianti.length ? <th className="py-1 pr-2 font-medium">Variante</th> : null}
                            {cfg.lotti ? <th className="py-1 pr-2 font-medium">Lotto</th> : null}
                            <th className="py-1 text-right font-medium">Quantità</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-linea">
                          {dettaglio.map((g) => (
                            <tr key={`${g.deposito_id}${g.variante}${g.lotto}`}>
                              {dati.depositi.length > 1 ? <td className="py-1.5 pr-2">{nomeDep(g.deposito_id)}</td> : null}
                              {cfg.varianti.length ? <td className="py-1.5 pr-2">{g.variante || "Senza variante"}</td> : null}
                              {cfg.lotti ? (
                                <td className={`py-1.5 pr-2 ${g.scadenza && g.scadenza <= limite ? "text-segnale" : ""}`}>
                                  {g.lotto || "Senza lotto"}{g.scadenza ? <span className="text-[12px]">, scade il {data(g.scadenza)}</span> : null}
                                </td>
                              ) : null}
                              <td className={`py-1.5 text-right font-mono ${g.quantita < 0 ? "text-segnale" : ""}`}>{quantita(g.quantita, a.unita_misura)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : <p className="text-[14px] text-testo-2">Niente in magazzino.</p>}
                    <p className="text-[13px] text-testo-2">
                      {costo?.costo_medio != null ? `Costo medio dei carichi ${soldi(Number(costo.costo_medio))}, valore ${soldi(Math.max(0, qta) * Number(costo.costo_medio))}. ` : "Nessun costo nei carichi. "}
                      {costo?.ultimo ? `Ultimo movimento il ${data(costo.ultimo)}.` : ""}
                    </p>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : <p className="rounded-2xl bg-superficie px-4 py-5 text-[15px] text-testo-2">Nessun articolo qui.</p>}
    </div>
  );
}

/* ———————————————————— Movimenti ———————————————————— */

function Movimenti({ dati, onCambio }: { dati: Dati; onCambio: () => void }) {
  const az = useAzienda();
  const [movimenti, setMovimenti] = useState<Movimento[] | null>(null);
  const [aperta, setAperta] = useState<string | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const art = useMemo(() => new Map(dati.articoli.map((a) => [a.id, a])), [dati.articoli]);
  const nomeDep = (id: string) => dati.depositi.find((d) => d.id === id)?.nome ?? "";
  const nomeSog = (id: string | null) => dati.soggetti.find((s) => s.id === id)?.denominazione;

  useEffect(() => { leggiMovimenti(dati.operazioni.map((o) => o.id)).then(setMovimenti); }, [dati.operazioni]);

  async function annulla(o: Operazione) {
    if (!confirm("Stornare questa operazione? NeonUp scrive i movimenti opposti: quelli di adesso restano nello storico.")) return;
    const r = await storna(o.id);
    if (r.errore) return setErrore(r.errore);
    onCambio();
  }

  if (!dati.operazioni.length) return <p className="rounded-2xl bg-superficie px-4 py-5 text-[15px] text-testo-2">Ancora nessun movimento. I carichi li registri qui; le uscite arrivano da sole con i DDT e le fatture.</p>;
  return (
    <div className="flex flex-col gap-3">
      {errore ? <p role="alert" className={ERRORE}>{errore}</p> : null}
      <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie">
        {dati.operazioni.map((o) => {
          const righe = (movimenti ?? []).filter((m) => m.operazione_id === o.id);
          const manuale = !["vendita", "reso", "storno"].includes(o.tipo);
          const puo = o.tipo === "inventario" ? puoGestire(az.ruolo) : puoVendere(az.ruolo);
          return (
            <li key={o.id} className={`flex flex-col ${o.stornata ? "opacity-60" : ""}`}>
              <button type="button" onClick={() => setAperta(aperta === o.id ? null : o.id)} aria-expanded={aperta === o.id}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-superficie-2">
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[15px] font-semibold">{OPERAZIONI[o.tipo]}{o.stornata ? ", stornata" : ""}</span>
                  <span className="truncate text-[13px] text-testo-2">{[data(o.data), o.riferimento, nomeSog(o.soggetto_id)].filter(Boolean).join(", ")}</span>
                </span>
                <span className="shrink-0 text-[13px] text-testo-2">{movimenti ? contaRighe(o, righe) : ""}</span>
              </button>
              {aperta === o.id ? (
                <div className="flex flex-col gap-2 px-4 pb-4">
                  {righe.length ? (
                    <ul className="flex flex-col gap-1 text-[14px]">
                      {righe.map((m) => {
                        const a = art.get(m.articolo_id);
                        return (
                          <li key={m.id} className="flex items-baseline justify-between gap-3">
                            <span className="min-w-0">
                              {a ? etichetta(a) : "Articolo"}
                              <span className="text-[12px] text-testo-2">{[m.variante, m.lotto ? `lotto ${m.lotto}` : "", dati.depositi.length > 1 ? nomeDep(m.deposito_id) : ""].filter(Boolean).map((x) => `, ${x}`).join("")}</span>
                            </span>
                            <span className={`shrink-0 font-mono ${m.quantita < 0 ? "text-segnale" : ""}`}>{m.quantita > 0 ? "+" : ""}{quantita(m.quantita, a?.unita_misura)}</span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : <p className="text-[14px] text-testo-2">{o.tipo === "inventario" ? "Nessuna differenza." : "Nessun movimento."}</p>}
                  {o.nota ? <p className="text-[13px]">{o.nota}</p> : null}
                  <div className="flex flex-wrap gap-4 text-[14px] font-semibold">
                    {o.documento_id ? <Link href={`/neonup/${az.id}/documenti/${o.documento_id}`} className="text-accento">Apri il documento</Link> : null}
                    {o.passiva_id ? <Link href={`/neonup/${az.id}/ricevute`} className="text-accento">Fatture ricevute</Link> : null}
                    {manuale && !o.stornata && puo ? <button type="button" onClick={() => annulla(o)} className="text-segnale">Storna</button> : null}
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      <p className="text-[13px] leading-relaxed text-testo-2">Le uscite dei DDT si correggono annullando il DDT; quelle delle fatture con una nota di credito che fa rientrare la merce.</p>
    </div>
  );
}

/* ———————————————————— Inventario ———————————————————— */

function Inventario({ dati, onFatto }: { dati: Dati; onFatto: () => void }) {
  const az = useAzienda();
  const attivi = dati.depositi.filter((d) => d.attivo);
  const [deposito, setDeposito] = useState(attivi.find((d) => d.predefinito)?.id ?? attivi[0]?.id ?? "");
  const [contati, setContati] = useState<Record<string, string>>({});
  const [nota, setNota] = useState("");
  const [esito, setEsito] = useState<string | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [invio, setInvio] = useState(false);

  const righe = useMemo(() => {
    const out: { chiave: string; a: Articolo; variante: string; lotto: string; scadenza: string | null; ora: number }[] = [];
    for (const a of dati.articoli) {
      const cfg = dati.impostazioni.get(a.id);
      if (!cfg?.gestito) continue;
      const qui = dati.giacenze.filter((g) => g.articolo_id === a.id && g.deposito_id === deposito);
      const viste = new Set<string>();
      for (const g of qui) { viste.add(`${g.variante}|${g.lotto}`); out.push({ chiave: `${a.id}|${g.variante}|${g.lotto}`, a, variante: g.variante, lotto: g.lotto, scadenza: g.scadenza, ora: g.quantita }); }
      if (!cfg.lotti) for (const v of cfg.varianti.length ? cfg.varianti : [""]) if (!viste.has(`${v}|`)) out.push({ chiave: `${a.id}|${v}|`, a, variante: v, lotto: "", scadenza: null, ora: 0 });
    }
    return out;
  }, [dati, deposito]);

  async function registra() {
    const scelte = righe.filter((r) => contati[r.chiave]?.trim()).map((r) => ({ articolo_id: r.a.id, variante: r.variante, lotto: r.lotto, contati: numero(contati[r.chiave]) }));
    if (!scelte.length) return setErrore("Scrivi almeno una quantità contata.");
    if (scelte.some((s) => Number.isNaN(s.contati) || s.contati < 0)) return setErrore("Le quantità contate sono numeri da 0 in su.");
    if (!confirm(`Registrare l'inventario di ${scelte.length} ${scelte.length === 1 ? "riga" : "righe"}? Le differenze diventano rettifiche.`)) return;
    setInvio(true); setErrore(null);
    const r = await inventario(az.id, deposito, scelte, nota);
    setInvio(false);
    if (r.errore) return setErrore(r.errore);
    setEsito(r.differenze ? `Inventario registrato: ${r.differenze} ${r.differenze === 1 ? "differenza corretta" : "differenze corrette"}.` : "Inventario registrato: tutto tornava.");
    setContati({}); setNota("");
    onFatto();
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[14px] leading-relaxed text-testo-2">Conta quello che c&apos;è e scrivilo: le righe lasciate vuote non cambiano. Gli articoli a lotti compaiono con i lotti che risultano; un lotto nuovo si registra con un carico.</p>
      {attivi.length > 1 ? (
        <Campo etichetta="Deposito">
          <select value={deposito} onChange={(e) => { setDeposito(e.target.value); setContati({}); }} className={`${CAMPO} h-12`}>
            {attivi.map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}
          </select>
        </Campo>
      ) : null}
      {righe.length ? (
        <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie">
          {righe.map((r) => (
            <li key={r.chiave} className="flex items-center gap-3 px-4 py-2.5">
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[15px]">{etichetta(r.a)}</span>
                <span className="truncate text-[13px] text-testo-2">
                  {[r.variante, r.lotto ? `lotto ${r.lotto}${r.scadenza ? `, scade il ${data(r.scadenza)}` : ""}` : ""].filter(Boolean).join(", ")}{r.variante || r.lotto ? ", " : ""}risulta {quantita(r.ora, r.a.unita_misura)}
                </span>
              </span>
              <input inputMode="decimal" value={contati[r.chiave] ?? ""} onChange={(e) => setContati({ ...contati, [r.chiave]: e.target.value })} placeholder="Contati"
                aria-label={`Contati: ${etichetta(r.a)} ${r.variante} ${r.lotto}`} className={`${CAMPO} h-10 w-24 shrink-0 bg-fondo text-right font-mono`} />
            </li>
          ))}
        </ul>
      ) : <p className="rounded-2xl bg-superficie px-4 py-5 text-[15px] text-testo-2">Nessun articolo a magazzino in questo deposito.</p>}
      <Campo etichetta="Nota"><input maxLength={300} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Es. inventario di fine anno" className={`${CAMPO} h-12`} /></Campo>
      {errore ? <p role="alert" className={ERRORE}>{errore}</p> : null}
      {esito ? <p className="rounded-xl bg-superficie px-4 py-3 text-[14px]">{esito}</p> : null}
      <PrimaryButton onClick={registra} disabled={invio || !righe.length} className="w-fit">Registra l&apos;inventario</PrimaryButton>
    </div>
  );
}

/* ———————————————————— Depositi ———————————————————— */

function Depositi({ dati, onCambio }: { dati: Dati; onCambio: () => void }) {
  const az = useAzienda();
  const gestisce = puoGestire(az.ruolo);
  const [nuovo, setNuovo] = useState("");
  const [nomi, setNomi] = useState<Record<string, string>>({});
  const [errore, setErrore] = useState<string | null>(null);

  async function salva(d: Deposito | null, cambi: Partial<Deposito> = {}) {
    setErrore(null);
    const nome = d ? (cambi.nome ?? nomi[d.id] ?? d.nome) : nuovo;
    const r = await salvaDeposito(az.id, d?.id ?? null, nome, cambi.predefinito ?? d?.predefinito ?? false, cambi.attivo ?? d?.attivo ?? true);
    if (r.errore) return setErrore(r.errore);
    if (!d) setNuovo("");
    onCambio();
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie">
        {dati.depositi.map((d) => (
          <li key={d.id} className={`flex flex-wrap items-center gap-3 px-4 py-3 ${d.attivo ? "" : "opacity-60"}`}>
            {gestisce ? (
              <input value={nomi[d.id] ?? d.nome} maxLength={60} onChange={(e) => setNomi({ ...nomi, [d.id]: e.target.value })}
                onBlur={() => (nomi[d.id] ?? d.nome) !== d.nome && salva(d)} aria-label="Nome del deposito" className={`${CAMPO} h-10 min-w-0 flex-1 bg-fondo`} />
            ) : <span className="min-w-0 flex-1 text-[15px] font-medium">{d.nome}</span>}
            {d.predefinito ? <span className="text-[13px] font-medium">Predefinito</span> : gestisce && d.attivo ? (
              <button type="button" onClick={() => salva(d, { predefinito: true })} className="text-[13px] font-semibold text-accento">Rendi predefinito</button>
            ) : null}
            {gestisce && !d.predefinito ? (
              <button type="button" onClick={() => salva(d, { attivo: !d.attivo })} className="text-[13px] font-semibold text-testo-2">{d.attivo ? "Disattiva" : "Riattiva"}</button>
            ) : null}
          </li>
        ))}
      </ul>
      <p className="text-[13px] leading-relaxed text-testo-2">DDT e fatture scaricano dal deposito predefinito, a meno che nel documento non ne scegli un altro.</p>
      {gestisce ? (
        <div className="flex gap-2">
          <input value={nuovo} maxLength={60} onChange={(e) => setNuovo(e.target.value)} placeholder="Nuovo deposito, es. Negozio" aria-label="Nome del nuovo deposito" className={`${CAMPO} h-11 min-w-0 flex-1`} />
          <button type="button" onClick={() => salva(null)} disabled={nuovo.trim().length < 2} className="h-11 shrink-0 rounded-xl bg-superficie px-4 text-[14px] font-semibold hover:bg-superficie-2 disabled:opacity-50">Aggiungi</button>
        </div>
      ) : null}
      {errore ? <p role="alert" className={ERRORE}>{errore}</p> : null}
    </div>
  );
}

/* ———————————————————— Carico, scarico, rettifica, trasferimento ———————————————————— */

type RigaModulo = { testo: string; articolo_id: string; variante: string; lotto: string; scadenza: string; quantita: string; costo: string; nota?: string };
const RIGA: RigaModulo = { testo: "", articolo_id: "", variante: "", lotto: "", scadenza: "", quantita: "", costo: "" };
const TITOLI: Record<TipoManuale, { titolo: string; aiuto: string }> = {
  carico: { titolo: "Carico", aiuto: "Merce che entra: da un fornitore, dalla produzione, un reso." },
  scarico: { titolo: "Scarico", aiuto: "Merce che esce senza un documento di vendita: uso interno, omaggi, rotture. Le vendite scaricano da sole con DDT e fatture." },
  rettifica: { titolo: "Rettifica", aiuto: "Corregge una giacenza: quantità positiva aggiunge, negativa (con il meno) toglie." },
  trasferimento: { titolo: "Trasferimento", aiuto: "Sposta la merce da un deposito all'altro, con i suoi lotti." },
};

function ModuloOperazione({ tipo, passiva, dati, onFine }: { tipo: TipoManuale; passiva?: string; dati: Dati; onFine: (ok: boolean) => void }) {
  const az = useAzienda();
  const attivi = dati.depositi.filter((d) => d.attivo);
  const predefinito = attivi.find((d) => d.predefinito)?.id ?? attivi[0]?.id ?? "";
  const [giorno, setGiorno] = useState(oggiSM());
  const [deposito, setDeposito] = useState(predefinito);
  const [arrivo, setArrivo] = useState(attivi.find((d) => d.id !== predefinito)?.id ?? "");
  const [fornitore, setFornitore] = useState("");
  const [riferimento, setRiferimento] = useState("");
  const [nota, setNota] = useState("");
  const [righe, setRighe] = useState<RigaModulo[]>([{ ...RIGA }]);
  const [errore, setErrore] = useState<string | null>(null);
  const [invio, setInvio] = useState(false);
  const catalogo = dati.articoli.filter((a) => a.attivo);
  const fornitori = dati.soggetti.filter((s) => s.attivo && s.tipo !== "cliente");

  // Dal carico di una fattura ricevuta: fornitore, riferimento e righe abbinate al catalogo per codice o descrizione
  useEffect(() => {
    if (!passiva) return;
    leggiPassive(az.id).then((r) => {
      const p = r.passive.find((x) => x.id === passiva);
      if (!p) return setErrore("Fattura ricevuta non trovata.");
      setRiferimento(`Fattura ${p.numero ?? ""}${p.data ? ` del ${data(p.data)}` : ""}`.slice(0, 60));
      const f = dati.soggetti.find((s) => p.cedente_cod_oe && s.cod_oe === p.cedente_cod_oe);
      if (f) setFornitore(f.id);
      if (!p.xml) return setErrore("Il file della fattura è firmato e non si legge qui: aggiungi le righe a mano.");
      const lette = righeFattura(p.xml).map((l) => {
        const a = catalogo.find((x) => (l.codice && x.codice?.toLowerCase() === l.codice.toLowerCase()) || senzaAccenti(x.descrizione) === senzaAccenti(l.descrizione));
        return { ...RIGA, testo: a ? etichetta(a) : l.descrizione, articolo_id: a?.id ?? "", quantita: String(l.quantita), costo: String(l.prezzo),
          nota: a ? undefined : `In fattura: «${l.descrizione}»${l.codice ? `, codice ${l.codice}` : ""}. Scegli l'articolo del catalogo o togli la riga.` };
      });
      if (lette.length) setRighe(lette);
    });
  }, [passiva]); // eslint-disable-line react-hooks/exhaustive-deps

  const cambiaRiga = (i: number, m: Partial<RigaModulo>) => setRighe((x) => x.map((r, j) => (j === i ? { ...r, ...m } : r)));
  function scegli(i: number, testo: string) {
    const a = catalogo.find((x) => etichetta(x) === testo);
    cambiaRiga(i, { testo, articolo_id: a?.id ?? "", variante: "", lotto: "", nota: a ? undefined : righe[i].nota });
  }
  const disponibili = (r: RigaModulo) => dati.giacenze
    .filter((g) => g.articolo_id === r.articolo_id && g.deposito_id === deposito && (!r.variante || g.variante === r.variante) && (!r.lotto || g.lotto === r.lotto))
    .reduce((t, g) => t + g.quantita, 0);

  async function registra(e: React.FormEvent) {
    e.preventDefault();
    setErrore(null);
    const usate = righe.filter((r) => r.testo.trim() || r.articolo_id);
    const senza = usate.findIndex((r) => !r.articolo_id);
    if (senza >= 0) return setErrore(`Riga ${senza + 1}: scegli un articolo dal catalogo.`);
    setInvio(true);
    const r = await registraMagazzino(az.id, {
      tipo, data: giorno, deposito_id: deposito, deposito_a: tipo === "trasferimento" ? arrivo : null, soggetto_id: tipo === "carico" ? fornitore || null : null,
      riferimento: riferimento.trim() || null, passiva_id: passiva ?? null, nota: nota.trim() || null,
      righe: usate.map((x) => ({
        articolo_id: x.articolo_id, variante: x.variante || undefined, lotto: x.lotto.trim() || undefined, scadenza: x.scadenza || undefined,
        quantita: numero(x.quantita), costo: tipo === "carico" && x.costo.trim() ? numero(x.costo) : null,
      })),
    });
    setInvio(false);
    if (r.errore) return setErrore(r.errore);
    onFine(true);
  }

  return (
    <form onSubmit={registra} className="flex flex-col gap-4 rounded-2xl border border-linea p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-[19px] font-semibold tracking-tight">{TITOLI[tipo].titolo}{passiva ? " dalla fattura ricevuta" : ""}</h2>
          <p className="text-[14px] leading-relaxed text-testo-2">{TITOLI[tipo].aiuto}</p>
        </div>
        <button type="button" onClick={() => onFine(false)} aria-label="Chiudi" className="text-testo-2"><Icona nome="chiudi" size={20} /></button>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Campo etichetta="Data"><input type="date" required max={oggiSM()} value={giorno} onChange={(e) => setGiorno(e.target.value)} className={`${CAMPO} h-12`} /></Campo>
        {attivi.length > 1 ? (
          <Campo etichetta={tipo === "trasferimento" ? "Da" : "Deposito"}>
            <select value={deposito} onChange={(e) => setDeposito(e.target.value)} className={`${CAMPO} h-12`}>
              {attivi.map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}
            </select>
          </Campo>
        ) : null}
        {tipo === "trasferimento" ? (
          <Campo etichetta="A">
            <select value={arrivo} onChange={(e) => setArrivo(e.target.value)} className={`${CAMPO} h-12`}>
              {attivi.filter((d) => d.id !== deposito).map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}
            </select>
          </Campo>
        ) : null}
        {tipo === "carico" ? (
          <Campo etichetta="Fornitore">
            <select value={fornitore} onChange={(e) => setFornitore(e.target.value)} className={`${CAMPO} h-12`}>
              <option value="">Nessuno</option>
              {fornitori.map((s) => <option key={s.id} value={s.id}>{s.denominazione}</option>)}
            </select>
          </Campo>
        ) : null}
        <Campo etichetta="Riferimento"><input maxLength={60} value={riferimento} onChange={(e) => setRiferimento(e.target.value)} placeholder={tipo === "carico" ? "Es. DDT 128 del fornitore" : "Facoltativo"} className={`${CAMPO} h-12`} /></Campo>
      </div>

      <datalist id="neon-magazzino">{catalogo.map((a) => <option key={a.id} value={etichetta(a)} />)}</datalist>
      <ol className="flex flex-col gap-3">
        {righe.map((r, i) => {
          const cfg = dati.impostazioni.get(r.articolo_id);
          const a = catalogo.find((x) => x.id === r.articolo_id);
          const esce = tipo !== "carico" && !(tipo === "rettifica" && numero(r.quantita) > 0);
          const lotti = [...new Set(dati.giacenze.filter((g) => g.articolo_id === r.articolo_id && g.deposito_id === deposito && g.lotto && g.quantita > 0 && (!r.variante || g.variante === r.variante)).map((g) => g.lotto))];
          return (
            <li key={i} className="flex flex-col gap-2 rounded-2xl bg-superficie p-4">
              <div className="flex items-start gap-2">
                <span className="mt-3 w-6 shrink-0 font-mono text-[13px] text-testo-2">{i + 1}</span>
                <input list="neon-magazzino" value={r.testo} onChange={(e) => scegli(i, e.target.value)} placeholder="Articolo dal catalogo" aria-label={`Articolo della riga ${i + 1}`}
                  className={`${CAMPO} h-11 min-w-0 flex-1 bg-fondo ${r.testo && !r.articolo_id ? "border-segnale" : ""}`} />
                {righe.length > 1 ? <button type="button" onClick={() => setRighe(righe.filter((_, j) => j !== i))} aria-label={`Togli la riga ${i + 1}`} className="mt-2.5 text-testo-2"><Icona nome="chiudi" size={20} /></button> : null}
              </div>
              {r.nota ? <p className="pl-8 text-[13px] text-segnale">{r.nota}</p> : null}
              <div className="grid grid-cols-2 gap-2 pl-8 sm:grid-cols-4">
                {cfg?.varianti.length ? (
                  <label className="flex flex-col gap-1"><span className="text-[12px] text-testo-2">Variante</span>
                    <select value={r.variante} onChange={(e) => cambiaRiga(i, { variante: e.target.value })} className={`${CAMPO} h-10 bg-fondo`}>
                      <option value="">Scegli</option>
                      {cfg.varianti.map((v) => <option key={v} value={v}>{v}</option>)}
                    </select></label>
                ) : null}
                {cfg?.lotti ? (
                  <label className="flex flex-col gap-1"><span className="text-[12px] text-testo-2">Lotto</span>
                    <input list={`lotti-${i}`} maxLength={40} value={r.lotto} onChange={(e) => cambiaRiga(i, { lotto: e.target.value })} placeholder={esce ? "Prima quello che scade prima" : "Lotto"} className={`${CAMPO} h-10 bg-fondo`} />
                    <datalist id={`lotti-${i}`}>{lotti.map((l) => <option key={l} value={l} />)}</datalist></label>
                ) : null}
                {cfg?.lotti && !esce ? (
                  <label className="flex flex-col gap-1"><span className="text-[12px] text-testo-2">Scadenza</span>
                    <input type="date" value={r.scadenza} onChange={(e) => cambiaRiga(i, { scadenza: e.target.value })} className={`${CAMPO} h-10 bg-fondo`} /></label>
                ) : null}
                <label className="flex flex-col gap-1"><span className="text-[12px] text-testo-2">Quantità{a?.unita_misura ? ` (${a.unita_misura})` : ""}</span>
                  <input inputMode="decimal" required={!!r.articolo_id} value={r.quantita} onChange={(e) => cambiaRiga(i, { quantita: e.target.value })} placeholder={tipo === "rettifica" ? "+3 o -2" : "Qtà"} className={`${CAMPO} h-10 bg-fondo font-mono`} /></label>
                {tipo === "carico" ? (
                  <label className="flex flex-col gap-1"><span className="text-[12px] text-testo-2">Costo unitario €</span>
                    <input inputMode="decimal" value={r.costo} onChange={(e) => cambiaRiga(i, { costo: e.target.value })} placeholder="Facoltativo" className={`${CAMPO} h-10 bg-fondo font-mono`} /></label>
                ) : null}
              </div>
              {r.articolo_id && tipo !== "carico" ? (
                <p className={`pl-8 text-[13px] ${esce && numero(r.quantita) > disponibili(r) ? "text-segnale" : "text-testo-2"}`}>
                  Disponibili {quantita(disponibili(r), a?.unita_misura)}{esce && numero(r.quantita) > disponibili(r) ? ": la giacenza andrà sotto zero" : ""}
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>
      <button type="button" onClick={() => setRighe([...righe, { ...RIGA }])} className="flex w-fit items-center gap-1.5 text-[14px] font-semibold text-accento">
        <Icona nome="piu" size={16} /> Aggiungi un articolo
      </button>
      {!catalogo.length ? <p className="text-[14px] text-testo-2">Prima aggiungi gli articoli in <Link href={`/neonup/${az.id}/articoli`} className="font-semibold text-accento">Articoli</Link>.</p> : null}
      <Campo etichetta="Nota"><input maxLength={300} value={nota} onChange={(e) => setNota(e.target.value)} className={`${CAMPO} h-12`} /></Campo>
      {errore ? <p role="alert" className={ERRORE}>{errore}</p> : null}
      <div className="flex flex-wrap items-center gap-3">
        <PrimaryButton type="submit" disabled={invio}>Registra</PrimaryButton>
        <button type="button" onClick={() => onFine(false)} className="text-[14px] font-semibold text-testo-2">Annulla</button>
      </div>
    </form>
  );
}
