import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { AUTH_COOKIES, getOrCreateSession, hashPassword, signValue } from "@/lib/server/auth";
import { readDbAsync, writeDbAsync } from "@/lib/server/store";
import { evaluatePromoCode } from "@/lib/promo";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      email?: string;
      password?: string;
      name?: string;
      promoCode?: string;
    };

    const email = (body.email ?? "").trim().toLowerCase();
    const password = body.password ?? "";
    const name = (body.name ?? "").trim() || email.split("@")[0] || "User";
    const promoCode = (body.promoCode ?? "").trim();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 },
      );
    }

    let plan: "free" | "pro" = "free";
    let promoApplied: string | null = null;
    let proExpiresAt: string | null = null;

    if (promoCode) {
      const evaluation = evaluatePromoCode(promoCode);
      if (!evaluation.valid || !evaluation.promo) {
        return NextResponse.json({ error: evaluation.error || "Código promocional no válido" }, { status: 400 });
      }
      plan = "pro";
      promoApplied = evaluation.promo.code;
      proExpiresAt = evaluation.proExpiresAt ?? null;
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
      plan,
      billingCycle: null,
      credits: 0,
      dailyUsage: {},
      createdAt: new Date().toISOString(),
      promoApplied,
      proExpiresAt,
    };
    db.usersByEmail[email] = userId;
    await writeDbAsync(db);

    const token = signValue(userId);
    const { session } = await getOrCreateSession();

    const res = NextResponse.json({
      ok: true,
      promoMessage: promoApplied
        ? `¡Código ${promoApplied} aplicado con éxito! Plan Pro Ilimitado activado.`
        : null,
      session: {
        ...session,
        authenticated: true,
        userId,
        email,
        name,
        plan,
        dailyLimit: plan === "pro" ? null : 3,
        usedToday: 0,
        remainingToday: plan === "pro" ? null : 3,
        credits: 0,
        cloudEnabled: false,
        promoApplied,
        proExpiresAt,
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
