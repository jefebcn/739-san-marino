"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Icona } from "@/components/Icona";
import { PuntoCategoria } from "@/components/Segnaposto";
import { tipoDi, type Fornitore } from "@/lib/data";

const GRUPPI = [
  { id: "tutti", nome: "Tutti" },
  { id: "azienda", nome: "Aziende" },
  { id: "artigiano", nome: "Artigiani" },
  { id: "professionista", nome: "Professionisti" },
] as const;

const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const CAMPO = "w-full rounded-xl border border-linea bg-fondo px-4 text-[15px] text-testo outline-none transition-colors placeholder:text-testo-2/60 focus:border-accento";
const PASSO = 40;

/** La richiesta di preventivo: si scrive qui e parte dall'email o dal telefono di chi la manda. 739 non salva niente. */
function Preventivo({ f, onChiudi }: { f: Fornitore; onChiudi: () => void }) {
  const [cosa, setCosa] = useState("");
  const [quando, setQuando] = useState("");
  const [chi, setChi] = useState("");
  const corpo = [
    "Buongiorno,",
    "",
    "vi scrivo per chiedere un preventivo.",
    "",
    `Cosa mi serve: ${cosa.trim() || "…"}`,
    quando.trim() ? `Quando: ${quando.trim()}` : null,
    "",
    chi.trim() || null,
    "",
    "(Richiesta scritta con 739 San Marino)",
  ].filter((r) => r !== null).join("\n");
  const mailto = f.email ? `mailto:${f.email}?subject=${encodeURIComponent("Richiesta di preventivo")}&body=${encodeURIComponent(corpo)}` : null;
  return (
    <div className="flex flex-col gap-3 border-t border-linea px-4 pb-4 pt-3">
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium text-testo-2">Cosa ti serve</span>
        <textarea rows={3} maxLength={800} value={cosa} onChange={(e) => setCosa(e.target.value)} placeholder="Es. 200 cartoni da asporto con il logo, o il rifacimento dell'impianto elettrico del locale" className={`${CAMPO} py-2.5 leading-relaxed`} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-testo-2">Per quando (facoltativo)</span>
          <input maxLength={100} value={quando} onChange={(e) => setQuando(e.target.value)} placeholder="Es. entro fine mese" className={`h-11 ${CAMPO}`} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-testo-2">Chi sei (facoltativo)</span>
          <input maxLength={120} value={chi} onChange={(e) => setChi(e.target.value)} placeholder="Nome e attività" className={`h-11 ${CAMPO}`} />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {mailto ? (
          <a href={mailto} className="taglio inline-flex h-11 items-center gap-2 bg-metallo text-sm font-semibold text-su-accento hover:bg-zinc-800"><Icona nome="email" size={18} /> Manda per email</a>
        ) : null}
        {f.telefono ? (
          <a href={`tel:${f.telefono.replace(/[^+0-9]/g, "")}`} className="inline-flex h-11 items-center gap-2 rounded-xl bg-fondo px-4 text-sm font-semibold hover:bg-superficie-2"><Icona nome="telefono" size={18} /> Chiama</a>
        ) : null}
        {!mailto && f.sito ? (
          <a href={f.sito} target="_blank" rel="noopener" className="inline-flex h-11 items-center gap-2 rounded-xl bg-fondo px-4 text-sm font-semibold hover:bg-superficie-2"><Icona nome="sito" size={18} /> Sito</a>
        ) : null}
        <button type="button" onClick={onChiudi} className="h-11 px-2 text-sm font-medium text-testo-2 hover:text-testo">Chiudi</button>
      </div>
      <p className="text-xs text-testo-2">
        {mailto ? "La richiesta parte dalla tua email, già scritta: controllala e mandala." : "Questa attività non ha un'email in 739: chiamala e leggi la richiesta."} 739 non la vede e non la salva.
      </p>
    </div>
  );
}

