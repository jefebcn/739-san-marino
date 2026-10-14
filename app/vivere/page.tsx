import PaginaArea from "@/components/aree/PaginaArea";
import { Icona } from "@/components/Icona";
import { TestoProssima } from "@/components/Partenze";
import { RaccoltaBreve } from "@/components/Raccolta";
import { ConteggioAperte } from "@/components/Farmacie";
import { getClassifica, getLuoghi } from "@/lib/data";
import { getFarmacie, getLinee, getParcheggi, getRaccolta } from "@/lib/servizi";
import { cielo, getMeteo, gradi } from "@/lib/meteo";
import { getAvvisi } from "@/lib/avvisi";

export const revalidate = 60;

export const metadata = { title: "Vivere · 739 San Marino" };

const NUMERI = [
  { numero: "112", nome: "Emergenze e polizia" },
  { numero: "113", nome: "Polizia" },
  { numero: "115", nome: "Vigili del fuoco" },
  { numero: "118", nome: "Ambulanza" },
];

/** I numeri di emergenza restano in cima a Vivere, a un tocco. */
function Emergenze() {
  return (
    <section className="sezione" aria-label="Numeri di emergenza">
      <div className="emergenza">
        {NUMERI.map((n) => (
          <a key={n.numero} href={`tel:${n.numero}`} className="premibile">
            <strong>{n.numero}</strong>
            <span>{n.nome}</span>
          </a>
        ))}
      </div>
      <p className="meta" style={{ display: "flex", gap: 6, alignItems: "center" }}><Icona nome="telefono" size={14} /> Tocca un numero per chiamare.</p>
    </section>
  );
}

export default async function Vivere() {
  const [farmacie, linee, parcheggi, raccolta, castelli, meteo, luoghi, avvisi] = await Promise.all([
    getFarmacie(), getLinee(), getParcheggi(), getRaccolta(), getClassifica(), getMeteo(), getLuoghi(), getAvvisi(),
  ]);
  const attenzione = avvisi.filter((a) => a.gravita === "attenzione").length;
  const funivia = linee.find((l) => l.tipo === "funivia");
  const bus = linee.filter((l) => l.tipo === "bus");
  const n = (c: string) => luoghi.filter((l) => l.categoria === c).length;

  return (
    <PaginaArea
      slug="vivere"
      testa={<Emergenze />}
      stato={{
        avvisi: avvisi.length ? (
          <><b className="font-mono font-medium text-testo">{avvisi.length}</b> {avvisi.length === 1 ? "avviso in corso" : "avvisi in corso"}{attenzione ? <span className="text-segnale">, {attenzione} di attenzione</span> : null}</>
        ) : "Nessun avviso in corso",
        uffici: n("ufficio") ? <><b className="font-mono font-medium text-testo">{n("ufficio")}</b> {n("ufficio") === 1 ? "ufficio" : "uffici"}, con le pratiche e i documenti da portare</> : "Schede in preparazione",
        salute: farmacie.length ? <ConteggioAperte farmacie={farmacie} testo /> : undefined,
        trasporti: funivia ? <>Funivia <TestoProssima partenze={funivia.partenze} /></> : bus.length ? `${bus.length} linee bus` : undefined,
        parcheggi: parcheggi.length ? <><b className="font-mono font-medium text-testo">{parcheggi.length}</b> parcheggi con tariffe e indicazioni</> : undefined,
        rifiuti: <RaccoltaBreve raccolta={raccolta} castelli={castelli} />,
        meteo: meteo ? <><b className="font-mono font-medium text-testo">{gradi(meteo.temperatura)}</b>, {cielo(meteo.codice, meteo.giorno).testo.toLowerCase()}. Previsioni per 7 giorni</> : undefined,
        servizi: <>{n("bagni")} bagni, {n("acqua")} fontanelle, {n("ricarica")} colonnine</>,
      }}
    />
  );
}
