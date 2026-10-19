"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CATEGORIE, etichettaGiorno, ora, type Castello, type Evento, type Luogo, type PraticaDi } from "@/lib/data";
import { Icona, type NomeIcona } from "./Icona";
import { Vuoto } from "./Tano";
import { AREE } from "@/lib/aree";

type Voce = { href: string; titolo: string; sotto: string; icona: NomeIcona; testo: string };

// Pagine fisse; aree e sezioni arrivano da lib/aree.ts
const FISSE: { href: string; titolo: string; sotto: string; icona: NomeIcona; parole: string }[] = [
  { href: "/vivere", titolo: "Numeri di emergenza", sotto: "112, 113, 115, 118", icona: "scudo", parole: "emergenza emergenze 112 113 115 118 polizia ambulanza vigili fuoco" },
  { href: "/mappa", titolo: "Mappa", sotto: "Luoghi e servizi", icona: "mappa", parole: "mappa luoghi dove" },
  { href: "/profile", titolo: "Il mio SMR ID", sotto: "Tessera, QR e profilo", icona: "id", parole: "smr id profilo tessera qr account accesso password" },
  { href: "/bollettino", titolo: "Il Bollettino", sotto: "Ogni mattina alle 7:39", icona: "stampa", parole: "bollettino oggi notizie mattina meteo avvisi 739" },
  { href: "/rubriche", titolo: "Rubriche", sotto: "Bollettino, castello della settimana, weekend, storie", icona: "storie", parole: "rubriche storie bollettino castello settimana weekend vetta come si fa liste" },
  { href: "/guida", titolo: "Come funziona 739", sotto: "Guida", icona: "utili", parole: "guida aiuto come funziona metri" },
];

const PAGINE = [
  ...AREE.map((a) => ({ href: a.href, titolo: a.nome, sotto: a.descrizione, icona: a.icona, parole: `area ${a.sezioni.map((x) => x.nome).join(" ")}` })),
  ...AREE.flatMap((a) =>
    a.sezioni.map((x) => ({
      href: x.href ?? `${a.href}#${x.slug}`,
      titolo: x.nome,
      sotto: x.href ? `${a.nome}, ${x.descrizione}` : `${a.nome}, in arrivo`,
      icona: x.icona,
      parole: `${a.nome} ${x.descrizione} ${x.parole ?? ""}`,
    })),
  ),
  ...FISSE,
];

const SUGGERIMENTI = ["Farmacie", "Funivia", "Parcheggi", "Calcetto", "Raccolta"];

