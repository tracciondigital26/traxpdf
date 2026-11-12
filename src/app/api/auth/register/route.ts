import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { AUTH_COOKIES, getOrCreateSession, hashPassword, signValue } from "@/lib/server/auth";
import { readDbAsync, writeDbAsync } from "@/lib/server/store";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      email?: string;
      password?: string;
      name?: string;
    };

    const email = (body.email ?? "").trim().toLowerCase();
    const password = body.password ?? "";
    const name = (body.name ?? "").trim() || email.split("@")[0] || "User";

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 },
      );
    }

    const db = await readDbAsync();
    if (db.usersByEmail[email]) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 },
      );
    }

    const userId = `usr_${crypto.randomBytes(10).toString("hex")}`;
    db.users[userId] = {
      id: userId,
      email,
      name,
      passwordHash: hashPassword(password),
      plan: "free",
      billingCycle: null,
      credits: 0,
      dailyUsage: {},
      createdAt: new Date().toISOString(),
    };
    db.usersByEmail[email] = userId;
    await writeDbAsync(db);

    const token = signValue(userId);
    const { session } = await getOrCreateSession();

    const res = NextResponse.json({
      ok: true,
      session: {
        ...session,
        authenticated: true,
        userId,
        email,
        name,
        plan: "free",
        dailyLimit: 3,
        usedToday: 0,
        remainingToday: 3,
        credits: 0,
        cloudEnabled: false,
      },
    });

    res.cookies.set(AUTH_COOKIES.SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return res;
  } catch {
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
