// ============================================================
// app/api/projects/[id]/github/push/route.ts
// Push 8 file dokumentasi .md ke GitHub repository
// SECURITY: Menggunakan token terenkripsi, commit atomik via Git Trees API
// ============================================================

import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Project from "@/models/Project";
import ProjectFile from "@/models/File";
import User from "@/models/User";
import { requireAuth, isSession } from "@/lib/auth";
import { success, fail, notFound } from "@/lib/api-response";
import { decrypt } from "@/lib/encryption";
import { z } from "zod";

const pushSchema = z.object({
  repoFullName: z.string().min(1, "Repository wajib dipilih (contoh: username/repo)"),
  branch: z.string().default("main"),
  folderPath: z.string().default(""), // kosong = root, atau misal "docs/vibe-coding"
  commitMessage: z.string().default("docs: add project specification and architecture foundation via Susun Pake AI"),
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

  const parsed = pushSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Parameter push tidak valid", parsed.error.issues);
  }

  const { repoFullName, branch, folderPath, commitMessage } = parsed.data;

  try {
    await connectDB();

    // 1. Validasi kepemilikan project
    const project = await Project.findOne({ _id: projectId, userId }).lean();
    if (!project) return notFound("Project tidak ditemukan");

    // 2. Ambil token GitHub user & dekripsi
    const user = await User.findById(userId).select("githubAccessToken").lean();
    if (!user?.githubAccessToken) {
      return fail("Akun GitHub belum terhubung. Silakan hubungkan terlebih dahulu.", null, 400);
    }

    const token = decrypt(user.githubAccessToken);

    // 3. Ambil seluruh file dokumentasi project dari database
    const files = await ProjectFile.find({ projectId }).lean();
    if (files.length === 0) {
      return fail("Belum ada file dokumentasi yang siap di-push. Lakukan generate terlebih dahulu.", null, 400);
    }

    // Helper untuk request ke GitHub REST API
    const ghFetch = async (endpoint: string, options: RequestInit = {}) => {
      const url = `https://api.github.com${endpoint}`;
      const res = await fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
          "User-Agent": "SusunPakeAI-App",
          ...(options.headers || {}),
        },
      });

      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, data };
    };

    // Bersihkan folder path
    const cleanFolder = folderPath
      ? folderPath.replace(/^\/+|\/+$/g, "") + "/"
      : "";

    // Siapkan tree item untuk 8 file
    const treeItems = files.map((file) => ({
      path: `${cleanFolder}${file.fileType}.md`,
      mode: "100644",
      type: "blob",
      content: file.content || `# ${file.fileType}.md\n\n(Kosong)\n`,
    }));

    // 4. Periksa apakah branch target sudah ada di repository
    const refRes = await ghFetch(`/repos/${repoFullName}/git/ref/heads/${branch}`);

    let newCommitSha = "";

    if (refRes.ok && refRes.data.object?.sha) {
      // Branch sudah ada: ambil commit SHA terakhir dan base tree SHA
      const parentCommitSha = refRes.data.object.sha;
      const commitRes = await ghFetch(`/repos/${repoFullName}/git/commits/${parentCommitSha}`);
      const baseTreeSha = commitRes.ok ? commitRes.data.tree?.sha : undefined;

      // Buat tree baru
      const treeRes = await ghFetch(`/repos/${repoFullName}/git/trees`, {
        method: "POST",
        body: JSON.stringify({
          base_tree: baseTreeSha,
          tree: treeItems,
        }),
      });

      if (!treeRes.ok) {
        return fail(treeRes.data.message || "Gagal membuat Git tree di GitHub", treeRes.data, treeRes.status);
      }

      // Buat commit baru
      const newCommitRes = await ghFetch(`/repos/${repoFullName}/git/commits`, {
        method: "POST",
        body: JSON.stringify({
          message: commitMessage,
          tree: treeRes.data.sha,
          parents: [parentCommitSha],
        }),
      });

      if (!newCommitRes.ok) {
        return fail(newCommitRes.data.message || "Gagal membuat commit di GitHub", newCommitRes.data, newCommitRes.status);
      }

      newCommitSha = newCommitRes.data.sha;

      // Update ref branch ke commit baru
      const updateRefRes = await ghFetch(`/repos/${repoFullName}/git/refs/heads/${branch}`, {
        method: "PATCH",
        body: JSON.stringify({
          sha: newCommitSha,
          force: false,
        }),
      });

      if (!updateRefRes.ok) {
        return fail(updateRefRes.data.message || "Gagal memperbarui referensi branch", updateRefRes.data, updateRefRes.status);
      }
    } else {
      // Branch belum ada (atau repositori baru/kosong)
      // Buat tree tanpa base_tree
      const treeRes = await ghFetch(`/repos/${repoFullName}/git/trees`, {
        method: "POST",
        body: JSON.stringify({
          tree: treeItems,
        }),
      });

      if (!treeRes.ok) {
        return fail(treeRes.data.message || "Gagal membuat Git tree di repositori baru", treeRes.data, treeRes.status);
      }

      // Buat commit root pertama
      const newCommitRes = await ghFetch(`/repos/${repoFullName}/git/commits`, {
        method: "POST",
        body: JSON.stringify({
          message: commitMessage,
          tree: treeRes.data.sha,
        }),
      });

      if (!newCommitRes.ok) {
        return fail(newCommitRes.data.message || "Gagal membuat commit di repositori baru", newCommitRes.data, newCommitRes.status);
      }

      newCommitSha = newCommitRes.data.sha;

      // Buat ref branch baru
      const createRefRes = await ghFetch(`/repos/${repoFullName}/git/refs`, {
        method: "POST",
        body: JSON.stringify({
          ref: `refs/heads/${branch}`,
          sha: newCommitSha,
        }),
      });

      if (!createRefRes.ok) {
        return fail(createRefRes.data.message || "Gagal membuat branch baru", createRefRes.data, createRefRes.status);
      }
    }

    const commitUrl = `https://github.com/${repoFullName}/commit/${newCommitSha}`;
    const repoUrl = `https://github.com/${repoFullName}`;

    return success(
      {
        commitUrl,
        repoUrl,
        commitSha: newCommitSha,
        branch,
        filesPushed: files.length,
      },
      `Berhasil melakukan push ${files.length} file dokumentasi ke ${repoFullName}`
    );
  } catch (err) {
    console.error("POST /api/projects/[id]/github/push error:", err);
    return fail("Terjadi kesalahan saat melakukan push ke GitHub", err, 500);
  }
}
