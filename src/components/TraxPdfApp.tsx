"use client";

import React, { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
  CheckCircle2,
  Cloud,
  Coins,
  Eraser,
  FileCheck2,
  FileText,
  Globe,
  LogOut,
  PenTool,
  ShieldCheck,
  Sparkles,
  Upload,
  User,
  Zap,
} from "lucide-react";
import { detectLocale, dictionaries } from "@/lib/i18n";
import { generateSamplePdf } from "@/lib/pdf/samplePdf";
import type { Locale, SessionInfo } from "@/lib/types";
import { AuthModal } from "./AuthModal";
import { CloudVaultModal } from "./CloudVaultModal";
import { PaywallModal } from "./PaywallModal";
import { PdfEditor } from "./PdfEditor";
import { PricingModal } from "./PricingModal";

const LOCALE_STORAGE_KEY = "traxpdf_locale";
const LOCALE_EVENT = "traxpdf-locale-change";

function subscribeLocale(callback: () => void) {
  window.addEventListener(LOCALE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(LOCALE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getLocaleSnapshot(): Locale {
  const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (saved === "es" || saved === "en") return saved;
  return detectLocale(navigator.language);
}

function getServerLocaleSnapshot(): Locale {
  return "en";
}

export function TraxPdfApp() {
  const locale = useSyncExternalStore(
    subscribeLocale,
    getLocaleSnapshot,
    getServerLocaleSnapshot,
  );
  const [session, setSession] = useState<SessionInfo | null>(null);

  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [pdfName, setPdfName] = useState<string>("document.pdf");
  const [draggingOver, setDraggingOver] = useState(false);

  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("register");
  const [pricingOpen, setPricingOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [cloudOpen, setCloudOpen] = useState(false);

  const [toast, setToast] = useState<{ msg: string; tone: "success" | "error" } | null>(null);

  const dict = dictionaries[locale];

  const notify = useCallback((msg: string, tone: "success" | "error" = "success") => {
    setToast({ msg, tone });
    setTimeout(() => {
      setToast((prev) => (prev?.msg === msg ? null : prev));
    }, 4500);
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch("/api/session", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as SessionInfo;
        setSession(data);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const res = await fetch("/api/session", { cache: "no-store" });
        if (!cancelled && res.ok) {
          const data = (await res.json()) as SessionInfo;
          setSession(data);
        }
      } catch {
        // ignore
      }
    }
    void init();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleLocale = () => {
    const next: Locale = locale === "en" ? "es" : "en";
    localStorage.setItem(LOCALE_STORAGE_KEY, next);
    window.dispatchEvent(new Event(LOCALE_EVENT));
  };

  const loadFile = async (file: File) => {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      notify(locale === "es" ? "Por favor selecciona un archivo PDF válido." : "Please select a valid PDF file.", "error");
      return;
    }
    const buf = await file.arrayBuffer();
    setPdfBytes(new Uint8Array(buf));
    setPdfName(file.name);
  };

  const handleLoadSample = async () => {
    const bytes = await generateSamplePdf(locale);
    setPdfBytes(bytes);
    setPdfName(locale === "es" ? "Acuerdo-TraxPDF-Ejemplo.pdf" : "TraxPDF-Sample-Agreement.pdf");
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    await refreshSession();
  };

  const renderPlanBadge = () => {
    if (!session) return null;
    const n = dict.nav;
    if (session.plan === "pro_cloud") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-xs font-semibold text-emerald-300">
          <Cloud className="h-3.5 w-3.5" />
          {n.proCloudBadge} · {n.unlimited}
        </span>
      );
    }
    if (session.plan === "pro") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 px-2.5 py-1 text-xs font-semibold text-indigo-300">
          <Zap className="h-3.5 w-3.5" />
          {n.proBadge} · {n.unlimited}
        </span>
      );
    }
    const label = session.plan === "free" ? n.freeBadge : n.guestBadge;
    return (
      <div className="flex items-center gap-1.5">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 border border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-200">
          <span>{label}:</span>
          <strong className="text-white">
            {session.remainingToday}/{session.dailyLimit}
          </strong>
          <span className="hidden sm:inline text-slate-400">{n.leftToday}</span>
        </span>
        {session.authenticated && (
          <button
            type="button"
            onClick={() => setPricingOpen(true)}
            className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 text-xs font-semibold text-amber-300 hover:bg-amber-500/25"
          >
            <Coins className="h-3.5 w-3.5" />
            {session.credits} {n.creditsLabel}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Top Navbar */}
      <header className="h-16 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur px-4 sm:px-6 flex items-center justify-between gap-3 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPdfBytes(null)}
            className="flex items-center gap-2.5 group"
          >
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-white">
              Trax<span className="text-indigo-400">PDF</span>
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {renderPlanBadge()}

          <button
            type="button"
            onClick={() => setCloudOpen(true)}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-emerald-500/40 hover:text-white"
          >
            <Cloud className="h-3.5 w-3.5 text-emerald-400" />
            {dict.nav.cloudVault}
          </button>

          <button
            type="button"
            onClick={() => setPricingOpen(true)}
            className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800"
          >
            {dict.nav.pricing}
          </button>

          <button
            type="button"
            onClick={toggleLocale}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800"
            title="Switch Language"
          >
            <Globe className="h-3.5 w-3.5 text-indigo-400" />
            {locale.toUpperCase()}
          </button>

          {session?.authenticated ? (
            <div className="flex items-center gap-2">
              <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-slate-300 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5">
                <User className="h-3.5 w-3.5 text-indigo-400" />
                {session.name}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-xl border border-slate-800 p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                title={dict.nav.signOut}
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setAuthMode("login");
                setAuthOpen(true);
              }}
              className="rounded-xl bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-950 hover:bg-slate-200 transition"
            >
              {dict.nav.signIn}
            </button>
          )}
        </div>
      </header>

      {/* Main Content: Editor OR Landing */}
      {pdfBytes ? (
        <PdfEditor
          sourceBytes={pdfBytes}
          fileName={pdfName}
          dict={dict}
          session={session}
          onBackHome={() => setPdfBytes(null)}
          onSessionRefresh={refreshSession}
          onOpenPaywall={() => setPaywallOpen(true)}
          onOpenPricing={() => setPricingOpen(true)}
          onNotify={notify}
        />
      ) : (
        <main className="flex-1">
          {/* Hero Section */}
          <section className="relative overflow-hidden px-4 pt-14 pb-20 sm:px-6 lg:px-8">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/30 via-slate-950 to-slate-950" />

            <div className="relative mx-auto max-w-4xl text-center space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-1 text-xs font-medium text-indigo-300">
                <Sparkles className="h-3.5 w-3.5" />
                {dict.hero.pill}
              </div>

              <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-[1.08]">
                {dict.hero.titleStart}{" "}
                <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-emerald-400 bg-clip-text text-transparent">
                  {dict.hero.titleHighlight}
                </span>
              </h1>

              <p className="mx-auto max-w-2xl text-base sm:text-lg text-slate-300 leading-relaxed">
                {dict.hero.subtitle}
              </p>

              {/* Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDraggingOver(true);
                }}
                onDragLeave={() => setDraggingOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDraggingOver(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) void loadFile(file);
                }}
                className={`mt-8 rounded-3xl border-2 border-dashed p-8 sm:p-12 transition ${
                  draggingOver
                    ? "border-indigo-400 bg-indigo-500/15 scale-[1.01]"
                    : "border-slate-800 bg-slate-900/70 hover:border-indigo-500/60"
                }`}
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400 mb-4">
                  <Upload className="h-7 w-7" />
                </div>
                <h2 className="text-xl font-bold text-white">{dict.hero.dropTitle}</h2>
                <p className="text-sm text-slate-400 mt-1 mb-6">{dict.hero.dropSubtitle}</p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <label className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition">
                    <Upload className="h-4 w-4" />
                    {dict.hero.selectFileBtn}
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void loadFile(file);
                      }}
                    />
                  </label>

                  <button
                    type="button"
                    onClick={handleLoadSample}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-5 py-3 text-sm font-semibold text-slate-100 hover:bg-slate-800 transition"
                  >
                    <Sparkles className="h-4 w-4 text-emerald-400" />
                    {dict.hero.trySampleBtn}
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-3">{dict.hero.sampleDesc}</p>
              </div>

              {/* Trust Badges */}
              <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  {dict.hero.trust1}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <FileCheck2 className="h-4 w-4 text-indigo-400" />
                  {dict.hero.trust2}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Coins className="h-4 w-4 text-amber-400" />
                  {dict.hero.trust3}
                </span>
              </div>
            </div>
          </section>

          {/* Features Grid */}
          <section className="border-t border-slate-900 bg-slate-950/60 px-4 py-16 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-5xl space-y-10">
              <h2 className="text-center text-2xl sm:text-3xl font-bold text-white">
                {dict.features.title}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 space-y-2.5">
                  <div className="h-10 w-10 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
                    <FileCheck2 className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-white">{dict.features.f1Title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{dict.features.f1Desc}</p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 space-y-2.5">
                  <div className="h-10 w-10 rounded-xl bg-violet-500/15 text-violet-400 flex items-center justify-center">
                    <PenTool className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-white">{dict.features.f2Title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{dict.features.f2Desc}</p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 space-y-2.5">
                  <div className="h-10 w-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
                    <Eraser className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-white">{dict.features.f3Title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{dict.features.f3Desc}</p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 space-y-2.5">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                    <Cloud className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-white">{dict.features.f4Title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{dict.features.f4Desc}</p>
                </div>
              </div>
            </div>
          </section>
        </main>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-semibold shadow-2xl border ${
            toast.tone === "success"
              ? "bg-slate-900 text-emerald-300 border-emerald-500/40"
              : "bg-slate-900 text-rose-300 border-rose-500/40"
          }`}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Modals */}
      <AuthModal
        open={authOpen}
        initialMode={authMode}
        dict={dict}
        onClose={() => setAuthOpen(false)}
        onSuccess={(s) => setSession(s)}
      />

      <PricingModal
        open={pricingOpen}
        dict={dict}
        session={session}
        onClose={() => setPricingOpen(false)}
        onRequireAuth={() => {
          setAuthMode("register");
          setAuthOpen(true);
        }}
        onSessionUpdated={(s) => {
          setSession(s);
          notify(
            locale === "es" ? "¡Plan / créditos actualizados!" : "Plan / credits updated!",
            "success",
          );
        }}
      />

      <PaywallModal
        open={paywallOpen}
        dict={dict}
        session={session}
        onClose={() => setPaywallOpen(false)}
        onOpenAuth={() => {
          setAuthMode("register");
          setAuthOpen(true);
        }}
        onOpenPricing={() => setPricingOpen(true)}
      />

      <CloudVaultModal
        open={cloudOpen}
        dict={dict}
        session={session}
        onClose={() => setCloudOpen(false)}
        onOpenPricing={() => setPricingOpen(true)}
        onOpenPdfBytes={(bytes, name) => {
          setPdfBytes(bytes);
          setPdfName(name);
        }}
      />
    </div>
  );
}
