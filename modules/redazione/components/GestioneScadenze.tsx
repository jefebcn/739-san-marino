"use client";

import { useCallback, useEffect, useState } from "react";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { TIPI_SCADENZA, oggiSM, type Scadenza, type TipoScadenza } from "@/lib/scadenze";

const CAMPO = "w-full rounded-xl border border-linea bg-superficie px-4 text-[15px] text-testo outline-none transition-colors placeholder:text-testo-2/60 focus:border-accento";
const data = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const leggi = (s: string) => data.format(new Date(`${s}T12:00:00Z`));
type Modulo = { id: string | null; tipo: TipoScadenza; titolo: string; testo: string; per_chi: string; giorno: string; dal: string; fonte_nome: string; fonte_link: string; stato: "bozza" | "pubblicata" };
const VUOTO: Modulo = { id: null, tipo: "fisco", titolo: "", testo: "", per_chi: "", giorno: "", dal: "", fonte_nome: "", fonte_link: "https://", stato: "bozza" };
const rigenera = () =>
  Promise.all(["/lavorare/scadenze", "/lavorare/bandi"].map((percorso) => fetch("/api/rivalida", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ percorso }) }).catch(() => {})));

function Campo({ testo, nota, children }: { testo: string; nota?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-testo-2">{testo}</span>
      {children}
      {nota ? <span className="text-xs text-testo-2">{nota}</span> : null}
    </label>
  );
}

