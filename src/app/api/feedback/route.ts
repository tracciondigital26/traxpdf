import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getOrCreateSession } from "@/lib/server/auth";
import { readDbAsync, writeDbAsync } from "@/lib/server/store";
import type { FeedbackCategory, FeedbackReport } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      category?: FeedbackCategory;
      message?: string;
      email?: string;
      url?: string;
    };

    const message = (body.message ?? "").trim();
    if (!message || message.length < 5) {
      return NextResponse.json(
        { error: "Por favor describe el reporte con al menos 5 caracteres." },
        { status: 400 },
      );
    }

    const { session } = await getOrCreateSession();
    const userAgent = req.headers.get("user-agent") || undefined;
    const db = await readDbAsync();

    const category: FeedbackCategory =
      body.category === "bug" ||
      body.category === "pdf_issue" ||
      body.category === "suggestion"
        ? body.category
        : "other";

    const report: FeedbackReport = {
      id: `rep_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
      createdAt: new Date().toISOString(),
      userId: session.authenticated ? session.userId : null,
      userEmail: session.authenticated ? session.email : (body.email?.trim() || null),
      userName: session.authenticated ? session.name : null,
      category,
      message,
      status: "new",
      userAgent,
      url: body.url || undefined,
    };

    if (!db.reports) {
      db.reports = [];
    }

    db.reports = [report, ...db.reports];
    await writeDbAsync(db);

    return NextResponse.json({ ok: true, id: report.id });
  } catch (err) {
    console.error("Feedback submit error:", err);
    return NextResponse.json({ error: "No se pudo guardar el reporte." }, { status: 500 });
  }
}
