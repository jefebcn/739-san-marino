"use client";

import { useEffect, useState } from "react";
import type { Castello } from "@/lib/data";
import { adessoSM, GIORNI, GIORNI_BREVI } from "@/lib/orario";
import { FRAZIONI, type Raccolta } from "@/lib/servizi";
import { useCastelloScelto } from "./Castello";

const CHIAVE_ZONA = "739-raccolta-zona";

function leggiZona() {
  try {
    return localStorage.getItem(CHIAVE_ZONA);
  } catch {
    return null;
  }
}

function zoneDi(righe: Raccolta[]) {
  return Array.from(new Set(righe.map((r) => r.zona)));
}

function frazioniDel(righe: Raccolta[], dow: number) {
  return righe.filter((r) => r.giorni.includes(dow));
}

function nomeFrazione(f: string) {
  return FRAZIONI[f]?.nome ?? f;
}

function Elenco({ righe }: { righe: Raccolta[] }) {
  if (righe.length === 0) return <span style={{ fontWeight: 600 }}>Nessuna raccolta</span>;
  return (
    <span style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {righe.map((r) => (
        <span key={r.frazione} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <span className="frazione" style={{ background: FRAZIONI[r.frazione]?.colore, marginTop: 5 }} />
          <span>
            <b style={{ fontWeight: 600, display: "block", lineHeight: 1.3 }}>{nomeFrazione(r.frazione)}</b>
            {r.note ? <span className="meta" style={{ fontSize: 11 }}>{r.note}</span> : null}
          </span>
        </span>
      ))}
    </span>
  );
}

/** Riga breve per la tessera in Utili: cosa si raccoglie domani nel tuo castello. */
export function RaccoltaBreve({ raccolta, castelli }: { raccolta: Raccolta[]; castelli: Castello[] }) {
  const slug = useCastelloScelto();
  const [stato, setStato] = useState<{ dow: number; zona: string | null } | null>(null);
  useEffect(() => setStato({ dow: adessoSM().dow, zona: leggiZona() }), []);
  const c = castelli.find((x) => x.slug === slug);
  if (!stato) return <>…</>;
  if (!c) return <>Scegli il tuo castello per vedere il calendario</>;
  const righe = raccolta.filter((r) => r.castello_id === c.id);
  if (righe.length === 0) return <>{c.nome}: cassonetti stradali, niente porta a porta</>;
  const zone = zoneDi(righe);
  const zona = stato.zona && zone.includes(stato.zona) ? stato.zona : zone[0];
  const domani = frazioniDel(righe.filter((r) => r.zona === zona), (stato.dow % 7) + 1);
  return (
    <>
      {c.nome}{zone.length > 1 ? ` (${zona.toLowerCase()})` : ""} · domani <b>{domani.length ? domani.map((r) => nomeFrazione(r.frazione)).join(", ") : "niente"}</b>
    </>
  );
}

