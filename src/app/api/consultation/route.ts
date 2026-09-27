// ============================================================
// app/api/consultation/route.ts — Endpoint Chatbot Konsultasi AI (SSE Streaming)
// Layanan tanya-jawab arsitektur sistem, strategi produk & vibe coding
// Sesuai PRD § 3.2, ARCHITECTURE.md § 7.2, dan SKILL.md
// ============================================================

import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import ChatHistory from "@/models/ChatHistory";
import { requireAuth, isSession } from "@/lib/auth";
import {
  generateWithFallback,
  formatSSEEvent,
} from "@/modules/ai-provider/router";
import {
  checkDailyConsultationQuota,
  getRemainingConsultationQuota,
  refundConsultationQuota,
} from "@/lib/rate-limiter";
import { buildConsultationPrompt } from "@/modules/files/consultation-prompt";
import { getDynamicStarterPrompts } from "@/modules/consultation/starter-prompts";
import { z } from "zod";

const consultationSchema = z.object({
  message: z.string().trim().min(1, "Pesan tidak boleh kosong").max(3000, "Pesan maksimal 3.000 karakter"),
  modelId: z.string().optional(),
  extendedReasoning: z.boolean().optional(),
  aiMode: z.enum(["flash", "deep"]).optional().default("flash"),
  model: z.string().optional(),
});

/**
 * GET: Ambil riwayat chat konsultasi pengguna dan info sisa kuota harian
 */
export async function GET() {
  const authResult = await requireAuth();
  if (!isSession(authResult)) return authResult;

  const { id: userId } = authResult.user;

  try {
    await connectDB();

    const [messages, quota] = await Promise.all([
      ChatHistory.find({
        userId,
        $or: [{ phase: "consultation" }, { type: "consultation" }],
      })
        .sort({ createdAt: 1 })
        .select("_id role message createdAt")
        .lean(),
      getRemainingConsultationQuota(userId, 20),
    ]);

    const suggestions = getDynamicStarterPrompts(6);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          messages,
          quota,
          suggestions,
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
    console.error("Consultation GET error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Gagal memuat riwayat konsultasi" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * POST: Kirim pesan konsultasi baru dengan Server-Sent Events (SSE) streaming
 */
export async function POST(req: NextRequest) {
  // 1. Validasi autentikasi SEBELUM membuka stream
  const authResult = await requireAuth();
  if (!isSession(authResult)) return authResult;

  const { id: userId } = authResult.user;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Payload JSON tidak valid" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const parsed = consultationSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({
        error: parsed.error.issues[0]?.message || "Input tidak valid",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const { message, modelId, extendedReasoning, aiMode, model } = parsed.data;
  const effectiveMode: "flash" | "deep" =
    extendedReasoning || model === "deep" || aiMode === "deep" ? "deep" : "flash";

  // 2. Terapkan Rate Limiting TERPISAH (consultationCount di usage_log)
  const allowed = await checkDailyConsultationQuota(userId, 20);
  if (!allowed) {
    return new Response(
      JSON.stringify({
        error:
          "Batas kuota konsultasi harian Anda telah tercapai (maksimal 20 pesan per hari). Silakan kembali besok atau lanjutkan menyusun project.",
      }),
      {
        status: 429,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // 3. Simpan pesan user dan ambil riwayat terkini untuk konteks AI
  let historyMessages: Array<{ role: "user" | "assistant"; message: string }> = [];

  try {
    await connectDB();

    // Ambil maksimal 8 riwayat chat sebelumnya
    const previous = await ChatHistory.find({
      userId,
      $or: [{ phase: "consultation" }, { type: "consultation" }],
    })
      .sort({ createdAt: 1 })
      .select("role message")
      .lean();

    historyMessages = previous.map((p) => ({
      role: p.role as "user" | "assistant",
      message: p.message,
    }));

    // Simpan pesan user saat ini
    await ChatHistory.create({
      userId,
      role: "user",
      message,
      phase: "consultation",
      type: "consultation",
    });
  } catch (dbErr) {
    console.error("Consultation DB init error:", dbErr);
    return new Response(
      JSON.stringify({ error: "Gagal menyimpan pesan ke database" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // 4. Susun prompt konsultasi
  const prompt = buildConsultationPrompt(message, historyMessages);

  // 5. Buka koneksi SSE stream
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let fullResponse = "";

      try {
        fullResponse = await generateWithFallback(prompt, {
          modelId,
          extendedReasoning,
          aiMode: effectiveMode,
          onToken: (chunk) => {
            controller.enqueue(
              encoder.encode(formatSSEEvent("chat:token", { chunk }))
            );
          },
          onFallback: (info) => {
            controller.enqueue(
              encoder.encode(
                formatSSEEvent("chat:fallback", {
                  message: `Model utama sibuk, dialihkan sementara ke ${info.fallbackModel || info.fallbackProvider}`,
                  ...info,
                })
              )
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
          userId,
          role: "assistant",
          message: fullResponse,
          phase: "consultation",
          type: "consultation",
        });
      } catch (err) {
        console.error("Consultation stream error:", err);

        // Refund kuota pengguna secara otomatis agar tidak terbuang sia-sia saat AI gagal
        try {
          await refundConsultationQuota(userId);
        } catch (refundErr) {
          console.error("Gagal melakukan refund kuota konsultasi:", refundErr);
        }

        const errorMessage =
          err instanceof Error
            ? err.message
            : "Semua AI provider sedang sibuk, silakan coba beberapa saat lagi.";

        controller.enqueue(
          encoder.encode(formatSSEEvent("chat:error", { error: errorMessage }))
        );
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

/**
 * DELETE: Hapus seluruh riwayat chat konsultasi milik pengguna
 */
export async function DELETE() {
  const authResult = await requireAuth();
  if (!isSession(authResult)) return authResult;

  const { id: userId } = authResult.user;

  try {
    await connectDB();
    await ChatHistory.deleteMany({
      userId,
      $or: [{ phase: "consultation" }, { type: "consultation" }],
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Riwayat konsultasi berhasil dibersihkan.",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Consultation DELETE error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Gagal menghapus riwayat konsultasi" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
