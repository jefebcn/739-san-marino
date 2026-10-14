import { anteprimaMarchio, DIMENSIONI } from "@/lib/anteprima";

// Anteprima dei link a 739 (WhatsApp, Instagram, messaggi): il marchio Completo, bianco su zinc-950.
// Eventi, contenuti, speciali, Bollettino e luoghi hanno la loro (lib/anteprima.tsx).
export const alt = "739 San Marino";
export const size = DIMENSIONI;
export const contentType = "image/png";

export default function Anteprima() {
  return anteprimaMarchio();
}
