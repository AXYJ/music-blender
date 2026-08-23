import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Museek",
  description:
    "Le blindtest où vous jouez avec VOS musiques ! Créez ou rejoignez une partie et testez vos connaissances musicales et celles de vos amis.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body suppressHydrationWarning className="flex min-h-full flex-col">
        {children}
      </body>
    </html>
  );
}
