import Link from "next/link";
import { Cime } from "@/components/Logo";

export default function NonTrovato() {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "flex-start", paddingTop: 24 }}>
      <Cime width={90} />
      <h1 className="titolo">Qui non c&apos;è niente</h1>
      <p className="sottotitolo">La pagina che cerchi non esiste o è stata spostata.</p>
      <Link href="/" className="bottone primario premibile" style={{ width: "100%" }}>Torna alla home</Link>
    </section>
  );
}
