// Il marchio di NeonUp, il gestionale di 739 (22/10/2026, richiesta di Alex: «dagli un'icona o immagine propria»).
// Nello stile del logo 739: «Neon» nel corsivo largo e pesante del 739 (`.voce-logo`) e «Up» in una tessera col taglio obliquo.
// Niente tracciati disegnati: è solo testo. Bianco e nero come il logo, mai a colori.

const taglio = (em: number) => `polygon(${em}em 0, 100% 0, calc(100% - ${em}em) 100%, 0 100%)`;

/** La scritta «NeonUp». `chiaro` per il fondo nero (scritta bianca e tessera bianca) */
export function MarchioNeonUp({ altezza = 32, chiaro = false, className = "" }: { altezza?: number; chiaro?: boolean; className?: string }) {
  return (
    <span role="img" aria-label="NeonUp" className={`voce-logo inline-flex items-center whitespace-nowrap ${chiaro ? "text-white" : "text-[#09090B]"} ${className}`} style={{ fontSize: altezza }}>
      <span aria-hidden>Neon</span>
      <span aria-hidden className={chiaro ? "bg-white text-[#09090B]" : "bg-[#09090B] text-white"}
        style={{ marginLeft: "0.1em", padding: "0.1em 0.3em 0.12em 0.26em", clipPath: taglio(0.16) }}>Up</span>
    </span>
  );
}

/** La tessera quadrata, per le icone: la N bianca sul nero e la tessera «Up» col taglio (sotto i 30 px solo la N). `lato` in pixel.
 *  Il file per `Icona` (public/icone-colore/neonup.webp) è questa tessera fotografata a 512 px e ridotta a 128. */
export function TesseraNeonUp({ lato = 40, className = "" }: { lato?: number; className?: string }) {
  return (
    <span aria-hidden className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-[#09090B] text-white ${className}`}
      style={{ width: lato, height: lato, borderRadius: lato * 0.24 }}>
      <span className="voce-logo" style={{ fontSize: lato * 0.6, transform: lato >= 30 ? `translate(${-lato * 0.07}px, ${-lato * 0.05}px)` : undefined }}>N</span>
      {lato >= 30 ? (
        <span className="voce-logo absolute bg-white text-[#09090B]"
          style={{ fontSize: lato * 0.2, right: lato * 0.12, bottom: lato * 0.14, padding: "0.12em 0.32em 0.14em 0.28em", clipPath: taglio(0.18) }}>Up</span>
      ) : null}
    </span>
  );
}
