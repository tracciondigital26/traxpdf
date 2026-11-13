"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  Edit3,
  Eraser,
  FileCheck2,
  FileSignature,
  FileSpreadsheet,
  FileText,
  MousePointerClick,
  Shield,
  Sparkles,
  Trash2,
  Upload,
  Zap,
} from "lucide-react";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/types";

interface SeoLandingContentProps {
  locale: Locale;
  dict: Dictionary;
  onScrollToTop: () => void;
  onTrySample: () => void;
}

export function SeoLandingContent({
  locale,
  onScrollToTop,
  onTrySample,
}: SeoLandingContentProps) {
  const isEs = locale === "es";
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const toggleFaq = (idx: number) => {
    setOpenFaq((prev) => (prev === idx ? null : idx));
  };

  const steps = [
    {
      num: "01",
      title: isEs ? "Sube tu archivo PDF" : "Upload your PDF file",
      desc: isEs
        ? "Arrastra tu documento a la zona de carga o selecciónalo desde tu dispositivo. Se abre al instante sin esperas de servidor."
        : "Drag and drop your file or select it from your device. It opens instantly right in your browser.",
      icon: <Upload className="h-6 w-6 text-indigo-400" />,
    },
    {
      num: "02",
      title: isEs ? "Modifica, corrige o firma" : "Edit, fix or sign",
      desc: isEs
        ? "Usa 'Editar Texto PDF' para corregir erratas existentes, 'Agregar Texto' para rellenar líneas vacías, o dibuja tu firma con trazo natural."
        : "Use 'Edit PDF Text' to fix typos, 'Add Text' to fill blank fields, or draw your signature cleanly in seconds.",
      icon: <Edit3 className="h-6 w-6 text-emerald-400" />,
    },
    {
      num: "03",
      title: isEs ? "Descarga al instante" : "Download instantly",
      desc: isEs
        ? "Haz clic en 'Exportar y Descargar PDF' para obtener tu archivo listo, con opción de aplanar para bloquear futuras modificaciones."
        : "Click 'Export & Download PDF' to get your finished document, with optional flattening to prevent further tampering.",
      icon: <CheckCircle2 className="h-6 w-6 text-violet-400" />,
    },
  ];

  const toolsDetail = [
    {
      title: isEs ? "Modificar Texto Existente" : "Edit Existing PDF Text",
      desc: isEs
        ? "Detecta automáticamente palabras y párrafos en el PDF para que puedas reescribirlos, cambiar números o corregir nombres sin convertir a Word."
        : "Automatically detects words and paragraphs so you can rewrite them, change numbers or fix names without converting to Word.",
      icon: <FileText className="h-5 w-5 text-indigo-400" />,
      tag: isEs ? "Exclusivo" : "Featured",
    },
    {
      title: isEs ? "Relleno de PDFs Planos e Interactivos" : "Flat & Interactive PDF Forms",
      desc: isEs
        ? "¿Tu PDF fue escaneado o impreso sin campos? Haz clic en cualquier espacio para escribir, poner palomitas (✓) o taches (✗) como si fuera un formulario real."
        : "Was your PDF scanned or flat without fillable fields? Click anywhere to type text, checkmarks (✓) or crosses (✗) with pixel precision.",
      icon: <MousePointerClick className="h-5 w-5 text-emerald-400" />,
      tag: isEs ? "Cero complicaciones" : "Smart Fill",
    },
    {
      title: isEs ? "Firma Electrónica Fácil" : "Easy Electronic Signature",
      desc: isEs
        ? "Dibuja tu firma con el mouse o dedo, escribe tu nombre con tipografía caligráfica profesional o sube una imagen de tu firma autógrafa."
        : "Draw your signature by hand, type your name for an elegant handwritten font, or upload a PNG image of your actual signature.",
      icon: <FileSignature className="h-5 w-5 text-amber-400" />,
      tag: isEs ? "Reutilizable" : "Saved Signatures",
    },
    {
      title: isEs ? "Corrector Blanco y Censura" : "Whiteout & Blackout Redact",
      desc: isEs
        ? "Tapa errores viejos con corrector blanco idéntico al fondo, o censura datos confidenciales (números de cuenta, contraseñas, RFCs) con cajas negras permanentes."
        : "Cover typos with seamless whiteout patches or permanently blackout confidential details (bank accounts, passwords, IDs).",
      icon: <Eraser className="h-5 w-5 text-rose-400" />,
      tag: isEs ? "Seguridad" : "Privacy Tool",
    },
    {
      title: isEs ? "Organizar y Eliminar Páginas" : "Rotate & Delete Pages",
      desc: isEs
        ? "Rota páginas volteadas 90° con 1 clic y elimina páginas sobrantes o anexos innecesarios para reducir el peso y entregar un documento impecable."
        : "Rotate sideways pages 90° with 1 click and eliminate unnecessary pages or annexes before exporting.",
      icon: <Trash2 className="h-5 w-5 text-orange-400" />,
      tag: isEs ? "Edición total" : "Page Manager",
    },
    {
      title: isEs ? "Mis Datos Frecuentes (1 Clic)" : "Saved Details (1-Click Fill)",
      desc: isEs
        ? "Guarda tu nombre, RFC, teléfono y dirección en tu navegador para estamparlos en cualquier formulario o solicitud con un solo clic."
        : "Save your name, tax ID, phone and address locally in your browser to stamp them onto any form with a single click.",
      icon: <Zap className="h-5 w-5 text-cyan-400" />,
      tag: isEs ? "Ahorra tiempo" : "Speed Tool",
    },
  ];

  const useCases = [
    {
      title: isEs ? "Contratos y Acuerdos Legales" : "Contracts & Agreements",
      desc: isEs
        ? "Firma contratos de arrendamiento, cartas oferta o convenios de confidencialidad (NDA) sin imprimir una sola hoja de papel."
        : "Sign lease contracts, offer letters, or NDAs in seconds without printing a single sheet of paper.",
      icon: <FileCheck2 className="h-6 w-6 text-indigo-400" />,
    },
    {
      title: isEs ? "Trámites de Gobierno y Formatos Oficiales" : "Government & Official Forms",
      desc: isEs
        ? "Rellena formularios del SAT, IMSS, visas, pasaportes y solicitudes gubernamentales que vienen en formato PDF plano no editable."
        : "Fill out tax forms, visa applications, and official government paperwork that come in flat, non-editable formats.",
      icon: <FileSpreadsheet className="h-6 w-6 text-emerald-400" />,
    },
    {
      title: isEs ? "Facturas, Presupuestos y Recibos" : "Invoices & Receipts",
      desc: isEs
        ? "Corrige fechas incorrectas, añade sellos de pagado, ajusta descripciones o tapa números viejos con el corrector blanco."
        : "Fix typos in invoices, add paid stamps, adjust descriptions, or whiteout old prices before sending.",
      icon: <Edit3 className="h-6 w-6 text-amber-400" />,
    },
    {
      title: isEs ? "Tareas Escolares y Universidad" : "Academic & School Work",
      desc: isEs
        ? "Contesta cuestionarios, llena fichas de inscripción, resalta lecturas clave y firma autorizaciones escolares desde tu celular o laptop."
        : "Answer worksheets, fill enrollment forms, highlight key study passages, and sign school permissions on phone or laptop.",
      icon: <Sparkles className="h-6 w-6 text-violet-400" />,
    },
  ];

  const faqs = [
    {
      q: isEs
        ? "¿Cómo puedo modificar el texto de un PDF en línea gratis?"
        : "How can I edit PDF text online for free?",
      a: isEs
        ? "Con TraxPDF puedes modificar cualquier documento en 3 pasos: sube tu archivo, selecciona la herramienta 'Editar Texto PDF' o 'Agregar Texto', haz clic sobre el área a modificar y escribe el nuevo contenido. También puedes usar 'Corregir / Tapar' para cubrir texto erróneo con corrector blanco y poner el texto corregido encima."
        : "With TraxPDF you can modify any document in 3 steps: upload your file, select the 'Edit PDF Text' or 'Add Text' tool, click on the area you want to update, and type. You can also use 'Fix / Whiteout' to cover old text with an exact white patch and write the replacement on top.",
    },
    {
      q: isEs
        ? "¿Es seguro modificar mis documentos en TraxPDF? ¿Se guardan en internet?"
        : "Is it safe to modify my documents on TraxPDF? Are files stored online?",
      a: isEs
        ? "Es 100% privado y seguro. TraxPDF procesa los documentos directamente en la memoria de tu navegador web usando WebAssembly. A diferencia de otros editores que suben tu PDF a servidores remotos, en el plan Invitado y Free tus archivos nunca salen de tu dispositivo, a menos que elijas expresamente guardarlos en tu Bóveda en la Nube."
        : "It is 100% private and secure. TraxPDF processes files entirely in your browser's local memory using WebAssembly. Unlike other editors that upload your sensitive documents to remote servers, in Guest and Free modes your files never leave your device unless you explicitly save them to your Cloud Vault.",
    },
    {
      q: isEs
        ? "¿Puedo rellenar formularios en PDFs planos o escaneados?"
        : "Can I fill out flat or scanned PDF forms?",
      a: isEs
        ? "¡Sí! Muchos formatos descargados de internet no tienen campos interactivos. En TraxPDF solo debes hacer clic en cualquier renglón en blanco para escribir, añadir casillas de verificación (✓), tachas (✗) o sellos con la fecha de hoy."
        : "Yes! Many forms downloaded online lack fillable form fields. In TraxPDF you simply click on any blank line to start typing, insert checkmarks (✓), crosses (✗), or stamp today's date.",
    },
    {
      q: isEs
        ? "¿Cómo firmo un documento PDF en línea?"
        : "How do I sign a PDF document online?",
      a: isEs
        ? "Solo selecciona la herramienta 'Firmar' en la barra superior. Puedes dibujar tu firma a mano con el mouse o la pantalla táctil, escribir tu nombre para generar una firma caligráfica limpia, o subir una imagen PNG de tu firma. Puedes guardarla para reutilizarla con 1 clic en futuros documentos."
        : "Select the 'Sign' tool from the top toolbar. You can draw your signature with your mouse or touchscreen, type your name to generate an elegant handwritten signature, or upload a PNG image of your signature. You can also save it to reuse in 1 click.",
    },
    {
      q: isEs
        ? "¿Cuántos PDFs puedo modificar gratis al día?"
        : "How many PDFs can I modify for free per day?",
      a: isEs
        ? "Cuentas con 1 PDF gratis al día sin necesidad de crear cuenta ni ingresar tarjeta de crédito. Si te registras gratis con tu correo electrónico, tu límite sube a 3 PDFs diarios. Si necesitas más, puedes comprar créditos de pago por uso a $0.20 USD por documento o pasarte a Pro Ilimitado."
        : "You get 1 free PDF modification per day with zero signup required. If you create a free account with your email, your quota increases to 3 free PDFs per day. For power users, you can buy pay-as-you-go credits for $0.20 USD per document or upgrade to Pro Unlimited.",
    },
    {
      q: isEs
        ? "¿Puedo eliminar páginas de mi PDF antes de descargarlo?"
        : "Can I delete pages from my PDF before downloading?",
      a: isEs
        ? "Sí. Navega a la página que deseas descartar y haz clic en 'Eliminar pág.'. La página se marcará con una tachadura roja y se excluirá automáticamente al exportar el archivo final. Si te arrepientes, puedes hacer clic en 'Restaurar pág.' en cualquier momento."
        : "Yes. Navigate to the page you want to remove and click 'Delete page'. It will be crossed out in the sidebar and excluded when exporting. If you change your mind, click 'Restore page' anytime before downloading.",
    },
  ];

  return (
    <div className="border-t border-slate-900 bg-slate-950">
      {/* Step-by-Step Guide Section */}
      <section className="px-4 py-20 sm:px-6 lg:px-8 border-b border-slate-900/80">
        <div className="mx-auto max-w-5xl space-y-12">
          <div className="text-center space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              {isEs ? "Guía Rápida" : "Quick Walkthrough"}
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              {isEs ? "¿Cómo modificar un PDF en línea gratis?" : "How to edit a PDF online for free?"}
            </h2>
            <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
              {isEs
                ? "Sin descargar programas pesados ni registrar tarjetas. Rellena, edita y firma en menos de 60 segundos."
                : "No complex software or credit card required. Fill, edit, and sign any document in under 60 seconds."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((st) => (
              <div
                key={st.num}
                className="relative rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4 hover:border-slate-700 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800/80 border border-slate-700">
                    {st.icon}
                  </div>
                  <span className="text-2xl font-black text-slate-700">{st.num}</span>
                </div>
                <h3 className="text-lg font-bold text-white">{st.title}</h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">{st.desc}</p>
              </div>
            ))}
          </div>

          <div className="flex justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={onScrollToTop}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/25 transition"
            >
              <Upload className="h-4 w-4" />
              {isEs ? "Subir mi PDF ahora" : "Upload my PDF now"}
            </button>
            <button
              type="button"
              onClick={onTrySample}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition"
            >
              <Sparkles className="h-4 w-4 text-emerald-400" />
              {isEs ? "Probar documento demo" : "Try sample demo"}
            </button>
          </div>
        </div>
      </section>

      {/* Deep Feature Grid Section */}
      <section className="px-4 py-20 sm:px-6 lg:px-8 border-b border-slate-900/80 bg-slate-950/70">
        <div className="mx-auto max-w-5xl space-y-12">
          <div className="text-center space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              {isEs ? "Herramientas de Estudio" : "Studio Capabilities"}
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              {isEs
                ? "Todo lo que necesitas para modificar cualquier PDF"
                : "Everything you need to edit and customize any PDF"}
            </h2>
            <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
              {isEs
                ? "Diseñado tanto para usuarios ocasionales que solo necesitan firmar una hoja, como para profesionales que gestionan cientos de documentos."
                : "Engineered for anyone needing to sign a quick form or professionals managing dozens of contracts."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {toolsDetail.map((t) => (
              <div
                key={t.title}
                className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6 space-y-3 hover:border-slate-700 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 border border-slate-700/80">
                    {t.icon}
                  </div>
                  <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-[10px] font-semibold text-slate-300">
                    {t.tag}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white">{t.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Common Use Cases Section */}
      <section className="px-4 py-20 sm:px-6 lg:px-8 border-b border-slate-900/80">
        <div className="mx-auto max-w-5xl space-y-12">
          <div className="text-center space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-violet-400">
              {isEs ? "Casos de Uso Reales" : "Common Use Cases"}
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              {isEs ? "¿Para qué se usa TraxPDF?" : "What do people use TraxPDF for?"}
            </h2>
            <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
              {isEs
                ? "Resuelve tareas cotidianas de oficina, negocios y trámites personales sin fricción."
                : "Solve everyday business, paperwork, and personal administrative tasks effortlessly."}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {useCases.map((uc) => (
              <div
                key={uc.title}
                className="flex items-start gap-4 rounded-2xl border border-slate-800/90 bg-slate-900/50 p-6"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                  {uc.icon}
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-white">{uc.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">{uc.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy & Security Guarantee */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 border-b border-slate-900/80 bg-gradient-to-b from-slate-950 via-slate-900/30 to-slate-950">
        <div className="mx-auto max-w-4xl rounded-3xl border border-emerald-500/30 bg-emerald-950/15 p-8 sm:p-10 space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400">
            <Shield className="h-6 w-6" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            {isEs ? "Tus documentos nunca salen de tu navegador" : "Your files never leave your browser"}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl mx-auto">
            {isEs
              ? "A diferencia de otros servicios en la nube que almacenan copias de tus contratos y estados de cuenta en servidores desconocidos, TraxPDF ejecuta el renderizado y la modificación del PDF 100% en tu propia computadora o teléfono móvil mediante WebAssembly y JavaScript."
              : "Unlike legacy cloud converters that store copies of your bank statements and legal contracts on unknown servers, TraxPDF renders and edits PDFs 100% inside your local device memory using WebAssembly and client-side JavaScript."}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-5 pt-2 text-xs text-emerald-300/90 font-medium">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              {isEs ? "Cero subidas a servidores en modo gratis" : "Zero server uploads in free mode"}
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              {isEs ? "Cumple con privacidad GDPR y confidencialidad" : "GDPR & privacy friendly"}
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              {isEs ? "Sin marcas de agua forzadas" : "No forced watermarks"}
            </span>
          </div>
        </div>
      </section>

      {/* FAQ Accordion Section (Indexed by Google for Rich Snippets) */}
      <section className="px-4 py-20 sm:px-6 lg:px-8 border-b border-slate-900/80">
        <div className="mx-auto max-w-3xl space-y-10">
          <div className="text-center space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              {isEs ? "Respuestas Rápidas" : "FAQ"}
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              {isEs ? "Preguntas Frecuentes sobre Modificar PDFs" : "Frequently Asked Questions"}
            </h2>
            <p className="text-sm text-slate-400">
              {isEs
                ? "Todo lo que necesitas saber sobre privacidad, formatos y límites diarios."
                : "Everything you need to know about privacy, features, and limits."}
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden transition"
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(idx)}
                    className="w-full flex items-center justify-between p-5 text-left text-sm sm:text-base font-semibold text-white hover:text-indigo-300 transition"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`h-5 w-5 text-slate-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-indigo-400" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-slate-800/60 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final SEO CTA */}
      <section className="px-4 py-20 sm:px-6 lg:px-8 text-center bg-slate-950">
        <div className="mx-auto max-w-2xl space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            {isEs ? "¿Listo para modificar tu primer PDF?" : "Ready to edit your first PDF?"}
          </h2>
          <p className="text-sm sm:text-base text-slate-400">
            {isEs
              ? "Prueba TraxPDF gratis ahora mismo. 100% privado, sin registro obligatorio y en segundos."
              : "Try TraxPDF free right now. 100% private, no signup required, ready in seconds."}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={onScrollToTop}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-7 py-3.5 text-sm font-bold text-white hover:bg-indigo-500 shadow-xl shadow-indigo-600/30 transition"
            >
              <Upload className="h-4 w-4" />
              {isEs ? "Subir mi archivo PDF" : "Upload my PDF file"}
            </button>
            <button
              type="button"
              onClick={onTrySample}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-6 py-3.5 text-sm font-semibold text-slate-200 hover:text-white hover:bg-slate-800 transition"
            >
              <Sparkles className="h-4 w-4 text-emerald-400" />
              {isEs ? "Ver ejemplo interactivo" : "See interactive sample"}
            </button>
          </div>
        </div>
      </section>

      {/* Comprehensive SEO Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/90 px-4 py-12 sm:px-6 lg:px-8 text-xs text-slate-400">
        <div className="mx-auto max-w-6xl space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-3">
              <span className="text-base font-extrabold text-white">
                Trax<span className="text-indigo-400">PDF</span>
              </span>
              <p className="text-xs text-slate-400 leading-relaxed">
                {isEs
                  ? "Estudio PDF en línea privado y ultrarrápido para rellenar formularios, editar texto existente y firmar documentos legalmente."
                  : "Private, lightning-fast online PDF studio to fill forms, edit existing text, and sign documents legally."}
              </p>
            </div>

            <div>
              <p className="font-bold text-slate-200 mb-2">
                {isEs ? "Herramientas de Edición" : "Editing Tools"}
              </p>
              <ul className="space-y-1.5 text-slate-400">
                <li>{isEs ? "Modificar texto en PDF" : "Edit PDF Text"}</li>
                <li>{isEs ? "Rellenar formularios planos" : "Fill flat forms"}</li>
                <li>{isEs ? "Firmar documentos PDF" : "Sign PDF documents"}</li>
                <li>{isEs ? "Corrector blanco (Whiteout)" : "Whiteout correction"}</li>
                <li>{isEs ? "Censurar datos (Blackout)" : "Blackout redaction"}</li>
                <li>{isEs ? "Eliminar páginas de un PDF" : "Delete PDF pages"}</li>
              </ul>
            </div>

            <div>
              <p className="font-bold text-slate-200 mb-2">
                {isEs ? "Planes y Precios" : "Pricing & Limits"}
              </p>
              <ul className="space-y-1.5 text-slate-400">
                <li>{isEs ? "Invitado: 1 PDF gratis/día" : "Guest: 1 free PDF/day"}</li>
                <li>{isEs ? "Cuenta Free: 3 PDFs gratis/día" : "Free Account: 3 free/day"}</li>
                <li>{isEs ? "Créditos: $0.20 USD / PDF" : "Credits: $0.20 USD / PDF"}</li>
                <li>{isEs ? "Pro Ilimitado: $7.99/mes" : "Pro Unlimited: $7.99/mo"}</li>
                <li>{isEs ? "Pro+ Nube: $14.99/mes" : "Pro+ Cloud: $14.99/mo"}</li>
              </ul>
            </div>

            <div>
              <p className="font-bold text-slate-200 mb-2">
                {isEs ? "Privacidad y Marca" : "Privacy & Brand"}
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                {isEs
                  ? "Desarrollado con altos estándares de privacidad. Sin almacenamiento involuntario de archivos."
                  : "Built with high privacy standards. Zero unsolicited server storage."}
              </p>
              <p className="mt-3 text-slate-500">
                © {new Date().getFullYear()} TraxPDF · Desarrollado por Tracción Digital
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
