import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Orden Colegio · Hualqui",
  description: "Registro de espacios, inventario, fotos y videos de recepción y devolución.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Orden Colegio" },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
