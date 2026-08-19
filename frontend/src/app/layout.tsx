import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Music Blender",
  description: "Music Blender",
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
