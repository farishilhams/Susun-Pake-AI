// ============================================================
// lib/versioning.ts — Layanan Manajemen Versi File
// Snapshot revisi, perbandingan versi, dan proteksi duplikasi
// ============================================================

import mongoose from "mongoose";
import FileVersion, { VersionChangeType } from "@/models/FileVersion";
import { FileType } from "@/types";

export interface CreateSnapshotParams {
  projectId: string | mongoose.Types.ObjectId;
  fileType: FileType;
  version: number;
  content: string;
  changeType: VersionChangeType;
  summary?: string;
}

/**
 * Mencatat snapshot versi baru ke koleksi file_versions.
 * Mencegah snapshot berulang jika konten identik dengan versi terakhir.
 */
export async function createFileVersionSnapshot({
  projectId,
  fileType,
  version,
  content,
  changeType,
  summary = "",
}: CreateSnapshotParams) {
  try {
    const projId =
      typeof projectId === "string"
        ? new mongoose.Types.ObjectId(projectId)
        : projectId;

    // Cek versi terbaru yang sudah ada
    const latestVersion = await FileVersion.findOne({
      projectId: projId,
      fileType,
    })
      .sort({ version: -1 })
      .lean();

    // Jika konten sama persis dengan snapshot terakhir, tidak perlu snapshot baru
    if (latestVersion && latestVersion.content === content && changeType === "manual") {
      return latestVersion;
    }

    // Tentukan nomor versi jika tidak diberikan atau bentrok
    let resolvedVersion = version;
    if (latestVersion && resolvedVersion <= latestVersion.version) {
      resolvedVersion = latestVersion.version + 1;
    }

    const newSnapshot = await FileVersion.create({
      projectId: projId,
      fileType,
      version: resolvedVersion,
      content,
      changeType,
      summary:
        summary ||
        (changeType === "initial"
          ? "Generate awal"
          : changeType === "refinement"
          ? "Refinement AI"
          : changeType === "rollback"
          ? `Rollback ke versi sebelumnya`
          : "Pembaruan manual"),
    });

    return newSnapshot;
  } catch (error) {
    console.error(`Gagal membuat snapshot versi untuk ${fileType}:`, error);
    return null;
  }
}

/**
 * Mengambil daftar ringkasan versi untuk suatu file (tanpa full content untuk hemat bandwidth).
 */
export async function getFileVersionsList(
  projectId: string | mongoose.Types.ObjectId,
  fileType: FileType
) {
  const projId =
    typeof projectId === "string"
      ? new mongoose.Types.ObjectId(projectId)
      : projectId;

  return FileVersion.find({
    projectId: projId,
    fileType,
  })
    .sort({ version: -1 })
    .select("version changeType summary createdAt")
    .lean();
}

/**
 * Mengambil satu versi spesifik lengkap dengan kontennya.
 */
export async function getFileVersionContent(
  projectId: string | mongoose.Types.ObjectId,
  fileType: FileType,
  version: number
) {
  const projId =
    typeof projectId === "string"
      ? new mongoose.Types.ObjectId(projectId)
      : projectId;

  return FileVersion.findOne({
    projectId: projId,
    fileType,
    version,
  }).lean();
}
