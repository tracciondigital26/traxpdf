import { NextResponse } from "next/server";
import { AUTH_COOKIES, COOKIE_OPTIONS, createSessionToken, getOrCreateSession } from "@/lib/server/auth";
import { readDbAsync, writeDbAsync } from "@/lib/server/store";
import { evaluatePromoCode } from "@/lib/promo";
import type { PurchaseRecord } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const { session } = await getOrCreateSession();
    if (!session.authenticated) {
      return NextResponse.json(
        { error: "Debes iniciar sesión o registrarte para canjear un código promocional." },
        { status: 401 },
      );
    }

    const body = (await req.json()) as { code?: string };
    const code = (body.code ?? "").trim();

    const evaluation = evaluatePromoCode(code);
    if (!evaluation.valid || !evaluation.promo) {
      return NextResponse.json(
        { error: evaluation.error || "Código no válido o expirado." },
        { status: 400 },
      );
    }

    const db = await readDbAsync();
    const user = db.users[session.userId];
    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
    }

    // Upgrade user to Pro
    user.plan = "pro";
    user.promoApplied = evaluation.promo.code;
    user.proExpiresAt = evaluation.proExpiresAt ?? null;

    const promoRecord: PurchaseRecord = {
      id: `promo_${evaluation.promo.code}_${Date.now()}`,
      date: new Date().toISOString(),
      description: `Código promocional: ${evaluation.promo.title}`,
      amount: 0,
      currency: "USD",
      kind: "promo",
      status: "active",
    };
    user.purchases = [promoRecord, ...(user.purchases || [])];

    await writeDbAsync(db);

    const { session: updatedSession } = await getOrCreateSession();

    const token = createSessionToken(user);
    const res = NextResponse.json({
      ok: true,
      token,
      message: `¡Código ${evaluation.promo.code} aplicado con éxito! Has activado ${evaluation.promo.title}.`,
      session: {
        ...updatedSession,
        token,
      },
    });

    res.cookies.set(AUTH_COOKIES.SESSION_COOKIE, token, COOKIE_OPTIONS);

    return res;
  } catch {
    return NextResponse.json({ error: "Error al canjear el código promocional." }, { status: 500 });
  }
}
