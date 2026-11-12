import {
  PDFDocument,
  PDFCheckBox,
  PDFDropdown,
  PDFRadioGroup,
  PDFTextField,
  StandardFonts,
  degrees,
  rgb,
} from "pdf-lib";
import type { AnnotationFont, DetectedFormField, PdfAnnotation } from "../types";

function hexToRgb(hex: string | undefined, fallback: [number, number, number] = [0.07, 0.09, 0.15]) {
  if (!hex) return rgb(...fallback);
  const clean = hex.replace("#", "").trim();
  if (clean.length !== 6) return rgb(...fallback);
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return rgb(...fallback);
  return rgb(r / 255, g / 255, b / 255);
}

/**
 * Strip characters unsupported by StandardFonts (WinAnsi) so pdf-lib never throws on emojis.
 */
function sanitizeWinAnsi(text: string): string {
  return text
    .replace(/[^\x20-\x7E\xA0-\xFF\n\r\t]/g, " ")
    .replace(/\r\n/g, "\n");
}

/**
 * Convert normalized top-left viewport rect (0..1) into unrotated PDF page coordinates,
 * accounting for page cropBox and effective rotation (0 | 90 | 180 | 270).
 */
function mapViewportRectToPdf(
  rect: { x: number; y: number; width: number; height: number },
  cropBox: { x: number; y: number; width: number; height: number },
  effectiveRotation: number,
): { pdfX: number; pdfY: number; pdfW: number; pdfH: number; textRotate: number } {
  const rot = ((effectiveRotation % 360) + 360) % 360;
  const cx = cropBox.x;
  const cy = cropBox.y;
  const cw = cropBox.width;
  const ch = cropBox.height;

  // Map a normalized viewport point (vx, vy) from top-left (0..1) to PDF user space
  const mapPoint = (vx: number, vy: number): { x: number; y: number } => {
    if (rot === 90) {
      return {
        x: cx + vy * cw,
        y: cy + vx * ch,
      };
    }
    if (rot === 180) {
      return {
        x: cx + (1 - vx) * cw,
        y: cy + vy * ch,
      };
    }
    if (rot === 270) {
      return {
        x: cx + (1 - vy) * cw,
        y: cy + (1 - vx) * ch,
      };
    }
    // 0 deg
    return {
      x: cx + vx * cw,
      y: cy + (1 - vy) * ch,
    };
  };

  const p1 = mapPoint(rect.x, rect.y);
  const p2 = mapPoint(rect.x + rect.width, rect.y + rect.height);
  const minX = Math.min(p1.x, p2.x);
  const maxX = Math.max(p1.x, p2.x);
  const minY = Math.min(p1.y, p2.y);
  const maxY = Math.max(p1.y, p2.y);

  return {
    pdfX: minX,
    pdfY: minY,
    pdfW: maxX - minX,
    pdfH: maxY - minY,
    textRotate: rot,
  };
}

function getFontKey(family: AnnotationFont | undefined, bold: boolean | undefined) {
  if (family === "Times") return bold ? StandardFonts.TimesRomanBold : StandardFonts.TimesRoman;
  if (family === "Courier") return bold ? StandardFonts.CourierBold : StandardFonts.Courier;
  return bold ? StandardFonts.HelveticaBold : StandardFonts.Helvetica;
}

