// ============================================================
// modules/ai-provider/types.ts — Definisi Tipe Katalog Model AI
//
// Struktur tipe data terstandarisasi untuk Google Gemini, Groq,
// dan OpenRouter (Free Ecosystem).
// Sesuai ARCHITECTURE.md § 2 dan PRD.md § 3.1 & 3.2
// ============================================================

export type AIProviderName = "gemini" | "groq" | "openrouter";
export type AICategory = "fast" | "general" | "reasoning";

export interface AIModelDefinition {
  id: string; // Identifier API (contoh: "gemini-2.5-flash", "llama-3.3-70b-versatile")
  name: string; // Label utama (contoh: "Gemini 2.5 Flash", "Llama 3.3 70B", "DeepSeek R1")
  provider: AIProviderName;
  category: AICategory;
  badge?: string; // Penanda visual (contoh: "Baru", "Rekomendasi", "Cepat", "Kilat", "Reasoning", "Coding", "Free")
  description: string; // Deskripsi singkat 1 baris (contoh: "Jawaban tercepat", "Bantuan serbaguna", "Penalaran arsitektur mendalam")
  supportsStreaming: boolean;
  isDefault?: boolean;
}
