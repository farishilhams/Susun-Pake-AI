// ============================================================
// modules/ai-provider/catalog.ts — Katalog Terpusat Model AI
//
// Menyediakan metadata terpadu untuk Google Gemini, Groq, dan
// OpenRouter Free Model Ecosystem.
// Sesuai ARCHITECTURE.md § 2 dan PRD.md § 3.1
// ============================================================

import { AIModelDefinition, AICategory, AIProviderName } from "./types";

export const DEFAULT_MODEL_ID = "gemini-2.5-flash";

export const CATEGORY_LABELS: Record<AICategory, string> = {
  fast: "Model Cepat & Ringan",
  general: "Model Serbaguna",
  reasoning: "Model Penalaran Arsitektur Mendalam",
};

/**
 * Peta migrasi / alias dari model lama/decommissioned ke model aktif.
 * Mencegah error 404 pada cache browser lama atau request tersimpan.
 */
export const MODEL_ALIASES: Record<string, string> = {
  // Legacy / Decommissioned Gemini models -> Model Gemini aktif
  "gemini-1.5-flash": "gemini-2.5-flash",
  "gemini-1.5-pro": "gemini-3.5-flash",
  "gemini-2.5-flash-lite": "gemini-3.5-flash-lite",
  "gemini-2.5-pro": "gemini-3.5-flash",

  // Legacy / Inaccessible Groq models -> Model Groq aktif di akun
  "llama-3.1-8b-instant": "openai/gpt-oss-20b",
  "llama-3.3-70b-versatile": "qwen/qwen3.8-27b",
  "llama3-8b-8192": "openai/gpt-oss-20b",
  "llama3-70b-8192": "qwen/qwen3.8-27b",

  // Legacy / Expired OpenRouter Free models -> Model Free aktif
  "deepseek/deepseek-r1:free": "openrouter/free",
  "qwen/qwen-2.5-coder-32b-instruct:free": "qwen/qwen3.8-27b:free",
  "meta-llama/llama-3.3-70b-instruct:free": "openrouter/free",
  "deepseek/deepseek-r1-distill-llama-70b:free": "openrouter/free",
};

/**
 * Helper untuk menerjemahkan modelId ke model aktif yang valid.
 */
export function resolveModelId(id?: string): string | undefined {
  if (!id) return undefined;
  return MODEL_ALIASES[id] ?? id;
}

export const AI_MODELS: AIModelDefinition[] = [
  // ── Google Gemini (AI Studio - Resmi & Aktif) ──
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "gemini",
    category: "fast",
    badge: "Rekomendasi",
    description: "Jawaban tercepat & efisien untuk drafting arsitektur awal",
    supportsStreaming: true,
    isDefault: true,
  },
  {
    id: "gemini-3.5-flash",
    name: "Gemini 3.5 Flash",
    provider: "gemini",
    category: "reasoning",
    badge: "Canggih",
    description: "Generasi baru Google dengan analisis logika & sistem mendalam",
    supportsStreaming: true,
  },
  {
    id: "gemini-3.5-flash-lite",
    name: "Gemini 3.5 Flash Lite",
    provider: "gemini",
    category: "fast",
    badge: "Hemat",
    description: "Inferensi kilat ringan untuk klarifikasi dan respon singkat",
    supportsStreaming: true,
  },

  // ── Groq (Ultra-Low Latency via LPU - Model Aktif di Akun) ──
  {
    id: "qwen/qwen3.8-27b",
    name: "Qwen 3.8 27B (Groq)",
    provider: "groq",
    category: "general",
    badge: "Kilat",
    description: "Eksekusi super cepat untuk arsitektur kode dan multilingual",
    supportsStreaming: true,
  },
  {
    id: "openai/gpt-oss-120b",
    name: "GPT OSS 120B (Groq)",
    provider: "groq",
    category: "reasoning",
    badge: "Flagship",
    description: "Parameter masif 120B dengan akselerasi hardware LPU Groq",
    supportsStreaming: true,
  },
  {
    id: "openai/gpt-oss-20b",
    name: "GPT OSS 20B (Groq)",
    provider: "groq",
    category: "fast",
    badge: "Ringan",
    description: "Latensi mendekati nol untuk tanya jawab cepat dan interaktif",
    supportsStreaming: true,
  },

  // ── OpenRouter (100% Free / Auto-Route Ecosystem) ──
  {
    id: "openrouter/free",
    name: "OpenRouter Auto Free",
    provider: "openrouter",
    category: "general",
    badge: "Auto Free",
    description: "Perutean cerdas otomatis ke model gratis terbaik yang sedang aktif",
    supportsStreaming: true,
  },
  {
    id: "qwen/qwen3.8-27b:free",
    name: "Qwen 3.8 27B Free",
    provider: "openrouter",
    category: "reasoning",
    badge: "Coding",
    description: "Optimal untuk skema arsitektur, diagram dan sintaks kode",
    supportsStreaming: true,
  },
  {
    id: "google/gemma-4-26b-a4b-it:free",
    name: "Gemma 4 26B Free",
    provider: "openrouter",
    category: "fast",
    badge: "Ringkas",
    description: "Model open Google berkecepatan tinggi dengan kuota gratis",
    supportsStreaming: true,
  },
];

/**
 * Mencari definisi model berdasarkan ID unik API atau aliasnya.
 */
export function getModelById(id: string): AIModelDefinition | undefined {
  const resolvedId = resolveModelId(id) ?? id;
  return AI_MODELS.find((model) => model.id === resolvedId || model.id === id);
}

/**
 * Mengambil model default dari katalog.
 */
export function getDefaultModel(): AIModelDefinition {
  const defaultModel = AI_MODELS.find((model) => model.isDefault);
  return defaultModel ?? AI_MODELS[0];
}

/**
 * Memfilter daftar model berdasarkan kategori kinerja.
 */
export function getModelsByCategory(category: AICategory): AIModelDefinition[] {
  return AI_MODELS.filter((model) => model.category === category);
}

/**
 * Memfilter model berdasarkan penyedia layanan AI.
 */
export function getModelsByProvider(provider: AIProviderName): AIModelDefinition[] {
  return AI_MODELS.filter((model) => model.provider === provider);
}
