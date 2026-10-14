"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

type Dati = {
  smr_id: number;
  nuovi_7: number;
  attivi_7: number;
  attivi_settimana_prima: number;
  tornati: number;
  eventi_pubblicati_30: number;
  eventi_prossimi_30: number;
  schede_verificate: number;
  luoghi: number;
  bollettini_28: number;
};

const fmt = new Intl.NumberFormat("it-IT");

/** Un numero grande, cosa conta e, se c'è, l'obiettivo della fase (docs/piano.md, roadmap). */
function Numero({ valore, titolo, sotto, obiettivo, fase }: { valore: number; titolo: string; sotto?: string; obiettivo?: number; fase?: string }) {
  const quota = obiettivo ? Math.min(1, valore / obiettivo) : null;
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-superficie p-4">
      <span className="text-[13px] text-testo-2">{titolo}</span>
      <span className="font-mono text-[34px] font-medium leading-none tracking-[-0.05em]">{fmt.format(valore)}</span>
      {sotto ? <span className="text-[13px] leading-snug text-testo-2">{sotto}</span> : null}
      {quota !== null ? (
        <span className="mt-auto flex flex-col gap-1.5 pt-1">
          <span className="h-1.5 overflow-hidden rounded-full bg-fondo">
            <span className="block h-full rounded-full bg-accento" style={{ width: `${Math.round(quota * 100)}%` }} />
          </span>
          <span className="text-xs text-testo-2">
            Obiettivo {fase}: <span className="font-mono">{fmt.format(obiettivo!)}</span>
          </span>
        </span>
      ) : null}
    </div>
  );
}

/** I numeri di 739 per gli amministratori: solo totali, calcolati dal database (numeri_739, migrazione 0021). */
export default function Numeri() {
  const [dati, setDati] = useState<Dati | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    supabaseBrowser()
      .rpc("numeri_739")
      .then(({ data, error }) => {
        if (error) return setErrore(error.code === "PGRST202" ? "Manca la migrazione 0021: applicala dall'SQL Editor di Supabase." : error.message);
        setDati(data as Dati);
      });
  }, []);

  if (errore) return <p role="alert" className="rounded-xl bg-segnale/12 px-4 py-3 text-sm text-segnale">{errore}</p>;
  if (!dati) return <div className="grid grid-cols-2 gap-2.5">{[0, 1, 2, 3].map((i) => <div key={i} className="h-36 animate-pulse rounded-2xl bg-superficie" />)}</div>;

  const percentuale = dati.attivi_settimana_prima ? Math.round((dati.tornati / dati.attivi_settimana_prima) * 100) : null;

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h2 className="text-[19px] font-semibold tracking-tight">Persone</h2>
        <div className="grid grid-cols-2 gap-2.5">
          <Numero valore={dati.smr_id} titolo="SMR ID" sotto={`${fmt.format(dati.nuovi_7)} negli ultimi 7 giorni`} obiettivo={1000} fase="Fase 1" />
          <Numero valore={dati.attivi_7} titolo="Attivi in 7 giorni" sotto="Hanno aperto 739 con il loro SMR ID" />
          <div className="col-span-2 flex flex-col gap-2 rounded-2xl bg-superficie p-4">
            <span className="text-[13px] text-testo-2">Chi torna ogni settimana</span>
            <span className="font-mono text-[34px] font-medium leading-none tracking-[-0.05em]">{percentuale === null ? "–" : `${percentuale}%`}</span>
            <span className="text-[13px] leading-snug text-testo-2">
              {dati.attivi_settimana_prima
                ? `${fmt.format(dati.tornati)} dei ${fmt.format(dati.attivi_settimana_prima)} attivi della settimana scorsa sono tornati in questa. Obiettivo Fase 1: un terzo.`
                : "Si calcola dalla seconda settimana di accessi. Obiettivo Fase 1: un terzo."}
            </span>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[19px] font-semibold tracking-tight">Contenuti</h2>
        <div className="grid grid-cols-2 gap-2.5">
          <Numero valore={dati.eventi_pubblicati_30} titolo="Eventi pubblicati in 30 giorni" sotto={`${fmt.format(dati.eventi_prossimi_30)} in calendario nei prossimi 30`} obiettivo={40} fase="Fase 1" />
          <Numero valore={dati.schede_verificate} titolo="Schede verificate" sotto={`Su ${fmt.format(dati.luoghi)} luoghi in 739`} obiettivo={100} fase="Fase 0" />
          <Numero valore={dati.bollettini_28} titolo="Bollettini scritti in 4 settimane" sotto="Giorni con il Bollettino della redazione" obiettivo={28} fase="Fase 0" />
        </div>
      </section>

      <p className="text-[13px] leading-relaxed text-testo-2">
        Per ogni SMR ID si conserva solo il giorno in cui apre 739, mai orari o pagine viste. Le visite anonime di tutti, anche senza SMR ID, sono in Vercel, alla voce Analytics del progetto.
      </p>
    </div>
  );
}
