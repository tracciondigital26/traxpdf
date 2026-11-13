"use client";

import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  Bug,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileQuestion,
  Filter,
  KeyRound,
  Lightbulb,
  Loader2,
  Lock,
  LogOut,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  User,
} from "lucide-react";
import type { FeedbackCategory, FeedbackReport } from "@/lib/types";

const ADMIN_STORAGE_KEY = "trax_admin_token";

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  const [reports, setReports] = useState<FeedbackReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const loadReports = async (key: string) => {
    setLoadingReports(true);
    try {
      const res = await fetch("/api/admin/reports", {
        headers: { "x-admin-key": key },
      });
      const data = (await res.json()) as { ok?: boolean; reports?: FeedbackReport[]; error?: string };
      if (res.ok && data.reports) {
        setReports(data.reports);
        setAuthed(true);
        try {
          sessionStorage.setItem(ADMIN_STORAGE_KEY, key);
        } catch {
          // ignore
        }
      } else {
        setAuthed(false);
        setLoginError(data.error || "Contraseña incorrecta.");
      }
    } catch {
      setLoginError("Error de conexión al cargar reportes.");
    } finally {
      setLoadingReports(false);
    }
  };

  // Try auto-login from session storage on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(ADMIN_STORAGE_KEY);
      if (saved) {
        void loadReports(saved);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);
    await loadReports(passwordInput.trim());
    setLoginLoading(false);
  };

  const handleLogout = () => {
    try {
      sessionStorage.removeItem(ADMIN_STORAGE_KEY);
    } catch {
      // ignore
    }
    setAuthed(false);
    setPasswordInput("");
    setReports([]);
  };

  const handleUpdateStatus = async (id: string, status: FeedbackReport["status"]) => {
    const key = sessionStorage.getItem(ADMIN_STORAGE_KEY) || passwordInput.trim();
    try {
      const res = await fetch("/api/admin/reports", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": key,
        },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        setReports((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status } : r)),
        );
      }
    } catch {
      // ignore
    }
  };

  const handleDeleteReport = async (id: string) => {
    if (!confirm("¿Eliminar este reporte permanentemente?")) return;
    const key = sessionStorage.getItem(ADMIN_STORAGE_KEY) || passwordInput.trim();
    try {
      const res = await fetch(`/api/admin/reports?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { "x-admin-key": key },
      });
      if (res.ok) {
        setReports((prev) => prev.filter((r) => r.id !== id));
      }
    } catch {
      // ignore
    }
  };

  // If not authenticated, show secret lock screen
  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-4 font-sans">
        <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6 text-center">
          <div className="w-14 h-14 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto text-indigo-400">
            <Lock className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight text-white">
              Panel Administrativo
            </h1>
            <p className="text-xs text-slate-400">
              Acceso reservado a administración de TraxPDF
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4 text-left">
            {loginError && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Contraseña de Administrador
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  autoFocus
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Introduce la contraseña"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loginLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <KeyRound className="w-4 h-4" />
              )}
              <span>Ingresar al Panel</span>
            </button>
          </form>

          <p className="text-[11px] text-slate-600">
            Tracción Digital · TraxPDF Engine
          </p>
        </div>
      </div>
    );
  }

  // Filtered reports
  const filtered = reports.filter((r) => {
    if (filterStatus !== "all" && r.status !== filterStatus) return false;
    if (filterCategory !== "all" && r.category !== filterCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchMsg = r.message.toLowerCase().includes(q);
      const matchEmail = (r.userEmail || "").toLowerCase().includes(q);
      const matchName = (r.userName || "").toLowerCase().includes(q);
      if (!matchMsg && !matchEmail && !matchName) return false;
    }
    return true;
  });

  const countNew = reports.filter((r) => r.status === "new").length;
  const countInProgress = reports.filter((r) => r.status === "in_progress").length;
  const countResolved = reports.filter((r) => r.status === "resolved").length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Bar */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-white flex items-center gap-2">
              <span>TraxPDF Admin</span>
              <span className="text-[10px] bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full font-mono">
                Reportes de Usuarios
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">
              Gestión centralizada de fallos, sugerencias y feedback
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              const key = sessionStorage.getItem(ADMIN_STORAGE_KEY) || passwordInput;
              void loadReports(key);
            }}
            disabled={loadingReports}
            className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 transition"
            title="Refrescar datos"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingReports ? "animate-spin" : ""}`} />
            <span>Actualizar</span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 px-3 py-1.5 rounded-xl border border-rose-900/40 bg-rose-950/30 hover:bg-rose-900/50 transition"
            title="Cerrar sesión"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Salir</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-xs text-slate-400">Total Reportes</span>
            <p className="text-2xl font-black text-white">{reports.length}</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-amber-500/20 space-y-1">
            <span className="text-xs text-amber-400 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              Nuevos
            </span>
            <p className="text-2xl font-black text-amber-400">{countNew}</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-indigo-500/20 space-y-1">
            <span className="text-xs text-indigo-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              En revisión
            </span>
            <p className="text-2xl font-black text-indigo-400">{countInProgress}</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-emerald-500/20 space-y-1">
            <span className="text-xs text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Resueltos
            </span>
            <p className="text-2xl font-black text-emerald-400">{countResolved}</p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 text-xs text-slate-400 mr-1">
              <Filter className="w-3.5 h-3.5" />
              <span>Estado:</span>
            </div>

            {(["all", "new", "in_progress", "resolved"] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setFilterStatus(st)}
                className={`text-xs px-3 py-1 rounded-xl font-medium transition ${
                  filterStatus === st
                    ? "bg-indigo-600 text-white font-bold"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {st === "all"
                  ? "Todos"
                  : st === "new"
                    ? "Nuevos"
                    : st === "in_progress"
                      ? "En revisión"
                      : "Resueltos"}
              </button>
            ))}
          </div>

          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar en reportes..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Reports List */}
        {loadingReports ? (
          <div className="py-20 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mx-auto" />
            <p className="text-xs text-slate-400">Cargando reportes desde Cloudflare KV...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center space-y-2 rounded-2xl border border-dashed border-slate-800 bg-slate-900/40">
            <CheckCircle2 className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="font-bold text-sm text-slate-300">No hay reportes que coincidan</p>
            <p className="text-xs text-slate-500">
              {reports.length === 0
                ? "Aún no se han enviado reportes de usuarios."
                : "Ningún reporte coincide con los filtros seleccionados."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((rep) => {
              const d = new Date(rep.createdAt);
              const formattedDate = !isNaN(d.getTime())
                ? d.toLocaleString("es-MX", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                : rep.createdAt;

              return (
                <div
                  key={rep.id}
                  className={`p-5 rounded-2xl bg-slate-900 border transition-all ${
                    rep.status === "new"
                      ? "border-amber-500/40 shadow-lg shadow-amber-950/10"
                      : rep.status === "in_progress"
                        ? "border-indigo-500/30"
                        : "border-slate-800/80 opacity-70 hover:opacity-100"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Category Badge */}
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                          rep.category === "bug"
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                            : rep.category === "pdf_issue"
                              ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
                              : rep.category === "suggestion"
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                : "bg-purple-500/10 text-purple-400 border-purple-500/30"
                        }`}
                      >
                        {rep.category === "bug" ? (
                          <Bug className="w-3 h-3" />
                        ) : rep.category === "pdf_issue" ? (
                          <FileQuestion className="w-3 h-3" />
                        ) : rep.category === "suggestion" ? (
                          <Lightbulb className="w-3 h-3" />
                        ) : (
                          <AlertCircle className="w-3 h-3" />
                        )}
                        <span>
                          {rep.category === "bug"
                            ? "Fallo / Bug"
                            : rep.category === "pdf_issue"
                              ? "Problema PDF"
                              : rep.category === "suggestion"
                                ? "Sugerencia"
                                : "Otro"}
                        </span>
                      </span>

                      {/* Status indicator */}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          rep.status === "new"
                            ? "bg-amber-400/20 text-amber-300 border-amber-400/30"
                            : rep.status === "in_progress"
                              ? "bg-indigo-400/20 text-indigo-300 border-indigo-400/30"
                              : "bg-emerald-400/20 text-emerald-300 border-emerald-400/30"
                        }`}
                      >
                        {rep.status === "new"
                          ? "Nuevo"
                          : rep.status === "in_progress"
                            ? "En revisión"
                            : "Resuelto ✓"}
                      </span>

                      <span className="text-slate-500 text-xs">•</span>
                      <span className="text-slate-400 text-xs font-mono">{formattedDate}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <select
                        value={rep.status}
                        onChange={(e) =>
                          handleUpdateStatus(rep.id, e.target.value as FeedbackReport["status"])
                        }
                        className="bg-slate-800 border border-slate-700 text-xs rounded-xl px-2.5 py-1 text-slate-200 outline-none"
                      >
                        <option value="new">Marcar: Nuevo</option>
                        <option value="in_progress">Marcar: En revisión</option>
                        <option value="resolved">Marcar: Resuelto ✓</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => handleDeleteReport(rep.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                        title="Eliminar reporte"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Message */}
                  <div className="py-3">
                    <p className="text-sm text-slate-100 whitespace-pre-wrap leading-relaxed font-sans font-medium">
                      {rep.message}
                    </p>
                  </div>

                  {/* Metadata footer */}
                  <div className="pt-3 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 font-mono">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-500" />
                        {rep.userName || "Invitado"}
                      </span>
                      {rep.userEmail && (
                        <span className="text-indigo-400">{rep.userEmail}</span>
                      )}
                      {rep.userId && (
                        <span className="text-slate-600">{rep.userId}</span>
                      )}
                    </div>

                    {rep.url && (
                      <span className="text-slate-500 truncate max-w-xs" title={rep.url}>
                        {rep.url}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
