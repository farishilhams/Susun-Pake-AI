// ============================================================
// lib/encryption.ts — Enkripsi AES-256-GCM untuk Token Rahasia
// Sesuai SECURITY.md § 6: token akses GitHub disimpan terenkripsi
// ============================================================

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;

/**
 * Mendapatkan kunci enkripsi 32-byte (256-bit).
 * Diambil dari ENCRYPTION_KEY atau turunan aman dari NEXTAUTH_SECRET.
 */
function getEncryptionKey(): Buffer {
  const secret =
    process.env.ENCRYPTION_KEY ||
    process.env.NEXTAUTH_SECRET ||
    "susunpakeai-fallback-encryption-secret-key-32b";

  // Selalu hash dengan SHA-256 untuk memastikan panjang tepat 32 bytes (256 bits)
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Enkripsi string teks menggunakan AES-256-GCM.
 * Output format: `ivHex:authTagHex:ciphertextHex`
 */
export function encrypt(plainText: string): string {
  if (!plainText) return "";

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Dekripsi ciphertext berformat `ivHex:authTagHex:ciphertextHex`
 * menggunakan AES-256-GCM.
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return "";

  const parts = encryptedText.split(":");
  if (parts.length !== 3) {
    throw new Error("Format ciphertext tidak valid");
  }

  const [ivHex, authTagHex, cipherHex] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(cipherHex, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
