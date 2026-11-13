import { NextResponse } from "next/server";
import { AUTH_COOKIES, COOKIE_OPTIONS } from "@/lib/server/auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIES.SESSION_COOKIE, "", {
    ...COOKIE_OPTIONS,
    maxAge: 0,
  });
  return res;
}
