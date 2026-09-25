// ============================================================
// app/(app)/dashboard/page.tsx — Dashboard Terpadu Susun Pake AI
// Menggabungkan Profil Pengguna, Metrik Akun, & Riwayat Project
// Sesuai ARCHITECTURE.md § 4 & DESIGN.md § 5.2
// ============================================================

import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/db";
import Project from "@/models/Project";
import ProjectFile from "@/models/File";
import User from "@/models/User";
import DashboardClient from "@/components/dashboard/DashboardClient";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Kelola profil dan riwayat project dokumentasi kamu.",
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const userId = session.user.id;

  await connectDB();

  // Ambil data profil pengguna dari MongoDB
  const dbUser = await User.findById(userId)
    .select("name email avatarUrl image avatar_url createdAt authProvider")
    .lean();

  // Ambil daftar project milik user terurut dari pin dan tanggal update
  const projects = await Project.find({ userId })
    .sort({ isPinned: -1, updatedAt: -1 })
    .select("name projectType status isPinned createdAt updatedAt")
    .lean();

  const projectIds = projects.map((p) => p._id);

  // Hitung total dokumen/file yang telah dibuat di seluruh project user
  const totalFiles =
    projectIds.length > 0
      ? await ProjectFile.countDocuments({ projectId: { $in: projectIds } })
      : 0;

  // Serialize projects untuk client component
  const serializedProjects = projects.map((p) => ({
    id: p._id.toString(),
    name: p.name,
    projectType: p.projectType,
    status: p.status,
    isPinned: Boolean(p.isPinned),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));

  const resolvedDbAvatar =
    dbUser?.avatar_url ||
    dbUser?.image ||
    dbUser?.avatarUrl ||
    session.user?.image ||
    null;

  // Data profil user terpadu
  const userProfile = {
    id: userId,
    name: dbUser?.name || session.user?.name || "Developer",
    email: dbUser?.email || session.user?.email || "",
    image: resolvedDbAvatar,
    avatar_url: resolvedDbAvatar,
    avatarUrl: resolvedDbAvatar,
    createdAt: dbUser?.createdAt
      ? dbUser.createdAt.toISOString()
      : new Date().toISOString(),
    authProvider: dbUser?.authProvider || "email",
  };

  return (
    <DashboardClient
      projects={serializedProjects}
      user={userProfile}
      totalFiles={totalFiles}
    />
  );
}
