// ============================================================
// app/api/templates/route.ts — Katalog Template & Starter Codebase API
// Sesuai PRD § 3.1 dan ARCHITECTURE.md § 4
// ============================================================

import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Template from "@/models/Template";
import { requireAuth, isSession } from "@/lib/auth";
import { isUserAdmin } from "@/lib/admin";
import { z } from "zod";

const templateInputSchema = z.object({
  name: z.string().trim().min(2, "Nama template minimal 2 karakter").max(150),
  description: z.string().trim().min(5, "Deskripsi minimal 5 karakter").max(1000),
  stackTags: z.array(z.string().trim()).default([]),
  thumbnailUrl: z.string().trim().optional().default(""),
  repoUrl: z.string().trim().url("URL Repository GitHub tidak valid"),
  useTemplateUrl: z.string().trim().url("URL Gunakan Template tidak valid"),
  featured: z.boolean().optional().default(false),
  order: z.number().optional().default(0),
});

/**
 * GET: Ambil daftar seluruh template dengan pencarian & filter tag stack
 * Terbuka untuk umum (publik).
 */
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim();
    const tag = searchParams.get("tag")?.trim();

    const query: Record<string, unknown> = {};

    if (tag) {
      query.stackTags = { $regex: new RegExp(`^${tag}$`, "i") };
    }

    if (search) {
      const searchRegex = { $regex: search, $options: "i" };
      query.$or = [
        { name: searchRegex },
        { description: searchRegex },
        { stackTags: searchRegex },
      ];
    }

    const templates = await Template.find(query)
      .sort({ featured: -1, order: 1, createdAt: -1 })
      .lean();

    // Dapatkan juga daftar semua tags unik untuk pill filter di UI
    const allTags = await Template.distinct("stackTags");

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          templates,
          availableTags: allTags.filter(Boolean),
          totalCount: templates.length,
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Templates GET error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Gagal memuat katalog template" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * POST: Tambah template baru ke database (Khusus Admin/Farish)
 */
export async function POST(req: NextRequest) {
  // 1. Verifikasi sesi login
  const authResult = await requireAuth();
  if (!isSession(authResult)) return authResult;

  // 2. Verifikasi hak akses admin
  if (!isUserAdmin(authResult.user)) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Akses ditolak: Hanya akun administrator yang dapat menambahkan template.",
      }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: "Payload JSON tidak valid" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const parsed = templateInputSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({
        success: false,
        error: parsed.error.issues[0]?.message || "Input tidak valid",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    await connectDB();

    const created = await Template.create({
      ...parsed.data,
      createdBy: authResult.user.id,
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: created,
        message: "Template baru berhasil ditambahkan ke katalog.",
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Template POST error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Gagal menyimpan template baru" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
