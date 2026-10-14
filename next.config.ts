import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Vecchi indirizzi, prima delle cinque aree (docs/piano.md): continuano a funzionare
  async redirects() {
    return [
      { source: "/utili", destination: "/vivere", permanent: true },
      { source: "/food", destination: "/uscire/mangiare", permanent: true },
      { source: "/business", destination: "/lavorare#aziende", permanent: true },
    ];
  },
};

export default nextConfig;
