import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import BottomNav, { type VoceNav } from "@/components/ui/BottomNav";
import SessioneSync from "@/modules/core/components/SessioneSync";
import SceltaCastello from "@/components/SceltaCastello";
import AzioniTesta from "@/components/AzioniTesta";
import AzioniRapide from "@/components/AzioniRapide";
import { getClassifica } from "@/lib/data";

export const revalidate = 60;

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

const VOCI: VoceNav[] = [
  { href: "/", nome: "Home", icona: "home" },
  { href: "/mappa", nome: "Mappa", icona: "mappa" },
  { href: "/sport", nome: "Sport", icona: "sport" },
  { href: "/eventi", nome: "Eventi", icona: "eventi" },
];

export const metadata: Metadata = {
  title: "739 San Marino",
  description: "Tutto San Marino, dalla vetta. Eventi, mappa, castelli e servizi utili in un'unica app.",
  applicationName: "739",
  appleWebApp: { capable: true, title: "739", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFAFA" },
    { media: "(prefers-color-scheme: dark)", color: "#09090B" },
  ],
  colorScheme: "dark light",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const classifica = await getClassifica();

  return (
    <html lang="it" className={`${inter.variable} ${jetbrains.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{document.documentElement.dataset.utente=localStorage.getItem("739-castello")?"tornato":"nuovo"}catch(e){document.documentElement.dataset.utente="nuovo"}`,
          }}
        />
      </head>
      <body>
        <div className="app">
          <header className="top">
            <div className="top-riga mx-auto max-w-[var(--colonna)]">
              <SceltaCastello classifica={classifica} />
              <AzioniTesta />
            </div>
          </header>
          <main className="main">
            {children}
          </main>
          <BottomNav voci={VOCI} centro={<AzioniRapide />} />
          <SessioneSync castelli={classifica} />
        </div>
      </body>
    </html>
  );
}
