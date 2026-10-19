import { km } from "../sentieri";

const L = 600, H = 150;

/** Il profilo altimetrico del sentiero (quote EU-DEM ogni ~1/100 del percorso): area nera tenue, linea nera, quote ai lati */
export default function Profilo({ profilo, da, a }: { profilo: [number, number][]; da: string | null; a: string | null }) {
  const distanza = profilo.at(-1)![0] || 1;
  const quote = profilo.map((p) => p[1]);
  const min = Math.min(...quote), max = Math.max(...quote);
  // Almeno 60 m di scala: un sentiero quasi in piano non deve sembrare una montagna
  const basso = Math.floor((min - 10) / 10) * 10;
  const alto = Math.max(basso + 60, Math.ceil((max + 10) / 10) * 10);
  const x = (d: number) => (d / distanza) * L;
  const y = (q: number) => H - ((q - basso) / (alto - basso)) * H;
  const linea = profilo.map(([d, q], i) => `${i ? "L" : "M"}${x(d).toFixed(1)},${y(q).toFixed(1)}`).join("");

  return (
    <figure className="flex flex-col gap-2">
      <div className="flex gap-3">
        <div className="flex w-12 shrink-0 flex-col justify-between py-0.5 text-right font-mono text-[11px] text-testo-2" aria-hidden="true">
          <span>{alto} m</span>
          <span>{basso} m</span>
        </div>
        <svg viewBox={`0 0 ${L} ${H}`} preserveAspectRatio="none" className="h-36 min-w-0 flex-1 overflow-visible" role="img"
          aria-label={`Profilo altimetrico: quota tra ${min} e ${max} metri lungo ${km(distanza)}`}>
          <line x1="0" x2={L} y1={H / 2} y2={H / 2} stroke="var(--linea)" strokeDasharray="4 6" vectorEffect="non-scaling-stroke" />
          <path d={`${linea}L${L},${H}L0,${H}Z`} fill="var(--testo)" opacity="0.08" />
          <path d={linea} fill="none" stroke="var(--testo)" strokeWidth="2.25" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
      <figcaption className="flex justify-between gap-3 pl-15 text-[12px] text-testo-2">
        <span className="min-w-0 truncate"><span className="font-mono">0</span>{da ? `, ${da}` : ""}</span>
        <span className="min-w-0 truncate text-right">{a ? `${a}, ` : ""}<span className="font-mono">{km(distanza)}</span></span>
      </figcaption>
    </figure>
  );
}
