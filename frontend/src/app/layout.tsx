import type { Metadata } from "next";
import "./globals.css";

import { LanguageProvider } from "@/context/LanguageContext";
import OfflineBanner from "@/components/pwa/OfflineBanner";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://museek.app",
  ),
  title: {
    default: "Museek - Le Blindtest Musical Multijoueur Personnalisé",
    template: "%s | Museek",
  },
  description:
    "Le blindtest où vous jouez avec VOS musiques ! Créez ou rejoignez une partie en ligne et testez vos connaissances musicales entre amis avec Spotify, Deezer ou Apple Music.",
  applicationName: "Museek",
  authors: [{ name: "Museek" }],
  creator: "Museek",
  publisher: "Museek",
  keywords: [
    "blindtest",
    "blind test",
    "quizz musical",
    "jeu musical",
    "blindtest multijoueur",
    "blindtest en ligne",
    "blindtest spotify",
    "blindtest deezer",
    "blindtest apple music",
    "jeu de musique",
    "museek",
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "/",
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      {
        url: "/favicon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: [
      {
        url: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "/",
    siteName: "Museek",
    title: "Museek - Le Blindtest Musical Multijoueur Personnalisé",
    description:
      "Le blindtest où vous jouez avec VOS musiques ! Créez ou rejoignez une partie en ligne et testez vos connaissances musicales entre amis.",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Museek - Blindtest musical",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Museek - Le Blindtest Musical Multijoueur Personnalisé",
    description:
      "Le blindtest où vous jouez avec VOS musiques ! Créez ou rejoignez une partie en ligne et testez vos connaissances musicales entre amis.",
    images: ["/opengraph-image.png"],
  },
  category: "game",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="h-full antialiased">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                window.deferredPrompt = e;
                window.dispatchEvent(new CustomEvent('pwa-prompt-available'));
              });
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning className="flex min-h-full flex-col">
        <LanguageProvider>
          {children}
          <OfflineBanner />
        </LanguageProvider>
      </body>
    </html>
  );
}
