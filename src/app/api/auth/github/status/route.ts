// ============================================================
// app/api/auth/github/status/route.ts
// Cek status koneksi GitHub & fitur disconnect
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { requireAuth, isSession } from "@/lib/auth";
import { success, fail } from "@/lib/api-response";

export async function GET() {
  const authResult = await requireAuth();
  if (!isSession(authResult)) return authResult;

  const { id: userId } = authResult.user;

  try {
    await connectDB();
    const user = await User.findById(userId)
      .select("githubAccessToken githubUsername githubConnectedAt")
      .lean();

    const isConnected = Boolean(user?.githubAccessToken);

    return success({
      connected: isConnected,
      username: user?.githubUsername ?? null,
      connectedAt: user?.githubConnectedAt ?? null,
    });
  } catch (err) {
    console.error("GET /api/auth/github/status error:", err);
    return fail("Gagal memeriksa status GitHub", err, 500);
  }
}

export async function DELETE() {
  const authResult = await requireAuth();
  if (!isSession(authResult)) return authResult;

  const { id: userId } = authResult.user;

  try {
    await connectDB();
    await User.updateOne(
      { _id: userId },
      {
        $set: {
          githubAccessToken: null,
          githubUsername: null,
          githubConnectedAt: null,
        },
      }
    );

    return success(null, "Tautan akun GitHub berhasil diputuskan");
  } catch (err) {
    console.error("DELETE /api/auth/github/status error:", err);
    return fail("Gagal memutuskan tautan GitHub", err, 500);
  }
}
