// ============================================================
// src/lib/__tests__/auth-logic.test.ts — Unit Tests untuk Logika Auth
// Menguji validasi Zod, hashing bcrypt, token SHA-256, & authProvider
// Sesuai CLAUDE.md § 4 rule 5 ("minimal 1 test untuk logic pentingnya")
// ============================================================

import {
  registerSchema,
  resetPasswordSchema,
  hashPassword,
  verifyPassword,
  generateResetToken,
  hashResetToken,
} from "../auth-utils";

async function runTests() {
  console.log("🚀 Menjalankan pengujian logika autentikasi...\n");
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

  // 1. Uji Validasi Register Schema
  console.log("1. Validasi Register Schema (Zod):");

  const validRegister = registerSchema.safeParse({
    name: "Developer Keren",
    email: "dev@susunpake.ai",
    password: "Password123",
    confirmPassword: "Password123",
  });
  assert(validRegister.success, "Payload registrasi valid harus diterima");

  const weakPassword = registerSchema.safeParse({
    name: "Developer",
    email: "dev@susunpake.ai",
    password: "password", // tanpa huruf besar & angka
    confirmPassword: "password",
  });
  assert(!weakPassword.success, "Kata sandi lemah tanpa huruf besar & angka harus ditolak");

  const shortPassword = registerSchema.safeParse({
    name: "Developer",
    email: "dev@susunpake.ai",
    password: "Pass1", // < 8 karakter
    confirmPassword: "Pass1",
  });
  assert(!shortPassword.success, "Kata sandi kurang dari 8 karakter harus ditolak");

  const mismatchPassword = registerSchema.safeParse({
    name: "Developer",
    email: "dev@susunpake.ai",
    password: "Password123",
    confirmPassword: "Password321", // tidak cocok
  });
  assert(!mismatchPassword.success, "Konfirmasi kata sandi yang tidak cocok harus ditolak");

  // 2. Uji Hashing & Verifikasi Kata Sandi (Bcrypt)
  console.log("\n2. Hashing & Verifikasi Kata Sandi (Bcrypt):");
  const rawPw = "SuperSecret123";
  const hashedPw = await hashPassword(rawPw);

  assert(hashedPw !== rawPw, "Password ter-hash tidak boleh sama dengan plaintext");
  assert(hashedPw.startsWith("$2"), "Hash harus format bcrypt valid");

  const matchCorrect = await verifyPassword(rawPw, hashedPw);
  assert(matchCorrect === true, "Verifikasi password yang benar harus bernilai true");

  const matchWrong = await verifyPassword("SalahPass123", hashedPw);
  assert(matchWrong === false, "Verifikasi password yang salah harus bernilai false");

  // 3. Uji Token Reset Kriptografis (SHA-256)
  console.log("\n3. Token Reset Password (Crypto & SHA-256):");
  const { rawToken, tokenHash, expiresAt } = generateResetToken();

  assert(rawToken.length === 64, "Raw token harus 32 bytes hex (64 karakter)");
  assert(tokenHash.length === 64, "Token hash SHA-256 harus 64 karakter hex");

  const computedHash = hashResetToken(rawToken);
  assert(computedHash === tokenHash, "Hash dari raw token harus identik dengan tokenHash tersimpan");

  const now = Date.now();
  const diffMinutes = (expiresAt.getTime() - now) / (1000 * 60);
  assert(diffMinutes >= 19 && diffMinutes <= 21, "Waktu kedaluwarsa token harus ~20 menit");

  // 4. Uji Reset Password Schema
  console.log("\n4. Validasi Reset Password Schema:");
  const validReset = resetPasswordSchema.safeParse({
    token: rawToken,
    email: "user@example.com",
    password: "NewPassword123",
    confirmPassword: "NewPassword123",
  });
  assert(validReset.success, "Payload reset password yang valid harus diterima");

  // 5. Uji Definisi Partial Filter Expression pada UserSchema (googleId)
  console.log("\n5. Definisi Schema User & Partial Index (Bug Fix Duplicate Key):");
  const User = (await import("@/models/User")).default;
  const indexes = User.schema.indexes();
  const googleIndexEntry = indexes.find(
    ([fields]: [Record<string, any>, any]) => fields && fields.googleId === 1
  );
  assert(!!googleIndexEntry, "Index googleId harus terdaftar di UserSchema");
  const [, options] = (googleIndexEntry || [null, {} as Record<string, any>]) as [any, Record<string, any>];
  assert(options.unique === true, "Index googleId harus unique");
  assert(
    options.partialFilterExpression?.googleId?.$type === "string",
    "Index googleId harus memiliki partialFilterExpression $type: 'string'"
  );

  // Verifikasi field googleId tidak memiliki default null
  const googleIdPath = User.schema.path("googleId");
  assert(
    (googleIdPath as any).defaultValue === undefined,
    "Field googleId TIDAK boleh memiliki defaultValue null (harus undefined)"
  );

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
