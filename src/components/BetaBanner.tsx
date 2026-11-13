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

const STORAGE_DISMISS_KEY = "trax_beta_banner_dismissed_v1";

export function BetaBanner({
  dict,
  session,
  onOpenRegisterWithCode,
  onClaimCodeDirectly,
}: BetaBannerProps) {
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return sessionStorage.getItem(STORAGE_DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });

  const [copied, setCopied] = useState(false);

  // If dismissed or user is already Pro/Pro Cloud, do not show the banner
  if (dismissed || session?.plan === "pro" || session?.plan === "pro_cloud") {
    return null;
  }

  const t = dict.banner;
  const promoCode = t.code;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(promoCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissed(true);
    try {
      sessionStorage.setItem(STORAGE_DISMISS_KEY, "1");
    } catch {
      // ignore
    }
  };

  const handleAction = () => {
    if (!session?.authenticated) {
      onOpenRegisterWithCode(promoCode);
    } else {
      onClaimCodeDirectly(promoCode);
    }
  };

  return (
    <div className="relative z-40 bg-gradient-to-r from-indigo-700 via-violet-700 to-purple-800 text-white shadow-sm border-b border-indigo-400/20 text-xs py-2 px-3 sm:px-6 transition-all duration-300">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4">
        {/* Left: Badge + Message */}
        <div className="flex items-center gap-2.5 text-center sm:text-left flex-wrap justify-center sm:justify-start">
          <span className="inline-flex items-center gap-1 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-black text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-full border border-white/30 shrink-0">
            <Sparkles className="w-3 h-3 text-amber-300" />
            {t.betaTag}
          </span>
          <span className="font-medium text-indigo-50 leading-tight">
            {t.message}
          </span>
        </div>

        {/* Right: Code pill + Action CTA + Dismiss */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Interactive Code Chip */}
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 bg-black/25 hover:bg-black/40 text-white font-mono font-bold px-2.5 py-1 rounded-lg border border-white/20 transition shadow-inner group"
            title={t.copyCode}
          >
            <span className="text-[10px] text-indigo-200 font-sans font-normal">
              {t.codeLabel}
            </span>
            <span className="tracking-wide text-amber-300">{promoCode}</span>
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
            className="inline-flex items-center gap-1 bg-white text-indigo-900 hover:bg-indigo-50 font-bold px-3 py-1 rounded-lg shadow-sm transition active:scale-95 text-[11px]"
          >
            <Zap className="w-3 h-3 text-indigo-700 fill-indigo-700" />
            <span>{t.activateBtn}</span>
          </button>

          {/* Dismiss button */}
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1 text-white/70 hover:text-white hover:bg-white/10 rounded-md transition ml-1"
            title={t.dismiss}
            aria-label={t.dismiss}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
