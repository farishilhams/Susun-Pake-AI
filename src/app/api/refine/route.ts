// ============================================================
// app/api/refine/route.ts — Refinement Conversational API
//
// User chat lanjutan untuk update file spesifik secara live
// AI stream jawaban DAN update konten file di database
// Sesuai ARCHITECTURE.md § 7.2 dan § 7.4 (auth SEBELUM stream)
//
// Security:
// - Auth tervalidasi SEBELUM stream dibuka
// - Rate limit dipanggil SEBELUM memanggil AI
// - Validasi kepemilikan project (IDOR protection)
// ============================================================

import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Project from "@/models/Project";
import ProjectFile from "@/models/File";
import ChatHistory from "@/models/ChatHistory";
import { requireAuth, isSession } from "@/lib/auth";
import { checkDailyQuota } from "@/lib/rate-limiter";
import { generateWithFallback } from "@/modules/ai-provider/router";
import { createFileVersionSnapshot } from "@/lib/versioning";
import { z } from "zod";
import { FILE_TYPES, FileType } from "@/types";

const refineSchema = z.object({
  projectId: z.string().min(1),
  message: z.string().min(1).max(2000),
  targetFileType: z.enum([...FILE_TYPES] as [FileType, ...FileType[]]).optional(),
});

export async function POST(req: NextRequest) {
  // ── 1. Auth — SEBELUM stream dibuka ──
  const authResult = await requireAuth();
  if (!isSession(authResult)) return authResult;

  const { id: userId } = authResult.user;

  // ── 2. Parse & validate request ──
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Request body tidak valid" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const parsed = refineSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "Parameter tidak valid", details: parsed.error.issues }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { projectId, message, targetFileType } = parsed.data;

  // ── 3. Rate limit — SEBELUM memanggil AI ──
  await connectDB();
  const allowed = await checkDailyQuota(userId, 15); // refine limit lebih longgar dari generate
  if (!allowed) {
    return new Response(
      JSON.stringify({ error: "Batas refinement harian tercapai (15/hari). Coba besok." }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  // ── 4. Validasi kepemilikan project ──
  const project = await Project.findOne({ _id: projectId, userId }).lean();
  if (!project) {
    return new Response(
      JSON.stringify({ error: "Project tidak ditemukan" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  // ── 5. Ambil konten file yang relevan ──
  let currentFileContent = "";
  let resolvedFileType: FileType | null = null;

  if (targetFileType) {
    const fileDoc = await ProjectFile.findOne({ projectId, fileType: targetFileType }).lean();
    currentFileContent = fileDoc?.content ?? "";
    resolvedFileType = targetFileType;
  }

  // ── 6. Ambil riwayat chat untuk konteks ──
  const chatHistory = await ChatHistory.find({ projectId })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  const historyContext = chatHistory
    .reverse()
    .map((h) => `${h.role === "user" ? "User" : "AI"}: ${h.message}`)
    .join("\n");

  // ── 7. Susun prompt refinement ──
  const systemPrompt = `Kamu adalah AI assistant yang membantu developer memperbaiki/memperbarui dokumentasi project.
  
Project: "${project.name}"
${resolvedFileType ? `File yang sedang direfine: ${resolvedFileType}.md` : ""}

${currentFileContent ? `Konten ${resolvedFileType}.md saat ini:\n\`\`\`markdown\n${currentFileContent}\n\`\`\`\n\n` : ""}
${historyContext ? `Riwayat diskusi:\n${historyContext}\n\n` : ""}

Pesan user: "${message}"

Instruksi:
1. Jawab pesan user secara natural dan singkat.
2. Jika user meminta perubahan pada file ${resolvedFileType ?? "yang relevan"}, sertakan SELURUH konten file yang sudah diupdate dalam tag khusus:
<UPDATED_FILE fileType="${resolvedFileType ?? "FILEYPE"}">
[konten lengkap file yang sudah diupdate]
</UPDATED_FILE>
3. Jika tidak perlu update file (hanya pertanyaan/diskusi), jangan sertakan tag UPDATED_FILE.
4. Gunakan Bahasa Indonesia yang natural dan teknikal.`;

  // ── 8. SSE Stream — jawaban + update file ──
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      let fullResponse = "";

      try {
        // Stream chat tokens langsung ke UI (tanpa await di dalam onToken)
        await generateWithFallback(
          systemPrompt,
          {
            onToken: (chunk: string) => {
              fullResponse += chunk;
              // Hanya stream token yang BUKAN bagian dari UPDATED_FILE tag
              // (tag ini biasanya ada di akhir, jadi kebanyakan chunk bisa langsung di-stream)
              if (!fullResponse.includes("<UPDATED_FILE")) {
                send("chat:token", { chunk });
              }
            },
          }
        );

        // ── Post-processing setelah generate selesai ──
        // 1. Ekstrak bagian chat (sebelum UPDATED_FILE tag)
        const chatPart = fullResponse.replace(/<UPDATED_FILE[\s\S]*?<\/UPDATED_FILE>/g, "").trim();

        // 2. Parse semua UPDATED_FILE tags
        const updateMatches = [...fullResponse.matchAll(
          /<UPDATED_FILE[^>]*fileType="([^"]+)"[^>]*>\n?([\s\S]*?)\n?<\/UPDATED_FILE>/g
        )];

        // 3. Simpan file yang diupdate ke database dan kirim event ke UI
        for (const match of updateMatches) {
          const extractedFileType = match[1] as FileType;
          const newContent = match[2].trim();

          const updatedFile = await ProjectFile.findOneAndUpdate(
            { projectId, fileType: extractedFileType },
            {
              $set: { content: newContent, updatedAt: new Date() },
              $inc: { version: 1 },
            },
            { upsert: true, returnDocument: "after" }
          );

          if (updatedFile) {
            await createFileVersionSnapshot({
              projectId,
              fileType: extractedFileType,
              version: updatedFile.version,
              content: newContent,
              changeType: "refinement",
              summary: "Refinement AI via chat",
            });
          }

          send("file:updated", {
            fileType: extractedFileType,
            content: newContent,
          });
        }

        // 4. Simpan ke chat history
        const cleanMessage = fullResponse.replace(/<UPDATED_FILE[\s\S]*?<\/UPDATED_FILE>/g, "[file diupdate]");
        await ChatHistory.insertMany([
          { projectId, role: "user", message },
          { projectId, role: "assistant", message: cleanMessage },
        ]);

        send("chat:complete", { message: chatPart });
      } catch (err: unknown) {
        console.error("Refine error:", err);
        const msg = err instanceof Error ? err.message : "Generate error";
        send("error", { message: msg });
      } finally {
        controller.close();
      }
    },
  });


  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
