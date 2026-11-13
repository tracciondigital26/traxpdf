"use client";

import React, { useState } from "react";
import { Check, Cloud, Coins, CreditCard, Crown, Gift, Loader2, Sparkles, X } from "lucide-react";
import type { Dictionary } from "@/lib/i18n";
import { CREDIT_PACKS, SUBSCRIPTION_PLANS } from "@/lib/pricing";
import type { BillingCycle, SessionInfo } from "@/lib/types";
import { authFetch, saveAuthSession } from "@/lib/clientAuth";

interface PricingModalProps {
  open: boolean;
  dict: Dictionary;
  session: SessionInfo | null;
  onClose: () => void;
  onRequireAuth: () => void;
  onSessionUpdated: (session: SessionInfo) => void;
}

export function PricingModal({
  open,
  dict,
  session,
  onClose,
  onRequireAuth,
  onSessionUpdated,
}: PricingModalProps) {
  const t = dict.pricing;
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [promoBusy, setPromoBusy] = useState(false);
  const [promoFeedback, setPromoFeedback] = useState<{ msg: string; tone: "success" | "error" } | null>(null);
  const [portalBusy, setPortalBusy] = useState(false);

  if (!open) return null;

  const handleOpenPortal = async () => {
    setPortalBusy(true);
    setMessage(null);
    try {
      const res = await authFetch("/api/billing/portal", { method: "POST" });
      const data = (await res.json()) as { portalUrl?: string; error?: string };
      if (!res.ok || !data.portalUrl) {
        setMessage(data.error || "No se pudo abrir el portal de Stripe.");
        return;
      }
      window.location.href = data.portalUrl;
    } catch {
      setMessage("Error de red");
    } finally {
      setPortalBusy(false);
    }
  };

  const runCheckout = async (
    payload:
      | { kind: "credits"; packId: "pack_10" | "pack_25" | "pack_55" }
      | { kind: "subscription"; tier: "pro" | "pro_cloud"; cycle: BillingCycle },
    key: string,
  ) => {
    if (!session?.authenticated) {
      onClose();
      onRequireAuth();
      return;
    }
    setBusyKey(key);
    setMessage(null);
    try {
      const res = await authFetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        mode?: "stripe" | "demo";
        checkoutUrl?: string;
        session?: SessionInfo;
        token?: string;
        error?: string;
      };
      if (!res.ok) {
        setMessage(data.error || "Checkout failed");
        return;
      }
      if (data.mode === "stripe" && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      if (data.session) {
        saveAuthSession(data.session, data.token);
        onSessionUpdated(data.session);
        onClose();
      }
    } catch {
      setMessage("Network error");
    } finally {
      setBusyKey(null);
    }
  };

  const handleRedeemPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.authenticated) {
      onClose();
      onRequireAuth();
      return;
    }
    const code = promoCodeInput.trim().toUpperCase();
    if (!code) return;
    setPromoBusy(true);
    setPromoFeedback(null);
    try {
      const res = await authFetch("/api/promo/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await res.json()) as {
        error?: string;
        message?: string;
        session?: SessionInfo;
        token?: string;
      };
      if (!res.ok || !data.session) {
        setPromoFeedback({ tone: "error", msg: data.error || "Código no válido." });
        return;
      }
      saveAuthSession(data.session, data.token);
      onSessionUpdated(data.session);
      setPromoFeedback({ tone: "success", msg: data.message || "¡Código aplicado!" });
      setPromoCodeInput("");
    } catch {
      setPromoFeedback({ msg: "Error de red al canjear", tone: "error" });
    } finally {
      setPromoBusy(false);
    }
  };

  const proCfg = SUBSCRIPTION_PLANS.pro;
  const cloudCfg = SUBSCRIPTION_PLANS.pro_cloud;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-5xl rounded-2xl bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col transition-colors">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div>
            <h2 className="text-xl font-bold">{t.title}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t.subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          {!session?.stripeConfigured && (
            <div className="rounded-xl border border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 px-4 py-2.5 text-xs text-indigo-700 dark:text-indigo-200 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>{t.demoCheckoutBadge}</span>
            </div>
          )}

          {message && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 px-4 py-2.5 text-xs text-rose-700 dark:text-rose-200">
              {message}
            </div>
          )}

          {session?.hasStripeSubscription && session?.stripeConfigured && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/30 text-xs">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {session.plan === "pro_cloud" ? "Plan Pro+ Nube activo" : "Plan Pro Ilimitado activo"}
                </span>
              </div>
              <button
                type="button"
                disabled={portalBusy}
                onClick={handleOpenPortal}
                className="inline-flex items-center gap-1.5 font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {portalBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {portalBusy ? t.openingPortal : t.manageBilling}
              </button>
            </div>
          )}

          {/* Billing Cycle Toggle */}
          <div className="flex justify-center">
            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setCycle("monthly")}
                className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition ${
                  cycle === "monthly"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {t.monthly}
              </button>
              <button
                type="button"
                onClick={() => setCycle("annual")}
                className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition ${
                  cycle === "annual"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {t.annual}
              </button>
            </div>
          </div>

          {/* 4 Tier Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Guest */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 dark:text-white">{t.guestTitle}</span>
                  {session?.plan === "guest" && (
                    <span className="rounded-full bg-slate-200 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-700 dark:text-slate-300">
                      {t.currentPlan}
                    </span>
                  )}
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{t.guestPrice}</div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t.guestDesc}</p>
                <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300 pt-2">
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
                    <span>{t.guestF1}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
                    <span>{t.guestF2}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
                    <span>{t.guestF3}</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Free Account */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 dark:text-white">{t.freeTitle}</span>
                  {session?.plan === "free" && (
                    <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                      {t.currentPlan}
                    </span>
                  )}
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{t.freePrice}</div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t.freeDesc}</p>
                <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300 pt-2">
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
                    <span>{t.freeF1}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
                    <span>{t.freeF2}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
                    <span>{t.freeF3}</span>
                  </li>
                </ul>
              </div>
              {!session?.authenticated && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onRequireAuth();
                  }}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 py-2 text-xs font-semibold text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                >
                  {t.freeCta}
                </button>
              )}
            </div>

            {/* Pro Unlimited */}
            <div className="rounded-2xl border border-indigo-400/60 dark:border-indigo-500/60 bg-indigo-50/40 dark:bg-indigo-950/25 p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white">
                    <Crown className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    {t.proTitle}
                  </span>
                  {session?.plan === "pro" && (
                    <span className="rounded-full bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:text-indigo-300">
                      {t.currentPlan}
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-2xl font-bold text-slate-900 dark:text-white">
                    {cycle === "annual" ? proCfg.annualLabel : proCfg.monthlyLabel}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {cycle === "annual" ? t.perYear : t.perMonth}
                  </span>
                  {cycle === "annual" && (
                    <span className="ml-2 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                      ({t.equivalent} {proCfg.annualMonthlyEquivalent}
                      {t.perMonth})
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t.proDesc}</p>
                <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300 pt-2">
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span>{t.proF1}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span>{t.proF2}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span>{t.proF3}</span>
                  </li>
                </ul>
              </div>
              <button
                type="button"
                disabled={busyKey === "pro" || session?.plan === "pro"}
                onClick={() => runCheckout({ kind: "subscription", tier: "pro", cycle }, "pro")}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition"
              >
                {busyKey === "pro" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {session?.plan === "pro" ? t.currentPlan : t.proCta}
              </button>
            </div>

            {/* Pro+ Cloud */}
            <div className="rounded-2xl border border-emerald-400/60 dark:border-emerald-500/50 bg-gradient-to-b from-emerald-50/50 dark:from-emerald-950/30 to-slate-50/50 dark:to-slate-900/70 p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white">
                    <Cloud className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    {t.cloudTitle}
                  </span>
                  <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                    {session?.plan === "pro_cloud" ? t.currentPlan : t.cloudBadge}
                  </span>
                </div>
                <div>
                  <span className="text-2xl font-bold text-slate-900 dark:text-white">
                    {cycle === "annual" ? cloudCfg.annualLabel : cloudCfg.monthlyLabel}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {cycle === "annual" ? t.perYear : t.perMonth}
                  </span>
                  {cycle === "annual" && (
                    <span className="ml-2 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                      ({t.equivalent} {cloudCfg.annualMonthlyEquivalent}
                      {t.perMonth})
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t.cloudDesc}</p>
                <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300 pt-2">
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>{t.cloudF1}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>{t.cloudF2}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>{t.cloudF3}</span>
                  </li>
                </ul>
              </div>
              <button
                type="button"
                disabled={busyKey === "pro_cloud" || session?.plan === "pro_cloud"}
                onClick={() =>
                  runCheckout({ kind: "subscription", tier: "pro_cloud", cycle }, "pro_cloud")
                }
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition"
              >
                {busyKey === "pro_cloud" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {session?.plan === "pro_cloud" ? t.currentPlan : t.cloudCta}
              </button>
            </div>
          </div>

          {/* Promotional Code Redemption Box */}
          <div className="rounded-2xl border border-indigo-200 dark:border-indigo-800/60 bg-gradient-to-r from-indigo-50/70 via-violet-50/40 to-indigo-50/70 dark:from-indigo-950/30 dark:via-purple-950/20 dark:to-indigo-950/30 p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Gift className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  {t.promoTitle}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">{t.promoSubtitle}</p>
              </div>

              {session?.promoApplied && (
                <div className="inline-flex items-center gap-2 rounded-xl bg-indigo-500/15 border border-indigo-500/30 px-3 py-1.5 text-xs">
                  <span className="font-semibold text-indigo-700 dark:text-indigo-300">
                    {t.promoActiveBadge}: {session.promoApplied}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">·</span>
                  <span className="text-slate-700 dark:text-slate-300">
                    {session.proExpiresAt
                      ? `${t.promoExpires}: ${new Date(session.proExpiresAt).toLocaleDateString()}`
                      : t.promoLifetime}
                  </span>
                </div>
              )}
            </div>

            <form onSubmit={handleRedeemPromo} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
              <input
                type="text"
                value={promoCodeInput}
                onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                placeholder={t.promoPlaceholder}
                className="flex-1 font-mono uppercase tracking-wider rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
              <button
                type="submit"
                disabled={promoBusy || !promoCodeInput.trim()}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition"
              >
                {promoBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {promoBusy ? t.promoRedeeming : t.promoRedeemBtn}
              </button>
            </form>

            {promoFeedback && (
              <div
                className={`rounded-xl px-3 py-2 text-xs border ${
                  promoFeedback.tone === "success"
                    ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
                    : "bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200"
                }`}
              >
                {promoFeedback.msg}
              </div>
            )}
          </div>

          {/* Pay-As-You-Go Wallet ($0.20 / PDF) */}
          <div className="rounded-2xl border border-amber-300/70 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/5 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Coins className="h-5 w-5 text-amber-500 dark:text-amber-400" />
                  {t.creditsTitle}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">{t.creditsSubtitle}</p>
                <p className="text-[11px] text-amber-700 dark:text-amber-300/80">{t.creditsWhyNote}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {CREDIT_PACKS.map((pack) => (
                <div
                  key={pack.id}
                  className={`rounded-xl border p-4 flex items-center justify-between ${
                    pack.popular
                      ? "border-amber-400/80 dark:border-amber-400/60 bg-white dark:bg-slate-900 shadow-sm"
                      : "border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-slate-900 dark:text-white">
                        {pack.credits} PDFs
                      </span>
                      {pack.popular && (
                        <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                          {t.popular}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{pack.perPdfLabel}</div>
                  </div>
                  <button
                    type="button"
                    disabled={busyKey === pack.id}
                    onClick={() => runCheckout({ kind: "credits", packId: pack.id }, pack.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-50 transition"
                  >
                    {busyKey === pack.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {t.buyCredits} {pack.priceLabel}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
