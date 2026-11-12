"use client";

import React, { useState } from "react";
import { Loader2, X } from "lucide-react";
import type { Dictionary } from "@/lib/i18n";
import type { SessionInfo } from "@/lib/types";

interface AuthModalProps {
  open: boolean;
  initialMode?: "login" | "register";
  dict: Dictionary;
  onClose: () => void;
  onSuccess: (session: SessionInfo) => void;
}

export function AuthModal({
  open,
  initialMode = "register",
  dict,
  onClose,
  onSuccess,
}: AuthModalProps) {
  const t = dict.auth;
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = (await res.json()) as { error?: string; session?: SessionInfo };
      if (!res.ok || !data.session) {
        setError(data.error || "Authentication failed");
        return;
      }
      onSuccess(data.session);
      onClose();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white text-slate-900 shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-semibold">
              {mode === "register" ? t.registerTitle : t.signInTitle}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {mode === "register" ? t.subtitleRegister : t.subtitleLogin}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs text-rose-700">
              {error}
            </div>
          )}

          {mode === "register" && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">{t.nameLabel}</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700">{t.emailLabel}</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700">{t.passwordLabel}</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "register" ? t.submitRegister : t.submitLogin}
          </button>

          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => {
                setMode(mode === "register" ? "login" : "register");
                setError(null);
              }}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-500"
            >
              {mode === "register" ? t.switchToLogin : t.switchToRegister}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
