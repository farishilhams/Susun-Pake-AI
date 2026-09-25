// ============================================================
// app/api/user/avatar/route.ts — Endpoint Penyajian Foto Avatar
// Menyajikan binary buffer foto profil dari MongoDB Atlas (avatarData)
// Menghindari penyimpanan Base64 di Cookie/JWT NextAuth (Cegah CLIENT_FETCH_ERROR)
// Sesuai ARCHITECTURE.md § 4.3 & SECURITY.md
// ============================================================

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import User from "@/models/User";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("u");

    await connectDB();

    let targetUserId = userId;

    if (!targetUserId) {
      const session = await getAuthSession();
      if (session?.user?.id) {
        targetUserId = session.user.id;
      }
    }

    if (!targetUserId) {
      return new NextResponse("User ID tidak ditemukan", { status: 400 });
    }

    const user = await User.findById(targetUserId)
      .select("avatarData avatarUrl image name")
      .lean();

    if (!user) {
      // Kembalikan default SVG fallback jika ID tidak ditemukan
      const defaultSvg = generateAvatarSvg("Pengguna");
      return new Response(defaultSvg, {
        status: 200,
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "public, max-age=60",
        },
      });
    }

    // 1. Jika ada avatarData Base64 yang tersimpan di MongoDB
    if (user.avatarData && user.avatarData.startsWith("data:image/")) {
      const [header, base64Part] = user.avatarData.split(",");
      if (base64Part) {
        const mimeMatch = header.match(/^data:(image\/[a-zA-Z+]+);base64/i);
        const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
        const imageBuffer = Buffer.from(base64Part, "base64");

        return new Response(imageBuffer, {
          status: 200,
          headers: {
            "Content-Type": mimeType,
            "Content-Length": imageBuffer.length.toString(),
            "Cache-Control": "public, max-age=86400, stale-while-revalidate=43200",
          },
        });
      }
    }

    // 2. Jika user memiliki avatar eksternal (Google OAuth / GitHub / Gravatar)
    const externalUrl = user.image || user.avatarUrl;
    if (
      externalUrl &&
      (externalUrl.startsWith("http://") || externalUrl.startsWith("https://"))
    ) {
      return NextResponse.redirect(externalUrl, 307);
    }

    // 3. Fallback Elegan: Render Dynamic SVG Avatar dengan inisial nama pengguna
    // Mencegah browser menampilkan ikon rusak (broken image icon) dan teks alt yang meluber
    const svgAvatar = generateAvatarSvg(user.name || "Developer");
    return new Response(svgAvatar, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=300, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    console.error("Error serving avatar:", error);
    const fallbackSvg = generateAvatarSvg("User");
    return new Response(fallbackSvg, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "no-cache",
      },
    });
  }
}

function generateAvatarSvg(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  let initials = "SP";
  if (parts.length >= 2) {
    initials = (parts[0][0] + parts[1][0]).toUpperCase();
  } else if (parts.length === 1 && parts[0].length >= 2) {
    initials = parts[0].slice(0, 2).toUpperCase();
  } else if (parts.length === 1) {
    initials = parts[0].toUpperCase();
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="100%" height="100%">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#1e293b" />
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="64" fill="url(#bg)" />
  <circle cx="64" cy="64" r="62" fill="none" stroke="#10b981" stroke-width="3" stroke-opacity="0.5" />
  <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" fill="#10b981" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="44" letter-spacing="1">
    ${initials}
  </text>
</svg>`;
}
