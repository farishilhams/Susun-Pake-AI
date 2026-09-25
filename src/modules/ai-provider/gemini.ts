// ============================================================
// modules/ai-provider/gemini.ts — Google Gemini via AI Studio
//
// ⚠️  ATURAN MUTLAK (ARCHITECTURE.md § 2.1 & SECURITY.md):
//     - Endpoint: AI Studio (aistudio.google.com), BUKAN Vertex AI
//     - API key dari GOOGLE_AI_STUDIO_API_KEY atau GEMINI_API_KEY
//     - TIDAK memerlukan billing account/kartu kredit
//     - Model: gemini-2.5-flash (utama) dengan fallback gemini-2.5-pro / 3.6-flash
// ============================================================

import { GoogleGenerativeAI } from "@google/generative-ai";

export type StreamCallback = (chunk: string) => void;

export type ProviderOptions = {
  onToken?: StreamCallback;
  aiMode?: "flash" | "deep";
};

// Daftar model Gemini aktif di AI Studio
export const GEMINI_MODELS_FLASH = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-3.6-flash",
  "gemini-2.5-pro",
] as const;

export const GEMINI_MODELS_DEEP = [
  "gemini-2.5-pro",
  "gemini-2.5-flash",
  "gemini-3.6-flash",
  "gemini-2.5-flash-lite",
] as const;

export const GEMINI_MODELS = GEMINI_MODELS_FLASH;

/**
 * Generate teks dengan Gemini Flash / Pro via AI Studio.
 * Mendukung streaming token-by-token via onToken callback.
 * Dilengkapi perulangan fallback model jika model tertentu 404/tidak tersedia.
 */
export async function callGemini(
  prompt: string,
  opts?: ProviderOptions
): Promise<string> {
  const apiKey =
    process.env.GOOGLE_AI_STUDIO_API_KEY || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GOOGLE_AI_STUDIO_API_KEY atau GEMINI_API_KEY tidak tersedia di .env.local"
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  let lastError: unknown = null;
  const modelsToTry = opts?.aiMode === "deep" ? GEMINI_MODELS_DEEP : GEMINI_MODELS_FLASH;

  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });

      if (opts?.onToken) {
        // Mode streaming: emit token ke callback satu-per-satu
        const result = await model.generateContentStream(prompt);
        let fullText = "";

        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            opts.onToken(text);
            fullText += text;
          }
        }

        if (fullText.trim()) {
          return fullText;
        }
      } else {
        // Mode non-streaming: tunggu jawaban penuh
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        if (text) return text;
      }
    } catch (err) {
      lastError = err;
      const errMsg = err instanceof Error ? err.message : String(err);

      // Jika terkena 429 (quota / rate limit), langsung lempar agar router switch ke Groq
      if (
        errMsg.includes("429") ||
        errMsg.toLowerCase().includes("quota") ||
        errMsg.toLowerCase().includes("rate limit")
      ) {
        console.warn(
          `[Gemini] Model ${modelName} terkena rate-limit (429), delegasikan ke router fallback.`
        );
        throw err;
      }

      // Jika 404 (model tidak ditemukan / deprecated), coba model Gemini berikutnya
      console.warn(
        `[Gemini] Model ${modelName} gagal: ${errMsg.slice(0, 160)}. Mencoba model Gemini berikutnya...`
      );
      continue;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Semua model Gemini tidak dapat diakses.");
}
