import Link from "next/link";
import { linkIndicazioni, type Luogo } from "@/lib/data";
import { Icona } from "./Icona";
import type { Lingua } from "@/lib/lingua";

/** Scheda di un luogo di servizio (farmacia, parcheggio) con chiamata, indicazioni e mappa. */
export default function SchedaLuogo({ l, children, lingua = "it" }: { l: Luogo; children?: React.ReactNode; lingua?: Lingua }) {
  const en = lingua === "en";
  return (
    <article className="card">
      <div className="card-testa">
        <h3><Link href={en ? `/en/places/${l.id}` : `/luoghi/${l.id}`}>{l.nome}</Link></h3>
        {l.da_verificare ? <span className="verifica">{en ? "Location to be checked" : "Posizione da verificare"}</span> : null}
      </div>
      {l.indirizzo ? <span className="meta">{l.indirizzo}</span> : null}
      {children}
      <div className="riga-azioni">
        {l.telefono ? (
          <a className="azione-mini premibile" href={`tel:${l.telefono.replace(/\s/g, "")}`}><Icona nome="telefono" /> {en ? "Call" : "Chiama"}</a>
        ) : null}
        <a className="azione-mini premibile" href={linkIndicazioni(l.lat, l.lng)} target="_blank" rel="noopener"><Icona nome="indicazioni" /> {en ? "Directions" : "Indicazioni"}</a>
        <Link prefetch={false} className="azione-mini premibile" href={`${en ? "/en/map" : "/mappa"}?luogo=${l.id}`}><Icona nome="mappa" /> {en ? "Map" : "Mappa"}</Link>
      </div>
    </article>
  );
}
