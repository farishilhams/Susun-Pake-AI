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
      <header className="border-b border-border bg-surface px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-muted-fg hover:text-foreground transition-colors text-xs sm:text-sm shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden xs:inline">Dashboard</span>
          </Link>
          <span className="text-border text-xs">/</span>
          <span className="text-foreground font-medium text-xs sm:text-sm font-mono truncate max-w-[130px] xs:max-w-[200px] sm:max-w-none">
            {project.name}
          </span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-muted-fg shrink-0 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          <span>Interview</span>
        </div>
      </header>

      {/* Chat interface */}
      <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full px-3 sm:px-4 py-4 sm:py-8">
        <div className="mb-4 sm:mb-8 text-center px-2">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-1.5 sm:mb-2">
            Klarifikasi Project
          </h1>
          <p className="text-muted-fg text-xs sm:text-sm leading-relaxed max-w-xl mx-auto">
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
