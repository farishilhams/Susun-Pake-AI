import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Project from "@/models/Project";

// ============================================================
// app/api/stats/route.ts — Endpoint Publik Statistik Penggunaan Nyata
// Sesuai ARCHITECTURE.md § 4.3 & PRD.md § 3
// Mengambil data real dari database (tanpa angka hardcoded)
// ============================================================

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDB();
    const [usersCount, projectsCount] = await Promise.all([
      User.countDocuments(),
      Project.countDocuments(),
    ]);

    return NextResponse.json(
      {
        success: true,
        data: {
          usersCount,
          projectsCount,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("Stats API error:", error);
    // Return gracefully dengan nilai 0 jika koneksi DB bermasalah
    return NextResponse.json(
      {
        success: false,
        data: { usersCount: 0, projectsCount: 0 },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  }
}
