"use client";

import React, { useEffect, useState } from "react";
import { Cloud, Download, FileText, FolderOpen, Loader2, Lock, Trash2, X } from "lucide-react";
import type { Dictionary } from "@/lib/i18n";
import type { CloudDocMeta, SessionInfo } from "@/lib/types";

interface CloudVaultModalProps {
  open: boolean;
  dict: Dictionary;
  session: SessionInfo | null;
  onClose: () => void;
  onOpenPricing: () => void;
  onOpenPdfBytes: (bytes: Uint8Array, fileName: string) => void;
}

export function CloudVaultModal({
  open,
  dict,
  session,
  onClose,
  onOpenPricing,
  onOpenPdfBytes,
}: CloudVaultModalProps) {
  const t = dict.cloud;
  const [docs, setDocs] = useState<CloudDocMeta[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !session?.cloudEnabled) return;
    let cancelled = false;
    async function load() {
      await Promise.resolve();
      if (cancelled) return;
      setLoading(true);
      try {
        const res = await fetch("/api/cloud/docs");
        if (!cancelled && res.ok) {
          const data = (await res.json()) as { docs: CloudDocMeta[] };
          setDocs(data.docs || []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [open, session?.cloudEnabled]);

  if (!open) return null;

  const handleOpenInEditor = async (doc: CloudDocMeta) => {
    const res = await fetch(`/api/cloud/docs/${doc.id}`);
    if (!res.ok) return;
    const buf = await res.arrayBuffer();
    onOpenPdfBytes(new Uint8Array(buf), doc.fileName);
    onClose();
  };

  const handleDelete = async (docId: string) => {
    const res = await fetch(`/api/cloud/docs/${docId}`, { method: "DELETE" });
    if (res.ok) {
      setDocs((prev) => prev.filter((d) => d.id !== docId));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-slate-950 text-white border border-slate-800 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Cloud className="h-5 w-5 text-emerald-400" />
            <div>
              <h3 className="text-lg font-bold">{t.title}</h3>
              <p className="text-xs text-slate-400">{t.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {!session?.cloudEnabled ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-8 text-center space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                <Lock className="h-6 w-6" />
              </div>
              <h4 className="text-base font-semibold">{t.lockedTitle}</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                {t.lockedDesc}
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPricing();
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
              >
                <Cloud className="h-4 w-4" />
                {t.upgradeBtn}
              </button>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
            </div>
          ) : docs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 p-10 text-center text-sm text-slate-400">
              {t.empty}
            </div>
          ) : (
            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {docs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-5 w-5 text-emerald-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{doc.title}</p>
                      <p className="text-xs text-slate-400">
                        {doc.pageCount} {t.pages} · {(doc.sizeBytes / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenInEditor(doc)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                    >
                      <FolderOpen className="h-3.5 w-3.5" />
                      {t.openInEditor}
                    </button>
                    <a
                      href={`/api/cloud/docs/${doc.id}`}
                      download={doc.fileName}
                      className="rounded-lg border border-slate-700 p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white"
                      title={t.download}
                    >
                      <Download className="h-4 w-4" />
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDelete(doc.id)}
                      className="rounded-lg border border-slate-700 p-1.5 text-rose-400 hover:bg-rose-950/50"
                      title={t.delete}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
