export type PlanTier = "guest" | "free" | "pro" | "pro_cloud";

export type BillingCycle = "monthly" | "annual";

export type Locale = "en" | "es";

export interface SessionInfo {
  authenticated: boolean;
  userId: string;
  email: string | null;
  name: string | null;
  plan: PlanTier;
  billingCycle: BillingCycle | null;
  dailyLimit: number | null; // null = unlimited
  usedToday: number;
  remainingToday: number | null; // null = unlimited
  credits: number; // each credit = 1 PDF ($0.20 USD)
  cloudEnabled: boolean;
  cloudDocCount: number;
  stripeConfigured: boolean;
}

export interface CloudDocMeta {
  id: string;
  title: string;
  fileName: string;
  sizeBytes: number;
  pageCount: number;
  updatedAt: string;
  createdAt: string;
}

export type ToolMode =
  | "select"
  | "text"
  | "edit_text"
  | "correct"
  | "redact"
  | "sign"
  | "check"
  | "cross"
  | "date"
  | "highlight";

export type AnnotationFont = "Helvetica" | "Times" | "Courier";

export interface PdfAnnotation {
  id: string;
  type: "text" | "correct" | "redact" | "sign" | "check" | "cross" | "date" | "highlight";
  pageIndex: number; // 0-based
  // Normalized coordinates (0..1 relative to unrotated/current page viewport width & height)
  // Actually stored relative to current rendered page orientation (top-left origin)
  x: number; // 0..1
  y: number; // 0..1
  width: number; // 0..1
  height: number; // 0..1
  text?: string;
  fontSize?: number; // PDF points (e.g., 14)
  fontFamily?: AnnotationFont;
  bold?: boolean;
  color?: string; // hex e.g. #111827
  bgColor?: string; // hex for whiteout/correct e.g. #FFFFFF
  imageDataUrl?: string; // PNG data URL for signatures
}

export interface DetectedFormField {
  id: string;
  name: string;
  pageIndex: number;
  fieldType: "text" | "checkbox" | "radio" | "select";
  // Normalized 0..1 rect in top-left canvas space (at 0deg base, mapped with viewport)
  x: number;
  y: number;
  width: number;
  height: number;
  value: string | boolean;
  options?: string[];
  exportValue?: string;
  multiline?: boolean;
}
