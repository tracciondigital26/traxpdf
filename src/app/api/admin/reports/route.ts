import { NextResponse } from "next/server";
import { readDbAsync, writeDbAsync } from "@/lib/server/store";
import type { FeedbackReport } from "@/lib/types";

const ADMIN_PASSWORD = "pipina001";

function checkAdminAuth(req: Request): boolean {
  const authHeader = req.headers.get("x-admin-key") || req.headers.get("authorization");
  if (authHeader) {
    const clean = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (clean === ADMIN_PASSWORD) return true;
  }
  const url = new URL(req.url);
  if (url.searchParams.get("key") === ADMIN_PASSWORD) {
    return true;
  }
  return false;
}

export async function GET(req: Request) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: "Acceso denegado. Contraseña incorrecta." }, { status: 401 });
  }

  const db = await readDbAsync();
  return NextResponse.json({
    ok: true,
    reports: db.reports || [],
  });
}

export async function PATCH(req: Request) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: "Acceso denegado." }, { status: 401 });
  }

  try {
    const body = (await req.json()) as { id?: string; status?: FeedbackReport["status"] };
    if (!body.id || !body.status) {
      return NextResponse.json({ error: "Faltan datos requeridos (id, status)." }, { status: 400 });
    }

    const db = await readDbAsync();
    if (!db.reports) db.reports = [];

    const report = db.reports.find((r) => r.id === body.id);
    if (!report) {
      return NextResponse.json({ error: "Reporte no encontrado." }, { status: 404 });
    }

    report.status = body.status;
    await writeDbAsync(db);

    return NextResponse.json({ ok: true, report });
  } catch {
    return NextResponse.json({ error: "Error al actualizar reporte." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: "Acceso denegado." }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID requerido." }, { status: 400 });
    }

    const db = await readDbAsync();
    if (!db.reports) db.reports = [];

    db.reports = db.reports.filter((r) => r.id !== id);
    await writeDbAsync(db);

    return NextResponse.json({ ok: true, deletedId: id });
  } catch {
    return NextResponse.json({ error: "Error al eliminar reporte." }, { status: 500 });
  }
}
