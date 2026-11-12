import crypto from "node:crypto";
import { cookies } from "next/headers";
import { DAILY_LIMITS } from "../pricing";
import type { SessionInfo } from "../types";
import { readDbAsync, todayKey, writeDbAsync } from "./store";

const SESSION_COOKIE = "trax_session";
const GUEST_COOKIE = "trax_guest";

function getSecret(): string {
  return process.env.TRAX_AUTH_SECRET || "traxpdf-local-dev-secret-change-in-prod";
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, originalHash] = stored.split(":");
  if (!salt || !originalHash) return false;
  const computed = crypto.scryptSync(password, salt, 64);
  const original = Buffer.from(originalHash, "hex");
  if (computed.length !== original.length) return false;
  return crypto.timingSafeEqual(computed, original);
}

export function signValue(payload: string): string {
  const sig = crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifySignedValue(token: string | undefined): string | null {
  if (!token) return null;
  const idx = token.lastIndexOf(".");
  if (idx <= 0) return null;
  const payload = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  const expected = crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
  const sigBuf = Buffer.from(sig, "utf8");
  const expBuf = Buffer.from(expected, "utf8");
  if (sigBuf.length !== expBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;
  return payload;
}

export async function getOrCreateSession(): Promise<{
  session: SessionInfo;
  setGuestCookie?: string;
}> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;
  const userId = verifySignedValue(sessionToken);
  const db = await readDbAsync();
  const day = todayKey();
  const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY);

  if (userId && db.users[userId]) {
    const user = db.users[userId];
    const usedToday = user.dailyUsage[day] ?? 0;
    const dailyLimit = DAILY_LIMITS[user.plan];
    const remainingToday = dailyLimit === null ? null : Math.max(0, dailyLimit - usedToday);
    const docs = db.cloudDocs[user.id] ?? [];

    return {
      session: {
        authenticated: true,
        userId: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        billingCycle: user.billingCycle,
        dailyLimit,
        usedToday,
        remainingToday,
        credits: user.credits,
        cloudEnabled: user.plan === "pro_cloud",
        cloudDocCount: docs.length,
        stripeConfigured,
      },
    };
  }

  let guestId = verifySignedValue(cookieStore.get(GUEST_COOKIE)?.value);
  let setGuestCookie: string | undefined;

  if (!guestId) {
    guestId = `guest_${crypto.randomBytes(12).toString("hex")}`;
    setGuestCookie = signValue(guestId);
  }

  if (!db.guests[guestId]) {
    db.guests[guestId] = {
      id: guestId,
      dailyUsage: {},
      updatedAt: new Date().toISOString(),
    };
    await writeDbAsync(db);
  }

  const guest = db.guests[guestId];
  const usedToday = guest.dailyUsage[day] ?? 0;
  const dailyLimit = DAILY_LIMITS.guest!;
  const remainingToday = Math.max(0, dailyLimit - usedToday);

  return {
    session: {
      authenticated: false,
      userId: guestId,
      email: null,
      name: null,
      plan: "guest",
      billingCycle: null,
      dailyLimit,
      usedToday,
      remainingToday,
      credits: 0,
      cloudEnabled: false,
      cloudDocCount: 0,
      stripeConfigured,
    },
    setGuestCookie,
  };
}

export const AUTH_COOKIES = {
  SESSION_COOKIE,
  GUEST_COOKIE,
};
