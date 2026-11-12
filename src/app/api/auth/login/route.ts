import { NextResponse } from "next/server";
import { AUTH_COOKIES, signValue, verifyPassword } from "@/lib/server/auth";
import { DAILY_LIMITS } from "@/lib/pricing";
import { readDb, todayKey } from "@/lib/server/store";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { email?: string; password?: string };
    const email = (body.email ?? "").trim().toLowerCase();
    const password = body.password ?? "";

    const db = readDb();
    const userId = db.usersByEmail[email];
    const user = userId ? db.users[userId] : undefined;

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const day = todayKey();
    const usedToday = user.dailyUsage[day] ?? 0;
    const dailyLimit = DAILY_LIMITS[user.plan];
    const remainingToday = dailyLimit === null ? null : Math.max(0, dailyLimit - usedToday);

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
        stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY),
      },
    });

    res.cookies.set(AUTH_COOKIES.SESSION_COOKIE, signValue(user.id), {
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
