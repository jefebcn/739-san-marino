import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variante = "primario" | "secondario" | "interno" | "fantasma";
type Dimensione = "md" | "sm";

type Comune = {
  children: ReactNode;
  variante?: Variante;
  dimensione?: Dimensione;
  icona?: ReactNode;
  /** Occupa tutta la larghezza disponibile */
  pieno?: boolean;
  className?: string;
};

type ComeLink = Comune & { href: string; esterno?: boolean };
type ComeBottone = Comune & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className"> & { href?: undefined };

const BASE =
  "inline-flex select-none items-center justify-center gap-2 rounded-xl font-semibold tracking-tight transition-[transform,filter,background-color] duration-150 ease-out active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-5 [&_svg]:shrink-0";

const VARIANTI: Record<Variante, string> = {
  // Nero col taglio obliquo dei numeri del logo
  primario: "taglio bg-metallo text-su-accento !rounded-none hover:bg-zinc-800",
  secondario: "bg-superficie text-testo hover:bg-superficie-2",
  // Dentro una scheda bg-superficie, dove il secondario sparirebbe
  interno: "bg-fondo text-testo hover:bg-superficie-2",
  fantasma: "text-accento hover:bg-accento-tenue",
};

const DIMENSIONI: Record<Dimensione, string> = {
  md: "h-12 px-5 text-[15px]",
  sm: "h-10 px-4 text-sm",
};

/** Bottone principale di 739: nero col taglio obliquo del logo per le azioni primarie. Diventa un link se riceve `href`. */
export default function PrimaryButton(props: ComeLink | ComeBottone) {
  const { children, variante = "primario", dimensione = "md", icona, pieno, className = "" } = props;
  const classi = `${BASE} ${VARIANTI[variante]} ${DIMENSIONI[dimensione]} ${pieno ? "w-full" : ""} ${className}`;
  const contenuto = (
    <>
      {icona}
      {children}
    </>
  );

  if (props.href !== undefined) {
    const { href, esterno } = props;
    return esterno ? (
      <a href={href} target="_blank" rel="noopener" className={classi}>{contenuto}</a>
    ) : (
      <Link href={href} className={classi}>{contenuto}</Link>
    );
  }

  const { variante: _v, dimensione: _d, icona: _i, pieno: _p, className: _c, children: _ch, type = "button", ...resto } = props;
  return (
    <button type={type} className={classi} {...resto}>
      {contenuto}
    </button>
  );
}
