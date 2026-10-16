import Link from "next/link";
import TestaPagina from "@/components/Indietro";
import SchedaLuogo from "@/components/SchedaLuogo";
import { Icona } from "@/components/Icona";
import { getParcheggi } from "@/lib/servizi";
import { FONTI } from "@/lib/fonti";
import { alternati } from "@/lib/lingua";

export const revalidate = 300;

export const metadata = { title: "Parcheggi · 739 San Marino", alternates: alternati("/utili/parcheggi", "/en/parking", "it") };

export default async function Parcheggi() {
  const parcheggi = await getParcheggi();
  return (
    <>
      <TestaPagina href="/vivere" verso="Vivere" etichetta="Muoversi" titolo="Parcheggi">
        <p className="sottotitolo">A pagamento dalle 8 alle 20 da ottobre a marzo, dalle 8 alle 24 da aprile a settembre. Il multipiano P9 è il più grande ed è collegato al centro con gli ascensori.</p>
      </TestaPagina>
      <Link prefetch={false} href="/mappa" className="bottone secondario premibile"><Icona nome="mappa" size={20} /> Vedili sulla mappa</Link>
      {parcheggi.length === 0 ? (
        <p className="vuoto">Elenco dei parcheggi in arrivo.</p>
      ) : (
        <div className="lista">
          {parcheggi.map((p) => (
            <SchedaLuogo key={p.id} l={p}>
              {p.descrizione ? <span style={{ fontSize: 14, color: "var(--testo-2)" }}>{p.descrizione}</span> : null}
              {p.tariffa || p.posti ? (
                <span className="meta" style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                  <Icona nome="parcheggio" size={14} />
                  <span>{[p.posti ? `${p.posti} posti` : null, p.tariffa].filter(Boolean).join(", ")}</span>
                </span>
              ) : null}
            </SchedaLuogo>
          ))}
        </div>
      )}
      <p className="fonte">Fonte: <a href={FONTI.parcheggi} target="_blank" rel="noopener">Ufficio del Turismo, Settore Parcheggi</a> (0549 883808). Tariffe soggette a variazioni.</p>
    </>
  );
}
