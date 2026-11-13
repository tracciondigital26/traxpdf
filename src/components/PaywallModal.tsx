"use client";

import React from "react";
import { Coins, Crown, Lock, UserPlus, X } from "lucide-react";
import type { Dictionary } from "@/lib/i18n";
import type { SessionInfo } from "@/lib/types";

interface PaywallModalProps {
  open: boolean;
  dict: Dictionary;
  session: SessionInfo | null;
  onClose: () => void;
  onOpenAuth: () => void;
  onOpenPricing: () => void;
}

export function PaywallModal({
  open,
  dict,
  session,
  onClose,
  onOpenAuth,
  onOpenPricing,
}: PaywallModalProps) {
  if (!open) return null;
  const t = dict.paywall;
  const isGuest = !session?.authenticated;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden transition-colors">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-amber-500 dark:text-amber-400" />
            <h3 className="text-lg font-bold">{t.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {isGuest ? t.guestDesc : t.freeDesc}
          </p>

          <div className="space-y-3">
            {isGuest && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAuth();
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-500 transition"
              >
                <UserPlus className="h-4 w-4" />
                {t.createFreeBtn}
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenPricing();
              }}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-sm font-bold text-slate-950 hover:bg-amber-400 transition"
            >
              <Coins className="h-4 w-4" />
              {t.topUpTitle} ($2.00 = 10 PDFs)
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenPricing();
              }}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-500 transition"
            >
              <Crown className="h-4 w-4" />
              {t.upgradeTitle}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