/** Toglie maiuscole e accenti: "Città" e "citta" sono la stessa cosa. */
function pulisci(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Un sentiero di Itinerari, già pronto per la ricerca */
export type SentieroCercato = { slug: string; titolo: string; sotto: string; testo: string };

export default function Ricerca({ eventi, luoghi, castelli, pratiche = [], sentieri = [] }: { eventi: Evento[]; luoghi: Luogo[]; castelli: Castello[]; pratiche?: PraticaDi[]; sentieri?: SentieroCercato[] }) {
  const [q, setQ] = useState("");
  // Dalla casella della testata su computer si arriva con /cerca?q=…
  useEffect(() => {
    const iniziale = new URLSearchParams(window.location.search).get("q");
    if (iniziale) setQ(iniziale);
  }, []);

  const indice = useMemo(() => {
    const gruppi: { nome: string; voci: Voce[] }[] = [
      { nome: "Servizi e sezioni", voci: PAGINE.map((p) => ({ href: p.href, titolo: p.titolo, sotto: p.sotto, icona: p.icona, testo: pulisci(`${p.titolo} ${p.parole}`) })) },
      {
        // «Cosa devo fare»: le pratiche delle schede di uffici e salute
        nome: "Pratiche",
        voci: pratiche.map((p) => ({
          href: `/luoghi/${p.luogo_id}#pratica-${p.indice}`,
          titolo: p.titolo,
          sotto: p.luogo,
          icona: "uffici" as NomeIcona,
          testo: pulisci(`${p.titolo} ${p.testo ?? ""} ${(p.documenti ?? []).join(" ")} ${p.luogo}`),
        })),
      },
      {
        nome: "Eventi",
        voci: eventi.map((e) => ({
          href: `/eventi/${e.id}`,
          titolo: e.titolo,
          sotto: `${etichettaGiorno(e.inizio)} alle ${ora(e.inizio)}${e.luogo ? `, ${e.luogo.nome}` : ""}`,
          icona: "eventi" as NomeIcona,
          testo: pulisci(`${e.titolo} ${e.descrizione ?? ""} ${e.luogo?.nome ?? ""} ${e.castello?.nome ?? ""} ${e.organizzatore ?? ""}`),
        })),
      },
      {
        nome: "Luoghi",
        voci: luoghi.map((l) => ({
          href: `/luoghi/${l.id}`,
          titolo: l.nome,
          sotto: [CATEGORIE[l.categoria] ?? l.categoria, l.indirizzo].filter(Boolean).join(", "),
          icona: (l.categoria === "farmacia" ? "farmacia" : l.categoria === "parcheggio" ? "parcheggio" : l.categoria === "trasporti" ? "funivia" : "pin") as NomeIcona,
          testo: pulisci(`${l.nome} ${CATEGORIE[l.categoria] ?? l.categoria} ${l.indirizzo ?? ""} ${l.descrizione ?? ""}`),
        })),
      },
      {
        nome: "Sentieri",
        voci: sentieri.map((x) => ({ href: `/uscire/itinerari/${x.slug}`, titolo: x.titolo, sotto: x.sotto, icona: "itinerari" as NomeIcona, testo: pulisci(`${x.titolo} sentiero ${x.testo}`) })),
      },
      {
        nome: "Castelli",
        voci: castelli.map((c) => ({ href: `/castelli/${c.slug}`, titolo: c.nome, sotto: "Castello", icona: "castelli" as NomeIcona, testo: pulisci(`${c.nome} castello`) })),
      },
    ];
    return gruppi;
  }, [eventi, luoghi, castelli, pratiche, sentieri]);

  const parole = pulisci(q).split(/\s+/).filter(Boolean);
  const risultati = parole.length
    ? indice.map((g) => ({ ...g, voci: g.voci.filter((v) => parole.every((p) => v.testo.includes(p))).slice(0, 8) })).filter((g) => g.voci.length)
    : [];

  return (
    <div className="flex flex-col gap-5">
      <label className="relative block">
        <span className="sr-only">Cerca</span>
        <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-testo-2"><Icona nome="cerca" size={20} /></span>
        <input
          type="search"
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cerca eventi, luoghi e servizi"
          enterKeyHint="search"
          className="h-12 w-full rounded-xl border border-linea bg-superficie pr-4 pl-12 text-[16px] text-testo outline-none placeholder:text-testo-2/70 focus:border-accento"
        />
      </label>

      {!parole.length ? (
        <section className="flex flex-col gap-3">
          <span className="text-sm font-medium text-testo-2">Prova con</span>
          <div className="flex flex-wrap gap-2">
            {SUGGERIMENTI.map((s) => (
              <button key={s} type="button" onClick={() => setQ(s)} className="h-9 rounded-xl bg-superficie px-3.5 text-sm font-medium hover:bg-superficie-2">{s}</button>
            ))}
          </div>
        </section>
      ) : risultati.length === 0 ? (
        <Vuoto titolo={`Nessun risultato per «${q.trim()}»`} testo="Prova con un'altra parola, o guarda cosa c'è nelle cinque aree." azione={{ href: "/esplora", testo: "Vai a Esplora" }} />
      ) : (
        risultati.map((g) => (
          <section key={g.nome} className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-testo-2">{g.nome}</h2>
            <ul className="flex flex-col gap-1.5">
              {g.voci.map((v) => (
                <li key={`${v.href}-${v.titolo}`}>
                  <Link href={v.href} prefetch={v.href.startsWith("/mappa") ? false : undefined} className="flex items-center gap-3 rounded-xl bg-superficie p-3 transition-colors hover:bg-superficie-2 active:scale-[0.98]">
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-fondo text-testo"><Icona nome={v.icona} size={20} /></span>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-[15px] font-semibold">{v.titolo}</span>
                      <span className="truncate text-[13px] text-testo-2">{v.sotto}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