export async function exportModifiedPdf(params: {
  sourceBytes: Uint8Array;
  formFields: DetectedFormField[];
  annotations: PdfAnnotation[];
  pageRotations: Record<number, number>; // extra clockwise degrees per pageIndex
  deletedPages?: number[];
  flatten: boolean;
}): Promise<Uint8Array> {
  const { sourceBytes, formFields, annotations, pageRotations, deletedPages = [], flatten } = params;
  const pdfDoc = await PDFDocument.load(sourceBytes, { ignoreEncryption: true });

  // 1. Apply AcroForm values
  try {
    const form = pdfDoc.getForm();
    for (const fieldState of formFields) {
      try {
        const field = form.getField(fieldState.name);
        if (field instanceof PDFTextField) {
          field.setText(sanitizeWinAnsi(String(fieldState.value ?? "")));
        } else if (field instanceof PDFCheckBox) {
          if (fieldState.value === true) {
            field.check();
          } else {
            field.uncheck();
          }
        } else if (field instanceof PDFDropdown) {
          const val = String(fieldState.value ?? "");
          if (val) field.select(val);
        } else if (field instanceof PDFRadioGroup) {
          const val = String(fieldState.value ?? "");
          if (fieldState.value === true && fieldState.exportValue) {
            field.select(fieldState.exportValue);
          } else if (val && val !== "false") {
            field.select(val);
          }
        }
      } catch {
        // Ignore individual fields that cannot be updated directly
      }
    }

    if (flatten) {
      form.flatten();
    }
  } catch {
    // Document may not contain an AcroForm
  }

  // Embed fonts lazily as needed
  const fontCache = new Map<string, Awaited<ReturnType<typeof pdfDoc.embedFont>>>();
  const getEmbeddedFont = async (family?: AnnotationFont, bold?: boolean) => {
    const stdName = getFontKey(family, bold);
    let cached = fontCache.get(stdName);
    if (!cached) {
      cached = await pdfDoc.embedFont(stdName);
      fontCache.set(stdName, cached);
    }
    return cached;
  };

  const pages = pdfDoc.getPages();

  // 2. Apply user page rotations first and keep effective rotation per page
  const effectiveRotations: number[] = pages.map((page, idx) => {
    const baseAngle = page.getRotation().angle || 0;
    const extra = pageRotations[idx] || 0;
    const nextAngle = ((baseAngle + extra) % 360 + 360) % 360;
    if (extra !== 0) {
      page.setRotation(degrees(nextAngle));
    }
    return nextAngle;
  });

  // 3. Render annotations onto pages
  for (const ann of annotations) {
    const page = pages[ann.pageIndex];
    if (!page) continue;

    const cropBox = page.getCropBox();
    const rot = effectiveRotations[ann.pageIndex] ?? 0;
    const mapped = mapViewportRectToPdf(ann, cropBox, rot);

    if (ann.type === "highlight") {
      page.drawRectangle({
        x: mapped.pdfX,
        y: mapped.pdfY,
        width: mapped.pdfW,
        height: mapped.pdfH,
        color: hexToRgb(ann.bgColor || "#FDE047"),
        opacity: 0.38,
      });
      continue;
    }

    if (ann.type === "redact") {
      page.drawRectangle({
        x: mapped.pdfX,
        y: mapped.pdfY,
        width: mapped.pdfW,
        height: mapped.pdfH,
        color: rgb(0.05, 0.06, 0.08),
      });
      continue;
    }

    if (ann.type === "correct") {
      page.drawRectangle({
        x: mapped.pdfX,
        y: mapped.pdfY,
        width: mapped.pdfW,
        height: mapped.pdfH,
        color: hexToRgb(ann.bgColor || "#FFFFFF", [1, 1, 1]),
      });
      if (ann.text && ann.text.trim().length > 0) {
        const font = await getEmbeddedFont(ann.fontFamily, ann.bold);
        const fontSize = ann.fontSize || 12;
        const text = sanitizeWinAnsi(ann.text);
        const pad = 4;
        const textPos =
          rot === 0
            ? { x: mapped.pdfX + pad, y: mapped.pdfY + mapped.pdfH - fontSize - 2 }
            : { x: mapped.pdfX + pad, y: mapped.pdfY + mapped.pdfH / 2 };

        page.drawText(text, {
          x: textPos.x,
          y: textPos.y,
          size: fontSize,
          lineHeight: fontSize * 1.25,
          font,
          color: hexToRgb(ann.color || "#111827"),
          maxWidth: Math.max(20, mapped.pdfW - pad * 2),
          rotate: degrees(rot),
        });
      }
      continue;
    }

    if (ann.type === "text" || ann.type === "date") {
      const content = sanitizeWinAnsi(ann.text || "");
      if (!content) continue;
      const font = await getEmbeddedFont(ann.fontFamily, ann.bold);
      const fontSize = ann.fontSize || 13;
      const pad = 2;

      const textPos =
        rot === 0
          ? { x: mapped.pdfX + pad, y: mapped.pdfY + mapped.pdfH - fontSize - 2 }
          : { x: mapped.pdfX + pad, y: mapped.pdfY + mapped.pdfH / 2 };

      page.drawText(content, {
        x: textPos.x,
        y: textPos.y,
        size: fontSize,
        lineHeight: fontSize * 1.25,
        font,
        color: hexToRgb(ann.color || "#111827"),
        maxWidth: Math.max(40, mapped.pdfW - pad * 2),
        rotate: degrees(rot),
      });
      continue;
    }

    if (ann.type === "check") {
      const color = hexToRgb(ann.color || "#16A34A");
      const x = mapped.pdfX;
      const y = mapped.pdfY;
      const w = mapped.pdfW;
      const h = mapped.pdfH;
      const thickness = Math.max(1.8, Math.min(w, h) * 0.14);
      page.drawLine({
        start: { x: x + w * 0.15, y: y + h * 0.48 },
        end: { x: x + w * 0.42, y: y + h * 0.2 },
        thickness,
        color,
      });
      page.drawLine({
        start: { x: x + w * 0.42, y: y + h * 0.2 },
        end: { x: x + w * 0.88, y: y + h * 0.82 },
        thickness,
        color,
      });
      continue;
    }

    if (ann.type === "cross") {
      const color = hexToRgb(ann.color || "#DC2626");
      const x = mapped.pdfX;
      const y = mapped.pdfY;
      const w = mapped.pdfW;
      const h = mapped.pdfH;
      const thickness = Math.max(1.8, Math.min(w, h) * 0.14);
      page.drawLine({
        start: { x: x + w * 0.18, y: y + h * 0.18 },
        end: { x: x + w * 0.82, y: y + h * 0.82 },
        thickness,
        color,
      });
      page.drawLine({
        start: { x: x + w * 0.18, y: y + h * 0.82 },
        end: { x: x + w * 0.82, y: y + h * 0.18 },
        thickness,
        color,
      });
      continue;
    }

    if (ann.type === "sign" && ann.imageDataUrl) {
      try {
        const base64 = ann.imageDataUrl.split(",")[1];
        if (!base64) continue;
        const binStr = atob(base64);
        const imgBytes = new Uint8Array(binStr.length);
        for (let i = 0; i < binStr.length; i++) {
          imgBytes[i] = binStr.charCodeAt(i);
        }
        const isJpg =
          ann.imageDataUrl.startsWith("data:image/jpeg") ||
          ann.imageDataUrl.startsWith("data:image/jpg");
        const embeddedImage = isJpg
          ? await pdfDoc.embedJpg(imgBytes)
          : await pdfDoc.embedPng(imgBytes);

        page.drawImage(embeddedImage, {
          x: mapped.pdfX,
          y: mapped.pdfY,
          width: mapped.pdfW,
          height: mapped.pdfH,
          rotate: degrees(rot),
        });
      } catch {
        // Ignore invalid image data
      }
    }
  }

  // Remove marked pages in reverse order so indices do not shift
  const sortedDeletes = [...new Set(deletedPages)].sort((a, b) => b - a);
  const totalPages = pdfDoc.getPageCount();
  for (const pageIdx of sortedDeletes) {
    if (totalPages > 1 && pageIdx >= 0 && pageIdx < pdfDoc.getPageCount()) {
      pdfDoc.removePage(pageIdx);
    }
  }

  return pdfDoc.save();
}
