// ============================================================
// app/api/auth/forgot-password/route.ts — Endpoint Lupa Kata Sandi
// Generate token reset acak, simpan hash ke DB, kirim email
// Sesuai ARCHITECTURE.md § 4 dan SECURITY.md (cegah user enumeration)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import PasswordReset from "@/models/PasswordReset";
import { forgotPasswordSchema, generateResetToken } from "@/lib/auth-utils";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const parseResult = forgotPasswordSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: parseResult.error.issues[0]?.message || "Email tidak valid",
        },
        { status: 400 }
      );
    }

    const { email } = parseResult.data;

    await connectDB();

    const user = await User.findOne({ email });

    // Pesan respons GENERIK yang selalu sama, baik email ada ataupun tidak (SECURITY.md)
    const genericMessage =
      "Jika email terdaftar, tautan reset telah dikirim ke kotak masuk Anda.";

    if (!user) {
      // Delay singkat buatan (~250ms) untuk mencegah timing attack user enumeration
      await new Promise((resolve) => setTimeout(resolve, 250));
      return NextResponse.json({
        success: true,
        message: genericMessage,
      });
    }

    // Batalkan token-token lama milik user ini yang belum dipakai
    await PasswordReset.updateMany(
      { userId: user._id, usedAt: null },
      { $set: { usedAt: new Date() } }
    );

    // Generate token reset acak kriptografis
    const { rawToken, tokenHash, expiresAt } = generateResetToken();

    // Simpan hash token ke tabel password_resets
    await PasswordReset.create({
      userId: user._id,
      tokenHash,
      expiresAt,
      usedAt: null,
    });

    // Susun URL reset kata sandi
    const baseUrl =
      process.env.NEXTAUTH_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";
    const resetUrl = `${baseUrl}/reset-password?token=${rawToken}&email=${encodeURIComponent(
      user.email
    )}`;

    // Kirim email
    await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetUrl,
    });

    return NextResponse.json({
      success: true,
      message: genericMessage,
    });
  } catch (error: unknown) {
    console.error("Error pada forgot-password:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan saat memproses permintaan reset kata sandi",
      },
      { status: 500 }
    );
  }
}
