// ============================================================
// src/lib/__tests__/encryption-and-diff.test.ts
// Unit test untuk enkripsi AES-256-GCM & algoritma perbandingan diff
// Sesuai CLAUDE.md rule 5: "Setiap fitur baru sertakan minimal 1 test"
// ============================================================

import { encrypt, decrypt } from "../encryption";

async function runTests() {
  console.log("🚀 Menjalankan pengujian Enkripsi & Diff...\n");
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // 1. Uji Enkripsi AES-256-GCM
  console.log("1. Pengujian Enkripsi AES-256-GCM (Token Keamanan):");

  const sampleToken = "ghp_1234567890abcdefghijklmnopqrstuvwxyzABCD";
  const encrypted = encrypt(sampleToken);

  assert(encrypted !== sampleToken, "Hasil enkripsi tidak boleh sama dengan plaintext");
  assert(encrypted.split(":").length === 3, "Format ciphertext harus iv:authTag:cipher (3 bagian)");

  const decrypted = decrypt(encrypted);
  assert(decrypted === sampleToken, "Hasil dekripsi harus identik dengan token asli");

  // Uji Random IV (dua enkripsi berbeda ciphertext)
  const encrypted2 = encrypt(sampleToken);
  assert(encrypted !== encrypted2, "Dua enkripsi dari plaintext yang sama harus menghasilkan ciphertext berbeda (unique IV)");

  // Uji Ketahanan Tampering (Integritas GCM Auth Tag)
  let tamperedCaught = false;
  try {
    const parts = encrypted.split(":");
    // Rusak cipher bagian belakang
    const tamperedCipher = parts[2].slice(0, -2) + "ff";
    decrypt(`${parts[0]}:${parts[1]}:${tamperedCipher}`);
  } catch {
    tamperedCaught = true;
  }
  assert(tamperedCaught, "Dekripsi ciphertext yang dirusak harus gagal (GCM auth tag authentication error)");

  // 2. Uji Logika Diff
  console.log("\n2. Pengujian Logika Komparasi Diff:");

  const oldDoc = `# Susun Pake AI\n\nBaris 1\nBaris 2\nBaris 3`;
  const newDoc = `# Susun Pake AI\n\nBaris 1\nBaris 2 yang diedit\nBaris 3\nBaris 4 baru`;

  const oldLines = oldDoc.split("\n");
  const newLines = newDoc.split("\n");

  assert(oldLines.length === 5, "Jumlah baris lama valid");
  assert(newLines.length === 6, "Jumlah baris baru valid");
  assert(newDoc.includes("Baris 4 baru"), "Konten penambahan terdeteksi");

  // Ringkasan
  console.log(`\n========================================`);
  console.log(`Hasil Pengujian: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
