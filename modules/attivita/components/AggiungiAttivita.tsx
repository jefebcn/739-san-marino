"use client";

import { useState } from "react";
import ScegliPunto from "@/components/ScegliPunto";
import Tano from "@/components/Tano";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { useSessione } from "@/modules/core/store";
import { proponiAttivita } from "../api";
import { CATEGORIE_NUOVE, TIPI, eCategoriaNuova, type CategoriaNuova } from "../tipi";
import { CAMPO } from "./stile";

function Campo({ testo, nota, children }: { testo: string; nota?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-testo-2">{testo}</span>
      {children}
      {nota ? <span className="text-xs text-testo-2">{nota}</span> : null}
    </label>
  );
}

/** «Aggiungi la tua attività»: il titolare propone una scheda nuova, la redazione verifica e la crea già affidata a lui. */
export default function AggiungiAttivita({ castelli, categoria: iniziale }: { castelli: { id: number; nome: string }[]; categoria?: string }) {
  const { stato, profilo } = useSessione();
  const [categoria, setCategoria] = useState<CategoriaNuova | "">(eCategoriaNuova(iniziale) ? iniziale : "");
  const [tipo, setTipo] = useState("");
  const [nome, setNome] = useState("");
  const [castello, setCastello] = useState("");
  const [indirizzo, setIndirizzo] = useState("");
  const [punto, setPunto] = useState<{ lat: number; lng: number } | null>(null);
  const [descrizione, setDescrizione] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [sito, setSito] = useState("");
  const [chi, setChi] = useState("");
  const [verifica, setVerifica] = useState("");
  const [nota, setNota] = useState("");
  const [invio, setInvio] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [fatto, setFatto] = useState(false);

  if (stato === "caricamento") return <div className="h-96 animate-pulse rounded-2xl bg-superficie" aria-busy="true" aria-label="Caricamento" />;
  if (stato !== "connesso") {
    const qui = `/attivita/aggiungi${categoria ? `?categoria=${categoria}` : ""}`;
    return (
      <div className="flex flex-col gap-4 rounded-2xl bg-superficie p-5">
        <p className="text-[15px] leading-relaxed">Per aggiungere la tua attività serve il tuo SMR ID: è gratis e ci vuole un minuto. Così poi la scheda la aggiorni tu.</p>
        <PrimaryButton href={`/profile?torna=${encodeURIComponent(qui)}`} className="w-fit">Entra con SMR ID</PrimaryButton>
      </div>
    );
  }

  if (fatto) {
    return (
      <section className="flex flex-col gap-4 rounded-2xl bg-superficie p-5" role="status">
        {/* Proposta mandata: Tano col pollice in su */}
        <Tano posa="pollice" priority className="h-36 w-auto self-center" />
        <h2 className="text-[21px] font-semibold tracking-tight">Proposta mandata</h2>
        <p className="text-[15px] leading-relaxed text-testo-2">
          La redazione di 739 controlla che l&apos;attività esista e sia tua, di solito con una telefonata al numero che hai lasciato. Appena è fatto la scheda va online e la trovi in «Le mie attività», pronta da completare con orari e foto.
        </p>
        <PrimaryButton href="/profile/attivita" className="w-fit">Le mie attività</PrimaryButton>
      </section>
    );
  }

  const invia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoria) return setErrore("Scegli che tipo di attività è.");
    if (!punto) return setErrore("Segna sulla mappa dove si trova l'attività.");
    setInvio(true);
    setErrore(null);
    const r = await proponiAttivita({
      nome: nome.trim(), categoria, sottocategoria: tipo, castello_id: castello, indirizzo: indirizzo.trim(), lat: punto.lat, lng: punto.lng,
      descrizione: descrizione.trim(), telefono: telefono.trim(), email: email.trim(), sito: sito.trim(),
      chi: chi.trim(), telefono_verifica: verifica.trim(), nota: nota.trim(),
    });
    setInvio(false);
    if (r.errore) return setErrore(r.errore);
    setFatto(true);
  };

  return (
    <form onSubmit={invia} className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-[17px] font-semibold tracking-tight">Che attività è</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {CATEGORIE_NUOVE.map((c) => (
            <label key={c.categoria} className={`flex cursor-pointer flex-col gap-0.5 rounded-xl border px-4 py-3 transition-colors ${categoria === c.categoria ? "border-accento bg-accento-tenue" : "border-linea hover:bg-superficie"}`}>
              <input type="radio" name="categoria" value={c.categoria} checked={categoria === c.categoria} onChange={() => { setCategoria(c.categoria); setTipo(""); }} className="sr-only" />
              <span className="text-[15px] font-semibold">{c.nome}</span>
              <span className="text-[13px] text-testo-2">{c.esempio}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {categoria ? (
        <>
          <Campo testo="Tipo">
            <select required value={tipo} onChange={(e) => setTipo(e.target.value)} className={`h-12 ${CAMPO} px-3`}>
              <option value="">Scegli…</option>
              {TIPI[categoria].map((t) => <option key={t.tipo} value={t.tipo}>{t.nome}</option>)}
            </select>
          </Campo>
          <Campo testo="Nome dell'attività" nota="Come lo scrivete sull'insegna o sui documenti.">
            <input required minLength={2} maxLength={120} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Es. Studio Rossi" className={`h-12 ${CAMPO}`} />
          </Campo>

          <section className="flex flex-col gap-3">
            <h2 className="text-[17px] font-semibold tracking-tight">Dove si trova</h2>
            <Campo testo="Indirizzo">
              <input required minLength={5} maxLength={200} value={indirizzo} onChange={(e) => setIndirizzo(e.target.value)} placeholder="Via, numero" className={`h-12 ${CAMPO}`} />
            </Campo>
            <Campo testo="Castello">
              <select value={castello} onChange={(e) => setCastello(e.target.value)} className={`h-12 ${CAMPO} px-3`}>
                <option value="">Scegli…</option>
                {castelli.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </Campo>
            <ScegliPunto valore={punto} onCambia={setPunto} categoria={categoria} sottocategoria={tipo} />
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-[17px] font-semibold tracking-tight">Nella scheda</h2>
            <Campo testo="Cosa fate" nota="In poche righe. Massimo 1000 caratteri. Orari e foto li aggiungi dopo l'approvazione.">
              <textarea rows={4} maxLength={1000} value={descrizione} onChange={(e) => setDescrizione(e.target.value)} placeholder="Es. Contabilità e consulenza fiscale per imprese e privati." className={`${CAMPO} py-3 leading-relaxed`} />
            </Campo>
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo testo="Telefono">
                <input type="tel" inputMode="tel" maxLength={30} value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="0549 123456" className={`h-12 ${CAMPO}`} />
              </Campo>
              <Campo testo="Email">
                <input type="email" maxLength={160} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="info@tuoattivita.sm" className={`h-12 ${CAMPO}`} />
              </Campo>
            </div>
            <Campo testo="Sito o pagina social" nota="Deve iniziare con https://">
              <input type="url" maxLength={500} value={sito} onChange={(e) => setSito(e.target.value)} placeholder="https://" className={`h-12 ${CAMPO}`} />
            </Campo>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-[17px] font-semibold tracking-tight">Per la verifica</h2>
            <p className="-mt-1 text-sm text-testo-2">Li vede solo la redazione di 739: non compaiono nella scheda.</p>
            <Campo testo="Chi sei" nota="Nome e ruolo: titolare, socio, gestore.">
              <input required minLength={3} maxLength={120} value={chi} onChange={(e) => setChi(e.target.value)} placeholder={`${profilo?.nome ?? "Nome e cognome"}, titolare`} className={`h-12 ${CAMPO}`} />
            </Campo>
            <Campo testo="Telefono per la verifica">
              <input required type="tel" inputMode="tel" maxLength={30} value={verifica} onChange={(e) => setVerifica(e.target.value)} placeholder="0549 123456" className={`h-12 ${CAMPO}`} />
            </Campo>
            <Campo testo="Qualcosa da aggiungere">
              <textarea rows={2} maxLength={500} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Es. l'orario migliore per chiamarti" className={`${CAMPO} py-3 leading-relaxed`} />
            </Campo>
          </section>

          {errore ? <p role="alert" className="rounded-xl bg-segnale/12 px-4 py-3 text-sm text-segnale">{errore}</p> : null}
          <PrimaryButton type="submit" disabled={invio}>{invio ? "Invio…" : "Manda la proposta"}</PrimaryButton>
          <p className="-mt-3 text-[13px] text-testo-2">Il profilo base è gratis per sempre. Prima di creare una scheda nuova cerca la tua in 739: se c&apos;è già, aprila e tocca «È la tua attività?».</p>
        </>
      ) : null}
    </form>
  );
}
