import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import BottomNav, { type VoceNav } from "@/components/ui/BottomNav";
import SessioneSync from "@/modules/core/components/SessioneSync";
import { Logo } from "@/components/Logo";
import Link from "next/link";
import AzioniTesta from "@/components/AzioniTesta";
import AzioniRapide from "@/components/AzioniRapide";
import { getClassifica } from "@/lib/data";

export const revalidate = 60;

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });

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
    <html lang="it" className={`${geist.variable} ${geistMono.variable}`} suppressHydrationWarning>
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
              <Link href="/" aria-label="739, torna alla Home" className="shrink-0">
                <Logo />
              </Link>
              <AzioniTesta classifica={classifica} />
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
