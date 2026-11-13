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
  promoApplied?: string | null;
  proExpiresAt?: string | null;
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

function getLocalPaths() {
  const cwd = typeof process !== "undefined" && typeof process.cwd === "function" ? process.cwd() : "";
  const dataDir = cwd ? path.join(cwd, ".data") : ".data";
  return {
    dataDir,
    dbFile: path.join(dataDir, "traxpdf-db.json"),
    cloudDir: path.join(dataDir, "cloud"),
  };
}

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
    // getCloudflareContext throws if called outside of Cloudflare or during initial warmup
    const ctx = await getCloudflareContext({ async: true });
    return (ctx?.env as unknown as TraxCloudflareEnv) ?? null;
  } catch {
    return null;
  }
}

function canUseLocalFs(): boolean {
  try {
    const g = globalThis as unknown as Record<string, unknown>;
    if (Boolean(g.WebSocketPair) || Boolean(g.EdgeRuntime) || (typeof navigator !== "undefined" && navigator.userAgent?.includes("Cloudflare"))) {
      return false;
    }
    return typeof process !== "undefined" && Boolean(process.versions?.node) && typeof fs?.existsSync === "function" && typeof process?.cwd === "function";
  } catch {
    return false;
  }
}

function ensureLocalDirs() {
  const { dataDir, cloudDir } = getLocalPaths();
  if (!fs.existsSync(/*turbopackIgnore: true*/ dataDir)) {
    fs.mkdirSync(/*turbopackIgnore: true*/ dataDir, { recursive: true });
  }
  if (!fs.existsSync(/*turbopackIgnore: true*/ cloudDir)) {
    fs.mkdirSync(/*turbopackIgnore: true*/ cloudDir, { recursive: true });
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
      const dbFile = getLocalPaths().dbFile;
      if (!fs.existsSync(/*turbopackIgnore: true*/ dbFile)) {
        const initial = emptyDb();
        fs.writeFileSync(/*turbopackIgnore: true*/ dbFile, JSON.stringify(initial, null, 2), "utf8");
        return initial;
      }
      const raw = fs.readFileSync(/*turbopackIgnore: true*/ dbFile, "utf8");
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
      const dbFile = getLocalPaths().dbFile;
      const tmpFile = `${dbFile}.${crypto.randomBytes(4).toString("hex")}.tmp`;
      fs.writeFileSync(/*turbopackIgnore: true*/ tmpFile, JSON.stringify(db, null, 2), "utf8");
      fs.renameSync(tmpFile, dbFile);
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
      const dir = path.join(getLocalPaths().cloudDir, safeUser);
      if (!fs.existsSync(/*turbopackIgnore: true*/ dir)) fs.mkdirSync(/*turbopackIgnore: true*/ dir, { recursive: true });
      fs.writeFileSync(/*turbopackIgnore: true*/ path.join(dir, `${safeDoc}.pdf`), bytes);
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
      const filePath = path.join(getLocalPaths().cloudDir, safeUser, `${safeDoc}.pdf`);
      if (fs.existsSync(/*turbopackIgnore: true*/ filePath)) {
        return new Uint8Array(fs.readFileSync(/*turbopackIgnore: true*/ filePath));
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
      const filePath = path.join(getLocalPaths().cloudDir, safeUser, `${safeDoc}.pdf`);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch {
      // ignore
    }
  }

  globalForStore.__traxMemoryCloud?.delete(key);
}
