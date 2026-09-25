// ============================================================
// modules/ai-provider/openrouter.ts — OpenRouter (Fallback Kedua)
// HANYA menggunakan model yang ditandai gratis (":free" suffix atau "openrouter/free")
// JANGAN PERNAH memilih model berbayar — sesuai ARCHITECTURE.md § 2.2
// dan CLAUDE.md § 7 Larangan Eksplisit
// ============================================================

import { StreamCallback, ProviderOptions } from "./gemini";

const BASE_URL = "https://openrouter.ai/api/v1";

// Model gratis aktif di OpenRouter
export const FREE_MODELS_FLASH = [
  "openrouter/free",
  "qwen/qwen3.8-27b:free",
  "google/gemma-4-26b-a4b-it:free",
  "nvidia/nemotron-3.5-lightning:free",
  "google/gemma-4-31b-it:free",
  "z-ai/glm-5.2:free",
] as const;

export const FREE_MODELS_DEEP = [
  "deepseek/deepseek-r1:free",
  "deepseek/deepseek-r1-distill-llama-70b:free",
  "openrouter/free",
  "qwen/qwen3.8-27b:free",
  "google/gemma-4-26b-a4b-it:free",
  "z-ai/glm-5.2:free",
] as const;

export const FREE_MODELS = FREE_MODELS_FLASH;

/**
 * Generate teks dengan OpenRouter, menggunakan model gratis saja.
 * Mencoba model gratis satu per satu jika ada error.
 * Mendukung streaming token-by-token via onToken callback.
 *
 * ⚠️  Filter model gratis adalah hard-coded — JANGAN diganti dengan
 *     model berbayar dalam kondisi apapun (ARCHITECTURE.md § 2.2)
 */
export async function callOpenRouterFree(
  prompt: string,
  opts?: ProviderOptions
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY tidak tersedia di .env.local");
  }

  let lastError: unknown = null;
  const modelsToTry = opts?.aiMode === "deep" ? FREE_MODELS_DEEP : FREE_MODELS_FLASH;

  for (const model of modelsToTry) {
    try {
      const result = await callWithModel(model, prompt, apiKey, opts);
      if (result.trim()) {
        return result;
      }
    } catch (err) {
      lastError = err;
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn(
        `[OpenRouter] Model ${model} gagal: ${errMsg.slice(0, 160)}. Mencoba model gratis berikutnya...`
      );
      continue;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Semua model gratis OpenRouter tidak tersedia saat ini.");
}

async function callWithModel(
  model: string,
  prompt: string,
  apiKey: string,
  opts?: { onToken?: StreamCallback }
): Promise<string> {
  const isStreaming = Boolean(opts?.onToken);

  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      // Header yang disarankan OpenRouter untuk identifikasi aplikasi
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      "X-Title": "Susun Pake AI",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      stream: isStreaming,
      max_tokens: 8192,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw Object.assign(
      new Error(`OpenRouter HTTP ${response.status}: ${errorText}`),
      { status: response.status }
    );
  }

  if (isStreaming && opts?.onToken) {
    // Parse SSE stream dari OpenRouter
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let fullText = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") break;

        try {
          const parsed = JSON.parse(data);
          const chunk =
            parsed.choices?.[0]?.delta?.content ??
            parsed.choices?.[0]?.delta?.reasoning ??
            "";
          if (chunk) {
            opts.onToken(chunk);
            fullText += chunk;
          }
        } catch {
          // Lewatkan baris yang bukan format JSON valid
        }
      }
    }

    return fullText;
  } else {
    const json = await response.json();
    const message = json.choices?.[0]?.message;
    return (message?.content ?? message?.reasoning ?? "").trim();
  }
}
