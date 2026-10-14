import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Anteprima dei link a 739 (WhatsApp, Instagram, messaggi): il marchio Completo, bianco su zinc-950.
export const alt = "739 San Marino";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Anteprima() {
  // Il logo arriva dal file in public/brand, così resta uno solo
  const svg = await readFile(join(process.cwd(), "public/brand/739-completo.svg"), "utf8");
  const bianco = svg.replace('fill="currentColor"', 'fill="#FFFFFF"');
  const src = `data:image/svg+xml;base64,${Buffer.from(bianco).toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 36, background: "#09090B" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} width={407} height={300} alt="" />
        <div style={{ fontSize: 34, color: "#A1A1AA", letterSpacing: -0.5 }}>Tutto San Marino, dalla vetta</div>
      </div>
    ),
    size,
  );
}
