// ============================================================
// modules/ai-provider/types.ts — Definisi Tipe Katalog Model AI
//
// Struktur tipe data terstandarisasi untuk Google Gemini, Groq,
// dan OpenRouter (Free Ecosystem).
// Sesuai ARCHITECTURE.md § 2 dan PRD.md § 3.1 & 3.2
// ============================================================

export type AIProviderName = "gemini" | "groq" | "openrouter";
export type AICategory = "fast" | "general" | "reasoning";

/** Variant badge visual untuk model-selector — memengaruhi warna chip */
export type BadgeVariant =
  | "recommend"   // biru — model utama / rekomendasi
  | "new"         // hijau — model baru rilis
  | "fast"        // amber — latensi sangat rendah
  | "reasoning"   // ungu — extended reasoning / penalaran dalam
  | "coding"      // cyan — optimal coding & arsitektur
  | "free"        // slate — gratis / auto-route
  | "flagship"    // rose — model terbesar / paling kapabel
  | "lite";       // gray — versi ringan / hemat token

export interface AIModelDefinition {
  id: string;           // Identifier API (contoh: "gemini-2.5-flash", "llama-3.3-70b-versatile")
  name: string;         // Label utama yang ditampilkan di UI
  provider: AIProviderName;
  category: AICategory;
  badge?: string;       // Teks badge (contoh: "Baru", "Rekomendasi", "Kilat", "Reasoning", "Coding", "Free")
  badgeVariant?: BadgeVariant; // Variant warna chip badge
  description: string;  // Deskripsi singkat 1 baris kemampuan model
  supportsStreaming: boolean;
  isDefault?: boolean;
  isFree?: boolean;     // Apakah model ini 100% gratis (free tier tanpa billing)
}
