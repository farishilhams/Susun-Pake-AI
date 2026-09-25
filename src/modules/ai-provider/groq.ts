// ============================================================
// modules/ai-provider/groq.ts — Groq API (Fallback Pertama)
// Dipakai saat Gemini kena rate limit 429.
// Fokus kecepatan — Groq menggunakan hardware khusus (LPU).
// Sesuai ARCHITECTURE.md § 2.2
// ============================================================

import Groq from "groq-sdk";
import { StreamCallback, ProviderOptions } from "./gemini";

// Model aktif di Groq yang stabil dan memiliki performa tinggi
export const GROQ_MODELS_FLASH = [
  "qwen/qwen3.8-27b",
  "openai/gpt-oss-20b",
  "openai/gpt-oss-120b",
] as const;

export const GROQ_MODELS_DEEP = [
  "openai/gpt-oss-120b",
  "qwen/qwen3.8-27b",
  "openai/gpt-oss-20b",
] as const;

export const GROQ_MODELS = GROQ_MODELS_FLASH;

/**
 * Generate teks dengan Groq API.
 * Mendukung streaming token-by-token via onToken callback.
 * Dilengkapi perulangan fallback model jika model tertentu 404/decommissioned.
 */
export async function callGroq(
  prompt: string,
  opts?: ProviderOptions
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error("GROQ_API_KEY tidak tersedia di .env.local");
  }

  const client = new Groq({ apiKey });
  let lastError: unknown = null;
  const modelsToTry = opts?.aiMode === "deep" ? GROQ_MODELS_DEEP : GROQ_MODELS_FLASH;

  for (const model of modelsToTry) {
    try {
      if (opts?.onToken) {
        // Mode streaming
        const stream = await client.chat.completions.create({
          model,
          messages: [{ role: "user", content: prompt }],
          stream: true,
          max_tokens: 8192,
          temperature: 0.7,
        });

        let fullText = "";
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta;
          // Mendukung content biasa dan fallback reasoning jika model reasoning
          const text = delta?.content ?? (delta as unknown as { reasoning?: string })?.reasoning ?? "";
          if (text) {
            opts.onToken(text);
            fullText += text;
          }
        }

        if (fullText.trim()) {
          return fullText;
        }
      } else {
        // Mode non-streaming
        const completion = await client.chat.completions.create({
          model,
          messages: [{ role: "user", content: prompt }],
          max_tokens: 8192,
          temperature: 0.7,
        });

        const msg = completion.choices[0]?.message;
        const text = msg?.content ?? (msg as unknown as { reasoning?: string })?.reasoning ?? "";
        if (text) return text;
      }
    } catch (err) {
      lastError = err;
      const errMsg = err instanceof Error ? err.message : String(err);

      // Jika 429 (rate limit Groq), lempar error agar router beralih ke OpenRouter
      if (
        errMsg.includes("429") ||
        errMsg.toLowerCase().includes("rate limit") ||
        errMsg.toLowerCase().includes("quota")
      ) {
        console.warn(
          `[Groq] Model ${model} rate-limited (429), delegasikan ke OpenRouter.`
        );
        throw err;
      }

      // Jika 404 / 400 (model decommissioned atau model_not_found), coba model Groq berikutnya
      console.warn(
        `[Groq] Model ${model} gagal: ${errMsg.slice(0, 160)}. Mencoba model Groq berikutnya...`
      );
      continue;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Semua model Groq tidak dapat diakses.");
}
