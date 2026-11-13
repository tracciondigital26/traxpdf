import { NextResponse } from "next/server";
import { DAILY_LIMITS } from "@/lib/pricing";
import { AUTH_COOKIES, COOKIE_OPTIONS, createSessionToken, getOrCreateSession } from "@/lib/server/auth";
import { readDbAsync, todayKey, writeDbAsync } from "@/lib/server/store";

export async function POST() {
  const { session, setGuestCookie } = await getOrCreateSession();
  const db = await readDbAsync();
  const day = todayKey();

  const attachGuestCookie = (res: NextResponse) => {
    if (setGuestCookie) {
      res.cookies.set(AUTH_COOKIES.GUEST_COOKIE, setGuestCookie, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    }
    return res;
  };

  if (session.authenticated) {
    const user = db.users[session.userId];
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const limit = DAILY_LIMITS[user.plan];
    const usedToday = user.dailyUsage[day] ?? 0;

    // Unlimited plan
    if (limit === null) {
      user.dailyUsage[day] = usedToday + 1;
      await writeDbAsync(db);
      return NextResponse.json({
        allowed: true,
        source: "unlimited",
        usedToday: user.dailyUsage[day],
        remainingToday: null,
        credits: user.credits,
      });
    }

    // Within daily free limit (3/day)
    if (usedToday < limit) {
      user.dailyUsage[day] = usedToday + 1;
      await writeDbAsync(db);
      return NextResponse.json({
        allowed: true,
        source: "daily_free",
        usedToday: user.dailyUsage[day],
        remainingToday: Math.max(0, limit - user.dailyUsage[day]),
        credits: user.credits,
      });
    }

    // Pay-as-you-go wallet credit ($0.20 / PDF)
    if (user.credits >= 1) {
      user.credits -= 1;
      user.dailyUsage[day] = usedToday + 1;
      await writeDbAsync(db);
      const token = createSessionToken(user);
      const res = NextResponse.json({
        allowed: true,
        source: "credit",
        usedToday: user.dailyUsage[day],
        remainingToday: 0,
        credits: user.credits,
        token,
      });
      res.cookies.set(AUTH_COOKIES.SESSION_COOKIE, token, COOKIE_OPTIONS);
      return res;
    }

    return NextResponse.json(
      {
        allowed: false,
        reason: "limit_reached",
        plan: user.plan,
        usedToday,
        dailyLimit: limit,
        credits: user.credits,
      },
      { status: 402 },
    );
  }

  // Guest (1/day)
  const guest = db.guests[session.userId];
  const usedToday = guest?.dailyUsage[day] ?? 0;
  const limit = DAILY_LIMITS.guest!;

  if (usedToday < limit) {
    if (guest) {
      guest.dailyUsage[day] = usedToday + 1;
      guest.updatedAt = new Date().toISOString();
      await writeDbAsync(db);
    }
    return attachGuestCookie(
      NextResponse.json({
        allowed: true,
        source: "daily_guest",
        usedToday: usedToday + 1,
        remainingToday: Math.max(0, limit - (usedToday + 1)),
        credits: 0,
      }),
    );
  }

  return attachGuestCookie(
    NextResponse.json(
      {
        allowed: false,
        reason: "limit_reached",
        plan: "guest",
        usedToday,
        dailyLimit: limit,
        credits: 0,
      },
      { status: 402 },
    ),
  );
}
