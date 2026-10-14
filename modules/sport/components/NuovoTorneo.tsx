"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { creaTorneo } from "../tornei-api";
import type { Formato } from "../tornei";

const CAMPO =
  "w-full rounded-xl border border-linea bg-superficie px-4 text-[15px] text-testo outline-none transition-colors placeholder:text-testo-2/60 focus:border-accento";

function Campo({ testo, nota, children }: { testo: string; nota?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-testo-2">{testo}</span>
      {children}
      {nota ? <span className="text-xs text-testo-2">{nota}</span> : null}
    </label>
  );
}

/** La redazione apre un torneo: poi i capitani iscrivono le squadre dalla pagina del torneo. */
export default function NuovoTorneo({ sport, impianti }: { sport: { id: string; nome: string; giocatori: number }[]; impianti: { id: string; nome: string }[] }) {
  const router = useRouter();
  const [titolo, setTitolo] = useState("");
  const [sportId, setSportId] = useState(sport[0]?.id ?? "calcetto");
  const [formato, setFormato] = useState<Formato>("eliminazione");
  const [dal, setDal] = useState("");
  const [al, setAl] = useState("");
  const [impianto, setImpianto] = useState("");
  const [luogo, setLuogo] = useState("");
  const [metri, setMetri] = useState("100");
  const [descrizione, setDescrizione] = useState("");
  const [errore, setErrore] = useState<string | null>(null);
  const [invio, setInvio] = useState(false);

  const minimo = sport.find((s) => s.id === sportId)?.giocatori ?? 1;

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setInvio(true);
        setErrore(null);
        const r = await creaTorneo({
          titolo,
          sport_id: sportId,
          formato,
          dal,
          al: al || dal,
          luogo_id: impianto || undefined,
          luogo_nome: impianto ? undefined : luogo || undefined,
          metri: Math.max(0, Math.min(739, Number(metri) || 0)),
          descrizione: descrizione || undefined,
        });
        setInvio(false);
        if (r.errore || !r.id) return setErrore(r.errore ?? "Il torneo non si è creato. Riprova.");
        router.push(`/sport/tornei/${r.id}`);
      }}
    >
      <Campo testo="Titolo">
        <input required minLength={3} maxLength={80} value={titolo} onChange={(e) => setTitolo(e.target.value)} placeholder="Torneo dei castelli di calcetto" className={`${CAMPO} h-12`} />
      </Campo>
      <Campo testo="Sport" nota={`Ogni squadra deve avere almeno ${minimo} ${minimo === 1 ? "giocatore" : "giocatori"} per partire.`}>
        <select value={sportId} onChange={(e) => setSportId(e.target.value)} className={`${CAMPO} h-12`}>
          {sport.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
        </select>
      </Campo>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-[13px] font-medium text-testo-2">Formato</legend>
        <div className="grid grid-cols-2 gap-2">
          {([["eliminazione", "Eliminazione diretta", "Chi perde esce. Con squadre dispari qualcuna passa il primo turno."], ["girone", "Girone", "Tutti contro tutti: 3 punti la vittoria, 1 il pareggio."]] as const).map(([v, nome, nota]) => (
            <button key={v} type="button" aria-pressed={formato === v} onClick={() => setFormato(v)}
              className="flex flex-col items-start gap-1 rounded-xl border border-linea bg-superficie p-3 text-left aria-pressed:border-accento">
              <span className="text-[15px] font-semibold">{nome}</span>
              <span className="text-xs text-testo-2">{nota}</span>
            </button>
          ))}
        </div>
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        <Campo testo="Dal"><input type="date" required value={dal} onChange={(e) => setDal(e.target.value)} className={`${CAMPO} h-12`} /></Campo>
        <Campo testo="Al"><input type="date" min={dal || undefined} value={al} onChange={(e) => setAl(e.target.value)} className={`${CAMPO} h-12`} /></Campo>
      </div>
      <Campo testo="Dove si gioca" nota="Un impianto dall'elenco, oppure scrivilo sotto.">
        <select value={impianto} onChange={(e) => setImpianto(e.target.value)} className={`${CAMPO} h-12`}>
          <option value="">Scrivo io il luogo</option>
          {impianti.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
        </select>
      </Campo>
      {!impianto ? (
        <Campo testo="Luogo">
          <input maxLength={120} value={luogo} onChange={(e) => setLuogo(e.target.value)} placeholder="Campi di Serravalle, o più impianti" className={`${CAMPO} h-12`} />
        </Campo>
      ) : null}
      <Campo testo="Metri alla squadra vincitrice" nota="Li riceve ogni giocatore della squadra che vince, e salgono anche nella classifica del suo castello.">
        <input inputMode="numeric" value={metri} onChange={(e) => setMetri(e.target.value.replace(/\D/g, "").slice(0, 3))} className={`${CAMPO} h-12 font-mono`} />
      </Campo>
      <Campo testo="Descrizione" nota="Regole, premi, chi organizza. Facoltativa.">
        <textarea rows={4} maxLength={2000} value={descrizione} onChange={(e) => setDescrizione(e.target.value)} className={`${CAMPO} py-3`} />
      </Campo>
      {errore ? <p role="alert" className="rounded-xl bg-segnale/12 px-4 py-3 text-sm text-segnale">{errore}</p> : null}
      <PrimaryButton type="submit" pieno disabled={invio}>{invio ? "Creo il torneo" : "Apri le iscrizioni"}</PrimaryButton>
    </form>
  );
}
