// ============================================================
// app/api/chat/route.ts — Chat Interview endpoint (SSE streaming)
// AI mengajukan maks 5 pertanyaan klarifikasi sebelum generate
// Respons AI di-stream token-by-token sesuai ARCHITECTURE.md § 7.2
//
// URUTAN VALIDASI (WAJIB, sesuai ARCHITECTURE.md § 7.4):
// 1. Cek autentikasi session
// 2. Rate limit TIDAK dicek di sini (chat tidak consume AI quota besar)
// 3. Baru kemudian buka SSE stream
// ============================================================

import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Project from "@/models/Project";
import ChatHistory from "@/models/ChatHistory";
import { requireAuth, isSession } from "@/lib/auth";
import { generateWithFallback, formatSSEEvent } from "@/modules/ai-provider/router";
import { buildInterviewPrompt } from "@/modules/files/prompt-builder";
import { ProjectBrief } from "@/types";
import { z } from "zod";

const chatSchema = z.object({
  projectId: z.string().min(1),
  message: z.string().min(1).max(2000),
  aiMode: z.enum(["flash", "deep"]).optional().default("flash"),
  model: z.string().optional(),
});

export async function POST(req: NextRequest) {
  // 1. Validasi autentikasi SEBELUM membuka stream
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

  const parsed = chatSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "Input tidak valid" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { projectId, message, aiMode, model } = parsed.data;
  const effectiveMode: "flash" | "deep" =
    model === "deep" || aiMode === "deep" ? "deep" : "flash";

  // 2. Fetch project & validasi kepemilikan (cegah IDOR)
  let project: Awaited<ReturnType<typeof Project.findOne>>;
  let previousMessages: Array<{ role: "user" | "assistant"; message: string }>;

  try {
    await connectDB();

    project = await Project.findOne({ _id: projectId, userId });
    if (!project) {
      return new Response(JSON.stringify({ error: "Project tidak ditemukan" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Ambil riwayat chat interview sebelumnya
    const history = await ChatHistory.find({
      projectId,
      phase: "interview",
    })
      .sort({ createdAt: 1 })
      .select("role message")
      .lean();

    previousMessages = history.map((h) => ({
      role: h.role as "user" | "assistant",
      message: h.message,
    }));
  } catch (err) {
    console.error("Chat: DB fetch error:", err);
    return new Response(JSON.stringify({ error: "Database error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 3. Simpan pesan user ke chat history
  try {
    await ChatHistory.create({
      projectId,
      role: "user",
      message,
      phase: "interview",
    });

    // Update status project ke "interviewing"
    if (project!.status === "draft") {
      await Project.updateOne({ _id: projectId }, { $set: { status: "interviewing" } });
    }
  } catch (err) {
    console.error("Chat: save message error:", err);
  }

  // 4. Bangun brief project untuk prompt
  const brief: ProjectBrief = {
    name: project!.name,
    projectType: project!.projectType,
    mainFeatures: project!.mainFeatures ?? "",
    techStackPreference: project!.techStackPreference ?? "",
  };

  // Tambahkan pesan user terbaru ke history untuk konteks
  const messagesWithCurrent = [
    ...previousMessages,
    { role: "user" as const, message },
  ];

  const interviewPrompt = buildInterviewPrompt(brief, messagesWithCurrent);

  // 5. Buka SSE stream — respons AI token-by-token
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let fullResponse = "";

      try {
        fullResponse = await generateWithFallback(interviewPrompt, {
          aiMode: effectiveMode,
          onToken: (chunk) => {
            controller.enqueue(
              encoder.encode(formatSSEEvent("chat:token", { chunk }))
            );
          },
        });

        // Kirim event selesai
        controller.enqueue(
          encoder.encode(
            formatSSEEvent("chat:complete", { message: fullResponse })
          )
        );

        // Simpan respons AI ke chat history
        await ChatHistory.create({
          projectId,
          role: "assistant",
          message: fullResponse,
          phase: "interview",
        });

        // Cek apakah AI sudah siap generate (sinyal dari respons)
        const isReadyToGenerate =
          fullResponse.toLowerCase().includes("siap membuat") ||
          fullResponse.toLowerCase().includes("mari kita mulai generate") ||
          fullResponse.toLowerCase().includes("mulai generate");

        if (isReadyToGenerate) {
          controller.enqueue(
            encoder.encode(formatSSEEvent("interview:complete", { projectId }))
          );
          await Project.updateOne(
            { _id: projectId },
            { $set: { status: "done" } }
          );
        }
      } catch (err) {
        console.error("Chat stream error:", err);
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Semua AI provider sedang sibuk, coba beberapa saat lagi.";

        controller.enqueue(
          encoder.encode(
            formatSSEEvent("error", {
              error: errorMessage,
              code: "ALL_PROVIDERS_EXHAUSTED",
            })
          )
        );
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
      "X-Accel-Buffering": "no", // disable Nginx buffering
    },
  });
}
