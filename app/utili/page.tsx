import Link from "next/link";
import { Icona, type NomeIcona } from "@/components/Icona";
import { TestoProssima } from "@/components/Partenze";
import { RaccoltaBreve } from "@/components/Raccolta";
import { ConteggioAperte } from "@/components/Farmacie";
import { getClassifica } from "@/lib/data";
import { getFarmacie, getLinee, getParcheggi, getRaccolta } from "@/lib/servizi";

export const revalidate = 60;

export const metadata = { title: "Utili · 739 San Marino" };

const numeri = [
  { numero: "112", nome: "Emergenze e polizia" },
  { numero: "113", nome: "Polizia" },
  { numero: "115", nome: "Vigili del fuoco" },
  { numero: "118", nome: "Ambulanza" },
];

function Servizio({ href, icona, titolo, allerta, children }: { href: string; icona: NomeIcona; titolo: string; allerta?: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className="servizio premibile">
      <span className={allerta ? "icona-tonda allerta" : "icona-tonda"}><Icona nome={icona} /></span>
      <span style={{ minWidth: 0 }}>
        <h3>{titolo}</h3>
        <span className="stato">{children}</span>
      </span>
      <Icona nome="avanti" size={20} />
    </Link>
  );
}

export default async function Utili() {
  const [farmacie, linee, parcheggi, raccolta, castelli] = await Promise.all([getFarmacie(), getLinee(), getParcheggi(), getRaccolta(), getClassifica()]);
  const funivia = linee.find((l) => l.tipo === "funivia");
  const bus = linee.filter((l) => l.tipo === "bus");

  return (
    <>
      <section className="intro">
        <span className="etichetta">Utili ed emergenze</span>
        <h1 className="titolo">Quello che serve, quando serve</h1>
      </section>

      <section className="sezione">
        <div className="sezione-head"><h2>Numeri di emergenza</h2></div>
        <div className="emergenza">
          {numeri.map((n) => (
            <a key={n.numero} href={`tel:${n.numero}`} className="premibile">
              <strong>{n.numero}</strong>
              <span>{n.nome}</span>
            </a>
          ))}
        </div>
        <p className="meta" style={{ display: "flex", gap: 6, alignItems: "center" }}><Icona nome="telefono" size={14} /> Tocca un numero per chiamare.</p>
      </section>

      <section className="sezione">
        <div className="sezione-head"><h2>Servizi</h2><span className="meta">aggiornati adesso</span></div>
        <div className="lista">
          <Servizio href="/utili/farmacie" icona="farmacia" titolo="Farmacie aperte" allerta>
            {farmacie.length ? <ConteggioAperte farmacie={farmacie} testo /> : "Farmacie e orari"}
          </Servizio>
          <Servizio href="/utili/trasporti" icona="funivia" titolo="Bus e funivia">
            {funivia ? <>Funivia <TestoProssima partenze={funivia.partenze} /></> : bus.length ? `${bus.length} linee bus` : "Orari in arrivo"}
          </Servizio>
          <Servizio href="/utili/rifiuti" icona="rifiuti" titolo="Raccolta rifiuti">
            <RaccoltaBreve raccolta={raccolta} castelli={castelli} />
          </Servizio>
          <Servizio href="/utili/parcheggi" icona="parcheggio" titolo="Parcheggi">
            {parcheggi.length ? <><b>{parcheggi.length}</b> parcheggi con tariffe e indicazioni</> : "Posizioni e tariffe"}
          </Servizio>
        </div>
      </section>
    </>
  );
}