export default function CalendarioRaccolta({ raccolta, castelli }: { raccolta: Raccolta[]; castelli: Castello[] }) {
  const mio = useCastelloScelto();
  const ordinati = [...castelli].sort((a, b) => a.id - b.id);
  const [scelto, setScelto] = useState<string | null>(null);
  const [zonaScelta, setZonaScelta] = useState<string | null>(null);
  const [dow, setDow] = useState<number | null>(null);
  useEffect(() => {
    setDow(adessoSM().dow);
    setZonaScelta(leggiZona());
  }, []);

  const slug = scelto ?? mio ?? ordinati[0]?.slug;
  const c = ordinati.find((x) => x.slug === slug);
  const tutte = c ? raccolta.filter((r) => r.castello_id === c.id) : [];
  const zone = zoneDi(tutte);
  const zona = zonaScelta && zone.includes(zonaScelta) ? zonaScelta : zone[0];
  const righe = tutte.filter((r) => r.zona === zona);
  const verificare = righe.some((r) => r.da_verificare);
  const usate = Object.keys(FRAZIONI).filter((f) => righe.some((r) => r.frazione === f));
  const domani = dow ? (dow % 7) + 1 : null;

  const scegliZona = (z: string) => {
    setZonaScelta(z);
    try {
      localStorage.setItem(CHIAVE_ZONA, z);
    } catch {}
  };

  return (
    <>
      <div className="chips" role="group" aria-label="Castello">
        {ordinati.map((x) => (
          <button key={x.id} type="button" className="chip" aria-pressed={x.slug === slug} onClick={() => setScelto(x.slug)}>
            <span className="punto" style={{ background: x.colore, width: 10, height: 10, borderRadius: 3 }} />
            {x.nome}
          </button>
        ))}
      </div>

      {tutte.length === 0 ? (
        <p className="vuoto">
          A {c?.nome ?? "questo castello"} non c&apos;è ancora la raccolta porta a porta: si usano i cassonetti stradali.
        </p>
      ) : (
        <>
          <section className="sezione" style={{ gap: 8 }}>
            <span className="etichetta">{zone.length > 1 ? "La tua zona" : "Zona"}</span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {zone.map((z) => (
                <button key={z} type="button" className="chip" aria-pressed={z === zona} onClick={() => scegliZona(z)}>{z}</button>
              ))}
            </div>
            <p className="meta">
              {zone.length > 1
                ? "Alta o bassa densità dipende dalla via: controlla l'ecocalendario della tua zona sul sito AASS."
                : `A ${c?.nome} il calendario porta a porta c'è solo per il ${zona.toLowerCase()}.`}
            </p>
          </section>

          <div className="adesso">
            <div className="card" style={{ background: "var(--accento-tenue)" }}>
              <span className="etichetta">Oggi{dow ? ` · ${GIORNI_BREVI[dow - 1]}` : ""}</span>
              {dow ? <Elenco righe={frazioniDel(righe, dow)} /> : <span>…</span>}
            </div>
            <div className="card">
              <span className="etichetta">Domani{domani ? ` · ${GIORNI_BREVI[domani - 1]}` : ""}</span>
              {domani ? <Elenco righe={frazioniDel(righe, domani)} /> : <span>…</span>}
            </div>
          </div>

          <section className="sezione">
            <div className="sezione-head">
              <h2>La settimana</h2>
              {verificare ? <span className="verifica">Da verificare</span> : null}
            </div>
            <div className="settimana">
              {GIORNI_BREVI.map((g, i) => (
                <div key={g} aria-current={dow === i + 1 ? "date" : undefined} aria-label={`${GIORNI[i]}: ${frazioniDel(righe, i + 1).map((r) => nomeFrazione(r.frazione)).join(", ") || "nessuna raccolta"}`}>
                  <span className="gg">{g}</span>
                  {frazioniDel(righe, i + 1).map((r) => (
                    <span key={r.frazione} className="frazione" style={{ background: FRAZIONI[r.frazione]?.colore, width: 18, height: 18, borderRadius: 5 }} />
                  ))}
                </div>
              ))}
            </div>
            <div className="legenda">
              {usate.map((f) => (
                <span key={f}><span className="frazione" style={{ background: FRAZIONI[f].colore }} />{FRAZIONI[f].nome}</span>
              ))}
            </div>
            {righe[0]?.orario ? <p className="meta">{righe[0].orario} Nelle settimane con festivi i giorni possono cambiare.</p> : null}
          </section>
        </>
      )}

      <section className="card">
        <h3>Ingombranti, sfalci e pannolini</h3>
        <span style={{ fontSize: 14, color: "var(--testo-2)" }}>Si ritirano su richiesta. Centro di raccolta di San Giovanni (Strada IV Gualdaria): lunedì–sabato 8.00–17.30.</span>
        <div className="riga-azioni">
          <a className="azione-mini premibile" href="tel:0549883700">Chiama AASS · 0549 883700</a>
        </div>
      </section>
    </>
  );
}
