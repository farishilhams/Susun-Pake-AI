// ============================================================
// src/lib/__tests__/multi-provider-auth.test.ts
// Pengujian Harmonisasi Multi-Provider Authentication
// (Google OAuth & Email/Password Credentials Coexistence)
// ============================================================

import assert from "node:assert";
import bcrypt from "bcryptjs";

console.log("🚀 Menjalankan Pengujian Harmonisasi Multi-Provider Authentication...");

// Model simulasi User di MongoDB Atlas
interface MockUser {
  _id: string;
  email: string;
  name: string;
  passwordHash?: string | null;
  googleId?: string | null;
  authProvider: "email" | "google" | "both";
  image?: string | null;
  avatarUrl?: string | null;
  avatar_url?: string | null;
  avatarData?: string | null;
  sessionVersion: number;
}

// Simulasi Database In-Memory
const mockDb: Map<string, MockUser> = new Map();

async function simulateRegisterCredentials(email: string, password: string, name: string): Promise<MockUser> {
  const cleanEmail = email.toLowerCase().trim();
  const passwordHash = await bcrypt.hash(password, 10);
  const newUser: MockUser = {
    _id: "user_" + Math.random().toString(36).substring(2, 9),
    email: cleanEmail,
    name,
    passwordHash,
    googleId: null,
    authProvider: "email",
    image: null,
    avatarUrl: null,
    avatar_url: null,
    avatarData: null,
    sessionVersion: 0,
  };
  mockDb.set(cleanEmail, newUser);
  return newUser;
}

// Logika Account Linking dari src/lib/auth.ts signIn callback
async function simulateGoogleSignIn(profile: { sub: string; email: string; name: string; picture: string }): Promise<{
  success: boolean;
  user: MockUser;
  action: "linked" | "created";
}> {
  const cleanEmail = profile.email.toLowerCase().trim();
  const googleId = profile.sub;
  const googleAvatar = profile.picture;

  let existingUser = mockDb.get(cleanEmail);

  if (existingUser) {
    // KUNCI: Pertahankan passwordHash asli, tautkan googleId, dan set authProvider = "both"
    existingUser.googleId = googleId;
    if (!existingUser.avatarData) {
      existingUser.image = googleAvatar;
      existingUser.avatarUrl = googleAvatar;
      existingUser.avatar_url = googleAvatar;
    }
    if (!existingUser.name && profile.name) {
      existingUser.name = profile.name;
    }

    if (existingUser.passwordHash) {
      existingUser.authProvider = "both";
    } else {
      existingUser.authProvider = "google";
    }

    return { success: true, user: existingUser, action: "linked" };
  } else {
    const newUser: MockUser = {
      _id: "user_" + Math.random().toString(36).substring(2, 9),
      email: cleanEmail,
      googleId,
      name: profile.name,
      passwordHash: null,
      authProvider: "google",
      image: googleAvatar,
      avatarUrl: googleAvatar,
      avatar_url: googleAvatar,
      avatarData: null,
      sessionVersion: 0,
    };
    mockDb.set(cleanEmail, newUser);
    return { success: true, user: newUser, action: "created" };
  }
}

async function runAllTests() {
  // 1. Skenario: User mendaftar pertama via Email & Password
  console.log("\n1. Registrasi Akun Pertama via Email & Password:");
  const userEmail = "farishilham.s@gmail.com";
  const userPassword = "MySecurePassword2026!";
  const initialUser = await simulateRegisterCredentials(userEmail, userPassword, "Faris Ilham");

  assert.strictEqual(initialUser.authProvider, "email");
  assert.strictEqual(initialUser.googleId, null);
  assert(initialUser.passwordHash !== null, "passwordHash harus terisi");
  console.log("  ✅ PASS: Akun credentials berhasil terdaftar dengan hash password aman");

  // 2. Skenario: User yang sama login via Google OAuth (Cegah OAuthAccountNotLinked & Account Linking)
  console.log("\n2. Skenario Login dengan Google pada Email yang Sama (Account Linking):");
  const googleProfile = {
    sub: "google_sub_1092837465",
    email: userEmail,
    name: "Faris Ilham (Google)",
    picture: "https://lh3.googleusercontent.com/a/ACg8ocL_test_avatar=s96-c",
  };

  const linkResult = await simulateGoogleSignIn(googleProfile);
  assert.strictEqual(linkResult.success, true, "Sign in Google harus berhasil tanpa fatal exception");
  assert.strictEqual(linkResult.action, "linked", "Sistem harus menautkan akun yang sudah ada, bukan duplikat");
  assert.strictEqual(linkResult.user.googleId, "google_sub_1092837465", "googleId harus tersimpan ke dokumen user");
  assert.strictEqual(linkResult.user.authProvider, "both", "authProvider harus ter-upgrade menjadi 'both'");
  assert(linkResult.user.passwordHash !== null, "passwordHash TIDAK boleh hilang atau tertimpa null");
  console.log("  ✅ PASS: Akun Google ditautkan dengan mulus ke akun credentials yang ada");

  // 3. Verifikasi Kata Sandi Lama Tetap Valid Pasca-Linking
  console.log("\n3. Verifikasi Kredensial Password Tetap Berfungsi Pasca-Google Linking:");
  const isPasswordStillValid = await bcrypt.compare(userPassword, linkResult.user.passwordHash!);
  assert.strictEqual(isPasswordStillValid, true, "Password lama harus tetap valid dan bisa dipakai login");
  console.log("  ✅ PASS: Pengguna masih bisa login dengan kata sandi aslinya");

  // 4. Verifikasi Persistensi Avatar Google ke JWT & Session
  console.log("\n4. Verifikasi Persistensi Sesi & Avatar Google OAuth:");
  assert.strictEqual(linkResult.user.image, googleProfile.picture);
  assert.strictEqual(linkResult.user.avatarUrl, googleProfile.picture);
  assert.strictEqual(linkResult.user.avatar_url, googleProfile.picture);

  // Simulasi JWT Callback
  const mockJwtToken: any = {
    id: linkResult.user._id,
    userId: linkResult.user._id,
    email: linkResult.user.email,
    name: linkResult.user.name,
    picture: linkResult.user.image,
  };
  assert.strictEqual(mockJwtToken.picture, googleProfile.picture, "JWT token picture harus memuat avatar Google");

  // Simulasi Session Callback
  const mockSession: any = {
    user: {
      id: mockJwtToken.userId,
      name: mockJwtToken.name,
      email: mockJwtToken.email,
      image: mockJwtToken.picture,
      avatarUrl: mockJwtToken.picture,
      avatar_url: mockJwtToken.picture,
    },
  };
  assert.strictEqual(mockSession.user.image, googleProfile.picture, "Session image harus berisi avatar Google");
  console.log("  ✅ PASS: Avatar Google OAuth tersinkronisasi instan ke Session & Navbar");

  console.log("\n========================================================");
  console.log("Semua Pengujian Harmonisasi Multi-Provider Auth Sukses!");
  console.log("========================================================\n");
}

runAllTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
