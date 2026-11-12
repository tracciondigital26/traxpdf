import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Locale } from "../types";

export async function generateSamplePdf(locale: Locale): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const page1 = pdfDoc.addPage([612, 792]); // US Letter
  const page2 = pdfDoc.addPage([612, 792]);

  const isEs = locale === "es";

  // Header Banner
  page1.drawRectangle({
    x: 0,
    y: 712,
    width: 612,
    height: 80,
    color: rgb(0.06, 0.09, 0.16),
  });

  page1.drawText("TRAXPDF", {
    x: 44,
    y: 752,
    size: 20,
    font: helveticaBold,
    color: rgb(0.51, 0.55, 0.97),
  });

  page1.drawText(
    isEs
      ? "ACUERDO DE SERVICIOS Y FORMULARIO INTERACTIVO"
      : "SERVICE AGREEMENT & INTERACTIVE FORM",
    {
      x: 44,
      y: 730,
      size: 11,
      font: helvetica,
      color: rgb(0.88, 0.91, 0.96),
    },
  );

  // Intro text (includes a deliberate typo/amount to try the Fix/Whiteout tool)
  page1.drawText(
    isEs
      ? "1. Datos del Cliente (Haz clic en los campos para rellenar)"
      : "1. Client Details (Click any field below to fill)",
    {
      x: 44,
      y: 676,
      size: 13,
      font: helveticaBold,
      color: rgb(0.07, 0.09, 0.15),
    },
  );

  const form = pdfDoc.getForm();

  // Field: Full Name
  page1.drawText(isEs ? "Nombre completo:" : "Full Name:", {
    x: 44,
    y: 642,
    size: 10.5,
    font: helvetica,
    color: rgb(0.22, 0.25, 0.32),
  });
  const nameField = form.createTextField("full_name");
  nameField.addToPage(page1, {
    x: 165,
    y: 634,
    width: 395,
    height: 24,
    borderWidth: 1,
    borderColor: rgb(0.75, 0.79, 0.85),
    backgroundColor: rgb(0.97, 0.98, 1),
  });

  // Field: Email
  page1.drawText(isEs ? "Correo electrónico:" : "Email Address:", {
    x: 44,
    y: 604,
    size: 10.5,
    font: helvetica,
    color: rgb(0.22, 0.25, 0.32),
  });
  const emailField = form.createTextField("email");
  emailField.addToPage(page1, {
    x: 165,
    y: 596,
    width: 395,
    height: 24,
    borderWidth: 1,
    borderColor: rgb(0.75, 0.79, 0.85),
    backgroundColor: rgb(0.97, 0.98, 1),
  });

  // Field: Company
  page1.drawText(isEs ? "Empresa / Proyecto:" : "Company / Project:", {
    x: 44,
    y: 566,
    size: 10.5,
    font: helvetica,
    color: rgb(0.22, 0.25, 0.32),
  });
  const companyField = form.createTextField("company");
  companyField.addToPage(page1, {
    x: 165,
    y: 558,
    width: 225,
    height: 24,
    borderWidth: 1,
    borderColor: rgb(0.75, 0.79, 0.85),
    backgroundColor: rgb(0.97, 0.98, 1),
  });

  // Field: Date
  page1.drawText(isEs ? "Fecha:" : "Date:", {
    x: 405,
    y: 566,
    size: 10.5,
    font: helvetica,
    color: rgb(0.22, 0.25, 0.32),
  });
  const dateField = form.createTextField("date");
  dateField.setText(new Date().toISOString().slice(0, 10));
  dateField.addToPage(page1, {
    x: 448,
    y: 558,
    width: 112,
    height: 24,
    borderWidth: 1,
    borderColor: rgb(0.75, 0.79, 0.85),
    backgroundColor: rgb(0.97, 0.98, 1),
  });

  // Dropdown: Plan
  page1.drawText(isEs ? "Plan seleccionado:" : "Selected Plan:", {
    x: 44,
    y: 526,
    size: 10.5,
    font: helvetica,
    color: rgb(0.22, 0.25, 0.32),
  });
  const planDropdown = form.createDropdown("plan_tier");
  planDropdown.addOptions(["Pay-As-You-Go ($0.20/PDF)", "Pro Unlimited", "Pro+ Cloud"]);
  planDropdown.select("Pro Unlimited");
  planDropdown.addToPage(page1, {
    x: 165,
    y: 518,
    width: 225,
    height: 24,
    borderWidth: 1,
    borderColor: rgb(0.75, 0.79, 0.85),
    backgroundColor: rgb(0.97, 0.98, 1),
  });

  // Section 2: Sample Correction Area
  page1.drawText(
    isEs
      ? "2. Área de prueba para Corregir / Modificar texto"
      : "2. Sample Text to Practice Fix / Whiteout",
    {
      x: 44,
      y: 468,
      size: 13,
      font: helveticaBold,
      color: rgb(0.07, 0.09, 0.15),
    },
  );

  page1.drawRectangle({
    x: 44,
    y: 382,
    width: 516,
    height: 74,
    borderColor: rgb(0.86, 0.89, 0.93),
    borderWidth: 1,
    color: rgb(0.985, 0.987, 0.995),
  });

  page1.drawText(
    isEs
      ? "Monto total acordado: $1,999.00 USD (Estado: Borradorr con error)."
      : "Agreed total amount: $1,999.00 USD (Status: Draftt with typo).",
    {
      x: 58,
      y: 428,
      size: 11,
      font: helvetica,
      color: rgb(0.15, 0.18, 0.24),
    },
  );
  page1.drawText(
    isEs
      ? "Tip: Usa la herramienta 'Corregir / Tapar' para cubrir $1,999.00 y escribir el monto correcto."
      : "Tip: Use the 'Fix / Whiteout' tool to cover $1,999.00 and type the corrected price.",
    {
      x: 58,
      y: 400,
      size: 9.5,
      font: helvetica,
      color: rgb(0.39, 0.45, 0.55),
    },
  );

  // Checkboxes
  page1.drawText(isEs ? "3. Confirmaciones" : "3. Confirmations", {
    x: 44,
    y: 344,
    size: 13,
    font: helveticaBold,
    color: rgb(0.07, 0.09, 0.15),
  });

  const agreeBox = form.createCheckBox("agree_terms");
  agreeBox.addToPage(page1, {
    x: 44,
    y: 312,
    width: 16,
    height: 16,
    borderWidth: 1,
    borderColor: rgb(0.45, 0.5, 0.6),
  });
  page1.drawText(
    isEs
      ? "Acepto los términos y condiciones del documento."
      : "I agree to the terms and conditions of this document.",
    {
      x: 70,
      y: 315,
      size: 10.5,
      font: helvetica,
      color: rgb(0.15, 0.18, 0.24),
    },
  );

  const notifyBox = form.createCheckBox("receive_copy");
  notifyBox.check();
  notifyBox.addToPage(page1, {
    x: 44,
    y: 284,
    width: 16,
    height: 16,
    borderWidth: 1,
    borderColor: rgb(0.45, 0.5, 0.6),
  });
  page1.drawText(
    isEs
      ? "Deseo conservar una copia firmada en formato PDF."
      : "I would like to keep a signed PDF copy for my records.",
    {
      x: 70,
      y: 287,
      size: 10.5,
      font: helvetica,
      color: rgb(0.15, 0.18, 0.24),
    },
  );

  // Signature box
  page1.drawText(isEs ? "4. Firma Autorizada" : "4. Authorized Signature", {
    x: 44,
    y: 236,
    size: 13,
    font: helveticaBold,
    color: rgb(0.07, 0.09, 0.15),
  });

  page1.drawRectangle({
    x: 44,
    y: 112,
    width: 280,
    height: 108,
    borderColor: rgb(0.65, 0.7, 0.8),
    borderWidth: 1.2,
    color: rgb(1, 1, 1),
  });
  page1.drawText(isEs ? "Firma aquí (usa la herramienta Firmar)" : "Sign here (use the Sign tool)", {
    x: 56,
    y: 124,
    size: 9,
    font: helvetica,
    color: rgb(0.55, 0.6, 0.68),
  });

  // Page 2
  page2.drawText(
    isEs ? "ANEXO — NOTAS ADICIONALES" : "APPENDIX — ADDITIONAL NOTES",
    {
      x: 44,
      y: 730,
      size: 15,
      font: helveticaBold,
      color: rgb(0.07, 0.09, 0.15),
    },
  );
  page2.drawText(
    isEs
      ? "Puedes agregar texto libre, fechas, palomitas o resaltar cualquier sección aquí."
      : "You can add custom text, dates, checkmarks, or highlights anywhere on this page.",
    {
      x: 44,
      y: 704,
      size: 10.5,
      font: helvetica,
      color: rgb(0.35, 0.4, 0.48),
    },
  );

  const notesField = form.createTextField("additional_notes");
  notesField.enableMultiline();
  notesField.addToPage(page2, {
    x: 44,
    y: 520,
    width: 520,
    height: 160,
    borderWidth: 1,
    borderColor: rgb(0.75, 0.79, 0.85),
    backgroundColor: rgb(0.98, 0.99, 1),
  });

  return pdfDoc.save();
}
