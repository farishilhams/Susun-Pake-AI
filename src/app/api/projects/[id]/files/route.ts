// ============================================================
// app/api/projects/[id]/files/route.ts — PATCH update file content
// Autosave setelah user edit di editor (debounce dari client)
// SECURITY: validasi userId agar tidak bisa update file project orang lain
// ============================================================

import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Project from "@/models/Project";
import ProjectFile from "@/models/File";
import { requireAuth, isSession } from "@/lib/auth";
import { success, fail, notFound } from "@/lib/api-response";
import { FILE_TYPES, FileType } from "@/types";
import { createFileVersionSnapshot } from "@/lib/versioning";
import { z } from "zod";

const updateFileSchema = z.object({
  fileType: z.enum([...FILE_TYPES] as [FileType, ...FileType[]]),
  content: z.string(),
});

// PATCH /api/projects/[id]/files — update content 1 file
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

  const parsed = updateFileSchema.safeParse(body);
  if (!parsed.success) {
    return fail("fileType atau content tidak valid", parsed.error.issues);
  }

  const { fileType, content } = parsed.data;

  try {
    await connectDB();

    // Validasi kepemilikan project (cegah IDOR)
    const project = await Project.findOne({ _id: projectId, userId });
    if (!project) return notFound("Project tidak ditemukan");

    // Upsert file
    const file = await ProjectFile.findOneAndUpdate(
      { projectId, fileType },
      {
        $set: { content, updatedAt: new Date() },
        $inc: { version: 1 },
      },
      { upsert: true, returnDocument: "after" }
    );

    // Catat snapshot versi
    if (file) {
      await createFileVersionSnapshot({
        projectId,
        fileType,
        version: file.version,
        content,
        changeType: "manual",
        summary: "Pembaruan editor",
      });
    }

    return success({
      fileType,
      version: file.version,
      updatedAt: file.updatedAt,
    }, "File berhasil disimpan");
  } catch (err) {
    console.error(`PATCH /api/projects/${projectId}/files error:`, err);
    return fail("Gagal menyimpan file", err, 500);
  }
}
