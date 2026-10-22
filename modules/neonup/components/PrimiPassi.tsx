"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icona } from "@/components/Icona";
import {
  articoli, azienda as leggiAzienda, conti, hubStato, magArticoli, persone, puoGestire, soggetti, vedeConti, type VoceDocumento,
} from "../api";
import { useAzienda } from "./Guscio";

type Passo = { fatto: boolean; titolo: string; testo: string; href: string; facoltativo?: boolean };
const chiave = (id: string) => `neonup-primi-passi-${id}`;

/** Nel Cruscotto, per titolare e amministrazione: i primi passi, spuntati dai dati veri, finché non sono fatti o li chiudi */
export default function PrimiPassi({ documenti }: { documenti: VoceDocumento[] }) {
  const az = useAzienda();
  const [passi, setPassi] = useState<Passo[] | null>(null);
  const [chiuso, setChiuso] = useState(true);

  useEffect(() => {
    try { setChiuso(localStorage.getItem(chiave(az.id)) === "1"); } catch { setChiuso(false); }
  }, [az.id]);

  useEffect(() => {
    if (!puoGestire(az.ruolo)) return;
    const base = `/neonup/${az.id}`;
    Promise.all([leggiAzienda(az.id), soggetti(az.id), articoli(az.id), hubStato(az.id), magArticoli(az.id), persone(az.id),
      vedeConti(az.ruolo) ? conti(az.id) : Promise.resolve(null)]).then(([a, s, ar, h, m, p, c]) => {
      const x = a.azienda;
      setPassi([
        { fatto: !!(x?.indirizzo && x.cap && x.comune), titolo: "I dati in fattura", testo: "Indirizzo, CAP, comune e IBAN dell'azienda.", href: `${base}/azienda` },
        { fatto: !!(x?.cod_oe && x.fe_dal), titolo: "Codice operatore e fattura elettronica", testo: "Il COE e la data di inizio fissata su TribWEB.", href: `${base}/azienda` },
        { fatto: s.soggetti.length > 0, titolo: "Il primo cliente", testo: "Con il codice operatore, se è sammarinese.", href: `${base}/clienti` },
        { fatto: ar.articoli.length > 0, titolo: "Il primo articolo", testo: "Prezzo e tipo merce riempiono le righe da sole.", href: `${base}/articoli` },
        { fatto: documenti.some((d) => d.stato === "emesso"), titolo: "Il primo documento emesso", testo: "Un preventivo, un DDT o una fattura.", href: `${base}/documenti` },
        { fatto: h.hub?.stato === "ok", titolo: "Il collegamento con l'HUB-SM", testo: "Le fatture elettroniche partono da NeonUp. Lo fa il titolare con il TokenFE.", href: `${base}/azienda#hub`, facoltativo: true },
        { fatto: m.impostazioni.some((i) => i.gestito), titolo: "Il magazzino", testo: "Se vendi merce: un articolo a magazzino e il primo carico.", href: `${base}/magazzino`, facoltativo: true },
        ...(c ? [{ fatto: c.conti.length > 0, titolo: "La cassa e la banca", testo: "Un conto con il saldo di partenza, per incassi e scadenze.", href: `${base}/contabilita`, facoltativo: true }] : []),
        { fatto: p.persone.length > 1, titolo: "Chi lavora con te", testo: "Collaboratori e commercialista, con la tessera del loro SMR ID.", href: `${base}/azienda`, facoltativo: true },
      ]);
    });
  }, [az.id, az.ruolo, documenti]);

  if (!puoGestire(az.ruolo)) {
    return <p className="text-[14px] text-testo-2">Nuovo in NeonUp? <Link href="/neonup/guida" className="font-semibold text-accento">Come funziona, sezione per sezione</Link>.</p>;
  }
  if (!passi) return null;
  const fatti = passi.filter((p) => p.fatto).length;
  const obbligatori = passi.filter((p) => !p.facoltativo);
  if (chiuso || fatti === passi.length) {
    return <p className="text-[14px] text-testo-2"><Link href="/neonup/guida" className="font-semibold text-accento">Come funziona NeonUp</Link>, sezione per sezione.</p>;
  }

  function chiudi() {
    try { localStorage.setItem(chiave(az.id), "1"); } catch { /* senza memoria si richiude la prossima volta */ }
    setChiuso(true);
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-linea p-5" aria-labelledby="t-passi">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="t-passi" className="text-[19px] font-semibold tracking-tight">Primi passi</h2>
          <p className="text-[14px] text-testo-2">
            {fatti} su {passi.length} fatti{obbligatori.every((p) => p.fatto) ? ": l'essenziale c'è, il resto serve se ti serve" : ""}. <Link href="/neonup/guida" className="font-semibold text-accento">Come funziona NeonUp</Link>
          </p>
        </div>
        <button type="button" onClick={chiudi} aria-label="Nascondi i primi passi" className="text-testo-2"><Icona nome="chiudi" size={20} /></button>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-superficie" aria-hidden>
        <div className="h-full bg-[#09090B]" style={{ width: `${(fatti / passi.length) * 100}%` }} />
      </div>
      <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {passi.map((p) => (
          <li key={p.titolo}>
            <Link href={p.href} className={`flex h-full gap-3 rounded-xl p-3 transition-colors ${p.fatto ? "bg-fondo" : "bg-superficie hover:bg-superficie-2"}`}>
              <span aria-hidden className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ${p.fatto ? "bg-[#09090B] text-white" : "border-2 border-linea"}`}>
                {p.fatto ? <Icona nome="spunta" size={12} /> : null}
              </span>
              <span className="flex flex-col gap-0.5">
                <span className={`text-[14px] font-semibold ${p.fatto ? "text-testo-2 line-through" : ""}`}>{p.titolo}{p.facoltativo && !p.fatto ? <span className="font-normal text-testo-2">, se ti serve</span> : null}</span>
                {!p.fatto ? <span className="text-[13px] leading-snug text-testo-2">{p.testo}</span> : null}
                <span className="sr-only">{p.fatto ? "Fatto" : "Da fare"}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
