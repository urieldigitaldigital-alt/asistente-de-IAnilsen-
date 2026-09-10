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

// Necesario para que las URLs relativas de abajo (icons, openGraph.images)
// se resuelvan a absolutas — Google y las redes sociales solo siguen URLs
// completas, nunca "/logo.png" tal cual.
const SITE_URL = "https://www.asistentnilsenia.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Asistente Nilsen IA",
  description: "Panel de gestión del agente de voz IA para negocios con agendamiento de citas",
  // Declarar "icon" a mano en vez de dejar que src/app/icon.png se detecte
  // solo: al definir "icons" acá (por el "apple" de abajo), Next deja de
  // autogenerar el <link rel="icon"> del ícono por convención de archivo —
  // sin esto, la pestaña del navegador y Google se quedan sin favicon.
  icons: { icon: "/logo.png", shortcut: "/logo.png", apple: "/logo.png" },
  // "apple-mobile-web-app-capable": Safari solo permite notificaciones push
  // cuando el sitio se instaló como app desde "Compartir → Agregar a inicio"
  // — desde una pestaña normal, el permiso de notificaciones se ignora.
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Nilsen IA" },
  // El logo como imagen de vista previa: la usa Google al mostrar el sitio
  // en resultados de búsqueda, y WhatsApp/redes sociales al compartir el link.
  openGraph: {
    title: "Asistente Nilsen IA",
    description: "Panel de gestión del agente de voz IA para negocios con agendamiento de citas",
    url: SITE_URL,
    siteName: "Asistente Nilsen IA",
    images: [{ url: "/logo.png", width: 1254, height: 1254, alt: "Asistente Nilsen IA" }],
    locale: "es_AR",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Asistente Nilsen IA",
    description: "Panel de gestión del agente de voz IA para negocios con agendamiento de citas",
    images: ["/logo.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0d12",
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
