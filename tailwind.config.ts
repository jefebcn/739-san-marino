import type { Config } from "tailwindcss";

// Configurazione di base di Tailwind (v4, caricata da app/globals.css con @config).
// I colori del design system 739 arrivano nello step 2.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./modules/**/*.{ts,tsx}"],
  theme: {
    extend: {},
  },
};

export default config;
