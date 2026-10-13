export const metadata = { title: "Utili · 739 San Marino" };

const numeri = [
  { numero: "112", nome: "Emergenze e polizia" },
  { numero: "113", nome: "Polizia" },
  { numero: "115", nome: "Vigili del fuoco" },
  { numero: "118", nome: "Ambulanza" },
];

export default function Utili() {
  return (
    <>
      <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span className="etichetta">Utili ed emergenze</span>
        <h1 className="titolo">Quello che serve, quando serve</h1>
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 style={{ fontSize: 20 }}>Numeri di emergenza</h2>
        <div className="emergenza">
          {numeri.map((n) => (
            <a key={n.numero} href={`tel:${n.numero}`}>
              <strong>{n.numero}</strong>
              <span>{n.nome}</span>
            </a>
          ))}
        </div>
        <p className="meta">Tocca un numero per chiamare.</p>
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 style={{ fontSize: 20 }}>In arrivo</h2>
        <div className="lista">
          <div className="card"><div><h3>Farmacie di turno</h3><div className="meta">Aggiornate ogni settimana</div></div></div>
          <div className="card"><div><h3>Raccolta rifiuti</h3><div className="meta">Calendario per castello</div></div></div>
          <div className="card"><div><h3>Orari di bus e funivia</h3><div className="meta">Prossime partenze</div></div></div>
        </div>
      </section>
    </>
  );
}
