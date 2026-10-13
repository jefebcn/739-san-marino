export default function Caricamento() {
  return (
    <div aria-busy="true" aria-label="Caricamento" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="scheletro" style={{ height: 14, width: "40%" }} />
      <div className="scheletro" style={{ height: 38, width: "80%" }} />
      <div className="scheletro" style={{ height: 150 }} />
      <div className="scheletro" style={{ height: 80 }} />
      <div className="scheletro" style={{ height: 80 }} />
    </div>
  );
}
