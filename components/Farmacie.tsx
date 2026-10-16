"use client";

import type { Luogo } from "@/lib/data";
import { apertura } from "@/lib/orario";
import SchedaLuogo from "./SchedaLuogo";
import { useAdesso } from "@/lib/useAdesso";
import { Icona } from "./Icona";
import { riapreEn, type Lingua } from "@/lib/lingua";
import { traduci } from "@/lib/traduci";


function Stato({ l, ora, lingua }: { l: Luogo; ora: Date | null; lingua: Lingua }) {
  const a = ora ? apertura(l.orari_settimana, ora) : null;
  if (!a) return null;
  if (lingua === "en") {
    if (a.sempre) return <span className="spia-mini aperta">Always open</span>;
    if (a.aperta) return <span className="spia-mini aperta">Open, closes at {a.chiude}</span>;
    return <span className="spia-mini">Closed{a.riapre ? `, opens ${riapreEn(a.riapre)}` : ""}</span>;
  }
  if (a.sempre) return <span className="spia-mini aperta">Sempre aperta</span>;
  if (a.aperta) return <span className="spia-mini aperta">Aperta, chiude alle {a.chiude}</span>;
  return <span className="spia-mini">Chiusa{a.riapre ? `, riapre ${a.riapre}` : ""}</span>;
}

/** Numero di farmacie aperte adesso, per le tessere di Oggi e Vivere. */
export function ConteggioAperte({ farmacie, testo = false, breve = false, lingua = "it" }: { farmacie: Luogo[]; testo?: boolean; breve?: boolean; lingua?: Lingua }) {
  const ora = useAdesso();
  if (!ora) return testo || breve ? <>…</> : <span className="grande">–</span>;
  const n = farmacie.filter((f) => apertura(f.orari_settimana, ora)?.aperta).length;
  if (lingua === "en") return <span className="grande">{n}<small>open</small></span>;
  // Fuori dalla sezione farmacie (es. Esplora) serve dire di cosa si parla
  if (breve) return <><b className="font-mono font-medium text-testo">{n}</b> {n === 1 ? "farmacia aperta" : "farmacie aperte"} adesso</>;
  if (testo) return <><b>{n}</b> {n === 1 ? "aperta" : "aperte"} adesso, Cailungo sempre</>;
  return <span className="grande">{n}<small>{n === 1 ? "aperta" : "aperte"}</small></span>;
}

export default function ElencoFarmacie({ farmacie, lingua = "it" }: { farmacie: Luogo[]; lingua?: Lingua }) {
  const en = lingua === "en";
  const ora = useAdesso();
  const aperte = ora ? farmacie.filter((f) => apertura(f.orari_settimana, ora)?.aperta) : [];
  // Prima le aperte, poi le altre; Cailungo (sempre aperta) in cima
  const ordinate = ora
    ? [...farmacie].sort((a, b) => {
        const pa = apertura(a.orari_settimana, ora);
        const pb = apertura(b.orari_settimana, ora);
        const peso = (p: ReturnType<typeof apertura>) => (p?.sempre ? 0 : p?.aperta ? 1 : 2);
        return peso(pa) - peso(pb);
      })
    : farmacie;

  return (
    <>
      <section className="turno pannello topo" aria-live="polite">
        <span className={aperte.length ? "spia" : "spia spenta"}>{en ? "Now" : "Adesso"}</span>
        {en ? (
          <>
            <h2>{ora ? `${aperte.length} ${aperte.length === 1 ? "pharmacy open" : "pharmacies open"}` : "Open pharmacies"}</h2>
            <p style={{ color: "var(--pannello-testo)", fontSize: 15 }}>
              At night and on public holidays the <b style={{ color: "#fff" }}>Cailungo pharmacy</b>, at the State Hospital, is always open: 24 hours a day (from 23:00 to 6:00 for urgent cases only). On public holidays the one in Città opens too.
            </p>
          </>
        ) : (
          <>
            <h2>{ora ? `${aperte.length} ${aperte.length === 1 ? "farmacia aperta" : "farmacie aperte"}` : "Farmacie aperte"}</h2>
            <p style={{ color: "var(--pannello-testo)", fontSize: 15 }}>
              Di notte e nei festivi c&apos;è sempre la <b style={{ color: "#fff" }}>farmacia di Cailungo</b>, all&apos;Ospedale di Stato: aperta 24 ore su 24 (dalle 23 alle 6 solo urgenze). Nei festivi apre anche quella di Città.
            </p>
          </>
        )}
        <a href="tel:0549994222" className="bottone primario-chiaro premibile" style={{ marginTop: 6, position: "relative", zIndex: 2 }}>
          <Icona nome="telefono" size={20} /> Cailungo: 0549 994222
        </a>
      </section>

      <section className="sezione">
        <div className="sezione-head"><h2>{en ? "All pharmacies" : "Tutte le farmacie"}</h2><span className="meta">{farmacie.length}</span></div>
        {farmacie.length === 0 ? (
          <p className="vuoto">{en ? "Pharmacy list coming soon." : "Elenco delle farmacie in arrivo."}</p>
        ) : (
          <div className="lista">
            {ordinate.map((f) => (
              <SchedaLuogo key={f.id} l={f} lingua={lingua}>
                <Stato l={f} ora={ora} lingua={lingua} />
                {f.orari ? <span className="meta" style={{ display: "flex", gap: 6, alignItems: "flex-start" }}><Icona nome="orologio" size={14} /> {en ? traduci(f.orari) : f.orari}</span> : null}
              </SchedaLuogo>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
