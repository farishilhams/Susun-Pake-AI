// ============================================================
// app/api/projects/[id]/files/versions/route.ts
// Mengambil daftar riwayat versi atau konten versi tertentu
// SECURITY: Validasi userId dan kepemilikan project (anti-IDOR)
// ============================================================

import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Project from "@/models/Project";
import { requireAuth, isSession } from "@/lib/auth";
import { success, fail, notFound } from "@/lib/api-response";
import { getFileVersionsList, getFileVersionContent } from "@/lib/versioning";
import { FILE_TYPES, FileType } from "@/types";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!isSession(authResult)) return authResult;

  const { id: userId } = authResult.user;
  const { id: projectId } = await params;

  const searchParams = req.nextUrl.searchParams;
  const fileType = searchParams.get("fileType") as FileType;
  const versionParam = searchParams.get("version");

  if (!fileType || !FILE_TYPES.includes(fileType)) {
    return fail("Parameter fileType tidak valid atau tidak disertakan");
  }

  try {
    await connectDB();

    // Validasi kepemilikan project
    const project = await Project.findOne({ _id: projectId, userId });
    if (!project) return notFound("Project tidak ditemukan");

    // Jika parameter version disertakan, ambil detail lengkap dengan konten
    if (versionParam) {
      const versionNum = parseInt(versionParam, 10);
      if (isNaN(versionNum)) {
        return fail("Parameter version harus berupa angka");
      }

      const versionDoc = await getFileVersionContent(
        projectId,
        fileType,
        versionNum
      );

      if (!versionDoc) {
        return notFound("Versi file tidak ditemukan");
      }

      return success(versionDoc, "Detail versi berhasil diambil");
    }

    // Ambil daftar ringkasan versi
    const versions = await getFileVersionsList(projectId, fileType);
    return success(versions, "Daftar riwayat versi berhasil diambil");
  } catch (err) {
    console.error(`GET /api/projects/${projectId}/files/versions error:`, err);
    return fail("Gagal mengambil riwayat versi file", err, 500);
  }
}
