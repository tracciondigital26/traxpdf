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
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100 relative">
        {children}
        <a
          href="https://tracciondigital.com.mx"
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-4 left-4 z-40 group inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/90 px-3.5 py-1.5 text-xs font-medium text-slate-300 shadow-lg shadow-black/50 backdrop-blur-md transition-all duration-200 hover:border-emerald-500/60 hover:bg-slate-800 hover:text-white hover:shadow-emerald-500/10 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          title="Visitar Tracción Digital"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
          </span>
          <span className="text-slate-400">Powered by</span>
          <span className="font-semibold text-slate-100 group-hover:text-emerald-400 transition-colors">
            Tracción Digital
          </span>
          <svg
            className="h-3 w-3 text-slate-400 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-emerald-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </body>
    </html>
  );
}
