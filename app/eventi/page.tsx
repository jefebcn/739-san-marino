import { chiaveGiorno, etichettaGiorno, getEventi, type Evento } from "@/lib/data";
import EventoRiga from "@/components/EventoRiga";

export const revalidate = 60;

export const metadata = { title: "Eventi · 739 San Marino" };

export default async function Eventi() {
  const eventi = await getEventi(80);

  const gruppi: { chiave: string; etichetta: string; eventi: Evento[] }[] = [];
  for (const e of eventi) {
    const k = chiaveGiorno(e.inizio);
    const ultimo = gruppi[gruppi.length - 1];
    if (ultimo && ultimo.chiave === k) ultimo.eventi.push(e);
    else gruppi.push({ chiave: k, etichetta: etichettaGiorno(e.inizio), eventi: [e] });
  }

  return (
    <>
      <section className="intro">
        <span className="etichetta">Calendario</span>
        <h1 className="titolo">Eventi sul Titano</h1>
        <p className="sottotitolo">Ogni check-in vale metri per te e per il tuo castello.</p>
      </section>

      {gruppi.length === 0 ? (
        <p className="vuoto">Nessun evento in calendario per ora.</p>
      ) : (
        gruppi.map((g) => (
          <section key={g.chiave} className="sezione" style={{ gap: 10 }}>
            <h2 className="giorno">{g.etichetta}</h2>
            <div className="lista">
              {g.eventi.map((e) => (
                <EventoRiga key={e.id} e={e} />
              ))}
            </div>
          </section>
        ))
      )}
    </>
  );
}
