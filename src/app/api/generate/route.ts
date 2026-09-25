// ============================================================
// app/api/generate/route.ts — SSE Streaming Generate 8 File
//
// URUTAN VALIDASI WAJIB (ARCHITECTURE.md § 7.4):
// 1. Autentikasi session
// 2. Rate limit internal per user (SEBELUM stream dibuka)
// 3. Baru kemudian buka SSE stream dan mulai generate
//
// Event contract sesuai ARCHITECTURE.md § 7.1
// ============================================================

import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Project from "@/models/Project";
import ProjectFile from "@/models/File";
import ChatHistory from "@/models/ChatHistory";
import { requireAuth, isSession } from "@/lib/auth";
import { checkDailyQuota } from "@/lib/rate-limiter";
import { formatSSEEvent } from "@/modules/ai-provider/router";
import { BatchGeneratorOrchestrator } from "@/modules/generator/orchestrator";
import { createFileVersionSnapshot } from "@/lib/versioning";
import { FileType, ProjectBrief } from "@/types";
import { z } from "zod";

const generateSchema = z.object({
  projectId: z.string().min(1),
  aiMode: z.enum(["flash", "deep"]).optional(),
});

const DAILY_LIMIT = parseInt(process.env.DAILY_GENERATE_LIMIT ?? "5", 10);

export async function POST(req: NextRequest) {
  // ─── LANGKAH 1: Autentikasi ─────────────────────────────────
  const authResult = await requireAuth();
  if (!isSession(authResult)) return authResult;

  const { id: userId } = authResult.user;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "projectId wajib diisi" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { projectId, aiMode = "flash" } = parsed.data;

  // ─── LANGKAH 2: Rate Limit (SEBELUM stream dibuka) ──────────
  // Sesuai ARCHITECTURE.md § 7.4 dan SKILL.md § Rate Limiter
  let allowed: boolean;
  let project: Awaited<ReturnType<typeof Project.findOne>>;
  let clarifications: Array<{ question: string; answer: string }>;
  let summaryNote = "";

  try {
    await connectDB();

    // Cek kepemilikan project (cegah IDOR)
    project = await Project.findOne({ _id: projectId, userId });
    if (!project) {
      return new Response(JSON.stringify({ error: "Project tidak ditemukan" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Cek rate limit SEBELUM membuka stream
    allowed = await checkDailyQuota(userId, DAILY_LIMIT);
    if (!allowed) {
      return new Response(
        JSON.stringify({
          error: `Kuota generate harian (${DAILY_LIMIT}x) sudah habis. Coba lagi besok.`,
          code: "RATE_LIMIT_EXCEEDED",
        }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }

    // Ambil riwayat interview untuk dijadikan konteks generate bersama
    const chatHistory = await ChatHistory.find({
      projectId,
      phase: "interview",
    })
      .sort({ createdAt: 1 })
      .lean();

    // Parse Q&A pairs dari riwayat chat
    const messages = chatHistory.map((h) => ({
      role: h.role as "user" | "assistant",
      message: h.message,
    }));

    clarifications = [];
    for (let i = 0; i < messages.length - 1; i++) {
      if (messages[i].role === "assistant" && messages[i + 1]?.role === "user") {
        clarifications.push({
          question: messages[i].message,
          answer: messages[i + 1].message,
        });
      }
    }

    // Ambil pesan penutup atau rangkuman interview terakhir jika ada
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.role === "assistant") {
      summaryNote = lastMsg.message;
    }
  } catch (err) {
    console.error("Generate: pre-flight error:", err);
    return new Response(JSON.stringify({ error: "Database error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ─── LANGKAH 3: Buka SSE Stream & Orchestrate 8 File ──────────
  const brief: ProjectBrief = {
    name: project!.name,
    projectType: project!.projectType,
    mainFeatures: project!.mainFeatures ?? "",
    techStackPreference: project!.techStackPreference ?? "",
  };

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(formatSSEEvent(event, data)));
      };

      try {
        // Update status project ke "generating"
        await Project.updateOne(
          { _id: projectId },
          { $set: { status: "generating" } }
        );

        // Eksekusi generator melalui orchestrator terpadu:
        // - Health check awal untuk menentukan primary provider
        // - Sticky provider strategy (kunci provider untuk seluruh 8 file)
        // - Pacing delay 1200ms antar file untuk cegah lonjakan RPM/TPM 429
        // - Exponential backoff retry pada provider yang sama sebelum fallback
        const orchestrator = new BatchGeneratorOrchestrator({
          projectId,
          context: {
            brief,
            clarifications,
            summaryNote,
          },
          aiMode,
          pacingDelayMs: 1200,
          onFileStart: (fileType, provider) => {
            console.log(`[Generate SSE] Memulai ${fileType} dengan provider: ${provider}`);
            send("file:generating", { fileType, status: "in_progress", provider });
          },
          onFileToken: (fileType, chunk) => {
            send("file:token", { fileType, chunk });
          },
          onFileComplete: async (fileType, content) => {
            // Simpan ke database (upsert jika sudah ada) & catat version snapshot
            try {
              const savedFile = await ProjectFile.findOneAndUpdate(
                { projectId, fileType },
                {
                  $set: { content, updatedAt: new Date() },
                  $inc: { version: 1 },
                },
                { upsert: true, returnDocument: "after" }
              );

              if (savedFile) {
                await createFileVersionSnapshot({
                  projectId,
                  fileType: fileType as FileType,
                  version: savedFile.version,
                  content,
                  changeType: "initial",
                  summary: "Generate awal dokumen",
                });
              }
            } catch (dbErr) {
              console.error(`Save ${fileType} to DB error:`, dbErr);
            }

            // Event: file selesai
            send("file:complete", { fileType, content });
          },
          onFileError: (fileType, error) => {
            send("error", {
              fileType,
              message: `Gagal generate ${fileType}: ${error}`,
            });
          },
        });

        await orchestrator.executeBatch();

        // Update status project ke "done"
        await Project.updateOne(
          { _id: projectId },
          { $set: { status: "done" } }
        );

        // Event: semua file selesai
        send("done", { projectId });
      } catch (err) {
        console.error("Generate stream error:", err);
        send("error", {
          message: "Server sedang sibuk, coba beberapa saat lagi",
        });

        // Reset status project jika gagal
        await Project.updateOne(
          { _id: projectId },
          { $set: { status: "draft" } }
        ).catch(() => {});
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
