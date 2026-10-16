import { Icona } from "./Icona";
import type { Lingua } from "@/lib/lingua";

export const NUMERI_EMERGENZA = [
  { numero: "112", nome: "Emergenze e polizia" },
  { numero: "113", nome: "Polizia" },
  { numero: "115", nome: "Vigili del fuoco" },
  { numero: "118", nome: "Ambulanza" },
];

const NOMI_EN: Record<string, string> = { "112": "Emergency and police", "113": "Police", "115": "Fire brigade", "118": "Ambulance" };

/** I numeri di emergenza a un tocco: in cima a Vivere e nella pagina senza rete. */
export default function NumeriEmergenza({ lingua = "it" }: { lingua?: Lingua }) {
  const en = lingua === "en";
  return (
    <section className="sezione" aria-label={en ? "Emergency numbers" : "Numeri di emergenza"}>
      <div className="emergenza">
        {NUMERI_EMERGENZA.map((n) => (
          <a key={n.numero} href={`tel:${n.numero}`} className="premibile">
            <strong>{n.numero}</strong>
            <span>{en ? NOMI_EN[n.numero] : n.nome}</span>
          </a>
        ))}
      </div>
      <p className="meta flex items-center gap-1.5"><Icona nome="telefono" size={14} /> {en ? "Tap a number to call." : "Tocca un numero per chiamare."}</p>
    </section>
  );
}
