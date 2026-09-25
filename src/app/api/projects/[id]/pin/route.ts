// ============================================================
// app/api/projects/[id]/pin/route.ts — Toggle / update status pin project
// PATCH / POST: update status pin project milik user
// Proteksi IDOR: user hanya bisa pin project miliknya sendiri
// Sesuai ARCHITECTURE.md § 4 & CLAUDE.md aturan 10
// ============================================================

import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Project from "@/models/Project";
import { requireAuth, isSession } from "@/lib/auth";
import { success, fail, notFound } from "@/lib/api-response";
import { z } from "zod";

const pinProjectSchema = z.object({
  isPinned: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!isSession(authResult)) return authResult;

  const { id: userId } = authResult.user;
  const { id: projectId } = await params;

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    // Body opsional jika hanya ingin toggle
    body = {};
  }

  const parsed = pinProjectSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Input tidak valid", parsed.error.issues);
  }

  try {
    await connectDB();

    // Ambil project terlebih dahulu untuk cek kepemilikan & nilai isPinned saat ini jika toggle
    const current = await Project.findOne({ _id: projectId, userId });
    if (!current) return notFound("Project tidak ditemukan");

    const targetPinned =
      typeof parsed.data.isPinned === "boolean"
        ? parsed.data.isPinned
        : !current.isPinned;

    const updated = await Project.findOneAndUpdate(
      { _id: projectId, userId },
      { $set: { isPinned: targetPinned } },
      { returnDocument: "after" }
    ).lean();

    if (!updated) return notFound("Project tidak ditemukan");

    return success(
      updated,
      targetPinned ? "Project berhasil disematkan" : "Sematan project berhasil dilepas"
    );
  } catch (err) {
    console.error(`PATCH /api/projects/${projectId}/pin error:`, err);
    return fail("Gagal memperbarui status pin project", err, 500);
  }
}

// POST didukung sebagai alias untuk kemudahan integrasi
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return PATCH(req, context);
}
