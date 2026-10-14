import Link from "next/link";
import { Icona } from "./Icona";

/** Intestazione delle sottopagine: torna indietro e titolo. `etichetta` resta per compatibilità ma non si mostra. */
export default function TestaPagina({ href, verso, titolo, children }: { href: string; verso: string; etichetta?: string; titolo: string; children?: React.ReactNode }) {
  return (
    <section className="intro">
      <Link href={href} className="indietro scuro" style={{ marginBottom: 6 }}><Icona nome="freccia" size={18} /> {verso}</Link>
      <h1 className="titolo">{titolo}</h1>
      {children}
    </section>
  );
}
