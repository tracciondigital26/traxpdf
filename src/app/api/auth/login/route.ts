import { NextResponse } from "next/server";
import { AUTH_COOKIES, COOKIE_OPTIONS, createSessionToken, getAuthSecret, verifyPassword } from "@/lib/server/auth";
import { DAILY_LIMITS } from "@/lib/pricing";
import { readDbAsync, todayKey } from "@/lib/server/store";
import { isStripeConfigured } from "@/lib/server/env";

export async function POST(req: Request) {
  try {
    await getAuthSecret();
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
    const token = createSessionToken(user);

    const sessionData = {
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
      token,
    };

    const res = NextResponse.json({
      ok: true,
      token,
      session: sessionData,
    });

    res.cookies.set(AUTH_COOKIES.SESSION_COOKIE, token, COOKIE_OPTIONS);

    return res;
  } catch {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
