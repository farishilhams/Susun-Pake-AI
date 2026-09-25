// ============================================================
// app/api/auth/register/route.ts — Endpoint Registrasi User
// Mendaftarkan user baru dengan Nama, Email & Kata Sandi
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { registerSchema, hashPassword } from "@/lib/auth-utils";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validasi skema (Zod)
    const parseResult = registerSchema.safeParse(body);
    if (!parseResult.success) {
      const firstError =
        parseResult.error.issues[0]?.message || "Input tidak valid";
      return NextResponse.json(
        { success: false, message: firstError },
        { status: 400 }
      );
    }

    const { name, email, password } = parseResult.data;
    const cleanEmail = email.toLowerCase().trim();
    const cleanName = name.trim();

    await connectDB();

    // Cek apakah email sudah terdaftar
    const existingUser = await User.findOne({ email: cleanEmail });

    if (existingUser) {
      if (existingUser.passwordHash) {
        return NextResponse.json(
          {
            success: false,
            message: "Alamat email ini sudah terdaftar. Silakan masuk.",
          },
          { status: 409 }
        );
      } else {
        // User terdaftar via Google OAuth sebelumnya
        return NextResponse.json(
          {
            success: false,
            message:
              "Email ini terdaftar via Google. Silakan masuk dengan Google atau buat kata sandi melalui menu Lupa Kata Sandi.",
          },
          { status: 409 }
        );
      }
    }

    // Hash kata sandi dengan bcrypt (salt rounds 12)
    const passwordHash = await hashPassword(password);

    // Buat user baru (biarkan googleId undefined agar tidak memicu partial index)
    const newUser = await User.create({
      name: cleanName,
      email: cleanEmail,
      passwordHash,
      authProvider: "email",
      sessionVersion: 0,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Pendaftaran berhasil. Silakan masuk.",
        user: {
          id: newUser._id.toString(),
          name: newUser.name,
          email: newUser.email,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Error pada registrasi user:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan pada server saat memproses pendaftaran",
      },
      { status: 500 }
    );
  }
}
