import { NextResponse } from "next/server";
import { AUTH_COOKIES } from "@/lib/server/auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(AUTH_COOKIES.SESSION_COOKIE);
  return res;
}
