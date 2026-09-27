// ============================================================
// app/api/templates/[id]/route.ts — Detail, Edit & Hapus Template (Admin)
// ============================================================

import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Template from "@/models/Template";
import { requireAuth, isSession } from "@/lib/auth";
import { isUserAdmin } from "@/lib/admin";
import { z } from "zod";

const templateUpdateSchema = z.object({
  name: z.string().trim().min(2).max(150).optional(),
  description: z.string().trim().min(5).max(1000).optional(),
  stackTags: z.array(z.string().trim()).optional(),
  thumbnailUrl: z.string().trim().optional(),
  repoUrl: z.string().trim().url().optional(),
  useTemplateUrl: z.string().trim().url().optional(),
  featured: z.boolean().optional(),
  order: z.number().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET: Ambil detail template tunggal
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await connectDB();

    const template = await Template.findById(id).lean();
    if (!template) {
      return new Response(
        JSON.stringify({ success: false, error: "Template tidak ditemukan" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data: template }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Template GET detail error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Gagal memuat detail template" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * PUT/PATCH: Perbarui data template (Khusus Admin)
 */
export async function PUT(req: NextRequest, { params }: RouteParams) {
  const authResult = await requireAuth();
  if (!isSession(authResult)) return authResult;

  if (!isUserAdmin(authResult.user)) {
    return new Response(
      JSON.stringify({ success: false, error: "Akses ditolak: Hanya administrator." }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: "Payload JSON tidak valid" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const parsed = templateUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ success: false, error: parsed.error.issues[0]?.message || "Input tidak valid" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    await connectDB();

    const updated = await Template.findByIdAndUpdate(
      id,
      { $set: parsed.data },
      { returnDocument: "after", runValidators: true }
    );

    if (!updated) {
      return new Response(
        JSON.stringify({ success: false, error: "Template tidak ditemukan" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: updated,
        message: "Template berhasil diperbarui.",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Template PUT error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Gagal memperbarui template" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * DELETE: Hapus template dari katalog (Khusus Admin)
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const authResult = await requireAuth();
  if (!isSession(authResult)) return authResult;

  if (!isUserAdmin(authResult.user)) {
    return new Response(
      JSON.stringify({ success: false, error: "Akses ditolak: Hanya administrator." }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  const { id } = await params;

  try {
    await connectDB();
    const deleted = await Template.findByIdAndDelete(id);

    if (!deleted) {
      return new Response(
        JSON.stringify({ success: false, error: "Template tidak ditemukan" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Template berhasil dihapus dari katalog." }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Template DELETE error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Gagal menghapus template" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
