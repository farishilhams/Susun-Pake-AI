// ============================================================
// app/api/github/repos/route.ts
// Mengambil daftar repository user & membuat repository baru di GitHub
// ============================================================

import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { requireAuth, isSession } from "@/lib/auth";
import { success, fail } from "@/lib/api-response";
import { decrypt } from "@/lib/encryption";
import { z } from "zod";

const createRepoSchema = z.object({
  name: z
    .string()
    .min(1, "Nama repository wajib diisi")
    .regex(/^[a-zA-Z0-9._-]+$/, "Nama repository hanya boleh huruf, angka, titik, strip, dan underscore"),
  description: z.string().optional(),
  isPrivate: z.boolean().default(false),
});

export async function GET() {
  const authResult = await requireAuth();
  if (!isSession(authResult)) return authResult;

  const { id: userId } = authResult.user;

  try {
    await connectDB();
    const user = await User.findById(userId).select("githubAccessToken").lean();

    if (!user?.githubAccessToken) {
      return fail("Akun GitHub belum terhubung. Silakan hubungkan terlebih dahulu.", null, 400);
    }

    const token = decrypt(user.githubAccessToken);

    const ghRes = await fetch(
      "https://api.github.com/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "SusunPakeAI-App",
        },
      }
    );

    if (!ghRes.ok) {
      const errData = await ghRes.json().catch(() => ({}));
      return fail(
        errData.message || "Gagal mengambil daftar repository dari GitHub",
        errData,
        ghRes.status
      );
    }

    const reposData = await ghRes.json();

    const repos = reposData.map((r: any) => ({
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      isPrivate: r.private,
      defaultBranch: r.default_branch || "main",
      htmlUrl: r.html_url,
      description: r.description,
      updatedAt: r.updated_at,
    }));

    return success(repos, "Daftar repository berhasil diambil");
  } catch (err) {
    console.error("GET /api/github/repos error:", err);
    return fail("Terjadi kesalahan saat memproses data repositori GitHub", err, 500);
  }
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (!isSession(authResult)) return authResult;

  const { id: userId } = authResult.user;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Request body tidak valid");
  }

  const parsed = createRepoSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Data repository tidak valid", parsed.error.issues);
  }

  const { name, description, isPrivate } = parsed.data;

  try {
    await connectDB();
    const user = await User.findById(userId).select("githubAccessToken").lean();

    if (!user?.githubAccessToken) {
      return fail("Akun GitHub belum terhubung", null, 400);
    }

    const token = decrypt(user.githubAccessToken);

    const ghRes = await fetch("https://api.github.com/user/repos", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
        "User-Agent": "SusunPakeAI-App",
      },
      body: JSON.stringify({
        name,
        description: description || "Repository documentation created via Susun Pake AI",
        private: isPrivate,
        auto_init: true, // Inisialisasi dengan README agar branch main langsung ada
      }),
    });

    const data = await ghRes.json();

    if (!ghRes.ok) {
      return fail(data.message || "Gagal membuat repository di GitHub", data, ghRes.status);
    }

    return success(
      {
        id: data.id,
        name: data.name,
        fullName: data.full_name,
        isPrivate: data.private,
        defaultBranch: data.default_branch || "main",
        htmlUrl: data.html_url,
      },
      "Repository baru berhasil dibuat di GitHub"
    );
  } catch (err) {
    console.error("POST /api/github/repos error:", err);
    return fail("Terjadi kesalahan saat membuat repository baru", err, 500);
  }
}
