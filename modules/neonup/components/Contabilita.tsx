"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Cella, Cruscotto } from "@/components/Cruscotto";
import { Icona } from "@/components/Icona";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { CAMPO } from "@/modules/attivita/components/stile";
import {
  CATEGORIE, TIPI, TIPI_ACQUISTO, TIPI_CONTO, abbina, acquisti as leggiAcquisti, annullaAcquisto, annullaMovimento, conti as leggiConti, data,
  documenti as leggiDocumenti, estratti as leggiEstratti, giroconto, ignoraEstratto, importaEstratto, leggiCsv, leggiData, leggiNumero,
  movimentiCollegati, movimentoDaEstratto, oggiSM, passive as leggiPassive, primaNota, puoGestire, registraMovimento, saldi as leggiSaldi,
  saldoAcquisto, salvaAcquisto, salvaConto, scadenzaFattura, scadenzario as leggiScadenzario, scaricaTesto, scriviCsv, soggetti as leggiSoggetti,
  soldi, titoloDocumento, vedeConti,
  type Acquisto, type Conto, type Estratto, type MovimentoPN, type Saldo, type Scadenza, type Soggetto, type TipoAcquisto, type TipoConto,
} from "../api";
import { Campo } from "./DatiAzienda";
import { ERRORE, useAzienda } from "./Guscio";

type Dati = { conti: Conto[]; saldi: Map<string, number>; scadenze: Scadenza[]; acquisti: Acquisto[]; soggetti: Soggetto[]; mese: MovimentoPN[] };
type Vista = "prima" | "scadenzario" | "acquisti" | "banca" | "conti" | "esporta";
type Bozza = { verso: "entrata" | "uscita"; importo?: number; descrizione?: string; categoria?: string; soggetto_id?: string | null; documento_id?: string | null; acquisto_id?: string | null };

const intero = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 0 });
const STRETTO = CAMPO.replace("w-full ", "");
const meseDi = (d: string) => d.slice(0, 7);
const fineMese = (m: string) => { const [y, mm] = m.split("-").map(Number); return new Date(Date.UTC(y, mm, 0)).toISOString().slice(0, 10); };
const fraGiorni = (d: string, n: number) => { const x = new Date(`${d}T12:00:00Z`); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const conSegno = (n: number) => `${n > 0 ? "+" : ""}${soldi(n)}`;
const numero = (s: string) => leggiNumero(s);
const BOTTONE = "h-11 rounded-xl bg-superficie px-4 text-[14px] font-medium hover:bg-superficie-2";
const CHIP = (si: boolean) => `h-9 shrink-0 rounded-xl px-3.5 text-[14px] font-medium ${si ? "bg-[#09090B] text-white" : "bg-superficie hover:bg-superficie-2"}`;

/** /neonup/[azienda]/contabilita: conti, prima nota, scadenzario, acquisti, riconciliazione, file per il commercialista */
export default function Contabilita() {
  const az = useAzienda();
  const router = useRouter();
  const cerca = useSearchParams();
  const scrive = puoGestire(az.ruolo);
  const [dati, setDati] = useState<Dati | null>(null);
  const [attivo, setAttivo] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);
  const [vista, setVista] = useState<Vista>((cerca.get("vista") as Vista) || (cerca.get("acquisto") ? "acquisti" : "prima"));
  const [bozza, setBozza] = useState<Bozza | null>(null);
  const [giro, setGiro] = useState(false);
  const [nuovoAcquisto, setNuovoAcquisto] = useState<Partial<Acquisto> | null>(cerca.get("acquisto") ? { passiva_id: cerca.get("acquisto") } : null);

  const carica = useCallback(async () => {
    const oggi = oggiSM();
    const [c, s, sc, ac, so, pn] = await Promise.all([
      leggiConti(az.id), leggiSaldi(az.id), leggiScadenzario(az.id), leggiAcquisti(az.id), leggiSoggetti(az.id), primaNota(az.id, `${meseDi(oggi)}-01`, oggi),
    ]);
    setAttivo(c.attivo);
    setErrore(c.errore ?? sc.errore ?? ac.errore ?? pn.errore);
    setDati({ conti: c.conti, saldi: new Map(s.map((x: Saldo) => [x.conto_id, x.saldo])), scadenze: sc.scadenze, acquisti: ac.acquisti, soggetti: so.soggetti, mese: pn.movimenti });
  }, [az.id]);
  useEffect(() => { carica(); }, [carica]);

  if (!vedeConti(az.ruolo)) return <p className={ERRORE}>La contabilità la vedono il titolare, l&apos;amministrazione e chi ha il ruolo di sola lettura.</p>;
  if (!attivo) return <p className={ERRORE}>La contabilità non è ancora attiva nel database.</p>;
  if (!dati && !errore) return <div className="h-72 animate-pulse rounded-2xl bg-[#09090B]" />;
  if (!dati) return <p role="alert" className={ERRORE}>{errore}</p>;
  if (!dati.conti.length) return <PrimoConto scrive={scrive} onFatto={carica} />;

  const oggi = oggiSM();
  const attivi = dati.conti.filter((c) => c.attivo);
  const liquidita = attivi.reduce((t, c) => t + (dati.saldi.get(c.id) ?? c.saldo_iniziale), 0);
  const incassi = dati.scadenze.filter((s) => s.lato === "incasso");
  const pagamenti = dati.scadenze.filter((s) => s.lato === "pagamento");
  const scaduti = (l: Scadenza[]) => l.filter((s) => s.scadenza && s.scadenza < oggi);
  const somma = (l: Scadenza[]) => l.reduce((t, s) => t + s.residuo, 0);
  const vere = dati.mese.filter((m) => !m.annullato_il && !m.giroconto);
  const risultato = vere.reduce((t, m) => t + m.importo, 0);
  const fine = (ok: boolean) => {
    setBozza(null); setGiro(false); setNuovoAcquisto(null);
    if (cerca.get("acquisto")) router.replace(`/neonup/${az.id}/contabilita?vista=acquisti`);
    if (ok) carica();
  };
  const VISTE: { v: Vista; nome: string }[] = [
    { v: "prima", nome: "Prima nota" }, { v: "scadenzario", nome: "Scadenzario" }, { v: "acquisti", nome: "Acquisti" },
    { v: "banca", nome: "Banca" }, { v: "conti", nome: "Conti" }, { v: "esporta", nome: "Per il commercialista" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Cruscotto etichetta="I conti dell'azienda">
        <Cella titolo="Liquidità" valore={intero.format(liquidita)} unita="€" nota={`${attivi.length} ${attivi.length === 1 ? "conto" : "conti"}, saldo di oggi`} avviso={liquidita < 0} />
        <Cella titolo="Da incassare" valore={intero.format(somma(incassi))} unita="€"
          nota={scaduti(incassi).length ? `${soldi(somma(scaduti(incassi)))} già scaduti` : `${incassi.length} da incassare`} avviso={scaduti(incassi).length > 0} />
        <Cella titolo="Da pagare" valore={intero.format(somma(pagamenti))} unita="€"
          nota={scaduti(pagamenti).length ? `${soldi(somma(scaduti(pagamenti)))} già scaduti` : `${soldi(somma(pagamenti.filter((s) => s.scadenza && s.scadenza <= fraGiorni(oggi, 30))))} entro 30 giorni`}
          avviso={scaduti(pagamenti).length > 0} />
        <Cella titolo="Entrate meno uscite del mese" valore={intero.format(risultato)} unita="€" nota="Dalla prima nota, senza i giroconti" avviso={risultato < 0} />
      </Cruscotto>

      {scrive && !bozza && !giro && !nuovoAcquisto ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setBozza({ verso: "entrata" })} className="taglio-piccolo flex h-11 items-center gap-1.5 bg-metallo px-4 text-[14px] font-semibold text-su-accento">
            <Icona nome="piu" size={16} /> Entrata
          </button>
          <button type="button" onClick={() => setBozza({ verso: "uscita" })} className={BOTTONE}>Uscita</button>
          {attivi.length > 1 ? <button type="button" onClick={() => setGiro(true)} className={BOTTONE}>Giroconto</button> : null}
          <button type="button" onClick={() => setNuovoAcquisto({})} className={BOTTONE}>Nuovo acquisto</button>
        </div>
      ) : null}
      {bozza ? <ModuloMovimento bozza={bozza} dati={dati} onFine={fine} /> : null}
      {giro ? <ModuloGiroconto dati={dati} onFine={fine} /> : null}
      {nuovoAcquisto ? <ModuloAcquisto iniziale={nuovoAcquisto} dati={dati} onFine={fine} /> : null}
      {errore ? <p role="alert" className={ERRORE}>{errore}</p> : null}

      <div className="-mx-1 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Viste della contabilità">
        {VISTE.map((x) => <button key={x.v} type="button" role="tab" aria-selected={vista === x.v} onClick={() => setVista(x.v)} className={CHIP(vista === x.v)}>{x.nome}</button>)}
      </div>

      {vista === "prima" ? <PrimaNota dati={dati} onCambio={carica} /> : null}
      {vista === "scadenzario" ? <Scadenzario dati={dati} onRegistra={scrive ? setBozza : null} /> : null}
      {vista === "acquisti" ? <Acquisti dati={dati} onCambio={carica} onModifica={(a) => setNuovoAcquisto(a)} onPaga={scrive ? setBozza : null} /> : null}
      {vista === "banca" ? <Banca dati={dati} onCambio={carica} /> : null}
      {vista === "conti" ? <Conti dati={dati} onCambio={carica} /> : null}
      {vista === "esporta" ? <Esporta dati={dati} /> : null}
    </div>
  );
}

