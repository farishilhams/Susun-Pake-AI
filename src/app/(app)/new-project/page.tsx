// ============================================================
// app/(app)/new-project/page.tsx — Form Wizard Input Awal
// User mengisi: nama project, tipe app, fitur utama, preferensi stack
// Submit → simpan ke DB → redirect ke halaman interview
// Sesuai PRD.md § 3 dan § 4 User Flow
// ============================================================

import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import NewProjectForm from "@/components/project/NewProjectForm";

export const metadata: Metadata = {
  title: "Project Baru",
  description: "Mulai project baru — isi brief singkat untuk generate 8 file dokumentasi.",
};

export default async function NewProjectPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Project Baru
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-3">
            Ceritakan project kamu
          </h1>
          <p className="text-muted-fg leading-relaxed">
            Isi brief singkat tentang ide kamu — asisten AI bakal nanya beberapa hal penting,
            lalu menyusun 8 dokumen spek dan arsitektur lengkap buat project kamu.
          </p>
        </div>

        <NewProjectForm />
      </div>
    </main>
  );
}
