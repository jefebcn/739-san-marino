"use client";

import { useEffect, useMemo, useState } from "react";
import ActionCard from "@/components/ui/ActionCard";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { Icona } from "@/components/Icona";
import { etichettaGiorno, ora } from "@/lib/data";
import { useSessione } from "@/modules/core/store";
import { elencoPartite } from "../api";
import { distanzaKm, testoDistanza } from "../geo";
import { useSport } from "../store";
import type { Partita, Sport } from "../tipi";
import NuovaPartita from "./NuovaPartita";

const STATO_POSIZIONE: Record<string, string> = {
  ricerca: "Cerco la tua posizione…",
  negata: "Posizione negata: attivala nelle impostazioni del browser.",
  "non-disponibile": "Posizione non disponibile su questo dispositivo.",
};

function Posti({ p }: { p: Partita }) {
  const pieni = p.iscritti >= p.posti;
  return (
    <span className="mt-2 flex items-center gap-2.5">
      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-superficie-2">
        <span className="block h-full rounded-full bg-metallo" style={{ width: `${Math.min(100, (p.iscritti / p.posti) * 100)}%` }} />
      </span>
      <span className="font-mono text-xs text-testo-2">{pieni ? "completa" : `${p.posti - p.iscritti} posti liberi`}</span>
    </span>
  );
}

export default function ListaPartite({ sport }: { sport: Sport[] }) {
  const { sport: filtro, posizione, statoPosizione, attivaPosizione, spegniPosizione } = useSport();
  const stato = useSessione((s) => s.stato);
  const [partite, setPartite] = useState<Partita[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [nuova, setNuova] = useState(false);

  // Dalle azioni rapide: /sport?nuova=1 apre subito il modulo
  useEffect(() => {
    if (stato === "connesso" && new URLSearchParams(window.location.search).get("nuova") === "1") setNuova(true);
  }, [stato]);

  useEffect(() => {
    if (stato === "caricamento") return;
    let attivo = true;
    setPartite(null);
    elencoPartite(filtro).then((r) => {
      if (!attivo) return;
      setPartite(r.partite);
      setErrore(r.errore);
    });
    return () => {
      attivo = false;
    };
  }, [filtro, stato]);

  // Location scanning: con la posizione attiva, prima le partite più vicine
  const ordinate = useMemo(() => {
    if (!partite) return null;
    const conDistanza = partite.map((p) => ({ p, km: posizione && p.lat != null && p.lng != null ? distanzaKm(posizione, { lat: p.lat, lng: p.lng }) : null }));
    if (posizione) conDistanza.sort((a, b) => (a.km ?? Infinity) - (b.km ?? Infinity));
    return conDistanza;
  }, [partite, posizione]);

  const nomeSport = (id: string) => sport.find((s) => s.id === id)?.nome ?? id;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <PrimaryButton
          variante={posizione ? "primario" : "secondario"}
          dimensione="sm"
          icona={<Icona nome="pin" />}
          onClick={posizione ? spegniPosizione : attivaPosizione}
          className="flex-1"
        >
          {posizione ? "Vicino a me: attivo" : "Vicino a me"}
        </PrimaryButton>
        {stato === "connesso" ? (
          <PrimaryButton dimensione="sm" onClick={() => setNuova((v) => !v)} className="flex-1">Organizza</PrimaryButton>
        ) : (
          <PrimaryButton href="/profile" dimensione="sm" variante="secondario" className="flex-1">Accedi per giocare</PrimaryButton>
        )}
      </div>
      {STATO_POSIZIONE[statoPosizione] ? <p className="text-xs text-testo-2">{STATO_POSIZIONE[statoPosizione]}</p> : null}

      {nuova ? <NuovaPartita sport={sport} chiudi={() => setNuova(false)} /> : null}

      {errore ? <p role="alert" className="rounded-2xl bg-segnale/12 px-4 py-3 text-sm text-segnale">{errore}</p> : null}

      {!ordinate ? (
        <div className="flex flex-col gap-2.5" aria-busy="true">
          {[0, 1, 2].map((i) => <div key={i} className="h-[92px] animate-pulse rounded-2xl bg-superficie" />)}
        </div>
      ) : ordinate.length === 0 ? (
        <div className="flex flex-col items-start gap-2 rounded-2xl bg-superficie p-5">
          <p className="text-[15px] font-semibold">Nessuna partita in programma{filtro ? ` di ${nomeSport(filtro).toLowerCase()}` : ""}.</p>
          <p className="text-sm text-testo-2">Organizzane una: chi si iscrive viene messo in squadre bilanciate in base al rating.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {ordinate.map(({ p, km }) => (
            <li key={p.id}>
              <ActionCard
                href={`/sport/${p.id}`}
                icona={<Icona nome="sport" />}
                titolo={p.titolo}
                descrizione={`${etichettaGiorno(p.inizio)} alle ${ora(p.inizio)}, ${p.luogo_nome}`}
                extra={
                  p.sono_organizzatore ? <span className="text-xs font-medium text-accento">Organizzi tu</span>
                  : p.sono_iscritto ? <span className="text-xs font-medium text-ok">Iscritto</span>
                  : <span className="text-xs text-testo-2">{nomeSport(p.sport_id)}</span>
                }
              >
                <Posti p={p} />
                {km != null ? <span className="mt-1 font-mono text-xs text-accento">a {testoDistanza(km)}</span> : null}
              </ActionCard>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
