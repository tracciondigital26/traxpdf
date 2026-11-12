import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { BillingCycle, CloudDocMeta, PlanTier } from "../types";

export interface StoredUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  plan: Exclude<PlanTier, "guest">;
  billingCycle: BillingCycle | null;
  credits: number;
  dailyUsage: Record<string, number>;
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
  cloudDocs: Record<string, CloudDocMeta[]>;
}

interface TraxCloudflareEnv {
  TRAX_KV?: {
    get(key: string): Promise<string | null>;
    put(key: string, value: string): Promise<void>;
  };
  TRAX_R2?: {
    put(key: string, value: Uint8Array | ArrayBuffer): Promise<unknown>;
    get(key: string): Promise<{ arrayBuffer(): Promise<ArrayBuffer> } | null>;
    delete(key: string): Promise<void>;
  };
}

const KV_DB_KEY = "traxpdf:db:v1";
const DATA_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "traxpdf-db.json");
const CLOUD_DIR = path.join(DATA_DIR, "cloud");

const globalForStore = globalThis as typeof globalThis & {
  __traxMemoryDb?: DatabaseSchema;
  __traxMemoryCloud?: Map<string, Uint8Array>;
};

function emptyDb(): DatabaseSchema {
  return { users: {}, usersByEmail: {}, guests: {}, cloudDocs: {} };
}

function normalizeDb(raw: Partial<DatabaseSchema> | null | undefined): DatabaseSchema {
  return {
    users: raw?.users ?? {},
    usersByEmail: raw?.usersByEmail ?? {},
    guests: raw?.guests ?? {},
    cloudDocs: raw?.cloudDocs ?? {},
  };
}

async function getCfEnv(): Promise<TraxCloudflareEnv | null> {
  try {
    const ctx = await getCloudflareContext({ async: true });
    return (ctx?.env as unknown as TraxCloudflareEnv) ?? null;
  } catch {
    return null;
  }
}

function canUseLocalFs(): boolean {
  try {
    return typeof process !== "undefined" && Boolean(process.versions?.node) && typeof fs.existsSync === "function";
  } catch {
    return false;
  }
}

function ensureLocalDirs() {
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

export async function readDbAsync(): Promise<DatabaseSchema> {
  const cfEnv = await getCfEnv();
  if (cfEnv?.TRAX_KV) {
    const raw = await cfEnv.TRAX_KV.get(KV_DB_KEY);
    if (!raw) return emptyDb();
    try {
      return normalizeDb(JSON.parse(raw) as Partial<DatabaseSchema>);
    } catch {
      return emptyDb();
    }
  }

  if (canUseLocalFs()) {
    try {
      ensureLocalDirs();
      if (!fs.existsSync(DB_FILE)) {
        const initial = emptyDb();
        fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), "utf8");
        return initial;
      }
      const raw = fs.readFileSync(DB_FILE, "utf8");
      return normalizeDb(JSON.parse(raw) as Partial<DatabaseSchema>);
    } catch {
      // Fall through to memory store if FS is read-only (e.g. Workers without KV)
    }
  }

  if (!globalForStore.__traxMemoryDb) {
    globalForStore.__traxMemoryDb = emptyDb();
  }
  return globalForStore.__traxMemoryDb;
}

export async function writeDbAsync(db: DatabaseSchema): Promise<void> {
  const cfEnv = await getCfEnv();
  if (cfEnv?.TRAX_KV) {
    await cfEnv.TRAX_KV.put(KV_DB_KEY, JSON.stringify(db));
    return;
  }

  if (canUseLocalFs()) {
    try {
      ensureLocalDirs();
      const tmpFile = `${DB_FILE}.${crypto.randomBytes(4).toString("hex")}.tmp`;
      fs.writeFileSync(tmpFile, JSON.stringify(db, null, 2), "utf8");
      fs.renameSync(tmpFile, DB_FILE);
      return;
    } catch {
      // Fall through to memory store
    }
  }

  globalForStore.__traxMemoryDb = db;
}

function cloudObjectKey(userId: string, docId: string): string {
  const safeUser = userId.replace(/[^a-zA-Z0-9_-]/g, "");
  const safeDoc = docId.replace(/[^a-zA-Z0-9_-]/g, "");
  return `cloud/${safeUser}/${safeDoc}.pdf`;
}

export async function saveCloudPdfBytesAsync(
  userId: string,
  docId: string,
  bytes: Uint8Array,
): Promise<void> {
  const cfEnv = await getCfEnv();
  const key = cloudObjectKey(userId, docId);
  if (cfEnv?.TRAX_R2) {
    await cfEnv.TRAX_R2.put(key, bytes);
    return;
  }

  if (canUseLocalFs()) {
    try {
      ensureLocalDirs();
      const safeUser = userId.replace(/[^a-zA-Z0-9_-]/g, "");
      const safeDoc = docId.replace(/[^a-zA-Z0-9_-]/g, "");
      const dir = path.join(CLOUD_DIR, safeUser);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, `${safeDoc}.pdf`), bytes);
      return;
    } catch {
      // Fall through to memory
    }
  }

  if (!globalForStore.__traxMemoryCloud) {
    globalForStore.__traxMemoryCloud = new Map();
  }
  globalForStore.__traxMemoryCloud.set(key, bytes);
}

export async function readCloudPdfBytesAsync(
  userId: string,
  docId: string,
): Promise<Uint8Array | null> {
  const cfEnv = await getCfEnv();
  const key = cloudObjectKey(userId, docId);
  if (cfEnv?.TRAX_R2) {
    const obj = await cfEnv.TRAX_R2.get(key);
    if (!obj) return null;
    return new Uint8Array(await obj.arrayBuffer());
  }

  if (canUseLocalFs()) {
    try {
      const safeUser = userId.replace(/[^a-zA-Z0-9_-]/g, "");
      const safeDoc = docId.replace(/[^a-zA-Z0-9_-]/g, "");
      const filePath = path.join(CLOUD_DIR, safeUser, `${safeDoc}.pdf`);
      if (fs.existsSync(filePath)) {
        return new Uint8Array(fs.readFileSync(filePath));
      }
    } catch {
      // Fall through
    }
  }

  return globalForStore.__traxMemoryCloud?.get(key) ?? null;
}

export async function deleteCloudPdfBytesAsync(userId: string, docId: string): Promise<void> {
  const cfEnv = await getCfEnv();
  const key = cloudObjectKey(userId, docId);
  if (cfEnv?.TRAX_R2) {
    await cfEnv.TRAX_R2.delete(key);
    return;
  }

  if (canUseLocalFs()) {
    try {
      const safeUser = userId.replace(/[^a-zA-Z0-9_-]/g, "");
      const safeDoc = docId.replace(/[^a-zA-Z0-9_-]/g, "");
      const filePath = path.join(CLOUD_DIR, safeUser, `${safeDoc}.pdf`);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch {
      // ignore
    }
  }

  globalForStore.__traxMemoryCloud?.delete(key);
}
