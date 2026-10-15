"use client";

import { useState } from "react";
import PrimaryButton from "@/components/ui/PrimaryButton";
import Tano from "@/components/Tano";
import { useSessione } from "@/modules/core/store";
import { chiediAttivita } from "../api";
import { CAMPO } from "./stile";

/** «È la tua attività?»: il titolare chiede la scheda, la redazione verifica e la affida. */
export default function ChiediAttivita({ luogo }: { luogo: { id: string; nome: string } }) {
  const { stato, profilo } = useSessione();
  const [chi, setChi] = useState("");
  const [telefono, setTelefono] = useState("");
  const [nota, setNota] = useState("");
  const [invio, setInvio] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [fatto, setFatto] = useState(false);

  if (stato === "caricamento") return <div className="h-64 animate-pulse rounded-2xl bg-superficie" aria-busy="true" aria-label="Caricamento" />;
  if (stato !== "connesso") {
    const qui = `/attivita/chiedi?luogo=${luogo.id}`;
    return (
      <div className="flex flex-col gap-4 rounded-2xl bg-superficie p-5">
        <p className="text-[15px] leading-relaxed">Per gestire la scheda della tua attività serve il tuo SMR ID: è gratis e ci vuole un minuto.</p>
        <PrimaryButton href={`/profile?torna=${encodeURIComponent(qui)}`} className="w-fit">Entra con SMR ID</PrimaryButton>
      </div>
    );
  }

  if (fatto) {
    return (
      <section className="flex flex-col gap-4 rounded-2xl bg-superficie p-5" role="status">
        {/* Richiesta mandata: Tano col pollice in su */}
        <Tano posa="pollice" priority className="h-36 w-auto self-center" />
        <h2 className="text-[21px] font-semibold tracking-tight">Richiesta mandata</h2>
        <p className="text-[15px] leading-relaxed text-testo-2">
          La redazione di 739 controlla che l&apos;attività sia tua, di solito con una telefonata al numero che hai lasciato. Appena è fatto trovi la scheda in «Le mie attività» e la aggiorni quando vuoi.
        </p>
        <PrimaryButton href="/profile/attivita" className="w-fit">Le mie attività</PrimaryButton>
      </section>
    );
  }

  const invia = async (e: React.FormEvent) => {
    e.preventDefault();
    setInvio(true);
    setErrore(null);
    const r = await chiediAttivita(luogo.id, chi.trim(), telefono.trim(), nota.trim());
    setInvio(false);
    if (r.errore) return setErrore(r.errore);
    setFatto(true);
  };

  return (
    <form onSubmit={invia} className="flex flex-col gap-5">
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium text-testo-2">Chi sei</span>
        <input required minLength={3} maxLength={120} value={chi} onChange={(e) => setChi(e.target.value)} placeholder={`${profilo?.nome ?? "Nome e cognome"}, titolare`} className={`h-12 ${CAMPO}`} />
        <span className="text-xs text-testo-2">Nome e ruolo: titolare, socio, gestore.</span>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium text-testo-2">Telefono per la verifica</span>
        <input required type="tel" inputMode="tel" maxLength={30} value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="0549 123456" className={`h-12 ${CAMPO}`} />
        <span className="text-xs text-testo-2">Lo usa solo la redazione per verificare: non compare nella scheda.</span>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium text-testo-2">Qualcosa da aggiungere</span>
        <textarea rows={3} maxLength={500} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Es. l'orario migliore per chiamarti" className={`${CAMPO} py-3 leading-relaxed`} />
      </label>
      {errore ? <p role="alert" className="rounded-xl bg-segnale/12 px-4 py-3 text-sm text-segnale">{errore}</p> : null}
      <PrimaryButton type="submit" disabled={invio}>{invio ? "Invio…" : `Chiedi la scheda di ${luogo.nome}`}</PrimaryButton>
      <p className="-mt-2 text-[13px] text-testo-2">Il profilo base è gratis: descrizione, contatti, orari e foto, aggiornati da te.</p>
    </form>
  );
}
