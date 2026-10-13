"use client";

import { useEffect, useMemo, useState } from "react";
import { oraBreve, prossimePartenze, testoTra, type Partenza } from "@/lib/orario";
import type { Linea } from "@/lib/servizi";
import { Icona } from "./Icona";

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

/** Prossima partenza in una riga, per le tessere di Home e Utili. */
export function ProssimaPartenza({ partenze }: { partenze: Partenza[] }) {
  const ora = useAdesso();
  if (!ora) return <span className="grande">--:--</span>;
  const [p] = prossimePartenze(partenze, 1, ora);
  if (!p) return <span className="grande">—</span>;
  return (
    <span className="grande">
      {p.tra < 60 && !p.domani ? <>{p.tra}<small>min</small></> : <>{oraBreve(p.p.ora)}{p.domani ? <small>domani</small> : null}</>}
    </span>
  );
}

export function TestoProssima({ partenze }: { partenze: Partenza[] }) {
  const ora = useAdesso();
  if (!ora) return <>…</>;
  const [p] = prossimePartenze(partenze, 1, ora);
  if (!p) return <>nessuna corsa in programma</>;
  return <><b>{oraBreve(p.p.ora)}</b> · {p.domani ? "domani" : testoTra(p.tra)}</>;
}

export default function Partenze({ linee }: { linee: Linea[] }) {
  const ora = useAdesso();
  const [lineaId, setLineaId] = useState(linee[0]?.id);
  const linea = linee.find((l) => l.id === lineaId) ?? linee[0];
  const direzioni = useMemo(() => Array.from(new Set(linea?.partenze.map((p) => p.direzione) ?? [])), [linea]);
  const [direzione, setDirezione] = useState<string | undefined>(undefined);
  const dir = direzione && direzioni.includes(direzione) ? direzione : direzioni[0];

  if (!linea) return <p className="vuoto">Orari non ancora disponibili.</p>;

  const lista = ora ? prossimePartenze(linea.partenze.filter((p) => p.direzione === dir), 6, ora) : [];
  const prima = lista[0];

  return (
    <>
      {linee.length > 1 ? (
        <div className="chips" role="tablist" aria-label="Linea">
          {linee.map((l) => (
            <button key={l.id} type="button" role="tab" className="chip" aria-pressed={l.id === linea.id} aria-selected={l.id === linea.id} onClick={() => setLineaId(l.id)}>
              <Icona nome={l.tipo === "funivia" ? "funivia" : "bus"} size={18} />
              {l.nome}
            </button>
          ))}
        </div>
      ) : null}

      <section className="pannello topo cornice" aria-live="polite">
        <span className="etichetta">{linea.tipo === "funivia" ? "Funivia" : "Bus"} · prossima partenza</span>
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
                {d}
              </button>
            ))}
          </div>
        ) : null}
        {!ora ? (
          <span className="conto">--<small>min</small></span>
        ) : prima ? (
          prima.domani ? (
            <span className="conto">{oraBreve(prima.p.ora)}<small>domani</small></span>
          ) : prima.tra < 90 ? (
            <span className="conto">{prima.tra}<small>min</small></span>
          ) : (
            <span className="conto">{oraBreve(prima.p.ora)}</span>
          )
        ) : (
          <span style={{ fontSize: 18, fontWeight: 600 }}>Nessuna corsa in programma.</span>
        )}
        {linea.descrizione ? <p style={{ fontSize: 14, color: "var(--pannello-testo)", lineHeight: 1.45 }}>{linea.descrizione}</p> : null}
      </section>

      {lista.length > 1 ? (
        <section className="sezione">
          <div className="sezione-head"><h2>Partenze</h2><span className="meta">{dir}</span></div>
          <div className="tabellone">
            {lista.map((x, i) => (
              <div key={`${x.p.ora}-${x.domani}`} className={i === 0 ? "prima" : undefined}>
                <span className="ora">{oraBreve(x.p.ora)}</span>
                <span className="meta">{x.domani ? "Domani" : "Oggi"}</span>
                <span className="tra">{x.domani ? "" : testoTra(x.tra)}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="card">
        <div className="card-testa">
          <h3>{linea.nome}</h3>
          {linea.da_verificare ? <span className="verifica">Da verificare</span> : null}
        </div>
        {linea.biglietto ? <span className="meta">Biglietto: {linea.biglietto}</span> : null}
        {linea.fonte ? (
          <p className="fonte">Orari ufficiali: <a href={linea.fonte} target="_blank" rel="noopener">{new URL(linea.fonte).hostname.replace("www.", "")}</a></p>
        ) : null}
      </section>
    </>
  );
}
