"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Bug,
  CheckCircle2,
  FileQuestion,
  GripVertical,
  HelpCircle,
  Lightbulb,
  Loader2,
  Minimize2,
  Send,
} from "lucide-react";
import type { FeedbackCategory, SessionInfo } from "@/lib/types";

interface FeedbackWidgetProps {
  session: SessionInfo | null;
}

export function FeedbackWidget({ session }: FeedbackWidgetProps) {
  const [expanded, setExpanded] = useState(false);
  const [category, setCategory] = useState<FeedbackCategory>("bug");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Position state (relative to viewport)
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    if (typeof window === "undefined") return { x: 20, y: 20 };
    // Default: bottom-right corner
    return {
      x: Math.max(16, window.innerWidth - 240),
      y: Math.max(16, window.innerHeight - 80),
    };
  });

  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);

  // Keep in bounds on resize
  useEffect(() => {
    const handleResize = () => {
      setPos((prev) => ({
        x: Math.min(prev.x, Math.max(16, window.innerWidth - (expanded ? 340 : 220))),
        y: Math.min(prev.y, Math.max(16, window.innerHeight - (expanded ? 420 : 60))),
      }));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [expanded]);

  // Pointer drag listeners
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    hasMovedRef.current = false;
    dragOffsetRef.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    hasMovedRef.current = true;
    const maxX = window.innerWidth - (expanded ? 340 : 200);
    const maxY = window.innerHeight - (expanded ? 440 : 50);

    const newX = Math.max(12, Math.min(maxX, e.clientX - dragOffsetRef.current.x));
    const newY = Math.max(12, Math.min(maxY, e.clientY - dragOffsetRef.current.y));

    setPos({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || message.trim().length < 5) {
      setErrorMsg("Por favor describe el reporte (mínimo 5 caracteres).");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          message: message.trim(),
          email: session?.authenticated ? session.email : (email.trim() || undefined),
          url: typeof window !== "undefined" ? window.location.href : undefined,
        }),
      });

      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setErrorMsg(data.error || "No se pudo enviar el reporte.");
        return;
      }

      setFeedbackSent(true);
      setMessage("");
      setTimeout(() => {
        setFeedbackSent(false);
        setExpanded(false);
      }, 2200);
    } catch {
      setErrorMsg("Error de conexión al enviar el reporte.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        zIndex: 9999,
      }}
      className="select-none transition-shadow"
    >
      {!expanded ? (
        /* Collapsed Floating Pill */
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onClick={() => {
            if (!hasMovedRef.current) {
              setExpanded(true);
            }
          }}
          className="group flex items-center gap-2 bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white px-3.5 py-2 rounded-full shadow-xl shadow-rose-950/20 cursor-grab active:cursor-grabbing border border-white/25 backdrop-blur-md transition-transform duration-150 hover:scale-105 active:scale-95"
          title="Arrastra para mover o haz clic para reportar un fallo"
        >
          <GripVertical className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 shrink-0" />
          <Bug className="w-4 h-4 text-white animate-pulse shrink-0" />
          <span className="text-xs font-bold tracking-tight whitespace-nowrap">
            Reportar Fallo
          </span>
        </div>
      ) : (
        /* Expanded Feedback Card */
        <div className="w-[330px] sm:w-[360px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-900 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-150">
          {/* Draggable Header */}
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="flex items-center justify-between px-4 py-3 bg-slate-100 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 cursor-grab active:cursor-grabbing"
            title="Arrastra para mover el formulario"
          >
            <div className="flex items-center gap-2">
              <GripVertical className="w-4 h-4 text-slate-400" />
              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-slate-200">
                <Bug className="w-3.5 h-3.5 text-rose-500" />
                <span>¿Algo no funciona? Reportar</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition"
              title="Minimizar (contraer)"
              aria-label="Contraer"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 space-y-3.5 text-xs">
            {feedbackSent ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto animate-bounce" />
                <p className="font-bold text-sm text-slate-900 dark:text-white">
                  ¡Reporte recibido!
                </p>
                <p className="text-slate-500 dark:text-slate-400 text-xs">
                  Gracias por ayudarnos a perfeccionar TraxPDF. Lo revisaremos de inmediato.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                {errorMsg && (
                  <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 flex items-center gap-1.5 text-[11px]">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Category selector */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    Tipo de problema:
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCategory("bug")}
                      className={`flex items-center gap-1.5 p-2 rounded-xl border text-[11px] font-medium transition ${
                        category === "bug"
                          ? "bg-rose-500/10 border-rose-500/40 text-rose-600 dark:text-rose-400 font-bold"
                          : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <Bug className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span>Fallo / Error</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCategory("pdf_issue")}
                      className={`flex items-center gap-1.5 p-2 rounded-xl border text-[11px] font-medium transition ${
                        category === "pdf_issue"
                          ? "bg-indigo-500/10 border-indigo-500/40 text-indigo-600 dark:text-indigo-400 font-bold"
                          : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <FileQuestion className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span>Problema PDF</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCategory("suggestion")}
                      className={`flex items-center gap-1.5 p-2 rounded-xl border text-[11px] font-medium transition ${
                        category === "suggestion"
                          ? "bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400 font-bold"
                          : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>Sugerencia</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCategory("other")}
                      className={`flex items-center gap-1.5 p-2 rounded-xl border text-[11px] font-medium transition ${
                        category === "other"
                          ? "bg-purple-500/10 border-purple-500/40 text-purple-600 dark:text-purple-400 font-bold"
                          : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                      <span>Otro</span>
                    </button>
                  </div>
                </div>

                {/* Description textarea */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    Descripción del fallo o qué hacías:
                  </label>
                  <textarea
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Ej: Al intentar firmar la página 2 se congeló..."
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-2.5 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 resize-none"
                    required
                  />
                </div>

                {/* Optional Email if not authenticated */}
                {!session?.authenticated && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      Tu correo (opcional, para avisarte al corregirlo):
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu@correo.com"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-rose-500"
                    />
                  </div>
                )}

                {/* Submit button */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-400">
                    Arrastra la barra para mover
                  </span>
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold px-3.5 py-1.5 rounded-xl shadow transition active:scale-95 disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>Enviar</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
