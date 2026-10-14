"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CATEGORIE, etichettaGiorno, ora, type Castello, type Evento, type Luogo } from "@/lib/data";
import { Icona, type NomeIcona } from "./Icona";

type Voce = { href: string; titolo: string; sotto: string; icona: NomeIcona; testo: string };

const PAGINE: { href: string; titolo: string; sotto: string; icona: NomeIcona; parole: string }[] = [
  { href: "/utili/farmacie", titolo: "Farmacie aperte", sotto: "Chi è aperto adesso", icona: "farmacia", parole: "farmacia farmacie medicine turno cailungo" },
  { href: "/utili/trasporti", titolo: "Funivia e bus", sotto: "Prossime partenze", icona: "funivia", parole: "funivia bus autobus rimini orari trasporti smuvi" },
  { href: "/utili/rifiuti", titolo: "Raccolta rifiuti", sotto: "Calendario per castello", icona: "rifiuti", parole: "rifiuti raccolta spazzatura differenziata carta plastica vetro organico" },
  { href: "/utili/parcheggi", titolo: "Parcheggi", sotto: "Posti e tariffe", icona: "parcheggio", parole: "parcheggi parcheggio auto camper bus p9 multipiano" },
  { href: "/utili", titolo: "Numeri di emergenza", sotto: "112, 113, 115, 118", icona: "scudo", parole: "emergenza emergenze 112 113 115 118 polizia ambulanza vigili fuoco" },
  { href: "/sport", titolo: "Sport e partite", sotto: "Partite, squadre e classifiche", icona: "sport", parole: "sport partita partite calcetto padel tennis basket pallavolo rating classifica" },
  { href: "/eventi", titolo: "Calendario eventi", sotto: "Cosa succede", icona: "eventi", parole: "eventi calendario concerti serate" },
  { href: "/mappa", titolo: "Mappa", sotto: "Luoghi e servizi", icona: "mappa", parole: "mappa luoghi dove" },
  { href: "/castelli", titolo: "Classifica dei castelli", sotto: "La sfida in metri", icona: "castelli", parole: "castelli classifica metri sfida" },
  { href: "/profile", titolo: "Il mio SMR ID", sotto: "Tessera, QR e profilo", icona: "id", parole: "smr id profilo tessera qr account accesso password" },
  { href: "/guida", titolo: "Come funziona 739", sotto: "Guida", icona: "utili", parole: "guida aiuto come funziona metri" },
  { href: "/food", titolo: "Food", sotto: "Ristoranti e negozi, in arrivo", icona: "food", parole: "food ristoranti bar negozi mangiare" },
  { href: "/business", titolo: "Business", sotto: "Network aziendale, in arrivo", icona: "business", parole: "business aziende imprese lavoro" },
];

const SUGGERIMENTI = ["Farmacie", "Funivia", "Parcheggi", "Calcetto", "Raccolta"];

/** Toglie maiuscole e accenti: "Città" e "citta" sono la stessa cosa. */
function pulisci(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export default function Ricerca({ eventi, luoghi, castelli }: { eventi: Evento[]; luoghi: Luogo[]; castelli: Castello[] }) {
  const [q, setQ] = useState("");

  const indice = useMemo(() => {
    const gruppi: { nome: string; voci: Voce[] }[] = [
      { nome: "Servizi e sezioni", voci: PAGINE.map((p) => ({ href: p.href, titolo: p.titolo, sotto: p.sotto, icona: p.icona, testo: pulisci(`${p.titolo} ${p.parole}`) })) },
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
          href: `/mappa?luogo=${l.id}`,
          titolo: l.nome,
          sotto: [CATEGORIE[l.categoria] ?? l.categoria, l.indirizzo].filter(Boolean).join(", "),
          icona: (l.categoria === "farmacia" ? "farmacia" : l.categoria === "parcheggio" ? "parcheggio" : l.categoria === "trasporti" ? "funivia" : "pin") as NomeIcona,
          testo: pulisci(`${l.nome} ${CATEGORIE[l.categoria] ?? l.categoria} ${l.indirizzo ?? ""} ${l.descrizione ?? ""}`),
        })),
      },
      {
        nome: "Castelli",
        voci: castelli.map((c) => ({ href: `/castelli/${c.slug}`, titolo: c.nome, sotto: "Castello", icona: "castelli" as NomeIcona, testo: pulisci(`${c.nome} castello`) })),
      },
    ];
    return gruppi;
  }, [eventi, luoghi, castelli]);

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
        <p className="rounded-2xl border border-dashed border-linea p-5 text-sm text-testo-2">Nessun risultato per «{q.trim()}». Prova con un&apos;altra parola.</p>
      ) : (
        risultati.map((g) => (
          <section key={g.nome} className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-testo-2">{g.nome}</h2>
            <ul className="flex flex-col gap-1.5">
              {g.voci.map((v) => (
                <li key={v.href}>
                  <Link href={v.href} className="flex items-center gap-3 rounded-xl bg-superficie p-3 transition-colors hover:bg-superficie-2 active:scale-[0.98]">
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
