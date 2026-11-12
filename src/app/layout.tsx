import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TraxPDF — Rellena, Firma y Corrige PDFs",
  description:
    "Estudio PDF privado, rápido e intuitivo: llena formularios interactivos, firma documentos y corrige errores en segundos.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100">{children}</body>
    </html>
  );
}
