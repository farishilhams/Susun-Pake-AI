// ============================================================
// app/api/auth/reset-password/route.ts — Endpoint Reset Kata Sandi
// Validasi token hash, perbarui kata sandi, invalidasi semua sesi
// Kasus Google-only: ubah authProvider menjadi "both"
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import PasswordReset from "@/models/PasswordReset";
import {
  resetPasswordSchema,
  hashResetToken,
  hashPassword,
} from "@/lib/auth-utils";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const parseResult = resetPasswordSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: parseResult.error.issues[0]?.message || "Input tidak valid",
        },
        { status: 400 }
      );
    }

    const { token, email, password } = parseResult.data;

    await connectDB();

    // Cari user berdasarkan email
    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Tautan reset kata sandi tidak valid atau telah kedaluwarsa",
        },
        { status: 400 }
      );
    }

    // Hash token dari request untuk dibandingkan dengan tokenHash di database
    const tokenHash = hashResetToken(token);

    // Cari record reset token yang valid (belum pernah dipakai dan belum kedaluwarsa)
    const resetRecord = await PasswordReset.findOne({
      userId: user._id,
      tokenHash,
      usedAt: null,
      expiresAt: { $gt: new Date() },
    });

    if (!resetRecord) {
      return NextResponse.json(
        {
          success: false,
          message: "Tautan reset kata sandi tidak valid atau telah kedaluwarsa",
        },
        { status: 400 }
      );
    }

    // Hash kata sandi baru dengan bcrypt (salt rounds 12)
    const newPasswordHash = await hashPassword(password);

    // Update user:
    user.passwordHash = newPasswordHash;

    // Jika user sebelumnya hanya terdaftar via Google OAuth (passwordHash sebelumnya null),
    // otomatis ubah authProvider menjadi "both"
    if (user.authProvider === "google" || (!user.authProvider && user.googleId)) {
      user.authProvider = "both";
    }

    // Invalidasi SEMUA sesi aktif user tersebut (baik Google maupun email)
    user.sessionVersion = (user.sessionVersion ?? 0) + 1;

    await user.save();

    // Tandai token sebagai used
    resetRecord.usedAt = new Date();
    await resetRecord.save();

    return NextResponse.json({
      success: true,
      message:
        "Kata sandi berhasil diperbarui. Silakan masuk dengan kata sandi baru Anda.",
    });
  } catch (error: unknown) {
    console.error("Error pada reset-password:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan saat memperbarui kata sandi",
      },
      { status: 500 }
    );
  }
}
