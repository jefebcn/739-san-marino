import { LIVELLI, livello, percentuale } from "@/lib/quota";

const TACCHE = Array.from({ length: 14 }, (_, i) => (i + 1) * 50);

/** Scala dell'altimetro da 0 a 739 m, con le tacche dei livelli. */
export function Scala({ metri, grande = false }: { metri: number; grande?: boolean }) {
  const p = percentuale(metri);
  return (
    <div className={grande ? "scala grande" : "scala"} role="meter" aria-valuemin={0} aria-valuemax={739} aria-valuenow={metri} aria-label="Quota in metri">
      <span className="binario" />
      <span className="pieno" style={{ width: `${p}%` }} />
      {TACCHE.map((m) => (
        <span key={m} className="tacca" style={{ left: `${percentuale(m)}%` }} />
      ))}
      {LIVELLI.slice(1).map((l) => (
        <span key={l.nome} className="tacca lv" style={{ left: `calc(${percentuale(l.da)}% - 1px)` }} />
      ))}
      <span className="ago" style={{ left: `${p}%` }} />
    </div>
  );
}

export function EtichetteScala() {
  return (
    <div className="scala-etichette" aria-hidden="true">
      {LIVELLI.map((l) => (
        <span key={l.nome} style={{ left: `${percentuale(l.da)}%` }}>
          {l.nome}
          <small>{l.da} m</small>
        </span>
      ))}
    </div>
  );
}

/** Striscia dell'altimetro nella barra in alto: sempre visibile. */
export function Altimetro({ metri }: { metri: number }) {
  const { attuale } = livello(metri);
  return (
    <div className="altimetro">
      <span>Quota <b>{metri} m</b></span>
      <Scala metri={metri} />
      <span>{attuale.nome}</span>
    </div>
  );
}
