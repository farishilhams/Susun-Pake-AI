// ============================================================
// lib/auth-utils.ts — Validasi kredensial, hashing password & token
// Sesuai SECURITY.md (tanpa plaintext, bcrypt salt rounds 12, SHA-256)
// ============================================================

import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// ------------------------------------------------------------
// ZOD SCHEMAS
// ------------------------------------------------------------

export const passwordRequirementsRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Nama minimal 2 karakter")
      .max(100, "Nama maksimal 100 karakter"),
    email: z
      .string()
      .trim()
      .email("Format email tidak valid")
      .toLowerCase(),
    password: z
      .string()
      .min(8, "Kata sandi minimal 8 karakter")
      .regex(
        passwordRequirementsRegex,
        "Kata sandi harus mengandung minimal satu huruf besar, satu huruf kecil, dan satu angka"
      ),
    confirmPassword: z
      .string()
      .min(1, "Konfirmasi kata sandi wajib diisi"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Konfirmasi kata sandi tidak cocok",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Format email tidak valid")
    .toLowerCase(),
  password: z
    .string()
    .min(1, "Kata sandi wajib diisi"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Format email tidak valid")
    .toLowerCase(),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Token reset wajib disertakan"),
    email: z
      .string()
      .trim()
      .email("Format email tidak valid")
      .toLowerCase(),
    password: z
      .string()
      .min(8, "Kata sandi minimal 8 karakter")
      .regex(
        passwordRequirementsRegex,
        "Kata sandi harus mengandung minimal satu huruf besar, satu huruf kecil, dan satu angka"
      ),
    confirmPassword: z
      .string()
      .min(1, "Konfirmasi kata sandi baru wajib diisi"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Konfirmasi kata sandi tidak cocok",
    path: ["confirmPassword"],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// ------------------------------------------------------------
// PASSWORD HASHING (BCRYPT)
// ------------------------------------------------------------

const BCRYPT_SALT_ROUNDS = 12;

/**
 * Hash password menggunakan bcrypt dengan cost factor 12.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

/**
 * Verifikasi kecocokan password dengan hash tersimpan.
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ------------------------------------------------------------
// RESET TOKEN UTILITIES (CRYPTO)
// ------------------------------------------------------------

/**
 * Hash token acak mentah dengan SHA-256 sebelum disimpan ke DB.
 */
export function hashResetToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Buat token reset kriptografis acak, token hash, dan waktu kadaluarsa (20 menit).
 */
export function generateResetToken(): {
  rawToken: string;
  tokenHash: string;
  expiresAt: Date;
} {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashResetToken(rawToken);
  // Masa berlaku 20 menit (antara 15-30 menit sesuai requirement)
  const expiresAt = new Date(Date.now() + 20 * 60 * 1000);

  return { rawToken, tokenHash, expiresAt };
}
