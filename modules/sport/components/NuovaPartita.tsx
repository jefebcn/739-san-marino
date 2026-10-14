"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { Campo } from "@/modules/core/components/Accesso";
import { adessoSM, dataOraSM } from "@/lib/orario";
import { creaPartita } from "../api";
import { aSanMarino } from "../geo";
import type { Sport } from "../tipi";

function domani() {
  const { data } = adessoSM(new Date(Date.now() + 86400000));
  return data;
}

/** Modulo per organizzare una partita: chi la crea è già iscritto. */
export default function NuovaPartita({ sport, chiudi }: { sport: Sport[]; chiudi: () => void }) {
  const router = useRouter();
  const [sportId, setSportId] = useState(sport[0]?.id ?? "calcetto");
  const [titolo, setTitolo] = useState("");
  const [data, setData] = useState(domani);
  const [ora, setOra] = useState("20:30");
  const [luogo, setLuogo] = useState("");
  const [coordinate, setCoordinate] = useState<{ lat: number; lng: number } | null>(null);
  const [statoGps, setStatoGps] = useState<string | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);

  const scelto = sport.find((s) => s.id === sportId);

  const usaPosizione = () => {
    if (!navigator.geolocation) return setStatoGps("Il telefono non condivide la posizione.");
    setStatoGps("Cerco la posizione…");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const c = { lat: p.coords.latitude, lng: p.coords.longitude };
        if (!aSanMarino(c)) {
          setCoordinate(null);
          return setStatoGps("Non sei a San Marino: la posizione non viene salvata, basta il nome del luogo.");
        }
        setCoordinate(c);
        setStatoGps("Posizione del campo salvata.");
      },
      () => setStatoGps("Posizione non disponibile: basta il nome del luogo."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const invia = async (e: FormEvent) => {
    e.preventDefault();
    setInCorso(true);
    setErrore(null);
    const r = await creaPartita({
      sport: sportId,
      titolo: titolo.trim() || `${scelto?.nome ?? "Partita"} a ${luogo.trim()}`.slice(0, 60),
      inizio: dataOraSM(data, ora),
      luogo,
      lat: coordinate?.lat ?? null,
      lng: coordinate?.lng ?? null,
    });
    setInCorso(false);
    if (r.errore || !r.id) return setErrore(r.errore ?? "Non sono riuscito a creare la partita.");
    chiudi();
    router.push(`/sport/${r.id}`);
  };

  return (
    <form onSubmit={invia} className="flex flex-col gap-4 rounded-3xl border border-linea bg-superficie p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Organizza una partita</h2>
        <button type="button" onClick={chiudi} className="text-sm font-medium text-testo-2">Chiudi</button>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-[13px] font-medium text-testo-2">Sport</legend>
        <div className="flex flex-wrap gap-1.5">
          {sport.map((s) => (
            <button key={s.id} type="button" aria-pressed={sportId === s.id} onClick={() => setSportId(s.id)}
              className="rounded-xl border border-linea bg-fondo px-3 py-2 text-[13px] font-medium aria-pressed:border-accento aria-pressed:bg-accento-tenue">
              {s.nome}
            </button>
          ))}
        </div>
        {scelto ? <p className="text-[13px] text-testo-2">{scelto.giocatori_per_squadra} contro {scelto.giocatori_per_squadra}, {scelto.giocatori_per_squadra * 2} posti</p> : null}
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <Campo etichetta="Giorno" type="date" required value={data} onChange={(e) => setData(e.target.value)} />
        <Campo etichetta="Ora" type="time" required step={900} value={ora} onChange={(e) => setOra(e.target.value)} />
      </div>
      <Campo etichetta="Dove" required minLength={2} maxLength={80} value={luogo} onChange={(e) => setLuogo(e.target.value)} placeholder="Es. campo di Fonte dell'Ovo" />
      <div className="flex flex-col gap-1.5">
        <PrimaryButton variante="secondario" dimensione="sm" onClick={usaPosizione}>Sono al campo: usa la mia posizione</PrimaryButton>
        {statoGps ? <p className="text-xs text-testo-2">{statoGps}</p> : null}
      </div>
      <Campo etichetta="Titolo (facoltativo)" maxLength={60} value={titolo} onChange={(e) => setTitolo(e.target.value)} placeholder="Es. Calcetto del giovedì" />

      {errore ? <p role="alert" className="rounded-2xl bg-segnale/12 px-4 py-3 text-sm text-segnale">{errore}</p> : null}
      <PrimaryButton type="submit" pieno disabled={inCorso}>{inCorso ? "Un attimo…" : "Crea la partita"}</PrimaryButton>
    </form>
  );
}