/* ———————————————————— Il primo conto ———————————————————— */

function PrimoConto({ scrive, onFatto }: { scrive: boolean; onFatto: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-2xl bg-[#09090B] p-6 text-white">
        <h2 className="text-[19px] font-semibold tracking-tight">La contabilità di tutti i giorni</h2>
        <p className="max-w-[60ch] text-[15px] leading-relaxed text-zinc-300">
          Cassa e banca con il saldo, la prima nota delle entrate e delle uscite, le fatture dei fornitori, lo scadenzario di incassi e pagamenti e l&apos;estratto conto riconciliato. Alla fine del mese i file per il commercialista.
        </p>
        <p className="max-w-[60ch] text-[13px] leading-relaxed text-zinc-400">Non è la contabilità obbligatoria: registri, partita doppia e bilancio restano al commercialista.</p>
      </div>
      {scrive ? <ModuloConto conto={{ tipo: "banca", saldo_iniziale: 0, saldo_dal: `${oggiSM().slice(0, 4)}-01-01`, attivo: true }} primo onFine={(ok) => ok && onFatto()} />
        : <p className="rounded-2xl bg-superficie px-4 py-5 text-[15px] text-testo-2">Il titolare o l&apos;amministrazione devono prima aggiungere un conto.</p>}
    </div>
  );
}

function ModuloConto({ conto, primo, onFine }: { conto: Partial<Conto>; primo?: boolean; onFine: (ok: boolean) => void }) {
  const az = useAzienda();
  const [c, setC] = useState({ ...conto, saldo_iniziale: conto.saldo_iniziale ?? 0 });
  const [saldo, setSaldo] = useState(String(conto.saldo_iniziale ?? 0).replace(".", ","));
  const [errore, setErrore] = useState<string | null>(null);
  const [invio, setInvio] = useState(false);

  async function salva(e: React.FormEvent) {
    e.preventDefault();
    const s = numero(saldo);
    if (Number.isNaN(s)) return setErrore("Il saldo iniziale è un numero, es. 1.250,00.");
    setInvio(true);
    const r = await salvaConto(az.id, c.id ?? null, { ...c, saldo_iniziale: s });
    setInvio(false);
    if (r.errore) return setErrore(r.errore);
    onFine(true);
  }

  return (
    <form onSubmit={salva} className="flex flex-col gap-4 rounded-2xl border border-linea p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-[17px] font-semibold">{primo ? "Il primo conto" : c.id ? "Modifica il conto" : "Nuovo conto"}</h2>
        {!primo ? <button type="button" onClick={() => onFine(false)} aria-label="Chiudi" className="text-testo-2"><Icona nome="chiudi" size={20} /></button> : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo etichetta="Nome"><input required maxLength={60} value={c.nome ?? ""} onChange={(e) => setC({ ...c, nome: e.target.value })} placeholder="Es. Banca di San Marino, Cassa del negozio" className={`${CAMPO} h-12`} /></Campo>
        <Campo etichetta="Tipo">
          <select value={c.tipo} onChange={(e) => setC({ ...c, tipo: e.target.value as TipoConto })} className={`${CAMPO} h-12`}>
            {(Object.keys(TIPI_CONTO) as TipoConto[]).map((t) => <option key={t} value={t}>{TIPI_CONTO[t]}</option>)}
          </select>
        </Campo>
        {c.tipo === "banca" ? <Campo etichetta="IBAN"><input maxLength={40} value={c.iban ?? ""} onChange={(e) => setC({ ...c, iban: e.target.value })} className={`${CAMPO} h-12 font-mono`} /></Campo> : null}
        <Campo etichetta="Saldo iniziale (€)" aiuto="Quanto c'era sul conto il giorno qui accanto.">
          <input required inputMode="decimal" value={saldo} onChange={(e) => setSaldo(e.target.value)} className={`${CAMPO} h-12 font-mono`} />
        </Campo>
        <Campo etichetta="Alla data" aiuto="I movimenti si registrano da questo giorno in poi.">
          <input type="date" required max={oggiSM()} value={c.saldo_dal ?? ""} onChange={(e) => setC({ ...c, saldo_dal: e.target.value })} className={`${CAMPO} h-12`} />
        </Campo>
      </div>
      {c.id ? (
        <label className="flex items-center gap-2 text-[15px]">
          <input type="checkbox" checked={c.attivo !== false} onChange={(e) => setC({ ...c, attivo: e.target.checked })} className="size-5 accent-[#09090B]" /> Attivo
        </label>
      ) : null}
      {errore ? <p role="alert" className={ERRORE}>{errore}</p> : null}
      <PrimaryButton type="submit" disabled={invio} className="w-fit">Salva</PrimaryButton>
    </form>
  );
}

/* ———————————————————— Entrata, uscita, giroconto ———————————————————— */

function ModuloMovimento({ bozza, dati, onFine }: { bozza: Bozza; dati: Dati; onFine: (ok: boolean) => void }) {
  const az = useAzienda();
  const attivi = dati.conti.filter((c) => c.attivo);
  const entra = bozza.verso === "entrata";
  const [conto, setConto] = useState((attivi.find((c) => c.tipo === "banca") ?? attivi[0])?.id ?? "");
  const [giorno, setGiorno] = useState(oggiSM());
  const [importo, setImporto] = useState(bozza.importo ? bozza.importo.toFixed(2).replace(".", ",") : "");
  const [descrizione, setDescrizione] = useState(bozza.descrizione ?? "");
  const [categoria, setCategoria] = useState(bozza.categoria ?? "");
  const [soggetto, setSoggetto] = useState(bozza.soggetto_id ?? "");
  const [legame, setLegame] = useState(bozza.documento_id ? `d:${bozza.documento_id}` : bozza.acquisto_id ? `a:${bozza.acquisto_id}` : "");
  const [errore, setErrore] = useState<string | null>(null);
  const [invio, setInvio] = useState(false);
  const aperte = dati.scadenze.filter((s) => s.lato === (entra ? "incasso" : "pagamento"));

  function scegli(v: string) {
    setLegame(v);
    const s = aperte.find((x) => (x.documento_id ? `d:${x.documento_id}` : `a:${x.acquisto_id}`) === v);
    if (!s) return;
    setImporto(s.residuo.toFixed(2).replace(".", ","));
    setDescrizione(`${entra ? "Incasso" : "Pagamento"} ${s.riferimento.toLowerCase()}${s.soggetto ? `, ${s.soggetto}` : ""}`.slice(0, 200));
    setSoggetto(s.soggetto_id ?? "");
    if (!categoria) setCategoria(entra ? "Vendite e incassi" : "");
  }

  async function registra(e: React.FormEvent) {
    e.preventDefault();
    const n = numero(importo);
    if (!(n > 0)) return setErrore("Scrivi l'importo, positivo: il segno lo dà «entrata» o «uscita».");
    setInvio(true); setErrore(null);
    const [tipo, id] = legame.split(":");
    const r = await registraMovimento(az.id, {
      conto_id: conto, data: giorno, importo: entra ? n : -n, descrizione, categoria: categoria || null, soggetto_id: soggetto || null,
      documento_id: tipo === "d" ? id : null, acquisto_id: tipo === "a" ? id : null,
    });
    setInvio(false);
    if (r.errore) return setErrore(r.errore);
    onFine(true);
  }

  return (
    <form onSubmit={registra} className="flex flex-col gap-4 rounded-2xl border border-linea p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-[19px] font-semibold tracking-tight">{entra ? "Entrata" : "Uscita"}</h2>
        <button type="button" onClick={() => onFine(false)} aria-label="Chiudi" className="text-testo-2"><Icona nome="chiudi" size={20} /></button>
      </div>
      {aperte.length ? (
        <Campo etichetta={entra ? "Incasso di" : "Pagamento di"} aiuto="Facoltativo: collegato a una scadenza, lo scadenzario si aggiorna da solo.">
          <select value={legame} onChange={(e) => scegli(e.target.value)} className={`${CAMPO} h-12`}>
            <option value="">Niente: un movimento libero</option>
            {aperte.map((s) => {
              const v = s.documento_id ? `d:${s.documento_id}` : `a:${s.acquisto_id}`;
              return <option key={v} value={v}>{s.riferimento}{s.soggetto ? `, ${s.soggetto}` : ""}: {soldi(s.residuo)}</option>;
            })}
          </select>
        </Campo>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-3">
        <Campo etichetta="Conto">
          <select value={conto} onChange={(e) => setConto(e.target.value)} className={`${CAMPO} h-12`}>
            {attivi.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </Campo>
        <Campo etichetta="Data"><input type="date" required max={oggiSM()} value={giorno} onChange={(e) => setGiorno(e.target.value)} className={`${CAMPO} h-12`} /></Campo>
        <Campo etichetta="Importo (€)"><input required inputMode="decimal" value={importo} onChange={(e) => setImporto(e.target.value)} className={`${CAMPO} h-12 font-mono`} /></Campo>
      </div>
      <Campo etichetta="Descrizione"><input required maxLength={200} value={descrizione} onChange={(e) => setDescrizione(e.target.value)} className={`${CAMPO} h-12`} /></Campo>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo etichetta="Categoria">
          <input list="neon-categorie" maxLength={40} value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="Scegli o scrivi" className={`${CAMPO} h-12`} />
        </Campo>
        <Campo etichetta={entra ? "Da chi" : "A chi"}>
          <select value={soggetto} onChange={(e) => setSoggetto(e.target.value)} className={`${CAMPO} h-12`}>
            <option value="">Nessuno</option>
            {dati.soggetti.filter((s) => s.attivo).map((s) => <option key={s.id} value={s.id}>{s.denominazione}</option>)}
          </select>
        </Campo>
      </div>
      <datalist id="neon-categorie">{CATEGORIE.map((c) => <option key={c} value={c} />)}</datalist>
      {errore ? <p role="alert" className={ERRORE}>{errore}</p> : null}
      <div className="flex flex-wrap items-center gap-3">
        <PrimaryButton type="submit" disabled={invio}>Registra</PrimaryButton>
        <button type="button" onClick={() => onFine(false)} className="text-[14px] font-semibold text-testo-2">Annulla</button>
      </div>
    </form>
  );
}

function ModuloGiroconto({ dati, onFine }: { dati: Dati; onFine: (ok: boolean) => void }) {
  const az = useAzienda();
  const attivi = dati.conti.filter((c) => c.attivo);
  const [da, setDa] = useState(attivi.find((c) => c.tipo === "cassa")?.id ?? attivi[0].id);
  const [a, setA] = useState(attivi.find((c) => c.id !== da)?.id ?? "");
  const [giorno, setGiorno] = useState(oggiSM());
  const [importo, setImporto] = useState("");
  const [descrizione, setDescrizione] = useState("");
  const [errore, setErrore] = useState<string | null>(null);

  async function registra(e: React.FormEvent) {
    e.preventDefault();
    const n = numero(importo);
    if (!(n > 0)) return setErrore("Scrivi l'importo.");
    const r = await giroconto(az.id, da, a, giorno, n, descrizione);
    if (r.errore) return setErrore(r.errore);
    onFine(true);
  }

  return (
    <form onSubmit={registra} className="flex flex-col gap-4 rounded-2xl border border-linea p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-[19px] font-semibold tracking-tight">Giroconto</h2>
          <p className="text-[14px] text-testo-2">Soldi che passano da un conto all&apos;altro, es. il versamento della cassa in banca.</p>
        </div>
        <button type="button" onClick={() => onFine(false)} aria-label="Chiudi" className="text-testo-2"><Icona nome="chiudi" size={20} /></button>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <Campo etichetta="Da"><select value={da} onChange={(e) => setDa(e.target.value)} className={`${CAMPO} h-12`}>{attivi.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></Campo>
        <Campo etichetta="A"><select value={a} onChange={(e) => setA(e.target.value)} className={`${CAMPO} h-12`}>{attivi.filter((c) => c.id !== da).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></Campo>
        <Campo etichetta="Data"><input type="date" required max={oggiSM()} value={giorno} onChange={(e) => setGiorno(e.target.value)} className={`${CAMPO} h-12`} /></Campo>
        <Campo etichetta="Importo (€)"><input required inputMode="decimal" value={importo} onChange={(e) => setImporto(e.target.value)} className={`${CAMPO} h-12 font-mono`} /></Campo>
      </div>
      <Campo etichetta="Descrizione"><input maxLength={200} value={descrizione} onChange={(e) => setDescrizione(e.target.value)} placeholder="Giroconto" className={`${CAMPO} h-12`} /></Campo>
      {errore ? <p role="alert" className={ERRORE}>{errore}</p> : null}
      <PrimaryButton type="submit" className="w-fit">Registra</PrimaryButton>
    </form>
  );
}

/* ———————————————————— Prima nota ———————————————————— */

function PrimaNota({ dati, onCambio }: { dati: Dati; onCambio: () => void }) {
  const az = useAzienda();
  const [mese, setMese] = useState(meseDi(oggiSM()));
  const [conto, setConto] = useState("");
  const [testo, setTesto] = useState("");
  const [righe, setRighe] = useState<MovimentoPN[] | null>(null);
  const [aperto, setAperto] = useState<string | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const nomeConto = (id: string) => dati.conti.find((c) => c.id === id)?.nome ?? "";
  const nomeSog = (id: string | null) => dati.soggetti.find((s) => s.id === id)?.denominazione;

  const carica = useCallback(() => primaNota(az.id, `${mese}-01`, fineMese(mese)).then((r) => { setRighe(r.movimenti); setErrore(r.errore); }), [az.id, mese]);
  useEffect(() => { carica(); }, [carica]);

  const visti = useMemo(() => {
    const q = testo.trim().toLowerCase();
    return (righe ?? []).filter((m) => (!conto || m.conto_id === conto) && (!q || `${m.descrizione} ${m.categoria ?? ""} ${nomeSog(m.soggetto_id) ?? ""}`.toLowerCase().includes(q)));
  }, [righe, conto, testo]); // eslint-disable-line react-hooks/exhaustive-deps
  const validi = visti.filter((m) => !m.annullato_il);
  const entrate = validi.filter((m) => m.importo > 0 && (!m.giroconto || conto)).reduce((t, m) => t + m.importo, 0);
  const uscite = validi.filter((m) => m.importo < 0 && (!m.giroconto || conto)).reduce((t, m) => t + m.importo, 0);

  async function annulla(m: MovimentoPN) {
    if (!confirm(m.giroconto ? "Annullare il giroconto (tutte e due le metà)?" : "Annullare questo movimento? Resta nello storico, barrato.")) return;
    const r = await annullaMovimento(m.id);
    if (r.errore) return setErrore(r.errore);
    carica(); onCambio();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <input type="month" value={mese} max={meseDi(oggiSM())} onChange={(e) => e.target.value && setMese(e.target.value)} aria-label="Mese" className={`${STRETTO} h-11`} />
        {dati.conti.length > 1 ? (
          <select value={conto} onChange={(e) => setConto(e.target.value)} aria-label="Conto" className={`${STRETTO} h-11`}>
            <option value="">Tutti i conti</option>
            {dati.conti.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        ) : null}
        <input type="search" value={testo} onChange={(e) => setTesto(e.target.value)} placeholder="Cerca" aria-label="Cerca" className={`${CAMPO} h-11 min-w-0 flex-1`} />
      </div>
      <p className="flex flex-wrap gap-x-5 gap-y-1 text-[14px]">
        <span>Entrate <b className="font-mono font-medium">{soldi(entrate)}</b></span>
        <span>Uscite <b className="font-mono font-medium">{soldi(-uscite)}</b></span>
        <span>Differenza <b className={`font-mono font-medium ${entrate + uscite < 0 ? "text-segnale" : ""}`}>{conSegno(entrate + uscite)}</b></span>
      </p>
      {errore ? <p role="alert" className={ERRORE}>{errore}</p> : null}
      {!righe ? <div className="h-40 animate-pulse rounded-2xl bg-superficie" /> : visti.length ? (
        <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie">
          {visti.map((m) => (
            <li key={m.id} className={`flex flex-col ${m.annullato_il ? "opacity-50" : ""}`}>
              <button type="button" onClick={() => setAperto(aperto === m.id ? null : m.id)} aria-expanded={aperto === m.id}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-superficie-2">
                <span className="w-14 shrink-0 font-mono text-[13px] text-testo-2">{data(m.data).replace(/ \d{4}$/, "")}</span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className={`truncate text-[15px] ${m.annullato_il ? "line-through" : ""}`}>{m.descrizione}</span>
                  <span className="truncate text-[13px] text-testo-2">{[m.categoria, nomeSog(m.soggetto_id), dati.conti.length > 1 ? nomeConto(m.conto_id) : null].filter(Boolean).join(", ")}</span>
                </span>
                <span className={`shrink-0 font-mono text-[15px] font-medium ${m.importo < 0 ? "text-segnale" : ""}`}>{conSegno(m.importo)}</span>
              </button>
              {aperto === m.id ? (
                <div className="flex flex-wrap gap-4 px-4 pb-4 text-[14px] font-semibold">
                  {m.documento_id ? <Link href={`/neonup/${az.id}/documenti/${m.documento_id}`} className="text-accento">Apri il documento</Link> : null}
                  {m.annullato_il ? <span className="font-normal text-testo-2">Annullato il {data(m.annullato_il)}</span>
                    : puoGestire(az.ruolo) ? <button type="button" onClick={() => annulla(m)} className="text-segnale">Annulla il movimento</button> : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : <p className="rounded-2xl bg-superficie px-4 py-5 text-[15px] text-testo-2">Nessun movimento in questo mese.</p>}
    </div>
  );
}

/* ———————————————————— Scadenzario ———————————————————— */

function Scadenzario({ dati, onRegistra }: { dati: Dati; onRegistra: ((b: Bozza) => void) | null }) {
  const az = useAzienda();
  const oggi = oggiSM();
  const gruppi = [
    { lato: "incasso" as const, titolo: "Da incassare", vuoto: "Niente da incassare.", azione: "Registra l'incasso" },
    { lato: "pagamento" as const, titolo: "Da pagare", vuoto: "Niente da pagare.", azione: "Registra il pagamento" },
  ];
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2">
      {gruppi.map((g) => {
        const voci = dati.scadenze.filter((s) => s.lato === g.lato);
        return (
          <section key={g.lato} className="flex flex-col gap-3" aria-labelledby={`t-${g.lato}`}>
            <h2 id={`t-${g.lato}`} className="flex items-baseline justify-between gap-3 text-[19px] font-semibold tracking-tight">
              {g.titolo} <span className="font-mono text-[15px] font-medium">{soldi(voci.reduce((t, s) => t + s.residuo, 0))}</span>
            </h2>
            {voci.length ? (
              <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie">
                {voci.map((s) => {
                  const scaduta = s.scadenza && s.scadenza < oggi;
                  return (
                    <li key={s.documento_id ?? s.acquisto_id} className="flex flex-col gap-2 px-4 py-3">
                      <div className="flex items-start gap-3">
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-[15px] font-semibold">{s.soggetto ?? "Senza nome"}</span>
                          <span className="truncate text-[13px] text-testo-2">{s.riferimento} del {data(s.data)}{s.pagato ? `, già ${g.lato === "incasso" ? "incassati" : "pagati"} ${soldi(s.pagato)}` : ""}</span>
                          <span className={`text-[13px] ${scaduta ? "font-medium text-segnale" : "text-testo-2"}`}>{s.scadenza ? `${scaduta ? "Scaduta il" : "Scade il"} ${data(s.scadenza)}` : "Senza scadenza"}</span>
                        </span>
                        <span className="shrink-0 font-mono text-[15px] font-medium">{soldi(s.residuo)}</span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-[14px] font-semibold">
                        {onRegistra ? (
                          <button type="button" className="text-accento" onClick={() => onRegistra({
                            verso: g.lato === "incasso" ? "entrata" : "uscita", importo: s.residuo, documento_id: s.documento_id, acquisto_id: s.acquisto_id, soggetto_id: s.soggetto_id,
                            descrizione: `${g.lato === "incasso" ? "Incasso" : "Pagamento"} ${s.riferimento.toLowerCase()}${s.soggetto ? `, ${s.soggetto}` : ""}`.slice(0, 200),
                            categoria: g.lato === "incasso" && s.documento_id ? "Vendite e incassi" : undefined,
                          })}>{g.azione}</button>
                        ) : null}
                        {s.documento_id ? <Link href={`/neonup/${az.id}/documenti/${s.documento_id}`} className="text-testo-2">Apri il documento</Link> : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : <p className="rounded-2xl bg-superficie px-4 py-5 text-[15px] text-testo-2">{g.vuoto}</p>}
          </section>
        );
      })}
    </div>
  );
}

/* ———————————————————— Acquisti ———————————————————— */

function Acquisti({ dati, onCambio, onModifica, onPaga }: { dati: Dati; onCambio: () => void; onModifica: (a: Acquisto) => void; onPaga: ((b: Bozza) => void) | null }) {
  const az = useAzienda();
  const scrive = puoGestire(az.ruolo);
  const [filtro, setFiltro] = useState<"tutti" | "da_pagare">("tutti");
  const [aperto, setAperto] = useState<string | null>(null);
  const [pagamenti, setPagamenti] = useState<MovimentoPN[]>([]);
  const [errore, setErrore] = useState<string | null>(null);
  const residui = new Map(dati.scadenze.filter((s) => s.acquisto_id).map((s) => [s.acquisto_id!, s]));
  const nome = (a: Acquisto) => dati.soggetti.find((s) => s.id === a.soggetto_id)?.denominazione ?? a.fornitore ?? "Senza nome";
  const visti = dati.acquisti.filter((a) => filtro === "tutti" || (residui.has(a.id) && !a.annullato_il));
  const oggi = oggiSM();

  useEffect(() => { if (aperto) movimentiCollegati("acquisto_id", aperto).then(setPagamenti); }, [aperto]);

  async function azione(f: () => Promise<{ errore: string | null }>, domanda?: string) {
    if (domanda && !confirm(domanda)) return;
    const r = await f();
    if (r.errore) return setErrore(r.errore);
    setErrore(null); onCambio();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2" role="group" aria-label="Filtra">
        <button type="button" aria-pressed={filtro === "tutti"} onClick={() => setFiltro("tutti")} className={CHIP(filtro === "tutti")}>Tutti</button>
        <button type="button" aria-pressed={filtro === "da_pagare"} onClick={() => setFiltro("da_pagare")} className={CHIP(filtro === "da_pagare")}>Da pagare</button>
      </div>
      {errore ? <p role="alert" className={ERRORE}>{errore}</p> : null}
      {visti.length ? (
        <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie">
          {visti.map((a) => {
            const s = residui.get(a.id);
            const stato = a.annullato_il ? "Annullato" : s ? (s.scadenza && s.scadenza < oggi ? `Scaduto il ${data(s.scadenza)}` : `Da ${a.tipo === "nota_credito" ? "incassare" : "pagare"}${s.scadenza ? ` entro il ${data(s.scadenza)}` : ""}`)
              : a.tipo === "nota_credito" && a.collegato_id ? "Riduce una fattura" : a.saldato_il ? `Pagato il ${data(a.saldato_il)}` : "Pagato";
            return (
              <li key={a.id} className={`flex flex-col ${a.annullato_il ? "opacity-50" : ""}`}>
                <button type="button" onClick={() => setAperto(aperto === a.id ? null : a.id)} aria-expanded={aperto === a.id}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-superficie-2">
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[15px] font-semibold">{nome(a)}</span>
                    <span className="truncate text-[13px] text-testo-2">{TIPI_ACQUISTO[a.tipo]}{a.numero ? ` ${a.numero}` : ""} del {data(a.data)}{a.categoria ? `, ${a.categoria}` : ""}</span>
                    <span className={`text-[13px] ${s?.scadenza && s.scadenza < oggi ? "font-medium text-segnale" : "text-testo-2"}`}>{stato}</span>
                  </span>
                  <span className="shrink-0 font-mono text-[15px] font-medium">{a.tipo === "nota_credito" ? "-" : ""}{soldi(a.totale)}</span>
                </button>
                {aperto === a.id ? (
                  <div className="flex flex-col gap-2 px-4 pb-4 text-[14px]">
                    {a.descrizione ? <p>{a.descrizione}</p> : null}
                    {pagamenti.filter((m) => !m.annullato_il).map((m) => <p key={m.id} className="text-testo-2">{m.importo < 0 ? "Pagato" : "Incassato"} {soldi(Math.abs(m.importo))} il {data(m.data)}</p>)}
                    {a.passiva_id ? <Link href={`/neonup/${az.id}/ricevute`} className="w-fit font-semibold text-accento">Arrivata dall&apos;HUB-SM</Link> : null}
                    {scrive && !a.annullato_il ? (
                      <div className="flex flex-wrap gap-4 font-semibold">
                        {s && onPaga ? (
                          <button type="button" className="text-accento" onClick={() => onPaga({
                            verso: s.lato === "incasso" ? "entrata" : "uscita", importo: s.residuo, acquisto_id: a.id, soggetto_id: a.soggetto_id, categoria: a.categoria ?? undefined,
                            descrizione: `${s.lato === "incasso" ? "Rimborso" : "Pagamento"} ${s.riferimento.toLowerCase()}, ${nome(a)}`.slice(0, 200),
                          })}>{s.lato === "incasso" ? "Registra il rimborso" : "Registra il pagamento"}</button>
                        ) : null}
                        {s && !pagamenti.length ? <button type="button" onClick={() => azione(() => saldoAcquisto(a.id, oggiSM()))} className="text-testo-2">Segna come pagato, senza movimento</button> : null}
                        {a.saldato_il ? <button type="button" onClick={() => azione(() => saldoAcquisto(a.id, null))} className="text-testo-2">Togli «pagato»</button> : null}
                        <button type="button" onClick={() => onModifica(a)} className="text-testo-2">Modifica</button>
                        <button type="button" onClick={() => azione(() => annullaAcquisto(a.id), "Annullare questo acquisto?")} className="text-segnale">Annulla</button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : <p className="rounded-2xl bg-superficie px-4 py-5 text-[15px] text-testo-2">{filtro === "tutti" ? "Nessun acquisto registrato. Le fatture dei fornitori arrivate dall'HUB-SM si registrano da «Fatture ricevute»." : "Niente da pagare."}</p>}
    </div>
  );
}

function ModuloAcquisto({ iniziale, dati, onFine }: { iniziale: Partial<Acquisto>; dati: Dati; onFine: (ok: boolean) => void }) {
  const az = useAzienda();
  const [a, setA] = useState<Partial<Acquisto>>({ tipo: "fattura", data: oggiSM(), ...iniziale });
  const [totale, setTotale] = useState(iniziale.totale != null ? iniziale.totale.toFixed(2).replace(".", ",") : "");
  const [errore, setErrore] = useState<string | null>(null);
  const [invio, setInvio] = useState(false);
  const fornitori = dati.soggetti.filter((s) => s.attivo && s.tipo !== "cliente");

  // Dalla fattura ricevuta: fornitore (per codice operatore), numero, data, totale, scadenza e descrizione dal file
  useEffect(() => {
    if (!iniziale.passiva_id || iniziale.id) return;
    leggiPassive(az.id).then((r) => {
      const p = r.passive.find((x) => x.id === iniziale.passiva_id);
      if (!p) return setErrore("Fattura ricevuta non trovata.");
      const f = dati.soggetti.find((s) => p.cedente_cod_oe && s.cod_oe === p.cedente_cod_oe);
      const descr = p.xml ? [...new DOMParser().parseFromString(p.xml, "application/xml").getElementsByTagNameNS("*", "Descrizione")].map((x) => x.textContent?.trim()).filter(Boolean).slice(0, 3).join(", ") : "";
      setA((x) => ({ ...x, tipo: p.td === "TD04" ? "nota_credito" : "fattura", soggetto_id: f?.id ?? null, fornitore: f ? null : p.cedente, numero: p.numero, data: p.data ?? x.data,
        scadenza: p.xml ? scadenzaFattura(p.xml) : null, descrizione: descr.slice(0, 300) || null }));
      if (p.totale != null) setTotale(Number(p.totale).toFixed(2).replace(".", ","));
    });
  }, [iniziale.passiva_id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function salva(e: React.FormEvent) {
    e.preventDefault();
    const t = numero(totale);
    if (Number.isNaN(t) || t < 0) return setErrore("Il totale è un numero, es. 1.250,00.");
    setInvio(true); setErrore(null);
    const r = await salvaAcquisto(az.id, a.id ?? null, { ...a, totale: t, fornitore: a.soggetto_id ? null : a.fornitore });
    setInvio(false);
    if (r.errore) return setErrore(r.errore);
    onFine(true);
  }
  const collegabili = dati.acquisti.filter((x) => !x.annullato_il && x.tipo !== "nota_credito" && x.id !== a.id && (!a.soggetto_id || x.soggetto_id === a.soggetto_id));

  return (
    <form onSubmit={salva} className="flex flex-col gap-4 rounded-2xl border border-linea p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-[19px] font-semibold tracking-tight">{a.id ? "Modifica l'acquisto" : a.passiva_id ? "Registra la fattura ricevuta" : "Nuovo acquisto"}</h2>
          <p className="text-[14px] text-testo-2">Fatture dei fornitori, note di credito e spese con la ricevuta: finiscono nello scadenzario finché non le paghi.</p>
        </div>
        <button type="button" onClick={() => onFine(false)} aria-label="Chiudi" className="text-testo-2"><Icona nome="chiudi" size={20} /></button>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Campo etichetta="Tipo">
          <select value={a.tipo} onChange={(e) => setA({ ...a, tipo: e.target.value as TipoAcquisto, collegato_id: null })} className={`${CAMPO} h-12`}>
            {(Object.keys(TIPI_ACQUISTO) as TipoAcquisto[]).map((t) => <option key={t} value={t}>{TIPI_ACQUISTO[t]}</option>)}
          </select>
        </Campo>
        <Campo etichetta="Fornitore">
          <select value={a.soggetto_id ?? ""} onChange={(e) => setA({ ...a, soggetto_id: e.target.value || null })} className={`${CAMPO} h-12`}>
            <option value="">Non in anagrafica</option>
            {fornitori.map((s) => <option key={s.id} value={s.id}>{s.denominazione}</option>)}
          </select>
        </Campo>
        {!a.soggetto_id ? <Campo etichetta="Nome del fornitore"><input maxLength={80} value={a.fornitore ?? ""} onChange={(e) => setA({ ...a, fornitore: e.target.value })} className={`${CAMPO} h-12`} /></Campo> : null}
        <Campo etichetta="Numero"><input maxLength={40} value={a.numero ?? ""} onChange={(e) => setA({ ...a, numero: e.target.value })} className={`${CAMPO} h-12 font-mono`} /></Campo>
        <Campo etichetta="Data"><input type="date" required max={oggiSM()} value={a.data ?? ""} onChange={(e) => setA({ ...a, data: e.target.value })} className={`${CAMPO} h-12`} /></Campo>
        <Campo etichetta="Totale (€)"><input required inputMode="decimal" value={totale} onChange={(e) => setTotale(e.target.value)} className={`${CAMPO} h-12 font-mono`} /></Campo>
        <Campo etichetta="Scadenza"><input type="date" value={a.scadenza ?? ""} min={a.data} onChange={(e) => setA({ ...a, scadenza: e.target.value || null })} className={`${CAMPO} h-12`} /></Campo>
        <Campo etichetta="Categoria"><input list="neon-categorie-a" maxLength={40} value={a.categoria ?? ""} onChange={(e) => setA({ ...a, categoria: e.target.value })} placeholder="Scegli o scrivi" className={`${CAMPO} h-12`} /></Campo>
        {a.tipo === "nota_credito" && collegabili.length ? (
          <Campo etichetta="Riduce la fattura">
            <select value={a.collegato_id ?? ""} onChange={(e) => setA({ ...a, collegato_id: e.target.value || null })} className={`${CAMPO} h-12`}>
              <option value="">Nessuna: rimborso a parte</option>
              {collegabili.map((x) => <option key={x.id} value={x.id}>{TIPI_ACQUISTO[x.tipo]} {x.numero ?? ""} del {data(x.data)}, {soldi(x.totale)}</option>)}
            </select>
          </Campo>
        ) : null}
      </div>
      <datalist id="neon-categorie-a">{CATEGORIE.map((c) => <option key={c} value={c} />)}</datalist>
      <Campo etichetta="Descrizione"><input maxLength={300} value={a.descrizione ?? ""} onChange={(e) => setA({ ...a, descrizione: e.target.value })} className={`${CAMPO} h-12`} /></Campo>
      {errore ? <p role="alert" className={ERRORE}>{errore}</p> : null}
      <div className="flex flex-wrap items-center gap-3">
        <PrimaryButton type="submit" disabled={invio}>Salva</PrimaryButton>
        <button type="button" onClick={() => onFine(false)} className="text-[14px] font-semibold text-testo-2">Annulla</button>
      </div>
    </form>
  );
}

/* ———————————————————— Banca: estratto conto e riconciliazione ———————————————————— */

function Banca({ dati, onCambio }: { dati: Dati; onCambio: () => void }) {
  const az = useAzienda();
  const scrive = puoGestire(az.ruolo);
  const banche = [...dati.conti].sort((a, b) => Number(b.tipo === "banca") - Number(a.tipo === "banca"));
  const [conto, setConto] = useState(banche[0]?.id ?? "");
  const [righe, setRighe] = useState<Estratto[] | null>(null);
  const [movimenti, setMovimenti] = useState<MovimentoPN[]>([]);
  const [mostra, setMostra] = useState<"da_fare" | "fatte" | "ignorate">("da_fare");
  const [nuovo, setNuovo] = useState<{ id: string; categoria: string; descrizione: string } | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [importa, setImporta] = useState(false);

  const carica = useCallback(async () => {
    if (!conto) return;
    const e = await leggiEstratti(conto);
    setRighe(e);
    const date = e.map((x) => x.data).sort();
    const dal = date[0] ? fraGiorni(date[0], -20) : `${meseDi(oggiSM())}-01`;
    const pn = await primaNota(az.id, dal, oggiSM());
    setMovimenti(pn.movimenti.filter((m) => m.conto_id === conto && !m.annullato_il));
  }, [az.id, conto]);
  useEffect(() => { carica(); }, [carica]);

  const abbinati = new Set((righe ?? []).map((r) => r.movimento_id).filter(Boolean));
  const daFare = (righe ?? []).filter((r) => !r.movimento_id && !r.ignorato);
  const visti = mostra === "da_fare" ? daFare : (righe ?? []).filter((r) => (mostra === "fatte" ? !!r.movimento_id : r.ignorato));
  const candidati = (r: Estratto) => movimenti.filter((m) => !abbinati.has(m.id) && Math.abs(m.importo - r.importo) < 0.005
    && Math.abs((Date.parse(m.data) - Date.parse(r.data)) / 864e5) <= 15).slice(0, 3);
  const movimento = (id: string | null) => movimenti.find((m) => m.id === id);

  async function fai(f: () => Promise<{ errore: string | null }>) {
    const r = await f();
    if (r.errore) return setErrore(r.errore);
    setErrore(null); setNuovo(null); carica(); onCambio();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {dati.conti.length > 1 ? (
          <select value={conto} onChange={(e) => setConto(e.target.value)} aria-label="Conto" className={`${STRETTO} h-11`}>
            {banche.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        ) : null}
        {scrive ? <button type="button" onClick={() => setImporta(!importa)} className={BOTTONE}>Carica l&apos;estratto conto</button> : null}
      </div>
      {importa ? <ImportaEstratto conto={conto} onFine={(ok) => { setImporta(false); if (ok) carica(); }} /> : null}
      <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Righe">
        <button type="button" aria-pressed={mostra === "da_fare"} onClick={() => setMostra("da_fare")} className={CHIP(mostra === "da_fare")}>Da riconciliare ({daFare.length})</button>
        <button type="button" aria-pressed={mostra === "fatte"} onClick={() => setMostra("fatte")} className={CHIP(mostra === "fatte")}>Riconciliate</button>
        <button type="button" aria-pressed={mostra === "ignorate"} onClick={() => setMostra("ignorate")} className={CHIP(mostra === "ignorate")}>Ignorate</button>
      </div>
      {errore ? <p role="alert" className={ERRORE}>{errore}</p> : null}
      {!righe ? <div className="h-40 animate-pulse rounded-2xl bg-superficie" /> : visti.length ? (
        <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie">
          {visti.map((r) => {
            const m = movimento(r.movimento_id);
            return (
              <li key={r.id} className="flex flex-col gap-2 px-4 py-3">
                <div className="flex items-start gap-3">
                  <span className="w-14 shrink-0 font-mono text-[13px] text-testo-2">{data(r.data).replace(/ \d{4}$/, "")}</span>
                  <span className="min-w-0 flex-1 text-[14px]">{r.descrizione ?? "Senza descrizione"}</span>
                  <span className={`shrink-0 font-mono text-[15px] font-medium ${r.importo < 0 ? "text-segnale" : ""}`}>{conSegno(r.importo)}</span>
                </div>
                {mostra === "fatte" ? (
                  <p className="flex flex-wrap gap-x-4 pl-[4.25rem] text-[13px] text-testo-2">
                    <span>Abbinata a: {m ? `${m.descrizione}, ${data(m.data)}` : "un movimento"}</span>
                    {scrive ? <button type="button" onClick={() => fai(() => abbina(r.id, null))} className="font-semibold text-testo-2 underline underline-offset-2">Togli l&apos;abbinamento</button> : null}
                  </p>
                ) : mostra === "ignorate" ? (
                  scrive ? <button type="button" onClick={() => fai(() => ignoraEstratto(r.id, false))} className="w-fit pl-[4.25rem] text-[13px] font-semibold text-accento">Rimetti da riconciliare</button> : null
                ) : scrive ? (
                  <div className="flex flex-col gap-2 pl-[4.25rem]">
                    {candidati(r).map((c) => (
                      <button key={c.id} type="button" onClick={() => fai(() => abbina(r.id, c.id))} className="flex w-fit items-center gap-1.5 rounded-xl bg-fondo px-3 py-2 text-left text-[13px] font-medium">
                        <Icona nome="avanti" size={14} /> Abbina a «{c.descrizione}» del {data(c.data)}
                      </button>
                    ))}
                    {nuovo?.id === r.id ? (
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <input value={nuovo.descrizione} maxLength={200} onChange={(e) => setNuovo({ ...nuovo, descrizione: e.target.value })} aria-label="Descrizione" className={`${CAMPO} h-10 bg-fondo`} />
                        <input list="neon-categorie-b" value={nuovo.categoria} maxLength={40} onChange={(e) => setNuovo({ ...nuovo, categoria: e.target.value })} placeholder="Categoria" aria-label="Categoria" className={`${CAMPO} h-10 bg-fondo sm:w-56`} />
                        <button type="button" onClick={() => fai(() => movimentoDaEstratto(r.id, { descrizione: nuovo.descrizione, categoria: nuovo.categoria || null }))}
                          className="h-10 shrink-0 rounded-xl bg-[#09090B] px-3 text-[13px] font-semibold text-white">Registra</button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-4 text-[13px] font-semibold">
                        <button type="button" onClick={() => setNuovo({ id: r.id, categoria: r.importo < 0 && /commission|spese|canone/i.test(r.descrizione ?? "") ? "Banca e commissioni" : "", descrizione: (r.descrizione ?? "").slice(0, 200) })} className="text-accento">Crea il movimento</button>
                        <button type="button" onClick={() => fai(() => ignoraEstratto(r.id, true))} className="text-testo-2">Ignora</button>
                      </div>
                    )}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : <p className="rounded-2xl bg-superficie px-4 py-5 text-[15px] text-testo-2">{mostra === "da_fare" ? (righe.length ? "Tutto riconciliato." : "Carica l'estratto conto della banca (file CSV) per confrontarlo con la prima nota.") : "Nessuna riga."}</p>}
      <datalist id="neon-categorie-b">{CATEGORIE.map((c) => <option key={c} value={c} />)}</datalist>
      <p className="text-[13px] leading-relaxed text-testo-2">L&apos;estratto conto si scarica dall&apos;home banking come file CSV. NeonUp lo legge sul tuo telefono o computer e salva solo data, importo e descrizione delle righe. Caricare due volte lo stesso file non crea doppioni.</p>
    </div>
  );
}

function ImportaEstratto({ conto, onFine }: { conto: string; onFine: (ok: boolean) => void }) {
  const [tabella, setTabella] = useState<string[][] | null>(null);
  const [intest, setIntest] = useState(true);
  const [col, setCol] = useState({ data: 0, descrizione: 1, importo: 2, uscite: -1 });
  const [errore, setErrore] = useState<string | null>(null);
  const [esito, setEsito] = useState<string | null>(null);

  async function leggi(f: File | undefined) {
    if (!f) return;
    if (f.size > 3_000_000) return setErrore("Il file è troppo grande (al massimo 3 MB).");
    const t = leggiCsv(await f.text());
    if (t.length < 2) return setErrore("Il file non sembra un CSV con delle righe.");
    setTabella(t); setErrore(null); setEsito(null);
    const h = t[0].map((x) => x.toLowerCase());
    const trova = (re: RegExp) => h.findIndex((x) => re.test(x));
    const d = trova(/data( contabile| operazione)?$|^data/), ds = trova(/descri|causale|operazione/), im = trova(/importo|ammontare/);
    const en = trova(/entrat|avere|accredit/), us = trova(/uscit|dare|addebit/);
    setCol({ data: Math.max(d, 0), descrizione: Math.max(ds, 1), importo: im >= 0 ? im : en >= 0 ? en : 2, uscite: im >= 0 ? -1 : us });
  }

  const righe = useMemo(() => (tabella ?? []).slice(intest ? 1 : 0).map((r) => {
    const d = leggiData(r[col.data] ?? "");
    const a = leggiNumero(r[col.importo] ?? "");
    const u = col.uscite >= 0 ? leggiNumero(r[col.uscite] ?? "") : NaN;
    const imp = col.uscite >= 0 ? (Number.isNaN(a) ? 0 : Math.abs(a)) - (Number.isNaN(u) ? 0 : Math.abs(u)) : a;
    return { data: d, importo: imp, descrizione: (r[col.descrizione] ?? "").slice(0, 300) };
  }), [tabella, intest, col]);
  const buone = righe.filter((r) => r.data && !Number.isNaN(r.importo) && r.importo !== 0) as { data: string; importo: number; descrizione: string }[];

  async function carica() {
    const r = await importaEstratto(conto, buone);
    if (r.errore) return setErrore(r.errore);
    setEsito(`${r.esito?.nuove ?? 0} righe nuove su ${r.esito?.righe ?? 0}.`);
    setTimeout(() => onFine(true), 1200);
  }

  const colonne = tabella?.[0].map((x, i) => ({ i, nome: intest ? x || `Colonna ${i + 1}` : `Colonna ${i + 1}` })) ?? [];
  const sceltaCol = (k: keyof typeof col, etichetta: string, facoltativa = false) => (
    <Campo etichetta={etichetta}>
      <select value={col[k]} onChange={(e) => setCol({ ...col, [k]: Number(e.target.value) })} className={`${CAMPO} h-11`}>
        {facoltativa ? <option value={-1}>Nessuna</option> : null}
        {colonne.map((c) => <option key={c.i} value={c.i}>{c.nome}</option>)}
      </select>
    </Campo>
  );

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-linea p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-[17px] font-semibold">Carica l&apos;estratto conto</h2>
        <button type="button" onClick={() => onFine(false)} aria-label="Chiudi" className="text-testo-2"><Icona nome="chiudi" size={20} /></button>
      </div>
      <input type="file" accept=".csv,text/csv,text/plain" onChange={(e) => leggi(e.target.files?.[0])} className="text-[14px]" aria-label="File CSV dell'estratto conto" />
      {tabella ? (
        <>
          <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" checked={intest} onChange={(e) => setIntest(e.target.checked)} className="size-4 accent-[#09090B]" /> La prima riga ha i nomi delle colonne</label>
          <div className="grid gap-3 sm:grid-cols-4">
            {sceltaCol("data", "Data")}
            {sceltaCol("descrizione", "Descrizione")}
            {sceltaCol("importo", col.uscite >= 0 ? "Entrate" : "Importo")}
            {sceltaCol("uscite", "Uscite (se separate)", true)}
          </div>
          <ul className="flex flex-col gap-1 rounded-xl bg-superficie p-3 text-[13px]">
            {righe.slice(0, 4).map((r, i) => (
              <li key={i} className="flex gap-3"><span className="w-24 shrink-0 font-mono">{r.data ?? "data?"}</span><span className="min-w-0 flex-1 truncate">{r.descrizione}</span>
                <span className={`shrink-0 font-mono ${Number.isNaN(r.importo) ? "text-segnale" : ""}`}>{Number.isNaN(r.importo) ? "importo?" : conSegno(r.importo)}</span></li>
            ))}
          </ul>
          <p className="text-[14px]">{buone.length} righe pronte{righe.length - buone.length ? `, ${righe.length - buone.length} senza data o importo (si saltano)` : ""}.</p>
          <PrimaryButton onClick={carica} disabled={!buone.length} className="w-fit">Importa</PrimaryButton>
        </>
      ) : null}
      {errore ? <p role="alert" className={ERRORE}>{errore}</p> : null}
      {esito ? <p className="rounded-xl bg-superficie px-4 py-3 text-[14px]">{esito}</p> : null}
    </div>
  );
}

/* ———————————————————— Conti ———————————————————— */

function Conti({ dati, onCambio }: { dati: Dati; onCambio: () => void }) {
  const az = useAzienda();
  const [modulo, setModulo] = useState<Partial<Conto> | null>(null);
  return (
    <div className="flex flex-col gap-4">
      {modulo ? <ModuloConto key={modulo.id ?? "nuovo"} conto={modulo} onFine={(ok) => { setModulo(null); if (ok) onCambio(); }} /> : null}
      <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie">
        {dati.conti.map((c) => (
          <li key={c.id}>
            <button type="button" disabled={!puoGestire(az.ruolo)} onClick={() => setModulo(c)} className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-superficie-2 ${c.attivo ? "" : "opacity-50"}`}>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[15px] font-semibold">{c.nome}</span>
                <span className="truncate text-[13px] text-testo-2">{TIPI_CONTO[c.tipo]}{c.iban ? `, ${c.iban}` : ""}{c.attivo ? "" : ", non attivo"}</span>
                <span className="text-[13px] text-testo-2">Saldo iniziale {soldi(c.saldo_iniziale)} al {data(c.saldo_dal)}</span>
              </span>
              <span className={`shrink-0 font-mono text-[15px] font-medium ${(dati.saldi.get(c.id) ?? 0) < 0 ? "text-segnale" : ""}`}>{soldi(dati.saldi.get(c.id) ?? c.saldo_iniziale)}</span>
            </button>
          </li>
        ))}
      </ul>
      {puoGestire(az.ruolo) && !modulo ? (
        <button type="button" onClick={() => setModulo({ tipo: "banca", saldo_iniziale: 0, saldo_dal: oggiSM(), attivo: true })} className="flex w-fit items-center gap-1.5 text-[14px] font-semibold text-accento">
          <Icona nome="piu" size={16} /> Aggiungi un conto
        </button>
      ) : null}
    </div>
  );
}

/* ———————————————————— File per il commercialista ———————————————————— */

function Esporta({ dati }: { dati: Dati }) {
  const az = useAzienda();
  const oggi = oggiSM();
  const [dal, setDal] = useState(`${oggi.slice(0, 7)}-01`);
  const [al, setAl] = useState(oggi);
  const [errore, setErrore] = useState<string | null>(null);
  const nomeConto = (id: string) => dati.conti.find((c) => c.id === id)?.nome ?? "";
  const nomeSog = (id: string | null) => dati.soggetti.find((s) => s.id === id)?.denominazione ?? "";
  const periodo = `${dal}_${al}`;

  async function primaNotaCsv() {
    const r = await primaNota(az.id, dal, al);
    if (r.errore) return setErrore(r.errore);
    const righe = r.movimenti.filter((m) => !m.annullato_il).sort((a, b) => a.data.localeCompare(b.data))
      .map((m) => [m.data, nomeConto(m.conto_id), m.descrizione, m.categoria, nomeSog(m.soggetto_id), m.importo > 0 ? m.importo : null, m.importo < 0 ? -m.importo : null, m.giroconto ? "sì" : ""]);
    scaricaTesto(`prima-nota_${periodo}.csv`, scriviCsv(["Data", "Conto", "Descrizione", "Categoria", "Cliente o fornitore", "Entrata", "Uscita", "Giroconto"], righe), "text/csv");
  }

  function acquistiCsv() {
    const righe = dati.acquisti.filter((a) => !a.annullato_il && a.data >= dal && a.data <= al).sort((a, b) => a.data.localeCompare(b.data))
      .map((a) => [a.data, TIPI_ACQUISTO[a.tipo], a.numero, nomeSog(a.soggetto_id) || a.fornitore, dati.soggetti.find((s) => s.id === a.soggetto_id)?.cod_oe, a.categoria, a.descrizione,
        a.tipo === "nota_credito" ? -a.totale : a.totale, a.scadenza, a.passiva_id ? "HUB-SM" : ""]);
    scaricaTesto(`acquisti_${periodo}.csv`, scriviCsv(["Data", "Tipo", "Numero", "Fornitore", "COE", "Categoria", "Descrizione", "Totale", "Scadenza", "Arrivata da"], righe), "text/csv");
  }

  async function venditeCsv() {
    const r = await leggiDocumenti(az.id);
    if (r.errore) return setErrore(r.errore);
    const righe = r.documenti.filter((d) => d.stato === "emesso" && TIPI[d.tipo].fiscale && d.data && d.data >= dal && d.data <= al).sort((a, b) => (a.data ?? "").localeCompare(b.data ?? ""))
      .map((d) => [d.data, titoloDocumento(d), d.cessionario?.denominazione, d.cessionario?.cod_oe, d.tipo === "nota_credito" ? -Number(d.totale) : Number(d.totale),
        d.elettronica ? "elettronica" : "carta", d.fe_file, d.pagamento?.scadenza, d.incassato_il]);
    scaricaTesto(`vendite_${periodo}.csv`, scriviCsv(["Data", "Documento", "Cliente", "COE", "Totale", "Fattura", "File FE", "Scadenza", "Incassata il"], righe), "text/csv");
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="max-w-[65ch] text-[15px] leading-relaxed">I file da mandare al commercialista: prima nota, acquisti e vendite del periodo, in CSV (si aprono con Excel o Numbers). NeonUp non tiene i registri obbligatori e non calcola imposte.</p>
      <div className="grid max-w-md grid-cols-2 gap-3">
        <Campo etichetta="Dal"><input type="date" value={dal} max={al} onChange={(e) => setDal(e.target.value)} className={`${CAMPO} h-12`} /></Campo>
        <Campo etichetta="Al"><input type="date" value={al} min={dal} max={oggi} onChange={(e) => setAl(e.target.value)} className={`${CAMPO} h-12`} /></Campo>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={primaNotaCsv} className={BOTTONE}>Prima nota</button>
        <button type="button" onClick={acquistiCsv} className={BOTTONE}>Acquisti</button>
        <button type="button" onClick={venditeCsv} className={BOTTONE}>Vendite</button>
      </div>
      <p className="text-[13px] leading-relaxed text-testo-2">Il commercialista può anche entrare in NeonUp con il suo SMR ID: il titolare lo aggiunge in «Azienda» con il ruolo «Solo lettura» e lui vede documenti, magazzino e contabilità senza poter cambiare niente.</p>
      {errore ? <p role="alert" className={ERRORE}>{errore}</p> : null}
    </div>
  );
}
