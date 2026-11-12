"use client";

import dynamic from "next/dynamic";

const TraxPdfApp = dynamic(
  () => import("@/components/TraxPdfApp").then((mod) => mod.TraxPdfApp),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <span className="text-sm font-medium">Cargando TraxPDF Studio...</span>
        </div>
      </div>
    ),
  }
);

export default function HomePage() {
  return <TraxPdfApp />;
}
