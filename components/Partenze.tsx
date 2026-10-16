"use client";

import { useEffect, useMemo, useState } from "react";
import { oraBreve, prossimePartenze, testoTra, type Partenza } from "@/lib/orario";
import type { Linea } from "@/lib/servizi";
import { Icona } from "./Icona";
import { traEn, type Lingua } from "@/lib/lingua";
import { traduci } from "@/lib/traduci";

const T = {
  it: { nessuna: "Nessuna corsa", domani: "domani", Domani: "Domani", Oggi: "Oggi", nessunaProgramma: "Nessuna corsa in programma.", funivia: "Prossima funivia", bus: "Prossimo bus", partenze: "Partenze", biglietto: "Biglietto", ufficiali: "Orari ufficiali", verificare: "Da verificare", vuoto: "Orari non ancora disponibili.", linea: "Linea" },
  en: { nessuna: "No more runs", domani: "tomorrow", Domani: "Tomorrow", Oggi: "Today", nessunaProgramma: "No runs scheduled.", funivia: "Next cable car", bus: "Next bus", partenze: "Departures", biglietto: "Tickets", ufficiali: "Official timetable", verificare: "To be checked", vuoto: "Timetable not available yet.", linea: "Line" },
};

/** Nomi e direzioni delle linee come si leggono in inglese */
const DIREZIONI_EN: Record<string, string> = { "Borgo Maggiore → Città": "Borgo Maggiore → Città (old town)", "Città → Borgo Maggiore": "Città (old town) → Borgo Maggiore" };
const nomeDirezione = (d: string, lingua: Lingua) => (lingua === "en" ? DIREZIONI_EN[d] ?? d : d);
const tra = (n: number, lingua: Lingua) => (lingua === "en" ? traEn(n) : testoTra(n));

/** Ora corrente aggiornata ogni 20 secondi; null finché la pagina non è nel browser (evita differenze col server). */
function useAdesso() {
  const [ora, setOra] = useState<Date | null>(null);
  useEffect(() => {
    setOra(new Date());
    const t = setInterval(() => setOra(new Date()), 20000);
    return () => clearInterval(t);
  }, []);
  return ora;
}

/** Prossima partenza in una riga, per le tessere di Oggi e Vivere. */
export function ProssimaPartenza({ partenze, lingua = "it" }: { partenze: Partenza[]; lingua?: Lingua }) {
  const t = T[lingua];
  const ora = useAdesso();
  if (!ora) return <span className="grande">--:--</span>;
  const [p] = prossimePartenze(partenze, 1, ora);
  if (!p) return <span className="text-sm text-testo-2">{t.nessuna}</span>;
  return (
    <span className="grande">
      {p.tra < 60 && !p.domani ? <>{p.tra}<small>min</small></> : <>{oraBreve(p.p.ora)}{p.domani ? <small>{t.domani}</small> : null}</>}
    </span>
  );
}

export function TestoProssima({ partenze }: { partenze: Partenza[] }) {
  const ora = useAdesso();
  if (!ora) return <>…</>;
  const [p] = prossimePartenze(partenze, 1, ora);
  if (!p) return <>nessuna corsa in programma</>;
  return <><b>{oraBreve(p.p.ora)}</b>, {p.domani ? "domani" : testoTra(p.tra)}</>;
}

export default function Partenze({ linee, lingua = "it" }: { linee: Linea[]; lingua?: Lingua }) {
  const t = T[lingua];
  const en = lingua === "en";
  const ora = useAdesso();
  const [lineaId, setLineaId] = useState(linee[0]?.id);
  const linea = linee.find((l) => l.id === lineaId) ?? linee[0];
  const direzioni = useMemo(() => Array.from(new Set(linea?.partenze.map((p) => p.direzione) ?? [])), [linea]);
  const [direzione, setDirezione] = useState<string | undefined>(undefined);
  const dir = direzione && direzioni.includes(direzione) ? direzione : direzioni[0];

  if (!linea) return <p className="vuoto">{t.vuoto}</p>;

  const lista = ora ? prossimePartenze(linea.partenze.filter((p) => p.direzione === dir), 6, ora) : [];
  const prima = lista[0];

  return (
    <>
      {linee.length > 1 ? (
        <div className="chips" role="tablist" aria-label={t.linea}>
          {linee.map((l) => (
            <button key={l.id} type="button" role="tab" className="chip" aria-selected={l.id === linea.id} onClick={() => setLineaId(l.id)}>
              <Icona nome={l.tipo === "funivia" ? "funivia" : "bus"} size={18} />
              {en ? traduci(l.nome) : l.nome}
            </button>
          ))}
        </div>
      ) : null}

      <section className="pannello topo" aria-live="polite">
        <span className="etichetta">{linea.tipo === "funivia" ? t.funivia : t.bus}</span>
        {direzioni.length > 1 ? (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", position: "relative", zIndex: 2 }}>
            {direzioni.map((d) => (
              <button
                key={d}
                type="button"
                className="chip"
                aria-pressed={d === dir}
                onClick={() => setDirezione(d)}
                style={d === dir ? { background: "var(--ottone-metallo)", borderColor: "transparent", color: "var(--su-accento)" } : { background: "transparent", color: "#fff", borderColor: "rgba(255,255,255,.25)" }}
              >
                {nomeDirezione(d, lingua)}
              </button>
            ))}
          </div>
        ) : null}
        {!ora ? (
          <span className="conto">--<small>min</small></span>
        ) : prima ? (
          prima.domani ? (
            <span className="conto">{oraBreve(prima.p.ora)}<small>{t.domani}</small></span>
          ) : prima.tra < 90 ? (
            <span className="conto">{prima.tra}<small>min</small></span>
          ) : (
            <span className="conto">{oraBreve(prima.p.ora)}</span>
          )
        ) : (
          <span style={{ fontSize: 18, fontWeight: 600 }}>{t.nessunaProgramma}</span>
        )}
        {linea.descrizione ? <p style={{ fontSize: 14, color: "var(--pannello-testo)", lineHeight: 1.45 }}>{en ? traduci(linea.descrizione) : linea.descrizione}</p> : null}
      </section>

      {lista.length > 1 ? (
        <section className="sezione">
          <div className="sezione-head"><h2>{t.partenze}</h2><span className="meta">{dir ? nomeDirezione(dir, lingua) : null}</span></div>
          <div className="tabellone">
            {lista.map((x, i) => (
              <div key={`${x.p.ora}-${x.domani}`} className={i === 0 ? "prima" : undefined}>
                <span className="ora">{oraBreve(x.p.ora)}</span>
                <span className="meta">{x.domani ? t.Domani : t.Oggi}</span>
                <span className="tra">{x.domani ? "" : tra(x.tra, lingua)}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="card">
        <div className="card-testa">
          <h3>{en ? traduci(linea.nome) : linea.nome}</h3>
          {linea.da_verificare ? <span className="verifica">{t.verificare}</span> : null}
        </div>
        {linea.biglietto ? <span className="meta">{t.biglietto}: {en ? traduci(linea.biglietto) : linea.biglietto}</span> : null}
        {linea.fonte ? (
          <p className="fonte">{t.ufficiali}: <a href={linea.fonte} target="_blank" rel="noopener">{new URL(linea.fonte).hostname.replace("www.", "")}</a></p>
        ) : null}
      </section>
    </>
  );
}
