"use client";

import React, { useState } from "react";
import {
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  ExternalLink,
  Receipt,
  Sparkles,
  User,
  X,
  Zap,
} from "lucide-react";
import type { Dictionary } from "@/lib/i18n";
import type { SessionInfo } from "@/lib/types";

interface AccountModalProps {
  open: boolean;
  onClose: () => void;
  session: SessionInfo | null;
  dict: Dictionary;
  onOpenPricing: () => void;
  onSessionRefresh: () => void;
}

export function AccountModal({
  open,
  onClose,
  session,
  dict,
  onOpenPricing,
  onSessionRefresh,
}: AccountModalProps) {
  const [copiedId, setCopiedId] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);

  if (!open || !session || !session.authenticated) return null;

  const t = dict.account;

  const copyUserId = () => {
    if (!session.userId) return;
    navigator.clipboard.writeText(session.userId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleOpenStripePortal = async () => {
    setPortalLoading(true);
    setPortalError(null);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        setPortalError(data.error || "No se pudo abrir el portal de facturación.");
      }
    } catch {
      setPortalError("Error de red al conectar con Stripe.");
    } finally {
      setPortalLoading(false);
    }
  };

  const planBadge = () => {
    switch (session.plan) {
      case "pro_cloud":
        return {
          title: "Pro+ Nube",
          color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
          desc: "PDFs ilimitados + Bóveda en la nube sincronizada",
        };
      case "pro":
        return {
          title: "Pro Ilimitado",
          color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
          desc: "Exportaciones y correcciones de PDF sin ningún límite diario",
        };
      case "free":
      default:
        return {
          title: "Gratis (3 PDFs/día)",
          color: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
          desc: "3 PDFs por día gratis, recargas de $0.20/PDF o acceso Pro",
        };
    }
  };

  const planInfo = planBadge();
  const purchases = session.purchases || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                {t.title}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t.subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* User info strip */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 dark:text-white text-base">
                  {session.name || "Usuario"}
                </span>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${planInfo.color}`}
                >
                  {planInfo.title}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <span>{session.email}</span>
                <span>•</span>
                <span className="font-mono text-[11px] text-slate-400">
                  {session.userId}
                </span>
                <button
                  type="button"
                  onClick={copyUserId}
                  className="hover:text-slate-900 dark:hover:text-white transition p-0.5"
                  title="Copiar ID"
                >
                  {copiedId ? (
                    <Check className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </p>
            </div>

            <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
              <button
                type="button"
                onClick={() => {
                  onSessionRefresh();
                }}
                className="text-xs text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition font-medium"
              >
                Actualizar
              </button>
            </div>
          </div>

          {/* Cards Grid: Credits Balance & Subscription Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Card 1: Credits Balance */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/20 flex flex-col justify-between space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    {t.creditsBalance}
                  </span>
                  <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {session.credits}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {t.creditsDesc}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPricing();
                }}
                className="w-full py-2 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center justify-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5" />
                {t.buyCreditsBtn}
              </button>
            </div>

            {/* Card 2: Subscription & Expiry */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-violet-500/5 to-transparent border border-indigo-500/20 flex flex-col justify-between space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    {t.accountStatus}
                  </span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {session.plan !== "free" ? "Activo" : "Estándar"}
                  </span>
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                  {session.promoApplied ? (
                    <div className="space-y-0.5">
                      <p className="font-semibold text-indigo-600 dark:text-indigo-400">
                        {t.promoActive} ({session.promoApplied})
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {session.proExpiresAt
                          ? `${t.expiresOn}: ${new Date(session.proExpiresAt).toLocaleDateString(dict.brand === "TraxPDF" ? "es-MX" : "en-US", { year: "numeric", month: "short", day: "numeric" })}`
                          : t.lifetimeAccess}
                      </p>
                    </div>
                  ) : session.hasStripeSubscription ? (
                    <div className="space-y-0.5">
                      <p className="font-semibold text-indigo-600 dark:text-indigo-400">
                        {t.subActive} (
                        {session.billingCycle === "annual" ? "Anual" : "Mensual"}
                        )
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Renovación automática vía Stripe
                      </p>
                    </div>
                  ) : (
                    <p className="text-slate-500 text-xs">{t.noSub}</p>
                  )}
                </div>
              </div>

              {session.hasStripeSubscription ? (
                <button
                  type="button"
                  onClick={handleOpenStripePortal}
                  disabled={portalLoading}
                  className="w-full py-2 px-3.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {portalLoading ? "Abriendo portal..." : t.manageSubBtn}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenPricing();
                  }}
                  className="w-full py-2 px-3.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {t.upgradeProBtn}
                </button>
              )}
            </div>
          </div>

          {portalError && (
            <p className="text-xs text-rose-500 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-xl border border-rose-200 dark:border-rose-800">
              {portalError}
            </p>
          )}

          {/* Section: Purchase & Credit History */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                {t.historyTitle}
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                {purchases.length} {purchases.length === 1 ? "registro" : "registros"}
              </span>
            </div>

            {purchases.length === 0 ? (
              <div className="py-8 px-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
                <CreditCard className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t.emptyHistory}
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                      <th className="py-2.5 px-3 font-semibold">{t.colDate}</th>
                      <th className="py-2.5 px-3 font-semibold">{t.colConcept}</th>
                      <th className="py-2.5 px-3 font-semibold">{t.colAmount}</th>
                      <th className="py-2.5 px-3 font-semibold text-right">{t.colStatus}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {purchases.map((p) => {
                      const d = new Date(p.date);
                      const formattedDate = !isNaN(d.getTime())
                        ? d.toLocaleDateString("es-MX", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : p.date;

                      return (
                        <tr
                          key={p.id}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition text-slate-700 dark:text-slate-300"
                        >
                          <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                            {formattedDate}
                          </td>
                          <td className="py-3 px-3 font-medium text-slate-900 dark:text-white">
                            <div className="flex items-center gap-1.5">
                              {p.kind === "credits" ? (
                                <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              ) : p.kind === "promo" ? (
                                <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                              ) : (
                                <CreditCard className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              )}
                              <span>{p.description}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap font-mono font-semibold">
                            {p.amount > 0 ? (
                              `$${p.amount.toFixed(2)} ${p.currency}`
                            ) : (
                              <span className="text-emerald-600 dark:text-emerald-400 font-sans">
                                Gratis
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                                p.status === "completed"
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                  : p.status === "active"
                                    ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20"
                                    : "bg-slate-500/10 text-slate-600 border-slate-500/20"
                              }`}
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              {p.status === "completed"
                                ? t.statusCompleted
                                : p.status === "active"
                                  ? t.statusActive
                                  : t.statusCancelled}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