/** Redazione: scadenze, bandi e nuove regole per le attività. Sempre con la fonte ufficiale; le bozze non si vedono. */
export default function GestioneScadenze() {
  const [lista, setLista] = useState<Scadenza[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [modulo, setModulo] = useState<Modulo | null>(null);
  const [invio, setInvio] = useState(false);
  const [passate, setPassate] = useState(false);

  const carica = useCallback(() => {
    let q = supabaseBrowser().from("scadenze").select("id, tipo, titolo, testo, per_chi, giorno, dal, fonte_nome, fonte_link, stato").order("giorno").limit(300);
    if (!passate) q = q.gte("giorno", oggiSM());
    q.then(({ data, error }) => {
      setLista((data ?? []) as Scadenza[]);
      setErrore(error ? (error.code === "42P01" || error.code === "PGRST205" ? "Le scadenze non sono ancora attive nel database (migrazione 0044)." : "L'elenco non si è caricato. Riprova.") : null);
    });
  }, [passate]);
  useEffect(carica, [carica]);

  const salva = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modulo) return;
    if (!/^https:\/\/\S+\.\S+/.test(modulo.fonte_link)) return setErrore("Il link della fonte deve essere una pagina ufficiale che inizia con https://");
    setInvio(true);
    setErrore(null);
    const riga = {
      tipo: modulo.tipo, titolo: modulo.titolo.trim(), testo: modulo.testo.trim() || null, per_chi: modulo.per_chi.trim() || null,
      giorno: modulo.giorno, dal: modulo.tipo === "bando" && modulo.dal ? modulo.dal : null,
      fonte_nome: modulo.fonte_nome.trim(), fonte_link: modulo.fonte_link.trim(), stato: modulo.stato, aggiornato_il: new Date().toISOString(),
    };
    const db = supabaseBrowser().from("scadenze");
    const { error } = modulo.id ? await db.update(riga).eq("id", modulo.id) : await db.insert(riga);
    setInvio(false);
    if (error) return setErrore(error.code === "23514" ? "Controlla i campi: titolo da 5 a 140 caratteri, fonte con nome e link https." : "Non è stato salvato. Riprova.");
    await rigenera();
    setModulo(null);
    carica();
  };

  const elimina = async (s: Scadenza) => {
    if (!confirm(`Eliminare «${s.titolo}»?`)) return;
    const { error } = await supabaseBrowser().from("scadenze").delete().eq("id", s.id);
    if (error) return setErrore("Non è stata eliminata. Riprova.");
    await rigenera();
    carica();
  };

  if (modulo) {
    const m = modulo;
    const cambia = (k: keyof Modulo, v: string) => setModulo({ ...m, [k]: v });
    return (
      <form onSubmit={salva} className="flex flex-col gap-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Campo testo="Tipo">
            <select value={m.tipo} onChange={(e) => cambia("tipo", e.target.value)} className={`h-12 ${CAMPO}`}>
              {(Object.keys(TIPI_SCADENZA) as TipoScadenza[]).map((t) => <option key={t} value={t}>{TIPI_SCADENZA[t]}</option>)}
            </select>
          </Campo>
          <Campo testo={m.tipo === "norme" ? "Vale dal" : m.tipo === "bando" ? "Domande entro il" : "Scadenza"}>
            <input type="date" required value={m.giorno} onChange={(e) => cambia("giorno", e.target.value)} className={`h-12 ${CAMPO}`} />
          </Campo>
        </div>
        {m.tipo === "bando" ? (
          <Campo testo="Domande dal (facoltativo)">
            <input type="date" value={m.dal} onChange={(e) => cambia("dal", e.target.value)} className={`h-12 ${CAMPO}`} />
          </Campo>
        ) : null}
        <Campo testo="Titolo" nota="Cosa scade o cosa cambia, in una riga.">
          <input required minLength={5} maxLength={140} value={m.titolo} onChange={(e) => cambia("titolo", e.target.value)} placeholder="Es. Versamento dell'acconto IGR" className={`h-12 ${CAMPO}`} />
        </Campo>
        <Campo testo="Per chi (facoltativo)">
          <input maxLength={200} value={m.per_chi} onChange={(e) => cambia("per_chi", e.target.value)} placeholder="Es. Operatori economici con ricavi oltre 100.000 €" className={`h-12 ${CAMPO}`} />
        </Campo>
        <Campo testo="Spiegazione (facoltativa)" nota="Cosa fare, in parole semplici. Massimo 2000 caratteri.">
          <textarea rows={4} maxLength={2000} value={m.testo} onChange={(e) => cambia("testo", e.target.value)} className={`${CAMPO} py-3 leading-relaxed`} />
        </Campo>
        <div className="grid gap-5 sm:grid-cols-2">
          <Campo testo="Fonte ufficiale">
            <input required minLength={2} maxLength={120} value={m.fonte_nome} onChange={(e) => cambia("fonte_nome", e.target.value)} placeholder="Es. Ufficio Tributario, gov.sm" className={`h-12 ${CAMPO}`} />
          </Campo>
          <Campo testo="Link della fonte">
            <input type="url" required maxLength={500} value={m.fonte_link} onChange={(e) => cambia("fonte_link", e.target.value)} className={`h-12 ${CAMPO}`} />
          </Campo>
        </div>
        <Campo testo="Stato">
          <select value={m.stato} onChange={(e) => cambia("stato", e.target.value)} className={`h-12 ${CAMPO}`}>
            <option value="bozza">Bozza (non si vede)</option>
            <option value="pubblicata">Pubblicata</option>
          </select>
        </Campo>
        {errore ? <p role="alert" className="rounded-xl bg-segnale/12 px-4 py-3 text-sm text-segnale">{errore}</p> : null}
        <div className="flex flex-wrap gap-2">
          <PrimaryButton type="submit" disabled={invio}>{invio ? "Salvo…" : "Salva"}</PrimaryButton>
          <PrimaryButton variante="secondario" onClick={() => { setModulo(null); setErrore(null); }}>Annulla</PrimaryButton>
        </div>
        <p className="-mt-2 text-[13px] text-testo-2">Pubblica solo date controllate sulla fonte ufficiale (gov.sm, finanze.sm, Consiglio Grande e Generale, ISS). Nel dubbio lascia in bozza.</p>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <PrimaryButton onClick={() => setModulo(VUOTO)}>Nuova scadenza</PrimaryButton>
        <label className="flex items-center gap-2 text-sm text-testo-2">
          <input type="checkbox" checked={passate} onChange={(e) => setPassate(e.target.checked)} /> Mostra anche le passate
        </label>
      </div>
      {errore ? <p role="alert" className="rounded-xl bg-segnale/12 px-4 py-3 text-sm text-segnale">{errore}</p> : null}
      {!lista ? (
        <div className="h-40 animate-pulse rounded-2xl bg-superficie" aria-busy="true" aria-label="Caricamento" />
      ) : lista.length === 0 ? (
        <p className="rounded-2xl bg-superficie p-5 text-[15px] text-testo-2">Nessuna scadenza.</p>
      ) : (
        <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie">
          {lista.map((s) => (
            <li key={s.id} className="flex flex-col gap-1.5 px-4 py-3.5">
              <span className="text-[13px] text-testo-2">{TIPI_SCADENZA[s.tipo]}, {leggi(s.giorno)}{s.stato === "bozza" ? <b className="ml-1.5 font-semibold text-segnale">Bozza</b> : null}</span>
              <span className="text-[15px] font-semibold">{s.titolo}</span>
              <a href={s.fonte_link} target="_blank" rel="noopener" className="w-fit break-all text-[13px] text-accento underline-offset-2 hover:underline">{s.fonte_nome}</a>
              <div className="flex gap-4">
                <button type="button" className="py-1 text-sm font-semibold text-accento" onClick={() => setModulo({ id: s.id, tipo: s.tipo, titolo: s.titolo, testo: s.testo ?? "", per_chi: s.per_chi ?? "", giorno: s.giorno, dal: s.dal ?? "", fonte_nome: s.fonte_nome, fonte_link: s.fonte_link, stato: s.stato ?? "bozza" })}>Modifica</button>
                <button type="button" className="py-1 text-sm font-medium text-testo-2 hover:text-segnale" onClick={() => elimina(s)}>Elimina</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
