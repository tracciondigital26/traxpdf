import { NextResponse } from "next/server";
import { getOrCreateSession } from "@/lib/server/auth";
import { readDbAsync, writeDbAsync } from "@/lib/server/store";
import { evaluatePromoCode } from "@/lib/promo";

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
    await writeDbAsync(db);

    const { session: updatedSession } = await getOrCreateSession();

    return NextResponse.json({
      ok: true,
      message: `¡Código ${evaluation.promo.code} aplicado con éxito! Has activado ${evaluation.promo.title}.`,
      session: updatedSession,
    });
  } catch {
    return NextResponse.json({ error: "Error al canjear el código promocional." }, { status: 500 });
  }
}