/** Trova un fornitore: ricerca, gruppi e tipi, e la richiesta di preventivo direttamente all'attività */
export default function Fornitori({ fornitori, castelli }: { fornitori: Fornitore[]; castelli: Record<number, string> }) {
  const [testo, setTesto] = useState("");
  const [gruppo, setGruppo] = useState<(typeof GRUPPI)[number]["id"]>("tutti");
  const [tipo, setTipo] = useState<string | null>(null);
  const [aperto, setAperto] = useState<string | null>(null);
  const [quanti, setQuanti] = useState(PASSO);

  const delGruppo = useMemo(() => fornitori.filter((f) => gruppo === "tutti" || f.categoria === gruppo), [fornitori, gruppo]);
  const tipi = useMemo(() => {
    const conta = new Map<string, number>();
    for (const f of delGruppo) if (f.sottocategoria && f.sottocategoria !== "altro") conta.set(f.sottocategoria, (conta.get(f.sottocategoria) ?? 0) + 1);
    return [...conta.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14);
  }, [delGruppo]);
  const lista = useMemo(() => {
    const q = norm(testo.trim());
    return delGruppo.filter((f) => (!tipo || f.sottocategoria === tipo) && (!q || norm(`${f.nome} ${tipoDi(f)} ${f.descrizione ?? ""}`).includes(q)));
  }, [delGruppo, tipo, testo]);

  return (
    <div className="flex flex-col gap-3">
      <label className="relative">
        <span className="sr-only">Cerca un fornitore</span>
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-testo-2"><Icona nome="cerca" size={18} /></span>
        <input type="search" value={testo} onChange={(e) => { setTesto(e.target.value); setQuanti(PASSO); }} placeholder="Cosa cerchi? Es. stampa, impianti, commercialista" className="h-12 w-full rounded-xl border border-linea bg-superficie pl-10 pr-4 text-[15px] outline-none focus:border-accento" />
      </label>
      <div className="chips" role="tablist" aria-label="Tipo di fornitore">
        {GRUPPI.map((g) => (
          <button key={g.id} type="button" role="tab" className="chip" aria-selected={gruppo === g.id} onClick={() => { setGruppo(g.id); setTipo(null); setQuanti(PASSO); }}>{g.nome}</button>
        ))}
      </div>
      {tipi.length > 1 ? (
        <div className="flex flex-wrap gap-1.5" aria-label="Filtra per tipo">
          {tipi.map(([t, n]) => (
            <button key={t} type="button" aria-pressed={tipo === t} onClick={() => { setTipo(tipo === t ? null : t); setQuanti(PASSO); }} className={`rounded-lg px-2.5 py-1 text-[13px] font-medium transition-colors ${tipo === t ? "bg-accento text-su-accento" : "bg-superficie text-testo hover:bg-superficie-2"}`}>
              {tipoDi({ categoria: "", sottocategoria: t })} <span className="font-mono opacity-60">{n}</span>
            </button>
          ))}
        </div>
      ) : null}
      <p className="text-[13px] text-testo-2" aria-live="polite">{lista.length === 1 ? "1 risultato" : `${lista.length} risultati`}</p>
      {lista.length ? (
        <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie">
          {lista.slice(0, quanti).map((f) => (
            <li key={f.id}>
              <div className="flex items-center gap-3 px-4 py-3">
                <PuntoCategoria categoria={f.categoria} sottocategoria={f.sottocategoria} grande />
                <Link href={`/luoghi/${f.id}`} prefetch={false} className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[15px] font-semibold">{f.nome}</span>
                  <span className="truncate text-[13px] text-testo-2">{[tipoDi(f), f.castello_id ? castelli[f.castello_id] : null].filter(Boolean).join(", ")}</span>
                </Link>
                {f.email || f.telefono ? (
                  <button type="button" aria-expanded={aperto === f.id} onClick={() => setAperto(aperto === f.id ? null : f.id)} className="shrink-0 rounded-xl bg-fondo px-3 py-2 text-[13px] font-semibold transition-colors hover:bg-superficie-2">
                    Preventivo
                  </button>
                ) : (
                  <Link href={`/luoghi/${f.id}`} prefetch={false} aria-label={`Apri ${f.nome}`} className="shrink-0 text-testo-2"><Icona nome="avanti" size={18} /></Link>
                )}
              </div>
              {aperto === f.id ? <Preventivo f={f} onChiudi={() => setAperto(null)} /> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl bg-superficie p-5 text-[15px] text-testo-2">Nessun fornitore trovato. Prova con un&apos;altra parola o togli il filtro.</p>
      )}
      {lista.length > quanti ? (
        <button type="button" onClick={() => setQuanti(quanti + PASSO)} className="h-11 w-fit rounded-xl bg-superficie px-4 text-sm font-semibold hover:bg-superficie-2">Mostra altri {Math.min(PASSO, lista.length - quanti)}</button>
      ) : null}
    </div>
  );
}
