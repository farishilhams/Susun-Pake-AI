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
  reasoning: "Model Penalaran Mendalam",
};

/**
 * Peta migrasi / alias dari model lama/decommissioned ke model aktif.
 * Mencegah error 404 pada cache browser lama atau request tersimpan.
 */
export const MODEL_ALIASES: Record<string, string> = {
  // Legacy / Decommissioned Gemini models -> Model Gemini aktif
  "gemini-1.5-flash": "gemini-2.5-flash",
  "gemini-1.5-pro": "gemini-2.5-flash",
  "gemini-2.5-flash-lite": "gemini-2.5-flash-lite-preview",
  "gemini-2.5-pro": "gemini-2.5-flash",
  "gemini-3.5-flash": "gemini-2.5-flash",
  "gemini-3.5-flash-lite": "gemini-2.5-flash-lite-preview",
  "gemini-3.6-flash": "gemini-2.5-flash",

  // Legacy / Inaccessible Groq models -> Model Groq aktif di akun
  "llama-3.1-8b-instant": "llama-3.3-70b-versatile",
  "llama3-8b-8192": "llama-3.3-70b-versatile",
  "llama3-70b-8192": "llama-3.3-70b-versatile",
  "qwen/qwen3.8-27b": "llama-3.3-70b-versatile",
  "openai/gpt-oss-20b": "llama-3.3-70b-versatile",
  "openai/gpt-oss-120b": "llama-3.3-70b-versatile",

  // Legacy / Expired OpenRouter Free models -> Model Free aktif
  "deepseek/deepseek-r1-distill-llama-70b:free": "deepseek/deepseek-r1:free",
  "qwen/qwen-2.5-coder-32b-instruct:free": "qwen/qwen-2.5-coder-32b-instruct:free",
  "meta-llama/llama-3.3-70b-instruct:free": "meta-llama/llama-3.3-70b-instruct:free",
  "qwen/qwen3.8-27b:free": "deepseek/deepseek-r1:free",
  "google/gemma-4-26b-a4b-it:free": "deepseek/deepseek-r1:free",
  "openrouter/free": "deepseek/deepseek-r1:free",
};

/**
 * Helper untuk menerjemahkan modelId ke model aktif yang valid.
 */
export function resolveModelId(id?: string): string | undefined {
  if (!id) return undefined;
  return MODEL_ALIASES[id] ?? id;
}

export const AI_MODELS: AIModelDefinition[] = [
  // ── Google Gemini (AI Studio - Resmi & Aktif, Gratis via AI Studio) ──
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "gemini",
    category: "fast",
    badge: "Rekomendasi",
    badgeVariant: "recommend",
    description: "Model Gemini tercepat & paling efisien — ideal untuk drafting arsitektur",
    supportsStreaming: true,
    isDefault: true,
    isFree: true,
  },
  {
    id: "gemini-2.5-flash-lite-preview",
    name: "Gemini 2.5 Flash Lite",
    provider: "gemini",
    category: "fast",
    badge: "Hemat",
    badgeVariant: "lite",
    description: "Inferensi kilat ultra-ringan untuk klarifikasi & respon singkat",
    supportsStreaming: true,
    isFree: true,
  },
  {
    id: "gemini-2.5-pro-preview",
    name: "Gemini 2.5 Pro",
    provider: "gemini",
    category: "reasoning",
    badge: "Pro",
    badgeVariant: "flagship",
    description: "Kapabilitas penalaran tertinggi Google — analisis sistem kompleks",
    supportsStreaming: true,
    isFree: true,
  },

  // ── Groq (Ultra-Low Latency via LPU - Model Aktif Free Tier) ──
  {
    id: "llama-3.3-70b-versatile",
    name: "Llama 3.3 70B (Groq)",
    provider: "groq",
    category: "general",
    badge: "Kilat",
    badgeVariant: "fast",
    description: "Meta Llama 70B terbaru — serbaguna & sangat cepat via hardware LPU Groq",
    supportsStreaming: true,
    isFree: true,
  },
  {
    id: "llama-3.1-8b-instant",
    name: "Llama 3.1 8B Instant (Groq)",
    provider: "groq",
    category: "fast",
    badge: "Instan",
    badgeVariant: "fast",
    description: "Respon mendekati instan — tanya jawab cepat & interaktif tinggi",
    supportsStreaming: true,
    isFree: true,
  },
  {
    id: "deepseek-r1-distill-llama-70b",
    name: "DeepSeek R1 Distill 70B (Groq)",
    provider: "groq",
    category: "reasoning",
    badge: "Reasoning",
    badgeVariant: "reasoning",
    description: "Extended chain-of-thought reasoning untuk analisis arsitektur mendalam",
    supportsStreaming: true,
    isFree: true,
  },

  // ── OpenRouter (100% Free Tier — Model Gratis Aktif & Terverifikasi) ──
  {
    id: "deepseek/deepseek-r1:free",
    name: "DeepSeek R1 Free",
    provider: "openrouter",
    category: "reasoning",
    badge: "R1 Free",
    badgeVariant: "reasoning",
    description: "Model penalaran rantai-pikir terbuka DeepSeek — gratis tanpa batas",
    supportsStreaming: true,
    isFree: true,
  },
  {
    id: "qwen/qwen-2.5-coder-32b-instruct:free",
    name: "Qwen 2.5 Coder 32B Free",
    provider: "openrouter",
    category: "general",
    badge: "Coding",
    badgeVariant: "coding",
    description: "Spesialis kode & arsitektur sistem — optimal untuk skema & diagram",
    supportsStreaming: true,
    isFree: true,
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    name: "Llama 3.3 70B Free",
    provider: "openrouter",
    category: "fast",
    badge: "Gratis",
    badgeVariant: "free",
    description: "Llama 3.3 70B via OpenRouter — performa tinggi tanpa kuota bayar",
    supportsStreaming: true,
    isFree: true,
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
