import { NextResponse } from "next/server";
import { AUTH_COOKIES, getOrCreateSession } from "@/lib/server/auth";

export async function GET() {
  try {
    const { session, setGuestCookie } = await getOrCreateSession();
    const res = NextResponse.json(session);
    if (setGuestCookie) {
      res.cookies.set(AUTH_COOKIES.GUEST_COOKIE, setGuestCookie, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    }
    return res;
  } catch (err) {
    console.error("Session route error:", err);
    return NextResponse.json({
      authenticated: false,
      userId: "guest",
      email: null,
      name: null,
      plan: "guest",
      billingCycle: null,
      dailyLimit: 1,
      usedToday: 0,
      remainingToday: 1,
      credits: 0,
      cloudEnabled: false,
      cloudDocCount: 0,
      stripeConfigured: false,
    });
  }
}
