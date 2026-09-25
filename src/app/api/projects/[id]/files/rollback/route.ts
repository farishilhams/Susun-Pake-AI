// ============================================================
// app/api/projects/[id]/files/rollback/route.ts
// Melakukan rollback konten file ke versi terdahulu
// SECURITY: Validasi auth & kepemilikan project
// ============================================================

import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Project from "@/models/Project";
import ProjectFile from "@/models/File";
import { requireAuth, isSession } from "@/lib/auth";
import { success, fail, notFound } from "@/lib/api-response";
import { getFileVersionContent, createFileVersionSnapshot } from "@/lib/versioning";
import { FILE_TYPES, FileType } from "@/types";
import { z } from "zod";

const rollbackSchema = z.object({
  fileType: z.enum([...FILE_TYPES] as [FileType, ...FileType[]]),
  targetVersion: z.number().int().min(1),
});

export async function POST(
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

  const parsed = rollbackSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Parameter tidak valid", parsed.error.issues);
  }

  const { fileType, targetVersion } = parsed.data;

  try {
    await connectDB();

    // Validasi kepemilikan project
    const project = await Project.findOne({ _id: projectId, userId });
    if (!project) return notFound("Project tidak ditemukan");

    // Ambil konten versi yang ingin di-rollback
    const targetDoc = await getFileVersionContent(projectId, fileType, targetVersion);
    if (!targetDoc) {
      return notFound(`Versi v${targetVersion} tidak ditemukan`);
    }

    // Update file utama di database
    const updatedFile = await ProjectFile.findOneAndUpdate(
      { projectId, fileType },
      {
        $set: { content: targetDoc.content, updatedAt: new Date() },
        $inc: { version: 1 },
      },
      { upsert: true, returnDocument: "after" }
    );

    // Catat snapshot rollback sebagai versi baru
    if (updatedFile) {
      await createFileVersionSnapshot({
        projectId,
        fileType,
        version: updatedFile.version,
        content: targetDoc.content,
        changeType: "rollback",
        summary: `Rollback ke versi v${targetVersion}`,
      });
    }

    return success(
      {
        fileType,
        version: updatedFile.version,
        content: updatedFile.content,
        updatedAt: updatedFile.updatedAt,
      },
      `Berhasil mengembalikan ${fileType}.md ke versi v${targetVersion}`
    );
  } catch (err) {
    console.error(`POST /api/projects/${projectId}/files/rollback error:`, err);
    return fail("Gagal melakukan rollback versi file", err, 500);
  }
}
