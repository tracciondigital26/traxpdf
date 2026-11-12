import { NextResponse } from "next/server";
import { AUTH_COOKIES, getOrCreateSession } from "@/lib/server/auth";

export async function GET() {
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
}
