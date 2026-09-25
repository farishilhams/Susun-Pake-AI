// ============================================================
// lib/rate-limiter.ts — Rate Limiter Internal per User
// Dipanggil SEBELUM request diteruskan ke AI Provider Router.
// Pola persis sesuai SKILL.md § "Rate Limiter Internal per User"
// dan ARCHITECTURE.md § 2.3
// ============================================================

import { connectDB } from "@/lib/db";
import UsageLog from "@/models/UsageLog";

/** Ambil tanggal UTC dalam format "YYYY-MM-DD" */
export function getUTCDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Cek apakah user masih dalam batas kuota harian.
 *
 * - Jika masih bisa: increment counter dan return true
 * - Jika sudah mentok limit: return false (TIDAK increment)
 * - Dipanggil SEBELUM generateWithFallback(), SEBELUM SSE stream dibuka
 *
 * @param userId - MongoDB ObjectId user sebagai string
 * @param limit  - Maksimal generate per hari (default: 5)
 */
export async function checkDailyQuota(
  userId: string,
  limit = 5
): Promise<boolean> {
  await connectDB();

  const today = getUTCDateString();

  // Cek usage hari ini SEBELUM increment
  const existing = await UsageLog.findOne({ userId, date: today });

  if (existing && existing.generateCount >= limit) {
    // Sudah mentok limit — jangan increment
    return false;
  }

  // Masih bisa — increment counter (upsert jika record belum ada)
  await UsageLog.updateOne(
    { userId, date: today },
    { $inc: { generateCount: 1 } },
    { upsert: true }
  );

  return true;
}

/**
 * Ambil sisa kuota generate user hari ini.
 * Berguna untuk ditampilkan di UI.
 */
export async function getRemainingQuota(
  userId: string,
  limit = 5
): Promise<{ used: number; remaining: number; limit: number }> {
  await connectDB();

  const today = getUTCDateString();
  const usage = await UsageLog.findOne({ userId, date: today });
  const used = usage?.generateCount ?? 0;

  return {
    used,
    remaining: Math.max(0, limit - used),
    limit,
  };
}
