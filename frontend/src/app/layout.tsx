import type { Metadata } from "next";
import "./globals.css";

import { LanguageProvider } from "@/context/LanguageContext";
import OfflineBanner from "@/components/pwa/OfflineBanner";

export const metadata: Metadata = {
  title: "Museek",
  description:
    "Le blindtest où vous jouez avec VOS musiques ! Créez ou rejoignez une partie et testez vos connaissances musicales et celles de vos amis.",
  manifest: "/manifest.json",
  icons: [
    {
      url: "/favicon.svg",
      sizes: "any",
      type: "image/svg+xml",
    },
  ],
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
