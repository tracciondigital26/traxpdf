"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Download,
  Eraser,
  EyeOff,
  FileEdit,
  Highlighter,
  Loader2,
  MousePointer2,
  PenTool,
  Redo2,
  RotateCw,
  Share2,
  Trash2,
  Type,
  User,
  Undo2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { Dictionary } from "@/lib/i18n";
import { exportModifiedPdf } from "@/lib/pdf/exportPdf";
import type {
  AnnotationFont,
  DetectedFormField,
  PdfAnnotation,
  SessionInfo,
  ToolMode,
} from "@/lib/types";
import { SignatureModal } from "./SignatureModal";
import { ProfileModal } from "./ProfileModal";

interface PdfEditorProps {
  sourceBytes: Uint8Array;
  fileName: string;
  dict: Dictionary;
  session: SessionInfo | null;
  onBackHome: () => void;
  onSessionRefresh: () => Promise<void>;
  onOpenPaywall: () => void;
  onOpenPricing: () => void;
  onNotify: (msg: string, tone?: "success" | "error") => void;
}

interface PdfJsAnnotation {
  id: string;
  subtype?: string;
  fieldName?: string;
  fieldType?: string;
  rect?: number[];
  fieldValue?: unknown;
  checkBox?: boolean;
  radioButton?: boolean;
  combo?: boolean;
  listBox?: boolean;
  multiLine?: boolean;
  exportValue?: string;
  buttonValue?: string;
  options?: Array<{ displayValue?: string; exportValue?: string }>;
}

interface DetectedTextRun {
  id: string;
  str: string;
  x: number; // normalized 0..1
  y: number;
  width: number;
  height: number;
  fontSize: number;
}

const TEXT_COLORS = ["#111827", "#1D4ED8", "#B91C1C", "#15803D", "#6D28D9"];
const COVER_COLORS = ["#FFFFFF", "#F8FAFC", "#FEF9C3", "#F1F5F9"];

