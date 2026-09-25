// ============================================================
// app/api/user/profile/route.ts — Endpoint Manajemen Profil Pengguna
// GET: Ambil detail profil pengguna aktif
// PATCH / PUT: Update nama lengkap dan avatar (Base64 / URL)
// Sesuai ARCHITECTURE.md § 4.3 & SECURITY.md (Proteksi IDOR & Validasi MIME)
// ============================================================

import { NextResponse } from "next/server";
import { requireAuth, isSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024; // Maksimal 2MB

// GET /api/user/profile — Ambil data profil terkini
export async function GET() {
  const authResult = await requireAuth();
  if (!isSession(authResult)) return authResult;

  try {
    await connectDB();
    const user = await User.findById(authResult.user.id)
      .select("name email avatarUrl image avatar_url createdAt authProvider")
      .lean();

    if (!user) {
      return NextResponse.json(
        { success: false, data: null, message: "Pengguna tidak ditemukan" },
        { status: 404 }
      );
    }

    const resolvedAvatar =
      user.avatar_url || user.image || user.avatarUrl || null;

    return NextResponse.json({
      success: true,
      data: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        image: resolvedAvatar,
        avatar_url: resolvedAvatar,
        avatarUrl: resolvedAvatar,
        createdAt: user.createdAt,
        authProvider: user.authProvider,
      },
      message: "Data profil berhasil diambil",
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      { success: false, data: null, message: "Gagal mengambil data profil" },
      { status: 500 }
    );
  }
}

// PATCH / PUT /api/user/profile — Perbarui nama dan foto profil
async function handleUpdateProfile(req: Request) {
  const authResult = await requireAuth();
  if (!isSession(authResult)) return authResult;

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, data: null, message: "Payload request tidak valid" },
        { status: 400 }
      );
    }

    const { name, avatarUrl } = body;
    const updateFields: {
      name?: string;
      avatarUrl?: string | null;
      image?: string | null;
      avatar_url?: string | null;
      avatarData?: string | null;
    } = {};

    // 1. Validasi Nama Lengkap
    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length < 2) {
        return NextResponse.json(
          {
            success: false,
            data: null,
            message: "Nama lengkap minimal terdiri dari 2 karakter",
          },
          { status: 400 }
        );
      }
      if (name.trim().length > 60) {
        return NextResponse.json(
          {
            success: false,
            data: null,
            message: "Nama lengkap maksimal 60 karakter",
          },
          { status: 400 }
        );
      }
      updateFields.name = name.trim();
    }

    // 2. Validasi Avatar (Base64 atau URL atau null untuk reset)
    if (avatarUrl !== undefined) {
      if (avatarUrl === null || avatarUrl === "") {
        updateFields.avatarUrl = null;
        updateFields.image = null;
        updateFields.avatar_url = null;
        updateFields.avatarData = null;
      } else if (typeof avatarUrl === "string") {
        const trimmedAvatar = avatarUrl.trim();

        if (trimmedAvatar.startsWith("data:image/")) {
          // Validasi MIME type: jpg, jpeg, png, webp
          const mimeMatch = trimmedAvatar.match(
            /^data:image\/(jpeg|jpg|png|webp);base64,/i
          );
          if (!mimeMatch) {
            return NextResponse.json(
              {
                success: false,
                data: null,
                message:
                  "Format avatar harus berupa gambar JPG, JPEG, PNG, atau WEBP",
              },
              { status: 400 }
            );
          }

          // Validasi Ukuran (maks 2MB)
          const base64Data = trimmedAvatar.split(",")[1];
          if (!base64Data) {
            return NextResponse.json(
              {
                success: false,
                data: null,
                message: "Format data Base64 avatar tidak valid",
              },
              { status: 400 }
            );
          }

          const approxSize = Math.ceil((base64Data.length * 3) / 4);
          if (approxSize > MAX_AVATAR_SIZE_BYTES) {
            return NextResponse.json(
              {
                success: false,
                data: null,
                message: "Ukuran file avatar melebihi batas maksimal 2MB",
              },
              { status: 400 }
            );
          }

          // Simpan buffer Base64 fisik ke database MongoDB (avatarData)
          // Set avatarUrl & image ke path string pendek publik agar Cookie NextAuth tidak overflow (~4KB limit)
          const shortUrl = `/api/user/avatar?u=${authResult.user.id}&v=${Date.now()}`;
          updateFields.avatarData = trimmedAvatar;
          updateFields.avatarUrl = shortUrl;
          updateFields.image = shortUrl;
          updateFields.avatar_url = shortUrl;
        } else if (
          trimmedAvatar.startsWith("http://") ||
          trimmedAvatar.startsWith("https://") ||
          trimmedAvatar.startsWith("/api/user/avatar")
        ) {
          updateFields.avatarUrl = trimmedAvatar;
          updateFields.image = trimmedAvatar;
          updateFields.avatar_url = trimmedAvatar;
        } else {
          return NextResponse.json(
            {
              success: false,
              data: null,
              message:
                "URL avatar harus berupa tautan web atau format data gambar Base64",
            },
            { status: 400 }
          );
        }
      } else {
        return NextResponse.json(
          {
            success: false,
            data: null,
            message: "Format avatarUrl tidak valid",
          },
          { status: 400 }
        );
      }
    }

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: "Tidak ada bidang profil yang diperbarui",
        },
        { status: 400 }
      );
    }

    await connectDB();
    const updatedUser = await User.findByIdAndUpdate(
      authResult.user.id,
      { $set: updateFields },
      { returnDocument: "after" }
    )
      .select("name email avatarUrl image avatar_url createdAt authProvider")
      .lean();

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, data: null, message: "Pengguna tidak ditemukan" },
        { status: 404 }
      );
    }

    const resolvedAvatar =
      updatedUser.avatar_url ||
      updatedUser.image ||
      updatedUser.avatarUrl ||
      null;

    return NextResponse.json({
      success: true,
      data: {
        id: updatedUser._id.toString(),
        name: updatedUser.name,
        email: updatedUser.email,
        image: resolvedAvatar,
        avatar_url: resolvedAvatar,
        avatarUrl: resolvedAvatar,
        createdAt: updatedUser.createdAt,
        authProvider: updatedUser.authProvider,
      },
      message: "Profil berhasil diperbarui",
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    return NextResponse.json(
      { success: false, data: null, message: "Gagal memperbarui profil pengguna" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  return handleUpdateProfile(req);
}

export async function PUT(req: Request) {
  return handleUpdateProfile(req);
}
