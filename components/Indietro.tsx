import Link from "next/link";
import { Icona } from "./Icona";

/** Intestazione delle sottopagine: torna indietro, etichetta e titolo. */
export default function TestaPagina({ href, verso, etichetta, titolo, children }: { href: string; verso: string; etichetta: string; titolo: string; children?: React.ReactNode }) {
  return (
    <section className="intro">
      <Link href={href} className="indietro scuro" style={{ marginBottom: 6 }}><Icona nome="freccia" size={18} /> {verso}</Link>
      <span className="etichetta">{etichetta}</span>
      <h1 className="titolo">{titolo}</h1>
      {children}
    </section>
  );
}
