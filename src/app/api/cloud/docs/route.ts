import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getOrCreateSession } from "@/lib/server/auth";
import { readDb, saveCloudPdfBytes, writeDb } from "@/lib/server/store";

export async function GET() {
  const { session } = await getOrCreateSession();
  if (!session.authenticated) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  if (!session.cloudEnabled) {
    return NextResponse.json(
      { error: "Cloud Vault requires Pro+ Cloud subscription" },
      { status: 403 },
    );
  }

  const db = readDb();
  const docs = db.cloudDocs[session.userId] ?? [];
  return NextResponse.json({ docs });
}

export async function POST(req: Request) {
  const { session } = await getOrCreateSession();
  if (!session.authenticated) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  if (!session.cloudEnabled) {
    return NextResponse.json(
      { error: "Cloud Vault requires Pro+ Cloud subscription" },
      { status: 403 },
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const title = String(formData.get("title") || "Untitled PDF").slice(0, 120);
    const pageCount = Number(formData.get("pageCount") || 1);

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing PDF file" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    if (bytes.byteLength > 25 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 25MB)" }, { status: 413 });
    }

    const docId = `doc_${crypto.randomBytes(8).toString("hex")}`;
    saveCloudPdfBytes(session.userId, docId, bytes);

    const now = new Date().toISOString();
    const db = readDb();
    const list = db.cloudDocs[session.userId] ?? [];
    const meta = {
      id: docId,
      title,
      fileName: file.name || `${title}.pdf`,
      sizeBytes: bytes.byteLength,
      pageCount: Number.isFinite(pageCount) && pageCount > 0 ? pageCount : 1,
      createdAt: now,
      updatedAt: now,
    };
    list.unshift(meta);
    db.cloudDocs[session.userId] = list;
    writeDb(db);

    return NextResponse.json({ ok: true, doc: meta });
  } catch {
    return NextResponse.json({ error: "Failed to save PDF to cloud" }, { status: 500 });
  }
}
