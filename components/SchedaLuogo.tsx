import Link from "next/link";
import { linkIndicazioni, type Luogo } from "@/lib/data";
import { Icona } from "./Icona";

/** Scheda di un luogo di servizio (farmacia, parcheggio) con chiamata, indicazioni e mappa. */
export default function SchedaLuogo({ l, children }: { l: Luogo; children?: React.ReactNode }) {
  return (
    <article className="card">
      <div className="card-testa">
        <h3><Link href={`/luoghi/${l.id}`}>{l.nome}</Link></h3>
        {l.da_verificare ? <span className="verifica">Posizione da verificare</span> : null}
      </div>
      {l.indirizzo ? <span className="meta">{l.indirizzo}</span> : null}
      {children}
      <div className="riga-azioni">
        {l.telefono ? (
          <a className="azione-mini premibile" href={`tel:${l.telefono.replace(/\s/g, "")}`}><Icona nome="telefono" /> Chiama</a>
        ) : null}
        <a className="azione-mini premibile" href={linkIndicazioni(l.lat, l.lng)} target="_blank" rel="noopener"><Icona nome="indicazioni" /> Indicazioni</a>
        <Link prefetch={false} className="azione-mini premibile" href={`/mappa?luogo=${l.id}`}><Icona nome="mappa" /> Mappa</Link>
      </div>
    </article>
  );
}
