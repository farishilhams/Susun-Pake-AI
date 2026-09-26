// ============================================================
// lib/__tests__/ai-router.test.ts — AI Providers & Fallback Router Test
// ============================================================

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { callGemini, GEMINI_MODELS } from "@/modules/ai-provider/gemini";
import { callGroq, GROQ_MODELS } from "@/modules/ai-provider/groq";
import { callOpenRouterFree, FREE_MODELS } from "@/modules/ai-provider/openrouter";
import { generateWithFallback } from "@/modules/ai-provider/router";

async function runTests() {
  console.log("🚀 Menjalankan pengujian AI Provider & Fallback Router...\n");

  console.log("1. Validasi Konfigurasi Model:");
  console.log("  ✅ Model Gemini Aktif:", GEMINI_MODELS.join(", "));
  console.log("  ✅ Model Groq Aktif:", GROQ_MODELS.join(", "));
  console.log("  ✅ Model OpenRouter Free Aktif:", FREE_MODELS.join(", "));

  console.log("\n2. Uji Provider Utama: Google Gemini (gemini-2.5-flash):");
  try {
    let geminiStream = "";
    const res = await callGemini("Jawab dalam 1 kata: OK", {
      onToken: (c) => (geminiStream += c),
    });
    console.log("  ✅ PASS: Gemini merespon berhasil ->", res.trim());
  } catch (err) {
    console.error("  ❌ FAIL: Gemini error:", err);
  }

  console.log("\n3. Uji Provider Fallback 1: Groq (qwen/qwen3.8-27b):");
  try {
    let groqStream = "";
    const res = await callGroq("Jawab dalam 1 kata: OK", {
      onToken: (c) => (groqStream += c),
    });
    console.log("  ✅ PASS: Groq merespon berhasil ->", res.trim());
  } catch (err) {
    console.error("  ❌ FAIL: Groq error:", err);
  }

  console.log("\n4. Uji Provider Fallback 2: OpenRouter Free (openrouter/free):");
  try {
    let openRouterStream = "";
    const res = await callOpenRouterFree("Jawab dalam 1 kata: OK", {
      onToken: (c) => (openRouterStream += c),
    });
    console.log("  ✅ PASS: OpenRouter merespon berhasil ->", res.trim());
  } catch (err) {
    console.error("  ❌ FAIL: OpenRouter error:", err);
  }

  console.log("\n5. Uji Orchestrator generateWithFallback (End-to-End):");
  try {
    let routerStream = "";
    await generateWithFallback(
      "Perkenalkan dirimu sebagai AI Susun Pake AI dalam 1 kalimat.",
      {
        onToken: (c) => (routerStream += c),
      }
    );
    console.log("  ✅ PASS: generateWithFallback sukses!");
    console.log("  📝 Streamed output:", routerStream.trim());
  } catch (err) {
    console.error("  ❌ FAIL: generateWithFallback error:", err);
  }

  console.log("\n========================================");
  console.log("Selesai pengujian AI Provider!");
  console.log("========================================");
}

runTests().catch(console.error);
