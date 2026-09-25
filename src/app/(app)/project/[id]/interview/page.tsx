// ============================================================
// app/(app)/project/[id]/interview/page.tsx — Halaman Interview
// AI mengajukan maks 5 pertanyaan klarifikasi → trigger generate
// Sesuai PRD.md § 4 User Flow dan ARCHITECTURE.md § 7.2
// ============================================================

import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/db";
import Project from "@/models/Project";
import InterviewChat from "@/components/chat/InterviewChat";

export const metadata: Metadata = {
  title: "Interview Project",
  description: "AI mengajukan pertanyaan klarifikasi sebelum membuat dokumentasi.",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function InterviewPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { id: projectId } = await params;
  const userId = session.user.id;

  // Fetch project dari server untuk SSR awal
  await connectDB();
  const project = await Project.findOne({ _id: projectId, userId }).lean();
  if (!project) notFound();

  return (
    <main className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="border-b border-border bg-surface px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-muted-fg hover:text-foreground transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>
          <span className="text-border">/</span>
          <span className="text-foreground font-medium text-sm">
            {project.name}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-fg">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          Interview aktif
        </div>
      </header>

      {/* Chat interface */}
      <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Klarifikasi Project
          </h1>
          <p className="text-muted-fg text-sm">
            AI akan mengajukan beberapa pertanyaan singkat (maks 5) untuk memahami
            project{" "}
            <strong className="text-foreground">{project.name}</strong> lebih baik
            sebelum membuat dokumentasi.
          </p>
        </div>

        <InterviewChat
          projectId={projectId}
          projectName={project.name}
          initialStatus={project.status}
        />
      </div>
    </main>
  );
}