export function PdfEditor({
  sourceBytes,
  fileName,
  dict,
  session,
  onBackHome,
  onSessionRefresh,
  onOpenPaywall,
  onOpenPricing,
  onNotify,
}: PdfEditorProps) {
  const t = dict.editor;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pdfDocProxy, setPdfDocProxy] = useState<any>(null);
  const [numPages, setNumPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(0); // 0-based
  const [zoom, setZoom] = useState(1.15);
  const [pageSize, setPageSize] = useState({ width: 612, height: 792 });
  const [pageRotations, setPageRotations] = useState<Record<number, number>>({});

  const [tool, setTool] = useState<ToolMode>("select");
  const [pendingSignatureUrl, setPendingSignatureUrl] = useState<string | null>(null);
  const [sigModalOpen, setSigModalOpen] = useState(false);

  const [formFields, setFormFields] = useState<DetectedFormField[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, string | boolean>>({});
  const [textRuns, setTextRuns] = useState<DetectedTextRun[]>([]);

  const [annotations, setAnnotations] = useState<PdfAnnotation[]>([]);
  const [historyPast, setHistoryPast] = useState<PdfAnnotation[][]>([]);
  const [historyFuture, setHistoryFuture] = useState<PdfAnnotation[][]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  const [flatten, setFlatten] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [savingCloud, setSavingCloud] = useState(false);
  const [deletedPages, setDeletedPages] = useState<number[]>([]);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      setCanShare(true);
    }
  }, []);

  const [dragBox, setDragBox] = useState<{
    startX: number;
    startY: number;
    curX: number;
    curY: number;
  } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const renderTaskRef = useRef<{ cancel?: () => void } | null>(null);

  const commitAnnotations = useCallback(
    (updater: (prev: PdfAnnotation[]) => PdfAnnotation[]) => {
      setAnnotations((prev) => {
        const next = updater(prev);
        setHistoryPast((past) => [...past.slice(-29), prev]);
        setHistoryFuture([]);
        return next;
      });
    },
    [],
  );

  const handleUndo = useCallback(() => {
    setHistoryPast((past) => {
      if (past.length === 0) return past;
      const previous = past[past.length - 1];
      setAnnotations((current) => {
        setHistoryFuture((future) => [current, ...future]);
        return previous;
      });
      return past.slice(0, -1);
    });
  }, []);

  const handleRedo = useCallback(() => {
    setHistoryFuture((future) => {
      if (future.length === 0) return future;
      const next = future[0];
      setAnnotations((current) => {
        setHistoryPast((past) => [...past, current]);
        return next;
      });
      return future.slice(1);
    });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (editingTextId) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
      } else if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        commitAnnotations((prev) => prev.filter((a) => a.id !== selectedId));
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [commitAnnotations, editingTextId, handleRedo, handleUndo, selectedId]);

  // Load PDF document via pdfjs-dist
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      // Pass a slice copy so worker transfer never detaches sourceBytes
      const loadingTask = pdfjsLib.getDocument({ data: sourceBytes.slice() });
      const doc = await loadingTask.promise;
      if (cancelled) return;
      setPdfDocProxy(doc);
      setNumPages(doc.numPages);
      setCurrentPage(0);
      setAnnotations([]);
      setHistoryPast([]);
      setHistoryFuture([]);
      setPageRotations({});
      setSelectedId(null);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [sourceBytes]);

  // Extract interactive AcroForm fields across all pages
  useEffect(() => {
    if (!pdfDocProxy) return;
    let cancelled = false;

    async function extractFields() {
      const collected: DetectedFormField[] = [];
      const initialVals: Record<string, string | boolean> = {};

      for (let pageIdx = 0; pageIdx < pdfDocProxy.numPages; pageIdx++) {
        const page = await pdfDocProxy.getPage(pageIdx + 1);
        const extraRot = pageRotations[pageIdx] || 0;
        const viewport = page.getViewport({
          scale: 1,
          rotation: (page.rotate + extraRot) % 360,
        });
        const annots = (await page.getAnnotations()) as PdfJsAnnotation[];

        for (const annot of annots) {
          if (annot.subtype !== "Widget" || !annot.rect || !annot.fieldName) continue;
          const [x1, y1, x2, y2] = viewport.convertToViewportRectangle(annot.rect);
          const minX = Math.min(x1, x2);
          const maxX = Math.max(x1, x2);
          const minY = Math.min(y1, y2);
          const maxY = Math.max(y1, y2);

          const normX = minX / viewport.width;
          const normY = minY / viewport.height;
          const normW = (maxX - minX) / viewport.width;
          const normH = (maxY - minY) / viewport.height;

          let fieldType: DetectedFormField["fieldType"] = "text";
          let value: string | boolean = "";
          let options: string[] | undefined;

          if (annot.checkBox) {
            fieldType = "checkbox";
            value = Boolean(annot.fieldValue && annot.fieldValue !== "Off");
          } else if (annot.radioButton) {
            fieldType = "radio";
            value = annot.fieldValue === annot.buttonValue;
          } else if (annot.combo || annot.listBox) {
            fieldType = "select";
            options = (annot.options ?? [])
              .map((o) => o.exportValue || o.displayValue || "")
              .filter(Boolean);
            value = Array.isArray(annot.fieldValue)
              ? String(annot.fieldValue[0] ?? "")
              : String(annot.fieldValue ?? options[0] ?? "");
          } else {
            fieldType = "text";
            value = String(annot.fieldValue ?? "");
          }

          const fieldKey = `${annot.fieldName}::${annot.id}`;
          if (!(annot.fieldName in initialVals)) {
            initialVals[annot.fieldName] = value;
          }

          collected.push({
            id: fieldKey,
            name: annot.fieldName,
            pageIndex: pageIdx,
            fieldType,
            x: normX,
            y: normY,
            width: normW,
            height: normH,
            value,
            options,
            exportValue: annot.buttonValue || annot.exportValue,
            multiline: Boolean(annot.multiLine),
          });
        }
      }

      if (cancelled) return;
      setFormFields(collected);
      if (collected.length === 0) {
        setTool((prev) => (prev === "select" ? "text" : prev));
      }
      setFieldValues((prev) => {
        // Keep user edits if re-extracting after rotation
        const merged = { ...initialVals };
        for (const k of Object.keys(prev)) {
          merged[k] = prev[k];
        }
        return merged;
      });
    }

    void extractFields();
    return () => {
      cancelled = true;
    };
  }, [pdfDocProxy, pageRotations]);

  // Extract text runs on active page so flat PDFs can be edited inline
  useEffect(() => {
    if (!pdfDocProxy) return;
    let cancelled = false;

    async function extractTextRuns() {
      const pdfjsLib = await import("pdfjs-dist");
      const page = await pdfDocProxy.getPage(currentPage + 1);
      if (cancelled) return;

      const extraRot = pageRotations[currentPage] || 0;
      const viewport = page.getViewport({
        scale: 1,
        rotation: (page.rotate + extraRot) % 360,
      });
      const content = await page.getTextContent();
      if (cancelled) return;

      const runs: DetectedTextRun[] = [];
      let idx = 0;
      for (const item of content.items) {
        if (!("str" in item) || !item.str || !item.str.trim()) continue;
        const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
        const fontHeight = Math.max(8, Math.hypot(tx[2], tx[3]) || item.height || 12);
        const itemWidth = Math.max(18, item.width || fontHeight * item.str.length * 0.55);
        const baselineY = tx[5];
        const topY = baselineY - fontHeight * 0.88;

        runs.push({
          id: `tr_${currentPage}_${idx++}`,
          str: item.str,
          x: Math.max(0, tx[4] / viewport.width),
          y: Math.max(0, topY / viewport.height),
          width: Math.min(1, itemWidth / viewport.width),
          height: Math.min(1, (fontHeight * 1.35) / viewport.height),
          fontSize: Math.round(Math.min(36, Math.max(8, fontHeight * 0.92))),
        });
      }
      setTextRuns(runs);
    }

    void extractTextRuns();
    return () => {
      cancelled = true;
    };
  }, [pdfDocProxy, currentPage, pageRotations]);

  // Render active page to canvas
  useEffect(() => {
    if (!pdfDocProxy || !canvasRef.current) return;
    let cancelled = false;

    async function renderPage() {
      const page = await pdfDocProxy.getPage(currentPage + 1);
      if (cancelled) return;

      const extraRot = pageRotations[currentPage] || 0;
      const viewport = page.getViewport({
        scale: zoom,
        rotation: (page.rotate + extraRot) % 360,
      });

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      setPageSize({
        width: Math.floor(viewport.width),
        height: Math.floor(viewport.height),
      });

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (renderTaskRef.current?.cancel) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // ignore
        }
      }

      const task = page.render({
        canvasContext: ctx,
        viewport,
      });
      renderTaskRef.current = task;
      try {
        await task.promise;
      } catch {
        // Ignore cancelled render errors
      }
    }

    void renderPage();
    return () => {
      cancelled = true;
    };
  }, [pdfDocProxy, currentPage, zoom, pageRotations]);

  const selectTool = (nextTool: ToolMode) => {
    if (nextTool === "sign") {
      setSigModalOpen(true);
    }
    setTool(nextTool);
  };

  const getNormalizedCoords = (clientX: number, clientY: number) => {
    const el = overlayRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (clientY - rect.top) / rect.height)),
    };
  };

  const isDragCreateTool = tool === "correct" || tool === "redact" || tool === "highlight";

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.target !== overlayRef.current) return;
    setSelectedId(null);
    setEditingTextId(null);

    if (tool === "select") return;

    const pos = getNormalizedCoords(e.clientX, e.clientY);

    if (isDragCreateTool) {
      e.currentTarget.setPointerCapture(e.pointerId);
      setDragBox({ startX: pos.x, startY: pos.y, curX: pos.x, curY: pos.y });
      return;
    }

    const id = `ann_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    if (tool === "text") {
      const newAnn: PdfAnnotation = {
        id,
        type: "text",
        pageIndex: currentPage,
        x: Math.min(0.75, pos.x),
        y: Math.min(0.92, Math.max(0, pos.y - 0.015)),
        width: 0.28,
        height: 0.055,
        text: "",
        fontSize: 13,
        fontFamily: "Helvetica",
        color: "#111827",
      };
      commitAnnotations((prev) => [...prev, newAnn]);
      setSelectedId(id);
      setEditingTextId(id);
      return;
    }

    if (tool === "date") {
      const today = new Date().toISOString().slice(0, 10);
      const newAnn: PdfAnnotation = {
        id,
        type: "date",
        pageIndex: currentPage,
        x: Math.min(0.8, pos.x),
        y: Math.min(0.94, pos.y),
        width: 0.16,
        height: 0.04,
        text: today,
        fontSize: 12,
        fontFamily: "Helvetica",
        color: "#111827",
      };
      commitAnnotations((prev) => [...prev, newAnn]);
      setSelectedId(id);
      setTool("select");
      return;
    }

    if (tool === "check" || tool === "cross") {
      const newAnn: PdfAnnotation = {
        id,
        type: tool,
        pageIndex: currentPage,
        x: Math.max(0, pos.x - 0.02),
        y: Math.max(0, pos.y - 0.02),
        width: 0.04,
        height: 0.04,
        color: tool === "check" ? "#16A34A" : "#DC2626",
      };
      commitAnnotations((prev) => [...prev, newAnn]);
      setSelectedId(id);
      return;
    }

    if (tool === "sign") {
      if (!pendingSignatureUrl) {
        setSigModalOpen(true);
        return;
      }
      const newAnn: PdfAnnotation = {
        id,
        type: "sign",
        pageIndex: currentPage,
        x: Math.min(0.72, Math.max(0, pos.x - 0.12)),
        y: Math.min(0.88, Math.max(0, pos.y - 0.05)),
        width: 0.25,
        height: 0.09,
        imageDataUrl: pendingSignatureUrl,
      };
      commitAnnotations((prev) => [...prev, newAnn]);
      setSelectedId(id);
      setTool("select");
    }
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragBox) return;
    const pos = getNormalizedCoords(e.clientX, e.clientY);
    setDragBox((prev) => (prev ? { ...prev, curX: pos.x, curY: pos.y } : null));
  };

  const handleCanvasPointerUp = () => {
    if (!dragBox) return;
    const minX = Math.min(dragBox.startX, dragBox.curX);
    const minY = Math.min(dragBox.startY, dragBox.curY);
    const width = Math.max(0.08, Math.abs(dragBox.curX - dragBox.startX));
    const height = Math.max(0.035, Math.abs(dragBox.curY - dragBox.startY));
    setDragBox(null);

    const id = `ann_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const activeTool = tool as "correct" | "redact" | "highlight";

    const newAnn: PdfAnnotation = {
      id,
      type: activeTool,
      pageIndex: currentPage,
      x: Math.min(0.95, minX),
      y: Math.min(0.95, minY),
      width: Math.min(1 - minX, width),
      height: Math.min(1 - minY, height),
      text: activeTool === "correct" ? "" : undefined,
      fontSize: 12,
      fontFamily: "Helvetica",
      color: "#111827",
      bgColor: activeTool === "highlight" ? "#FDE047" : "#FFFFFF",
    };

    commitAnnotations((prev) => [...prev, newAnn]);
    setSelectedId(id);
    if (activeTool === "correct") {
      setEditingTextId(id);
    }
    setTool("select");
  };

  // Drag-move & resize existing annotations
  const startMoveAnnotation = (e: React.PointerEvent, ann: PdfAnnotation) => {
    e.stopPropagation();
    setSelectedId(ann.id);
    if (editingTextId === ann.id) return;

    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const startX = ann.x;
    const startY = ann.y;
    const container = overlayRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    const onMove = (moveEvt: PointerEvent) => {
      const dx = (moveEvt.clientX - startMouseX) / rect.width;
      const dy = (moveEvt.clientY - startMouseY) / rect.height;
      const nextX = Math.min(1 - ann.width, Math.max(0, startX + dx));
      const nextY = Math.min(1 - ann.height, Math.max(0, startY + dy));
      setAnnotations((prev) =>
        prev.map((a) => (a.id === ann.id ? { ...a, x: nextX, y: nextY } : a)),
      );
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const startResizeAnnotation = (e: React.PointerEvent, ann: PdfAnnotation) => {
    e.stopPropagation();
    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const startW = ann.width;
    const startH = ann.height;
    const container = overlayRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    const onMove = (moveEvt: PointerEvent) => {
      const dw = (moveEvt.clientX - startMouseX) / rect.width;
      const dh = (moveEvt.clientY - startMouseY) / rect.height;
      const nextW = Math.min(1 - ann.x, Math.max(0.03, startW + dw));
      const nextH = Math.min(1 - ann.y, Math.max(0.025, startH + dh));
      setAnnotations((prev) =>
        prev.map((a) => (a.id === ann.id ? { ...a, width: nextW, height: nextH } : a)),
      );
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const updateSelected = (patch: Partial<PdfAnnotation>) => {
    if (!selectedId) return;
    setAnnotations((prev) => prev.map((a) => (a.id === selectedId ? { ...a, ...patch } : a)));
  };

  const handleDeleteCurrentPage = () => {
    const activePageCount = numPages - deletedPages.length;
    if (activePageCount <= 1) {
      onNotify("No puedes eliminar la única página del documento.", "error");
      return;
    }
    if (!window.confirm(`¿Eliminar la página ${currentPage + 1}? Esta página se excluirá al descargar.`)) {
      return;
    }
    const nextDeleted = [...deletedPages, currentPage];
    setDeletedPages(nextDeleted);
    if (currentPage > 0) {
      setCurrentPage((p) => Math.max(0, p - 1));
    }
    onNotify(`Página ${currentPage + 1} marcada como eliminada.`, "success");
  };

  const handleSharePdf = async () => {
    try {
      const outBytes = await buildOutputPdf();
      const blob = new Blob([new Uint8Array(outBytes)], { type: "application/pdf" });
      const base = fileName.replace(/\.pdf$/i, "");
      const file = new File([blob], `${base}-traxpdf.pdf`, { type: "application/pdf" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `${base}-traxpdf.pdf`,
          files: [file],
        });
      } else {
        onNotify("Tu dispositivo no soporta compartir este archivo directamente.", "error");
      }
    } catch (err: unknown) {
      if ((err as { name?: string })?.name !== "AbortError") {
        onNotify("No se pudo compartir el archivo.", "error");
      }
    }
  };

  const buildOutputPdf = async () => {
    const resolvedFields = formFields.map((f) => ({
      ...f,
      value: fieldValues[f.name] ?? f.value,
    }));
    return exportModifiedPdf({
      sourceBytes,
      formFields: resolvedFields,
      annotations,
      pageRotations,
      deletedPages,
      flatten,
    });
  };

  const handleExportDownload = async () => {
    setExporting(true);
    try {
      // Check & consume daily quota or credit first
      const quotaRes = await fetch("/api/usage/consume", { method: "POST" });
      if (quotaRes.status === 402) {
        onOpenPaywall();
        return;
      }
      if (!quotaRes.ok) {
        onNotify("Could not verify export quota", "error");
        return;
      }

      const quotaData = (await quotaRes.json()) as {
        source: "unlimited" | "daily_free" | "daily_guest" | "credit";
        remainingToday: number | null;
        credits: number;
      };

      const outBytes = await buildOutputPdf();
      const blob = new Blob([new Uint8Array(outBytes)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const base = fileName.replace(/\.pdf$/i, "");
      a.href = url;
      a.download = `${base}-traxpdf.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      await onSessionRefresh();

      if (quotaData.source === "credit") {
        onNotify(`${t.creditUsedSuccess} ${quotaData.credits}`, "success");
      } else if (quotaData.remainingToday !== null) {
        onNotify(`${t.exportSuccess} ${quotaData.remainingToday}`, "success");
      } else {
        onNotify(`${t.exportSuccess} ∞`, "success");
      }
    } catch (err) {
      console.error(err);
      onNotify("Export failed. Check console for details.", "error");
    } finally {
      setExporting(false);
    }
  };

  const handleSaveToCloud = async () => {
    if (!session?.cloudEnabled) {
      onOpenPricing();
      return;
    }
    setSavingCloud(true);
    try {
      const outBytes = await buildOutputPdf();
      const fd = new FormData();
      fd.append(
        "file",
        new Blob([new Uint8Array(outBytes)], { type: "application/pdf" }),
        fileName,
      );
      fd.append("title", fileName.replace(/\.pdf$/i, ""));
      fd.append("pageCount", String(numPages));

      const res = await fetch("/api/cloud/docs", { method: "POST", body: fd });
      if (!res.ok) {
        onNotify("Failed to save to Cloud Vault", "error");
        return;
      }
      await onSessionRefresh();
      onNotify(t.cloudSavedSuccess, "success");
    } finally {
      setSavingCloud(false);
    }
  };

  const pageFields = formFields.filter((f) => f.pageIndex === currentPage);
  const pageAnnotations = annotations.filter((a) => a.pageIndex === currentPage);
  const selectedAnnotation = annotations.find((a) => a.id === selectedId) || null;

  const toolButtons: Array<{ id: ToolMode; label: string; icon: React.ReactNode }> = [
    { id: "select", label: t.tools.select, icon: <MousePointer2 className="h-4 w-4" /> },
    { id: "text", label: t.tools.text, icon: <Type className="h-4 w-4" /> },
    { id: "edit_text", label: t.tools.edit_text, icon: <FileEdit className="h-4 w-4" /> },
    { id: "correct", label: t.tools.correct, icon: <Eraser className="h-4 w-4" /> },
    { id: "sign", label: t.tools.sign, icon: <PenTool className="h-4 w-4" /> },
    { id: "check", label: t.tools.check, icon: <Check className="h-4 w-4" /> },
    { id: "cross", label: t.tools.cross, icon: <X className="h-4 w-4" /> },
    { id: "date", label: t.tools.date, icon: <Calendar className="h-4 w-4" /> },
    { id: "highlight", label: t.tools.highlight, icon: <Highlighter className="h-4 w-4" /> },
    { id: "redact", label: t.tools.redact, icon: <EyeOff className="h-4 w-4" /> },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-900 text-slate-100">
      {/* Studio Toolbar */}
      <div className="border-b border-slate-800 bg-slate-950/90 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBackHome}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t.backHome}
          </button>
          <span className="hidden xl:inline text-xs font-medium text-slate-400 max-w-44 truncate">
            {fileName}
          </span>
        </div>

        {/* Core Editing Tools */}
        <div className="flex items-center flex-wrap gap-1 rounded-xl bg-slate-900 p-1 border border-slate-800">
          <button
            type="button"
            onClick={() => setProfileModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800/80 transition"
            title="Mis Datos Frecuentes"
          >
            <User className="h-3.5 w-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Mis Datos</span>
          </button>
          <div className="h-4 w-px bg-slate-800 mx-0.5 hidden sm:block" />
          {toolButtons.map((btn) => (
            <button
              key={btn.id}
              type="button"
              onClick={() => selectTool(btn.id)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                tool === btn.id
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              {btn.icon}
              <span className="hidden md:inline">{btn.label}</span>
            </button>
          ))}
        </div>

        {/* Export & Cloud Actions */}
        <div className="flex items-center gap-2">
          <label className="hidden lg:inline-flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer select-none mr-1">
            <input
              type="checkbox"
              checked={flatten}
              onChange={(e) => setFlatten(e.target.checked)}
              className="rounded border-slate-700 bg-slate-900 text-indigo-500"
            />
            {t.flattenLabel}
          </label>

          <button
            type="button"
            onClick={handleSaveToCloud}
            disabled={savingCloud}
            title={session?.cloudEnabled ? t.saveCloudBtn : t.cloudLockedTooltip}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
              session?.cloudEnabled
                ? "border border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                : "border border-slate-700 bg-slate-900 text-slate-300 hover:border-emerald-500/50"
            }`}
          >
            {savingCloud ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Cloud className="h-3.5 w-3.5 text-emerald-400" />
            )}
            <span className="hidden sm:inline">
              {savingCloud ? t.savingCloud : t.saveCloudBtn}
            </span>
          </button>

          {canShare && (
            <button
              type="button"
              onClick={handleSharePdf}
              disabled={exporting}
              title="Compartir PDF a WhatsApp o Correo"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition"
            >
              <Share2 className="h-3.5 w-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Compartir</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportDownload}
            disabled={exporting}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/25 disabled:opacity-60"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {exporting ? t.exporting : t.downloadBtn}
          </button>
        </div>
      </div>

      {/* Sub-bar: Guided Hint + Page/Zoom/History Controls */}
      <div className="border-b border-slate-800/80 bg-slate-900/95 px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-indigo-300">
          <span className="inline-block h-2 w-2 rounded-full bg-indigo-400" />
          <span>{t.hints[tool]}</span>
          {formFields.length > 0 ? (
            <span className="ml-2 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[11px] text-emerald-300">
              {formFields.length} {t.formsDetected}
            </span>
          ) : (
            <span className="ml-2 rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[11px] text-amber-300">
              {t.flatPdfBadge}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-slate-300">
          <button
            type="button"
            onClick={handleUndo}
            disabled={historyPast.length === 0}
            className="p-1.5 rounded hover:bg-slate-800 disabled:opacity-35"
            title={t.undo}
          >
            <Undo2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={historyFuture.length === 0}
            className="p-1.5 rounded hover:bg-slate-800 disabled:opacity-35"
            title={t.redo}
          >
            <Redo2 className="h-3.5 w-3.5" />
          </button>
          <div className="h-4 w-px bg-slate-800 mx-1" />
          <button
            type="button"
            onClick={() =>
              setPageRotations((prev) => ({
                ...prev,
                [currentPage]: ((prev[currentPage] || 0) + 90) % 360,
              }))
            }
            className="inline-flex items-center gap-1 rounded px-2 py-1 hover:bg-slate-800"
            title={t.rotate}
          >
            <RotateCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t.rotate}</span>
          </button>
          <button
            type="button"
            onClick={handleDeleteCurrentPage}
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-red-400 hover:bg-red-500/10 hover:text-red-300"
            title="Eliminar esta página"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Eliminar pág.</span>
          </button>
          <div className="h-4 w-px bg-slate-800 mx-1" />
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.15).toFixed(2)))}
            className="p-1 rounded hover:bg-slate-800"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <span className="w-11 text-center font-mono">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(2.2, +(z + 0.15).toFixed(2)))}
            className="p-1 rounded hover:bg-slate-800"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <div className="h-4 w-px bg-slate-800 mx-1" />
          <button
            type="button"
            disabled={currentPage <= 0}
            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            className="p-1 rounded hover:bg-slate-800 disabled:opacity-35"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span>
            {t.page} {currentPage + 1} {t.of} {numPages}
          </span>
          <button
            type="button"
            disabled={currentPage >= numPages - 1}
            onClick={() => setCurrentPage((p) => Math.min(numPages - 1, p + 1))}
            className="p-1 rounded hover:bg-slate-800 disabled:opacity-35"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main 3-Column Studio */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Page Strip */}
        <aside className="hidden md:flex w-28 flex-col gap-2 border-r border-slate-800 bg-slate-950/60 p-3 overflow-y-auto">
          {Array.from({ length: numPages }).map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentPage(idx)}
              className={`rounded-xl border p-2.5 text-center transition ${
                currentPage === idx
                  ? "border-indigo-500 bg-indigo-500/15 text-white"
                  : "border-slate-800 bg-slate-900/70 text-slate-400 hover:border-slate-700"
              }`}
            >
              <div className="mx-auto mb-1.5 h-14 w-10 rounded border border-slate-700 bg-white/95 flex items-center justify-center text-[10px] font-bold text-slate-600">
                {idx + 1}
              </div>
              <span className="text-[11px] font-medium">
                {t.page} {idx + 1}
              </span>
            </button>
          ))}
        </aside>

        {/* Center PDF Workspace */}
        <main className="flex-1 overflow-auto bg-slate-800/70 p-6 flex justify-center items-start">
          <div
            className="relative shadow-2xl bg-white select-none"
            style={{ width: pageSize.width, height: pageSize.height }}
          >
            <canvas ref={canvasRef} className="block" />

            {/* Interactive Overlay Layer */}
            <div
              ref={overlayRef}
              onPointerDown={handleCanvasPointerDown}
              onPointerMove={handleCanvasPointerMove}
              onPointerUp={handleCanvasPointerUp}
              className={`absolute inset-0 ${
                tool === "select" ? "cursor-default" : "cursor-crosshair"
              }`}
            >
              {/* Auto-detected AcroForm Fields */}
              {pageFields.map((field) => {
                const val = fieldValues[field.name] ?? field.value;
                const style: React.CSSProperties = {
                  left: `${field.x * 100}%`,
                  top: `${field.y * 100}%`,
                  width: `${field.width * 100}%`,
                  height: `${field.height * 100}%`,
                };

                if (field.fieldType === "checkbox") {
                  return (
                    <input
                      key={field.id}
                      type="checkbox"
                      checked={Boolean(val)}
                      onChange={(e) =>
                        setFieldValues((prev) => ({
                          ...prev,
                          [field.name]: e.target.checked,
                        }))
                      }
                      onPointerDown={(e) => e.stopPropagation()}
                      style={style}
                      className="absolute cursor-pointer accent-indigo-600 rounded"
                    />
                  );
                }

                if (field.fieldType === "radio") {
                  return (
                    <input
                      key={field.id}
                      type="radio"
                      name={field.name}
                      checked={val === field.exportValue || val === true}
                      onChange={() =>
                        setFieldValues((prev) => ({
                          ...prev,
                          [field.name]: field.exportValue || true,
                        }))
                      }
                      onPointerDown={(e) => e.stopPropagation()}
                      style={style}
                      className="absolute cursor-pointer accent-indigo-600"
                    />
                  );
                }

                if (field.fieldType === "select" && field.options?.length) {
                  return (
                    <select
                      key={field.id}
                      value={String(val ?? "")}
                      onChange={(e) =>
                        setFieldValues((prev) => ({
                          ...prev,
                          [field.name]: e.target.value,
                        }))
                      }
                      onPointerDown={(e) => e.stopPropagation()}
                      style={{ ...style, fontSize: `${Math.max(10, 11 * zoom)}px` }}
                      className="absolute bg-indigo-50/60 border border-indigo-400/50 text-slate-900 px-1.5 rounded-sm outline-none focus:border-indigo-600 focus:bg-white"
                    >
                      {field.options.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  );
                }

                if (field.multiline) {
                  return (
                    <textarea
                      key={field.id}
                      value={String(val ?? "")}
                      onChange={(e) =>
                        setFieldValues((prev) => ({
                          ...prev,
                          [field.name]: e.target.value,
                        }))
                      }
                      onPointerDown={(e) => e.stopPropagation()}
                      style={{ ...style, fontSize: `${Math.max(10, 11 * zoom)}px` }}
                      className="absolute bg-indigo-50/50 hover:bg-indigo-50/80 border border-indigo-400/40 text-slate-900 p-1.5 rounded-sm resize-none outline-none focus:border-indigo-600 focus:bg-white"
                    />
                  );
                }

                return (
                  <input
                    key={field.id}
                    type="text"
                    value={String(val ?? "")}
                    onChange={(e) =>
                      setFieldValues((prev) => ({
                        ...prev,
                        [field.name]: e.target.value,
                      }))
                    }
                    onPointerDown={(e) => e.stopPropagation()}
                    style={{ ...style, fontSize: `${Math.max(10, 11 * zoom)}px` }}
                    className="absolute bg-indigo-50/50 hover:bg-indigo-50/80 border border-indigo-400/40 text-slate-900 px-1.5 rounded-sm outline-none focus:border-indigo-600 focus:bg-white"
                  />
                );
              })}

              {/* Clickable Existing Text Runs for Flat PDF Editing */}
              {tool === "edit_text" &&
                textRuns.map((run) => (
                  <button
                    key={run.id}
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      const id = `ann_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
                      const newAnn: PdfAnnotation = {
                        id,
                        type: "correct",
                        pageIndex: currentPage,
                        x: Math.max(0, run.x - 0.004),
                        y: Math.max(0, run.y - 0.003),
                        width: Math.min(1 - run.x, Math.max(0.08, run.width + 0.03)),
                        height: Math.min(1 - run.y, Math.max(0.03, run.height + 0.008)),
                        text: run.str,
                        fontSize: run.fontSize,
                        fontFamily: "Helvetica",
                        color: "#111827",
                        bgColor: "#FFFFFF",
                      };
                      commitAnnotations((prev) => [...prev, newAnn]);
                      setSelectedId(id);
                      setEditingTextId(id);
                      setTool("select");
                    }}
                    style={{
                      left: `${run.x * 100}%`,
                      top: `${run.y * 100}%`,
                      width: `${run.width * 100}%`,
                      height: `${run.height * 100}%`,
                    }}
                    title={run.str}
                    className="absolute rounded-sm border border-transparent bg-indigo-500/10 hover:border-indigo-500 hover:bg-indigo-500/25 cursor-text transition"
                  />
                ))}

              {/* User Placed Annotations */}
              {pageAnnotations.map((ann) => {
                const isSelected = ann.id === selectedId;
                const isEditing = ann.id === editingTextId;
                const boxStyle: React.CSSProperties = {
                  left: `${ann.x * 100}%`,
                  top: `${ann.y * 100}%`,
                  width: `${ann.width * 100}%`,
                  height: `${ann.height * 100}%`,
                };

                return (
                  <div
                    key={ann.id}
                    style={boxStyle}
                    onPointerDown={(e) => startMoveAnnotation(e, ann)}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      if (ann.type === "text" || ann.type === "correct" || ann.type === "date") {
                        setEditingTextId(ann.id);
                      }
                    }}
                    className={`absolute group cursor-move ${
                      isSelected ? "ring-2 ring-indigo-500 ring-offset-1" : "hover:ring-1 hover:ring-indigo-400/60"
                    }`}
                  >
                    {ann.type === "highlight" && (
                      <div
                        className="w-full h-full opacity-40"
                        style={{ backgroundColor: ann.bgColor || "#FDE047" }}
                      />
                    )}

                    {ann.type === "redact" && (
                      <div className="w-full h-full bg-slate-950" />
                    )}

                    {(ann.type === "text" || ann.type === "correct" || ann.type === "date") && (
                      <div
                        className="w-full h-full overflow-hidden flex items-start p-1"
                        style={{
                          backgroundColor:
                            ann.type === "correct" ? ann.bgColor || "#FFFFFF" : "transparent",
                          border:
                            ann.type === "correct" && isSelected
                              ? "1px dashed rgba(99,102,241,0.5)"
                              : undefined,
                        }}
                      >
                        {isEditing ? (
                          <textarea
                            autoFocus
                            value={ann.text || ""}
                            placeholder={t.inspector.placeholderText}
                            onChange={(e) =>
                              setAnnotations((prev) =>
                                prev.map((a) =>
                                  a.id === ann.id ? { ...a, text: e.target.value } : a,
                                ),
                              )
                            }
                            onBlur={() => setEditingTextId(null)}
                            onPointerDown={(e) => e.stopPropagation()}
                            style={{
                              fontSize: `${(ann.fontSize || 12) * zoom}px`,
                              color: ann.color || "#111827",
                              fontWeight: ann.bold ? 700 : 400,
                              fontFamily:
                                ann.fontFamily === "Times"
                                  ? "Georgia, serif"
                                  : ann.fontFamily === "Courier"
                                    ? "monospace"
                                    : "sans-serif",
                            }}
                            className="w-full h-full bg-transparent outline-none resize-none leading-tight"
                          />
                        ) : (
                          <span
                            className="whitespace-pre-wrap break-words leading-tight w-full"
                            style={{
                              fontSize: `${(ann.fontSize || 12) * zoom}px`,
                              color: ann.color || "#111827",
                              fontWeight: ann.bold ? 700 : 400,
                              fontFamily:
                                ann.fontFamily === "Times"
                                  ? "Georgia, serif"
                                  : ann.fontFamily === "Courier"
                                    ? "monospace"
                                    : "sans-serif",
                            }}
                          >
                            {ann.text ||
                              (ann.type === "correct" ? (
                                <span className="text-[10px] text-slate-400 italic">
                                  {t.inspector.placeholderText}
                                </span>
                              ) : (
                                ""
                              ))}
                          </span>
                        )}
                      </div>
                    )}

                    {ann.type === "check" && (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={ann.color || "#16A34A"}
                        strokeWidth={3}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-full h-full"
                      >
                        <polyline points="4 13 9 18 20 6" />
                      </svg>
                    )}

                    {ann.type === "cross" && (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={ann.color || "#DC2626"}
                        strokeWidth={3}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-full h-full"
                      >
                        <line x1="5" y1="5" x2="19" y2="19" />
                        <line x1="19" y1="5" x2="5" y2="19" />
                      </svg>
                    )}

                    {ann.type === "sign" && ann.imageDataUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={ann.imageDataUrl}
                        alt="Signature"
                        draggable={false}
                        className="w-full h-full object-contain pointer-events-none"
                      />
                    )}

                    {isSelected && (
                      <div
                        onPointerDown={(e) => startResizeAnnotation(e, ann)}
                        className="absolute -bottom-1.5 -right-1.5 h-3.5 w-3.5 rounded-full bg-indigo-600 border-2 border-white shadow cursor-nwse-resize"
                      />
                    )}
                  </div>
                );
              })}

              {/* Drag creation preview */}
              {dragBox && (
                <div
                  className="absolute border-2 border-dashed border-indigo-500 bg-indigo-500/15 pointer-events-none"
                  style={{
                    left: `${Math.min(dragBox.startX, dragBox.curX) * 100}%`,
                    top: `${Math.min(dragBox.startY, dragBox.curY) * 100}%`,
                    width: `${Math.abs(dragBox.curX - dragBox.startX) * 100}%`,
                    height: `${Math.abs(dragBox.curY - dragBox.startY) * 100}%`,
                  }}
                />
              )}
            </div>
          </div>
        </main>

        {/* Right Properties Inspector */}
        <aside className="hidden lg:flex w-72 flex-col border-l border-slate-800 bg-slate-950/80 p-4 space-y-5 overflow-y-auto">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t.inspector.title}
          </h3>

          {!selectedAnnotation ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-400 leading-relaxed">
              {t.inspector.noSelection}
            </div>
          ) : (
            <div className="space-y-4">
              {(selectedAnnotation.type === "text" ||
                selectedAnnotation.type === "correct" ||
                selectedAnnotation.type === "date") && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">
                      {t.inspector.textContent}
                    </label>
                    <textarea
                      rows={3}
                      value={selectedAnnotation.text || ""}
                      placeholder={t.inspector.placeholderText}
                      onChange={(e) => updateSelected({ text: e.target.value })}
                      className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300 flex justify-between">
                      <span>{t.inspector.fontSize}</span>
                      <span>{selectedAnnotation.fontSize || 12}pt</span>
                    </label>
                    <input
                      type="range"
                      min={8}
                      max={36}
                      value={selectedAnnotation.fontSize || 12}
                      onChange={(e) => updateSelected({ fontSize: Number(e.target.value) })}
                      className="w-full accent-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-300">
                        {t.inspector.fontFamily}
                      </label>
                      <select
                        value={selectedAnnotation.fontFamily || "Helvetica"}
                        onChange={(e) =>
                          updateSelected({ fontFamily: e.target.value as AnnotationFont })
                        }
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2 py-1.5 text-xs text-white"
                      >
                        <option value="Helvetica">Sans (Helvetica)</option>
                        <option value="Times">Serif (Times)</option>
                        <option value="Courier">Mono (Courier)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-300">Style</label>
                      <button
                        type="button"
                        onClick={() => updateSelected({ bold: !selectedAnnotation.bold })}
                        className={`w-full rounded-lg border px-2 py-1.5 text-xs font-bold ${
                          selectedAnnotation.bold
                            ? "border-indigo-500 bg-indigo-600 text-white"
                            : "border-slate-800 bg-slate-900 text-slate-300"
                        }`}
                      >
                        {t.inspector.bold}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">
                      {t.inspector.textColor}
                    </label>
                    <div className="flex gap-2">
                      {TEXT_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => updateSelected({ color: c })}
                          className={`h-6 w-6 rounded-full border-2 ${
                            selectedAnnotation.color === c
                              ? "border-indigo-400 scale-110"
                              : "border-slate-700"
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}

              {selectedAnnotation.type === "correct" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    {t.inspector.bgColor}
                  </label>
                  <div className="flex gap-2">
                    {COVER_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => updateSelected({ bgColor: c })}
                        className={`h-6 w-6 rounded-full border-2 ${
                          (selectedAnnotation.bgColor || "#FFFFFF") === c
                            ? "border-indigo-400 scale-110"
                            : "border-slate-600"
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  commitAnnotations((prev) => prev.filter((a) => a.id !== selectedAnnotation.id));
                  setSelectedId(null);
                }}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t.inspector.deleteBtn}
              </button>
            </div>
          )}
        </aside>
      </div>

      <SignatureModal
        open={sigModalOpen}
        dict={dict}
        onClose={() => setSigModalOpen(false)}
        onSelectSignature={(url) => {
          setPendingSignatureUrl(url);
          setTool("sign");
        }}
      />

      {/* Mis Datos Modal */}
      <ProfileModal
        open={profileModalOpen}
        dict={dict}
        onClose={() => setProfileModalOpen(false)}
        onSelectField={(text) => {
          const newAnn: PdfAnnotation = {
            id: "ann_" + Math.random().toString(36).slice(2, 9),
            type: "text",
            pageIndex: currentPage,
            x: 0.25,
            y: 0.35,
            width: 0.3,
            height: 0.04,
            text,
            fontSize: 13,
            color: "#111827",
          };
          setAnnotations((prev) => [...prev, newAnn]);
          setSelectedId(newAnn.id);
          onNotify("Dato colocado en la página.", "success");
        }}
      />
    </div>
  );
}
