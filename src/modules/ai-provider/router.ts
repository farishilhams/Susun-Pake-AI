// ============================================================
// modules/ai-provider/router.ts — AI Provider Router dengan Fallback
//
// Pola PERSIS sesuai SKILL.md § "AI Provider Router dengan Fallback"
// Urutan: Gemini (AI Studio) → Groq → OpenRouter (model gratis)
//
// ATURAN MUTLAK: jangan ubah urutan atau tambah provider berbayar
// tanpa mendiskusikan dengan user (ARCHITECTURE.md § 2)
// ============================================================

import { callGemini, StreamCallback } from "./gemini";
import { callGroq } from "./groq";
import { callOpenRouterFree } from "./openrouter";

export class AllProvidersExhaustedError extends Error {
  public details: string;

  constructor(details?: string) {
    super(
      details
        ? `Semua AI provider (Gemini, Groq, OpenRouter) sedang tidak tersedia. Detail: ${details}`
        : "Semua AI provider (Gemini, Groq, OpenRouter) sedang tidak tersedia. Server sedang sibuk — coba beberapa saat lagi."
    );
    this.name = "AllProvidersExhaustedError";
    this.details = details || "";
  }
}

/** Cek apakah error adalah rate limit (429) dari provider */
export function isRateLimitError(err: unknown): boolean {
  if (err instanceof Error) {
    // Status 429 dari HTTP response
    if ("status" in err && (err as { status: number }).status === 429) return true;
    // Text "429" atau "rate limit" atau "quota" di message error
    const msg = err.message.toLowerCase();
    return msg.includes("429") || msg.includes("rate limit") || msg.includes("quota");
  }
  return false;
}

export type ProviderName = "gemini" | "groq" | "openrouter";
export type AiMode = "flash" | "deep";

export type GenerateOptions = {
  onToken?: StreamCallback;
  aiMode?: AiMode;
  preferredProvider?: ProviderName;
  onProviderUsed?: (provider: ProviderName) => void;
};

type ProviderFn = (
  prompt: string,
  opts?: { onToken?: StreamCallback; aiMode?: AiMode }
) => Promise<string>;

const PROVIDER_DEFINITIONS: { id: ProviderName; name: string; fn: ProviderFn }[] = [
  { id: "gemini", name: "Google Gemini", fn: callGemini },
  { id: "groq", name: "Groq", fn: callGroq },
  { id: "openrouter", name: "OpenRouter (Free)", fn: callOpenRouterFree },
];

/**
 * Health check ringan untuk menentukan provider utama yang stabil sebelum batch.
 */
export async function checkProviderHealth(preferred?: ProviderName): Promise<ProviderName> {
  const testPrompt = "Ping check. Balas 'PONG' singkat.";
  
  // Urutkan kandidat: jika ada preferred, letakkan di depan
  const candidates = [...PROVIDER_DEFINITIONS];
  if (preferred) {
    const idx = candidates.findIndex((c) => c.id === preferred);
    if (idx > -1) {
      const [item] = candidates.splice(idx, 1);
      candidates.unshift(item);
    }
  }

  for (const { id, name, fn } of candidates) {
    try {
      console.log(`[AI HealthCheck] Memeriksa kesehatan provider: ${name}...`);
      await fn(testPrompt, { aiMode: "flash" });
      console.log(`[AI HealthCheck] Provider ${name} sehat dan responsif.`);
      return id;
    } catch (err) {
      console.warn(
        `[AI HealthCheck] Provider ${name} gagal respons (${err instanceof Error ? err.message : String(err)}). Mencoba kandidat berikutnya...`
      );
    }
  }

  // Jika semua ping gagal, default ke gemini
  return "gemini";
}

/**
 * Generate teks dengan fallback otomatis antar provider.
 * Mendukung preferredProvider (Sticky Provider) dan aiMode (Flash vs Deep).
 *
 * Urutan coba default:
 * 1. Gemini via AI Studio (utama, gratis, tanpa billing)
 * 2. Groq (fallback pertama, sangat cepat via LPU)
 * 3. OpenRouter model gratis (fallback kedua)
 */
export async function generateWithFallback(
  prompt: string,
  opts?: GenerateOptions
): Promise<string> {
  // Susun daftar provider sesuai prioritas (preferredProvider di posisi pertama)
  const providerList = [...PROVIDER_DEFINITIONS];
  if (opts?.preferredProvider) {
    const prefIdx = providerList.findIndex((p) => p.id === opts.preferredProvider);
    if (prefIdx > -1) {
      const [preferredItem] = providerList.splice(prefIdx, 1);
      providerList.unshift(preferredItem);
    }
  }

  const errorLog: string[] = [];

  for (const { id, name, fn } of providerList) {
    try {
      console.log(`[AI Router] Mencoba provider: ${name} (mode: ${opts?.aiMode ?? "flash"})...`);
      const result = await fn(prompt, {
        onToken: opts?.onToken,
        aiMode: opts?.aiMode,
      });
      console.log(`[AI Router] Sukses mendapatkan respon dari: ${name}`);

      // Notifikasi provider yang berhasil digunakan (untuk sticky lock)
      opts?.onProviderUsed?.(id);
      return result;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      errorLog.push(`${name}: ${errMsg.slice(0, 120)}`);

      if (isRateLimitError(err)) {
        console.warn(
          `[AI Router] Provider ${name} terkena rate-limit (429). Mencoba provider berikutnya...`
        );
      } else {
        console.warn(
          `[AI Router] Provider ${name} gagal (${errMsg.slice(0, 100)}). Mencoba provider berikutnya...`
        );
      }
      continue;
    }
  }

  console.error(
    `[AI Router] Seluruh AI provider gagal! Ringkasan: ${errorLog.join(" | ")}`
  );
  throw new AllProvidersExhaustedError(errorLog.join("; "));
}

/**
 * Helper untuk membuat SSE event string yang valid
 * sesuai ARCHITECTURE.md § 7.1 event contract
 */
export function formatSSEEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}
