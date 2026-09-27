// ============================================================
// modules/ai-provider/groq.ts — Groq API (Fallback Pertama)
// Dipakai saat Gemini kena rate limit 429 atau user memilih model Groq.
// Fokus kecepatan — Groq menggunakan hardware khusus (LPU).
// Sesuai ARCHITECTURE.md § 2.2
// ============================================================

import Groq from "groq-sdk";
import { ProviderOptions } from "./gemini";
import { resolveModelId } from "./catalog";

// Model aktif di Groq yang stabil dan memiliki performa tinggi (terverifikasi di akun)
export const GROQ_MODELS_FLASH = [
  "openai/gpt-oss-20b",
  "qwen/qwen3.8-27b",
  "openai/gpt-oss-120b",
] as const;

export const GROQ_MODELS_DEEP = [
  "openai/gpt-oss-120b",
  "qwen/qwen3.8-27b",
  "openai/gpt-oss-20b",
] as const;

export const GROQ_MODELS = GROQ_MODELS_FLASH;

// Memory cache untuk model yang tidak ada / 404 agar tidak dicoba berulang kali
const groqDisabledModels = new Set<string>([
  "llama-3.1-8b-instant",
  "llama-3.3-70b-versatile",
  "llama3-8b-8192",
  "llama3-70b-8192",
]);

let cachedAvailableGroqModels: Set<string> | null = null;
let lastModelCheckTime = 0;

/**
 * Mengecek daftar model yang didukung akun Groq saat ini.
 * Hasil di-cache selama 1 jam agar tidak menambah overhead latency.
 */
async function getAvailableGroqModels(client: Groq): Promise<Set<string> | null> {
  const now = Date.now();
  if (cachedAvailableGroqModels && now - lastModelCheckTime < 3600000) {
    return cachedAvailableGroqModels;
  }
  try {
    const list = await client.models.list();
    const set = new Set<string>(list.data.map((m) => m.id));
    cachedAvailableGroqModels = set;
    lastModelCheckTime = now;
    return set;
  } catch {
    return null;
  }
}

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
  const isDeep = opts?.aiMode === "deep" || Boolean(opts?.extendedReasoning);
  const baseCandidates = isDeep ? GROQ_MODELS_DEEP : GROQ_MODELS_FLASH;
  const modelsToTry: string[] = [...baseCandidates];

  // Dapatkan daftar model aktif dari server Groq secara asinkron (cached)
  const remoteModels = await getAvailableGroqModels(client);

  // Jika user memilih model spesifik Groq dari katalog (resolusi alias jika lama)
  const resolvedModel = resolveModelId(opts?.modelId);
  if (
    resolvedModel &&
    !resolvedModel.startsWith("gemini-") &&
    !resolvedModel.includes(":free") &&
    resolvedModel !== "openrouter/free"
  ) {
    const existingIdx = modelsToTry.indexOf(resolvedModel);
    if (existingIdx > -1) {
      modelsToTry.splice(existingIdx, 1);
    }
    modelsToTry.unshift(resolvedModel);
  }

  // Filter kandidat: singkirkan model yang sudah di-blacklist atau tidak didukung akun
  const activeCandidates = modelsToTry.filter((model) => {
    if (groqDisabledModels.has(model)) return false;
    if (remoteModels && !remoteModels.has(model)) {
      groqDisabledModels.add(model);
      return false;
    }
    return true;
  });

  if (activeCandidates.length === 0) {
    activeCandidates.push("openai/gpt-oss-20b", "qwen/qwen3.8-27b");
  }

  const temperature = opts?.extendedReasoning ? 0.3 : 0.7;

  for (const model of activeCandidates) {
    try {
      if (opts?.onToken) {
        // Mode streaming
        const stream = await client.chat.completions.create({
          model,
          messages: [{ role: "user", content: prompt }],
          stream: true,
          max_tokens: 8192,
          temperature,
        });

        let fullText = "";
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta;
          // Mendukung content biasa dan fallback reasoning jika model reasoning
          const text =
            delta?.content ??
            (delta as unknown as { reasoning?: string })?.reasoning ??
            "";
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
          temperature,
        });

        const msg = completion.choices[0]?.message;
        const text =
          msg?.content ??
          (msg as unknown as { reasoning?: string })?.reasoning ??
          "";
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

      // Tandai model 404 / model_not_found ke memory blacklist
      if (
        errMsg.includes("404") ||
        errMsg.includes("model_not_found") ||
        errMsg.includes("does not exist") ||
        errMsg.includes("do not have access")
      ) {
        groqDisabledModels.add(model);
      }

      // Jika gagal, coba model Groq berikutnya
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
