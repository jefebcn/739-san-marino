import { Icona } from "@/components/Icona";

export const metadata = { title: "Utili · 739 San Marino" };

const numeri = [
  { numero: "112", nome: "Emergenze e polizia" },
  { numero: "113", nome: "Polizia" },
  { numero: "115", nome: "Vigili del fuoco" },
  { numero: "118", nome: "Ambulanza" },
];

const inArrivo = [
  { titolo: "Farmacie di turno", dettaglio: "Aggiornate ogni settimana" },
  { titolo: "Raccolta rifiuti", dettaglio: "Calendario per castello" },
  { titolo: "Orari di bus e funivia", dettaglio: "Prossime partenze" },
  { titolo: "Parcheggi", dettaglio: "Posizioni e tariffe" },
];

export default function Utili() {
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
        <div className="sezione-head"><h2>In arrivo</h2></div>
        <div className="lista">
          {inArrivo.map((s) => (
            <div key={s.titolo} className="card">
              <div><h3>{s.titolo}</h3><div className="meta">{s.dettaglio}</div></div>
              <span className="presto">Presto</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
