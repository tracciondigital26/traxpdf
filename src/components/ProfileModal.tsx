"use client";

import React, { useState } from "react";
import { User, X, Check, Copy } from "lucide-react";
import type { Dictionary } from "@/lib/i18n";

export interface ProfileData {
  name: string;
  email: string;
  phone: string;
  taxId: string;
  company: string;
  address: string;
}

const STORAGE_KEY = "traxpdf_saved_profile";

export function getSavedProfile(): ProfileData {
  if (typeof window === "undefined") {
    return { name: "", email: "", phone: "", taxId: "", company: "", address: "" };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { name: "", email: "", phone: "", taxId: "", company: "", address: "", ...JSON.parse(raw) };
    }
  } catch {
    // Ignore storage errors
  }
  return { name: "", email: "", phone: "", taxId: "", company: "", address: "" };
}

export function saveProfile(data: ProfileData): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
}

interface ProfileModalProps {
  open: boolean;
  dict: Dictionary;
  onClose: () => void;
  onSelectField?: (text: string) => void;
}

export function ProfileModal({ open, dict, onClose, onSelectField }: ProfileModalProps) {
  const [profile, setProfile] = useState<ProfileData>(() => getSavedProfile());
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!open) return null;

  const isEs = dict.brand !== "TraxPDF English"; // detect locale

  const labels = [
    { key: "name" as const, label: isEs ? "Nombre completo" : "Full Name", placeholder: "Ej. Carlos Mendoza" },
    { key: "email" as const, label: isEs ? "Correo electrónico" : "Email Address", placeholder: "carlos@empresa.com" },
    { key: "phone" as const, label: isEs ? "Teléfono" : "Phone Number", placeholder: "+52 55 1234 5678" },
    { key: "taxId" as const, label: isEs ? "RFC / DNI / Tax ID" : "Tax ID / SSN / VAT", placeholder: "GAA900101XXX" },
    { key: "company" as const, label: isEs ? "Empresa / Negocio" : "Company / Organization", placeholder: "Soluciones Digitales S.A." },
    { key: "address" as const, label: isEs ? "Dirección" : "Full Address", placeholder: "Av. Reforma 123, Piso 4" },
  ];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveProfile(profile);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const hasAnyData = Object.values(profile).some((v) => v.trim().length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isEs ? "Mis Datos Frecuentes" : "My Saved Details"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isEs
                  ? "Guarda tus datos en este navegador para estamparlos con 1 clic."
                  : "Save your details in this browser for 1-click stamping onto PDFs."}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="mt-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {labels.map(({ key, label, placeholder }) => (
              <div key={key} className={key === "name" || key === "address" ? "sm:col-span-2" : ""}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {label}
                  </label>
                  {onSelectField && profile[key]?.trim() && (
                    <button
                      type="button"
                      onClick={() => {
                        onSelectField(profile[key]);
                        onClose();
                      }}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
                      title={isEs ? "Pegar en el PDF ahora" : "Stamp on PDF now"}
                    >
                      <Copy className="w-3 h-3" />
                      {isEs ? "Estampar" : "Stamp"}
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={profile[key]}
                  placeholder={placeholder}
                  onChange={(e) => setProfile({ ...profile, [key]: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
              {savedSuccess && (
                <>
                  <Check className="w-3.5 h-3.5" />
                  {isEs ? "Guardado en este navegador" : "Saved in this browser"}
                </>
              )}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {isEs ? "Cerrar" : "Close"}
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition"
              >
                {isEs ? "Guardar datos" : "Save Details"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
