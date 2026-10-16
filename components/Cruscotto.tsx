import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Il cruscotto nero, come «Adesso» in Oggi: i numeri di adesso scritti come il 739 del logo, con la parola sotto.
 * Due colonne sul telefono, `colonne` su computer. Le celle si separano con una riga sottile (il fondo tra le celle).
 */
export function Cruscotto({ children, colonne = 4, etichetta, className = "" }: { children: ReactNode; colonne?: 2 | 3 | 4; etichetta: string; className?: string }) {
  const lg = colonne === 4 ? "lg:grid-cols-4" : colonne === 3 ? "lg:grid-cols-3" : "";
  return (
    <div role="group" aria-label={etichetta} className={`cruscotto gap-px bg-white/10 ${lg} ${className}`}>
      {children}
    </div>
  );
}

/** Una cella: cosa misura, il numero grande con la parola sotto, una riga di nota. Con `href` porta alla sua pagina. */
export function Cella({ href, titolo, valore, unita, nota, avviso = false }: { href?: string; titolo: string; valore: ReactNode; unita?: string; nota?: ReactNode; avviso?: boolean }) {
  const corpo = (
    <>
      <span className="text-[13px] font-medium text-zinc-400">{titolo}</span>
      <span className="mt-auto pt-3">
        <span className="grande">{valore}{unita ? <small>{unita}</small> : null}</span>
      </span>
      {nota ? <span className={`mt-1.5 line-clamp-2 text-[12px] leading-snug ${avviso ? "text-[#F28B74]" : "text-zinc-400"}`}>{nota}</span> : null}
    </>
  );
  const classe = "flex min-h-[132px] flex-col bg-[#09090B] p-4";
  return href ? (
    <Link href={href} className={`${classe} transition-colors hover:bg-zinc-900`}>{corpo}</Link>
  ) : (
    <div className={classe}>{corpo}</div>
  );
}
