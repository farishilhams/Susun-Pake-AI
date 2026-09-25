// ============================================================
// app/api/projects/[id]/route.ts — Detail, update & delete project
// GET: detail project + semua file | PATCH: update metadata / pin
// DELETE: hapus project dan dokumen terkait secara permanen
// Proteksi IDOR: user hanya bisa akses project miliknya sendiri
// ============================================================

import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Project from "@/models/Project";
import ProjectFile from "@/models/File";
import FileVersion from "@/models/FileVersion";
import ChatHistory from "@/models/ChatHistory";
import { requireAuth, isSession } from "@/lib/auth";
import { success, fail, notFound } from "@/lib/api-response";
import { z } from "zod";

const updateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  status: z.enum(["draft", "interviewing", "generating", "done"]).optional(),
  brief: z.string().optional(),
  isPinned: z.boolean().optional(),
});

// GET /api/projects/[id] — detail project + 8 file
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!isSession(authResult)) return authResult;

  const { id: userId } = authResult.user;
  const { id: projectId } = await params;

  try {
    await connectDB();

    // Cek kepemilikan project (cegah IDOR)
    const project = await Project.findOne({ _id: projectId, userId }).lean();
    if (!project) return notFound("Project tidak ditemukan");

    // Ambil semua file yang sudah di-generate untuk project ini
    const files = await ProjectFile.find({ projectId }).lean();

    return success({
      project,
      files: files.map((f) => ({
        id: f._id.toString(),
        fileType: f.fileType,
        content: f.content,
        version: f.version,
        updatedAt: f.updatedAt,
      })),
    });
  } catch (err) {
    console.error(`GET /api/projects/${projectId} error:`, err);
    return fail("Gagal mengambil detail project", err, 500);
  }
}

// PATCH /api/projects/[id] — update metadata project
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!isSession(authResult)) return authResult;

  const { id: userId } = authResult.user;
  const { id: projectId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Request body tidak valid");
  }

  const parsed = updateProjectSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Input tidak valid", parsed.error.issues);
  }

  try {
    await connectDB();

    // Update dengan filter userId untuk cegah IDOR
    const updated = await Project.findOneAndUpdate(
      { _id: projectId, userId },
      { $set: parsed.data },
      { returnDocument: "after" }
    ).lean();

    if (!updated) return notFound("Project tidak ditemukan");

    return success(updated, "Project berhasil diupdate");
  } catch (err) {
    console.error(`PATCH /api/projects/${projectId} error:`, err);
    return fail("Gagal mengupdate project", err, 500);
  }
}

// DELETE /api/projects/[id] — hapus project & dokumen terkait secara permanen
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!isSession(authResult)) return authResult;

  const { id: userId } = authResult.user;
  const { id: projectId } = await params;

  try {
    await connectDB();

    // Hapus project utama dengan filter userId (cegah IDOR)
    const project = await Project.findOneAndDelete({ _id: projectId, userId });
    if (!project) return notFound("Project tidak ditemukan atau sudah dihapus");

    // Hapus file terkait, snapshot versi, dan riwayat chat secara tuntas
    await Promise.all([
      ProjectFile.deleteMany({ projectId }),
      FileVersion.deleteMany({ projectId }),
      ChatHistory.deleteMany({ projectId }),
    ]);

    return success(
      { id: projectId },
      "Project beserta seluruh file dan riwayat berhasil dihapus secara permanen"
    );
  } catch (err) {
    console.error(`DELETE /api/projects/${projectId} error:`, err);
    return fail("Gagal menghapus project", err, 500);
  }
}
