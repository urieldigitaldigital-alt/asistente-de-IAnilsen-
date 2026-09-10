import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Asistente Nilsen IA",
  description: "Panel de gestión del agente de voz IA para negocios con agendamiento de citas",
  icons: { apple: "/logo.png" },
  // "apple-mobile-web-app-capable": Safari solo permite notificaciones push
  // cuando el sitio se instaló como app desde "Compartir → Agregar a inicio"
  // — desde una pestaña normal, el permiso de notificaciones se ignora.
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Nilsen IA" },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">{children}</body>
    </html>
  );
}
