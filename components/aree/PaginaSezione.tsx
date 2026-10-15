import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import TestaPagina from "@/components/Indietro";
import { Icona } from "@/components/Icona";
import { CATEGORIE, getLuoghi, getOfferteInCorso, type Luogo } from "@/lib/data";
import { area as trovaArea, sezione as trovaSezione } from "@/lib/aree";
import { eCategoriaNuova } from "@/modules/attivita/tipi";

const PLURALI: Record<string, string> = {
  ristorante: "Ristoranti", pizzeria: "Pizzerie", piadineria: "Piadinerie", "cibo veloce": "Cibo veloce",
  bar: "Bar", gelateria: "Gelaterie", pub: "Pub",
  souvenir: "Souvenir", gioielleria: "Gioiellerie e orologi", armeria: "Armerie", alimentari: "Alimentari e supermercati",
  abbigliamento: "Abbigliamento e pelletteria", profumeria: "Profumerie e ottici", tabaccheria: "Tabacchi e giornali",
  "centro commerciale": "Centri commerciali e outlet", casa: "Casa e fai da te", elettronica: "Elettronica e foto",
  "libri e giochi": "Libri, musica e giochi", auto: "Auto e moto", servizi: "Servizi", negozio: "Altri negozi",
  informatica: "Informatica e web", edilizia: "Edilizia e immobili", industria: "Industria e produzione", commercio: "Commercio e distribuzione",
  finanza: "Finanza e assicurazioni", turismo: "Turismo e ospitalità", comunicazione: "Comunicazione e marketing",
  commercialista: "Commercialisti", avvocato: "Avvocati", notaio: "Notai", architetto: "Architetti", ingegnere: "Ingegneri", geometra: "Geometri",
  "agenzia immobiliare": "Agenzie immobiliari", "studio medico": "Studi medici", consulente: "Consulenti",
  idraulico: "Idraulici", elettricista: "Elettricisti", falegname: "Falegnami", edile: "Imprese edili", fabbro: "Fabbri", imbianchino: "Imbianchini",
  meccanico: "Meccanici e carrozzieri", parrucchiere: "Parrucchieri ed estetisti", sartoria: "Sartorie", giardiniere: "Giardinieri",
  veterinario: "Veterinari", toelettatura: "Toelettature", rifugio: "Rifugi e canili", addestramento: "Centri cinofili", pensione: "Pensioni per animali",
  culturale: "Culturali", volontariato: "Volontariato", sportiva: "Società sportive e federazioni", ricreativa: "Circoli e ricreative",
  religiosa: "Religiose", "di categoria": "Di categoria e sindacati", "giunta di castello": "Giunte di castello",
  "nido e infanzia": "Nidi e scuole dell'infanzia", elementare: "Elementari", "media e superiore": "Medie e superiori", università: "Università",
};
// Tipi che hanno un ordine naturale (le scuole per età); gli altri vanno dal gruppo più numeroso
const ORDINE = ["nido e infanzia", "elementare", "media e superiore", "università"];
// Gruppi generici, sempre in fondo
const ULTIMI = new Set(["altro", "negozio"]);
const posto = (t: string) => (ORDINE.includes(t) ? ORDINE.indexOf(t) : -1);

