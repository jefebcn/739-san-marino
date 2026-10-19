"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { aPagine } from "@/lib/a-pagine";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { FRAZIONI } from "@/lib/servizi";

// Redazione (migrazione 0047): orari di funivia e bus e calendario della raccolta dei rifiuti.
// Le scritture passano dalle funzioni del database (aggiungi_partenze, chiudi_partenze, salva_linea, salva_raccolta, togli_raccolta).

const CAMPO = "w-full rounded-xl border border-linea bg-superficie px-4 text-[15px] text-testo outline-none transition-colors placeholder:text-testo-2/60 focus:border-accento";
const ERRORE = "rounded-xl bg-segnale/12 px-4 py-3 text-sm text-segnale";
const GIORNI = ["lun", "mar", "mer", "gio", "ven", "sab", "dom"];
const data = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const leggi = (s: string | null) => (s ? data.format(new Date(`${s}T12:00:00Z`)).replace(".", "") : "sempre");
const oggi = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/San_Marino" }).format(new Date());
const prima = (s: string) => new Date(Date.parse(`${s}T12:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
const db = () => supabaseBrowser();
const rigenera = (percorsi: string[]) =>
  Promise.all(percorsi.map((percorso) => fetch("/api/rivalida", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ percorso }) }).catch(() => {})));
const messaggio = (e: { code?: string; message: string } | null) => (!e ? null : e.code === "P0001" ? e.message : e.code === "PGRST202" ? "Le funzioni della migrazione 0047 non ci sono ancora." : "Non è stato salvato. Riprova.");

/** I giorni come «lun-ven», «sab, dom», «tutti i giorni» */
function giorniLeggibili(g: number[]) {
  const s = [...g].sort((a, b) => a - b);
  if (s.length === 7) return "tutti i giorni";
  const continui = s.every((x, i) => i === 0 || x === s[i - 1] + 1);
  if (continui && s.length > 2) return `${GIORNI[s[0] - 1]}-${GIORNI[s[s.length - 1] - 1]}`;
  return s.map((x) => GIORNI[x - 1]).join(", ");
}

function SceltaGiorni({ valore, onCambia }: { valore: number[]; onCambia: (g: number[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {GIORNI.map((n, i) => {
        const g = i + 1;
        const si = valore.includes(g);
        return (
          <button key={g} type="button" aria-pressed={si} onClick={() => onCambia(si ? valore.filter((x) => x !== g) : [...valore, g].sort())}
            className={`h-10 w-12 rounded-xl text-[14px] font-medium capitalize transition-colors ${si ? "bg-metallo text-su-accento" : "bg-superficie hover:bg-superficie-2"}`}>
            {n}
          </button>
        );
      })}
      <button type="button" onClick={() => onCambia([1, 2, 3, 4, 5])} className="h-10 rounded-xl px-3 text-[13px] font-medium text-accento">Feriali</button>
      <button type="button" onClick={() => onCambia([1, 2, 3, 4, 5, 6, 7])} className="h-10 rounded-xl px-3 text-[13px] font-medium text-accento">Tutti</button>
    </div>
  );
}

export default function GestioneServizi({ castelli }: { castelli: { id: number; nome: string }[] }) {
  const [vista, setVista] = useState<"orari" | "raccolta">("orari");
  return (
    <div className="flex flex-col gap-6">
      <div role="tablist" aria-label="Servizi" className="grid grid-cols-2 gap-1 rounded-xl bg-superficie p-1">
        {(["orari", "raccolta"] as const).map((v) => (
          <button key={v} role="tab" type="button" aria-selected={vista === v} onClick={() => setVista(v)}
            className={`h-10 rounded-lg text-[15px] font-semibold transition-colors ${vista === v ? "bg-fondo text-testo shadow-sm" : "text-testo-2 hover:text-testo"}`}>
            {v === "orari" ? "Orari di funivia e bus" : "Raccolta rifiuti"}
          </button>
        ))}
      </div>
      {vista === "orari" ? <Orari /> : <Raccolta castelli={castelli} />}
    </div>
  );
}

// ——— Orari ———

type Linea = { id: string; nome: string; tipo: string; fonte: string | null; biglietto: string | null; da_verificare: boolean };
type Corsa = { id: string; direzione: string; ora: string; giorni: number[]; dal: string | null; al: string | null };
type Gruppo = { chiave: string; direzione: string; giorni: number[]; dal: string | null; al: string | null; ore: string[] };

function Orari() {
  const [linee, setLinee] = useState<Linea[] | null>(null);
  const [scelta, setScelta] = useState<string | null>(null);
  const [corse, setCorse] = useState<Corsa[] | null>(null);
  const [finiti, setFiniti] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    db().from("linee").select("id, nome, tipo, fonte, biglietto, da_verificare").order("ordine").then(({ data }) => {
      setLinee((data ?? []) as Linea[]);
      if (data?.length) setScelta((s) => s ?? data[0].id);
    });
  }, []);

  const carica = useCallback(async () => {
    if (!scelta) return;
    setCorse(null);
    const r = await aPagine<Corsa>((da, a) => db().from("partenze").select("id, direzione, ora, giorni, dal, al").eq("linea_id", scelta).order("direzione").order("ora").order("id").range(da, a));
    setCorse(r.data ?? []);
    if (r.error) setErrore("Gli orari non si sono caricati.");
  }, [scelta]);
  useEffect(() => {
    carica();
  }, [carica]);

  const gruppi = useMemo(() => {
    const m = new Map<string, Gruppo>();
    for (const c of corse ?? []) {
      if (c.dal && c.al && c.al < c.dal) continue; // tolte
      const k = `${c.direzione}|${c.giorni.join(",")}|${c.dal}|${c.al}`;
      const g = m.get(k) ?? { chiave: k, direzione: c.direzione, giorni: c.giorni, dal: c.dal, al: c.al, ore: [] };
      g.ore.push(c.ora.slice(0, 5));
      m.set(k, g);
    }
    return [...m.values()].sort((a, b) => a.direzione.localeCompare(b.direzione) || (a.dal ?? "").localeCompare(b.dal ?? "") || a.giorni[0] - b.giorni[0]);
  }, [corse]);
  const adesso = oggi();
  const visibili = gruppi.filter((g) => finiti || !g.al || g.al >= adesso);
  const direzioni = [...new Set(gruppi.map((g) => g.direzione))];
  const linea = linee?.find((l) => l.id === scelta);
  const fino = gruppi.reduce<string | null>((m, g) => (g.al && (!m || g.al > m) ? g.al : m), null);

  if (!linee) return <div className="h-40 animate-pulse rounded-2xl bg-superficie" />;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        {linee.map((l) => (
          <button key={l.id} type="button" aria-pressed={l.id === scelta} onClick={() => setScelta(l.id)}
            className={`h-11 rounded-xl px-4 text-[14px] font-semibold transition-colors ${l.id === scelta ? "bg-metallo text-su-accento" : "bg-superficie hover:bg-superficie-2"}`}>
            {l.nome}
          </button>
        ))}
      </div>

      {linea ? <DatiLinea linea={linea} fino={fino} onSalvata={(l) => setLinee((x) => x?.map((y) => (y.id === l.id ? l : y)) ?? null)} /> : null}
      {errore ? <p role="alert" className={ERRORE}>{errore}</p> : null}

      <section className="flex flex-col gap-3" aria-labelledby="t-corse">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="t-corse" className="text-[19px] font-semibold tracking-tight">Le corse</h2>
          <label className="flex items-center gap-2 text-[13px] text-testo-2"><input type="checkbox" checked={finiti} onChange={(e) => setFiniti(e.target.checked)} className="size-4" /> Anche quelle finite</label>
        </div>
        {corse === null ? <div className="h-32 animate-pulse rounded-2xl bg-superficie" /> : visibili.length ? (
          <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie">
            {visibili.map((g) => <RigaGruppo key={g.chiave} g={g} linea={scelta!} onCambia={carica} />)}
          </ul>
        ) : <p className="rounded-2xl bg-superficie px-4 py-5 text-[15px] text-testo-2">Nessuna corsa in vigore. Aggiungile qui sotto.</p>}
      </section>

      {scelta ? <NuoveCorse linea={scelta} direzioni={direzioni} onFatto={carica} /> : null}
    </div>
  );
}

function DatiLinea({ linea, fino, onSalvata }: { linea: Linea; fino: string | null; onSalvata: (l: Linea) => void }) {
  const [fonte, setFonte] = useState(linea.fonte ?? "");
  const [biglietto, setBiglietto] = useState(linea.biglietto ?? "");
  const [verificata, setVerificata] = useState(!linea.da_verificare);
  const [esito, setEsito] = useState<string | null>(null);
  useEffect(() => {
    setFonte(linea.fonte ?? "");
    setBiglietto(linea.biglietto ?? "");
    setVerificata(!linea.da_verificare);
    setEsito(null);
  }, [linea]);

  async function salva(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await db().rpc("salva_linea", { p_linea: linea.id, p_fonte: fonte, p_biglietto: biglietto, p_verificata: verificata });
    if (error) return setEsito(messaggio(error));
    await rigenera(["/utili/trasporti", "/en/transport"]);
    onSalvata({ ...linea, fonte: fonte.trim() || null, biglietto: biglietto.trim() || null, da_verificare: !verificata });
    setEsito("Salvato.");
  }

  const vicina = fino && Date.parse(`${fino}T12:00:00Z`) - Date.now() < 60 * 86_400_000;
  return (
    <form onSubmit={salva} className="flex flex-col gap-3 rounded-2xl border border-linea p-4">
      <p className={`text-[14px] ${vicina ? "font-semibold text-segnale" : "text-testo-2"}`}>
        {fino ? <>Corse inserite fino al <span className="font-mono">{leggi(fino)}</span>{vicina ? ": aggiungi le nuove quando escono gli orari." : "."}</> : "Nessuna corsa con una data di fine."}
      </p>
      <label className="flex flex-col gap-1.5 text-[13px] font-medium text-testo-2">Fonte degli orari
        <input value={fonte} onChange={(e) => setFonte(e.target.value)} maxLength={300} placeholder="Nome e link della pagina ufficiale" className={`h-12 ${CAMPO}`} />
      </label>
      <label className="flex flex-col gap-1.5 text-[13px] font-medium text-testo-2">Biglietto
        <input value={biglietto} onChange={(e) => setBiglietto(e.target.value)} maxLength={300} className={`h-12 ${CAMPO}`} />
      </label>
      <label className="flex items-center gap-2.5 text-[15px]">
        <input type="checkbox" checked={verificata} onChange={(e) => setVerificata(e.target.checked)} className="size-5 accent-[var(--accento)]" />
        Orari controllati alla fonte (toglie «Da verificare»)
      </label>
      {esito ? <p role="status" className="text-sm text-testo-2">{esito}</p> : null}
      <PrimaryButton type="submit" variante="secondario" className="w-fit">Salva la linea</PrimaryButton>
    </form>
  );
}

function RigaGruppo({ g, linea, onCambia }: { g: Gruppo; linea: string; onCambia: () => void }) {
  const [aperto, setAperto] = useState(false);
  const [fino, setFino] = useState(g.al ?? "");
  const [errore, setErrore] = useState<string | null>(null);
  const finito = g.al && g.al < oggi();

  async function chiudi(data: string) {
    setErrore(null);
    const { error } = await db().rpc("chiudi_partenze", { p_linea: linea, p_direzione: g.direzione, p_giorni: g.giorni, p_dal: g.dal, p_al: g.al, p_fino: data });
    if (error) return setErrore(messaggio(error));
    await rigenera(["/utili/trasporti", "/en/transport"]);
    onCambia();
  }

  return (
    <li className={`flex flex-col gap-2 p-4 ${finito ? "opacity-60" : ""}`}>
      <button type="button" onClick={() => setAperto((x) => !x)} className="flex items-start justify-between gap-3 text-left">
        <span className="flex flex-col">
          <span className="text-[15px] font-semibold">{g.direzione}, {giorniLeggibili(g.giorni)}</span>
          <span className="text-[13px] text-testo-2">Dal <span className="font-mono">{leggi(g.dal)}</span> al <span className="font-mono">{leggi(g.al)}</span>, {g.ore.length} {g.ore.length === 1 ? "corsa" : "corse"}: <span className="font-mono">{g.ore[0]}…{g.ore[g.ore.length - 1]}</span></span>
        </span>
        <span className="text-sm font-medium text-accento">{aperto ? "Chiudi" : "Apri"}</span>
      </button>
      {aperto ? (
        <div className="flex flex-col gap-3">
          <p className="font-mono text-[13px] leading-relaxed">{g.ore.join("  ")}</p>
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1 text-[13px] font-medium text-testo-2">Finiscono il
              <input type="date" value={fino} min={g.dal ?? undefined} onChange={(e) => setFino(e.target.value)} className={`h-11 ${CAMPO}`} />
            </label>
            <PrimaryButton type="button" variante="interno" dimensione="sm" disabled={!fino} onClick={() => chiudi(fino)}>Cambia la fine</PrimaryButton>
            <button type="button" onClick={() => confirm(`Togliere le ${g.ore.length} corse ${g.direzione} (${giorniLeggibili(g.giorni)})?`) && chiudi(g.dal ? prima(g.dal) : "2000-01-01")}
              className="h-10 rounded-xl px-3 text-sm font-semibold text-segnale hover:bg-segnale/12">Togli queste corse</button>
          </div>
          {errore ? <p role="alert" className={ERRORE}>{errore}</p> : null}
        </div>
      ) : null}
    </li>
  );
}

function NuoveCorse({ linea, direzioni, onFatto }: { linea: string; direzioni: string[]; onFatto: () => void }) {
  const [direzione, setDirezione] = useState(direzioni[0] ?? "");
  const [giorni, setGiorni] = useState<number[]>([1, 2, 3, 4, 5, 6, 7]);
  const [dal, setDal] = useState("");
  const [al, setAl] = useState("");
  const [testo, setTesto] = useState("");
  const [invio, setInvio] = useState(false);
  const [esito, setEsito] = useState<{ ok: boolean; testo: string } | null>(null);
  useEffect(() => setDirezione((d) => d || direzioni[0] || ""), [direzioni]);
  const ore = testo.split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean);

  async function aggiungi(e: React.FormEvent) {
    e.preventDefault();
    setInvio(true);
    setEsito(null);
    const { data, error } = await db().rpc("aggiungi_partenze", { p_linea: linea, p_direzione: direzione, p_ore: ore, p_giorni: giorni, p_dal: dal, p_al: al });
    setInvio(false);
    if (error) return setEsito({ ok: false, testo: messaggio(error) ?? "" });
    await rigenera(["/utili/trasporti", "/en/transport"]);
    setEsito({ ok: true, testo: `Aggiunte ${data} corse${(data as number) < ore.length ? ` (${ore.length - (data as number)} c'erano già)` : ""}.` });
    setTesto("");
    onFatto();
  }

  return (
    <form onSubmit={aggiungi} className="flex flex-col gap-3 rounded-2xl border border-linea p-4" aria-labelledby="t-nuove">
      <h2 id="t-nuove" className="text-[17px] font-semibold tracking-tight">Aggiungi corse</h2>
      <p className="-mt-1 text-[13px] text-testo-2">Copia gli orari dalla tabella ufficiale: stessa direzione, stessi giorni, stesso periodo. Per i festivi o l&apos;orario estivo fai un gruppo a parte.</p>
      <label className="flex flex-col gap-1.5 text-[13px] font-medium text-testo-2">Direzione
        <input list="direzioni" required value={direzione} onChange={(e) => setDirezione(e.target.value)} maxLength={80} className={`h-12 ${CAMPO}`} />
        <datalist id="direzioni">{direzioni.map((d) => <option key={d} value={d} />)}</datalist>
      </label>
      <div className="flex flex-col gap-1.5"><span className="text-[13px] font-medium text-testo-2">Giorni</span><SceltaGiorni valore={giorni} onCambia={setGiorni} /></div>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1.5 text-[13px] font-medium text-testo-2">Dal<input type="date" required value={dal} onChange={(e) => setDal(e.target.value)} className={`h-12 ${CAMPO}`} /></label>
        <label className="flex flex-col gap-1.5 text-[13px] font-medium text-testo-2">Al<input type="date" required value={al} min={dal || undefined} onChange={(e) => setAl(e.target.value)} className={`h-12 ${CAMPO}`} /></label>
      </div>
      <label className="flex flex-col gap-1.5 text-[13px] font-medium text-testo-2">Orari di partenza
        <textarea required value={testo} onChange={(e) => setTesto(e.target.value)} rows={4} placeholder="07:45 08:00 08:15 …" className={`py-3 font-mono ${CAMPO}`} />
        <span className="text-xs">{ore.length ? `${ore.length} orari` : "Separati da spazi, virgole o a capo."}</span>
      </label>
      {esito ? <p role={esito.ok ? "status" : "alert"} className={esito.ok ? "text-sm text-testo-2" : ERRORE}>{esito.testo}</p> : null}
      <PrimaryButton type="submit" disabled={invio || !ore.length || !giorni.length} className="w-fit">{invio ? "Aggiungo…" : "Aggiungi le corse"}</PrimaryButton>
    </form>
  );
}

// ——— Raccolta rifiuti ———

type RigaRaccolta = { id: string; castello_id: number; zona: string; frazione: string; giorni: number[]; orario: string | null; note: string | null; da_verificare: boolean };

function Raccolta({ castelli }: { castelli: { id: number; nome: string }[] }) {
  const [castello, setCastello] = useState(castelli[0]?.id ?? 1);
  const [righe, setRighe] = useState<RigaRaccolta[] | null>(null);
  const [modulo, setModulo] = useState<RigaRaccolta | "nuova" | null>(null);

  const carica = useCallback(() => {
    setRighe(null);
    db().from("raccolta_rifiuti").select("id, castello_id, zona, frazione, giorni, orario, note, da_verificare").eq("castello_id", castello).order("zona").order("frazione")
      .then(({ data }) => setRighe(((data ?? []) as RigaRaccolta[]).filter((r) => r.giorni.length)));
  }, [castello]);
  useEffect(carica, [carica]);

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-[13px] font-medium text-testo-2">Castello
        <select value={castello} onChange={(e) => { setCastello(Number(e.target.value)); setModulo(null); }} className={`h-12 ${CAMPO}`}>
          {castelli.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </label>
      {righe === null ? <div className="h-32 animate-pulse rounded-2xl bg-superficie" /> : righe.length ? (
        <div className="flex flex-col gap-4">
          {[...new Set(righe.map((r) => r.zona))].map((zona) => (
            <section key={zona} className="flex flex-col gap-2" aria-label={zona}>
              <h2 className="text-[15px] font-semibold">{zona}</h2>
              <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie">
                {righe.filter((r) => r.zona === zona).map((r) => (
                  <li key={r.id}>
                    {modulo !== "nuova" && modulo?.id === r.id ? (
                      <div className="p-4"><ModuloRaccolta castello={castello} r={r} onFatto={() => { setModulo(null); carica(); }} onAnnulla={() => setModulo(null)} /></div>
                    ) : (
                      <button type="button" onClick={() => setModulo(r)} className="flex w-full items-center gap-3 p-4 text-left hover:bg-superficie-2">
                        <span className="size-3 shrink-0 rounded-full" style={{ background: FRAZIONI[r.frazione]?.colore }} />
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="text-[15px] font-semibold">{FRAZIONI[r.frazione]?.nome ?? r.frazione}, {giorniLeggibili(r.giorni)}</span>
                          <span className="truncate text-[13px] text-testo-2">{r.orario ?? "Senza orario"}{r.da_verificare ? ", da verificare" : ""}</span>
                        </span>
                        <span className="text-sm font-medium text-accento">Modifica</span>
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : <p className="rounded-2xl bg-superficie px-4 py-5 text-[15px] text-testo-2">Nessuna raccolta inserita per questo castello.</p>}
      {modulo === "nuova" ? (
        <div className="rounded-2xl border border-linea p-4"><ModuloRaccolta castello={castello} r={null} onFatto={() => { setModulo(null); carica(); }} onAnnulla={() => setModulo(null)} /></div>
      ) : (
        <PrimaryButton type="button" variante="secondario" onClick={() => setModulo("nuova")} className="w-fit">Aggiungi una raccolta</PrimaryButton>
      )}
    </div>
  );
}

function ModuloRaccolta({ castello, r, onFatto, onAnnulla }: { castello: number; r: RigaRaccolta | null; onFatto: () => void; onAnnulla: () => void }) {
  const [frazione, setFrazione] = useState(r?.frazione ?? "secco");
  const [zona, setZona] = useState(r?.zona ?? "Tutto il castello");
  const [giorni, setGiorni] = useState<number[]>(r?.giorni ?? []);
  const [orario, setOrario] = useState(r?.orario ?? "");
  const [note, setNote] = useState(r?.note ?? "");
  const [verificata, setVerificata] = useState(r ? !r.da_verificare : false);
  const [errore, setErrore] = useState<string | null>(null);

  async function salva(e: React.FormEvent) {
    e.preventDefault();
    setErrore(null);
    const { error } = await db().rpc("salva_raccolta", { p_id: r?.id ?? null, p: { castello_id: castello, frazione, zona, giorni, orario, note, verificata } });
    if (error) return setErrore(messaggio(error));
    await rigenera(["/utili/rifiuti"]);
    onFatto();
  }
  async function togli() {
    if (!r || !confirm("Togliere questa raccolta?")) return;
    const { error } = await db().rpc("togli_raccolta", { p_id: r.id });
    if (error) return setErrore(messaggio(error));
    await rigenera(["/utili/rifiuti"]);
    onFatto();
  }

  return (
    <form onSubmit={salva} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5 text-[13px] font-medium text-testo-2">Frazione
        <select value={frazione} onChange={(e) => setFrazione(e.target.value)} className={`h-12 ${CAMPO}`}>
          {Object.entries(FRAZIONI).map(([k, f]) => <option key={k} value={k}>{f.nome}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-[13px] font-medium text-testo-2">Zona
        <input required value={zona} onChange={(e) => setZona(e.target.value)} maxLength={120} className={`h-12 ${CAMPO}`} />
      </label>
      <div className="flex flex-col gap-1.5"><span className="text-[13px] font-medium text-testo-2">Giorni</span><SceltaGiorni valore={giorni} onCambia={setGiorni} /></div>
      <label className="flex flex-col gap-1.5 text-[13px] font-medium text-testo-2">Orario <span className="font-normal">Facoltativo, per esempio «esporre entro le 6»</span>
        <input value={orario} onChange={(e) => setOrario(e.target.value)} maxLength={120} className={`h-12 ${CAMPO}`} />
      </label>
      <label className="flex flex-col gap-1.5 text-[13px] font-medium text-testo-2">Note
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} className={`h-12 ${CAMPO}`} />
      </label>
      <label className="flex items-center gap-2.5 text-[15px]">
        <input type="checkbox" checked={verificata} onChange={(e) => setVerificata(e.target.checked)} className="size-5 accent-[var(--accento)]" />
        Controllata alla fonte (toglie «Da verificare»)
      </label>
      {errore ? <p role="alert" className={ERRORE}>{errore}</p> : null}
      <div className="flex flex-wrap gap-2">
        <PrimaryButton type="submit" disabled={!giorni.length}>{r ? "Salva" : "Aggiungi"}</PrimaryButton>
        <PrimaryButton type="button" variante="fantasma" onClick={onAnnulla}>Annulla</PrimaryButton>
        {r ? <button type="button" onClick={togli} className="h-12 rounded-xl px-3 text-sm font-semibold text-segnale hover:bg-segnale/12">Togli</button> : null}
      </div>
    </form>
  );
}
