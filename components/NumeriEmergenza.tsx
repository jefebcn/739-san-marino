import { Icona } from "./Icona";

export const NUMERI_EMERGENZA = [
  { numero: "112", nome: "Emergenze e polizia" },
  { numero: "113", nome: "Polizia" },
  { numero: "115", nome: "Vigili del fuoco" },
  { numero: "118", nome: "Ambulanza" },
];

/** I numeri di emergenza a un tocco: in cima a Vivere e nella pagina senza rete. */
export default function NumeriEmergenza() {
  return (
    <section className="sezione" aria-label="Numeri di emergenza">
      <div className="emergenza">
        {NUMERI_EMERGENZA.map((n) => (
          <a key={n.numero} href={`tel:${n.numero}`} className="premibile">
            <strong>{n.numero}</strong>
            <span>{n.nome}</span>
          </a>
        ))}
      </div>
      <p className="meta flex items-center gap-1.5"><Icona nome="telefono" size={14} /> Tocca un numero per chiamare.</p>
    </section>
  );
}
