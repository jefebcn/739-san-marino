import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import BottomNav, { type VoceNav } from "@/components/ui/BottomNav";
import SessioneSync from "@/modules/core/components/SessioneSync";
import { Analytics } from "@vercel/analytics/next";
import RegistraSW from "@/components/RegistraSW";
import SenzaRete from "@/components/SenzaRete";
import { LinguaHtml, LogoTesta, ProponiInglese } from "@/components/Lingua";
import AzioniTesta from "@/components/AzioniTesta";
import AzioniRapide from "@/components/AzioniRapide";
import { CercaDesktop, NavDesktop } from "@/components/NavDesktop";
import PiedePagina from "@/components/PiedePagina";
import { getClassifica } from "@/lib/data";

export const revalidate = 60;

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });
// I titoli (16/10/2026, richiesta di Alex): un grottesco con carattere, da testata; l'asse opsz adatta il disegno alla grandezza
const titoli = Bricolage_Grotesque({ subsets: ["latin", "latin-ext"], variable: "--font-titoli", display: "swap", axes: ["opsz"] });

const VOCI: VoceNav[] = [
  { href: "/", nome: "Oggi", icona: "home" },
  { href: "/mappa", nome: "Mappa", icona: "mappa" },
  { href: "/sport", nome: "Sport", icona: "sport" },
  { href: "/esplora", nome: "Esplora", icona: "esplora" },
];

// Le pagine inglesi (/en) hanno la loro barra, senza il + (lib/lingua.ts)
const VOCI_EN: VoceNav[] = [
  { href: "/en", nome: "Today", icona: "home" },
  { href: "/en/map", nome: "Map", icona: "mappa" },
  { href: "/en/events", nome: "Events", icona: "eventi" },
  { href: "/en/eat", nome: "Eat", icona: "food" },
  { href: "/en/stay", nome: "Stay", icona: "dormire" },
];

export const metadata: Metadata = {
  metadataBase: new URL("https://739-san-marino.vercel.app"),
  title: "739 San Marino",
  description: "Tutto San Marino, dalla vetta. Eventi, mappa, castelli e servizi utili in un'unica app.",
  applicationName: "739",
  // Anteprima dei link: le pagine con un opengraph-image.tsx proprio (eventi, contenuti, speciali, Bollettino, luoghi) la sostituiscono
  openGraph: { siteName: "739 San Marino", locale: "it_IT", type: "website", title: "739 San Marino", description: "Tutto San Marino, dalla vetta. Eventi, mappa, castelli e servizi utili in un'unica app." },
  twitter: { card: "summary_large_image" },
  appleWebApp: { capable: true, title: "739", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  // Icone generate da scripts/icone.mjs: le torri fino a 64 px, il marchio completo sopra
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48" },
      { url: "/icons/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-64.png", sizes: "64x64", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  // Un tema solo, chiaro per tutti (16/10/2026)
  themeColor: "#FFFFFF",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const classifica = await getClassifica();

  return (
    <html lang="it" className={`${geist.variable} ${geistMono.variable} ${titoli.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `var p=location.pathname;if(p==="/en"||p.indexOf("/en/")===0)document.documentElement.lang="en";try{var l=localStorage.getItem("739-lingua"),n=navigator.languages||[navigator.language];if(l==="en"||(!l&&!n.some(function(x){return /^it/i.test(x)})))document.documentElement.dataset.ospite="1"}catch(e){}try{document.documentElement.dataset.utente=localStorage.getItem("739-castello")?"tornato":"nuovo"}catch(e){document.documentElement.dataset.utente="nuovo"}`,
          }}
        />
      </head>
      <body>
        <div className="app">
          <header className="top">
            {/* Telefono: logo e azioni. Computer (da 1024 px): testata da sito con aree e ricerca */}
            <div className="top-riga mx-auto max-w-[var(--colonna)] lg:max-w-[var(--larga)] lg:gap-6">
              <LogoTesta />
              <NavDesktop />
              <div className="flex min-w-0 items-center gap-2">
                <CercaDesktop />
                <AzioniTesta classifica={classifica} />
              </div>
            </div>
          </header>
          <main className="main">
            <SenzaRete />
            <ProponiInglese />
            {children}
            <PiedePagina />
          </main>
          <BottomNav voci={VOCI} vociEn={VOCI_EN} centro={<AzioniRapide />} />
          <LinguaHtml />
          <SessioneSync castelli={classifica} />
          {/* Visite anonime, senza cookie (Vercel Web Analytics): si accende dal pannello di Vercel */}
          <Analytics />
          <RegistraSW />
        </div>
      </body>
    </html>
  );
}
