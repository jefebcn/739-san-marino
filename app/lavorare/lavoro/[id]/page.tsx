import Link from "next/link";
import { notFound } from "next/navigation";
import TestaPagina from "@/components/Indietro";
import Condividi from "@/components/Condividi";
import { Icona } from "@/components/Icona";
import { getClassifica } from "@/lib/data";
import { CONTRATTI, getOffertaLavoro, leggiGiorno, tipoImpiego } from "@/lib/lavoro";
import { metadatiCondivisione } from "@/lib/condivisione";

export const revalidate = 300;

// Nessuna pagina pronta alla build: si crea alla prima visita e poi resta in cache (ISR)
export async function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const o = await getOffertaLavoro(id);
  if (!o) return { title: "Offerta di lavoro · 739 San Marino" };
  return metadatiCondivisione({ titolo: `${o.titolo}, ${o.attivita}`, descrizione: `${CONTRATTI[o.contratto]}, ${o.orario}. ${o.descrizione}`, percorso: `/lavorare/lavoro/${o.id}` });
}

const PUBBLICATA = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", timeZone: "Europe/San_Marino" });
const BOTTONE = "inline-flex h-12 items-center justify-center gap-2 px-5 text-[15px] font-semibold transition-[transform,background-color] active:scale-[0.97]";

/** Una offerta di lavoro: cosa cercano, contratto e orario, dove, fino a quando, e come candidarsi (direttamente all'attività) */
export default async function PaginaOfferta({ params }: Props) {
  const { id } = await params;
  const [o, castelli] = await Promise.all([getOffertaLavoro(id), getClassifica()]);
  if (!o) notFound();
  const castello = castelli.find((c) => c.id === o.castello_id)?.nome ?? null;
  const dove = o.sede || [o.indirizzo, castello].filter(Boolean).join(", ") || "San Marino";
  const oggetto = encodeURIComponent(`Candidatura: ${o.titolo}`);

  // Per Google e gli altri motori di ricerca (schema.org JobPosting): solo finché l'offerta è aperta
  const datiStrutturati = o.aperta
    ? {
        "@context": "https://schema.org",
        "@type": "JobPosting",
        title: o.titolo,
        description: o.descrizione,
        datePosted: o.creato_il,
        validThrough: `${o.scadenza}T23:59:59+01:00`,
        employmentType: tipoImpiego(o),
        hiringOrganization: { "@type": "Organization", name: o.attivita },
        jobLocation: { "@type": "Place", address: { "@type": "PostalAddress", streetAddress: o.sede || o.indirizzo || undefined, addressLocality: castello || "San Marino", addressCountry: "SM" } },
      }
    : null;

  return (
    <>
      {datiStrutturati ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datiStrutturati).replace(/</g, "\\u003c") }} /> : null}
      <TestaPagina href="/lavorare/lavoro" verso="Offerte di lavoro" titolo={o.titolo}>
        <p className="sottotitolo">
          <Link href={`/luoghi/${o.luogo_id}`} className="font-medium text-testo underline-offset-2 hover:underline">{o.attivita}</Link>
          {castello ? `, ${castello}` : ""}
        </p>
      </TestaPagina>

      {o.aperta ? null : (
        <p role="status" className="rounded-xl bg-superficie px-4 py-3 text-[15px] font-medium">Questa offerta è chiusa: il posto è stato trovato o è scaduta.</p>
      )}

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-linea">
        <div className="flex flex-col gap-0.5 bg-superficie p-4"><dt className="text-[13px] text-testo-2">Contratto</dt><dd className="text-[15px] font-semibold">{CONTRATTI[o.contratto]}</dd></div>
        <div className="flex flex-col gap-0.5 bg-superficie p-4"><dt className="text-[13px] text-testo-2">Orario</dt><dd className="text-[15px] font-semibold">{o.orario === "part-time" ? "Part-time" : "Tempo pieno"}</dd></div>
        <div className="flex flex-col gap-0.5 bg-superficie p-4"><dt className="text-[13px] text-testo-2">Dove</dt><dd className="text-[15px] font-semibold leading-snug">{dove}</dd></div>
        <div className="flex flex-col gap-0.5 bg-superficie p-4"><dt className="text-[13px] text-testo-2">Online fino al</dt><dd className="text-[15px] font-semibold">{leggiGiorno(o.scadenza)}</dd></div>
      </dl>

      <section className="flex flex-col gap-2">
        <h2 className="text-[19px] font-semibold tracking-tight">Il lavoro</h2>
        <p className="whitespace-pre-line text-[15px] leading-relaxed">{o.descrizione}</p>
      </section>

      {o.aperta ? (
        <section className="flex flex-col gap-3 rounded-2xl bg-superficie p-5">
          <h2 className="text-[19px] font-semibold tracking-tight">Come candidarsi</h2>
          <p className="text-sm leading-relaxed text-testo-2">Scrivi o chiama direttamente {o.attivita}: 739 non riceve le candidature e non vede i tuoi dati.</p>
          <div className="flex flex-wrap gap-2">
            {o.email ? <a href={`mailto:${o.email}?subject=${oggetto}`} className={`${BOTTONE} taglio bg-metallo text-su-accento hover:bg-zinc-800`}><Icona nome="email" size={20} /> Scrivi</a> : null}
            {o.link ? <a href={o.link} target="_blank" rel="noopener" className={`${BOTTONE} rounded-xl bg-fondo text-testo hover:bg-superficie-2`}><Icona nome="sito" size={20} /> Candidati sul sito</a> : null}
            {o.telefono ? <a href={`tel:${o.telefono.replace(/[^+0-9]/g, "")}`} className={`${BOTTONE} rounded-xl bg-fondo text-testo hover:bg-superficie-2`}><Icona nome="telefono" size={20} /> Chiama</a> : null}
          </div>
          {o.email ? <p className="break-all font-mono text-[13px] text-testo-2">{o.email}</p> : null}
        </section>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Condividi titolo={`${o.titolo}, ${o.attivita}`} testo="Offerta di lavoro su 739" percorso={`/lavorare/lavoro/${o.id}`} />
        <p className="text-[13px] text-testo-2">Pubblicata dall&apos;attività il {PUBBLICATA.format(new Date(o.creato_il))}</p>
      </div>
    </>
  );
}
