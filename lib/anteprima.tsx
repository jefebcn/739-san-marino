import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Immagini di anteprima dei link (passo 1.7): 1200×630, fondo zinc-950, logo 739 bianco, accento ottone.
// Se c'è una foto sta a destra; altrimenti il titolo prende tutta la larghezza.

export const DIMENSIONI = { width: 1200, height: 630 };

const FONDO = "#09090B";
const OTTONE = "#D4B06A";
const GRIGIO = "#A1A1AA";

async function logo(nome: "ridotto" | "completo") {
  const svg = await readFile(join(process.cwd(), `public/brand/739-${nome}.svg`), "utf8");
  return `data:image/svg+xml;base64,${Buffer.from(svg.replace('fill="currentColor"', 'fill="#FFFFFF"')).toString("base64")}`;
}

export type DatiAnteprima = {
  /** Riga in ottone sopra il titolo: «Evento, sabato 18 ottobre alle 21:00» */
  etichetta: string;
  titolo: string;
  /** Riga grigia sotto il titolo: luogo, castello, sommario */
  sotto?: string | null;
  foto?: string | null;
  /** Punto colore accanto alla riga sotto (il castello) */
  colore?: string | null;
};

export async function anteprima({ etichetta, titolo, sotto, foto, colore }: DatiAnteprima) {
  const marchio = await logo("ridotto");
  const lungo = titolo.length > 60;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: FONDO }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 64px 56px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={marchio} height={52} width={223} alt="" />
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ fontSize: 30, color: OTTONE }}>{etichetta}</div>
            <div style={{ fontSize: lungo ? 52 : foto ? 60 : 72, lineHeight: 1.08, color: "#FFFFFF", letterSpacing: -1.5, display: "flex" }}>{titolo}</div>
            {sotto ? (
              <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 28, color: GRIGIO }}>
                {colore ? <div style={{ width: 18, height: 18, borderRadius: 9, background: colore, flexShrink: 0 }} /> : null}
                <div style={{ display: "flex" }}>{sotto}</div>
              </div>
            ) : null}
          </div>
          <div style={{ fontSize: 24, color: "#71717A" }}>739 San Marino, tutto San Marino dalla vetta</div>
        </div>
        {foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={foto} width={460} height={630} alt="" style={{ objectFit: "cover" }} />
        ) : null}
      </div>
    ),
    DIMENSIONI,
  );
}

/** L'anteprima di riserva (pagina non trovata): solo il marchio */
export async function anteprimaMarchio() {
  const marchio = await logo("completo");
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 36, background: FONDO }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={marchio} width={407} height={300} alt="" />
        <div style={{ fontSize: 34, color: GRIGIO, letterSpacing: -0.5 }}>Tutto San Marino, dalla vetta</div>
      </div>
    ),
    DIMENSIONI,
  );
}
