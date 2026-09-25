// ============================================================
// app/(app)/project/[id]/page.tsx — Project View: Editor + Preview
// Server component — fetch data, render client component
// Auth + IDOR protection
// ============================================================

import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/db";
import Project from "@/models/Project";
import ProjectFile from "@/models/File";
import { FILE_TYPES } from "@/types";
import ProjectEditor from "@/components/editor/ProjectEditor";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  await connectDB();
  const project = await Project.findById(id).select("name").lean();
  return {
    title: project ? `${project.name} — Editor` : "Editor",
  };
}

export default async function ProjectPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { id: projectId } = await params;
  const userId = session.user.id;

  await connectDB();

  // Cek kepemilikan (IDOR protection) 
  const project = await Project.findOne({ _id: projectId, userId }).lean();
  if (!project) notFound();

  // Redirect ke interview jika belum done
  if (project.status === "draft" || project.status === "interviewing") {
    redirect(`/project/${projectId}/interview`);
  }

  // Fetch semua file
  const files = await ProjectFile.find({ projectId }).lean();

  // Normalize: buat entry untuk semua 8 jenis file, kosong jika belum ada
  const fileMap = Object.fromEntries(files.map((f) => [f.fileType, f.content]));
  const normalizedFiles = FILE_TYPES.map((ft) => ({
    fileType: ft,
    content: fileMap[ft] ?? "",
  }));

  return (
    <ProjectEditor
      projectId={projectId}
      projectName={project.name}
      files={normalizedFiles}
      isGenerating={project.status === "generating"}
    />
  );
}
