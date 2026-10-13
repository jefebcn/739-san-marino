import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { Logo } from "@/components/Logo";
import BottomNav, { type VoceNav } from "@/components/ui/BottomNav";
import SessioneSync from "@/modules/core/components/SessioneSync";
import { HudCastello } from "@/components/Castello";
import { Altimetro } from "@/components/Quota";
import { getClassifica } from "@/lib/data";

export const revalidate = 60;

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

const VOCI: VoceNav[] = [
  { href: "/", nome: "Home", icona: "home" },
  { href: "/sport", nome: "Sport", icona: "sport" },
  { href: "/mappa", nome: "Mappa", icona: "mappa" },
  { href: "/eventi", nome: "Eventi", icona: "eventi" },
  { href: "/profile", nome: "ID", icona: "id" },
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
  // I metri personali arriveranno con l'accesso: fino ad allora la quota parte da 0.
  const metriPersonali = 0;

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
            <div className="top-riga">
              <Link href="/" aria-label="Home">
                <Logo />
              </Link>
              <HudCastello classifica={classifica} />
            </div>
            <Altimetro metri={metriPersonali} />
          </header>
          <main className="main">
            {children}
          </main>
          <BottomNav voci={VOCI} />
          <SessioneSync castelli={classifica} />
        </div>
      </body>
    </html>
  );
}
