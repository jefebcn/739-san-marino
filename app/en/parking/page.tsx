import Link from "next/link";
import TestaPagina from "@/components/Indietro";
import SchedaLuogo from "@/components/SchedaLuogo";
import { Icona } from "@/components/Icona";
import { getParcheggi } from "@/lib/servizi";
import { FONTI } from "@/lib/fonti";
import { metaEn } from "@/lib/lingua";
import { traduci } from "@/lib/traduci";

export const revalidate = 300;

export const metadata = metaEn("Car parks", "The car parks of San Marino's old town with spaces, fares and directions.", "/utili/parcheggi", "/en/parking");

const fmt = new Intl.NumberFormat("en-GB");

export default async function Parking() {
  const parcheggi = await getParcheggi();
  return (
    <>
      <TestaPagina href="/en" verso="Today" titolo="Car parks">
        <p className="sottotitolo">Paid from 8:00 to 20:00 from October to March and from 8:00 to midnight from April to September. P9, the multi-storey, is the largest and has lifts up to the old town.</p>
      </TestaPagina>
      <Link href="/en/transport" className="bottone secondario premibile"><Icona nome="trasporti" size={20} /> Cable car and buses</Link>
      {parcheggi.length === 0 ? (
        <p className="vuoto">Car park list coming soon.</p>
      ) : (
        <div className="lista">
          {parcheggi.map((p) => (
            <SchedaLuogo key={p.id} l={p} lingua="en">
              {p.descrizione ? <span style={{ fontSize: 14, color: "var(--testo-2)" }}>{traduci(p.descrizione)}</span> : null}
              {p.tariffa || p.posti ? (
                <span className="meta" style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                  <Icona nome="parcheggio" size={14} />
                  <span>{[p.posti ? `${fmt.format(p.posti)} spaces` : null, traduci(p.tariffa)].filter(Boolean).join(", ")}</span>
                </span>
              ) : null}
            </SchedaLuogo>
          ))}
        </div>
      )}
      <p className="fonte">Source: <a href={FONTI.parcheggi} target="_blank" rel="noopener" hrefLang="it">Tourist Office, Car Parks Department</a> (0549 883808). Fares may change.</p>
    </>
  );
}
