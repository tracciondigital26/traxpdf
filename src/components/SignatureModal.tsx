"use client";

import React, { useEffect, useRef, useState } from "react";
import { Check, Eraser, PenTool, Trash2, Type, Upload, X } from "lucide-react";
import type { Dictionary } from "@/lib/i18n";

interface SignatureModalProps {
  open: boolean;
  dict: Dictionary;
  onClose: () => void;
  onSelectSignature: (dataUrl: string) => void;
}

const STORAGE_KEY = "traxpdf_saved_signatures";
const INK_COLORS = ["#0F172A", "#1D4ED8", "#B91C1C"];

export function SignatureModal({ open, dict, onClose, onSelectSignature }: SignatureModalProps) {
  const t = dict.editor.signatureModal;
  const [tab, setTab] = useState<"draw" | "type" | "upload">("draw");
  const [inkColor, setInkColor] = useState(INK_COLORS[0]);
  const [typedName, setTypedName] = useState("");
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [savedSignatures, setSavedSignatures] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as string[];
        if (Array.isArray(parsed)) return parsed.slice(0, 6);
      }
    } catch {
      // ignore storage errors
    }
    return [];
  });
  const [hasDrawn, setHasDrawn] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);

  useEffect(() => {
    if (!open || tab !== "draw") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 3;
    ctx.strokeStyle = inkColor;
  }, [open, tab, inkColor]);

  if (!open) return null;

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const pos = getPos(e);
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = 3.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    isDrawingRef.current = true;
    setHasDrawn(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const handlePointerUp = () => {
    isDrawingRef.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const renderTypedSignatureDataUrl = (): string | null => {
    if (!typedName.trim()) return null;
    const canvas = document.createElement("canvas");
    canvas.width = 560;
    canvas.height = 180;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = inkColor;
    ctx.font = "italic 64px 'Georgia', 'Times New Roman', serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(typedName.trim(), canvas.width / 2, canvas.height / 2);
    return canvas.toDataURL("image/png");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setUploadedUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const getCurrentSignatureUrl = (): string | null => {
    if (tab === "draw") {
      if (!hasDrawn || !canvasRef.current) return null;
      return canvasRef.current.toDataURL("image/png");
    }
    if (tab === "type") {
      return renderTypedSignatureDataUrl();
    }
    return uploadedUrl;
  };

  const handleConfirm = (saveToProfile: boolean) => {
    const url = getCurrentSignatureUrl();
    if (!url) return;
    if (saveToProfile) {
      const next = [url, ...savedSignatures.filter((s) => s !== url)].slice(0, 6);
      setSavedSignatures(next);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore quota
      }
    }
    onSelectSignature(url);
    onClose();
  };

  const removeSaved = (idx: number) => {
    const next = savedSignatures.filter((_, i) => i !== idx);
    setSavedSignatures(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t.title}</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Tabs */}
          <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
            <button
              type="button"
              onClick={() => setTab("draw")}
              className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition ${
                tab === "draw"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <PenTool className="h-4 w-4" />
              {t.drawTab}
            </button>
            <button
              type="button"
              onClick={() => setTab("type")}
              className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition ${
                tab === "type"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Type className="h-4 w-4" />
              {t.typeTab}
            </button>
            <button
              type="button"
              onClick={() => setTab("upload")}
              className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition ${
                tab === "upload"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Upload className="h-4 w-4" />
              {t.uploadTab}
            </button>
          </div>

          {/* Ink Color Picker */}
          {tab !== "upload" && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{t.inkColor}:</span>
                {INK_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setInkColor(color)}
                    className={`h-6 w-6 rounded-full border-2 transition ${
                      inkColor === color ? "border-indigo-500 scale-110" : "border-slate-300 dark:border-slate-700"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              {tab === "draw" && (
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  <Eraser className="h-3.5 w-3.5" />
                  {t.clear}
                </button>
              )}
            </div>
          )}

          {/* Tab Body */}
          {tab === "draw" && (
            <div className="relative rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 overflow-hidden">
              <canvas
                ref={canvasRef}
                width={560}
                height={180}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className="w-full h-44 touch-none cursor-crosshair block"
              />
              <div className="pointer-events-none absolute inset-x-8 bottom-6 border-b border-slate-300 dark:border-slate-700" />
            </div>
          )}

          {tab === "type" && (
            <div className="space-y-3">
              <input
                type="text"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                placeholder={t.typePlaceholder}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
              <div className="flex h-36 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-4">
                <span
                  className="text-4xl italic select-none"
                  style={{ fontFamily: "'Georgia', 'Times New Roman', serif", color: inkColor }}
                >
                  {typedName.trim() || t.typePlaceholder}
                </span>
              </div>
            </div>
          )}

          {tab === "upload" && (
            <label className="flex flex-col items-center justify-center h-44 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 cursor-pointer hover:border-indigo-400 transition p-4">
              {uploadedUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={uploadedUrl} alt="Signature preview" className="max-h-36 object-contain" />
              ) : (
                <div className="text-center space-y-2">
                  <Upload className="h-8 w-8 mx-auto text-slate-400" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">{t.uploadPrompt}</p>
                </div>
              )}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          )}

          {/* Saved Signatures */}
          {savedSignatures.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                {t.savedTitle}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {savedSignatures.map((sig, i) => (
                  <div
                    key={i}
                    className="group relative rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 p-2 hover:border-indigo-400 transition cursor-pointer"
                    onClick={() => {
                      onSelectSignature(sig);
                      onClose();
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={sig} alt="Saved signature" className="h-12 w-full object-contain" />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSaved(i);
                      }}
                      className="hidden group-hover:flex absolute -top-2 -right-2 h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white shadow"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => handleConfirm(false)}
              className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              {t.useSignature}
            </button>
            <button
              type="button"
              onClick={() => handleConfirm(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 shadow-sm transition"
            >
              <Check className="h-4 w-4" />
              {t.saveAndUse}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
