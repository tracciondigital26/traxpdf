import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { BillingCycle, CloudDocMeta, PlanTier } from "../types";

export interface StoredUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  plan: Exclude<PlanTier, "guest">;
  billingCycle: BillingCycle | null;
  credits: number;
  dailyUsage: Record<string, number>; // date YYYY-MM-DD -> count
  createdAt: string;
}

export interface StoredGuest {
  id: string;
  dailyUsage: Record<string, number>;
  updatedAt: string;
}

export interface DatabaseSchema {
  users: Record<string, StoredUser>;
  usersByEmail: Record<string, string>;
  guests: Record<string, StoredGuest>;
  cloudDocs: Record<string, CloudDocMeta[]>; // userId -> docs
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "traxpdf-db.json");
const CLOUD_DIR = path.join(DATA_DIR, "cloud");

function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(CLOUD_DIR)) {
    fs.mkdirSync(CLOUD_DIR, { recursive: true });
  }
}

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function readDb(): DatabaseSchema {
  ensureDirs();
  if (!fs.existsSync(DB_FILE)) {
    const empty: DatabaseSchema = {
      users: {},
      usersByEmail: {},
      guests: {},
      cloudDocs: {},
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(empty, null, 2), "utf8");
    return empty;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<DatabaseSchema>;
    return {
      users: parsed.users ?? {},
      usersByEmail: parsed.usersByEmail ?? {},
      guests: parsed.guests ?? {},
      cloudDocs: parsed.cloudDocs ?? {},
    };
  } catch {
    return { users: {}, usersByEmail: {}, guests: {}, cloudDocs: {} };
  }
}

export function writeDb(db: DatabaseSchema): void {
  ensureDirs();
  const tmpFile = `${DB_FILE}.${crypto.randomBytes(4).toString("hex")}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(db, null, 2), "utf8");
  fs.renameSync(tmpFile, DB_FILE);
}

export function getUserCloudDir(userId: string): string {
  ensureDirs();
  const safeId = userId.replace(/[^a-zA-Z0-9_-]/g, "");
  const dir = path.join(CLOUD_DIR, safeId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function saveCloudPdfBytes(userId: string, docId: string, bytes: Uint8Array): void {
  const dir = getUserCloudDir(userId);
  const safeDocId = docId.replace(/[^a-zA-Z0-9_-]/g, "");
  fs.writeFileSync(path.join(dir, `${safeDocId}.pdf`), bytes);
}

export function readCloudPdfBytes(userId: string, docId: string): Buffer | null {
  const dir = getUserCloudDir(userId);
  const safeDocId = docId.replace(/[^a-zA-Z0-9_-]/g, "");
  const filePath = path.join(dir, `${safeDocId}.pdf`);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath);
}

export function deleteCloudPdfBytes(userId: string, docId: string): void {
  const dir = getUserCloudDir(userId);
  const safeDocId = docId.replace(/[^a-zA-Z0-9_-]/g, "");
  const filePath = path.join(dir, `${safeDocId}.pdf`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}