/** Sezione di un'area fatta di luoghi (es. Musei e monumenti): elenco raggruppato per categoria, con la mappa. */
export default async function PaginaSezione({ area, sezione, prima, vuoto }: { area: string; sezione: string; prima?: ReactNode; vuoto?: string }) {
  const a = trovaArea(area);
  const s = trovaSezione(area, sezione);
  // Solo le sezioni di luoghi hanno questa pagina; le altre portano altrove o sono in arrivo
  if (!a || !s?.categorie) notFound();

  const [tutti, offerte] = await Promise.all([getLuoghi(), getOfferteInCorso()]);
  let gruppi = s.categorie
    .map((c) => ({ categoria: c, nome: CATEGORIE[c] ?? c, luoghi: tutti.filter((l) => l.categoria === c && (!s.tipi || s.tipi.includes(l.sottocategoria ?? ""))) }))
    .filter((g) => g.luoghi.length);
  // Una categoria sola con più tipi (Mangiare e bere: ristoranti, pizzerie, bar…): si raggruppa per tipo
  const tipi = gruppi.length === 1 ? [...new Set(gruppi[0].luoghi.map((l) => l.sottocategoria ?? ""))] : [];
  if (tipi.filter(Boolean).length > 1) {
    const luoghi = gruppi[0].luoghi;
    gruppi = tipi
      .map((t) => ({ categoria: t || "altro", nome: t ? (PLURALI[t] ?? t[0].toUpperCase() + t.slice(1)) : "Altro", luoghi: luoghi.filter((l) => (l.sottocategoria ?? "") === t) }))
      .sort((a, b) => (ULTIMI.has(a.categoria) ? 1 : ULTIMI.has(b.categoria) ? -1 : posto(a.categoria) >= 0 && posto(b.categoria) >= 0 ? posto(a.categoria) - posto(b.categoria) : b.luoghi.length - a.luoghi.length));
  }
  const totale = gruppi.reduce((n, g) => n + g.luoghi.length, 0);
  // Sezioni di attività private e associazioni: chi non trova la sua può aggiungerla (migrazioni 0036 e 0039)
  const aggiungi = s.categorie.find(eCategoriaNuova);
  const cosa = aggiungi === "associazione" ? { sua: "La tua associazione", una: "È la tua associazione?" } : { sua: "La tua attività", una: "È la tua attività?" };

  return (
    <>
      <TestaPagina href={a.href} verso={a.nome} titolo={s.nome}>
        <p className="sottotitolo">{s.descrizione}</p>
      </TestaPagina>

      <div className="flex flex-col gap-7 empty:hidden lg:max-w-[var(--colonna)]">{prima}</div>

      {totale === 0 ? (
        <p className="rounded-2xl bg-superficie p-5 text-[15px] text-testo-2">{vuoto ?? "Nessun luogo ancora in questa sezione."}</p>
      ) : (
        gruppi.map((g) => (
          <section key={g.categoria} className="flex flex-col gap-2.5">
            {gruppi.length > 1 ? (
              <h2 className="flex items-baseline justify-between text-[17px] font-semibold tracking-tight">
                {g.nome}
                <span className="font-mono text-sm font-medium text-testo-2">{g.luoghi.length}</span>
              </h2>
            ) : null}
            <ul className="larga divide-y divide-linea rounded-2xl bg-superficie lg:grid lg:grid-cols-2 lg:gap-2.5 lg:divide-y-0 lg:bg-transparent xl:grid-cols-3">
              {g.luoghi.map((l) => (
                <li key={l.id} className="lg:overflow-hidden lg:rounded-2xl lg:bg-superficie">
                  <RigaLuogo l={l} offerta={offerte.get(l.id)} />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      {aggiungi ? (
        <Link href={`/attivita/aggiungi?categoria=${aggiungi}${s.tipi?.length === 1 ? `&tipo=${encodeURIComponent(s.tipi[0])}` : ""}`} className="flex items-center gap-3 rounded-2xl bg-superficie px-4 py-3.5 transition-colors hover:bg-superficie-2 lg:max-w-[var(--colonna)]">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accento-tenue text-accento"><Icona nome="piu" size={18} piatta /></span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-[15px] font-semibold">{totale ? `${cosa.sua} non c'è?` : cosa.una}</span>
            <span className="text-[13px] text-testo-2">Aggiungila gratis: la redazione verifica e poi la aggiorni tu.</span>
          </span>
          <span className="shrink-0 text-testo-2"><Icona nome="avanti" size={18} /></span>
        </Link>
      ) : null}

      {gruppi.some((g) => g.luoghi.some((l) => l.fonte === "overture")) ? (
        <p className="fonte">
          Alcuni luoghi da{" "}
          <a href="https://docs.overturemaps.org/attribution/" target="_blank" rel="noopener">Overture Maps Foundation</a> (CDLA Permissive 2.0), da verificare.
        </p>
      ) : null}

      {gruppi.some((g) => g.luoghi.some((l) => l.fonte === "osm")) ? (
        <p className="fonte">
          Dati ©{" "}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors, aggiornati ogni notte.
        </p>
      ) : null}
    </>
  );
}

function RigaLuogo({ l, offerta }: { l: Luogo; offerta?: string }) {
  const sotto = [l.indirizzo, l.descrizione].filter(Boolean).join(", ");
  return (
    // Niente prefetch: in un elenco lungo scaricherebbe in anticipo una quindicina di schede (circa 120 KB)
    <Link prefetch={false} href={`/luoghi/${l.id}`} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-superficie-2">
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[15px] font-medium leading-snug">{l.nome}</span>
        {sotto ? <span className="line-clamp-1 text-[13px] text-testo-2">{sotto}</span> : null}
        {offerta ? <span className="line-clamp-1 text-[13px] font-medium text-accento">Offerta: {offerta}</span> : null}
      </span>
      <span className="shrink-0 text-testo-2"><Icona nome="avanti" size={18} /></span>
    </Link>
  );
}
