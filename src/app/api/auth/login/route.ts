import { NextResponse } from "next/server";
import { AUTH_COOKIES, createSessionToken, verifyPassword } from "@/lib/server/auth";
import { DAILY_LIMITS } from "@/lib/pricing";
import { readDbAsync, todayKey } from "@/lib/server/store";
import { isStripeConfigured } from "@/lib/server/env";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { email?: string; password?: string };
    const email = (body.email ?? "").trim().toLowerCase();
    const password = body.password ?? "";

    const db = await readDbAsync();
    const userId = db.usersByEmail[email];
    const user = userId ? db.users[userId] : undefined;

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const day = todayKey();
    const usedToday = user.dailyUsage[day] ?? 0;
    const dailyLimit = DAILY_LIMITS[user.plan];
    const remainingToday = dailyLimit === null ? null : Math.max(0, dailyLimit - usedToday);
    const stripeConfigured = await isStripeConfigured();

    const res = NextResponse.json({
      ok: true,
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
        cloudDocCount: (db.cloudDocs[user.id] ?? []).length,
        stripeConfigured,
        hasStripeSubscription: Boolean(user.stripeSubscriptionId),
        promoApplied: user.promoApplied ?? null,
        proExpiresAt: user.proExpiresAt ?? null,
        purchases: user.purchases || [],
      },
    });

    res.cookies.set(AUTH_COOKIES.SESSION_COOKIE, createSessionToken(user), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return res;
  } catch {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
