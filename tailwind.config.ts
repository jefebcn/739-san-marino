import type { Config } from "tailwindcss";

// Design system 739: zinc come base, ottone come accento.
// I colori "di ruolo" puntano alle variabili di app/globals.css, così seguono il tema chiaro/scuro.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./modules/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ottone: {
          50: "#FBF7EE",
          100: "#F4EBD3",
          200: "#EBD9AE",
          300: "#E3C98E",
          400: "#D4B06A",
          500: "#C9A45C",
          600: "#A88444",
          700: "#8A6A2E",
          800: "#654D24",
          900: "#45351C",
        },
        fondo: "var(--sfondo)",
        superficie: "var(--superficie)",
        "superficie-2": "var(--superficie-2)",
        testo: "var(--testo)",
        "testo-2": "var(--testo-2)",
        linea: "var(--linea)",
        accento: "var(--accento)",
        "accento-tenue": "var(--accento-tenue)",
        "su-accento": "var(--su-accento)",
        pannello: "var(--pannello)",
        segnale: "var(--segnale)",
        "segnale-pieno": "var(--segnale-pieno)",
        azzurro: "#5EB6E4",
        ok: "var(--ok)",
      },
      fontFamily: {
        sans: ["var(--font)"],
        mono: ["var(--mono)"],
      },
      backgroundImage: {
        metallo: "var(--ottone-metallo)",
      },
      boxShadow: {
        minima: "var(--ombra)",
        lucido: "inset 0 1px 0 rgba(255, 255, 255, 0.35)",
      },
    },
  },
};

export default config;
