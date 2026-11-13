"use client";

import React, { useState } from "react";
import { Check, Copy, Sparkles, X, Zap } from "lucide-react";
import type { Dictionary } from "@/lib/i18n";
import type { SessionInfo } from "@/lib/types";

interface BetaBannerProps {
  dict: Dictionary;
  session: SessionInfo | null;
  onOpenRegisterWithCode: (code: string) => void;
  onClaimCodeDirectly: (code: string) => void;
}

export function BetaBanner({
  dict,
  session,
  onOpenRegisterWithCode,
  onClaimCodeDirectly,
}: BetaBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState(false);

  if (dismissed) {
    return null;
  }

  const t = dict.banner;
  const promoCode = t.code;
  const isAlreadyPro = session?.plan === "pro" || session?.plan === "pro_cloud";

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(promoCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissed(true);
  };

  const handleAction = () => {
    if (!session?.authenticated) {
      onOpenRegisterWithCode(promoCode);
    } else {
      onClaimCodeDirectly(promoCode);
    }
  };

  return (
    <aside
      aria-label="Anuncio Fase Beta"
      className="relative z-50 w-full bg-gradient-to-r from-indigo-900 via-indigo-700 to-purple-800 text-white shadow-md border-b border-indigo-400/30 text-xs py-2 px-3 sm:px-6 transition-all duration-300"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4">
        {/* Left: Badge + Message */}
        <div className="flex items-center gap-2.5 text-center sm:text-left flex-wrap justify-center sm:justify-start">
          <span className="inline-flex items-center gap-1 bg-amber-400 text-slate-950 font-black text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-full shadow-sm shrink-0">
            <Sparkles className="w-3 h-3 text-slate-950 fill-slate-950" />
            {t.betaTag}
          </span>
          <span className="font-semibold text-white leading-tight">
            {t.message}
          </span>
        </div>

        {/* Right: Code pill + Action CTA + Dismiss */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Interactive Code Chip */}
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 bg-black/40 hover:bg-black/60 text-white font-mono font-bold px-2.5 py-1 rounded-lg border border-white/30 transition shadow-inner group"
            title={t.copyCode}
          >
            <span className="text-[10px] text-indigo-200 font-sans font-normal">
              {t.codeLabel}
            </span>
            <span className="tracking-wide text-amber-300 font-black text-[11px]">
              {promoCode}
            </span>
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-300" />
            ) : (
              <Copy className="w-3 h-3 text-white/70 group-hover:text-white" />
            )}
          </button>

          {/* Action CTA Button */}
          <button
            type="button"
            onClick={handleAction}
            className="inline-flex items-center gap-1 bg-white hover:bg-amber-300 text-slate-950 font-extrabold px-3 py-1 rounded-lg shadow transition active:scale-95 text-[11px]"
          >
            <Zap className="w-3 h-3 text-indigo-700 fill-indigo-700" />
            <span>
              {isAlreadyPro
                ? dict.brand === "TraxPDF"
                  ? "Plan Pro Activo ✨"
                  : "Pro Active ✨"
                : t.activateBtn}
            </span>
          </button>

          {/* Dismiss button */}
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1 text-white/80 hover:text-white hover:bg-white/20 rounded-md transition ml-1"
            title={t.dismiss}
            aria-label={t.dismiss}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
