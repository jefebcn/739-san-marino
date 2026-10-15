"use client";

import { useEffect, useState } from "react";
import { Icona } from "@/components/Icona";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { useSessione } from "@/modules/core/store";
import { caricaFoto } from "@/modules/eventi/api";
import type { Luogo } from "@/lib/data";
import { luogoDaModificare, salvaMiaAttivita, type Orari } from "../api";
import OrariSettimana from "./OrariSettimana";
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

/** Il titolare aggiorna la scheda della sua attività: i permessi veri li controlla salva_mia_attivita(). */
export default function ModificaAttivita({ id }: { id: string }) {
  const { stato, utente } = useSessione();
  const [luogo, setLuogo] = useState<Luogo | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [salvato, setSalvato] = useState(false);
  const [invio, setInvio] = useState(false);
  const [caricaInCorso, setCaricaInCorso] = useState(false);

  const [descrizione, setDescrizione] = useState("");
  const [indirizzo, setIndirizzo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [sito, setSito] = useState("");
  const [orari, setOrari] = useState("");
  const [settimana, setSettimana] = useState<Orari>({});
  const [foto, setFoto] = useState<string | null>(null);
  const [credito, setCredito] = useState("");

  useEffect(() => {
    if (stato !== "connesso") return;
    luogoDaModificare(id).then((r) => {
      if (r.errore || !r.luogo) return setErrore(r.errore ?? "Questa scheda non esiste più.");
      const l = r.luogo;
      setLuogo(l);
      setDescrizione(l.descrizione ?? "");
      setIndirizzo(l.indirizzo ?? "");
      setTelefono(l.telefono ?? "");
      setEmail(l.email ?? "");
      setSito(l.sito ?? "");
      setOrari(l.orari ?? "");
      setSettimana(l.orari_settimana ?? {});
      setFoto(l.foto_url ?? null);
      setCredito(l.foto_credito ?? "");
    });
  }, [stato, id]);

  if (stato === "caricamento" || (stato === "connesso" && !luogo && !errore)) {
    return <div className="h-96 animate-pulse rounded-2xl bg-superficie" aria-busy="true" aria-label="Caricamento" />;
  }
  if (stato !== "connesso") {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-[15px] text-testo-2">Per modificare la scheda entra con il tuo SMR ID.</p>
        <PrimaryButton href={`/profile?torna=${encodeURIComponent(`/profile/attivita/${id}`)}`} className="w-fit">Entra</PrimaryButton>
      </div>
    );
  }
  if (!luogo) return <p role="alert" className="rounded-xl bg-segnale/12 px-4 py-3 text-sm text-segnale">{errore}</p>;

  if (salvato) {
    return (
      <section className="flex flex-col gap-4 rounded-2xl bg-superficie p-5" role="status">
        <h2 className="text-[21px] font-semibold tracking-tight">Scheda aggiornata</h2>
        <p className="text-[15px] leading-relaxed text-testo-2">Le modifiche sono già online. Ricontrolla gli orari quando cambiano, così chi la apre sa se sei aperto.</p>
        <div className="flex flex-wrap gap-2">
          <PrimaryButton href={`/luoghi/${id}`}>Apri la scheda</PrimaryButton>
          <PrimaryButton variante="interno" onClick={() => setSalvato(false)}>Modifica ancora</PrimaryButton>
        </div>
      </section>
    );
  }

  const scegliFoto = async (file: File | undefined) => {
    if (!file || !utente) return;
    setCaricaInCorso(true);
    setErrore(null);
    const r = await caricaFoto(utente.id, file);
    setCaricaInCorso(false);
    if (r.errore) return setErrore(r.errore);
    setFoto(r.url);
  };

  const salva = async (e: React.FormEvent) => {
    e.preventDefault();
    if (foto && !credito.trim()) return setErrore("Scrivi di chi è la foto (anche solo «Foto del locale»).");
    setInvio(true);
    setErrore(null);
    const r = await salvaMiaAttivita(id, {
      descrizione: descrizione.trim(),
      indirizzo: indirizzo.trim(),
      telefono: telefono.trim(),
      email: email.trim(),
      sito: sito.trim(),
      orari: orari.trim(),
      orari_settimana: settimana,
      foto_url: foto ?? "",
      foto_credito: foto ? credito.trim() : "",
    });
    setInvio(false);
    if (r.errore) return setErrore(r.errore);
    setSalvato(true);
  };

  return (
    <form onSubmit={salva} className="flex flex-col gap-5">
      <Campo testo="Descrizione" nota="Cosa si trova da voi, in poche righe. Massimo 1000 caratteri.">
        <textarea rows={5} maxLength={1000} value={descrizione} onChange={(e) => setDescrizione(e.target.value)} placeholder="Es. Cucina sammarinese, pasta fatta in casa, terrazza sulla valle." className={`${CAMPO} py-3 leading-relaxed`} />
      </Campo>
      <Campo testo="Indirizzo">
        <input maxLength={200} value={indirizzo} onChange={(e) => setIndirizzo(e.target.value)} placeholder="Via, numero, castello" className={`h-12 ${CAMPO}`} />
      </Campo>
      <div className="grid gap-5 sm:grid-cols-2">
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

      <section className="flex flex-col gap-2">
        <h2 className="text-[17px] font-semibold tracking-tight">Orari</h2>
        <p className="text-sm text-testo-2">Con gli orari della settimana la scheda dice da sola se adesso sei aperto.</p>
        <OrariSettimana valore={settimana} onCambia={setSettimana} />
        <Campo testo="Note sugli orari" nota="Ferie, chiusure, cucina aperta fino a… Massimo 300 caratteri.">
          <input maxLength={300} value={orari} onChange={(e) => setOrari(e.target.value)} placeholder="Es. Chiuso a gennaio per ferie" className={`h-12 ${CAMPO}`} />
        </Campo>
      </section>

      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-medium text-testo-2">Foto</span>
        {foto ? (
          <div className="flex flex-col gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={foto} alt={`Foto di ${luogo.nome}`} className="aspect-[16/10] w-full rounded-2xl bg-superficie object-cover" />
            <input aria-label="Di chi è la foto" maxLength={120} value={credito} onChange={(e) => setCredito(e.target.value)} placeholder="Di chi è la foto (es. Foto del locale)" className={`h-12 ${CAMPO}`} />
            <button type="button" onClick={() => setFoto(null)} className="w-fit py-1 text-sm font-medium text-testo-2 hover:text-testo">Togli la foto</button>
          </div>
        ) : (
          <label className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-linea text-[15px] font-medium text-testo-2 transition-colors hover:bg-superficie">
            <Icona nome="importa" size={20} /> {caricaInCorso ? "Carico la foto…" : "Aggiungi una foto"}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={caricaInCorso} onChange={(e) => scegliFoto(e.target.files?.[0])} />
          </label>
        )}
      </div>

      {errore ? <p role="alert" className="rounded-xl bg-segnale/12 px-4 py-3 text-sm text-segnale">{errore}</p> : null}
      <PrimaryButton type="submit" disabled={invio || caricaInCorso}>{invio ? "Salvo…" : "Salva la scheda"}</PrimaryButton>
      <p className="-mt-2 text-[13px] text-testo-2">Le modifiche vanno online subito, con la scritta «Aggiornata dal titolare». Il nome e la posizione li cambia la redazione: chiedili con «Segnala un errore».</p>
    </form>
  );
}
