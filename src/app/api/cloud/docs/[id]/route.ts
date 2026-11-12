import { NextResponse } from "next/server";
import { getOrCreateSession } from "@/lib/server/auth";
import { deleteCloudPdfBytes, readCloudPdfBytes, readDb, writeDb } from "@/lib/server/store";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { session } = await getOrCreateSession();
  if (!session.authenticated || !session.cloudEnabled) {
    return NextResponse.json({ error: "Pro+ Cloud required" }, { status: 403 });
  }

  const { id } = await context.params;
  const db = readDb();
  const docs = db.cloudDocs[session.userId] ?? [];
  const meta = docs.find((d) => d.id === id);
  if (!meta) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const bytes = readCloudPdfBytes(session.userId, id);
  if (!bytes) {
    return NextResponse.json({ error: "PDF file missing" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${encodeURIComponent(meta.fileName)}"`,
    },
  });
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { session } = await getOrCreateSession();
  if (!session.authenticated || !session.cloudEnabled) {
    return NextResponse.json({ error: "Pro+ Cloud required" }, { status: 403 });
  }

  const { id } = await context.params;
  const db = readDb();
  const docs = db.cloudDocs[session.userId] ?? [];
  db.cloudDocs[session.userId] = docs.filter((d) => d.id !== id);
  writeDb(db);
  deleteCloudPdfBytes(session.userId, id);

  return NextResponse.json({ ok: true });
}
