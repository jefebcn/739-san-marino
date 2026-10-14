import { getFarmacie } from "@/lib/servizi";
import NumeriEmergenza from "@/components/NumeriEmergenza";
import { Icona } from "@/components/Icona";
import Riprova from "./Riprova";

// La pagina che il service worker (public/sw.js) mostra quando non c'è rete e la pagina chiesta non è salvata.
// Si salva sul telefono alla prima visita, insieme a Oggi: niente immagini, niente dati da chiedere al momento.
export const revalidate = 86400;

export const metadata = { title: "Senza rete · 739 San Marino", robots: { index: false } };

export default async function Offline() {
  const farmacie = (await getFarmacie()).filter((f) => f.telefono);
  return (
    <>
      <section className="intro">
        <h1 className="titolo">Pagina non salvata</h1>
        <p className="sottotitolo">Senza rete questa pagina non si apre. I numeri di emergenza funzionano sempre: la chiamata non passa da internet.</p>
      </section>

      <NumeriEmergenza />

      {farmacie.length ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold tracking-tight">Farmacie</h2>
          <p className="text-sm text-testo-2">La farmacia dell&apos;Ospedale, a Cailungo, è aperta 24 ore su 24.</p>
          <ul className="divide-y divide-linea rounded-2xl border border-linea">
            {farmacie.map((f) => (
              <li key={f.id}>
                <a href={`tel:${f.telefono!.replace(/\s/g, "")}`} className="flex min-h-12 items-center gap-3 px-4 py-3">
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-[15px] font-medium">{f.nome}</span>
                    {f.indirizzo ? <span className="truncate text-[13px] text-testo-2">{f.indirizzo}</span> : null}
                  </span>
                  <span className="flex items-center gap-1.5 font-mono text-sm font-medium text-accento">
                    <Icona nome="telefono" size={16} /> {f.telefono}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <Riprova />
    </>
  );
}
