"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
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
  RotateCcw,
  Send,
} from "lucide-react";
import type { FeedbackCategory, SessionInfo } from "@/lib/types";

interface FeedbackWidgetProps {
  session: SessionInfo | null;
}

const STORAGE_KEY = "trax_feedback_pos_v3";

export function FeedbackWidget({ session }: FeedbackWidgetProps) {
  const [expanded, setExpanded] = useState(false);
  const [category, setCategory] = useState<FeedbackCategory>("bug");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // If pos is null, the widget is naturally anchored at bottom: 20px, right: 20px via CSS
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const widgetRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const hasMovedRef = useRef(false);
  const startDragRef = useRef<{ clientX: number; clientY: number; startX: number; startY: number }>({
    clientX: 0,
    clientY: 0,
    startX: 0,
    startY: 0,
  });
  const expandedRef = useRef(expanded);
  expandedRef.current = expanded;

  // Safe clamping helper
  const clampCoordinates = useCallback((x: number, y: number, isExp: boolean) => {
    if (typeof window === "undefined") return { x, y };
    const width = isExp ? Math.min(360, window.innerWidth - 24) : 170;
    const height = isExp ? 460 : 44;
    const margin = 10;
    const maxX = Math.max(margin, window.innerWidth - width - margin);
    const maxY = Math.max(margin, window.innerHeight - height - margin);
    return {
      x: Math.max(margin, Math.min(maxX, x)),
      y: Math.max(margin, Math.min(maxY, y)),
    };
  }, []);

  // Restore saved position on mount if valid
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as { x?: number; y?: number };
        if (
          typeof parsed.x === "number" &&
          typeof parsed.y === "number" &&
          parsed.x >= 10 &&
          parsed.x <= window.innerWidth - 120 &&
          parsed.y >= 10 &&
          parsed.y <= window.innerHeight - 40
        ) {
          setPos(clampCoordinates(parsed.x, parsed.y, false));
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch {
      // ignore
    }
  }, [clampCoordinates]);

  // Adjust on window resize or expand/collapse
  useEffect(() => {
    const handleResize = () => {
      setPos((prev) => {
        if (!prev) return null;
        return clampCoordinates(prev.x, prev.y, expandedRef.current);
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [clampCoordinates]);

  // When expanding, ensure the larger card fits on screen
  const handleToggleExpand = (nextExpanded: boolean) => {
    if (nextExpanded && pos) {
      setPos((prev) => (prev ? clampCoordinates(prev.x, prev.y, true) : null));
    }
    setExpanded(nextExpanded);
  };

  // Reset to default bottom-right position
  const handleResetPosition = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPos(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  // Drag start handler
  const handleStartDrag = (e: React.PointerEvent) => {
    if (e.button !== 0) return;

    const target = e.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest("input") ||
      target.closest("textarea") ||
      target.closest("a")
    ) {
      return;
    }

    e.preventDefault();
    isDraggingRef.current = true;
    hasMovedRef.current = false;

    // Get current bounding rect to seamlessly start drag from wherever it currently sits
    const rect = widgetRef.current?.getBoundingClientRect();
    const currentX = rect ? rect.left : (pos?.x ?? Math.max(10, window.innerWidth - 180));
    const currentY = rect ? rect.top : (pos?.y ?? Math.max(10, window.innerHeight - 60));

    startDragRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      startX: currentX,
      startY: currentY,
    };

    let latestClamped = { x: currentX, y: currentY };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!isDraggingRef.current) return;
      const dx = moveEvent.clientX - startDragRef.current.clientX;
      const dy = moveEvent.clientY - startDragRef.current.clientY;

      if (Math.hypot(dx, dy) > 4) {
        hasMovedRef.current = true;
        setIsDragging(true);
      }

      const nextX = startDragRef.current.startX + dx;
      const nextY = startDragRef.current.startY + dy;

      latestClamped = clampCoordinates(nextX, nextY, expandedRef.current);
      setPos(latestClamped);
    };

    const handlePointerUp = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      setIsDragging(false);

      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);

      if (hasMovedRef.current) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(latestClamped));
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
  };

  const handlePillClick = () => {
    if (hasMovedRef.current) return;
    handleToggleExpand(true);
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
          email: session?.authenticated ? session.email : email.trim() || undefined,
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
      }, 2000);
    } catch {
      setErrorMsg("Error de conexión al enviar el reporte.");
    } finally {
      setLoading(false);
    }
  };

  // Position style: default to rock-solid bottom: 20px, right: 20px unless dragged
  const positionStyle: React.CSSProperties = pos
    ? {
        position: "fixed",
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        zIndex: 99999,
        touchAction: "none",
      }
    : {
        position: "fixed",
        bottom: "20px",
        right: "20px",
        zIndex: 99999,
        touchAction: "none",
      };

  return (
    <div
      ref={widgetRef}
      style={positionStyle}
      className={`select-none ${isDragging ? "cursor-grabbing" : ""}`}
    >
      {!expanded ? (
        /* Collapsed Floating Pill */
        <div
          onPointerDown={handleStartDrag}
          onClick={handlePillClick}
          className="group flex items-center gap-2.5 bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white px-4 py-2.5 rounded-full shadow-2xl shadow-rose-950/40 cursor-grab active:cursor-grabbing border-2 border-white/40 backdrop-blur-md transition-all duration-150 hover:scale-105 active:scale-95"
          title="Arrastra para mover o haz clic para reportar un problema"
        >
          <GripVertical className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 shrink-0 pointer-events-none" />
          <Bug className="w-4 h-4 text-white animate-pulse shrink-0 pointer-events-none" />
          <span className="text-xs font-extrabold tracking-tight whitespace-nowrap pointer-events-none shadow-sm">
            Reportar Fallo
          </span>
        </div>
      ) : (
        /* Expanded Feedback Card */
        <div className="w-[330px] sm:w-[360px] max-w-[calc(100vw-24px)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-900 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-150">
          {/* Draggable Header */}
          <div
            onPointerDown={handleStartDrag}
            className="flex items-center justify-between px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 cursor-grab active:cursor-grabbing"
            title="Arrastra desde esta barra para mover la ventana"
          >
            <div className="flex items-center gap-2 pointer-events-none">
              <GripVertical className="w-4 h-4 text-slate-400" />
              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-slate-200">
                <Bug className="w-3.5 h-3.5 text-rose-500" />
                <span>¿Algo no funciona? Reportar</span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {pos && (
                <button
                  type="button"
                  onClick={handleResetPosition}
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition"
                  title="Restablecer posición original"
                  aria-label="Restablecer posición"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => handleToggleExpand(false)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition"
                title="Minimizar (contraer)"
                aria-label="Contraer"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-3.5 space-y-3 text-xs">
            {feedbackSent ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto animate-bounce" />
                <p className="font-bold text-sm text-slate-900 dark:text-white">
                  ¡Reporte recibido!
                </p>
                <p className="text-slate-500 dark:text-slate-400 text-xs">
                  Gracias por ayudarnos a mejorar TraxPDF. Lo revisaremos enseguida.
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
                      className={`flex items-center gap-1.5 p-1.5 rounded-xl border text-[11px] font-medium transition ${
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
                      className={`flex items-center gap-1.5 p-1.5 rounded-xl border text-[11px] font-medium transition ${
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
                      className={`flex items-center gap-1.5 p-1.5 rounded-xl border text-[11px] font-medium transition ${
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
                      className={`flex items-center gap-1.5 p-1.5 rounded-xl border text-[11px] font-medium transition ${
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
                    Descripción del fallo o problema:
                  </label>
                  <textarea
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Ej: Al firmar la página 2 se congeló o el botón no respondió..."
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

                {/* Footer action buttons */}
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
