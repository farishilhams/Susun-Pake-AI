// ============================================================
// app/api/projects/route.ts — CRUD projects milik user
// GET: daftar project | POST: buat project baru
// Semua endpoint diproteksi auth — user hanya lihat project miliknya
// ============================================================

import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Project from "@/models/Project";
import { requireAuth, isSession } from "@/lib/auth";
import { success, fail } from "@/lib/api-response";
import { z } from "zod";

// Validasi body POST dengan Zod v4
const createProjectSchema = z.object({
  name: z.string().min(1, "Nama project wajib diisi").max(200),
  projectType: z.string().min(1, "Tipe project wajib diisi"),
  mainFeatures: z.string().default(""),
  techStackPreference: z.string().default(""),
});

// GET /api/projects — daftar project milik user yang sedang login
export async function GET(req: NextRequest) {
  const authResult = await requireAuth();
  if (!isSession(authResult)) return authResult;

  const { id: userId } = authResult.user;

  try {
    await connectDB();

    const projects = await Project.find({ userId })
      .sort({ isPinned: -1, updatedAt: -1 })
      .select("name projectType status isPinned createdAt updatedAt")
      .lean();

    return success(projects, "Daftar project berhasil diambil");
  } catch (err) {
    console.error("GET /api/projects error:", err);
    return fail("Gagal mengambil daftar project", err, 500);
  }
}

// POST /api/projects — buat project baru
export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (!isSession(authResult)) return authResult;

  const { id: userId } = authResult.user;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Request body tidak valid (bukan JSON)");
  }

  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Input tidak valid", parsed.error.issues);
  }

  const { name, projectType, mainFeatures, techStackPreference } = parsed.data;

  try {
    await connectDB();

    const project = await Project.create({
      userId,
      name,
      projectType,
      mainFeatures,
      techStackPreference,
      status: "draft",
    });

    return success(
      {
        id: project._id.toString(),
        name: project.name,
        projectType: project.projectType,
        status: project.status,
        createdAt: project.createdAt,
      },
      "Project berhasil dibuat",
      201
    );
  } catch (err) {
    console.error("POST /api/projects error:", err);
    return fail("Gagal membuat project", err, 500);
  }
}
